import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import RichTextEditor from "../../components/analysis/RichTextEditor.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Plus, X, Calendar, ExternalLink, Ban } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import SearchableUserSelect from "../../components/analysis/SearchableUserSelect.jsx";
import { MISSION_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { ASSIGN_DETAIL_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import { useManagementBackUrl } from "../../hooks/useManagementBackUrl.js";
import {
  MISSION_STATUS_META, PRIORITY_META, formatPersianDateShort,
  gregorianToPersianPicker, persianDateToGregorian, toDbDateString,
} from "../../utils/analysisMonitorUtils.js";

function normalizeDeadline(value) {
  if (!value) return "";
  return toDbDateString(value);
}

export default function AnalysisTopicAssignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backTo = useManagementBackUrl("assign");
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const deadlinePickerRef = useRef(null);
  const newFormPickerRef = useRef(null);

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
      [deadlinePickerRef, newFormPickerRef].forEach((ref) => {
        const picker = ref.current;
        if (!picker) return;
        const inCalendar = e.target.closest?.(".rmdp-wrapper");
        const inInput = e.target.closest?.(".assign-date-picker");
        if (!inCalendar && !inInput && typeof picker.closeCalendar === "function") {
          picker.closeCalendar();
        }
      });
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
      <AnalysisPageShell title="ارجاع موضوع" backTo={backTo}>
        <p style={{ color: S.subMuted, fontSize: 12 }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  if (!["Approved", "Assigned"].includes(topic.status)) {
    return (
      <AnalysisPageShell title="ارجاع موضوع" backTo={backTo}>
        <p style={{ color: "#f59e0b", fontSize: 12 }}>فقط موضوعات تایید‌شده قابل ارجاع هستند.</p>
      </AnalysisPageShell>
    );
  }

  return (
    <AnalysisPageShell title="مدیریت ارجاع موضوع" subtitle={topic.topic_code} backTo={backTo} onHelp={ASSIGN_DETAIL_HELP} helpTitle="راهنمای ارجاع">
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ color: S.headingOnCard, fontSize: 14, margin: "0 0 8px" }}>{topic.title}</h3>
        <p style={{ color: S.subMuted, fontSize: 12, lineHeight: 1.7, margin: 0 }}>{topic.description}</p>
        <p style={{ color: S.subMuted, fontSize: 11, margin: "8px 0 0" }}>
          مهلت پیشنهادی موضوع: {formatPersianDateShort(topic.suggested_deadline)}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <h4 style={{ color: S.headingOnCard, fontSize: 13, margin: 0 }}>ارجاع‌های فعال ({assignments.length})</h4>
        {!showNewForm && (
          <button type="button" style={{ ...S.sendBtn, padding: "8px 14px", fontSize: 12, background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setShowNewForm(true)}>
            <Plus size={14} /> ارجاع جدید
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p style={{ fontSize: 12, color: S.subMuted, marginBottom: 16, textAlign: "center", padding: "24px 0" }}>هنوز ارجاع فعالی ثبت نشده</p>
      ) : (
        <>
          <div className="analysis-assign-table-wrap" style={{ marginBottom: 20, border: `1px solid ${tableBorder}`, borderRadius: 10 }}>
            <table className="analysis-assign-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc" }}>
                  <th style={thStyle}>تحلیل‌گر</th>
                  <th style={thStyle}>وضعیت</th>
                  <th style={thStyle}>مهلت انجام</th>
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
                      <td style={tdStyle} data-label="مهلت انجام">{formatPersianDateShort(a.deadline)}</td>
                      <td style={tdStyle} data-label="اولویت">
                        <span style={{ fontSize: 10, color: pr.color }}>{pr.label}</span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 11, color: S.subMuted }} data-label="راهنما">{a.mentor_name || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }} data-label="اقدامات">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                          <button type="button" style={actionBtn} onClick={() => openDeadlineModal(a)}>
                            <Calendar size={12} /> تغییر مهلت
                          </button>
                          <button type="button" style={{ ...actionBtn, color: "#38bdf8", borderColor: "rgba(56,189,248,0.4)" }} onClick={() => navigate(`/analysis/management/mission/${a.id}?fromTab=assign`)}>
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
        </>
      )}

      {showNewForm && (
        <div style={{ border: `1px solid ${tableBorder}`, borderRadius: 12, padding: 16, background: isDarkMode ? "rgba(0,0,0,0.15)" : "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ color: S.headingOnCard, fontSize: 13, margin: 0 }}>ارجاع جدید</h4>
            <button type="button" onClick={() => setShowNewForm(false)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={18} /></button>
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
                  onChange={(v) => setAssign({ ...assign, analyst_id: v })}
                  emptyMessage="کاربری با نقش تحلیل‌گر در سامانه یافت نشد"
                  inputStyle={S.selectStyle}
                  labelStyle={S.labelStyle}
                />
              </div>
              <div style={S.inputWrapper}>
                <SearchableUserSelect
                  label="راهنما"
                  users={mentors}
                  value={assign.mentor_id}
                  onChange={(v) => setAssign({ ...assign, mentor_id: v })}
                  placeholder="اختیاری"
                  emptyMessage="کاربری با نقش راهنما در سامانه یافت نشد"
                  inputStyle={S.selectStyle}
                  labelStyle={S.labelStyle}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <div style={S.inputWrapper}>
                  <label style={S.labelStyle}>اولویت</label>
                  <select style={S.selectStyle} value={assign.priority} onChange={(e) => setAssign({ ...assign, priority: e.target.value })}>
                    <option value="high">فوری</option>
                    <option value="medium">متوسط</option>
                    <option value="low">عادی</option>
                  </select>
                </div>
                <div style={S.inputWrapper}>
                  <label style={S.labelStyle}>مهلت انجام تحلیل (شمسی)</label>
                  <div className="assign-date-picker" style={{ ...S.inputStyle, padding: "6px 10px" }}>
                    <ThemedDatePicker
                      ref={newFormPickerRef}
                      isDarkMode={isDarkMode}
                      value={gregorianToPersianPicker(assign.deadline)}
                      onChange={(d) => setAssign({ ...assign, deadline: d ? persianDateToGregorian(d) : "" })}
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
                  onChange={(html) => setAssign({ ...assign, guidelines: html })}
                  isDarkMode={isDarkMode}
                  minHeight={80}
                  maxLength={MISSION_FIELD_LIMITS.guidelines}
                  placeholder="دستورالعمل..."
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" style={S.backBtn} onClick={() => setShowNewForm(false)}>انصراف</button>
                <button type="button" style={{ ...S.sendBtn, background: "#10b981" }} onClick={handleAssign}>ایجاد مأموریت</button>
              </div>
            </>
          )}
        </div>
      )}

      {deadlineModalId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setDeadlineModalId(null)}>
          <div style={{ background: isDarkMode ? "#1e293b" : "#fff", borderRadius: 12, border: `1px solid ${tableBorder}`, width: "100%", maxWidth: "min(640px, 94vw)", padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 13 }}>تغییر مهلت انجام تحلیل</strong>
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
