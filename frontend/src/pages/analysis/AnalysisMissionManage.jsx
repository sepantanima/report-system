import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import RichTextEditor from "../../components/analysis/RichTextEditor.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { MISSION_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { MISSION_MANAGE_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import { useManagementBackUrl } from "../../hooks/useManagementBackUrl.js";
import {
  MISSION_STATUS_META, formatPersianDateShort, gregorianToPersianPicker, persianDateToGregorian,
} from "../../utils/analysisMonitorUtils.js";

export default function AnalysisMissionManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backTo = useManagementBackUrl("missions");
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);

  const [assignment, setAssignment] = useState(null);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");
  const [guidelines, setGuidelines] = useState("");

  const loadData = async () => {
    try {
      const data = await analysisService.getAssignment(id);
      setAssignment(data);
      setDeadline(data.deadline ? String(data.deadline).slice(0, 10) : "");
      setPriority(data.priority || "medium");
      setGuidelines(data.guidelines || "");
    } catch {
      alert("مأموریت یافت نشد");
      navigate(backTo);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSave = async () => {
    try {
      await analysisService.updateAssignment(id, { deadline, priority, guidelines });
      alert("ذخیره شد");
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("ارجاع لغو شود؟")) return;
    try {
      await analysisService.cancelAssignment(id);
      navigate(backTo);
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  if (!assignment) {
    return (
      <AnalysisPageShell title={ANALYSIS_TERMS.missionManageDetailTitle} backTo={backTo}>
        <p style={{ color: S.subMuted, fontSize: 12 }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  const st = MISSION_STATUS_META[assignment.status] || { label: assignment.status, color: "#94a3b8" };

  return (
    <AnalysisPageShell title={ANALYSIS_TERMS.missionManageDetailTitle} subtitle={assignment.topic_title} backTo={backTo} onHelp={MISSION_MANAGE_HELP} helpTitle={ANALYSIS_TERMS.missionManageDetailHelpTitle}>
      <AnalysisWorkflowStepper currentStep="analyze" topicStatus="Assigned" compact />
      <div style={{ marginBottom: 16, fontSize: 12, color: S.subMuted, lineHeight: 1.8, padding: 12, borderRadius: 10, background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc", border: `1px solid ${S.inputBorder}` }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${st.color}22`, color: st.color }}>{st.label}</span>
        </div>
        <div>{ANALYSIS_TERMS.axisLabelPrefix} {assignment.topic_title}</div>
        <div>تحلیل‌گر: {assignment.analyst_name || assignment.analyst_realname || "—"}</div>
        <div>راهنما: {assignment.mentor_name || "—"}</div>
        <div>کد محور: {assignment.topic_code || "—"}</div>
        <div>{ANALYSIS_TERMS.suggestedDeadline}: {formatPersianDateShort(assignment.topic_suggested_deadline)}</div>
        <div>{ANALYSIS_TERMS.missionDeadline}: {formatPersianDateShort(assignment.deadline)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div style={S.inputWrapper}>
          <label style={S.labelStyle}>مهلت جدید {ANALYSIS_TERMS.missionDeadline} (شمسی)</label>
          <div style={{ ...S.inputStyle, padding: "6px 10px" }}>
            <ThemedDatePicker
              isDarkMode={isDarkMode}
              value={gregorianToPersianPicker(deadline)}
              onChange={(d) => setDeadline(d ? persianDateToGregorian(d) : "")}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
            />
          </div>
        </div>
        <div style={S.inputWrapper}>
          <label style={S.labelStyle}>اولویت</label>
          <select style={S.selectStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">فوری</option>
            <option value="medium">متوسط</option>
            <option value="low">عادی</option>
          </select>
        </div>
      </div>
      <div style={S.inputWrapper}>
        <label style={S.labelStyle}>دستورالعمل</label>
        <RichTextEditor
          value={guidelines}
          onChange={setGuidelines}
          isDarkMode={isDarkMode}
          minHeight={100}
          maxLength={MISSION_FIELD_LIMITS.guidelines}
          placeholder="دستورالعمل انجام تحلیل..."
        />
      </div>
      <button type="button" style={{ ...S.sendBtn, width: "100%", marginBottom: 10 }} onClick={handleSave}>ذخیره تغییرات</button>

      {assignment.status === "Assigned" && (
        <button type="button" style={{ ...S.backBtn, width: "100%", color: "#ef4444", borderColor: "#ef4444", marginBottom: 10 }} onClick={handleCancel}>
          لغو ارجاع (قبل از شروع تحلیل)
        </button>
      )}

      {assignment.analysis_id && (
        <button type="button" style={{ ...S.backBtn, width: "100%" }} onClick={() => navigate(`/analysis/mission/${id}`)}>
          ورود به workflow تحلیل
        </button>
      )}
    </AnalysisPageShell>
  );
}
