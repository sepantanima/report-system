import React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsEditorialProgressOverlay({ theme, message }) {
  return (
    <div
      role="alertdialog"
      aria-busy="true"
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: theme.isDarkMode ? "rgba(15,23,42,0.72)" : "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          background: theme.card,
          padding: "28px 32px",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
          textAlign: "center",
          maxWidth: 400,
          width: "min(92vw, 400px)",
          border: `1px solid ${theme.border}`,
        }}
      >
        <Loader2
          size={40}
          color="#7c3aed"
          style={{ animation: "editorialSpin 1s linear infinite", marginBottom: 16 }}
        />
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
          پالایش و دبیری هوشمند
        </div>
        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.8 }}>
          {message || "در حال پردازش اخبار بازه…"}
        </div>
      </div>
      <style>{`
        @keyframes editorialSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function NewsEditorialConfirmModal({
  open,
  onClose,
  onConfirm,
  unprocessedCount,
  theme,
  busy,
}) {
  if (!open) return null;
  return (
    <div
      className="v3-modal-overlay"
      style={{ zIndex: 2000 }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="v3-modal-box"
        style={{ background: theme.card, border: `1px solid ${theme.border}`, maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button type="button" onClick={onClose} disabled={busy} className="v3-icon-btn" style={{ border: "none" }}>
            <X size={18} />
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="#7c3aed" />
            پالایش و دبیری هوشمند
          </span>
        </div>
        <div className="v3-modal-body" style={{ lineHeight: 1.9, fontSize: 14 }}>
          <p>
            {toPersianDigits(unprocessedCount)} خبر پالایش‌نشده در <b>لیست نمایش‌داده‌شده</b> یافت شد.
          </p>
          <p style={{ opacity: 0.85, fontSize: 13 }}>
            تکراری‌ها شناسایی و لینک می‌شوند؛ اولویت، کیفیت، دسته، خلاصه و مرتبط/غیرمرتبط به‌صورت خودکار اعمال می‌شود.
          </p>
        </div>
        <div className="v3-modal-footer-new" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="v3-btn-footer" onClick={onClose} disabled={busy}>
            انصراف
          </button>
          <button type="button" className="v3-btn-footer v3-primary-solid" onClick={onConfirm} disabled={busy}>
            {busy ? "در حال شروع…" : "اجرای پالایش"}
          </button>
        </div>
      </div>
    </div>
  );
}
