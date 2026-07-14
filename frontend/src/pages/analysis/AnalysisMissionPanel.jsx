import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList, MessageSquarePlus, Plus } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisMonitorLayout from "../../components/analysis/AnalysisMonitorLayout.jsx";
import TopicDeadlinePromptModal from "../../components/analysis/TopicDeadlinePromptModal.jsx";
import MissionTopicPickerModal from "../../components/analysis/MissionTopicPickerModal.jsx";
import MissionTopicGroup from "../../components/analysis/MissionTopicGroup.jsx";
import BriefSubmissionCard from "../../components/analysis/BriefSubmissionCard.jsx";
import BriefSubmissionDetail from "../../components/analysis/BriefSubmissionDetail.jsx";
import analysisService from "../../services/analysisService";
import messengerAdminService from "../../services/messengerAdminService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import { canManageAnalysis } from "../../utils/analysisAuth.js";
import {
  loadManagementFilters,
  saveManagementFilters,
  getManagementAssignTopicUrl,
} from "../../utils/analysisManagementNav.js";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { ANALYSIS_TERMS, BRIEF_TERMS } from "../../constants/analysisTerminology.js";
import { MANAGER_PANEL_HELP, BRIEF_INBOX_HELP } from "../../content/analysisFormHelp.jsx";
import useAnalysisToast from "../../hooks/useAnalysisToast.jsx";
import {
  TOPIC_STATUS_META, MISSION_STATUS_META, BRIEF_STATUS_META, PRIORITY_META, getDateRangeParams,
  getManagerTopicTabCounts,
  isTopicOverdueForAction,
  isTopicNewForAssignment,
  isTopicAssignableForMission,
} from "../../utils/analysisMonitorUtils.js";

function computeMissionSummary(list = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    total: list.length,
    active: list.filter((m) => ["Assigned", "InProgress"].includes(m.status)).length,
    pending_review: list.filter((m) => ["Submitted", "UnderReview"].includes(m.status)).length,
    needs_revision: list.filter((m) => m.status === "NeedsRevision").length,
    delayed: list.filter((m) => m.deadline && new Date(m.deadline) < today && !["FinalApproved", "Archived", "Cancelled"].includes(m.status)).length,
  };
}

export default function AnalysisMissionPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useAppTheme();
  const canManage = canManageAnalysis();

  const allTabs = useMemo(() => {
    const tabs = [];
    if (canManage) {
      tabs.push({ id: "missions", label: "مأموریت‌ها", icon: ClipboardList });
      tabs.push({ id: "briefs", label: BRIEF_TERMS.inboxTab, icon: MessageSquarePlus });
    }
    return tabs;
  }, [canManage]);

  const savedFilters = useMemo(() => loadManagementFilters() || {}, []);
  const tabFromUrl = searchParams.get("tab");
  const topicIdFromUrl = searchParams.get("topicId");
  const resolvedTabFromUrl = tabFromUrl === "assign" ? "missions" : tabFromUrl;
  const initialTab = allTabs.find((t) => t.id === resolvedTabFromUrl)?.id || allTabs[0]?.id || "missions";

  const [tab, setTabState] = useState(initialTab);
  const [topics, setTopics] = useState([]);
  const [missions, setMissions] = useState([]);
  const [topicSummary, setTopicSummary] = useState({});
  const [missionSummary, setMissionSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm || "");
  const [showFilters, setShowFilters] = useState(false);
  const [dates, setDates] = useState(savedFilters.dates || null);
  const [filters, setFilters] = useState(savedFilters.filters || { status: "", priority: "", missionStatus: "", briefStatus: "" });
  const [includeInactive, setIncludeInactive] = useState(savedFilters.includeInactive || false);
  const [topicViewFilter, setTopicViewFilter] = useState(savedFilters.topicViewFilter || "all");
  const [briefs, setBriefs] = useState([]);
  const [briefSubView, setBriefSubView] = useState("inbox");
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [analysts, setAnalysts] = useState([]);
  const [publishDestinations, setPublishDestinations] = useState([]);
  const [briefActionLoading, setBriefActionLoading] = useState(false);
  const [deadlinePromptTopic, setDeadlinePromptTopic] = useState(null);
  const [deadlineActionLoading, setDeadlineActionLoading] = useState(false);
  const [dismissedOverdueIds, setDismissedOverdueIds] = useState(() => new Set());
  const [collapsedTopicIds, setCollapsedTopicIds] = useState(() => new Set());
  const [showMissionTopicPicker, setShowMissionTopicPicker] = useState(false);
  const [missionPickerFilter, setMissionPickerFilter] = useState("all");
  const { showToast, Toast } = useAnalysisToast();

  const setTab = useCallback((nextTab) => {
    setTabState(nextTab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", nextTab);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (tabFromUrl === "reports") {
      navigate("/analysis/dashboard", { replace: true });
      return;
    }
    if (tabFromUrl && allTabs.find((t) => t.id === tabFromUrl) && tabFromUrl !== tab) {
      setTabState(tabFromUrl);
    } else if (!allTabs.find((t) => t.id === tab)) {
      setTab(allTabs[0]?.id || "missions");
    }
  }, [allTabs, tabFromUrl, tab, setTab, navigate, setSearchParams]);

  useEffect(() => {
    saveManagementFilters({ searchTerm, dates, filters, includeInactive, topicViewFilter });
  }, [searchTerm, dates, filters, includeInactive, topicViewFilter]);

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
  }), [isDarkMode]);

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);
  const inactiveParam = includeInactive ? { includeInactive: "true" } : {};

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = { ...dateRange, search: searchTerm || undefined, ...inactiveParam };
      if (tab === "missions") {
        const [topicList, missionList, stats] = await Promise.all([
          analysisService.getTopics({
            ...baseParams,
            status: filters.status || undefined,
            priority: filters.priority || undefined,
          }),
          analysisService.getAssignments({
            status: filters.missionStatus || undefined,
            ...inactiveParam,
          }),
          analysisService.getAssignmentSummary(),
        ]);
        const assignableTopics = (topicList || []).filter((t) => isTopicAssignableForMission(t));
        setTopics(assignableTopics);
        setTopicSummary(getManagerTopicTabCounts(assignableTopics));
        setMissions(missionList || []);
        setMissionSummary(stats || computeMissionSummary(missionList || []));
      } else if (tab === "briefs") {
        const list = briefSubView === "bank"
          ? await analysisService.getBriefBank({
              status: filters.briefStatus || undefined,
              search: searchTerm || undefined,
            })
          : await analysisService.getBriefSubmissions({
              status: filters.briefStatus || (briefSubView === "inbox" ? "Submitted" : undefined),
              search: searchTerm || undefined,
            });
        const filtered = (list || []).filter((b) => b.entry_mode !== "topic_proposal");
        setBriefs(filtered);
        if (!analysts.length) {
          analysisService.getAnalysts().then((u) => setAnalysts(u || [])).catch(() => {});
        }
        messengerAdminService.listDestinations(MESSENGER_USAGE_KEYS.ANALYSIS_SUBMISSION_PUBLISH)
          .then((rows) => setPublishDestinations(rows || []))
          .catch(() => setPublishDestinations([]));
      }
    } catch {
      if (tab === "missions") {
        setTopics([]);
        setTopicSummary({});
        setMissions([]);
        setMissionSummary({});
      }
      if (tab === "briefs") setBriefs([]);
    } finally {
      setLoading(false);
    }
  }, [tab, briefSubView, dateRange, searchTerm, filters.status, filters.priority, filters.missionStatus, filters.briefStatus, includeInactive, analysts.length]);

  useEffect(() => { loadData(); }, [loadData]);

  const overdueTopics = useMemo(
    () => topics.filter((t) => isTopicOverdueForAction(t) && !dismissedOverdueIds.has(t.id)),
    [topics, dismissedOverdueIds],
  );

  useEffect(() => {
    if (tab !== "missions" || loading || deadlinePromptTopic) return;
    if (overdueTopics.length > 0) {
      setDeadlinePromptTopic(overdueTopics[0]);
    }
  }, [tab, loading, overdueTopics, deadlinePromptTopic]);

  const handleCompleteTopic = useCallback(async (topic) => {
    if (!window.confirm(`${ANALYSIS_TERMS.completeTopicConfirm}\n\nادامه می‌دهید؟`)) return;
    setDeadlineActionLoading(true);
    try {
      await analysisService.completeTopic(topic.id);
      showToast("محور بسته شد");
      setDismissedOverdueIds((prev) => new Set(prev).add(topic.id));
      setDeadlinePromptTopic(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setDeadlineActionLoading(false);
    }
  }, [loadData, showToast]);

  const handleExtendTopicDeadline = useCallback(async (topic, newDeadline) => {
    setDeadlineActionLoading(true);
    try {
      await analysisService.updateTopic(topic.id, { suggested_deadline: newDeadline });
      showToast("مهلت تمدید شد");
      setDismissedOverdueIds((prev) => new Set(prev).add(topic.id));
      setDeadlinePromptTopic(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setDeadlineActionLoading(false);
    }
  }, [loadData, showToast]);

  const handleDismissDeadlinePrompt = useCallback(() => {
    if (deadlinePromptTopic) {
      setDismissedOverdueIds((prev) => new Set(prev).add(deadlinePromptTopic.id));
    }
    setDeadlinePromptTopic(null);
  }, [deadlinePromptTopic]);

  const filteredMissions = useMemo(() => {
    if (!searchTerm) return missions;
    const q = searchTerm.toLowerCase();
    return missions.filter((m) =>
      (m.topic_title || "").toLowerCase().includes(q) ||
      (m.analyst_realname || "").toLowerCase().includes(q) ||
      (m.topic_code || "").toLowerCase().includes(q)
    );
  }, [missions, searchTerm]);

  const statsBar = useMemo(() => {
    if (tab === "missions") {
      return [
        { label: "محور قابل ارجاع", value: topicSummary.total ?? topics.length, color: "#22c55e" },
        { label: "جدید (بدون مأموریت)", value: topicSummary.newCount ?? 0, color: "#22c55e", key: "newTopics" },
        { label: "کل مأموریت", value: missionSummary.total, color: "#38bdf8" },
        { label: "فعال", value: missionSummary.active, color: "#6366f1" },
        { label: "در انتظار بررسی", value: missionSummary.pending_review, color: "#f59e0b" },
        { label: "نیازمند اصلاح", value: missionSummary.needs_revision, color: "#ef4444" },
        { label: "تأخیر", value: missionSummary.delayed, color: "#dc2626" },
      ];
    }
    if (tab === "briefs") {
      const pending = briefSubView === "inbox"
        ? briefs.filter((b) => b.status === "Submitted").length
        : 0;
      const published = briefSubView === "bank"
        ? briefs.filter((b) => b.status === "Published").length
        : 0;
      return [
        { label: briefSubView === "bank" ? "بانک" : "صندوق", value: briefs.length, color: "#38bdf8" },
        ...(briefSubView === "inbox"
          ? [{ label: "جدید", value: pending, color: "#f59e0b" }]
          : [{ label: "منتشرشده", value: published, color: "#22c55e" }]),
      ];
    }
    return [];
  }, [tab, briefSubView, topicSummary, missionSummary, topics.length, briefs]);

  const openMissionTopicPicker = useCallback((filter = "all") => {
    setMissionPickerFilter(filter);
    setShowMissionTopicPicker(true);
  }, []);

  const handleStatClick = useCallback((stat) => {
    if (tab !== "missions" || stat.key !== "newTopics") return;
    openMissionTopicPicker("new");
  }, [tab, openMissionTopicPicker]);

  const handleCreateMission = useCallback(() => {
    openMissionTopicPicker("all");
  }, [openMissionTopicPicker]);

  const handleMissionTopicSelect = useCallback((topic) => {
    setShowMissionTopicPicker(false);
    navigate(getManagementAssignTopicUrl(topic.id));
  }, [navigate]);

  const handleBriefStatus = async (status, payload = {}) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.updateBriefStatus(selectedBrief.id, { status, ...payload });
      setSelectedBrief(updated);
      showToast("وضعیت به‌روز شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleApproveBank = async (payload) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.approveBriefBank(selectedBrief.id, payload);
      setSelectedBrief(updated);
      showToast("در بانک تحلیل ذخیره شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleRejectBrief = async (payload) => {
    if (!payload?.reject_reason?.trim()) return showToast("دلیل رد الزامی است");
    await handleBriefStatus("Rejected", payload);
  };

  const handleArchiveBrief = async (payload) => {
    await handleBriefStatus("Archived", payload);
  };

  const handleEditorApprove = async (payload) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.approveBriefForPublish(selectedBrief.id, payload);
      setSelectedBrief(updated);
      showToast("برای انتشار تأیید شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handlePublishBrief = async (payload) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.publishBriefSubmission(selectedBrief.id, payload);
      setSelectedBrief(updated);
      const summary = updated.publish_summary;
      if (summary?.fail > 0) {
        showToast(`انتشار در ${summary.ok} از ${summary.total} کانال موفق بود`);
      } else if (summary?.ok > 1) {
        showToast(`منتشر شد در ${summary.ok} کانال`);
      } else {
        showToast(updated.status === "Published" && selectedBrief.status === "Published" ? "انتشار مجدد انجام شد" : "منتشر شد");
      }
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا در انتشار");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleEditBankContent = async (payload) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.editBriefBankContent(selectedBrief.id, payload);
      setSelectedBrief(updated);
      showToast("متن بانک ذخیره شد");
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleEditContent = async (payload) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.editBriefContent(selectedBrief.id, payload);
      setSelectedBrief(updated);
      showToast("متن تحلیل ذخیره شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleBriefQuality = async (quality_tag) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.updateBriefStatus(selectedBrief.id, {
        status: selectedBrief.status,
        quality_tag,
      });
      setSelectedBrief(updated);
      showToast("برچسب کیفیت ثبت شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const topicsReadyToAssign = useMemo(() => {
    let list = topics.filter(isTopicNewForAssignment);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(q) ||
          (t.topic_code || "").toLowerCase().includes(q) ||
          (t.proposer_name || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [topics, searchTerm]);

  const missionTopicGroups = useMemo(() => {
    if (topicViewFilter === "new") return [];
    const byTopic = new Map();
    for (const m of filteredMissions) {
      const tid = m.topic_id;
      if (!tid) continue;
      if (!byTopic.has(tid)) byTopic.set(tid, []);
      byTopic.get(tid).push(m);
    }
    const groups = [];
    for (const [tid, ms] of byTopic) {
      const topic = topicById.get(tid) || {
        id: tid,
        topic_code: ms[0]?.topic_code,
        title: ms[0]?.topic_title,
      };
      if (filters.status && topic.status && topic.status !== filters.status) continue;
      if (filters.priority && topic.priority && topic.priority !== filters.priority) continue;
      groups.push({
        topic,
        missions: [...ms].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)),
      });
    }
    groups.sort((a, b) => {
      const aActive = a.missions.filter((m) => ["Assigned", "InProgress", "Submitted", "UnderReview", "NeedsRevision"].includes(m.status)).length;
      const bActive = b.missions.filter((m) => ["Assigned", "InProgress", "Submitted", "UnderReview", "NeedsRevision"].includes(m.status)).length;
      if (bActive !== aActive) return bActive - aActive;
      return (a.topic.title || "").localeCompare(b.topic.title || "", "fa");
    });
    return groups;
  }, [filteredMissions, topicById, topicViewFilter, filters.status, filters.priority]);

  useEffect(() => {
    if (!topicIdFromUrl || topicViewFilter === "new") return;
    const tid = Number(topicIdFromUrl);
    if (!Number.isFinite(tid)) return;
    setCollapsedTopicIds((prev) => {
      const next = new Set(prev);
      next.delete(tid);
      return next;
    });
  }, [topicIdFromUrl, topicViewFilter, missionTopicGroups.length]);

  const toggleTopicGroup = useCallback((topicId) => {
    setCollapsedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }, []);

  const isTopicGroupExpanded = useCallback(
    (topicId) => !collapsedTopicIds.has(topicId),
    [collapsedTopicIds],
  );

  const handlePromoteTopic = async (opts) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const result = await analysisService.promoteBriefToTopic(selectedBrief.id, opts);
      setSelectedBrief(result.brief);
      showToast("به محور ارتقا یافت");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handlePromoteMission = async (opts) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const result = await analysisService.promoteBriefToMission(selectedBrief.id, opts);
      setSelectedBrief(result.brief);
      showToast("به مأموریت ارتقا یافت");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const handleSuggestAnalyst = async (opts) => {
    if (!selectedBrief) return;
    setBriefActionLoading(true);
    try {
      const updated = await analysisService.suggestAnalystFromBrief(selectedBrief.id, opts);
      setSelectedBrief(updated);
      showToast("پیشنهاد تحلیل‌گر ثبت شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setBriefActionLoading(false);
    }
  };

  const inactiveCheckbox = (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", marginTop: 10, color: theme.text }}>
      <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
      نمایش لغو/بایگانی
    </label>
  );

  const filterContent = tab === "briefs" ? (
    <>
      <label className="v3-filter-label">وضعیت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.briefStatus || ""} onChange={(e) => setFilters({ ...filters, briefStatus: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(BRIEF_STATUS_META)
          .filter(([k]) => (briefSubView === "bank" ? !["Submitted", "Acknowledged"].includes(k) : true))
          .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
    </>
  ) : tab === "missions" ? (
    <>
      <label className="v3-filter-label">وضعیت محور</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(TOPIC_STATUS_META).filter(([k]) => ["Approved", "Assigned"].includes(k)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <label className="v3-filter-label">نما</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={topicViewFilter} onChange={(e) => setTopicViewFilter(e.target.value)}>
        <option value="all">مأموریت‌ها (دسته‌بندی بر اساس محور)</option>
        <option value="new">محورهای آماده ارجاع (بدون مأموریت)</option>
      </select>
      <label className="v3-filter-label">وضعیت مأموریت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.missionStatus} onChange={(e) => setFilters({ ...filters, missionStatus: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(MISSION_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {inactiveCheckbox}
    </>
  ) : null;

  const priorityNavFilter = tab === "missions" ? (
    <div className="v3-date-box v3-nav-priority-filter" style={{ border: `1px solid ${theme.border}`, background: theme.card, color: theme.text }}>
      <select
        className="v3-nav-priority-select"
        value={filters.priority}
        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        aria-label="فیلتر اولویت محور"
      >
        <option value="">اولویت: همه</option>
        {Object.entries(PRIORITY_META).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
    </div>
  ) : null;

  if (allTabs.length === 0) {
    return (
      <AnalysisMonitorLayout pageTitle={ANALYSIS_TERMS.missionManagementPageTitle} searchTerm="" onSearchChange={() => {}} dates={dates} onDatesChange={setDates} stats={[]} showFilters={false} onToggleFilters={() => {}} onResetFilters={() => {}} filterContent={null} loading={false}>
        <p style={{ textAlign: "center", opacity: 0.6 }}>دسترسی لازم برای این بخش را ندارید.</p>
      </AnalysisMonitorLayout>
    );
  }

  return (
    <AnalysisMonitorLayout
      pageTitle={ANALYSIS_TERMS.missionManagementPageTitle}
      searchPlaceholder={tab === "missions" ? "جستجو مأموریت، محور، تحلیل‌گر..." : tab === "briefs" ? "جستجو عنوان، نویسنده..." : "جستجو..."}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      dates={dates}
      onDatesChange={setDates}
      subNavExtra={priorityNavFilter}
      stats={statsBar}
      onStatClick={handleStatClick}
      showFilters={showFilters}
      onToggleFilters={setShowFilters}
      onResetFilters={() => {
        setFilters({ status: "", priority: "", missionStatus: "", briefStatus: "" });
        setSearchTerm("");
        setDates(null);
        setIncludeInactive(false);
        setTopicViewFilter("all");
        setShowMissionTopicPicker(false);
      }}
      filterContent={filterContent}
      loading={loading}
      onHelp={tab === "briefs" ? BRIEF_INBOX_HELP : MANAGER_PANEL_HELP}
      helpTitle={tab === "briefs" ? "راهنمای تحلیل‌های ثبت‌شده" : `راهنمای ${ANALYSIS_TERMS.missionManagementPageTitle}`}
      tabs={allTabs}
      activeTab={tab}
      onTabChange={setTab}
    >
      {Toast}

      {tab === "missions" && (
        <>
          <AnalysisWorkflowStepper currentStep="assign" compact />

          <div className="v3-mission-groups-toolbar">
            <div>
              <h3 className="v3-mission-pane-title" style={{ color: theme.text, margin: 0 }}>
                {topicViewFilter === "new" ? ANALYSIS_TERMS.readyToAssign : "مأموریت‌های ثبت‌شده"}
              </h3>
              <span className="v3-mission-section-count">
                {topicViewFilter === "new"
                  ? `${topicsReadyToAssign.length} محور بدون مأموریت`
                  : `${filteredMissions.length} مأموریت در ${missionTopicGroups.length} محور`}
              </span>
            </div>
            <button
              type="button"
              className="v3-mission-create-btn"
              onClick={handleCreateMission}
            >
              <Plus size={15} />
              {ANALYSIS_TERMS.createMission}
            </button>
          </div>

          {topicViewFilter === "all" && topicsReadyToAssign.length > 0 && (
            <div
              className="v3-mission-ready-strip"
              style={{ border: `1px solid ${theme.border}`, background: theme.card }}
            >
              <span className="v3-mission-ready-strip-label" style={{ color: theme.text }}>
                {topicsReadyToAssign.length} محور آماده ارجاع:
              </span>
              <div className="v3-mission-ready-strip-chips">
                {topicsReadyToAssign.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="v3-mission-ready-chip"
                    style={{ border: `1px solid ${theme.border}`, color: theme.text }}
                    onClick={() => navigate(getManagementAssignTopicUrl(t.id))}
                    title={t.title}
                  >
                    <span style={{ color: theme.accent }}>{t.topic_code}</span>
                    <span className="v3-mission-ready-chip-title">{t.title}</span>
                  </button>
                ))}
                {topicsReadyToAssign.length > 6 && (
                  <button type="button" className="v3-reset-btn" onClick={() => setTopicViewFilter("new")}>
                    +{topicsReadyToAssign.length - 6} مورد دیگر
                  </button>
                )}
              </div>
            </div>
          )}

          {topicViewFilter === "new" ? (
            topicsReadyToAssign.length === 0 && !loading ? (
              <p style={{ opacity: 0.55, fontSize: 13, padding: "12px 4px" }}>محور تصویب‌شده‌ای بدون مأموریت نیست</p>
            ) : (
              <div className="v3-mission-ready-grid">
                {topicsReadyToAssign.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="v3-mission-ready-card"
                    style={{ border: `1px solid ${theme.border}`, background: theme.card, color: theme.text }}
                    onClick={() => navigate(getManagementAssignTopicUrl(t.id))}
                  >
                    <span className="v3-mission-ready-card-code" style={{ color: theme.accent }}>{t.topic_code}</span>
                    <strong className="v3-mission-ready-card-title">{t.title}</strong>
                    <span className="v3-mission-ready-card-cta">{ANALYSIS_TERMS.createMission}</span>
                  </button>
                ))}
              </div>
            )
          ) : missionTopicGroups.length === 0 && !loading ? (
            <p style={{ opacity: 0.55, fontSize: 13, padding: "12px 4px", textAlign: "center" }}>
              مأموریتی با فیلترهای فعلی یافت نشد
            </p>
          ) : (
            <div className="v3-mission-groups-list">
              {missionTopicGroups.map(({ topic, missions: groupMissions }) => (
                <MissionTopicGroup
                  key={topic.id}
                  topic={topic}
                  missions={groupMissions}
                  theme={theme}
                  expanded={isTopicGroupExpanded(topic.id)}
                  onToggle={() => toggleTopicGroup(topic.id)}
                  onAssign={(row) => navigate(getManagementAssignTopicUrl(row.id))}
                  onOpenMission={(m) => navigate(`/analysis/missions/mission/${m.id}?fromTab=${tab}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "briefs" && (
        <>
          <div className="v3-briefs-subtabs">
            <button
              type="button"
              className="v3-briefs-subtab-btn"
              onClick={() => { setBriefSubView("inbox"); setSelectedBrief(null); }}
              style={{
                border: `1px solid ${briefSubView === "inbox" ? "#10b981" : theme.border}`,
                background: briefSubView === "inbox" ? "rgba(16,185,129,0.12)" : theme.card,
                color: theme.text,
                fontWeight: briefSubView === "inbox" ? 700 : 500,
              }}
            >
              {BRIEF_TERMS.inboxTab}
            </button>
            <button
              type="button"
              className="v3-briefs-subtab-btn"
              onClick={() => { setBriefSubView("bank"); setSelectedBrief(null); }}
              style={{
                border: `1px solid ${briefSubView === "bank" ? "#10b981" : theme.border}`,
                background: briefSubView === "bank" ? "rgba(16,185,129,0.12)" : theme.card,
                color: theme.text,
                fontWeight: briefSubView === "bank" ? 700 : 500,
              }}
            >
              {BRIEF_TERMS.bankTab}
            </button>
          </div>
          <div className={`v3-briefs-layout${selectedBrief ? " has-selection" : ""}`}>
            <div className="v3-briefs-list-pane">
              {briefs.length === 0 && !loading && (
                <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, padding: "24px 8px" }}>
                  {briefSubView === "bank" ? "موردی در بانک تحلیل نیست" : "تحلیل ثبت‌شده‌ای یافت نشد"}
                </p>
              )}
              {briefs.map((b) => (
                <BriefSubmissionCard
                  key={b.id}
                  item={b}
                  theme={theme}
                  selected={selectedBrief?.id === b.id}
                  onClick={(row) => setSelectedBrief(row)}
                />
              ))}
            </div>
            <div className="v3-briefs-detail-pane" style={{ border: `1px solid ${theme.border}`, background: theme.card }}>
              <div className="v3-briefs-detail-header">
                <button
                  type="button"
                  className="v3-briefs-back-btn"
                  style={{ color: theme.text }}
                  onClick={() => setSelectedBrief(null)}
                >
                  بازگشت به لیست
                </button>
              </div>
              <BriefSubmissionDetail
                item={selectedBrief}
                theme={theme}
                analysts={analysts}
                publishDestinations={publishDestinations}
                loading={briefActionLoading}
                onApproveBank={handleApproveBank}
                onReject={handleRejectBrief}
                onArchive={handleArchiveBrief}
                onStatus={handleBriefStatus}
                onEditorApprove={handleEditorApprove}
                onPublish={handlePublishBrief}
                onEditContent={handleEditContent}
                onEditBankContent={handleEditBankContent}
                onPromoteTopic={handlePromoteTopic}
                onPromoteMission={handlePromoteMission}
                onSuggestAnalyst={handleSuggestAnalyst}
                onQualityTag={handleBriefQuality}
              />
            </div>
          </div>
        </>
      )}

      {showMissionTopicPicker && tab === "missions" && (
        <MissionTopicPickerModal
          open={showMissionTopicPicker}
          topics={topics}
          theme={theme}
          initialFilter={missionPickerFilter}
          onClose={() => setShowMissionTopicPicker(false)}
          onSelectTopic={handleMissionTopicSelect}
        />
      )}

      {deadlinePromptTopic && tab === "missions" && (
        <TopicDeadlinePromptModal
          topic={deadlinePromptTopic}
          theme={theme}
          isDarkMode={isDarkMode}
          managerView
          loading={deadlineActionLoading}
          onComplete={handleCompleteTopic}
          onExtend={handleExtendTopicDeadline}
          onDismiss={handleDismissDeadlinePrompt}
        />
      )}
    </AnalysisMonitorLayout>
  );
}
