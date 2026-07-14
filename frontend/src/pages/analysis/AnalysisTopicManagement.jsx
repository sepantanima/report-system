import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, FilePlus, Inbox, Layers } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisMonitorLayout from "../../components/analysis/AnalysisMonitorLayout.jsx";
import MultiSelect from "../../components/MultiSelect.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { TOPIC_MANAGEMENT_HELP } from "../../content/analysisFormHelp.jsx";
import { canApproveTopics, canManageAnalysis, canManageTopicOps } from "../../utils/analysisAuth.js";
import { hasPermission, getSessionRoles } from "../../utils/userRoles.js";
import { loadTopicManagementFilters, saveTopicManagementFilters } from "../../utils/analysisManagementNav.js";
import {
  TOPIC_STATUS_META,
  PRIORITY_META,
  APPROVAL_DEFAULT_STATUSES,
  getDateRangeParams,
} from "../../utils/analysisMonitorUtils.js";
import TopicManagementQueueTab from "./TopicManagementQueueTab.jsx";
import TopicManagementMineTab from "./TopicManagementMineTab.jsx";
import TopicManagementRatifiedTab from "./TopicManagementRatifiedTab.jsx";
import TopicManagementBriefProposalsTab from "./TopicManagementBriefProposalsTab.jsx";

function getAvailableTabs() {
  const roles = getSessionRoles();
  const tabs = [];
  if (canApproveTopics()) {
    tabs.push({ id: "queue", label: "صف تصویب", icon: CheckCircle });
  }
  if (hasPermission(roles, "analysis_propose") || canManageAnalysis()) {
    tabs.push({ id: "mine", label: "پیشنهادات من", icon: FilePlus });
  }
  if (canManageAnalysis()) {
    tabs.push({ id: "ratified", label: "محورهای تصویب‌شده", icon: Layers });
    tabs.push({ id: "brief-proposals", label: "پیشنهادات ثبت تحلیل", icon: Inbox });
  }
  return tabs;
}

function defaultTabForUser(tabs) {
  if (tabs.find((t) => t.id === "queue")) return "queue";
  if (tabs.find((t) => t.id === "mine")) return "mine";
  return tabs[0]?.id || "queue";
}

export default function AnalysisTopicManagement() {
  const { isDarkMode } = useAppTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const availableTabs = useMemo(() => getAvailableTabs(), []);
  const tabFromUrl = searchParams.get("tab");
  const initialTab = availableTabs.find((t) => t.id === tabFromUrl)?.id || defaultTabForUser(availableTabs);

  const saved = useMemo(() => loadTopicManagementFilters() || {}, []);
  const [activeTab, setActiveTabState] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm || "");
  const [showFilters, setShowFilters] = useState(false);
  const [dates, setDates] = useState(saved.dates || null);
  const [filters, setFilters] = useState(saved.filters || {
    statuses: [...APPROVAL_DEFAULT_STATUSES],
    priorities: [],
  });
  const [queueStats, setQueueStats] = useState({ statsBar: [], onStatClick: null });
  const [addTrigger, setAddTrigger] = useState(0);
  const isPrivileged = useMemo(() => canManageTopicOps(), []);

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
    isDarkMode,
  }), [isDarkMode]);

  const setActiveTab = useCallback((nextTab) => {
    setActiveTabState(nextTab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", nextTab);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (tabFromUrl && availableTabs.find((t) => t.id === tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    } else if (!availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(defaultTabForUser(availableTabs));
    }
  }, [tabFromUrl, availableTabs, activeTab, setActiveTab]);

  useEffect(() => {
    saveTopicManagementFilters({ searchTerm, dates, filters, activeTab });
  }, [searchTerm, dates, filters, activeTab]);

  const statusOptions = useMemo(
    () => Object.entries(TOPIC_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
    [],
  );
  const priorityOptions = useMemo(
    () => Object.entries(PRIORITY_META).map(([value, meta]) => ({ value, label: meta.label })),
    [],
  );

  const filterContent = (activeTab === "queue" || activeTab === "mine") ? (
    <>
      <label className="v3-filter-label">وضعیت (چندگانه)</label>
      <MultiSelect
        options={statusOptions}
        values={filters.statuses || []}
        onChange={(statuses) => setFilters({ ...filters, statuses })}
        placeholder="پیش‌فرض تب"
        theme={theme}
      />
      <label className="v3-filter-label">اولویت (چندگانه)</label>
      <MultiSelect
        options={priorityOptions}
        values={filters.priorities || []}
        onChange={(priorities) => setFilters({ ...filters, priorities })}
        placeholder="همه اولویت‌ها"
        theme={theme}
      />
    </>
  ) : null;

  const statsBar = activeTab === "queue" ? queueStats.statsBar : [];
  const onStatClick = activeTab === "queue" ? queueStats.onStatClick : undefined;

  const handleAdd = () => setAddTrigger((n) => n + 1);

  if (availableTabs.length === 0) {
    return (
      <AnalysisMonitorLayout
        pageTitle={ANALYSIS_TERMS.manageAxesPageTitle}
        searchTerm=""
        onSearchChange={() => {}}
        dates={null}
        onDatesChange={() => {}}
        stats={[]}
        showFilters={false}
        onToggleFilters={() => {}}
        onResetFilters={() => {}}
        filterContent={null}
        loading={false}
      >
        <p style={{ textAlign: "center", opacity: 0.6 }}>دسترسی لازم برای مدیریت محورها را ندارید.</p>
      </AnalysisMonitorLayout>
    );
  }

  return (
    <AnalysisMonitorLayout
      pageTitle={ANALYSIS_TERMS.manageAxesPageTitle}
      searchPlaceholder={
        activeTab === "brief-proposals"
          ? "جستجو پیشنهاد موضوع..."
          : "جستجو عنوان، شرح، کلیدواژه..."
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      dates={dates}
      onDatesChange={setDates}
      stats={statsBar}
      onStatClick={onStatClick}
      showFilters={showFilters}
      onToggleFilters={setShowFilters}
      onResetFilters={() => {
        setFilters({ statuses: [...APPROVAL_DEFAULT_STATUSES], priorities: [] });
        setSearchTerm("");
        setDates(null);
      }}
      filterContent={filterContent}
      loading={false}
      onHelp={TOPIC_MANAGEMENT_HELP}
      helpTitle={`راهنمای ${ANALYSIS_TERMS.manageAxesPageTitle}`}
      onAdd={activeTab === "mine" ? handleAdd : undefined}
      addLabel={isPrivileged ? ANALYSIS_TERMS.newAxis : ANALYSIS_TERMS.registerProposal}
      tabs={availableTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === "queue" && (
        <TopicManagementQueueTab
          theme={theme}
          searchTerm={searchTerm}
          dates={dates}
          filters={filters}
          setFilters={setFilters}
          onStatsChange={setQueueStats}
        />
      )}
      {activeTab === "mine" && (
        <TopicManagementMineTab
          theme={theme}
          isDarkMode={isDarkMode}
          searchTerm={searchTerm}
          dates={dates}
          addTrigger={addTrigger}
        />
      )}
      {activeTab === "ratified" && (
        <TopicManagementRatifiedTab
          theme={theme}
          isDarkMode={isDarkMode}
          searchTerm={searchTerm}
          dates={dates}
        />
      )}
      {activeTab === "brief-proposals" && (
        <TopicManagementBriefProposalsTab theme={theme} searchTerm={searchTerm} />
      )}
    </AnalysisMonitorLayout>
  );
}
