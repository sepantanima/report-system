import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const TOAST_PALETTE = {
  success: { background: "#059669", border: "#34d399" },
  error: { background: "#dc2626", border: "#f87171" },
  warning: { background: "#d97706", border: "#fbbf24" },
  info: { background: "rgba(15,23,42,0.94)", border: "#38bdf8" },
};

function inferToastType(message) {
  const text = String(message || "").trim();
  if (!text) return "info";
  if (/^خطا|خطا:|^error/i.test(text)) return "error";
  if (/^هشدار|^توجه|⚠/i.test(text)) return "warning";
  if (/✅|موفق|ذخیره شد|ثبت شد|ارسال شد|حذف شد|به‌روز|بارگذاری شد/i.test(text)) return "success";
  return "info";
}

export function useAnalysisToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!message) {
      setToast(null);
      return;
    }
    const resolvedType = type || inferToastType(message);
    setToast({ message: String(message), type: resolvedType });
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const Toast = toast
    ? createPortal(
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10050,
          padding: "12px 20px",
          borderRadius: 12,
          background: TOAST_PALETTE[toast.type]?.background ?? TOAST_PALETTE.info.background,
          border: `1px solid ${TOAST_PALETTE[toast.type]?.border ?? TOAST_PALETTE.info.border}`,
          color: "#f8fafc",
          fontSize: 14,
          fontFamily: "inherit",
          fontWeight: 600,
          lineHeight: 1.6,
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          maxWidth: "min(92vw, 480px)",
          textAlign: "center",
          direction: "rtl",
          pointerEvents: "none",
        }}
      >
        {toast.message}
      </div>,
      document.body,
    )
    : null;

  return { toast, showToast, Toast };
}

export default useAnalysisToast;
