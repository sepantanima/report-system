import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  buildDailyQuota,
  DEFAULT_DAILY_SUBMISSION_LIMIT,
  formatQuotaErrorMessage,
  quotaExceeded,
} from "../utils/dailyQuotaUtils.js";

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

export async function getNewsEntrySettings() {
  if (!(await checkSettingsTable())) {
    return { max_submissions_per_day: DEFAULT_DAILY_SUBMISSION_LIMIT };
  }
  const r = await pool.query(`SELECT * FROM tbl_news_entry_settings WHERE id = 1`);
  const row = r.rows[0];
  return {
    max_submissions_per_day: row?.max_submissions_per_day ?? DEFAULT_DAILY_SUBMISSION_LIMIT,
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}

export async function updateNewsEntrySettings(body, userId) {
  if (!(await checkSettingsTable())) {
    throw new Error("جدول تنظیمات ورود خبر وجود ندارد — مایگریشن 031 را اجرا کنید");
  }
  const raw = body?.max_submissions_per_day;
  if (raw === undefined) return getNewsEntrySettings();
  const limit = parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error("حداکثر ثبت روزانه باید عدد صفر یا بزرگ‌تر باشد (۰ = بدون محدودیت)");
  }
  await pool.query(
    `UPDATE tbl_news_entry_settings
     SET max_submissions_per_day = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [limit, userId ?? null],
  );
  return getNewsEntrySettings();
}

export async function countMonitorSubmissions(observerId, jalaliDate) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_news
     WHERE observer_id = $1 AND relay_date_jalali = $2
       AND workflow_status IN ('pending', 'reviewed', 'finalized')
       AND COALESCE(is_deleted, false) = false`,
    [observerId, jalaliDate],
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
