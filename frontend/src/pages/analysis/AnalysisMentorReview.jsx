import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { MENTOR_REVIEW_HELP } from "../../content/analysisFormHelp.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import analysisService from "../../services/analysisService";
import { getCurrentUser, parseUserRoles, MISSION_STATUS, canManageAnalysis } from "../../utils/analysisAuth.js";

export default function AnalysisMentorReview() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const user = getCurrentUser();
  const roles = parseUserRoles(user.role);
  const isManager = canManageAnalysis();
  const isMentor = roles.includes("mentor");
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = isManager
      ? { forReview: "true" }
      : isMentor
        ? { mentorId: user.id, forReview: "true" }
        : { mentorId: user.id };

    analysisService.getAssignments(params)
      .then((data) => {
        const list = data || [];
        if (isManager) return setMissions(list);
        return setMissions(list.filter((m) => m.mentor_id === user.id));
      })
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [user.id, isManager, isMentor]);

  return (
    <AnalysisPageShell title="بازبینی تحلیل‌ها" subtitle="بررسی، بازخورد و امتیازدهی" backTo="/main" onHelp={MENTOR_REVIEW_HELP} helpTitle="راهنمای بازبینی">
      <AnalysisWorkflowStepper currentStep="review" compact />
      {loading && <p style={{ color: S.subMuted, fontSize: "12px" }}>در حال بارگذاری...</p>}
      {!loading && missions.length === 0 && (
        <p style={{ color: S.emptyStateColor, fontSize: "12px", textAlign: "center", padding: "32px 0" }}>
          موردی برای بازبینی وجود ندارد
        </p>
      )}
      {missions.map((m) => (
        <div key={m.id} style={{ ...S.historyItem, borderRadius: "12px", marginBottom: "10px", background: isDarkMode ? "#1e293b" : "#f8fafc", padding: "14px" }}>
          <strong style={{ fontSize: "13px", color: S.headingOnCard, display: "block", marginBottom: "6px" }}>{ANALYSIS_TERMS.axisLabelPrefix} {m.topic_title}</strong>
          <div style={{ fontSize: "11px", color: S.subMuted, marginBottom: "10px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span>تحلیل‌گر: {m.analyst_realname}</span>
            <span>| {MISSION_STATUS[m.status] || m.status}</span>
            {!m.mentor_id && isManager && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                بدون راهنما
              </span>
            )}
          </div>
          <button type="button" style={{ ...S.sendBtn, width: "100%", fontSize: "12px", background: "#8b5cf6" }} onClick={() => navigate(`/analysis/mission/${m.id}`)}>
            <MessageSquare size={14} /> بازبینی و ثبت نظر
          </button>
        </div>
      ))}
    </AnalysisPageShell>
  );
}
