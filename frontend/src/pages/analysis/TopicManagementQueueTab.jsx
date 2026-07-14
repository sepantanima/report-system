import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopicTopicsList from "../../components/analysis/TopicTopicsList.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import analysisService from "../../services/analysisService";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { getTopicApprovalDetailUrl } from "../../utils/analysisManagementNav.js";
import { loadSortPref, saveSortPref } from "../../utils/listSort.js";
import {
  APPROVAL_DEFAULT_STATUSES,
  APPROVAL_STAT_FILTER_MAP,
  getDateRangeParams,
  applyApprovalTopicFilters,
  sortTopicsTable,
  TOPIC_TABLE_SORT_FIELDS,
} from "../../utils/analysisMonitorUtils.js";

const APPROVE_SORT_KEY = "analysis-approve-topic-sort";
const DEFAULT_SORT = { field: "updated_at", direction: "desc" };

const APPROVAL_SUB_TABS = [
  { id: "queue", label: "صف تصویب", statKey: "queue" },
  { id: "archive", label: "آرشیو", statKey: "archive" },
];

export default function TopicManagementQueueTab({
  theme,
  searchTerm,
  dates,
  filters,
  setFilters,
  onStatsChange,
}) {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [topicSummary, setTopicSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("queue");
  const [sortConfig, setSortConfig] = useState(() =>
    loadSortPref(APPROVE_SORT_KEY, DEFAULT_SORT, new Set(TOPIC_TABLE_SORT_FIELDS.map((f) => f.key))),
  );

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);
  const includeInactive = activeSubTab === "archive";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        ...dateRange,
        search: searchTerm || undefined,
        priority: filters.priorities?.length === 1 ? filters.priorities[0] : undefined,
        ...(includeInactive ? { includeInactive: "true" } : {}),
      };
      const [list, stats] = await Promise.all([
        analysisService.getTopics(baseParams),
        analysisService.getTopicSummary({ ...dateRange }),
      ]);
      setTopics(list || []);
      setTopicSummary(stats || {});
    } catch {
      setTopics([]);
      setTopicSummary({});
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTerm, filters.priorities, includeInactive]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubTabChange = (tabId) => {
    setActiveSubTab(tabId);
    if (tabId === "queue") {
      setFilters((prev) => ({ ...prev, statuses: [...APPROVAL_DEFAULT_STATUSES] }));
    } else {
      setFilters((prev) => ({ ...prev, statuses: ["Rejected", "Closed"] }));
    }
  };

  const handleStatClick = (stat) => {
    const mapping = APPROVAL_STAT_FILTER_MAP[stat.key];
    if (!mapping) return;
    if (stat.key === "rejected") {
      handleSubTabChange("archive");
      setFilters((prev) => ({ ...prev, statuses: ["Rejected", "Closed"] }));
      return;
    }
    handleSubTabChange("queue");
    setFilters((prev) => ({
      ...prev,
      statuses: mapping.statuses?.length ? [...mapping.statuses] : [...APPROVAL_DEFAULT_STATUSES],
    }));
  };

  const handleSortChange = (field, direction) => {
    const next = { field, direction };
    setSortConfig(next);
    saveSortPref(APPROVE_SORT_KEY, next);
  };

  const visibleTopics = useMemo(() => {
    const statusFilter = activeSubTab === "archive"
      ? (filters.statuses?.length ? filters.statuses : ["Rejected", "Closed"])
      : (filters.statuses?.length ? filters.statuses : [...APPROVAL_DEFAULT_STATUSES]);
    const filtered = applyApprovalTopicFilters(topics, {
      statuses: statusFilter,
      priorities: filters.priorities || [],
      includeInactive,
    });
    return sortTopicsTable(filtered, sortConfig.field, sortConfig.direction);
  }, [topics, filters.statuses, filters.priorities, includeInactive, activeSubTab, sortConfig]);

  const tabCounts = useMemo(() => ({
    queue: (topicSummary.submitted || 0) + (topicSummary.under_review || 0),
    archive: topicSummary.rejected || 0,
  }), [topicSummary]);

  const statsBar = useMemo(() => {
    if (activeSubTab !== "queue") return [];
    return [
      { key: "submitted", label: "منتظر تصویب", value: topicSummary.submitted, color: "#0ea5e9" },
      { key: "returned", label: "برگشت‌خورده", value: topicSummary.under_review, color: "#f59e0b" },
    ];
  }, [activeSubTab, topicSummary]);

  useEffect(() => {
    onStatsChange?.({ statsBar, onStatClick: handleStatClick });
  }, [statsBar, onStatsChange]);

  return (
    <>
      <div className="v3-briefs-subtabs" style={{ marginBottom: 12 }}>
        {APPROVAL_SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="v3-briefs-subtab-btn"
            onClick={() => handleSubTabChange(t.id)}
            style={{
              border: `1px solid ${activeSubTab === t.id ? "#38bdf8" : theme.border}`,
              background: activeSubTab === t.id ? "rgba(56,189,248,0.12)" : theme.card,
              color: theme.text,
              fontWeight: activeSubTab === t.id ? 700 : 500,
            }}
          >
            {t.label}
            {tabCounts[t.statKey] > 0 ? ` (${tabCounts[t.statKey]})` : ""}
          </button>
        ))}
      </div>
      <AnalysisWorkflowStepper currentStep="ratify" compact />
      {activeSubTab === "queue" ? (
        <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 14, lineHeight: 1.7 }}>
          پیشنهادهای منتظر تصویب یا اصلاح. با تصویب، موضوع به محور تبدیل می‌شود و در «{ANALYSIS_TERMS.missionManagementPageTitle}» قابل ارجاع است.
        </p>
      ) : (
        <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 14, lineHeight: 1.7 }}>
          محورهای رد شده یا بایگانی‌شده در تصویب.
        </p>
      )}
      {!loading && (
        <TopicTopicsList
          topics={visibleTopics}
          theme={theme}
          sortField={sortConfig.field}
          sortDirection={sortConfig.direction}
          onSortChange={handleSortChange}
          approvalView
          emptyMessage={activeSubTab === "queue" ? "پیشنهادی در صف تصویب نیست" : "مورد آرشیوی نیست"}
          onApprove={(t) => navigate(getTopicApprovalDetailUrl(t.id))}
          onRowClick={(t) => navigate(getTopicApprovalDetailUrl(t.id))}
        />
      )}
      {loading && <p style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری...</p>}
    </>
  );
}
