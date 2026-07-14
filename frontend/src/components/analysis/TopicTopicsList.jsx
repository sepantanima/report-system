import React, { useMemo } from "react";
import MonitorSortBar from "../MonitorSortBar.jsx";
import TopicCard from "./TopicCard.jsx";
import {
  getTopicAssignmentSubline,
  getTopicAssignmentStats,
  getTopicPendingCount,
  TOPIC_TABLE_SORT_FIELDS,
} from "../../utils/analysisMonitorUtils.js";

const PROPOSER_CARD_SORT_FIELDS = TOPIC_TABLE_SORT_FIELDS.filter((f) =>
  ["updated_at", "created_at", "title", "topic_code", "priority", "suggested_deadline", "status"].includes(f.key),
);

export default function TopicTopicsList({
  topics = [],
  theme,
  sortField = "updated_at",
  sortDirection = "desc",
  onSortChange,
  emptyMessage = "محوری یافت نشد",
  proposerView = false,
  isPrivileged = false,
  userId,
  canEditTopic,
  canResubmitTopic,
  getArchiveMeta,
  onEdit,
  onResubmit,
  onArchive,
  onHistory,
  onGoAssign,
  onGoMissions,
  approvalView = false,
  onApprove,
  onRowClick,
}) {
  const sortConfig = useMemo(
    () => ({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection],
  );

  if (!topics.length) {
    return <p style={{ textAlign: "center", opacity: 0.5, padding: "40px 0" }}>{emptyMessage}</p>;
  }

  return (
    <>
      {onSortChange ? (
        <MonitorSortBar
          fields={PROPOSER_CARD_SORT_FIELDS}
          sortConfig={sortConfig}
          onSortChange={(next) => onSortChange(next.field, next.direction)}
          theme={theme}
          style={{ marginBottom: 14 }}
          compact
        />
      ) : null}

      <div className="v3-topic-card-grid">
        {topics.map((topic) => {
          const canEdit = proposerView && canEditTopic?.(topic, userId, false);
          const canResubmit = proposerView && canResubmitTopic?.(topic, userId);
          const archiveMeta = proposerView && getArchiveMeta ? getArchiveMeta(topic) : { allowed: false };
          const stats = getTopicAssignmentStats(topic);
          const pendingAssignments = getTopicPendingCount(topic);
          const showAssignLink = isPrivileged && onGoAssign && topic.status === "Approved";
          const showMissionsLink = isPrivileged && onGoMissions
            && (pendingAssignments > 0 || (topic.status === "Assigned" && stats.total > 0));

          return (
            <TopicCard
              key={topic.id}
              topic={topic}
              theme={theme}
              proposerView={proposerView}
              showCreator={approvalView}
              assignmentSubline={proposerView ? getTopicAssignmentSubline(topic) : null}
              footerDate={topic.updated_at || topic.created_at}
              footerDateLabel="آخرین تغییر"
              onClick={onRowClick ? () => onRowClick(topic) : undefined}
              onApprove={approvalView && onApprove ? (e) => { e.stopPropagation(); onApprove(topic); } : undefined}
              onEdit={canEdit && onEdit ? () => onEdit(topic) : undefined}
              canEdit={canEdit}
              canResubmit={canResubmit}
              onResubmit={canResubmit && onResubmit ? () => onResubmit(topic) : undefined}
              canArchive={archiveMeta.allowed}
              onArchive={archiveMeta.allowed && onArchive ? () => onArchive(topic) : undefined}
              archiveLabel={isPrivileged ? "حذف / بایگانی" : "بایگانی"}
              archiveTitle={archiveMeta.requiresCancel ? "نیاز به لغو ارجاع‌های فعال" : undefined}
              onShowHistory={proposerView && onHistory ? (e) => { e.stopPropagation(); onHistory(topic); } : undefined}
              onGoAssign={showAssignLink ? (e) => { e.stopPropagation(); onGoAssign(topic); } : undefined}
              onGoMissions={showMissionsLink ? (e) => { e.stopPropagation(); onGoMissions(topic); } : undefined}
            />
          );
        })}
      </div>
    </>
  );
}
