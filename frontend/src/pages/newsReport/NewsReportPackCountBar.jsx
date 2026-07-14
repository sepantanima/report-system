import React from "react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const PACK_COUNT_ITEMS = [
  { key: "very_important", label: "فوری" },
  { key: "important", label: "مهم" },
  { key: "valuable", label: "ارزشمند" },
  { key: "all", label: "کل" },
];

export default function NewsReportPackCountBar({ counts, theme, loading }) {
  if (!counts && !loading) return null;

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 14px",
      padding: "8px 0 4px",
      fontSize: 12,
      lineHeight: 1.5,
      borderTop: `1px solid ${theme.border}`,
      marginTop: 8,
      justifyContent: "center",
    }}
    >
      {loading ? (
        <span style={{ color: theme.muted }}>در حال محاسبه تعداد…</span>
      ) : (
        PACK_COUNT_ITEMS
          .filter(({ key }) => (counts?.[key] ?? 0) > 0)
          .map(({ key, label }) => (
          <span key={key} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: theme.muted }}>اخبار {label}:</span>
            {" "}
            <strong>{toPersianDigits(counts?.[key] ?? 0)}</strong>
          </span>
        ))
      )}
    </div>
  );
}
