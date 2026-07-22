import moment from "jalali-moment";
import pool from "../db.js";
import { parseUserRoles, hasAnyRole } from "../middleware/requireRole.js";
import {
  TOPIC_FIELD_LIMITS,
  MISSION_FIELD_LIMITS,
  ANALYSIS_FIELD_LIMITS,
  BRIEF_FIELD_LIMITS,
  plainTextLength,
  stripHtml,
} from "../constants/analysisFieldLimits.js";

export { TOPIC_FIELD_LIMITS, MISSION_FIELD_LIMITS, ANALYSIS_FIELD_LIMITS, BRIEF_FIELD_LIMITS, plainTextLength, stripHtml };

/** Assignment statuses counted as in-progress (aligned with GET /topics assignment_active). */
export const MISSION_ACTIVE_STATUSES = [
  "Assigned", "InProgress", "Submitted", "UnderReview", "NeedsRevision", "Revised",
];
export const MISSION_TERMINAL_STATUSES = ["Cancelled", "Archived"];

export function missionActiveStatusSql(alias) {
  const list = MISSION_ACTIVE_STATUSES.map((s) => `'${s}'`).join(",");
  const col = alias ? `${alias}.status` : "status";
  return `${col} IN (${list})`;
}

export const TOPIC_ASSIGNMENT_AGG_SQL = `
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status NOT IN ('Cancelled','Archived')) as assignment_count,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status NOT IN ('Cancelled','Archived')) as assignment_total,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status IN ('Assigned','InProgress','Submitted','UnderReview','NeedsRevision','Revised')) as assignment_active,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status = 'FinalApproved') as assignment_done,
           (SELECT COUNT(*)::int FROM tbl_analysis_assignments a WHERE a.topic_id = t.id AND a.status IN ('Cancelled','Archived')) as assignment_cancelled`;

export async function generateTopicCode(client = pool) {
  const year = new Date().getFullYear();
  const prefix = `TOP-${year}-`;
  const result = await client.query(
    `SELECT topic_code FROM tbl_analysis_topics WHERE topic_code LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (result.rows[0]?.topic_code) {
    const parts = result.rows[0].topic_code.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function generateBriefCode(client = pool) {
  const year = new Date().getFullYear();
  const prefix = `BRI-${year}-`;
  const result = await client.query(
    `SELECT submission_code FROM tbl_analysis_brief_submissions WHERE submission_code LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (result.rows[0]?.submission_code) {
    const parts = result.rows[0].submission_code.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function logStatusChange(client, { entityType, entityId, oldStatus, newStatus, changedBy, comment }) {
  await client.query(
    `INSERT INTO tbl_analysis_status_history (entity_type, entity_id, old_status, new_status, changed_by, comment)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entityType, entityId, oldStatus, newStatus, changedBy, comment || null]
  );
}

export async function logActivity(client, { userId, action, entityType, entityId, details }) {
  await client.query(
    `INSERT INTO tbl_analysis_activity_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null]
  );
}

export async function getAssignmentAccess(client, assignmentId, userId, userRole) {
  const roles = parseUserRoles(userRole);
  if (roles.includes("admin") || roles.includes("analysis_manager")) return true;

  const res = await client.query(
    `SELECT analyst_id, mentor_id, manager_id FROM tbl_analysis_assignments WHERE id = $1`,
    [assignmentId]
  );
  if (!res.rows[0]) return false;
  const a = res.rows[0];
  if (roles.includes("analyst") && a.analyst_id === userId) return true;
  if (roles.includes("mentor") && a.mentor_id === userId) return true;
  return false;
}

export function toEnDigits(str) {
  if (!str) return "";
  return String(str).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

/** Normalize Jalali or Persian-digit dates to Gregorian YYYY-MM-DD for PostgreSQL DATE columns. */
export function toGregorianDate(input) {
  if (input === null || input === undefined || input === "") return null;
  const cleaned = toEnDigits(String(input).trim());
  if (!cleaned) return null;
  const year = parseInt(cleaned.split(/[-/]/)[0], 10);
  if (Number.isNaN(year)) return null;
  try {
    if (year >= 1900 && year <= 2100) {
      return moment(cleaned, "YYYY-MM-DD").format("YYYY-MM-DD");
    }
    if (year >= 1300 && year <= 1500) {
      return moment.from(cleaned, "fa", "YYYY-MM-DD").format("YYYY-MM-DD");
    }
  } catch {
    return null;
  }
  return null;
}

export function validateTopicPayload(body = {}) {
  const L = TOPIC_FIELD_LIMITS;
  if (body.title !== undefined && String(body.title).length > L.title) {
    return `محور حداکثر ${L.title} کاراکتر باشد`;
  }
  if (body.description !== undefined && plainTextLength(body.description) > L.description) {
    return `شرح محور حداکثر ${L.description} کاراکتر باشد`;
  }
  if (body.domain !== undefined && String(body.domain || "").length > L.domain) {
    return `حوزه حداکثر ${L.domain} کاراکتر باشد`;
  }
  if (body.keywords !== undefined && String(body.keywords || "").length > L.keywords) {
    return `کلیدواژه‌ها حداکثر ${L.keywords} کاراکتر باشد`;
  }
  if (body.importance_reason !== undefined && plainTextLength(body.importance_reason) > L.importance_reason) {
    return `دلیل اهمیت حداکثر ${L.importance_reason} کاراکتر باشد`;
  }
  return null;
}

export function validateVersionPayload(body = {}) {
  const L = MISSION_FIELD_LIMITS;
  if (body.title !== undefined && String(body.title || "").length > L.analysisTitle) {
    return `عنوان تحلیل حداکثر ${L.analysisTitle} کاراکتر باشد`;
  }
  if (body.content !== undefined && plainTextLength(body.content) > L.analysisContent) {
    return `متن تحلیل حداکثر ${L.analysisContent} کاراکتر باشد`;
  }
  if (body.change_note !== undefined && String(body.change_note || "").length > L.changeNote) {
    return `توضیح تغییرات حداکثر ${L.changeNote} کاراکتر باشد`;
  }
  return null;
}

export function validateAssignmentPayload(body = {}) {
  const L = MISSION_FIELD_LIMITS;
  if (body.guidelines !== undefined && plainTextLength(body.guidelines) > L.guidelines) {
    return `دستورالعمل حداکثر ${L.guidelines} کاراکتر باشد`;
  }
  return null;
}

export function validateBriefPayload(body = {}) {
  const L = BRIEF_FIELD_LIMITS;
  const entryMode = body.entry_mode || "self";
  if (!["self", "external", "topic_proposal"].includes(entryMode)) return "نوع ثبت نامعتبر است";

  if (entryMode === "topic_proposal") {
    if (!body.title?.trim()) return "موضوع پیشنهادی الزامی است";
    if (String(body.title).length > TOPIC_FIELD_LIMITS.title) {
      return `موضوع پیشنهادی حداکثر ${TOPIC_FIELD_LIMITS.title} کاراکتر باشد`;
    }
    if (!body.content?.trim()) return "توضیح موضوع الزامی است";
    const descLen = plainTextLength(body.content);
    if (descLen > L.topicProposalDescription) {
      return `توضیح موضوع حداکثر ${L.topicProposalDescription} کاراکتر باشد`;
    }
    if (body.importance_reason !== undefined && plainTextLength(body.importance_reason) > L.importance_reason) {
      return `دلیل اهمیت حداکثر ${L.importance_reason} کاراکتر باشد`;
    }
    return null;
  }

  if (!body.title?.trim()) return "عنوان الزامی است";
  if (String(body.title).length > L.title) return `عنوان حداکثر ${L.title} کاراکتر باشد`;
  if (!body.content?.trim()) return "متن تحلیل الزامی است";
  if (plainTextLength(body.content) > L.content) return `متن تحلیل حداکثر ${L.content} کاراکتر باشد`;
  if (body.tags !== undefined && String(body.tags || "").length > L.tags) {
    return `برچسب حداکثر ${L.tags} کاراکتر باشد`;
  }
  if (body.context_type && !["news", "report", "general", ""].includes(body.context_type)) {
    return "نوع مرجع نامعتبر است";
  }
  if (entryMode === "external") {
    if (!body.attribution_text?.trim()) return "منبع/نویسنده الزامی است";
    if (String(body.attribution_text).length > L.attribution) {
      return `منبع/نویسنده حداکثر ${L.attribution} کاراکتر باشد`;
    }
  }
  if (body.attribution_text !== undefined && String(body.attribution_text || "").length > L.attribution) {
    return `منبع/نویسنده حداکثر ${L.attribution} کاراکتر باشد`;
  }
  if (body.composition_date !== undefined && body.composition_date !== null && body.composition_date !== "") {
    if (!toGregorianDate(body.composition_date)) return "تاریخ نگارش نامعتبر است";
  }
  return null;
}

export function assertDeadlineNotPast(deadlineGregorian) {
  if (!deadlineGregorian) return null;
  const dl = new Date(deadlineGregorian);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dl.setHours(0, 0, 0, 0);
  if (dl < today) return "مهلت پیشنهادی نمی‌تواند قبل از امروز باشد";
  return null;
}

export function computeWeightedScore(criteriaScores) {
  if (!criteriaScores.length) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const row of criteriaScores) {
    const w = parseFloat(row.weight) || 1;
    weightedSum += parseFloat(row.score) * w;
    totalWeight += w;
  }
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}
