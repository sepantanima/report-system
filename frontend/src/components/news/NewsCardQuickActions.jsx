import React, { useState } from "react";
import { Check, X, Sparkles, Copy, Loader2 } from "lucide-react";
import { getNewsQuickActionFlags } from "../../utils/newsQuickActionFlags.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import NewsPriorityConfirmSheet from "./NewsPriorityConfirmSheet.jsx";
import NewsChiefActionButtons from "./NewsChiefActionButtons.jsx";

export default function NewsCardQuickActions({
  item,
  roles,
  theme,
  busy = false,
  onQuickVerdict,
  onFinalize,
  onFinalizePublish,
  onFinalizeBank,
  onChiefReject,
  onToggleDuplicate,
}) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPrioritySheet, setShowPrioritySheet] = useState(false);
  const flags = getNewsQuickActionFlags(item, roles);

  if (!flags.canVerdict && !flags.canFinalize && !flags.canChiefPublish && !flags.canToggleDuplicate) {
    return null;
  }

  const stop = (e) => e.stopPropagation();

  const btnStyle = (color, bg, border) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: 6,
    border: border || `1px solid ${color}55`,
    background: bg || `${color}18`,
    color,
    cursor: busy ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: pxToEm(10),
    minHeight: 28,
    opacity: busy ? 0.55 : 1,
    flexShrink: 0,
  });

  const isSuspicious = item.duplicate_status === "suspicious";

  const handleApproveConfirm = (priority) => {
    setShowPrioritySheet(false);
    onQuickVerdict?.(item.id, "approved", undefined, priority);
  };

  return (
    <div onClick={stop} onKeyDown={stop} role="presentation">
      <NewsPriorityConfirmSheet
        open={showPrioritySheet}
        onClose={() => !busy && setShowPrioritySheet(false)}
        onConfirm={handleApproveConfirm}
        theme={theme}
        busy={busy}
        initialPriority={item.priority}
      />

      {showRejectBox ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 6,
            padding: 6,
            borderRadius: 8,
            background: "rgba(0,0,0,0.12)",
          }}
        >
          <input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="دلیل برگشت به فرستنده (اختیاری)..."
            maxLength={200}
            style={{
              width: "100%",
              padding: "5px 8px",
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: pxToEm(10),
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setShowRejectBox(false); setRejectReason(""); }}
              style={{ ...btnStyle(theme.text, "transparent", `1px solid ${theme.border}`) }}
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onQuickVerdict?.(item.id, "rejected", rejectReason.trim() || undefined);
                setShowRejectBox(false);
                setRejectReason("");
              }}
              style={btnStyle("#ef4444", "rgba(239,68,68,0.15)")}
            >
              تأیید برگشت
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
          {busy ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: pxToEm(10), opacity: 0.7 }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> در حال پردازش...
            </span>
          ) : null}

          {flags.canVerdict ? (
            <>
              <button
                type="button"
                disabled={busy}
                title="تأیید"
                onClick={() => setShowPrioritySheet(true)}
                style={btnStyle("#22c55e", "rgba(34,197,94,0.15)")}
              >
                <Check size={12} /> تأیید
              </button>
              <button
                type="button"
                disabled={busy}
                title="برگشت به فرستنده — ایراد در خبررسانی، نه کذب محتوا"
                onClick={() => setShowRejectBox(true)}
                style={btnStyle("#ef4444", "rgba(239,68,68,0.12)")}
              >
                <X size={12} /> برگشت
              </button>
              <button
                type="button"
                disabled={busy}
                title="شایعه"
                onClick={() => onQuickVerdict?.(item.id, "rumor")}
                style={btnStyle("#a855f7", "rgba(168,85,247,0.15)")}
              >
                <Sparkles size={12} /> شایعه
              </button>
            </>
          ) : null}

          {flags.canToggleDuplicate ? (
            <button
              type="button"
              disabled={busy}
              title={isSuspicious ? "لغو علامت تکرار" : "مشکوک به تکرار"}
              onClick={() => onToggleDuplicate?.(item.id, isSuspicious)}
              style={btnStyle(
                "#f59e0b",
                isSuspicious ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.1)",
                isSuspicious ? "1px solid #f59e0b" : undefined,
              )}
            >
              <Copy size={12} /> {isSuspicious ? "لغو تکرار" : "مشکوک"}
            </button>
          ) : null}

          {flags.canFinalize ? (
            <NewsChiefActionButtons
              item={item}
              theme={theme}
              busy={busy}
              compact
              onFinalizeReturn={onFinalize}
              onFinalizePublish={onFinalizePublish}
              onFinalizeBank={onFinalizeBank}
              onChiefReject={onChiefReject}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
