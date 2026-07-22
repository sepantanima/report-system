import React, { useState } from "react";
import { CheckCircle, Archive, X, Loader2 } from "lucide-react";
import { pxToEm } from "../../utils/pageFontSize.js";

const POSITIVE_VERDICTS = new Set(["approved", "rumor"]);

export default function NewsChiefActionButtons({
  item,
  theme,
  busy = false,
  compact = false,
  onFinalizePublish,
  onFinalizeBank,
  onChiefReject,
  onFinalizeReturn,
}) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  if (!item || item.workflow_status !== "reviewed") return null;

  const rs = item.review_state;
  const isReturn = rs === "rejected";
  const isPositive = POSITIVE_VERDICTS.has(rs);

  const stop = (e) => e.stopPropagation();

  const btnStyle = (color, bg, border, filled = false) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: compact ? 3 : 4,
    padding: "4px 8px",
    borderRadius: 6,
    border: border || (filled ? "none" : `1px solid ${color}55`),
    background: filled ? color : (bg || `${color}18`),
    color: filled ? "#fff" : color,
    cursor: busy ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: pxToEm(10),
    minHeight: 30,
    opacity: busy ? 0.55 : 1,
    flexShrink: 0,
  });

  if (isReturn) {
    return (
      <div onClick={stop} onKeyDown={stop} role="presentation">
        <button
          type="button"
          disabled={busy}
          title="تأیید برگشت — خبر منتشر نمی‌شود"
          onClick={() => onFinalizeReturn?.(item.id)}
          style={btnStyle("#ef4444", "#ef4444", "none", true)}
        >
          {busy ? <Loader2 size={compact ? 12 : 13} className="spin" /> : <CheckCircle size={compact ? 12 : 13} />}
          تأیید برگشت
        </button>
      </div>
    );
  }

  if (!isPositive) return null;

  if (showRejectBox) {
    const noteEmpty = !rejectNote.trim();
    // #region agent log
    fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d349cf'},body:JSON.stringify({sessionId:'d349cf',runId:'post-fix',hypothesisId:'H4',location:'NewsChiefActionButtons.jsx:rejectBox',message:'reject box render',data:{placeholder:'دلیل برگشت به دبیر (اختیاری)...',noteEmpty,buttonDisabled:!!busy,newsId:item?.id},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return (
      <div
        onClick={stop}
        onKeyDown={stop}
        role="presentation"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: compact ? 6 : 0,
          padding: compact ? 6 : 8,
          borderRadius: 8,
          background: "rgba(0,0,0,0.12)",
          width: compact ? "100%" : "auto",
        }}
      >
        <input
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="دلیل برگشت به دبیر (اختیاری)..."
          maxLength={300}
          data-debug-placeholder="optional-chief-reject"
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => { setShowRejectBox(false); setRejectNote(""); }}
            style={btnStyle(theme.text, "transparent", `1px solid ${theme.border}`)}
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d349cf'},body:JSON.stringify({sessionId:'d349cf',runId:'post-fix',hypothesisId:'H1',location:'NewsChiefActionButtons.jsx:confirmReject',message:'confirm reject click',data:{noteLen:rejectNote.trim().length,newsId:item?.id},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              onChiefReject?.(item.id, rejectNote.trim());
              setShowRejectBox(false);
              setRejectNote("");
            }}
            style={btnStyle("#ef4444", "rgba(239,68,68,0.15)")}
          >
            برگشت به دبیر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={stop}
      onKeyDown={stop}
      role="presentation"
      style={{ display: "flex", flexWrap: "wrap", gap: compact ? 4 : 6, alignItems: "center" }}
    >
      <button
        type="button"
        disabled={busy}
        title="تأیید و آماده‌سازی برای انتشار"
        onClick={() => onFinalizePublish?.(item.id)}
        style={btnStyle("#22c55e", "#22c55e", "none", true)}
      >
        {busy ? <Loader2 size={compact ? 12 : 13} className="spin" /> : <CheckCircle size={compact ? 12 : 13} />}
        تأیید و انتشار
      </button>
      <button
        type="button"
        disabled={busy}
        title="خبر خوب است — فعلاً در بانک انتظار"
        onClick={() => onFinalizeBank?.(item.id)}
        style={btnStyle("#0ea5e9", "rgba(14,165,233,0.12)")}
      >
        <Archive size={compact ? 12 : 13} />
        بانک انتظار
      </button>
      <button
        type="button"
        disabled={busy}
        title="عدم تأیید — برگشت به صف دبیر"
        onClick={() => setShowRejectBox(true)}
        style={btnStyle("#ef4444", "rgba(239,68,68,0.1)")}
      >
        <X size={compact ? 12 : 13} />
        عدم تأیید
      </button>
    </div>
  );
}
