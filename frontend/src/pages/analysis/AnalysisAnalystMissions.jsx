import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import analysisService from "../../services/analysisService";
import { getCurrentUser, MISSION_STATUS, toPersianDigits } from "../../utils/analysisAuth.js";

export default function AnalysisAnalystMissions() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const user = getCurrentUser();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisService.getAssignments({ analystId: user.id })
      .then((data) => setMissions(data || []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <AnalysisPageShell title="مأموریت‌های تحلیل من" subtitle="مشاهده و انجام تحلیل‌های ارجاع‌شده" backTo="/main">
      {loading && <p style={{ color: S.subMuted, fontSize: "12px" }}>در حال بارگذاری...</p>}
      {!loading && missions.length === 0 && (
        <p style={{ color: S.emptyStateColor, fontSize: "12px", textAlign: "center", padding: "32px 0" }}>
          مأموریت فعالی برای شما ثبت نشده است
        </p>
      )}
      {missions.map((m) => (
        <div key={m.id} style={{ ...S.historyItem, borderRadius: "12px", marginBottom: "10px", background: isDarkMode ? "#1e293b" : "#f8fafc", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
            <strong style={{ fontSize: "13px", color: S.headingOnCard, lineHeight: 1.5 }}>{m.topic_title}</strong>
            <span style={{ fontSize: "10px", color: "#38bdf8", whiteSpace: "nowrap" }}>{MISSION_STATUS[m.status] || m.status}</span>
          </div>
          <div style={{ fontSize: "11px", color: S.subMuted, marginBottom: "10px" }}>
            مهلت: {m.deadline ? toPersianDigits(String(m.deadline)) : "—"} | اولویت: {m.priority === "high" ? "فوری" : m.priority === "medium" ? "متوسط" : "عادی"}
          </div>
          <button
            type="button"
            style={{ ...S.sendBtn, width: "100%", fontSize: "12px" }}
            onClick={() => navigate(`/analysis/mission/${m.id}`)}
          >
            <PenLine size={14} /> {["Assigned", "InProgress", "NeedsRevision"].includes(m.status) ? "انجام تحلیل" : "مشاهده تحلیل"}
          </button>
        </div>
      ))}
    </AnalysisPageShell>
  );
}
