import React from "react";
import MultiSelect from "../MultiSelect.jsx";
import CharCounter from "./CharCounter.jsx";
import NewsChoiceButtons from "./NewsChoiceButtons.jsx";
import NewsSummarySection from "./NewsSummarySection.jsx";
import NewsSourceUrlField from "./NewsSourceUrlField.jsx";
import {
  NEWS_PRIORITIES, NEWS_QUALITY, NEWS_REVIEW_STATES,
} from "../../constants/newsMonitorMeta.js";
import { NEWS_FIELD_LIMITS } from "../../constants/newsFieldLimits.js";
import { clampText } from "../../utils/limitInput.js";
import { pxToEm } from "../../utils/pageFontSize.js";

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

export default function NewsEditorSidebar({
  form,
  set,
  categoryOptions,
  theme,
  readOnly = false,
  scrollable = false,
  compact = false,
}) {
  if (!form) return null;

  const fieldWrap = { marginBottom: compact ? 8 : 14 };
  const lbl = { ...labelStyle, fontSize: pxToEm(compact ? 11 : 12), marginBottom: compact ? 5 : 8 };

  return (
    <aside
      style={{
        height: scrollable ? "100%" : undefined,
        overflowY: scrollable ? "auto" : "visible",
        overflowX: "hidden",
        padding: scrollable || compact ? (compact ? "4px 2px" : "8px 4px") : undefined,
        background: compact ? theme.card : undefined,
        borderRadius: compact ? 12 : undefined,
        border: compact ? `1px solid ${theme.border}` : undefined,
      }}
    >
      <h3 style={{ margin: compact ? "0 0 8px" : "0 0 12px", fontSize: pxToEm(compact ? 12 : 13), fontWeight: 700, color: theme.accent }}>
        بررسی و حکم
      </h3>

      <NewsSummarySection form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />

      <NewsSourceUrlField form={form} set={set} theme={theme} readOnly={readOnly} compact={compact} />

      <div style={fieldWrap}>
        <label style={lbl}>نتیجه بررسی</label>
        <NewsChoiceButtons
          options={NEWS_REVIEW_STATES}
          value={form.review_state}
          onChange={(v) => set("review_state", v)}
          theme={theme}
          disabled={readOnly}
          columns={2}
        />
      </div>

      <div style={fieldWrap}>
        <label style={lbl}>درجه اهمیت</label>
        <NewsChoiceButtons
          options={NEWS_PRIORITIES}
          value={form.priority}
          onChange={(v) => set("priority", v)}
          theme={theme}
          disabled={readOnly}
          columns={2}
        />
      </div>

      <div style={fieldWrap}>
        <label style={lbl}>ارزیابی کیفیت</label>
        <NewsChoiceButtons
          options={NEWS_QUALITY}
          value={form.quality}
          onChange={(v) => set("quality", v)}
          theme={theme}
          disabled={readOnly}
          columns={compact ? 2 : 3}
        />
      </div>

      <div style={fieldWrap}>
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

      <div style={fieldWrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ ...lbl, marginBottom: 0 }}>توضیح کوتاه (اختیاری)</label>
          <CharCounter current={form.status_note?.length || 0} max={NEWS_FIELD_LIMITS.statusNote} />
        </div>
        <input
          disabled={readOnly}
          value={form.status_note}
          onChange={(e) => set("status_note", clampText(e.target.value, NEWS_FIELD_LIMITS.statusNote))}
          maxLength={NEWS_FIELD_LIMITS.statusNote}
          placeholder="مثلاً دلیل رد"
          style={inputStyle(theme)}
        />
      </div>
    </aside>
  );
}
