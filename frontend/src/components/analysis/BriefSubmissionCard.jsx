import React from "react";
import { User, Calendar } from "lucide-react";
import { BRIEF_QUALITY_META, BRIEF_STATUS_META, formatPersianDateShort, toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function BriefSubmissionCard({ item, theme, onClick, selected }) {
  const st = BRIEF_STATUS_META[item.status] || { label: item.status, color: "#64748b" };
  const qt = item.quality_tag ? BRIEF_QUALITY_META[item.quality_tag] : null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      style={{
        width: "100%",
        textAlign: "right",
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${selected ? "#10b981" : theme.border}`,
        background: selected ? "rgba(16,185,129,0.08)" : theme.card,
        cursor: "pointer",
        fontFamily: "inherit",
        color: theme.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span className="page-scalable-text" style={{ fontWeight: 700, wordBreak: "break-word", lineHeight: 1.5 }}>{item.title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <User size={12} /> {item.attribution_text || item.author_name || item.author_username}
        </span>
        {item.unit_name && <span>{item.unit_name}</span>}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Calendar size={12} /> {formatPersianDateShort(item.created_at)}
        </span>
        <span>{item.submission_code}</span>
        {qt && (
          <span style={{ color: qt.color, fontWeight: 600 }}>{qt.label}</span>
        )}
      </div>
    </button>
  );
}
