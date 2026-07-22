import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";

/** دکمه راهنما + پنل تفسیر (portal تا overflow ویجت آن را نبُرد) */
export default function WidgetHelpButton({ help, theme, compact = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    const margin = 8;
    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;

    const estimatedH = Math.min(360, window.innerHeight * 0.55);
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const placeAbove = spaceBelow < 160 && rect.top > spaceBelow;
    const top = placeAbove
      ? Math.max(margin, rect.top - estimatedH - 6)
      : Math.min(rect.bottom + 6, window.innerHeight - estimatedH - margin);

    setPos({ top, left, width, maxHeight: Math.min(360, placeAbove ? rect.top - margin * 2 : spaceBelow) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!help) return null;

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={help.title || "راهنما"}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: Math.max(140, pos.maxHeight),
              overflow: "auto",
              zIndex: 10050,
              background: theme.card,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
              padding: "12px 14px",
              direction: "rtl",
              textAlign: "right",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{help.title}</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 2 }}
                aria-label="بستن"
              >
                <X size={14} />
              </button>
            </div>
            {help.summary ? (
              <p style={{ margin: "0 0 10px", fontSize: 12, lineHeight: 1.7, color: theme.muted }}>{help.summary}</p>
            ) : null}
            {Array.isArray(help.bullets) ? (
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, lineHeight: 1.75 }}>
                {help.bullets.map((b) => (
                  <li key={b.slice(0, 32)} style={{ marginBottom: 6 }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="راهنمای تفسیر"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: open ? "rgba(225,29,72,0.12)" : "transparent",
          border: `1px solid ${theme.border}`,
          color: theme.muted,
          borderRadius: 8,
          padding: compact ? 4 : "4px 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
        }}
      >
        <CircleHelp size={14} />
        {!compact ? "راهنما" : null}
      </button>
      {panel}
    </>
  );
}

/** بنر وضعیت: داده هنوز برای فیلتر جاری تازه نیست */
export function StaleDataBanner({ theme, label = "در حال به‌روزرسانی با فیلتر جدید…" }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: "#b45309",
        background: "rgba(245,158,11,0.14)",
        border: "1px solid rgba(245,158,11,0.35)",
        borderRadius: 999,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
      title="اعداد فعلی ممکن است مربوط به فیلتر قبلی باشد"
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#f59e0b",
          animation: "commandPulse 1.2s ease-in-out infinite",
        }}
      />
      {label}
      <style>{`@keyframes commandPulse{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
    </div>
  );
}

/** پوشش روی بدنهٔ ویجت وقتی داده کهنه است */
export function StaleBodyWrap({ stale, theme, children }) {
  if (!stale) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 0.42, pointerEvents: "none", filter: "grayscale(0.15)" }}>{children}</div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
          background: "rgba(15,23,42,0.28)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.text,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 280,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          دادهٔ فیلتر قبلی — منتظر به‌روزرسانی
        </div>
      </div>
    </div>
  );
}
