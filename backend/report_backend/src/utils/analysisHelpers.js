import moment from "jalali-moment";
import pool from "../db.js";
import { parseUserRoles, hasAnyRole } from "../middleware/requireRole.js";
import {
  TOPIC_FIELD_LIMITS,
  MISSION_FIELD_LIMITS,
  ANALYSIS_FIELD_LIMITS,
  plainTextLength,
  stripHtml,
} from "../constants/analysisFieldLimits.js";

export { TOPIC_FIELD_LIMITS, MISSION_FIELD_LIMITS, ANALYSIS_FIELD_LIMITS, plainTextLength, stripHtml };

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
