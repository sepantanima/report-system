import React from "react";
import { ChevronDown, ChevronUp, Plus, Users } from "lucide-react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import MissionListRow from "./MissionListRow.jsx";
import {
  getDeadlineMeta,
  getProposerTopicStatusMeta,
  getTopicAssignmentStats,
  PRIORITY_META,
  toPersianDigits,
} from "../../utils/analysisMonitorUtils.js";

export default function MissionTopicGroup({
  topic,
  missions = [],
  theme,
  expanded,
  onToggle,
  onAssign,
  onOpenMission,
}) {
  const status = topic?.status ? getProposerTopicStatusMeta(topic, false) : null;
  const deadline = getDeadlineMeta(topic?.suggested_deadline);
  const topicPriority = topic?.priority ? PRIORITY_META[topic.priority] : null;
  const stats = topic?.id ? getTopicAssignmentStats(topic) : {
    total: missions.length,
    active: missions.filter((m) => ["Assigned", "InProgress"].includes(m.status)).length,
  };

  return (
    <section
      className="v3-mission-topic-group"
      style={{ border: `1px solid ${theme.border}`, background: theme.card }}
    >
      <div
        role="button"
        tabIndex={0}
        className="v3-mission-topic-group-header"
        style={{ color: theme.text }}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle?.();
          }
        }}
        aria-expanded={expanded}
      >
        <span className="v3-mission-topic-group-toggle" aria-hidden>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
        <div className="v3-mission-topic-group-head-main">
          <span className="v3-mission-topic-group-code" style={{ color: theme.accent || "#38bdf8" }}>
            {topic?.topic_code || "—"}
          </span>
          <strong className="v3-mission-topic-group-title">{topic?.title || "محور نامشخص"}</strong>
        </div>
        <div className="v3-mission-topic-group-head-meta">
          {status && (
            <span className="v3-mission-topic-pill" style={{ background: `${status.color}22`, color: status.color }}>
              {status.label}
            </span>
          )}
          <span className="v3-mission-topic-pill muted">
            <Users size={11} />
            {toPersianDigits(missions.length)} مأموریت
            {stats.active > 0 ? ` · ${toPersianDigits(stats.active)} فعال` : ""}
          </span>
          {(topic?.suggested_deadline || topicPriority) && (
            <span className="v3-mission-topic-pill muted v3-mission-topic-deadline-priority" style={{ color: deadline.color }}>
              {topic?.suggested_deadline && deadline.label}
              {topic?.suggested_deadline && topicPriority && " · "}
              {topicPriority && <span style={{ color: topicPriority.color }}>{topicPriority.label}</span>}
            </span>
          )}
        </div>
        {onAssign && (
          <button
            type="button"
            className="v3-mission-topic-group-assign"
            title={ANALYSIS_TERMS.createMission}
            onClick={(e) => {
              e.stopPropagation();
              onAssign(topic);
            }}
          >
            <Plus size={14} />
            ارجاع
          </button>
        )}
      </div>
      {expanded && (
        <div className="v3-mission-topic-group-body">
          {missions.length === 0 ? (
            <p className="v3-mission-topic-group-empty">مأموریتی در این دسته نیست</p>
          ) : (
            missions.map((m) => (
              <MissionListRow
                key={m.id}
                mission={m}
                theme={theme}
                compact
                onOpen={() => onOpenMission?.(m)}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
