import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Save, Send, MessageSquare, Award, Download, CheckCircle } from "lucide-react";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../theme/unitReportFormStyles";
import AnalysisPageShell from "../components/analysis/AnalysisPageShell.jsx";
import RichTextEditor from "../components/analysis/RichTextEditor.jsx";
import StarRating from "../components/analysis/StarRating.jsx";
import { MISSION_FIELD_LIMITS } from "../constants/analysisFieldLimits.js";
import { clampText } from "../utils/limitInput.js";
import { stripHtml } from "../constants/analysisFieldLimits.js";
import { MISSION_DETAIL_HELP } from "../content/analysisFormHelp.jsx";
import analysisService from "../services/analysisService";
import { getCurrentUser, parseUserRoles, canManageAnalysis } from "../utils/analysisAuth.js";
import { ANALYSIS_TERMS } from "../constants/analysisTerminology.js";
import { formatPersianDateShort, toPersianDigits } from "../utils/analysisMonitorUtils.js";

const STATUS_LABELS = {
  Draft: "پیش‌نویس", Submitted: "ارسال‌شده", ReturnedForRevision: "نیازمند اصلاح",
  Revised: "اصلاح‌شده", Approved: "تایید شده", Final: "نسخه نهایی",
};

export default function AnalysisMissionDetail() {
  const { id } = useParams();
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const user = useMemo(() => getCurrentUser(), []);
  const roles = useMemo(() => parseUserRoles(user.role), [user.role]);
  const isAnalystRole = roles.includes("analyst");
  const isMentorRole = roles.includes("mentor");
  const isManager = canManageAnalysis();

  const [assignment, setAssignment] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState("content");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState("corrective");
  const [scoreForm, setScoreForm] = useState({});
  const [evaluatorComment, setEvaluatorComment] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const assign = await analysisService.getAssignment(id);
      setAssignment(assign);
      const anal = await analysisService.getAnalysisByAssignment(id);
      setAnalysis(anal);
      const version = anal?.versions?.[0] || null;
      setCurrentVersion(version);
      if (version) {
        setTitle(version.title || "");
        setContent(version.content || "");
        setFeedbacks(await analysisService.getFeedbacks(version.id));
        const existingScores = await analysisService.getScores(version.id);
        setScores(existingScores);
        const initialScores = {};
        (existingScores || []).forEach((s) => { initialScores[s.criteria_id] = s.score; });
        setScoreForm(initialScores);
      } else {
        setTitle("");
        setContent("");
        setFeedbacks([]);
        setScores([]);
        setScoreForm({});
      }
      if (anal || isManager || isMentorRole) {
        setCriteria(await analysisService.getCriteria());
      }
    } catch {
      alert("خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [id, isManager, isMentorRole]);

  useEffect(() => { loadData(); }, [loadData]);

  const isAnalyst = isAnalystRole && assignment?.analyst_id === user.id;
  const isAssignedMentor = isMentorRole && assignment?.mentor_id === user.id;
  const isReviewer = isManager || isAssignedMentor;

  const backPath = isAnalystRole ? "/analysis/my-missions" : isManager ? "/analysis/management?tab=missions" : "/analysis/review";

  const editableStatuses = ["Draft", "ReturnedForRevision"];
  const canEdit = Boolean(
    isAnalyst && currentVersion && !currentVersion.is_locked && editableStatuses.includes(currentVersion.status)
  );

  const showReadOnlyContent = Boolean(currentVersion && !canEdit);
  const canGiveFeedback = isReviewer && currentVersion && ["Submitted", "UnderReview", "NeedsRevision", "Revised", "Approved"].includes(currentVersion.status || assignment?.status);
  const canApproveFinal = isManager && analysis && analysis.status !== "FinalApproved" && currentVersion;
  const canScore = isManager && analysis?.status === "FinalApproved" && currentVersion;

  const visibleSteps = useMemo(() => {
    const steps = [{ id: "content", label: "محتوای تحلیل" }];
    if (isReviewer) steps.push({ id: "feedback", label: "بازخورد" });
    if (isManager) {
      steps.push({ id: "approve", label: "تایید نهایی" });
      if (analysis?.status === "FinalApproved") steps.push({ id: "score", label: "امتیازدهی" });
    }
    return steps;
  }, [isReviewer, isManager, analysis?.status]);

  useEffect(() => {
    if (!visibleSteps.find((s) => s.id === activeStep)) {
      setActiveStep(visibleSteps[0]?.id || "content");
    }
  }, [visibleSteps, activeStep]);

  const handleSaveDraft = async () => {
    if (!currentVersion) return;
    try {
      const updated = await analysisService.saveVersion(currentVersion.id, { title, content, change_note: changeNote });
      setCurrentVersion(updated);
      alert("پیش‌نویس ذخیره شد");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !stripHtml(content).trim()) return alert("عنوان و متن الزامی است");
    try {
      await analysisService.submitVersion(currentVersion.id, { title, content, change_note: changeNote });
      await loadData();
      alert("برای بررسی ارسال شد");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleFeedback = async (requestRevision = false) => {
    if (!feedbackText.trim()) return;
    try {
      await analysisService.addFeedback({ version_id: currentVersion.id, content: feedbackText, feedback_type: feedbackType, request_revision: requestRevision });
      setFeedbackText("");
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleScore = async () => {
    const scoreList = criteria.map((c) => ({
      criteria_id: c.id,
      score: parseFloat(scoreForm[c.id] || 0) || 0,
    }));
    const rated = scoreList.filter((s) => s.score > 0);
    if (!rated.length) {
      return alert("حداقل یک معیار باید امتیاز ۱ تا ۵ دریافت کند");
    }
    if (scoreList.some((s) => s.score < 0 || s.score > 5 || (s.score > 0 && s.score < 1))) {
      return alert("امتیاز هر معیار باید ۰ (بدون امتیاز) یا بین ۱ تا ۵ باشد");
    }
    try {
      await analysisService.submitScores(currentVersion.id, { scores: scoreList, evaluator_comment: evaluatorComment });
      await loadData();
      alert("امتیاز ثبت شد");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleApproveFinal = async () => {
    if (!window.confirm("تایید نهایی شود؟")) return;
    try {
      await analysisService.approveFinal(analysis.id, { version_id: currentVersion.id });
      await loadData();
      setActiveStep("score");
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await analysisService.exportPdf(analysis.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis-${analysis.id}.pdf`;
      a.click();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const stepTabStyle = (stepId) => ({
    padding: "8px 12px",
    fontSize: 11,
    borderRadius: 8,
    border: activeStep === stepId ? "1px solid #38bdf8" : `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
    background: activeStep === stepId ? "rgba(56,189,248,0.12)" : "transparent",
    color: activeStep === stepId ? "#38bdf8" : S.subMuted,
    cursor: "pointer",
    fontFamily: "inherit",
  });

  if (loading) {
    return (
      <AnalysisPageShell title="جزئیات مأموریت" backTo={backPath}>
        <p style={{ color: S.subMuted, fontSize: "12px" }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  return (
    <AnalysisPageShell title={`${ANALYSIS_TERMS.axisLabelPrefix} ${assignment?.topic_title || "—"}`} subtitle={STATUS_LABELS[assignment?.status] || assignment?.status} backTo={backPath} onHelp={MISSION_DETAIL_HELP} helpTitle="راهنمای مأموریت">
      <div style={{ fontSize: "11px", color: S.subMuted, marginBottom: "16px", lineHeight: 1.7, padding: 12, borderRadius: 10, background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc", border: `1px solid ${S.inputBorder}` }}>
        <div>{ANALYSIS_TERMS.missionDeadline}: {formatPersianDateShort(assignment?.deadline)}</div>
        <div>{ANALYSIS_TERMS.suggestedDeadline}: {formatPersianDateShort(assignment?.topic_suggested_deadline)}</div>
        <div>اولویت: {assignment?.priority}</div>
        {assignment?.guidelines && <p style={{ marginTop: "8px" }}>{assignment.guidelines}</p>}
        {!assignment?.mentor_id && isManager && (
          <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            بدون راهنما — بازبینی توسط مدیر
          </span>
        )}
      </div>

      {!analysis && (isManager || isReviewer) && (
        <p style={{ fontSize: 12, color: "#f59e0b", marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(245,158,11,0.1)" }}>
          تحلیل‌گر هنوز کار را شروع نکرده است.
        </p>
      )}

      {!analysis && isAnalyst && assignment?.status === "Assigned" && (
        <button type="button" style={{ ...S.sendBtn, width: "100%", marginBottom: 16 }} onClick={async () => {
          try {
            await analysisService.createAnalysis(id);
            await loadData();
          } catch (err) {
            alert(err.response?.data?.error || "خطا");
          }
        }}>شروع تحلیل</button>
      )}

      {analysis && (
        <>
          {analysis.versions?.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {analysis.versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setCurrentVersion(v); setTitle(v.title || ""); setContent(v.content || ""); }}
                  style={{
                    ...S.priorityBtn,
                    padding: "6px 10px",
                    fontSize: "10px",
                    border: currentVersion?.id === v.id ? "1px solid #38bdf8" : "1px solid #334155",
                    background: currentVersion?.id === v.id ? "rgba(56,189,248,0.15)" : "transparent",
                    color: currentVersion?.id === v.id ? "#38bdf8" : S.subMuted,
                  }}
                >
                  نسخه {toPersianDigits(v.version_number)}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {visibleSteps.map((step) => (
              <button key={step.id} type="button" style={stepTabStyle(step.id)} onClick={() => setActiveStep(step.id)}>
                {step.label}
              </button>
            ))}
          </div>

          {activeStep === "content" && (
            <div>
              {canEdit && (
                <>
                  <div style={S.inputWrapper}>
                    <label style={S.labelStyle}>عنوان تحلیل</label>
                    <input style={S.inputStyle} value={title} maxLength={MISSION_FIELD_LIMITS.analysisTitle} onChange={(e) => setTitle(clampText(e.target.value, MISSION_FIELD_LIMITS.analysisTitle))} />
                  </div>
                  <div style={S.inputWrapper}>
                    <label style={S.labelStyle}>متن تحلیل</label>
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      isDarkMode={isDarkMode}
                      minHeight={200}
                      maxLength={MISSION_FIELD_LIMITS.analysisContent}
                      allowFullscreen
                      placeholder="متن تحلیل را بنویسید..."
                    />
                  </div>
                  <div style={S.inputWrapper}>
                    <label style={S.labelStyle}>توضیح تغییرات</label>
                    <input style={S.inputStyle} value={changeNote} maxLength={MISSION_FIELD_LIMITS.changeNote} onChange={(e) => setChangeNote(clampText(e.target.value, MISSION_FIELD_LIMITS.changeNote))} />
                  </div>
                  <div style={S.btnRow}>
                    <button type="button" style={S.backBtn} onClick={handleSaveDraft}><Save size={14} /> ذخیره</button>
                    <button type="button" style={S.sendBtn} onClick={handleSubmit}><Send size={14} /> ارسال</button>
                  </div>
                </>
              )}
              {showReadOnlyContent && (
                <div style={{ ...S.historyItem, borderRadius: "10px", padding: "12px" }}>
                  <strong style={{ display: "block", marginBottom: "8px", color: S.headingOnCard }}>{currentVersion?.title}</strong>
                  <RichTextEditor value={currentVersion?.content || ""} readOnly isDarkMode={isDarkMode} minHeight={120} />
                  {currentVersion?.is_locked && (
                    <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 8 }}>نسخه قفل شده — فقط مشاهده</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeStep === "feedback" && isReviewer && (
            <div>
              {canGiveFeedback ? (
                <>
                  <h4 style={{ color: S.headingOnCard, fontSize: "13px", marginBottom: "10px" }}><MessageSquare size={14} style={{ verticalAlign: "middle" }} /> ثبت بازخورد</h4>
                  <select style={{ ...S.selectStyle, marginBottom: "8px" }} value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                    <option value="corrective">اصلاحی</option>
                    <option value="confirming">تاییدی</option>
                    <option value="question">پرسش</option>
                    <option value="policy">سیاستی</option>
                  </select>
                  <textarea style={{ ...S.textareaStyle, height: "80px", marginBottom: "8px" }} value={feedbackText} maxLength={MISSION_FIELD_LIMITS.feedback} onChange={(e) => setFeedbackText(clampText(e.target.value, MISSION_FIELD_LIMITS.feedback))} placeholder="متن بازخورد..." />
                  <div style={S.btnRow}>
                    <button type="button" style={S.sendBtn} onClick={() => handleFeedback(false)}>ثبت نظر</button>
                    <button type="button" style={{ ...S.sendBtn, background: "#f59e0b" }} onClick={() => handleFeedback(true)}>درخواست اصلاح</button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: S.subMuted }}>بازخورد پس از ارسال تحلیل فعال می‌شود.</p>
              )}
              {feedbacks.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <h4 style={{ color: S.headingOnCard, fontSize: "12px" }}>گفتگوها</h4>
                  {feedbacks.map((f) => (
                    <div key={f.id} style={{ ...S.historyItem, borderRadius: "8px", marginTop: "8px", padding: "10px", fontSize: "11px" }}>
                      <strong style={{ color: "#38bdf8" }}>{f.user_name}</strong>
                      <p style={{ margin: "4px 0 0", color: S.subMuted }}>{f.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeStep === "approve" && isManager && (
            <div>
              {canApproveFinal ? (
                <button type="button" style={{ ...S.sendBtn, width: "100%", background: "#10b981" }} onClick={handleApproveFinal}>
                  <CheckCircle size={14} /> تایید نهایی تحلیل
                </button>
              ) : analysis?.status === "FinalApproved" ? (
                <div>
                  <p style={{ fontSize: 12, color: "#22c55e", marginBottom: 12 }}>تحلیل تایید نهایی شده است.</p>
                  <button type="button" style={{ ...S.sendBtn, background: "#ef4444", width: "100%" }} onClick={handleExportPdf}>
                    <Download size={14} /> دریافت PDF
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: S.subMuted }}>پس از بازبینی و ارسال تحلیل، تایید نهایی فعال می‌شود.</p>
              )}
            </div>
          )}

          {activeStep === "score" && canScore && (
            <div>
              <h4 style={{ color: S.headingOnCard, fontSize: "13px", marginBottom: "10px" }}><Award size={14} /> امتیازدهی (۱ تا ۵)</h4>
              {criteria.map((c) => (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: S.subMuted, marginBottom: 6 }}>{c.name_fa || c.name}</div>
                  <StarRating
                    value={scoreForm[c.id] || 0}
                    onChange={(val) => setScoreForm({ ...scoreForm, [c.id]: val })}
                    max={5}
                  />
                </div>
              ))}
              <textarea style={{ ...S.textareaStyle, height: "60px", marginBottom: "8px" }} value={evaluatorComment} maxLength={MISSION_FIELD_LIMITS.evaluatorComment} onChange={(e) => setEvaluatorComment(clampText(e.target.value, MISSION_FIELD_LIMITS.evaluatorComment))} placeholder="توضیح ارزیاب" />
              <button type="button" style={{ ...S.sendBtn, width: "100%", background: "#10b981" }} onClick={handleScore}>ثبت امتیاز</button>
              {scores[0]?.total_score != null && (
                <p style={{ fontSize: "11px", color: S.subMuted, marginTop: "8px" }}>امتیاز کل: {toPersianDigits(scores[0].total_score)}</p>
              )}
            </div>
          )}
        </>
      )}
    </AnalysisPageShell>
  );
}
