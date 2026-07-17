import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  buildDailyQuota,
  DEFAULT_DAILY_SUBMISSION_LIMIT,
  formatQuotaErrorMessage,
  quotaExceeded,
} from "../utils/dailyQuotaUtils.js";
import { clampThreshold, VALID_DUPLICATE_SCOPES } from "../utils/duplicateCheckScope.js";
import { getPublicDuplicateSettings } from "./duplicateCheckService.js";

let settingsTableExists = null;

async function checkSettingsTable() {
  if (settingsTableExists !== null) return settingsTableExists;
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_field_report_settings' LIMIT 1`,
    );
    settingsTableExists = r.rows.length > 0;
  } catch {
    settingsTableExists = false;
  }
  return settingsTableExists;
}

export function isSubjectToFieldDailyLimit(user) {
  const roles = parseUserRoles(user?.role);
  if (roles.includes("admin") || roles.includes("Field_admin")) return false;
  return roles.includes("user");
}

function mapFieldReportRow(row) {
  const scope = String(row?.duplicate_check_scope ?? "today").trim();
  return {
    max_submissions_per_day: row?.max_submissions_per_day ?? DEFAULT_DAILY_SUBMISSION_LIMIT,
    duplicate_check_enabled: row?.duplicate_check_enabled !== false,
    duplicate_check_scope: VALID_DUPLICATE_SCOPES.has(scope) ? scope : "today",
    duplicate_similarity_threshold: clampThreshold(row?.duplicate_similarity_threshold ?? 70),
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}

export async function getFieldReportSettings() {
  if (!(await checkSettingsTable())) {
    return mapFieldReportRow(null);
  }
  const r = await pool.query(`SELECT * FROM tbl_field_report_settings WHERE id = 1`);
  return mapFieldReportRow(r.rows[0]);
}

export async function getFieldEntryPublicSettings() {
  const s = await getFieldReportSettings();
  return getPublicDuplicateSettings(s);
}

export async function updateFieldReportSettings(body, userId) {
  if (!(await checkSettingsTable())) {
    throw new Error("جدول تنظیمات گزارش میدانی وجود ندارد — مایگریشن 031 را اجرا کنید");
  }

  const current = await getFieldReportSettings();
  let limit = current.max_submissions_per_day;
  if (body?.max_submissions_per_day !== undefined) {
    const parsed = parseInt(body.max_submissions_per_day, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("حداکثر ثبت روزانه باید عدد صفر یا بزرگ‌تر باشد (۰ = بدون محدودیت)");
    }
    limit = parsed;
  }

  let dupEnabled = current.duplicate_check_enabled;
  if (body?.duplicate_check_enabled !== undefined) {
    dupEnabled = !!body.duplicate_check_enabled;
  }

  let dupScope = current.duplicate_check_scope;
  if (body?.duplicate_check_scope !== undefined) {
    const scope = String(body.duplicate_check_scope).trim();
    if (!VALID_DUPLICATE_SCOPES.has(scope)) {
      throw new Error("بازه بررسی تکراری نامعتبر است");
    }
    dupScope = scope;
  }

  let dupThreshold = current.duplicate_similarity_threshold;
  if (body?.duplicate_similarity_threshold !== undefined) {
    dupThreshold = clampThreshold(body.duplicate_similarity_threshold);
  }

  await pool.query(
    `UPDATE tbl_field_report_settings
     SET max_submissions_per_day = $1,
         duplicate_check_enabled = $2,
         duplicate_check_scope = $3,
         duplicate_similarity_threshold = $4,
         updated_by = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [limit, dupEnabled, dupScope, dupThreshold, userId ?? null],
  );
  return getFieldReportSettings();
}

export async function countFieldUserSubmissions(userId, unitcd, date) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_unit_events
     WHERE sender_id = $1 AND unitcd = $2 AND date = $3
       AND (is_deleted = false OR is_deleted IS NULL)`,
    [String(userId), unitcd || 0, date],
  );
  return r.rows[0]?.cnt ?? 0;
}

export async function getFieldDailyQuotaForUser(user, date) {
  const settings = await getFieldReportSettings();
  const limit = settings.max_submissions_per_day;
  const subject = isSubjectToFieldDailyLimit(user);
  const used = subject
    ? await countFieldUserSubmissions(user.id, user.unitcd, date)
    : 0;
  return {
    ...buildDailyQuota({ limit: subject ? limit : 0, used }),
    subject_to_limit: subject,
    date,
  };
}

export async function assertFieldSubmissionAllowed(user, date) {
  if (!isSubjectToFieldDailyLimit(user)) return;
  const settings = await getFieldReportSettings();
  const limit = settings.max_submissions_per_day;
  if (limit === 0) return;
  const used = await countFieldUserSubmissions(user.id, user.unitcd, date);
  const quota = buildDailyQuota({ limit, used });
  if (quotaExceeded(quota)) {
    throw new Error(formatQuotaErrorMessage(limit));
  }
}
