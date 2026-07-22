import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PenLine, MessageSquare, ClipboardList } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getUnitReportFormStyles } from "../../theme/unitReportFormStyles";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import AnalysisWorkflowStepper from "../../components/analysis/AnalysisWorkflowStepper.jsx";
import { MENTOR_REVIEW_HELP } from "../../content/analysisFormHelp.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import analysisService from "../../services/analysisService";
import {
  getCurrentUser,
  parseUserRoles,
  MISSION_STATUS,
  canManageAnalysis,
  toPersianDigits,
} from "../../utils/analysisAuth.js";
import { hasPermission, getSessionRoles } from "../../utils/userRoles.js";
import useAnalysisMenuBadges from "../../hooks/useAnalysisMenuBadges.js";

function MissionCard({ mission, theme, S, isDarkMode, variant, onOpen }) {
  const isReview = variant === "review";
  return (
    <div
      style={{
        ...S.historyItem,
        borderRadius: 12,
        marginBottom: 10,
        background: isDarkMode ? "#1e293b" : "#f8fafc",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: S.headingOnCard, lineHeight: 1.5 }}>
          {ANALYSIS_TERMS.axisLabelPrefix} {mission.topic_title}
        </strong>
        <span style={{ fontSize: 10, color: isReview ? "#8b5cf6" : "#38bdf8", whiteSpace: "nowrap" }}>
          {MISSION_STATUS[mission.status] || mission.status}
        </span>
      </div>
      <div style={{ fontSize: 11, color: S.subMuted, marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {isReview ? (
          <>
            <span>تحلیل‌گر: {mission.analyst_realname || "—"}</span>
            {!mission.mentor_id && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                بدون راهنما
              </span>
            )}
          </>
        ) : (
          <span>
            مهلت: {mission.deadline ? toPersianDigits(String(mission.deadline)) : "—"}
            {" | "}
            اولویت: {mission.priority === "high" ? "فوری" : mission.priority === "medium" ? "متوسط" : "عادی"}
          </span>
        )}
      </div>
      <button
        type="button"
        style={{
          ...S.sendBtn,
          width: "100%",
          fontSize: 12,
          background: isReview ? "#8b5cf6" : undefined,
        }}
        onClick={onOpen}
      >
        {isReview ? (
          <><MessageSquare size={14} /> بازبینی و ثبت نظر</>
        ) : (
          <><PenLine size={14} /> {["Assigned", "InProgress", "NeedsRevision"].includes(mission.status) ? "انجام تحلیل" : "مشاهده تحلیل"}</>
        )}
      </button>
    </div>
  );
}

export default function AnalysisMyMissionsPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useAppTheme();
  const S = getUnitReportFormStyles(isDarkMode);
  const user = getCurrentUser();
  const roles = parseUserRoles(user.role);
  const sessionRoles = getSessionRoles();
  const isManager = canManageAnalysis();
  const isMentor = roles.includes("mentor");
  const canMissions = hasPermission(sessionRoles, "analysis_missions");
  const canReview = hasPermission(sessionRoles, "analysis_review") || isManager;
  const { badges } = useAnalysisMenuBadges();

  const tabs = useMemo(() => {
    const list = [];
    if (canMissions) list.push({ id: "missions", label: "مأموریت‌های من", icon: ClipboardList, badge: badges.my_missions });
    if (canReview) list.push({ id: "review", label: "بازبینی تحلیل‌ها", icon: MessageSquare, badge: badges.review_queue });
    return list;
  }, [canMissions, canReview, badges.my_missions, badges.review_queue]);

  const tabFromUrl = searchParams.get("tab");
  const defaultTab = tabs[0]?.id || "missions";
  const activeTab = tabs.find((t) => t.id === tabFromUrl)?.id || defaultTab;

  const [missions, setMissions] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const setTab = useCallback((next) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab) && tabs[0]) {
      setTab(tabs[0].id);
    }
  }, [activeTab, tabs, setTab]);

  useEffect(() => {
    if (activeTab === "missions" && canMissions) {
      setLoading(true);
      analysisService.getAssignments({ analystId: user.id })
        .then((data) => setMissions(data || []))
        .catch(() => setMissions([]))
        .finally(() => setLoading(false));
      return;
    }
    if (activeTab === "review" && canReview) {
      setLoading(true);
      const params = isManager
        ? { forReview: "true" }
        : isMentor
          ? { mentorId: user.id, forReview: "true" }
          : { mentorId: user.id };
      analysisService.getAssignments(params)
        .then((data) => {
          const list = data || [];
          if (isManager) setReviewItems(list);
          else setReviewItems(list.filter((m) => m.mentor_id === user.id));
        })
        .catch(() => setReviewItems([]))
        .finally(() => setLoading(false));
    }
  }, [activeTab, user.id, canMissions, canReview, isManager, isMentor]);

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
  }), [isDarkMode]);

  const tabBtn = (t) => {
    const Icon = t.icon;
    const selected = activeTab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${selected ? theme.accent : theme.border}`,
          background: selected ? `${theme.accent}18` : theme.card,
          color: selected ? theme.accent : theme.text,
          fontWeight: selected ? 700 : 500,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Icon size={14} />
        {t.label}
        {t.badge > 0 ? (
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#ef4444", color: "#fff" }}>
            {toPersianDigits(t.badge)}
          </span>
        ) : null}
      </button>
    );
  };

  const list = activeTab === "review" ? reviewItems : missions;
  const emptyText = activeTab === "review"
    ? "موردی برای بازبینی وجود ندارد"
    : "مأموریت فعالی برای شما ثبت نشده است";

  return (
    <AnalysisPageShell
      title="مأموریت‌های تحلیل من"
      subtitle={tabs.length > 1 ? "مأموریت‌های ارجاع‌شده و بازبینی تحلیل‌ها" : canReview ? "بازبینی و ثبت نظر" : "مشاهده و انجام تحلیل‌های ارجاع‌شده"}
      backTo="/main"
      onHelp={activeTab === "review" ? MENTOR_REVIEW_HELP : undefined}
      helpTitle={activeTab === "review" ? "راهنمای بازبینی" : undefined}
    >
      {activeTab === "review" && <AnalysisWorkflowStepper currentStep="review" compact />}

      {tabs.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {tabs.map(tabBtn)}
        </div>
      )}

      {loading && <p style={{ color: S.subMuted, fontSize: 12 }}>در حال بارگذاری...</p>}
      {!loading && list.length === 0 && (
        <p style={{ color: S.emptyStateColor, fontSize: 12, textAlign: "center", padding: "32px 0" }}>{emptyText}</p>
      )}
      {!loading && list.map((m) => (
        <MissionCard
          key={m.id}
          mission={m}
          theme={theme}
          S={S}
          isDarkMode={isDarkMode}
          variant={activeTab}
          onOpen={() => navigate(`/analysis/mission/${m.id}`)}
        />
      ))}
    </AnalysisPageShell>
  );
}
