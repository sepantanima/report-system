import React, { useState, useEffect, useCallback, useMemo } from "react";
import TopicTopicsList from "../../components/analysis/TopicTopicsList.jsx";
import TopicFormModal from "../../components/analysis/TopicFormModal.jsx";
import TopicHistoryModal from "../../components/analysis/TopicHistoryModal.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import analysisService from "../../services/analysisService";
import useAnalysisToast from "../../hooks/useAnalysisToast.jsx";
import { getCurrentUser, canManageTopicOps } from "../../utils/analysisAuth.js";
import { loadSortPref, saveSortPref } from "../../utils/listSort.js";
import {
  canEditTopic,
  canResubmitTopic,
  getTopicArchiveMeta,
  EMPTY_TOPIC_FORM,
  PROPOSER_TABS,
  getDateRangeParams,
  validateTopicForm,
  getLatestReviewComment,
  applyProposerTopicFilters,
  sortTopicsTable,
  getProposerTabCounts,
  TOPIC_TABLE_SORT_FIELDS,
} from "../../utils/analysisMonitorUtils.js";

const PROPOSER_SORT_KEY = "analysis-proposer-topic-sort";
const DEFAULT_SORT = { field: "updated_at", direction: "desc" };

function tabStatusesForId(tabId) {
  if (tabId === "archive") return ["Rejected", "Closed", "Completed"];
  return ["Submitted", "UnderReview", "Draft"];
}

export default function TopicManagementMineTab({
  theme,
  isDarkMode,
  searchTerm,
  dates,
  addTrigger,
}) {
  const user = getCurrentUser();
  const isPrivileged = useMemo(() => canManageTopicOps(), []);
  const { showToast, Toast } = useAnalysisToast();

  const [topics, setTopics] = useState([]);
  const [archiveTopics, setArchiveTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [filters, setFilters] = useState({ statuses: ["Submitted", "UnderReview", "Draft"], priorities: [] });
  const [sortConfig, setSortConfig] = useState(() =>
    loadSortPref(PROPOSER_SORT_KEY, DEFAULT_SORT, new Set(TOPIC_TABLE_SORT_FIELDS.map((f) => f.key))),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicHistory, setTopicHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_TOPIC_FORM);
  const [historyModal, setHistoryModal] = useState({ open: false, topic: null, history: [] });

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        ...dateRange,
        priority: filters.priorities.length === 1 ? filters.priorities[0] : undefined,
        search: searchTerm || undefined,
      };
      const [list, inactiveList] = await Promise.all([
        analysisService.getTopics(baseParams),
        analysisService.getTopics({ ...baseParams, includeInactive: "true" }),
      ]);
      setTopics(list || []);
      setArchiveTopics(
        (inactiveList || []).filter((t) => ["Rejected", "Closed", "Completed"].includes(t.status)),
      );
    } catch {
      setTopics([]);
      setArchiveTopics([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, filters.priorities, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = useCallback(() => {
    setEditingTopic(null);
    setTopicHistory([]);
    setForm(EMPTY_TOPIC_FORM);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (addTrigger > 0) openCreate();
  }, [addTrigger, openCreate]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setFilters((prev) => ({ ...prev, statuses: tabStatusesForId(tabId) }));
  };

  const handleSortChange = (field, direction) => {
    const next = { field, direction };
    setSortConfig(next);
    saveSortPref(PROPOSER_SORT_KEY, next);
  };

  const tabCounts = useMemo(
    () => getProposerTabCounts(topics, archiveTopics),
    [topics, archiveTopics],
  );

  const visibleTopics = useMemo(() => {
    const filtered = applyProposerTopicFilters(topics, {
      tabId: activeTab,
      statuses: filters.statuses,
      priorities: filters.priorities,
      archiveTopics,
    });
    return sortTopicsTable(filtered, sortConfig.field, sortConfig.direction);
  }, [topics, archiveTopics, activeTab, filters.statuses, filters.priorities, sortConfig]);

  const topicToForm = (topic) => ({
    title: topic.title || "",
    description: topic.description || "",
    domain: topic.domain || "",
    keywords: topic.keywords || "",
    priority: topic.priority || "medium",
    importance_reason: topic.importance_reason || "",
    suggested_deadline: topic.suggested_deadline ? String(topic.suggested_deadline).slice(0, 10) : "",
  });

  const openEdit = async (topic) => {
    try {
      const full = await analysisService.getTopic(topic.id);
      setEditingTopic(full);
      setTopicHistory(full.history || []);
      setForm(topicToForm(full));
      setFormOpen(true);
    } catch {
      setEditingTopic(topic);
      setTopicHistory([]);
      setForm(topicToForm(topic));
      setFormOpen(true);
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTopic(null);
    setTopicHistory([]);
    setForm(EMPTY_TOPIC_FORM);
  };

  const openHistory = async (topic) => {
    try {
      const full = await analysisService.getTopic(topic.id);
      setHistoryModal({ open: true, topic: full, history: full.history || [] });
    } catch {
      showToast("خطا در بارگذاری تاریخچه");
    }
  };

  const handleSubmit = async () => {
    const err = validateTopicForm(form);
    if (err) return showToast(err);
    try {
      if (editingTopic) {
        await analysisService.updateTopic(editingTopic.id, form);
      } else {
        await analysisService.createTopic(form);
      }
      closeForm();
      loadData();
      showToast(isPrivileged ? "محور ثبت شد" : "پیشنهاد موضوع ثبت شد — منتظر تصویب");
    } catch (err) {
      showToast(err.response?.data?.error || "خطا در ذخیره");
    }
  };

  const handleResubmit = async (topic) => {
    if (!window.confirm("پیشنهاد مجدداً برای تصویب ارسال شود؟")) return;
    try {
      await analysisService.resubmitTopic(topic.id);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    }
  };

  const handleArchive = async (topic) => {
    const meta = getTopicArchiveMeta(topic, user.id, isPrivileged);
    if (!meta.allowed) return showToast("امکان بایگانی این مورد وجود ندارد");
    let cancelAssignments = false;
    if (meta.requiresCancel) {
      if (!window.confirm(`این محور ${meta.activeCount} ارجاع فعال دارد.\nبا بایگانی، همه ارجاع‌های فعال لغو می‌شوند.\nادامه می‌دهید؟`)) return;
      cancelAssignments = true;
    } else if (!window.confirm("به آرشیو منتقل شود؟")) return;
    try {
      await analysisService.archiveTopic(topic.id, { cancelAssignments });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    }
  };

  const emptyMessage = activeTab === "archive" ? "مورد آرشیوی ندارید" : "پیشنهاد فعالی ندارید";

  return (
    <>
      {Toast}
      <AnalysisWorkflowStepper currentStep="propose" compact />
      <div className="v3-briefs-subtabs" style={{ marginBottom: 12 }}>
        {PROPOSER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="v3-briefs-subtab-btn"
            onClick={() => handleTabChange(t.id)}
            style={{
              border: `1px solid ${activeTab === t.id ? "#38bdf8" : theme.border}`,
              background: activeTab === t.id ? "rgba(56,189,248,0.12)" : theme.card,
              color: theme.text,
              fontWeight: activeTab === t.id ? 700 : 500,
            }}
          >
            {t.label}
            {tabCounts[t.statKey] > 0 ? ` (${tabCounts[t.statKey]})` : ""}
          </button>
        ))}
      </div>
      {activeTab === "active" && (
        <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 14, lineHeight: 1.7 }}>
          پیشنهادهای در انتظار تصویب. پس از تصویب، محور در «{ANALYSIS_TERMS.missionManagementPageTitle}» قابل ارجاع است.
        </p>
      )}
      {!loading && (
        <TopicTopicsList
          topics={visibleTopics}
          theme={theme}
          sortField={sortConfig.field}
          sortDirection={sortConfig.direction}
          onSortChange={handleSortChange}
          proposerView
          isPrivileged={isPrivileged}
          emptyMessage={emptyMessage}
          userId={user.id}
          canEditTopic={canEditTopic}
          canResubmitTopic={canResubmitTopic}
          getArchiveMeta={(t) => getTopicArchiveMeta(t, user.id, isPrivileged)}
          onEdit={openEdit}
          onResubmit={handleResubmit}
          onArchive={handleArchive}
          onHistory={openHistory}
        />
      )}
      {loading && <p style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری...</p>}

      <TopicFormModal
        open={formOpen}
        onClose={closeForm}
        editingTopic={editingTopic}
        form={form}
        setForm={setForm}
        theme={theme}
        isDarkMode={isDarkMode}
        history={topicHistory}
        returnComment={getLatestReviewComment(editingTopic, topicHistory)}
        onSubmit={handleSubmit}
        submitLabel={editingTopic ? "ذخیره تغییرات" : (isPrivileged ? ANALYSIS_TERMS.registerAxis : ANALYSIS_TERMS.registerProposal)}
      />

      <TopicHistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal({ open: false, topic: null, history: [] })}
        topic={historyModal.topic}
        history={historyModal.history}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
