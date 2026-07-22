import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Plus, X, Calendar, ExternalLink, Ban } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import TopicContextPanel from "../../components/analysis/TopicContextPanel.jsx";
import MissionAssignForm from "../../components/analysis/MissionAssignForm.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { ASSIGN_DETAIL_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import { PAGE_NARROW_CSS } from "../../constants/pageLayoutWidths.js";
import { useManagementBackUrl } from "../../hooks/useManagementBackUrl.js";
import {
  MISSION_STATUS_META, PRIORITY_META, formatPersianDateShort,
  gregorianToPersianPicker, persianDateToGregorian, toDbDateString,
  isTopicClosedForAssignment,
  isTopicAssignableForMission,
} from "../../utils/analysisMonitorUtils.js";

function normalizeDeadline(value) {
  if (!value) return "";
  return toDbDateString(value);
}

export default function AnalysisTopicAssignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backTo = useManagementBackUrl("missions");
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const theme = { card: isDarkMode ? "#1e293b" : "#fff", border: isDarkMode ? "#334155" : "#e2e8f0", text: isDarkMode ? "#f1f5f9" : "#1e293b" };
  const deadlinePickerRef = useRef(null);

  const [topic, setTopic] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deadlineModalId, setDeadlineModalId] = useState(null);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [assign, setAssign] = useState({ analyst_id: "", mentor_id: "", deadline: "", priority: "medium", guidelines: "" });

  const tableBorder = isDarkMode ? "#334155" : "#e2e8f0";
  const thStyle = { padding: "10px 8px", fontSize: 11, fontWeight: 600, color: S.subMuted, textAlign: "right", borderBottom: `1px solid ${tableBorder}`, whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 8px", fontSize: 12, borderBottom: `1px solid ${tableBorder}`, verticalAlign: "middle" };
  const actionBtn = { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 10, borderRadius: 6, border: `1px solid ${tableBorder}`, background: "transparent", color: S.headingOnCard, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [t, list] = await Promise.all([
        analysisService.getTopic(id),
        analysisService.getTopicAssignments(id),
      ]);
      setTopic(t);
      setAssignments(list || []);
    } catch {
      alert("خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [a, m] = await Promise.all([
        analysisService.getAnalysts(),
        analysisService.getMentors(),
      ]);
      setAnalysts(a || []);
      setMentors(m || []);
    } catch {
      alert("خطا در بارگذاری لیست کاربران");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);

  useEffect(() => {
    if (showNewForm) loadUsers();
  }, [showNewForm, loadUsers]);

  useEffect(() => {
    const closeOnOutside = (e) => {
      const picker = deadlinePickerRef.current;
      if (!picker) return;
      const inCalendar = e.target.closest?.(".rmdp-wrapper");
      const inInput = e.target.closest?.(".assign-date-picker");
      if (!inCalendar && !inInput && typeof picker.closeCalendar === "function") {
        picker.closeCalendar();
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const openDeadlineModal = (assignment) => {
    setDeadlineModalId(assignment.id);
    setDeadlineDraft(normalizeDeadline(assignment.deadline));
  };

  const handleAssign = async () => {
    if (!assign.analyst_id) return alert("تحلیل‌گر را انتخاب کنید");
    try {
      await analysisService.createAssignment({ topic_id: id, ...assign });
      setAssign({ analyst_id: "", mentor_id: "", deadline: "", priority: "medium", guidelines: "" });
      setShowNewForm(false);
      loadCore();
      alert("مأموریت ایجاد شد");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleCancel = async (assignmentId) => {
    if (!window.confirm("ارجاع لغو شود؟")) return;
    try {
      await analysisService.cancelAssignment(assignmentId);
      loadCore();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleUpdateDeadline = async () => {
    if (!deadlineDraft) return alert("تاریخ مهلت را انتخاب کنید");
    try {
      await analysisService.updateAssignment(deadlineModalId, { deadline: deadlineDraft });
      setDeadlineModalId(null);
      setDeadlineDraft("");
      loadCore();
      alert("مهلت به‌روزرسانی شد");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  if (loading || !topic) {
    return (
      <AnalysisPageShell title={ANALYSIS_TERMS.assignPageTitle} backTo={backTo}>
        <p style={{ color: S.subMuted, fontSize: 12 }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  if (!isTopicAssignableForMission(topic) && !isTopicClosedForAssignment(topic)) {
    return (
      <AnalysisPageShell title={ANALYSIS_TERMS.assignPageTitle} backTo={backTo}>
        <p style={{ color: "#f59e0b", fontSize: 12 }}>{ANALYSIS_TERMS.assignGateMessage}</p>
      </AnalysisPageShell>
    );
  }

  const topicClosed = isTopicClosedForAssignment(topic);
  return (
    <AnalysisPageShell title={ANALYSIS_TERMS.assignPageTitle} subtitle={topic.topic_code} backTo={backTo} onHelp={ASSIGN_DETAIL_HELP} helpTitle="راهنمای ارجاع">
      <AnalysisWorkflowStepper currentStep="assign" topicStatus={topic.status} />

      {topicClosed && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, border: `1px solid ${tableBorder}`, background: "rgba(100,116,139,0.12)", fontSize: 12, color: "#64748b" }}>
          {ANALYSIS_TERMS.topicCompletedMessage}
        </div>
      )}

      <TopicContextPanel topic={topic} variant="compact" theme={theme} isDarkMode={isDarkMode} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <h4 style={{ color: S.headingOnCard, fontSize: 13, margin: 0 }}>مأموریت‌های موجود ({assignments.length})</h4>
        {!showNewForm && !topicClosed && (
          <button type="button" style={{ ...S.sendBtn, padding: "8px 14px", fontSize: 12, background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setShowNewForm(true)}>
            <Plus size={14} /> ارجاع جدید
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p style={{ fontSize: 12, color: S.subMuted, marginBottom: 16, textAlign: "center", padding: "24px 0" }}>هنوز مأموریتی ثبت نشده</p>
      ) : (
        <div className="analysis-assign-table-wrap" style={{ marginBottom: 20, border: `1px solid ${tableBorder}`, borderRadius: 10 }}>
          <table className="analysis-assign-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc" }}>
                <th style={thStyle}>تحلیل‌گر</th>
                <th style={thStyle}>وضعیت</th>
                <th style={thStyle}>{ANALYSIS_TERMS.missionDeadline}</th>
                <th style={thStyle}>اولویت</th>
                <th style={thStyle}>راهنما</th>
                <th style={{ ...thStyle, textAlign: "center" }}>اقدامات</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const st = MISSION_STATUS_META[a.status] || { label: a.status, color: "#94a3b8" };
                const pr = PRIORITY_META[a.priority] || PRIORITY_META.medium;
                return (
                  <tr key={a.id}>
                    <td style={tdStyle} data-label="تحلیل‌گر"><strong>{a.analyst_realname || "—"}</strong></td>
                    <td style={tdStyle} data-label="وضعیت">
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${st.color}22`, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={tdStyle} data-label="مهلت">{formatPersianDateShort(a.deadline)}</td>
                    <td style={tdStyle} data-label="اولویت">
                      <span style={{ fontSize: 10, color: pr.color }}>{pr.label}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11, color: S.subMuted }} data-label="راهنما">{a.mentor_name || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }} data-label="اقدامات">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                        <button type="button" style={actionBtn} onClick={() => openDeadlineModal(a)}>
                          <Calendar size={12} /> تغییر مهلت
                        </button>
                        <button type="button" style={{ ...actionBtn, color: "#38bdf8", borderColor: "rgba(56,189,248,0.4)" }} onClick={() => navigate(`/analysis/missions/mission/${a.id}?fromTab=missions`)}>
                          <ExternalLink size={12} /> مدیریت
                        </button>
                        {a.status === "Assigned" && (
                          <button type="button" style={{ ...actionBtn, color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }} onClick={() => handleCancel(a.id)}>
                            <Ban size={12} /> لغو
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNewForm && !topicClosed && (
        <MissionAssignForm
          assign={assign}
          onChange={setAssign}
          analysts={analysts}
          mentors={mentors}
          loadingUsers={loadingUsers}
          onSubmit={handleAssign}
          onCancel={() => setShowNewForm(false)}
          isDarkMode={isDarkMode}
          styles={S}
        />
      )}

      {deadlineModalId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setDeadlineModalId(null)}>
          <div style={{ background: isDarkMode ? "#1e293b" : "#fff", borderRadius: 12, border: `1px solid ${tableBorder}`, width: "100%", maxWidth: PAGE_NARROW_CSS, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 13 }}>تغییر {ANALYSIS_TERMS.missionDeadline}</strong>
              <button type="button" onClick={() => setDeadlineModalId(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div className="assign-date-picker" style={{ ...S.inputStyle, padding: "6px 10px", marginBottom: 14 }}>
              <ThemedDatePicker
                ref={deadlinePickerRef}
                isDarkMode={isDarkMode}
                value={gregorianToPersianPicker(deadlineDraft)}
                onChange={(d) => setDeadlineDraft(d ? persianDateToGregorian(d) : "")}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                placeholder="انتخاب تاریخ"
              />
            </div>
            <button type="button" style={{ ...S.sendBtn, width: "100%" }} onClick={handleUpdateDeadline}>ذخیره مهلت</button>
          </div>
        </div>
      )}
    </AnalysisPageShell>
  );
}
