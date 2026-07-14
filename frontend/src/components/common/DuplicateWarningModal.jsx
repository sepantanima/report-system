import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

/**
 * @param {{
 *   open: boolean,
 *   code: 'duplicate_exact'|'duplicate_similar',
 *   matches: Array,
 *   theme?: object,
 *   onCancel: () => void,
 *   onConfirm: () => void,
 *   saving?: boolean,
 * }} props
 */
export default function DuplicateWarningModal({
  open,
  code,
  matches = [],
  theme = {},
  onCancel,
  onConfirm,
  saving = false,
}) {
  if (!open) return null;

  const isExact = code === "duplicate_exact";
  const accent = isExact ? "#ef4444" : "#eab308";
  const bg = isExact ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)";
  const border = isExact ? "rgba(239,68,68,0.45)" : "rgba(234,179,8,0.45)";
  const title = isExact ? "این مورد قبلاً ثبت شده است" : "مورد مشابه یافت شد";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          overflow: "auto",
          background: theme.card || "#1e293b",
          border: `1px solid ${theme.border || "rgba(255,255,255,0.1)"}`,
          borderRadius: 14,
          padding: 18,
          color: theme.text || "#f1f5f9",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={22} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05em", color: accent }}>{title}</h3>
              <p style={{ margin: "8px 0 0", fontSize: "0.88em", opacity: 0.85, lineHeight: 1.7 }}>
                {isExact
                  ? "متن و منبع (یا عنوان و متن) با مورد موجود یکسان است. در صورت اطمینان می‌توانید ادامه دهید."
                  : "موارد زیر شباهت بالایی دارند. لطفاً قبل از ثبت بررسی کنید."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", opacity: 0.7 }}
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {matches.map((m, i) => (
            <div
              key={m.id || m.hash_key || i}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: bg,
                border: `1px solid ${border}`,
                fontSize: "0.86em",
                lineHeight: 1.65,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {m.id ? `#${toPersianDigits(String(m.id))}` : m.hash_key || "—"}
                {m.similarity_percent != null && m.similarity_percent < 100
                  ? ` · ${toPersianDigits(String(m.similarity_percent))}٪ شباهت`
                  : " · تکراری دقیق"}
              </div>
              {m.source ? <div style={{ opacity: 0.9 }}>منبع: {m.source}</div> : null}
              {m.title ? <div style={{ opacity: 0.9 }}>عنوان: {m.title}</div> : null}
              {(m.observer_username || m.sender_name) ? (
                <div style={{ opacity: 0.8 }}>
                  ثبت‌کننده: {m.observer_first_name || m.observer_username || m.sender_name}
                </div>
              ) : null}
              {(m.relay_date_jalali || m.date) ? (
                <div style={{ opacity: 0.75 }}>تاریخ: {m.relay_date_jalali || m.date}</div>
              ) : null}
              {m.preview ? (
                <div style={{ marginTop: 6, opacity: 0.9, textAlign: "justify" }}>{m.preview}…</div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "0.55em 1em",
              borderRadius: 8,
              border: `1px solid ${theme.border || "#475569"}`,
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "0.55em 1em",
              borderRadius: 8,
              border: "none",
              background: accent,
              color: "#fff",
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            {saving ? "در حال ثبت..." : "ادامه با وجود تکراری"}
          </button>
        </div>
      </div>
    </div>
  );
}
