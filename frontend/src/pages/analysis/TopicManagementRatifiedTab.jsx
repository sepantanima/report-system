import React, { useState, useEffect, useCallback, useMemo } from "react";
import TopicCard from "../../components/analysis/TopicCard.jsx";
import TopicDeadlinePromptModal from "../../components/analysis/TopicDeadlinePromptModal.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import analysisService from "../../services/analysisService";
import useAnalysisToast from "../../hooks/useAnalysisToast.jsx";
import { getDateRangeParams, isTopicOverdueForAction } from "../../utils/analysisMonitorUtils.js";

export default function TopicManagementRatifiedTab({
  theme,
  isDarkMode,
  searchTerm,
  dates,
}) {
  const { showToast, Toast } = useAnalysisToast();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deadlinePromptTopic, setDeadlinePromptTopic] = useState(null);
  const [deadlineActionLoading, setDeadlineActionLoading] = useState(false);

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await analysisService.getTopics({
        ...dateRange,
        search: searchTerm || undefined,
        includeInactive: "true",
      });
      const ratified = (list || []).filter((t) => ["Approved", "Assigned", "Completed"].includes(t.status));
      setTopics(ratified);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  const approvedTopics = useMemo(
    () => topics.filter((t) => t.status === "Approved"),
    [topics],
  );
  const inFlowTopics = useMemo(
    () => topics.filter((t) => ["Assigned", "Completed"].includes(t.status)),
    [topics],
  );

  const handleCompleteTopic = async (topic) => {
    if (!window.confirm(`${ANALYSIS_TERMS.completeTopicConfirm}\n\nادامه می‌دهید؟`)) return;
    setDeadlineActionLoading(true);
    try {
      await analysisService.completeTopic(topic.id);
      showToast("محور بسته شد");
      setDeadlinePromptTopic(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setDeadlineActionLoading(false);
    }
  };

  const handleExtendTopicDeadline = async (topic, newDeadline) => {
    setDeadlineActionLoading(true);
    try {
      await analysisService.updateTopic(topic.id, { suggested_deadline: newDeadline });
      showToast("مهلت تمدید شد");
      setDeadlinePromptTopic(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setDeadlineActionLoading(false);
    }
  };

  return (
    <>
      {Toast}
      <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 14, lineHeight: 1.7 }}>
        محورهای تصویب‌شده و در جریان. ارجاع مأموریت از «{ANALYSIS_TERMS.missionManagementPageTitle}» انجام می‌شود.
      </p>

      <div style={{ marginBottom: 24 }}>
        <div className="v3-mission-section-header">
          <span className="v3-mission-section-title">محورهای تصویب‌شده</span>
          <span className="v3-mission-section-count">{approvedTopics.length} محور</span>
        </div>
        {approvedTopics.length === 0 && !loading ? (
          <p style={{ opacity: 0.55, fontSize: 13 }}>محور تصویب‌شده‌ای نیست</p>
        ) : (
          <div className="v3-topic-card-grid">
            {approvedTopics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                theme={theme}
                showAssignStats
                footerDate={t.updated_at}
                footerDateLabel="آخرین تغییر"
                onClick={() => {
                  if (isTopicOverdueForAction(t)) setDeadlinePromptTopic(t);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {inFlowTopics.length > 0 && (
        <div>
          <div className="v3-mission-section-header">
            <span className="v3-mission-section-title">{ANALYSIS_TERMS.inAnalysisFlow} / تکمیل‌شده</span>
            <span className="v3-mission-section-count">{inFlowTopics.length} محور</span>
          </div>
          <div className="v3-topic-card-grid">
            {inFlowTopics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                theme={theme}
                showAssignStats
                footerDate={t.updated_at}
                footerDateLabel="آخرین تغییر"
              />
            ))}
          </div>
        </div>
      )}

      {loading && <p style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری...</p>}

      {deadlinePromptTopic && (
        <TopicDeadlinePromptModal
          topic={deadlinePromptTopic}
          theme={theme}
          isDarkMode={isDarkMode}
          managerView
          loading={deadlineActionLoading}
          onComplete={handleCompleteTopic}
          onExtend={handleExtendTopicDeadline}
          onDismiss={() => setDeadlinePromptTopic(null)}
        />
      )}
    </>
  );
}
