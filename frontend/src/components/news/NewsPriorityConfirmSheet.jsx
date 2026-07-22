import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { NEWS_PRIORITIES } from "../../constants/newsMonitorMeta.js";
import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsPriorityConfirmSheet({
  open,
  onClose,
  onConfirm,
  theme,
  busy = false,
  initialPriority,
}) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (open) {
      const p = Number(initialPriority);
      setSelected(p >= 1 && p <= 4 ? p : null);
    }
  }, [open, initialPriority]);

  if (!open) return null;

  const priorityEntries = Object.entries(NEWS_PRIORITIES);

  return (
    <div
      className="v3-modal-overlay"
      style={{ zIndex: 2500, alignItems: "flex-end" }}
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <div
        className="v3-modal-box"
        style={{
          width: "100%",
          maxWidth: "100%",
          borderRadius: "16px 16px 0 0",
          margin: 0,
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderBottom: "none",
          padding: "16px 16px max(16px, env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="priority-sheet-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 id="priority-sheet-title" style={{ margin: 0, fontSize: pxToEm(14), fontWeight: 700 }}>
            درجه اهمیت خبر را مشخص کنید
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="v3-icon-btn"
            style={{ border: "none", color: theme.text, opacity: 0.7 }}
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: "0 0 12px", fontSize: pxToEm(12), opacity: 0.8, lineHeight: 1.6 }}>
          برای ثبت حکم «تأیید»، یکی از سطوح اهمیت را انتخاب کنید.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
          {priorityEntries.map(([k, meta]) => {
            const key = parseInt(k, 10);
            const active = selected === key;
            return (
              <button
                key={k}
                type="button"
                disabled={busy}
                onClick={() => setSelected(key)}
                style={{
                  padding: "12px 10px",
                  borderRadius: 10,
                  border: active ? `2px solid ${meta.color}` : `1px solid ${theme.border}`,
                  background: active ? `${meta.color}22` : theme.bg || theme.card,
                  color: active ? meta.color : theme.text,
                  fontWeight: active ? 700 : 500,
                  fontSize: pxToEm(12),
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  minHeight: 44,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              fontFamily: "inherit",
              fontSize: pxToEm(13),
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={busy || selected == null}
            onClick={() => onConfirm(selected)}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: selected != null ? "#22c55e" : "#64748b",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: pxToEm(13),
              fontWeight: 700,
              cursor: busy || selected == null ? "not-allowed" : "pointer",
              opacity: busy || selected == null ? 0.55 : 1,
            }}
          >
            ثبت تأیید
          </button>
        </div>
      </div>
    </div>
  );
}
