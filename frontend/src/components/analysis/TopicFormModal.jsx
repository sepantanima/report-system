import React, { useRef, useEffect, useMemo, useState } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { DateObject } from "react-multi-date-picker";
import { X, AlertCircle } from "lucide-react";
import ThemedDatePicker from "./ThemedDatePicker.jsx";
import RichTextEditor, { stripHtml } from "./RichTextEditor.jsx";
import {
  gregorianToPersianPicker,
  persianDateToGregorian,
  TOPIC_FIELD_LIMITS,
  toPersianDigits,
  TOPIC_STATUS_META,
  formatPersianDateShort,
} from "../../utils/analysisMonitorUtils.js";

function CharCounter({ value, max }) {
  const len = (value || "").length;
  const over = len > max;
  return (
    <span style={{ fontSize: 10, color: over ? "#ef4444" : "rgba(148,163,184,0.9)", marginRight: "auto" }}>
      {toPersianDigits(len)}/{toPersianDigits(max)}
    </span>
  );
}

function FieldLabel({ children, counter }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <label className="v3-label-new" style={{ marginBottom: 0 }}>{children}</label>
      {counter}
    </div>
  );
}

function HistorySnippet({ history, isDarkMode, theme }) {
  const returns = (history || []).filter((h) => h.new_status === "UnderReview" || h.new_status === "Rejected");
  if (!returns.length) return null;
  return (
    <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: isDarkMode ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>سوابق برگشت / رد</div>
      {returns.slice(0, 5).map((h) => (
        <div key={h.id} style={{ fontSize: 10, color: theme.text, opacity: 0.85, padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
          <span>{formatPersianDateShort(h.created_at)} — {TOPIC_STATUS_META[h.new_status]?.label || h.new_status}</span>
          {h.comment && <div style={{ marginTop: 2, color: "#f59e0b" }}>{h.comment}</div>}
        </div>
      ))}
    </div>
  );
}

export default function TopicFormModal({
  open, onClose, onSubmit, form, setForm, isEdit, theme, isDarkMode, history = [], returnComment,
}) {
  const datePickerRef = useRef(null);
  const todayPersian = useMemo(() => new DateObject({ calendar: persian }), []);
  const [descPlainLen, setDescPlainLen] = useState(() => stripHtml(form.description).length);
  const [reasonPlainLen, setReasonPlainLen] = useState(() => stripHtml(form.importance_reason).length);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (e) => {
      const picker = datePickerRef.current;
      if (!picker) return;
      const inCalendar = e.target.closest?.(".rmdp-wrapper");
      const inInput = e.target.closest?.(".topic-deadline-picker");
      if (!inCalendar && !inInput && typeof picker.closeCalendar === "function") {
        picker.closeCalendar();
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  if (!open) return null;

  const inputStyle = {
    width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 13, outline: "none", marginBottom: 12,
    background: isDarkMode ? "rgba(0,0,0,0.25)" : "#f8fafc",
    border: `1px solid ${theme.border}`, color: theme.text,
  };

  const setLimited = (field, max) => (e) => {
    setForm({ ...form, [field]: e.target.value.slice(0, max) });
  };

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <div className="v3-modal-box" style={{ background: theme.card, border: `1px solid ${theme.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="v3-modal-header-new">
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={18} /></button>
          <span>{isEdit ? "ویرایش موضوع" : "ثبت موضوع جدید"}</span>
        </div>
        <form className="v3-modal-body" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          {returnComment && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: isDarkMode ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>علت برگشت / نظر بررسی‌کننده</div>
                <p style={{ fontSize: 12, margin: 0, lineHeight: 1.7, color: theme.text }}>{returnComment}</p>
              </div>
            </div>
          )}

          <HistorySnippet history={history} isDarkMode={isDarkMode} theme={theme} />

          <FieldLabel counter={<CharCounter value={form.title} max={TOPIC_FIELD_LIMITS.title} />}>عنوان موضوع *</FieldLabel>
          <input style={inputStyle} required maxLength={TOPIC_FIELD_LIMITS.title} value={form.title} onChange={setLimited("title", TOPIC_FIELD_LIMITS.title)} />

          <FieldLabel counter={<CharCounter value={descPlainLen} max={TOPIC_FIELD_LIMITS.description} />}>شرح موضوع *</FieldLabel>
          <div style={{ marginBottom: 12 }}>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              onPlainTextChange={setDescPlainLen}
              isDarkMode={isDarkMode}
              minHeight={100}
              maxLength={TOPIC_FIELD_LIMITS.description}
              placeholder="شرح کامل موضوع..."
            />
          </div>
          <FieldLabel counter={<CharCounter value={form.domain} max={TOPIC_FIELD_LIMITS.domain} />}>حوزه</FieldLabel>          <input style={inputStyle} maxLength={TOPIC_FIELD_LIMITS.domain} value={form.domain} onChange={setLimited("domain", TOPIC_FIELD_LIMITS.domain)} />

          <FieldLabel counter={<CharCounter value={form.keywords} max={TOPIC_FIELD_LIMITS.keywords} />}>کلیدواژه‌ها</FieldLabel>
          <input style={inputStyle} maxLength={TOPIC_FIELD_LIMITS.keywords} value={form.keywords} onChange={setLimited("keywords", TOPIC_FIELD_LIMITS.keywords)} placeholder="با ویرگول جدا کنید" />

          <FieldLabel counter={<CharCounter value={reasonPlainLen} max={TOPIC_FIELD_LIMITS.importance_reason} />}>دلیل اهمیت</FieldLabel>
          <div style={{ marginBottom: 12 }}>
            <RichTextEditor
              value={form.importance_reason}
              onChange={(html) => setForm({ ...form, importance_reason: html })}
              onPlainTextChange={setReasonPlainLen}
              isDarkMode={isDarkMode}
              minHeight={80}
              maxLength={TOPIC_FIELD_LIMITS.importance_reason}
              placeholder="دلیل اهمیت موضوع..."
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <div>
              <label className="v3-label-new">اولویت</label>
              <select style={{ ...inputStyle, marginBottom: 0 }} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">فوری</option>
                <option value="medium">متوسط</option>
                <option value="low">عادی</option>
              </select>
            </div>
            <div>
              <label className="v3-label-new">مهلت پیشنهادی موضوع (شمسی)</label>
              <div className="topic-deadline-picker" style={{ ...inputStyle, display: "flex", alignItems: "center", padding: "6px 10px", marginBottom: 0 }}>
                <ThemedDatePicker
                  ref={datePickerRef}
                  isDarkMode={isDarkMode}
                  value={gregorianToPersianPicker(form.suggested_deadline)}
                  onChange={(d) => setForm({ ...form, suggested_deadline: d ? persianDateToGregorian(d) : "" })}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  minDate={todayPersian}
                  placeholder="انتخاب تاریخ"
                />
              </div>
            </div>
          </div>
          <div className="v3-modal-footer-new" style={{ padding: 0, border: "none", marginTop: 16 }}>
            <button type="button" className="v3-btn-footer v3-secondary-btn" onClick={onClose}>انصراف</button>
            <button type="submit" className="v3-btn-footer v3-primary-solid">{isEdit ? "ذخیره تغییرات" : "ثبت موضوع"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
