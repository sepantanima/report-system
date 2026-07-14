import React from "react";
import { X } from "lucide-react";

export default function NewsSmartAnalysisPromptViewModal({
  open,
  theme,
  title,
  prompt,
  onDismiss,
}) {
  if (!open) return null;

  const border = theme?.border || "#e2e8f0";
  const card = theme?.card || "#fff";
  const text = theme?.text || "#1e293b";

  return (
    <div className="v3-modal-overlay" onClick={onDismiss}>
      <div
        className="v3-modal-box"
        style={{ background: card, border: `1px solid ${border}`, maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button
            type="button"
            onClick={onDismiss}
            className="v3-icon-btn"
            style={{ color: "#f87171", border: "none" }}
          >
            <X size={18} />
          </button>
          <span>پرامپت شخصی — {title || "بدون عنوان"}</span>
        </div>
        <div className="v3-modal-body" style={{ color: text }}>
          <pre style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.9,
            padding: 12,
            borderRadius: 8,
            background: theme?.isDarkMode ? "rgba(15,23,42,0.5)" : "#f8fafc",
            border: `1px solid ${border}`,
            maxHeight: 360,
            overflow: "auto",
          }}
          >
            {prompt || "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}
