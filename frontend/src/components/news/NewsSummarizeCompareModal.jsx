import React from "react";
import { Check, Replace, X } from "lucide-react";
import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsSummarizeCompareModal({
  open,
  onClose,
  originalText,
  draftText,
  onAcceptSummaryOnly,
  onReplaceMainText,
  theme,
  busy = false,
}) {
  if (!open) return null;

  const hasDraft = !!String(draftText || "").trim();

  const overlay = {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const panel = {
    width: "min(920px, 100%)",
    maxHeight: "min(88vh, 720px)",
    display: "flex",
    flexDirection: "column",
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
  };

  const col = {
    flex: 1,
    minWidth: 0,
    padding: 14,
    overflowY: "auto",
    fontSize: pxToEm(13),
    lineHeight: 1.85,
    whiteSpace: "pre-wrap",
  };

  const btn = (kind) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 8,
    border: "none",
    cursor: busy || !hasDraft ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: pxToEm(12),
    fontWeight: 600,
    opacity: busy || !hasDraft ? 0.55 : 1,
    background:
      kind === "summary"
        ? "#059669"
        : kind === "replace"
          ? "#0284c7"
          : "#475569",
    color: "#fff",
  });

  return (
    <div style={overlay} onClick={onClose} role="presentation">
      <div style={panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <strong style={{ fontSize: pxToEm(14) }}>مقایسه متن اصلی و خلاصهٔ پیشنهادی</strong>
          <div style={{ fontSize: pxToEm(11), opacity: 0.75, marginTop: 6, lineHeight: 1.7 }}>
            <div>• <strong>فقط در خلاصه:</strong> متن اصلی دست‌نخورده می‌ماند؛ خلاصه در فیلد «خلاصه خبر» می‌نشیند.</div>
            <div>• <strong>جایگزینی متن خبر:</strong> خلاصه جای متن انتشار می‌نشیند؛ متن خام اصل خبر در پایگاه حفظ می‌شود.</div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", flex: 1, minHeight: 0, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ ...col, borderLeft: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: pxToEm(11), fontWeight: 700, color: theme.accent, marginBottom: 8 }}>متن فعلی انتشار (cleaned)</div>
            {originalText || "—"}
          </div>
          <div style={col}>
            <div style={{ fontSize: pxToEm(11), fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>خلاصهٔ پیشنهادی (هوش‌افزار)</div>
            {draftText || "—"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, padding: 12 }}>
          <button type="button" style={btn("reject")} disabled={busy} onClick={onClose}>
            <X size={15} />
            انصراف
          </button>
          <button
            type="button"
            style={btn("summary")}
            disabled={busy || !hasDraft}
            onClick={onAcceptSummaryOnly}
          >
            <Check size={15} />
            فقط در خلاصه
          </button>
          <button
            type="button"
            style={btn("replace")}
            disabled={busy || !hasDraft}
            onClick={onReplaceMainText}
          >
            <Replace size={15} />
            جایگزینی متن خبر با خلاصه
          </button>
        </div>
      </div>
    </div>
  );
}
