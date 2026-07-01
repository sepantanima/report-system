import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import TopicContextPanel from "../../components/analysis/TopicContextPanel.jsx";
import ApprovalDecisionPanel from "../../components/analysis/ApprovalDecisionPanel.jsx";
import TopicFormModal from "../../components/analysis/TopicFormModal.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import { APPROVAL_DETAIL_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import { useManagementBackUrl } from "../../hooks/useManagementBackUrl.js";
import { EMPTY_TOPIC_FORM } from "../../utils/analysisMonitorUtils.js";

export default function AnalysisTopicApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backTo = useManagementBackUrl("approve");
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const theme = { card: isDarkMode ? "#1e293b" : "#fff", border: isDarkMode ? "#334155" : "#e2e8f0", text: isDarkMode ? "#f1f5f9" : "#1e293b" };

  const [topic, setTopic] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [comment, setComment] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TOPIC_FORM);

  const loadTopic = () => {
    analysisService.getTopic(id).then(setTopic).catch(() => alert("محور یافت نشد"));
  };

  useEffect(() => { loadTopic(); }, [id]);

  const handleReview = async () => {
    try {
      await analysisService.reviewTopic(id, { decision, comment });
      alert("تصمیم ثبت شد");
      navigate(backTo);
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const openEdit = () => {
    setForm({
      title: topic.title || "",
      description: topic.description || "",
      domain: topic.domain || "",
      keywords: topic.keywords || "",
      priority: topic.priority || "medium",
      importance_reason: topic.importance_reason || "",
      suggested_deadline: topic.suggested_deadline ? String(topic.suggested_deadline).slice(0, 10) : "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await analysisService.updateTopic(id, form);
      setEditOpen(false);
      loadTopic();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  if (!topic) {
    return (
      <AnalysisPageShell title={ANALYSIS_TERMS.ratifyPageTitle} backTo={backTo}>
        <p style={{ color: S.subMuted, fontSize: "12px" }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  return (
    <>
      <AnalysisPageShell
        title={ANALYSIS_TERMS.ratifyPageTitle}
        subtitle={topic.topic_code}
        backTo={backTo}
        onHelp={APPROVAL_DETAIL_HELP}
        helpTitle={ANALYSIS_TERMS.ratifyHelpTitle}
      >
        <AnalysisWorkflowStepper currentStep="ratify" topicStatus={topic.status} />

        <TopicContextPanel topic={topic} variant="full" theme={theme} isDarkMode={isDarkMode} />

        {topic.history?.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc", border: `1px solid ${S.inputBorder}` }}>
            <h4 style={{ fontSize: 12, margin: "0 0 8px", color: S.headingOnCard }}>تاریخچه</h4>
            {topic.history.slice(0, 5).map((h) => (
              <div key={h.id} style={{ fontSize: 10, color: S.subMuted, padding: "4px 0", borderBottom: `1px solid ${S.inputBorder}` }}>
                {h.old_status || "—"} → {h.new_status} | {h.changed_by_name} {h.comment ? `— ${h.comment}` : ""}
              </div>
            ))}
          </div>
        )}

        <button type="button" style={{ ...S.backBtn, width: "100%", marginBottom: 16 }} onClick={openEdit}>
          {ANALYSIS_TERMS.editAxisContent}
        </button>

        <ApprovalDecisionPanel
          decision={decision}
          onDecisionChange={setDecision}
          comment={comment}
          onCommentChange={setComment}
          onSubmit={handleReview}
          styles={S}
          isDarkMode={isDarkMode}
        />
      </AnalysisPageShell>

      <TopicFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleSaveEdit}
        form={form}
        setForm={setForm}
        isEdit
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
