import React from "react";
import { User, Clock, AlertTriangle, ChevronLeft } from "lucide-react";
import {
  PRIORITY_META,
  MISSION_STATUS_META,
  getDeadlineMeta,
  formatPersianDateShort,
} from "../../utils/analysisMonitorUtils.js";

export default function MissionListRow({ mission, theme, onOpen, compact = false }) {
  const priority = PRIORITY_META[mission.priority] || PRIORITY_META.medium;
  const status = MISSION_STATUS_META[mission.status] || { label: mission.status, color: "#94a3b8" };
  const deadline = getDeadlineMeta(mission.deadline);
  const isDelayed = mission.deadline && new Date(mission.deadline) < new Date()
    && !["FinalApproved", "Archived", "Cancelled"].includes(mission.status);

  return (
    <button
      type="button"
      className="v3-mission-list-row"
      style={{
        background: theme.card,
        border: `1px solid ${isDelayed ? "rgba(239,68,68,0.35)" : theme.border}`,
        color: theme.text,
      }}
      onClick={onOpen}
    >
      <div className="v3-mission-list-row-accent" style={{ background: priority.color }} />
      <div className="v3-mission-list-row-body">
        <div className="v3-mission-list-row-top">
          <span className="v3-mission-list-row-analyst">
            <User size={13} />
            {mission.analyst_realname || mission.analyst_name || "—"}
          </span>
          <span className="v3-mission-list-row-status" style={{ color: status.color, background: `${status.color}18` }}>
            {status.label}
          </span>
        </div>
        <div className="v3-mission-list-row-sub">
          {mission.mentor_name && <span>راهنما: {mission.mentor_name}</span>}
          <span className="v3-mission-list-row-deadline-priority" style={{ color: deadline.color }}>
            <Clock size={11} />
            {deadline.label}
            <span style={{ opacity: 0.45, margin: "0 2px" }}>·</span>
            <span style={{ color: priority.color }}>{priority.label}</span>
          </span>
          {isDelayed && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#ef4444" }}>
              <AlertTriangle size={11} /> تأخیر
            </span>
          )}
          {!compact && mission.topic_code && <span>کد محور: {mission.topic_code}</span>}
          <span>{formatPersianDateShort(mission.created_at)}</span>
        </div>
      </div>
      <ChevronLeft size={16} className="v3-mission-list-row-chevron" aria-hidden />
    </button>
  );
}
