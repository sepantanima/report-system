import pool from "../db.js";
import { appendInstanceNewsFilter } from "./instanceScopeService.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  buildDailyQuota,
  DEFAULT_DAILY_SUBMISSION_LIMIT,
  formatQuotaErrorMessage,
  quotaExceeded,
} from "../utils/dailyQuotaUtils.js";
import { clampThreshold, VALID_DUPLICATE_SCOPES } from "../utils/duplicateCheckScope.js";
import { getPublicDuplicateSettings } from "./duplicateCheckService.js";

export const DEFAULT_SUMMARIZE_CHAR_THRESHOLD = 300;
export const MIN_SUMMARIZE_CHAR_THRESHOLD = 50;
export const MAX_SUMMARIZE_CHAR_THRESHOLD = 5000;

let settingsTableExists = null;

async function checkSettingsTable() {
  if (settingsTableExists !== null) return settingsTableExists;
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_news_entry_settings' LIMIT 1`,
    );
    settingsTableExists = r.rows.length > 0;
  } catch {
    settingsTableExists = false;
  }
  return settingsTableExists;
}

export function isSubjectToNewsDailyLimit(user) {
  const roles = parseUserRoles(user?.role);
  if (roles.includes("admin")) return false;
  return roles.includes("news_monitor");
}

export function clampSummarizeThreshold(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_SUMMARIZE_CHAR_THRESHOLD;
  return Math.min(MAX_SUMMARIZE_CHAR_THRESHOLD, Math.max(MIN_SUMMARIZE_CHAR_THRESHOLD, n));
}

function mapNewsSettingsRow(row) {
  const scope = VALID_DUPLICATE_SCOPES.has(row?.duplicate_check_scope)
    ? row.duplicate_check_scope
    : "today";
  return {
    max_submissions_per_day: row?.max_submissions_per_day ?? DEFAULT_DAILY_SUBMISSION_LIMIT,
    duplicate_check_enabled: row?.duplicate_check_enabled !== false,
    duplicate_check_scope: scope,
    duplicate_similarity_threshold: clampThreshold(row?.duplicate_similarity_threshold ?? 70),
    summarize_char_threshold: clampSummarizeThreshold(
      row?.summarize_char_threshold ?? DEFAULT_SUMMARIZE_CHAR_THRESHOLD,
    ),
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}

export async function getNewsEntrySettings() {
  if (!(await checkSettingsTable())) {
    return mapNewsSettingsRow(null);
  }
  const r = await pool.query(`SELECT * FROM tbl_news_entry_settings WHERE id = 1`);
  return mapNewsSettingsRow(r.rows[0]);
}

export async function getNewsEntryPublicSettings() {
  const s = await getNewsEntrySettings();
  return {
    ...getPublicDuplicateSettings(s),
    summarize_char_threshold: s.summarize_char_threshold,
  };
}

export async function updateNewsEntrySettings(body, userId) {
  if (!(await checkSettingsTable())) {
    throw new Error("جدول تنظیمات ورود خبر وجود ندارد — مایگریشن 031 را اجرا کنید");
  }

  const current = await getNewsEntrySettings();
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

  let summarizeThreshold = current.summarize_char_threshold;
  if (body?.summarize_char_threshold !== undefined) {
    const parsed = parseInt(body.summarize_char_threshold, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error("آستانه خلاصه‌سازی باید عدد باشد");
    }
    if (parsed < MIN_SUMMARIZE_CHAR_THRESHOLD || parsed > MAX_SUMMARIZE_CHAR_THRESHOLD) {
      throw new Error(
        `آستانه خلاصه‌سازی باید بین ${MIN_SUMMARIZE_CHAR_THRESHOLD} تا ${MAX_SUMMARIZE_CHAR_THRESHOLD} باشد`,
      );
    }
    summarizeThreshold = parsed;
  }

  await pool.query(
    `UPDATE tbl_news_entry_settings
     SET max_submissions_per_day = $1,
         duplicate_check_enabled = $2,
         duplicate_check_scope = $3,
         duplicate_similarity_threshold = $4,
         summarize_char_threshold = $5,
         updated_by = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [limit, dupEnabled, dupScope, dupThreshold, summarizeThreshold, userId ?? null],
  );
  return getNewsEntrySettings();
}

export async function countMonitorSubmissions(observerId, jalaliDate) {
  let where = ` WHERE observer_id = $1 AND relay_date_jalali = $2
       AND workflow_status IN ('pending', 'reviewed', 'finalized')
       AND COALESCE(is_deleted, false) = false`;
  const params = [observerId, jalaliDate];
  ({ where, params } = appendInstanceNewsFilter(where, params, "tbl_news"));
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_news${where}`,
    params,
  );
  return r.rows[0]?.cnt ?? 0;
}

export async function getNewsDailyQuotaForUser(user, jalaliDate) {
  const settings = await getNewsEntrySettings();
  const limit = settings.max_submissions_per_day;
  const subject = isSubjectToNewsDailyLimit(user);
  const used = subject ? await countMonitorSubmissions(user.id, jalaliDate) : 0;
  return {
    ...buildDailyQuota({ limit: subject ? limit : 0, used }),
    subject_to_limit: subject,
    date: jalaliDate,
  };
}

export async function assertNewsSubmissionAllowed(user, jalaliDate) {
  if (!isSubjectToNewsDailyLimit(user)) return;
  const settings = await getNewsEntrySettings();
  const limit = settings.max_submissions_per_day;
  if (limit === 0) return;
  const used = await countMonitorSubmissions(user.id, jalaliDate);
  const quota = buildDailyQuota({ limit, used });
  if (quotaExceeded(quota)) {
    throw new Error(formatQuotaErrorMessage(limit));
  }
}
