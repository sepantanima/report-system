import React from "react";
import NewsItemCard from "./NewsItemCard.jsx";
import NewsHtmlPreview from "./NewsHtmlPreview.jsx";
import NewsCardQuickActions from "./NewsCardQuickActions.jsx";
import { resolveNewsDisplayHtml } from "../../utils/newsDisplayHtml.js";
import { getNewsDisplayStatus } from "../../utils/newsDisplayStatus.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsListPane({
  items,
  selectedId,
  onSelect,
  theme,
  viewMode,
  busyId,
  listHeader,
  roles,
  onQuickVerdict,
  onFinalize,
  onToggleDuplicate,
  onToggleImportant,
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
        const selected = item.id === selectedId;
        const busy = busyId === item.id;
        const displayHtml = resolveNewsDisplayHtml(item);
        const { primaryLabel, primaryColor } = getNewsDisplayStatus(item);

        if (compact) {
          return (
            <div
              key={item.id}
              style={{
                borderRadius: 10,
                border: selected ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
                background: selected ? "rgba(56,189,248,0.12)" : theme.card,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: pxToEm(12),
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: pxToEm(11), color: theme.accent }}>
                    {item.source || "—"} · #{toPersianDigits(item.id)}
                  </span>
                  <span
                    style={{
                      fontSize: pxToEm(9),
                      padding: "1px 6px",
                      borderRadius: 5,
                      background: `${primaryColor}22`,
                      color: primaryColor,
                      border: `1px solid ${primaryColor}44`,
                    }}
                  >
                    {primaryLabel}
                  </span>
                </div>
                <NewsHtmlPreview
                  html={displayHtml}
                  compact
                  isDarkMode={theme.isDarkMode !== false}
                  style={{ fontSize: pxToEm(12), opacity: 0.9, maxHeight: 56, WebkitLineClamp: 3 }}
                />
              </button>
              <div style={{ padding: "0 10px 8px" }}>
                <NewsCardQuickActions
                  item={item}
                  roles={roles}
                  theme={theme}
                  busy={busy}
                  onQuickVerdict={onQuickVerdict}
                  onFinalize={onFinalize}
                  onToggleDuplicate={onToggleDuplicate}
                  onToggleImportant={onToggleImportant}
                />
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              cursor: "pointer",
              outline: selected ? "2px solid #38bdf8" : "none",
              borderRadius: 12,
            }}
          >
            <NewsItemCard
              item={item}
              theme={theme}
              busy={busy}
              compact
              selected={selected}
              roles={roles}
              onQuickVerdict={onQuickVerdict}
              onFinalize={onFinalize}
              onToggleDuplicate={onToggleDuplicate}
              onToggleImportant={onToggleImportant}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
