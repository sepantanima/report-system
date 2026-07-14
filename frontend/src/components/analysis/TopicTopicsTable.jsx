import React from "react";
import { ChevronDown, ChevronUp, Edit3, Send, Archive, History, CheckCircle, ExternalLink, ClipboardList, Flag } from "lucide-react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  PRIORITY_META,
  getDeadlineMeta,
  formatPersianDateShort,
  toPersianDigits,
  getProposerTopicStatusMeta,
  getTopicAssignmentSubline,
  getTopicAssignmentStats,
  getTopicPendingCount,
  getManagerTopicReferralBadge,
  isTopicNewForAssignment,
  isTopicClosedForAssignment,
  isTopicAssignableForMission,
  TOPIC_TABLE_SORT_FIELDS,
} from "../../utils/analysisMonitorUtils.js";

function getReturnComment(topic) {
  if (topic.status === "UnderReview") return topic.last_return_comment;
  if (topic.status === "Rejected") return topic.last_reject_comment;
  return null;
}

const DEFAULT_COLUMNS = ["topic_code", "title", "status", "priority", "suggested_deadline", "created_at"];

export default function TopicTopicsTable({
  topics = [],
  theme,
  sortField = "updated_at",
  sortDirection = "desc",
  onSortChange,
  columns = DEFAULT_COLUMNS,
  proposerView = false,
  approvalView = false,
  managerView = false,
  highlightNewOnly = false,
  showCreator = false,
  emptyMessage = "محوری یافت نشد",
  userId,
  canEditTopic,
  canResubmitTopic,
  getArchiveMeta,
  isPrivileged = false,
  onEdit,
  onResubmit,
  onArchive,
  onHistory,
  onApprove,
  onGoAssign,
  onGoMissions,
  onCreateMission,
  onCompleteTopic,
  onRowClick,
}) {
  const effectiveColumns = [...columns];
  if (showCreator && !effectiveColumns.includes("creator_name")) effectiveColumns.push("creator_name");
  const columnDefs = TOPIC_TABLE_SORT_FIELDS.filter((c) => effectiveColumns.includes(c.key));

  const toggleSort = (field) => {
    if (!onSortChange) return;
    if (sortField === field) {
      onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, field === "title" || field === "topic_code" || field === "domain" ? "asc" : "desc");
    }
  };

  const SortHeader = ({ field, children, width }) => {
    const sortable = !!onSortChange;
    return (
      <th
        className={sortable ? "sortable" : ""}
        style={{ width }}
        onClick={sortable ? () => toggleSort(field) : undefined}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          {sortable && sortField === field ? (
            sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
          ) : null}
        </span>
      </th>
    );
  };

  if (!topics.length) {
    return <p style={{ textAlign: "center", opacity: 0.5, padding: "40px 0" }}>{emptyMessage}</p>;
  }

  return (
    <div className="v3-topic-table-wrap" style={{ background: theme?.card, color: theme?.text }}>
      <table className="v3-topic-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            {columnDefs.map((col) => (
              <SortHeader key={col.key} field={col.key}>{col.label}</SortHeader>
            ))}
            <th style={{ width: managerView ? 220 : 160 }}>عملیات</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic, idx) => {
            const status = getProposerTopicStatusMeta(topic, proposerView);
            const assignmentSubline = proposerView ? getTopicAssignmentSubline(topic) : null;
            const priority = PRIORITY_META[topic.priority] || PRIORITY_META.medium;
            const deadline = getDeadlineMeta(topic.suggested_deadline);
            const returnComment = getReturnComment(topic);
            const canEdit = proposerView && canEditTopic?.(topic, userId, false);
            const canResubmit = proposerView && canResubmitTopic?.(topic, userId);
            const archiveMeta = proposerView && getArchiveMeta ? getArchiveMeta(topic) : { allowed: false };
            const stats = getTopicAssignmentStats(topic);
            const pendingAssignments = getTopicPendingCount(topic);
            const referralBadge = managerView ? getManagerTopicReferralBadge(topic) : null;
            const showAssignLink = isPrivileged && onGoAssign && topic.status === "Approved" && !managerView;
            const showCreateMission = managerView && onCreateMission && isTopicAssignableForMission(topic);
            const showCompleteTopic = managerView && onCompleteTopic && isTopicAssignableForMission(topic);
            const showMissionsLink = isPrivileged && onGoMissions && (pendingAssignments > 0 || (topic.status === "Assigned" && stats.total > 0));
            const rowHighlight = highlightNewOnly && isTopicNewForAssignment(topic);

            return (
              <tr
                key={topic.id}
                onClick={() => onRowClick?.(topic)}
                style={{
                  cursor: onRowClick ? "pointer" : undefined,
                  background: rowHighlight ? "rgba(34,197,94,0.08)" : undefined,
                }}
              >
                <td style={{ opacity: 0.6 }}>{idx + 1}</td>
                {columnDefs.map((col) => {
                  switch (col.key) {
                    case "topic_code":
                      return (
                        <td key={col.key} style={{ fontSize: 11, color: theme?.accent || "#38bdf8", whiteSpace: "nowrap" }}>
                          {topic.topic_code}
                        </td>
                      );
                    case "title":
                      return (
                        <td key={col.key} className="topic-title-cell">
                          {topic.title}
                          {topic.description ? (
                            <div className="topic-desc-snippet">{topic.description}</div>
                          ) : null}
                          {returnComment && proposerView ? (
                            <div className="return-hint" title={returnComment}>
                              {topic.status === "Rejected" ? "علت رد: " : "علت برگشت: "}
                              {returnComment.length > 60 ? `${returnComment.slice(0, 60)}…` : returnComment}
                            </div>
                          ) : null}
                        </td>
                      );
                    case "status":
                      return (
                        <td key={col.key}>
                          <span
                            className="status-pill"
                            style={{
                              background: `${status.color}22`,
                              color: status.color,
                              border: `1px solid ${status.color}44`,
                            }}
                          >
                            {status.label}
                          </span>
                          {assignmentSubline ? (
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                              {assignmentSubline}
                            </div>
                          ) : null}
                          {managerView && stats.total > 0 ? (
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                              {toPersianDigits(stats.active)} فعال · {toPersianDigits(stats.done)} تمام
                              {stats.cancelled > 0 ? ` · ${toPersianDigits(stats.cancelled)} لغو` : ""}
                            </div>
                          ) : null}
                        </td>
                      );
                    case "referral_badge":
                      return (
                        <td key={col.key}>
                          {referralBadge ? (
                            <span
                              className="status-pill"
                              style={{
                                background: `${referralBadge.color}22`,
                                color: referralBadge.color,
                                border: `1px solid ${referralBadge.color}44`,
                              }}
                            >
                              {referralBadge.label}
                            </span>
                          ) : "—"}
                        </td>
                      );
                    case "assignment_active":
                      return (
                        <td key={col.key} style={{ textAlign: "center", fontWeight: stats.active > 0 ? 700 : 400, color: stats.active > 0 ? "#6366f1" : undefined }}>
                          {toPersianDigits(stats.active)}
                        </td>
                      );
                    case "assignment_total":
                      return <td key={col.key} style={{ textAlign: "center" }}>{toPersianDigits(stats.total)}</td>;
                    case "assignment_done":
                      return (
                        <td key={col.key} style={{ textAlign: "center", color: stats.done > 0 ? "#22c55e" : undefined }}>
                          {toPersianDigits(stats.done)}
                        </td>
                      );
                    case "assignment_cancelled":
                      return (
                        <td key={col.key} style={{ textAlign: "center", opacity: stats.cancelled > 0 ? 1 : 0.5 }}>
                          {toPersianDigits(stats.cancelled)}
                        </td>
                      );
                    case "priority":
                      return (
                        <td key={col.key}>
                          <span className="priority-pill" style={{ background: priority.color, color: "#fff" }}>
                            {priority.label}
                          </span>
                        </td>
                      );
                    case "suggested_deadline":
                      return (
                        <td key={col.key} style={{ color: deadline.color, whiteSpace: "nowrap" }}>
                          {deadline.label}
                        </td>
                      );
                    case "domain":
                      return <td key={col.key}>{topic.domain || "—"}</td>;
                    case "creator_name":
                      return <td key={col.key}>{topic.creator_name || "—"}</td>;
                    case "created_at":
                      return <td key={col.key} style={{ whiteSpace: "nowrap" }}>{formatPersianDateShort(topic.created_at)}</td>;
                    case "updated_at":
                      return <td key={col.key} style={{ whiteSpace: "nowrap" }}>{formatPersianDateShort(topic.updated_at)}</td>;
                    default:
                      return <td key={col.key}>{topic[col.key] ?? "—"}</td>;
                  }
                })}
                <td className="ops-cell" onClick={(e) => e.stopPropagation()}>
                  {approvalView && onApprove ? (
                    <button type="button" className="ops-btn primary" onClick={() => onApprove(topic)}>
                      <CheckCircle size={12} /> بررسی و {ANALYSIS_TERMS.ratify}
                    </button>
                  ) : null}
                  {proposerView && onHistory ? (
                    <button type="button" className="ops-btn muted" onClick={() => onHistory(topic)}>
                      <History size={12} /> تاریخچه
                    </button>
                  ) : null}
                  {canEdit && onEdit ? (
                    <button type="button" className="ops-btn primary" onClick={() => onEdit(topic)}>
                      <Edit3 size={12} /> ویرایش
                    </button>
                  ) : null}
                  {canResubmit && onResubmit ? (
                    <button type="button" className="ops-btn success" onClick={() => onResubmit(topic)}>
                      <Send size={12} /> ارسال مجدد
                    </button>
                  ) : null}
                  {showCreateMission ? (
                    <button type="button" className="ops-btn success" onClick={() => onCreateMission(topic)}>
                      <ExternalLink size={12} /> {isTopicNewForAssignment(topic) ? "ایجاد مأموریت" : "ارجاع جدید"}
                    </button>
                  ) : showAssignLink ? (
                    <button type="button" className="ops-btn success" onClick={() => onGoAssign(topic)}>
                      <ExternalLink size={12} /> ارجاع
                    </button>
                  ) : null}
                  {showMissionsLink ? (
                    <button type="button" className="ops-btn primary" onClick={() => onGoMissions(topic)}>
                      <ClipboardList size={12} /> مأموریت‌ها
                    </button>
                  ) : null}
                  {showCompleteTopic ? (
                    <button type="button" className="ops-btn muted" onClick={() => onCompleteTopic(topic)} title={ANALYSIS_TERMS.completeTopicConfirm}>
                      <Flag size={12} /> {ANALYSIS_TERMS.completeTopic}
                    </button>
                  ) : null}
                  {archiveMeta.allowed && onArchive ? (
                    <button type="button" className="ops-btn danger" onClick={() => onArchive(topic)} title={archiveMeta.requiresCancel ? "نیاز به لغو ارجاع‌های فعال" : undefined}>
                      <Archive size={12} /> {isPrivileged ? "حذف / بایگانی" : "بایگانی"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
