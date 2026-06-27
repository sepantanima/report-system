import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsReportCollapsible({
  title,
  badge,
  defaultOpen = false,
  children,
  theme,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      background: theme.card,
      marginTop: 4,
    }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          border: "none",
          background: open
            ? (theme.isDarkMode ? "rgba(56,189,248,0.1)" : "rgba(14,165,233,0.08)")
            : "transparent",
          color: theme.text,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          {badge != null && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background: theme.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              color: theme.muted,
            }}
            >
              {typeof badge === "number" ? toPersianDigits(badge) : badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
