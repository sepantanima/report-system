import React, { useState, useRef } from "react";
import { X, Calendar, CheckCircle } from "lucide-react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "./ThemedDatePicker.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  formatPersianDateShort,
  gregorianToPersianPicker,
  persianDateToGregorian,
  toDbDateString,
} from "../../utils/analysisMonitorUtils.js";

export default function TopicDeadlinePromptModal({
  topic,
  theme,
  isDarkMode,
  managerView = false,
  onComplete,
  onExtend,
  onDismiss,
  loading = false,
}) {
  const [mode, setMode] = useState(null);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const pickerRef = useRef(null);

  if (!topic) return null;

  const border = theme?.border || "#e2e8f0";
  const card = theme?.card || "#fff";
  const text = theme?.text || "#1e293b";

  const handleExtendSubmit = async () => {
    if (!deadlineDraft) return;
    await onExtend?.(topic, deadlineDraft);
    setMode(null);
    setDeadlineDraft("");
  };

  return (
    <div
      className="v3-modal-overlay"
      onClick={() => !loading && onDismiss?.()}
    >
      <div
        className="v3-modal-box"
        style={{ background: card, border: `1px solid ${border}`, maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button
            type="button"
            onClick={() => !loading && onDismiss?.()}
            className="v3-icon-btn"
            style={{ color: "#f87171", border: "none" }}
            disabled={loading}
          >
            <X size={18} />
          </button>
          <span>{ANALYSIS_TERMS.topicDeadlinePassed}</span>
        </div>
        <div className="v3-modal-body" style={{ color: text }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }}>
            مهلت پیشنهادی محور «<strong>{topic.title}</strong>» (
            {formatPersianDateShort(topic.suggested_deadline)}
            ) گذشته است.
          </p>
          {managerView ? (
            <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 16px", lineHeight: 1.6 }}>
              می‌توانید موضوع را ببندید (بدون لغو مأموریت‌های در جریان) یا مهلت را تمدید کنید.
            </p>
          ) : (
            <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 16px", lineHeight: 1.6 }}>
              مدیر تحلیل می‌تواند موضوع را ببندد یا مهلت را تمدید کند. مأموریت‌های در جریان ادامه می‌یابند.
            </p>
          )}

          {mode === "extend" ? (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                {ANALYSIS_TERMS.suggestedDeadline} جدید
              </label>
              <div className="assign-date-picker" style={{ padding: "6px 10px", border: `1px solid ${border}`, borderRadius: 8 }}>
                <ThemedDatePicker
                  ref={pickerRef}
                  isDarkMode={isDarkMode}
                  value={gregorianToPersianPicker(deadlineDraft)}
                  onChange={(d) => setDeadlineDraft(d ? persianDateToGregorian(d) : "")}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="ops-btn primary"
                  disabled={loading || !deadlineDraft}
                  onClick={handleExtendSubmit}
                >
                  ذخیره مهلت
                </button>
                <button type="button" className="ops-btn muted" disabled={loading} onClick={() => setMode(null)}>
                  بازگشت
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {managerView ? (
                <>
                  <button
                    type="button"
                    className="ops-btn danger"
                    disabled={loading}
                    onClick={() => onComplete?.(topic)}
                  >
                    <CheckCircle size={14} /> {ANALYSIS_TERMS.completeTopic}
                  </button>
                  <button
                    type="button"
                    className="ops-btn primary"
                    disabled={loading}
                    onClick={() => {
                      setMode("extend");
                      setDeadlineDraft(toDbDateString(topic.suggested_deadline));
                    }}
                  >
                    <Calendar size={14} /> {ANALYSIS_TERMS.extendDeadline}
                  </button>
                </>
              ) : null}
              <button type="button" className="ops-btn muted" disabled={loading} onClick={() => onDismiss?.()}>
                {managerView ? "بعداً" : "متوجه شدم"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
