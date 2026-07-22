import React from "react";
import MultiSelect from "../MultiSelect.jsx";
import CharCounter from "./CharCounter.jsx";
import NewsChoiceButtons from "./NewsChoiceButtons.jsx";
import NewsSummarySection from "./NewsSummarySection.jsx";
import NewsSourceUrlField from "./NewsSourceUrlField.jsx";
import {
  NEWS_PRIORITIES, NEWS_QUALITY, NEWS_REVIEW_STATES, NEWS_RELEVANCE_STATUSES,
} from "../../constants/newsMonitorMeta.js";
import { NEWS_FIELD_LIMITS } from "../../constants/newsFieldLimits.js";
import { clampText } from "../../utils/limitInput.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import { useNewsEditorForm } from "./NewsEditorFormContext.jsx";

const labelStyle = { fontSize: pxToEm(12), opacity: 0.9, display: "block", marginBottom: 8, fontWeight: 600 };
const inputStyle = (theme) => ({
  width: "100%",
  padding: "10px 8px",
  borderRadius: 8,
  background: theme.card,
  border: `1px solid ${theme.border}`,
  color: theme.text,
  fontFamily: "inherit",
  fontSize: pxToEm(13),
  boxSizing: "border-box",
});

function sectionBox(theme, compact) {
  const isDark = theme.isDarkMode !== false;
  return {
    marginBottom: compact ? 8 : 12,
    padding: compact ? "8px 8px 10px" : "10px 10px 12px",
    borderRadius: 10,
    border: isDark ? "1px solid rgba(148,163,184,0.45)" : "1px solid rgba(100,116,139,0.4)",
    background: isDark ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.95)",
    boxShadow: isDark
      ? "inset 0 0 0 1px rgba(255,255,255,0.05)"
      : "inset 0 0 0 1px rgba(15,23,42,0.04)",
  };
}

export default function NewsEditorSidebar({
  form,
  set,
  categoryOptions,
  theme,
  readOnly = false,
  scrollable = false,
  compact = false,
}) {
  const { item } = useNewsEditorForm();
  if (!form) return null;

  const box = sectionBox(theme, compact);
  const lbl = { ...labelStyle, fontSize: pxToEm(compact ? 11 : 12), marginBottom: compact ? 6 : 8 };

  const reviewBlock = (
    <div style={box}>
      <label style={lbl}>نتیجه بررسی</label>
      <NewsChoiceButtons
        options={NEWS_REVIEW_STATES}
        value={form.review_state}
        onChange={(v) => set("review_state", v)}
        theme={theme}
        disabled={readOnly}
        columns={2}
        compact={compact}
      />
    </div>
  );

  const priorityBlock = (
    <div style={box}>
      <label style={lbl}>درجه اهمیت</label>
      <NewsChoiceButtons
        options={NEWS_PRIORITIES}
        value={form.priority}
        onChange={(v) => set("priority", v)}
        theme={theme}
        disabled={readOnly}
        columns={2}
        compact={compact}
      />
    </div>
  );

  const qualityBlock = (
    <div style={box}>
      <label style={lbl}>ارزیابی کیفیت</label>
      <NewsChoiceButtons
        options={NEWS_QUALITY}
        value={form.quality}
        onChange={(v) => set("quality", v)}
        theme={theme}
        disabled={readOnly}
        columns={compact ? 2 : 3}
        compact={compact}
      />
    </div>
  );

  const relevanceBlock = (
    <div style={box}>
      <label style={lbl}>مرتبط بودن</label>
      <NewsChoiceButtons
        options={NEWS_RELEVANCE_STATUSES}
        value={form.relevance_status || "unset"}
        onChange={(v) => set("relevance_status", v)}
        theme={theme}
        disabled={readOnly}
        columns={3}
        compact={compact}
      />
    </div>
  );

  const categoryBlock = (
    <div style={box}>
      <label style={lbl}>موضوع خبر</label>
      <MultiSelect
        options={categoryOptions}
        values={form.category_ids}
        onChange={(v) => set("category_ids", v)}
        placeholder="انتخاب دسته"
        disabled={readOnly}
        theme={theme}
      />
    </div>
  );

  const noteBlock = (
    <div style={{ ...box, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ ...lbl, marginBottom: 0 }}>توضیح کوتاه (اختیاری)</label>
        <CharCounter current={form.status_note?.length || 0} max={NEWS_FIELD_LIMITS.statusNote} />
      </div>
      <input
        disabled={readOnly}
        value={form.status_note}
        onChange={(e) => set("status_note", clampText(e.target.value, NEWS_FIELD_LIMITS.statusNote))}
        maxLength={NEWS_FIELD_LIMITS.statusNote}
        placeholder="مثلاً دلیل برگشت به فرستنده"
        style={inputStyle(theme)}
      />
    </div>
  );

  const monitorNoteBlock = item?.monitor_note ? (
    <div style={box}>
      <label style={lbl}>یادداشت پایشگر (علت اهمیت / ارتباط با سازمان)</label>
      <div
        style={{
          ...inputStyle(theme),
          minHeight: "2.6em",
          lineHeight: 1.7,
          opacity: 0.95,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {item.monitor_note}
      </div>
    </div>
  ) : null;

  return (
    <aside
      style={{
        height: scrollable ? "100%" : undefined,
        overflowY: scrollable ? "auto" : "visible",
        overflowX: "hidden",
        padding: scrollable || compact ? (compact ? "2px 0 8px" : "8px 4px") : undefined,
        background: compact ? "transparent" : undefined,
        borderRadius: compact ? undefined : undefined,
        border: undefined,
      }}
    >
      {!compact ? (
        <h3 style={{ margin: "0 0 12px", fontSize: pxToEm(13), fontWeight: 700, color: theme.accent }}>
          بررسی و حکم
        </h3>
      ) : null}

      {/* در موبایل: حکم و اهمیت اول — واضح‌تر و در دید اولیه */}
      {compact ? (
        <>
          {reviewBlock}
          {priorityBlock}
          {qualityBlock}
          {relevanceBlock}
          <div style={box}>
            <NewsSummarySection form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />
          </div>
          <div style={box}>
            <NewsSourceUrlField form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />
          </div>
          {categoryBlock}
          {monitorNoteBlock}
          {noteBlock}
        </>
      ) : (
        <>
          <div style={box}>
            <NewsSummarySection form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />
          </div>
          <div style={box}>
            <NewsSourceUrlField form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />
          </div>
          {reviewBlock}
          {priorityBlock}
          {qualityBlock}
          {relevanceBlock}
          {categoryBlock}
          {monitorNoteBlock}
          {noteBlock}
        </>
      )}
    </aside>
  );
}
