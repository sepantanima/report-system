import React, { useState, useMemo, useEffect } from "react";
import { X, Search, ChevronLeft, Clock, Users } from "lucide-react";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";
import {
  PRIORITY_META,
  getDeadlineMeta,
  formatPersianDateShort,
  toPersianDigits,
  getProposerTopicStatusMeta,
  getTopicAssignmentStats,
  getManagerTopicReferralBadge,
  isTopicNewForAssignment,
  isTopicAssignableForMission,
} from "../../utils/analysisMonitorUtils.js";

function TopicPickCard({ topic, theme, onSelect }) {
  const status = getProposerTopicStatusMeta(topic, false);
  const priority = PRIORITY_META[topic.priority] || PRIORITY_META.medium;
  const deadline = getDeadlineMeta(topic.suggested_deadline);
  const stats = getTopicAssignmentStats(topic);
  const referralBadge = getManagerTopicReferralBadge(topic);
  const isNew = isTopicNewForAssignment(topic);
  const assignable = isTopicAssignableForMission(topic);

  return (
    <button
      type="button"
      className={`v3-topic-pick-card${isNew ? " is-new" : ""}${!assignable ? " is-disabled" : ""}`}
      style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
      onClick={() => assignable && onSelect?.(topic)}
      disabled={!assignable}
    >
      <div className="v3-topic-pick-card-top">
        <div className="v3-topic-pick-card-main">
          <span className="v3-topic-pick-code" style={{ color: theme.accent || "#38bdf8" }}>
            {topic.topic_code}
          </span>
          <strong className="v3-topic-pick-title">{topic.title}</strong>
        </div>
        <ChevronLeft size={18} className="v3-topic-pick-chevron" aria-hidden />
      </div>

      <div className="v3-topic-pick-badges">
        <span
          className="v3-topic-pick-pill"
          style={{ background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}44` }}
        >
          {status.label}
        </span>
        {referralBadge ? (
          <span
            className="v3-topic-pick-pill"
            style={{ background: `${referralBadge.color}22`, color: referralBadge.color, border: `1px solid ${referralBadge.color}44` }}
          >
            {referralBadge.label}
          </span>
        ) : null}
        <span className="v3-topic-pick-pill priority" style={{ background: priority.color, color: "#fff" }}>
          {priority.label}
        </span>
      </div>

      <div className="v3-topic-pick-meta">
        <span className="v3-topic-pick-meta-item" style={{ color: deadline.color }}>
          <Clock size={12} />
          {deadline.label}
        </span>
        {stats.total > 0 ? (
          <span className="v3-topic-pick-meta-item">
            <Users size={12} />
            {toPersianDigits(stats.active)} فعال · {toPersianDigits(stats.done)} تمام
            {stats.cancelled > 0 ? ` · ${toPersianDigits(stats.cancelled)} لغو` : ""}
          </span>
        ) : (
          <span className="v3-topic-pick-meta-item muted">بدون مأموریت</span>
        )}
        {topic.creator_name ? (
          <span className="v3-topic-pick-meta-item muted">{topic.creator_name}</span>
        ) : null}
        <span className="v3-topic-pick-meta-item muted">{formatPersianDateShort(topic.created_at)}</span>
      </div>
    </button>
  );
}

export default function MissionTopicPickerModal({
  open = false,
  topics = [],
  theme,
  initialFilter = "all",
  onClose,
  onSelectTopic,
}) {
  const [viewFilter, setViewFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setViewFilter(initialFilter);
      setSearch("");
    }
  }, [open, initialFilter]);

  const filteredTopics = useMemo(() => {
    let list = topics;
    if (viewFilter === "new") {
      list = list.filter(isTopicNewForAssignment);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.topic_code || "").toLowerCase().includes(q) ||
        (t.creator_name || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const aNew = isTopicNewForAssignment(a) ? 0 : 1;
      const bNew = isTopicNewForAssignment(b) ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return (a.title || "").localeCompare(b.title || "", "fa");
    });
  }, [topics, viewFilter, search]);

  if (!open) return null;

  const border = theme?.border || "#e2e8f0";
  const card = theme?.card || "#fff";
  const text = theme?.text || "#1e293b";

  return (
    <div
      className="v3-modal-overlay v3-topic-picker-overlay"
      onClick={onClose}
    >
      <div
        className="v3-modal-box v3-topic-picker-modal"
        style={{ background: card, border: `1px solid ${border}` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-topic-picker-title"
      >
        <div className="v3-modal-header-new">
          <button
            type="button"
            onClick={onClose}
            className="v3-icon-btn"
            style={{ color: "#f87171", border: "none" }}
            aria-label="بستن"
          >
            <X size={18} />
          </button>
          <span id="mission-topic-picker-title">{ANALYSIS_TERMS.pickTopicForMission}</span>
        </div>

        <div className="v3-topic-picker-toolbar">
          <div className="v3-topic-picker-filters">
            <button
              type="button"
              className={`v3-topic-picker-filter-btn${viewFilter === "all" ? " active" : ""}`}
              onClick={() => setViewFilter("all")}
            >
              {ANALYSIS_TERMS.allAssignableTopics}
            </button>
            <button
              type="button"
              className={`v3-topic-picker-filter-btn${viewFilter === "new" ? " active" : ""}`}
              onClick={() => setViewFilter("new")}
            >
              {ANALYSIS_TERMS.newTopicsOnly}
            </button>
          </div>
          <label className="v3-topic-picker-search" style={{ border: `1px solid ${border}`, color: text }}>
            <Search size={15} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ANALYSIS_TERMS.searchTopicPlaceholder}
              aria-label={ANALYSIS_TERMS.searchTopicPlaceholder}
            />
          </label>
        </div>

        <div className="v3-modal-body v3-topic-picker-body" style={{ color: text }}>
          <p className="v3-topic-picker-count">
            {toPersianDigits(filteredTopics.length)} محور قابل ارجاع
          </p>
          {filteredTopics.length === 0 ? (
            <p className="v3-topic-picker-empty">
              {viewFilter === "new" ? "محور جدیدی (بدون مأموریت) یافت نشد" : "محور قابل ارجاعی یافت نشد"}
            </p>
          ) : (
            <div className="v3-topic-picker-list">
              {filteredTopics.map((topic) => (
                <TopicPickCard
                  key={topic.id}
                  topic={topic}
                  theme={theme}
                  onSelect={onSelectTopic}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
