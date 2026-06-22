import React from "react";
import NewsItemCard from "./NewsItemCard.jsx";
import NewsHtmlPreview from "./NewsHtmlPreview.jsx";
import { resolveNewsDisplayHtml } from "../../utils/newsDisplayHtml.js";
import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsListPane({
  items,
  selectedId,
  onSelect,
  theme,
  viewMode,
  busyId,
  listHeader,
}) {
  const compact = viewMode === "compact";

  if (!items.length) {
    return (
      <div>
        {listHeader}
        <p style={{ opacity: 0.65, fontSize: pxToEm(13), padding: 8 }}>خبری یافت نشد.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 10, height: "100%", minHeight: 0 }}>
      {listHeader ? <div style={{ flexShrink: 0 }}>{listHeader}</div> : null}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: compact ? 6 : 10 }}>
      {items.map((item) => {
        if (compact) {
          const selected = item.id === selectedId;
          const displayHtml = resolveNewsDisplayHtml(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              style={{
                textAlign: "right",
                padding: "10px 12px",
                borderRadius: 10,
                border: selected ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
                background: selected ? "rgba(56,189,248,0.12)" : theme.card,
                color: theme.text,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: pxToEm(12),
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: pxToEm(11), color: theme.accent, marginBottom: 4 }}>
                {item.source || "—"} · #{item.id}
              </div>
              <NewsHtmlPreview
                html={displayHtml}
                compact
                isDarkMode={theme.isDarkMode !== false}
                style={{ fontSize: pxToEm(12), opacity: 0.9, maxHeight: 56, WebkitLineClamp: 3 }}
              />
            </button>
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              cursor: "pointer",
              outline: item.id === selectedId ? "2px solid #38bdf8" : "none",
              borderRadius: 12,
            }}
          >
            <NewsItemCard
              item={item}
              theme={theme}
              busyId={busyId}
              compact
              selected={item.id === selectedId}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
