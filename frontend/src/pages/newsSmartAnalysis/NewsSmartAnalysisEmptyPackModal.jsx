import React from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsSmartAnalysisEmptyPackModal({
  open,
  packId,
  packTitle,
  theme,
  loading = false,
  onDelete,
  onContinueLater,
  onDismiss,
}) {
  if (!open) return null;

  const border = theme?.border || "#e2e8f0";
  const card = theme?.card || "#fff";
  const text = theme?.text || "#1e293b";

  return (
    <div
      className="v3-modal-overlay"
      onClick={() => !loading && onDismiss?.()}
    >
      <div
        className="v3-modal-box"
        style={{ background: card, border: `1px solid ${border}`, maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button
            type="button"
            onClick={() => !loading && onDismiss?.()}
            className="v3-icon-btn"
            style={{ color: "#f87171", border: "none" }}
            disabled={loading}
          >
            <X size={18} />
          </button>
          <span>بسته بدون تحلیل</span>
        </div>
        <div className="v3-modal-body" style={{ color: text }}>
          <div style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.35)",
          }}
          >
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              در این بسته هنوز هیچ تحلیلی تولید، وارد یا ذخیره نشده است.
              {packTitle && (
                <>
                  {" "}
                  (
                  {packTitle.slice(0, 60)}
                  {packTitle.length > 60 ? "…" : ""}
                  )
                </>
              )}
              {packId != null && (
                <>
                  {" "}
                  · شناسه
                  {" "}
                  {toPersianDigits(packId)}
                </>
              )}
            </p>
          </div>
          <p style={{ fontSize: 12, opacity: 0.8, margin: "0 0 16px", lineHeight: 1.7 }}>
            می‌توانید بسته را حذف کنید یا بعداً از لیست بسته‌ها ادامه دهید.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={loading}
              onClick={onContinueLater}
              style={btnStyle(theme, false)}
            >
              ادامه بعداً
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onDelete}
              style={btnStyle(theme, true)}
            >
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
              حذف بسته
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(theme, danger) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${danger ? "#ef4444" : theme?.border || "#e2e8f0"}`,
    background: danger ? "rgba(239,68,68,0.1)" : theme?.card || "#fff",
    color: danger ? "#ef4444" : theme?.text || "#1e293b",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  };
}
