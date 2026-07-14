import React from "react";
import { Clock, User, AlertCircle, Edit3 } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { getNewsDisplayStatus } from "../../utils/newsDisplayStatus.js";
import NewsHtmlPreview from "./NewsHtmlPreview.jsx";
import NewsCardQuickActions from "./NewsCardQuickActions.jsx";
import { resolveNewsDisplayHtml } from "../../utils/newsDisplayHtml.js";
import { pxToEm } from "../../utils/pageFontSize.js";

const badge = (color, bgAlpha = "22") => ({
  fontSize: 9,
  padding: "2px 7px",
  borderRadius: 6,
  background: `${color}${bgAlpha}`,
  color,
  border: `1px solid ${color}44`,
  whiteSpace: "nowrap",
});

export default function NewsItemCard({
  item,
  theme,
  compact = false,
  mobileLayout = false,
  selected = false,
  roles,
  busy = false,
  onQuickVerdict,
  onFinalize,
  onFinalizePublish,
  onFinalizeBank,
  onChiefReject,
  onToggleDuplicate,
  onEdit,
}) {
  const displayHtml = resolveNewsDisplayHtml(item);
  const { primaryLabel, primaryColor, secondaryTags } = getNewsDisplayStatus(item);
  const isDup = item.duplicate_status && item.duplicate_status !== "none";
  const isAiEditorial = item.editorial_state === "ai";

  const displaySender = item.resolved_sender_name || item.sender || item.observer_first_name || item.observer_username || "—";
  const senderUnmapped = item.sender && !item.resolved_user_id;
  const dateStr = toPersianDigits(String(item.source_date_jalali || "").replace(/-/g, "/"));
  const timeStr = toPersianDigits(item.source_time_hm || "");

  return (
    <div
      className="v3-report-card"
      style={{
        background: selected
          ? "rgba(56,189,248,0.08)"
          : (isAiEditorial ? "rgba(168,85,247,0.06)" : theme.card),
        border: isDup
          ? "1px solid rgba(148,163,184,0.45)"
          : (isAiEditorial ? "1px solid rgba(168,85,247,0.45)" : `1px solid ${theme.border}`),
        position: "relative",
        opacity: isDup ? 0.88 : 1,
        padding: compact ? 10 : undefined,
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: primaryColor }} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, borderBottom: `1px solid ${theme.border}`, paddingBottom: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, color: theme.accent || "#38bdf8", marginBottom: 4 }}>{item.source || "—"}</div>
          <div style={{ fontSize: 11, opacity: 0.75, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <User size={11} />
            <span>{displaySender}</span>
            {senderUnmapped ? (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}>
                نامشخص
              </span>
            ) : null}
            <Clock size={11} />
            <span>
              {dateStr}{" "}
              {timeStr}
            </span>
            <span style={{ opacity: 0.6 }}>#{toPersianDigits(item.id)}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
          <span style={{ ...badge(primaryColor), fontWeight: 600, fontSize: 10 }}>{primaryLabel}</span>
          {secondaryTags.map((tag) => (
            <span key={tag.label} style={badge(tag.color, "33")}>{tag.label}</span>
          ))}
        </div>
      </div>

      {(item.categories || []).length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {item.categories.map((c) => (
            <span key={c.id} style={{ ...badge("#818cf8"), fontSize: 10 }}>دسته: {c.title_fa}</span>
          ))}
        </div>
      ) : null}

      <NewsHtmlPreview
        html={displayHtml}
        compact={compact && !mobileLayout}
        scrollable={mobileLayout}
        isDarkMode={theme.isDarkMode !== false}
        className="page-scalable-text"
        style={{ margin: "0 0 10px", flex: 1 }}
      />

      {item.status_note ? (
        <div className="page-scalable-text-sm" style={{ opacity: 0.8, marginBottom: 4, padding: "6px 8px", borderRadius: 8, background: "rgba(148,163,184,0.1)" }}>
          <AlertCircle size={12} style={{ display: "inline", marginLeft: 4 }} />
          {item.status_note}
        </div>
      ) : null}

      <NewsCardQuickActions
        item={item}
        roles={roles}
        theme={theme}
        busy={busy}
        onQuickVerdict={onQuickVerdict}
        onFinalize={onFinalize}
        onFinalizePublish={onFinalizePublish}
        onFinalizeBank={onFinalizeBank}
        onChiefReject={onChiefReject}
        onToggleDuplicate={onToggleDuplicate}
      />

      {mobileLayout && onEdit ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px dashed ${theme.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.55, fontSize: pxToEm(10) }}>
            <Clock size={11} />
            <span>{[dateStr, timeStr].filter(Boolean).join(" · ")}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
            title="ویرایش خبر"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${theme.accent || "#38bdf8"}55`,
              background: "rgba(56,189,248,0.1)",
              color: theme.accent || "#38bdf8",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: pxToEm(11),
              fontWeight: 600,
            }}
          >
            <Edit3 size={14} />
            ویرایش
          </button>
        </div>
      ) : null}
    </div>
  );
}
