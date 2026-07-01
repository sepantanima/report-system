import React from "react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  TOPIC_STATUS_META, PRIORITY_META, formatPersianDateShort, getDeadlineMeta,
} from "../../utils/analysisMonitorUtils.js";
import { stripHtml } from "../../constants/analysisFieldLimits.js";

function renderPlainText(html) {
  if (!html) return "—";
  const text = html.includes("<") ? stripHtml(html) : html;
  return text || "—";
}

export default function TopicContextPanel({
  topic,
  variant = "full",
  theme = {},
  isDarkMode = false,
}) {
  if (!topic) return null;

  const status = TOPIC_STATUS_META[topic.status] || { label: topic.status, color: "#94a3b8" };
  const priority = PRIORITY_META[topic.priority] || PRIORITY_META.medium;
  const deadline = getDeadlineMeta(topic.suggested_deadline);
  const border = theme.border || (isDarkMode ? "#334155" : "#e2e8f0");
  const text = theme.text || (isDarkMode ? "#f1f5f9" : "#1e293b");
  const compact = variant === "compact";

  return (
    <div
      style={{
        marginBottom: 16,
        padding: compact ? 12 : 16,
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: isDarkMode ? "rgba(0,0,0,0.15)" : "#f8fafc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: compact ? 8 : 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#38bdf8", marginBottom: 4 }}>{topic.topic_code}</div>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: text, lineHeight: 1.5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginLeft: 6 }}>{ANALYSIS_TERMS.axis}:</span>
            {topic.title}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: `${status.color}22`, color: status.color }}>{status.label}</span>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: priority.color, color: "#fff" }}>{priority.label}</span>
        </div>
      </div>

      {!compact && (
        <p style={{ fontSize: 12, lineHeight: 1.8, margin: "0 0 10px", color: text, opacity: 0.9 }}>
          {renderPlainText(topic.description)}
        </p>
      )}

      {compact && topic.description && (
        <p style={{ fontSize: 11, lineHeight: 1.7, margin: "0 0 10px", color: text, opacity: 0.8 }}>
          {renderPlainText(topic.description).slice(0, 200)}
          {renderPlainText(topic.description).length > 200 ? "..." : ""}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: text, opacity: 0.85 }}>
        {topic.domain && <span>حوزه: {topic.domain}</span>}
        {topic.keywords && <span>کلیدواژه: {topic.keywords}</span>}
        <span>
          {ANALYSIS_TERMS.suggestedDeadline}: {deadline.label}
        </span>
        {topic.creator_name && <span>پیشنهاددهنده: {topic.creator_name}</span>}
        {topic.suggested_deadline && (
          <span style={{ fontSize: 10, opacity: 0.65 }}>({formatPersianDateShort(topic.suggested_deadline)})</span>
        )}
      </div>

      {!compact && topic.importance_reason && (
        <div style={{ marginTop: 10, fontSize: 11, color: text, opacity: 0.85 }}>
          <strong>دلیل اهمیت:</strong> {renderPlainText(topic.importance_reason)}
        </div>
      )}
    </div>
  );
}
