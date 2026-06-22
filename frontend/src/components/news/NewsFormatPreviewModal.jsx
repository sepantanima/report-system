import React, { useMemo, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { exportCleanedText, FORMAT } from "../../utils/newsFormat/index.js";
import { pxToEm } from "../../utils/pageFontSize.js";

const LABELS = {
  [FORMAT.BALE]: "بله (Markdown کلاسیک)",
  [FORMAT.TELEGRAM]: "تلگرام (MarkdownV2)",
};

export default function NewsFormatPreviewModal({
  open,
  onClose,
  htmlSource,
  format,
  theme,
}) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    if (!open || !htmlSource) return "";
    try {
      return exportCleanedText(htmlSource, format);
    } catch {
      return "";
    }
  }, [open, htmlSource, format]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const overlay = {
    position: "fixed",
    inset: 0,
    zIndex: 1300,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const panel = {
    width: "min(640px, 100%)",
    maxHeight: "min(80vh, 560px)",
    display: "flex",
    flexDirection: "column",
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    overflow: "hidden",
  };

  return (
    <div style={overlay} onClick={onClose} role="presentation">
      <div style={panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: pxToEm(14) }}>پیش‌نمایش ارسال — {LABELS[format] || format}</strong>
          <button type="button" onClick={onClose} aria-label="بستن" style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 14,
            fontSize: pxToEm(13),
            lineHeight: 1.85,
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
            direction: "rtl",
            textAlign: "right",
          }}
        >
          {text || "—"}
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!text}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: copied ? "#059669" : "#0284c7",
              color: "#fff",
              cursor: text ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              fontSize: pxToEm(12),
              fontWeight: 600,
              opacity: text ? 1 : 0.5,
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "کپی شد" : "کپی برای ارسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
