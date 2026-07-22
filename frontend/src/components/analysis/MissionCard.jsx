import React from "react";
import { User, Clock, AlertTriangle } from "lucide-react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  PRIORITY_META, MISSION_STATUS_META, getDeadlineMeta, formatPersianDateShort,
} from "../../utils/analysisMonitorUtils.js";

export default function MissionCard({ mission, theme, onOpen, actionLabel = ANALYSIS_TERMS.missionManageDetailTitle }) {
  const priority = PRIORITY_META[mission.priority] || PRIORITY_META.medium;
  const status = MISSION_STATUS_META[mission.status] || { label: mission.status, color: "#94a3b8" };
  const deadline = getDeadlineMeta(mission.deadline);
  const isDelayed = mission.deadline && new Date(mission.deadline) < new Date() && !["FinalApproved", "Archived"].includes(mission.status);

  return (
    <div className="v3-report-card" style={{ background: theme.card, border: `1px solid ${isDelayed ? "#ef444444" : theme.border}` }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: priority.color }} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10, borderBottom: `1px solid ${theme.border}`, paddingBottom: 8 }}>
        <strong style={{ fontSize: 14, lineHeight: 1.5 }}>
          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.65, marginLeft: 6 }}>{ANALYSIS_TERMS.axisLabelPrefix}</span>
          {mission.topic_title}
        </strong>
        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: `${status.color}22`, color: status.color, whiteSpace: "nowrap" }}>{status.label}</span>
      </div>

      <p className="page-scalable-text-sm" style={{ opacity: 0.75, margin: "0 0 10px", lineHeight: 1.6 }}>
        {mission.topic_desc?.slice(0, 120)}{(mission.topic_desc?.length > 120 ? "..." : "")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, fontSize: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
          <User size={10} /> {mission.analyst_realname || "—"}
        </span>
        {mission.mentor_name && (
          <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>راهنما: {mission.mentor_name}</span>
        )}
        <span className="v3-mission-list-row-deadline-priority" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: `${deadline.color}18`, color: deadline.color }}>
          <Clock size={10} /> {deadline.label}
          <span style={{ opacity: 0.45 }}>·</span>
          <span style={{ color: priority.color }}>{priority.label}</span>
        </span>
        {isDelayed && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "#ef444422", color: "#ef4444" }}>
            <AlertTriangle size={10} /> تأخیر
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.65, marginBottom: 10 }}>
        <span>کد: {mission.topic_code || "—"}</span>
        <span>{formatPersianDateShort(mission.created_at)}</span>
      </div>

      <button type="button" onClick={onOpen} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", fontWeight: "bold", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
        {actionLabel}
      </button>
    </div>
  );
}
