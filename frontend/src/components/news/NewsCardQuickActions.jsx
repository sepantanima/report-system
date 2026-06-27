import React, { useState } from "react";
import { Check, X, Sparkles, Copy, CheckCircle, Loader2, Star } from "lucide-react";
import { getNewsQuickActionFlags } from "../../utils/newsQuickActionFlags.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import { NEWS_PRIORITIES } from "../../constants/newsMonitorMeta.js";

export default function NewsCardQuickActions({
  item,
  roles,
  theme,
  busy = false,
  onQuickVerdict,
  onFinalize,
  onToggleDuplicate,
  onToggleImportant,
}) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const flags = getNewsQuickActionFlags(item, roles);

  if (!flags.canVerdict && !flags.canFinalize && !flags.canToggleDuplicate && !flags.canSetPriority) {
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
  const priority = Number(item.priority || 3);
  const isImportant = priority === 1 || priority === 2;
  const importantMeta = NEWS_PRIORITIES[2];

  return (
    <div onClick={stop} onKeyDown={stop} role="presentation">
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
            placeholder="دلیل رد (اختیاری)..."
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
              تأیید رد
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
                onClick={() => onQuickVerdict?.(item.id, "approved")}
                style={btnStyle("#22c55e", "rgba(34,197,94,0.15)")}
              >
                <Check size={12} /> تأیید
              </button>
              <button
                type="button"
                disabled={busy}
                title="رد"
                onClick={() => setShowRejectBox(true)}
                style={btnStyle("#ef4444", "rgba(239,68,68,0.12)")}
              >
                <X size={12} /> رد
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

          {flags.canSetPriority ? (
            <button
              type="button"
              disabled={busy}
              title={isImportant ? "برگشت به اهمیت عادی" : "علامت‌گذاری به‌عنوان مهم"}
              onClick={() => onToggleImportant?.(item.id)}
              style={btnStyle(
                importantMeta.color,
                isImportant ? `${importantMeta.color}33` : `${importantMeta.color}18`,
                isImportant ? `1px solid ${importantMeta.color}` : undefined,
              )}
            >
              <Star size={12} fill={isImportant ? importantMeta.color : "none"} />
              {isImportant ? "لغو مهم" : "مهم"}
            </button>
          ) : null}

          {flags.canFinalize ? (
            <button
              type="button"
              disabled={busy}
              title="تأیید نهایی"
              onClick={() => onFinalize?.(item.id)}
              style={btnStyle("#22c55e", "#22c55e", "none")}
            >
              <CheckCircle size={12} color="#fff" />
              <span style={{ color: "#fff" }}>تأیید نهایی</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
