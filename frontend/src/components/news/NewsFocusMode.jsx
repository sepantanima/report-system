import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Copy } from "lucide-react";
import { NEWS_REVIEW_STATES } from "../../constants/newsMonitorMeta.js";
import NewsHtmlPreview from "./NewsHtmlPreview.jsx";
import { resolveNewsDisplayHtml } from "../../utils/newsDisplayHtml.js";

export default function NewsFocusMode({
  items,
  onClose,
  onUpdate,
  busyId,
}) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  if (!item) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0f172a", zIndex: 85, display: "flex", alignItems: "center", justifyContent: "center", color: "#e2e8f0" }}>
        <p>خبری برای نمایش نیست.</p>
        <button type="button" onClick={onClose} style={{ marginRight: 12 }}>بستن</button>
      </div>
    );
  }

  const busy = busyId === item.id;
  const displayHtml = resolveNewsDisplayHtml(item);

  const apply = async (patch, advance = true) => {
    await onUpdate(item.id, patch);
    if (advance && index < items.length - 1) setIndex((i) => i + 1);
  };

  return (
    <div dir="rtl" style={{ position: "fixed", inset: 0, background: "#0b1426", zIndex: 85, display: "flex", flexDirection: "column", color: "#e2e8f0" }}>
      <header style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <strong>حالت تمرکز — {toPersianDigits(index + 1)} از {toPersianDigits(items.length)}</strong>
        <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={22} /></button>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 16, maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
          {item.source} · {item.sender} · {toPersianDigits(String(item.source_date_jalali || "").replace(/-/g, "/"))}
        </div>
        <NewsHtmlPreview html={displayHtml} style={{ fontSize: 15 }} />
      </main>

      <footer style={{ padding: 12, borderTop: "1px solid #334155", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <button type="button" disabled={index <= 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
          <ChevronRight size={18} /> قبلی
        </button>
        {Object.entries(NEWS_REVIEW_STATES).map(([k, v]) => (
          <button
            key={k}
            type="button"
            disabled={busy}
            onClick={() => apply({ review_state: k })}
            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.color}55`, background: `${v.color}18`, color: v.color, cursor: "pointer", fontFamily: "inherit", minHeight: 44, fontSize: 13 }}
          >
            {v.label}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => apply({ review_state: "approved" })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
          <Check size={18} /> تأیید و بعدی
        </button>
        <button type="button" disabled={busy} onClick={() => apply({ is_duplicate: true })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: "1px solid #475569", background: "#1e293b", color: "#e2e8f0", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
          <Copy size={16} /> تکراری
        </button>
        <button type="button" disabled={index >= items.length - 1} onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
          بعدی <ChevronLeft size={18} />
        </button>
      </footer>
    </div>
  );
}
