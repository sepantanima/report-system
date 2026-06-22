import React, { useEffect, useRef, useState } from "react";
import { Send, ChevronDown } from "lucide-react";
import { FORMAT } from "../../utils/newsFormat/index.js";
import { pxToEm } from "../../utils/pageFontSize.js";

const OPTIONS = [
  { format: FORMAT.BALE, label: "پیش‌نمایش بله" },
  { format: FORMAT.TELEGRAM, label: "پیش‌نمایش تلگرام" },
];

export default function NewsFormatExportMenu({ onSelect, theme, compact = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: compact ? 0 : 4,
    width: compact ? 36 : undefined,
    height: compact ? 36 : undefined,
    padding: compact ? 0 : "7px 10px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: pxToEm(compact ? 11 : 12),
    fontWeight: 600,
    flexShrink: 0,
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        title="خروجی برای بله / تلگرام"
        aria-label="خروجی برای بله / تلگرام"
        aria-expanded={open}
        style={btnStyle}
        onClick={() => setOpen((v) => !v)}
      >
        <Send size={compact ? 15 : 13} />
        {!compact ? "خروجی پیام" : null}
        {!compact ? <ChevronDown size={13} style={{ opacity: 0.7 }} /> : null}
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            bottom: compact ? "calc(100% + 6px)" : "calc(100% + 6px)",
            right: 0,
            zIndex: 50,
            minWidth: 168,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.format}
              type="button"
              role="menuitem"
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                color: theme.text,
                textAlign: "right",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: pxToEm(12),
              }}
              onClick={() => {
                setOpen(false);
                onSelect?.(opt.format);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
