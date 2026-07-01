import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, ClipboardList, TrendingUp, CheckCircle } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisMonitorLayout from "../../components/analysis/AnalysisMonitorLayout.jsx";
import TopicCard from "../../components/analysis/TopicCard.jsx";
import MissionCard from "../../components/analysis/MissionCard.jsx";
import analysisService from "../../services/analysisService";
import { canApproveTopics, canManageAnalysis } from "../../utils/analysisAuth.js";
import { loadManagementFilters, saveManagementFilters } from "../../utils/analysisManagementNav.js";
import AnalysisReportsDashboard from "./AnalysisReportsDashboard.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { MANAGER_PANEL_HELP } from "../../content/analysisFormHelp.jsx";
import {
  TOPIC_STATUS_META, MISSION_STATUS_META, PRIORITY_META, getDateRangeParams, toPersianDigits,
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

export default function AnalysisManagerPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useAppTheme();
  const canApprove = canApproveTopics();
  const canManage = canManageAnalysis();

  const allTabs = useMemo(() => {
    const tabs = [];
    if (canApprove) tabs.push({ id: "approve", label: ANALYSIS_TERMS.ratifyTab, icon: CheckCircle });
    if (canManage) {
      tabs.push({ id: "assign", label: ANALYSIS_TERMS.assignTab, icon: BookOpen });
      tabs.push({ id: "missions", label: "مأموریت‌ها", icon: ClipboardList });
      tabs.push({ id: "reports", label: "گزارش‌ها", icon: TrendingUp });
    }
    return tabs;
  }, [canApprove, canManage]);

  const savedFilters = useMemo(() => loadManagementFilters() || {}, []);
  const tabFromUrl = searchParams.get("tab");
  const initialTab = allTabs.find((t) => t.id === tabFromUrl)?.id || allTabs[0]?.id || "approve";

  const [tab, setTabState] = useState(initialTab);
  const [topics, setTopics] = useState([]);
  const [missions, setMissions] = useState([]);
  const [topicSummary, setTopicSummary] = useState({});
  const [missionSummary, setMissionSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm || "");
  const [showFilters, setShowFilters] = useState(false);
  const [dates, setDates] = useState(savedFilters.dates || null);
  const [filters, setFilters] = useState(savedFilters.filters || { status: "", priority: "", missionStatus: "" });
  const [includeInactive, setIncludeInactive] = useState(savedFilters.includeInactive || false);

  const setTab = useCallback((nextTab) => {
    setTabState(nextTab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", nextTab);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (tabFromUrl && allTabs.find((t) => t.id === tabFromUrl) && tabFromUrl !== tab) {
      setTabState(tabFromUrl);
    } else if (!allTabs.find((t) => t.id === tab)) {
      setTab(allTabs[0]?.id || "approve");
    }
  }, [allTabs, tabFromUrl, tab, setTab]);

  useEffect(() => {
    saveManagementFilters({ searchTerm, dates, filters, includeInactive });
  }, [searchTerm, dates, filters, includeInactive]);

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
      if (tab === "approve") {
        const [list, stats] = await Promise.all([
          analysisService.getTopics({ ...baseParams, status: filters.status || undefined, priority: filters.priority || undefined }),
          analysisService.getTopicSummary({ ...dateRange }),
        ]);
        const pending = (list || []).filter((t) => ["Submitted", "UnderReview"].includes(t.status));
        setTopics(filters.status ? (list || []) : pending);
        setTopicSummary(stats || {});
      } else if (tab === "assign") {
        const list = await analysisService.getTopics({ ...baseParams, status: filters.status || undefined, priority: filters.priority || undefined });
        setTopics((list || []).filter((t) => ["Approved", "Assigned"].includes(t.status)));
        setTopicSummary({});
      } else if (tab === "missions") {
        const [list, stats] = await Promise.all([
          analysisService.getAssignments({ status: filters.missionStatus || undefined, ...inactiveParam }),
          analysisService.getAssignmentSummary(),
        ]);
        setMissions(list || []);
        setMissionSummary(stats || computeMissionSummary(list || []));
      }
    } catch {
      if (tab === "approve" || tab === "assign") { setTopics([]); setTopicSummary({}); }
      if (tab === "missions") { setMissions([]); setMissionSummary({}); }
    } finally {
      setLoading(false);
    }
  }, [tab, dateRange, searchTerm, filters.status, filters.priority, filters.missionStatus, includeInactive]);

  useEffect(() => { loadData(); }, [loadData]);

  const statsBar = useMemo(() => {
    if (tab === "missions") {
      return [
        { label: "کل مأموریت", value: missionSummary.total, color: "#38bdf8" },
        { label: "فعال", value: missionSummary.active, color: "#6366f1" },
        { label: "در انتظار بررسی", value: missionSummary.pending_review, color: "#f59e0b" },
        { label: "نیازمند اصلاح", value: missionSummary.needs_revision, color: "#ef4444" },
        { label: "تأخیر", value: missionSummary.delayed, color: "#dc2626" },
      ];
    }
    if (tab === "reports") {
      return [{ label: "گزارش تحلیلی", value: "—", color: "#38bdf8" }];
    }
    if (tab === "assign") {
      return [{ label: "محورهای قابل ارجاع", value: topics.length, color: "#22c55e" }];
    }
    return [
      { label: "کل محورها", value: topicSummary.total, color: "#38bdf8" },
      { label: "ثبت‌شده", value: topicSummary.submitted, color: "#0ea5e9" },
      { label: "برگشت‌خورده", value: topicSummary.under_review, color: "#f59e0b" },
      { label: ANALYSIS_TERMS.ratify, value: topicSummary.approved, color: "#22c55e" },
      { label: "رد شده", value: topicSummary.rejected, color: "#ef4444" },
    ];
  }, [tab, topicSummary, missionSummary, topics.length]);

  const inactiveCheckbox = (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", marginTop: 10, color: theme.text }}>
      <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
      نمایش لغو/بایگانی
    </label>
  );

  const filterContent = tab === "missions" ? (
    <>
      <label className="v3-filter-label">وضعیت مأموریت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.missionStatus} onChange={(e) => setFilters({ ...filters, missionStatus: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(MISSION_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {inactiveCheckbox}
    </>
  ) : (
    <>
      <label className="v3-filter-label">وضعیت محور</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(TOPIC_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <label className="v3-filter-label">اولویت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {inactiveCheckbox}
    </>
  );

  const filteredMissions = useMemo(() => {
    if (!searchTerm) return missions;
    const q = searchTerm.toLowerCase();
    return missions.filter((m) =>
      (m.topic_title || "").toLowerCase().includes(q) ||
      (m.analyst_realname || "").toLowerCase().includes(q) ||
      (m.topic_code || "").toLowerCase().includes(q)
    );
  }, [missions, searchTerm]);


  const handleTopicClick = (t) => {
    if (tab === "approve") navigate(`/analysis/management/approve/${t.id}?fromTab=${tab}`);
    if (tab === "assign") navigate(`/analysis/management/topic/${t.id}?fromTab=${tab}`);
  };

  if (allTabs.length === 0) {
    return (
      <AnalysisMonitorLayout pageTitle="مدیریت تحلیل‌ها" searchTerm="" onSearchChange={() => {}} dates={dates} onDatesChange={setDates} stats={[]} showFilters={false} onToggleFilters={() => {}} onResetFilters={() => {}} filterContent={null} loading={false}>
        <p style={{ textAlign: "center", opacity: 0.6 }}>دسترسی لازم برای این بخش را ندارید.</p>
      </AnalysisMonitorLayout>
    );
  }

  return (
    <AnalysisMonitorLayout
      pageTitle="مدیریت تحلیل‌ها"
      searchPlaceholder={tab === "missions" ? "جستجو محور، تحلیل‌گر..." : "جستجو محورها..."}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      dates={dates}
      onDatesChange={setDates}
      stats={statsBar}
      showFilters={showFilters}
      onToggleFilters={setShowFilters}
      onResetFilters={() => { setFilters({ status: "", priority: "", missionStatus: "" }); setSearchTerm(""); setDates(null); setIncludeInactive(false); }}
      filterContent={filterContent}
      loading={loading}
      onHelp={MANAGER_PANEL_HELP}
      helpTitle="راهنمای مدیریت تحلیل"
      tabs={allTabs}
      activeTab={tab}
      onTabChange={setTab}
    >
      {(tab === "approve" || tab === "assign") && (
        <AnalysisWorkflowStepper
          currentStep={tab === "approve" ? "ratify" : "assign"}
          compact
        />
      )}

      {(tab === "approve" || tab === "assign") && (
        <div className="v3-report-grid">
          {topics.length === 0 && !loading && <p style={{ gridColumn: "1/-1", textAlign: "center", opacity: 0.5 }}>محوری یافت نشد</p>}
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} theme={theme} onClick={() => handleTopicClick(t)} showAssignStats={tab === "assign"} />
          ))}
        </div>
      )}

      {tab === "missions" && (
        <div className="v3-report-grid">
          {filteredMissions.length === 0 && !loading && <p style={{ gridColumn: "1/-1", textAlign: "center", opacity: 0.5 }}>مأموریتی یافت نشد</p>}
          {filteredMissions.map((m) => (
            <MissionCard key={m.id} mission={m} theme={theme} onOpen={() => navigate(`/analysis/management/mission/${m.id}?fromTab=${tab}`)} />
          ))}
        </div>
      )}

      {tab === "reports" && (
        <AnalysisReportsDashboard theme={theme} isDarkMode={isDarkMode} dateRange={dateRange} loading={loading} />
      )}
    </AnalysisMonitorLayout>
  );
}
