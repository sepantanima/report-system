import React, { useRef, useEffect } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { X } from "lucide-react";
import ThemedDatePicker from "./ThemedDatePicker.jsx";
import RichTextEditor from "./RichTextEditor.jsx";
import SearchableUserSelect from "./SearchableUserSelect.jsx";
import SearchableOptionSelect from "./SearchableOptionSelect.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { MISSION_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { gregorianToPersianPicker, persianDateToGregorian } from "../../utils/analysisMonitorUtils.js";

export default function MissionAssignForm({
  assign,
  onChange,
  analysts = [],
  mentors = [],
  loadingUsers = false,
  onSubmit,
  onCancel,
  isDarkMode = false,
  styles = {},
  embedded = false,
}) {
  const pickerRef = useRef(null);
  const S = styles;

  useEffect(() => {
    const closeOnOutside = (e) => {
      const picker = pickerRef.current;
      if (!picker) return;
      const inCalendar = e.target.closest?.(".rmdp-wrapper");
      const inInput = e.target.closest?.(".mission-assign-date-picker");
      if (!inCalendar && !inInput && typeof picker.closeCalendar === "function") {
        picker.closeCalendar();
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const wrapperStyle = embedded ? {} : {
    border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
    borderRadius: 12,
    padding: 16,
    background: isDarkMode ? "rgba(0,0,0,0.15)" : "#f8fafc",
  };

  return (
    <div style={wrapperStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h4 style={{ color: S.headingOnCard, fontSize: 13, margin: 0 }}>{ANALYSIS_TERMS.createMissionForRatified}</h4>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {loadingUsers ? (
        <p style={{ fontSize: 12, color: S.subMuted }}>در حال بارگذاری کاربران...</p>
      ) : (
        <>
          <div style={S.inputWrapper}>
            <SearchableUserSelect
              label="تحلیل‌گر"
              required
              users={analysts}
              value={assign.analyst_id}
              onChange={(v) => onChange({ ...assign, analyst_id: v })}
              emptyMessage="کاربری با نقش تحلیل‌گر در سامانه یافت نشد"
              inputStyle={S.selectStyle}
              labelStyle={S.labelStyle}
              isDarkMode={isDarkMode}
            />
          </div>
          <div style={S.inputWrapper}>
            <SearchableUserSelect
              label="راهنما"
              users={mentors}
              value={assign.mentor_id}
              onChange={(v) => onChange({ ...assign, mentor_id: v })}
              placeholder="اختیاری"
              emptyMessage="کاربری با نقش راهنما در سامانه یافت نشد"
              inputStyle={S.selectStyle}
              labelStyle={S.labelStyle}
              isDarkMode={isDarkMode}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div style={S.inputWrapper}>
              <SearchableOptionSelect
                label="اولویت"
                value={assign.priority}
                onChange={(v) => onChange({ ...assign, priority: v })}
                options={[
                  { value: "high", label: "فوری" },
                  { value: "medium", label: "متوسط" },
                  { value: "low", label: "عادی" },
                ]}
                inputStyle={S.selectStyle}
                labelStyle={S.labelStyle}
                isDarkMode={isDarkMode}
              />
            </div>
            <div style={S.inputWrapper}>
              <label style={S.labelStyle}>{ANALYSIS_TERMS.missionDeadline} (شمسی)</label>
              <div className="mission-assign-date-picker" style={{ ...S.inputStyle, padding: "6px 10px" }}>
                <ThemedDatePicker
                  ref={pickerRef}
                  isDarkMode={isDarkMode}
                  value={gregorianToPersianPicker(assign.deadline)}
                  onChange={(d) => onChange({ ...assign, deadline: d ? persianDateToGregorian(d) : "" })}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  placeholder="انتخاب تاریخ"
                />
              </div>
            </div>
          </div>
          <div style={S.inputWrapper}>
            <label style={S.labelStyle}>دستورالعمل</label>
            <RichTextEditor
              value={assign.guidelines}
              onChange={(html) => onChange({ ...assign, guidelines: html })}
              isDarkMode={isDarkMode}
              minHeight={80}
              maxLength={MISSION_FIELD_LIMITS.guidelines}
              placeholder="دستورالعمل..."
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && <button type="button" style={S.backBtn} onClick={onCancel}>انصراف</button>}
            <button type="button" style={{ ...S.sendBtn, background: "#10b981" }} onClick={onSubmit}>ایجاد مأموریت</button>
          </div>
        </>
      )}
    </div>
  );
}
