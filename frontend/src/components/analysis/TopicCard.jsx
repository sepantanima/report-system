import React from "react";
import { MapPin, Clock, Users, Edit3, Send, Archive, AlertCircle, History, RotateCcw } from "lucide-react";
import {
  PRIORITY_META, TOPIC_STATUS_META, getDeadlineMeta, formatPersianDateShort, toPersianDigits,
} from "../../utils/analysisMonitorUtils.js";

function getReturnComment(topic) {
  if (topic.status === "UnderReview") return topic.last_return_comment;
  if (topic.status === "Rejected") return topic.last_reject_comment;
  return null;
}

export default function TopicCard({
  topic, theme, onClick, onEdit, canEdit, canResubmit, onResubmit, canArchive, onArchive, onShowHistory, showAssignStats = false,
}) {
  const priority = PRIORITY_META[topic.priority] || PRIORITY_META.medium;
  const status = TOPIC_STATUS_META[topic.status] || { label: topic.status, color: "#94a3b8" };
  const deadline = getDeadlineMeta(topic.suggested_deadline);
  const isReturned = topic.status === "UnderReview";
  const isRejected = topic.status === "Rejected";
  const returnComment = getReturnComment(topic);
  const cardBorder = isReturned ? "1px solid rgba(245,158,11,0.45)" : isRejected ? "1px solid rgba(239,68,68,0.35)" : `1px solid ${theme.border}`;

  return (
    <div
      className="v3-report-card"
      style={{ background: theme.card, border: cardBorder, position: "relative" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
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
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}44` }}>{status.label}</span>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: priority.color, color: "#fff" }}>{priority.label}</span>
        </div>
      </div>

      {returnComment && (
        <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: isRejected ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${isRejected ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`, fontSize: 11, lineHeight: 1.7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, color: isRejected ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
            <AlertCircle size={12} /> {isRejected ? "علت رد" : "علت برگشت"}
          </div>
          <span style={{ opacity: 0.9 }}>{returnComment}</span>
        </div>
      )}

      <p style={{ fontSize: 12, lineHeight: 1.75, textAlign: "justify", margin: "0 0 12px", flex: 1, opacity: 0.85 }}>
        {topic.description?.length > 160 ? `${topic.description.slice(0, 160)}...` : topic.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {topic.domain && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>{topic.domain}</span>
        )}
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${deadline.color}18`, color: deadline.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} /> مهلت پیشنهادی: {deadline.label}
        </span>
        {showAssignStats ? (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} />
            {toPersianDigits(topic.assignment_total ?? topic.assignment_count ?? 0)} ارجاع
            {" | "}
            {toPersianDigits(topic.assignment_active ?? 0)} در جریان
            {" | "}
            {toPersianDigits(topic.assignment_done ?? 0)} تمام
          </span>
        ) : (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={10} /> {toPersianDigits(topic.assignment_count || 0)} ارجاع
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${theme.border}`, paddingTop: 10, fontSize: 10, opacity: 0.7 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {topic.creator_name || "—"}</span>
        <span>{formatPersianDateShort(topic.created_at)}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {onShowHistory && (
          <button type="button" onClick={onShowHistory} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            <History size={12} /> تاریخچه
          </button>
        )}
        {canEdit && onEdit && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            <Edit3 size={12} /> ویرایش
          </button>
        )}
        {canResubmit && onResubmit && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onResubmit(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            <Send size={12} /> ارسال مجدد
          </button>
        )}
        {canArchive && onArchive && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onArchive(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            <Archive size={12} /> بایگانی
          </button>
        )}
      </div>
    </div>
  );
}
