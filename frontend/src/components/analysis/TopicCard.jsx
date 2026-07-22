import React from "react";
import { MapPin, Clock, Users, Edit3, Send, Archive, AlertCircle, History, RotateCcw, ExternalLink, ClipboardList, CheckCircle } from "lucide-react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  PRIORITY_META, getDeadlineMeta, formatPersianDateShort, toPersianDigits,
  getProposerTopicStatusMeta, isTopicAssignmentsAllDone, getTopicAssignmentStats, getTopicPendingCount,
} from "../../utils/analysisMonitorUtils.js";

function getReturnComment(topic) {
  if (topic.status === "UnderReview") return topic.last_return_comment;
  if (topic.status === "Rejected") return topic.last_reject_comment;
  return null;
}

function ActionBtn({ className = "", onClick, title, children }) {
  return (
    <button
      type="button"
      className={`v3-topic-card-btn ${className}`.trim()}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export default function TopicCard({
  topic,
  theme,
  onClick,
  onEdit,
  canEdit,
  canResubmit,
  onResubmit,
  canArchive,
  onArchive,
  archiveLabel = "بایگانی",
  archiveTitle,
  onShowHistory,
  onGoAssign,
  onGoMissions,
  onApprove,
  showCreator = false,
  showAssignStats = false,
  proposerView = false,
  assignmentSubline = null,
  footerDate,
  footerDateLabel,
}) {
  const priority = PRIORITY_META[topic.priority] || PRIORITY_META.medium;
  const status = getProposerTopicStatusMeta(topic, proposerView);
  const deadline = getDeadlineMeta(topic.suggested_deadline);
  const isReturned = topic.status === "UnderReview";
  const isRejected = topic.status === "Rejected";
  const returnComment = getReturnComment(topic);
  const cardBorder = isReturned ? "1px solid rgba(245,158,11,0.45)" : isRejected ? "1px solid rgba(239,68,68,0.35)" : `1px solid ${theme.border}`;
  const assignStats = getTopicAssignmentStats(topic);
  const pending = getTopicPendingCount(topic);

  return (
    <div
      className="v3-report-card"
      style={{ background: theme.card, border: cardBorder, position: "relative" }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: isReturned ? "#f59e0b" : priority.color }} />

      {isReturned && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 11, fontWeight: 600 }}>
          <RotateCcw size={13} /> برگشت برای اصلاح — لطفاً اصلاح و ارسال مجدد کنید
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10, borderBottom: `1px solid ${theme.border}`, paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: theme.accent || "#38bdf8", marginBottom: 4 }}>{topic.topic_code}</div>
          <strong style={{ fontSize: 14, lineHeight: 1.5 }}>{topic.title}</strong>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span className="v3-topic-card-pill" style={{ background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}44` }}>{status.label}</span>
          <span className="v3-topic-card-pill" style={{ background: priority.color, color: "#fff" }}>{priority.label}</span>
          {assignmentSubline ? (
            <span style={{ fontSize: 10, opacity: 0.75, textAlign: "left", maxWidth: 140, lineHeight: 1.5 }}>{assignmentSubline}</span>
          ) : null}
        </div>
      </div>

      {returnComment && (
        <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: isRejected ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${isRejected ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`, fontSize: 11, lineHeight: 1.7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, color: isRejected ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
            <AlertCircle size={12} /> {isRejected ? "علت رد" : "علت برگشت"}
          </div>
          <span className="page-scalable-text-sm" style={{ opacity: 0.9 }}>{returnComment}</span>
        </div>
      )}

      <p className="page-scalable-text-sm" style={{ lineHeight: 1.75, textAlign: "justify", margin: "0 0 12px", flex: 1, opacity: 0.85 }}>
        {topic.description?.length > 160 ? `${topic.description.slice(0, 160)}...` : topic.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {topic.domain && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>{topic.domain}</span>
        )}
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${deadline.color}18`, color: deadline.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} /> {ANALYSIS_TERMS.suggestedDeadline}: {deadline.label}
        </span>
        {showAssignStats ? (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} />
            {toPersianDigits(assignStats.total)} ارجاع
            {" | "}
            {toPersianDigits(assignStats.active)} در جریان
            {" | "}
            {toPersianDigits(assignStats.done)} تمام
            {assignStats.cancelled > 0 ? (
              <>
                {" | "}
                {toPersianDigits(assignStats.cancelled)} لغو
              </>
            ) : null}
          </span>
        ) : proposerView && topic.status === "Assigned" ? (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: isTopicAssignmentsAllDone(topic) ? "rgba(34,197,94,0.12)" : "rgba(16,185,129,0.12)", color: isTopicAssignmentsAllDone(topic) ? "#22c55e" : "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} />
            {isTopicAssignmentsAllDone(topic)
              ? `${toPersianDigits(assignStats.done)} تمام‌شده`
              : `${toPersianDigits(pending)} در جریان · ${toPersianDigits(assignStats.done)} تمام`}
          </span>
        ) : assignStats.total > 0 ? (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} /> {toPersianDigits(assignStats.total)} ارجاع
          </span>
        ) : assignStats.cancelled > 0 ? (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(148,163,184,0.12)", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} /> {toPersianDigits(assignStats.cancelled)} ارجاع لغوشده
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${theme.border}`, paddingTop: 10, fontSize: 10, opacity: 0.7 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {showCreator ? (topic.creator_name || "—") : (topic.domain || topic.creator_name || "—")}</span>
        <span>{footerDateLabel ? `${footerDateLabel}: ` : ""}{formatPersianDateShort(footerDate || topic.created_at)}</span>
      </div>

      <div className="v3-topic-card-actions" onClick={(e) => e.stopPropagation()}>
        {onShowHistory ? (
          <ActionBtn className="muted" onClick={onShowHistory}>
            <History size={12} /> تاریخچه
          </ActionBtn>
        ) : null}
        {canEdit && onEdit ? (
          <ActionBtn className="primary" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit3 size={12} /> ویرایش
          </ActionBtn>
        ) : null}
        {canResubmit && onResubmit ? (
          <ActionBtn className="success" onClick={(e) => { e.stopPropagation(); onResubmit(); }}>
            <Send size={12} /> ارسال مجدد
          </ActionBtn>
        ) : null}
        {onApprove ? (
          <ActionBtn className="success" onClick={(e) => { e.stopPropagation(); onApprove(e); }}>
            <CheckCircle size={12} /> بررسی و {ANALYSIS_TERMS.ratify}
          </ActionBtn>
        ) : null}
        {onGoAssign ? (
          <ActionBtn className="success" onClick={onGoAssign}>
            <ExternalLink size={12} /> ارجاع
          </ActionBtn>
        ) : null}
        {onGoMissions ? (
          <ActionBtn className="primary" onClick={onGoMissions}>
            <ClipboardList size={12} /> مأموریت‌ها
          </ActionBtn>
        ) : null}
        {canArchive && onArchive ? (
          <ActionBtn className="danger" onClick={(e) => { e.stopPropagation(); onArchive(); }} title={archiveTitle}>
            <Archive size={12} /> {archiveLabel}
          </ActionBtn>
        ) : null}
      </div>
    </div>
  );
}
