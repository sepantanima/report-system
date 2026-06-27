import {
  NEWS_PRIORITIES,
  NEWS_QUALITY,
  NEWS_REVIEW_STATES,
  NEWS_WORKFLOW_STATES,
  DUPLICATE_STATUSES,
  normalizeDbEnum,
} from "../constants/newsMonitorMeta.js";

const VERDICT_STATES = new Set(["approved", "rejected", "rumor"]);

function resolveDuplicateStatus(item) {
  const raw = normalizeDbEnum(item?.duplicate_status);
  if (raw && raw !== "none") return raw;
  if (item?.is_duplicate) return "suspicious";
  return raw || "none";
}

/**
 * @param {object} item
 * @returns {{ primaryLabel: string, primaryColor: string, secondaryTags: Array<{ label: string, color: string }> }}
 */
export function getNewsDisplayStatus(item) {
  const ws = normalizeDbEnum(item.workflow_status, "pending");
  const rs = normalizeDbEnum(item.review_state, "pending");
  const dup = resolveDuplicateStatus(item);
  const priority = NEWS_PRIORITIES[Number(item.priority || 3)] || NEWS_PRIORITIES[3];
  const quality = NEWS_QUALITY[Number(item.quality || 3)] || NEWS_QUALITY[3];

  let primaryLabel;
  let primaryColor;

  if (ws === "new") {
    primaryLabel = NEWS_WORKFLOW_STATES.new.label;
    primaryColor = NEWS_WORKFLOW_STATES.new.color;
  } else if (ws === "finalized") {
    primaryLabel = NEWS_WORKFLOW_STATES.finalized.label;
    primaryColor = NEWS_WORKFLOW_STATES.finalized.color;
  } else if (ws === "reviewed" && VERDICT_STATES.has(rs)) {
    const verdict = NEWS_REVIEW_STATES[rs];
    primaryLabel = `حکم دبیر: ${verdict.label} — صف سردبیر`;
    primaryColor = verdict.color;
  } else if (ws === "pending" && rs === "pending") {
    primaryLabel = "صف دبیر — بدون حکم";
    primaryColor = NEWS_WORKFLOW_STATES.pending.color;
  } else if (ws === "pending" && VERDICT_STATES.has(rs)) {
    const verdict = NEWS_REVIEW_STATES[rs];
    primaryLabel = `صف دبیر — حکم: ${verdict.label}`;
    primaryColor = verdict.color;
  } else if (ws === "reviewed") {
    primaryLabel = NEWS_WORKFLOW_STATES.reviewed.label;
    primaryColor = NEWS_WORKFLOW_STATES.reviewed.color;
  } else {
    primaryLabel = NEWS_WORKFLOW_STATES[ws]?.label || ws;
    primaryColor = NEWS_WORKFLOW_STATES[ws]?.color || "#64748b";
  }

  const secondaryTags = [
    { label: `اهمیت: ${priority.label}`, color: priority.color },
    { label: `کیفیت: ${quality.label}`, color: quality.color },
  ];

  if (dup !== "none") {
    const dupMeta = DUPLICATE_STATUSES[dup] || DUPLICATE_STATUSES.suspicious;
    secondaryTags.push({ label: dupMeta.label, color: dupMeta.color });
  }

  return { primaryLabel, primaryColor, secondaryTags };
}
