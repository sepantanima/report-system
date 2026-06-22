import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import TopicFormModal from "../../components/analysis/TopicFormModal.jsx";
import { ANALYSIS_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { clampText } from "../../utils/limitInput.js";
import { APPROVAL_DETAIL_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import { useManagementBackUrl } from "../../hooks/useManagementBackUrl.js";
import { TOPIC_STATUS_META, EMPTY_TOPIC_FORM, formatPersianDateShort } from "../../utils/analysisMonitorUtils.js";

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
    analysisService.getTopic(id).then(setTopic).catch(() => alert("موضوع یافت نشد"));
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
      <AnalysisPageShell title="بررسی موضوع" backTo={backTo}>
        <p style={{ color: S.subMuted, fontSize: "12px" }}>در حال بارگذاری...</p>
      </AnalysisPageShell>
    );
  }

  const statusMeta = TOPIC_STATUS_META[topic.status] || { label: topic.status, color: "#94a3b8" };

  return (
    <>
      <AnalysisPageShell title="بررسی و تایید موضوع" subtitle={topic.topic_code} backTo={backTo} onHelp={APPROVAL_DETAIL_HELP} helpTitle="راهنمای بررسی موضوع">
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <h3 style={{ color: S.headingOnCard, fontSize: 14, margin: 0 }}>{topic.title}</h3>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${statusMeta.color}22`, color: statusMeta.color }}>{statusMeta.label}</span>
          </div>
          <p style={{ color: S.subMuted, fontSize: 12, lineHeight: 1.8, margin: "0 0 8px" }}>{topic.description}</p>
          <div style={{ fontSize: 11, color: S.subMuted, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span>حوزه: {topic.domain || "—"}</span>
            <span>مهلت پیشنهادی موضوع: {formatPersianDateShort(topic.suggested_deadline)}</span>
            <span>پیشنهاددهنده: {topic.creator_name}</span>
          </div>
        </div>

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

        <button type="button" style={{ ...S.backBtn, width: "100%", marginBottom: 16 }} onClick={openEdit}>ویرایش محتوای موضوع</button>

        <div style={S.inputWrapper}>
          <label style={S.labelStyle}>تصمیم بررسی</label>
          <select style={S.selectStyle} value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="approve">تایید</option>
            <option value="reject">رد</option>
            <option value="needs_info">برگشت برای اصلاح</option>
            <option value="close">بستن</option>
          </select>
        </div>
        <div style={S.inputWrapper}>
          <label style={S.labelStyle}>توضیح</label>
          <textarea style={{ ...S.textareaStyle, height: 80 }} value={comment} maxLength={ANALYSIS_FIELD_LIMITS.description} onChange={(e) => setComment(clampText(e.target.value, ANALYSIS_FIELD_LIMITS.description))} />
        </div>
        <button type="button" style={{ ...S.sendBtn, width: "100%" }} onClick={handleReview}>ثبت تصمیم</button>
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
