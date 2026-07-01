import pool from "../db.js";
import { DEFAULT_MESSAGE_SETTINGS } from "../constants/messageFieldLimits.js";

let tableExists = null;

async function checkTable() {
  if (tableExists !== null) return tableExists;
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_message_settings' LIMIT 1`,
    );
    tableExists = r.rows.length > 0;
  } catch {
    tableExists = false;
  }
  return tableExists;
}

export async function getMessageSettings() {
  if (!(await checkTable())) return { ...DEFAULT_MESSAGE_SETTINGS };
  const r = await pool.query(`SELECT * FROM tbl_message_settings WHERE id = 1`);
  const row = r.rows[0];
  return {
    max_direct_per_day: row?.max_direct_per_day ?? DEFAULT_MESSAGE_SETTINGS.max_direct_per_day,
    max_direct_per_hour: row?.max_direct_per_hour ?? DEFAULT_MESSAGE_SETTINGS.max_direct_per_hour,
    max_announcements_per_day: row?.max_announcements_per_day ?? DEFAULT_MESSAGE_SETTINGS.max_announcements_per_day,
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}

export async function updateMessageSettings(body, userId) {
  if (!(await checkTable())) {
    throw new Error("جدول تنظیمات پیام وجود ندارد — مایگریشن 032 را اجرا کنید");
  }
  const fields = ["max_direct_per_day", "max_direct_per_hour", "max_announcements_per_day"];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const val = parseInt(body[f], 10);
      if (!Number.isFinite(val) || val < 0) {
        throw new Error("مقادیر سقف باید عدد صفر یا بزرگ‌تر باشند (۰ = بدون محدودیت)");
      }
      params.push(val);
      sets.push(`${f} = $${params.length}`);
    }
  }
  if (!sets.length) return getMessageSettings();
  params.push(userId ?? null);
  sets.push(`updated_by = $${params.length}`);
  sets.push("updated_at = CURRENT_TIMESTAMP");
  await pool.query(`UPDATE tbl_message_settings SET ${sets.join(", ")} WHERE id = 1`, params);
  return getMessageSettings();
}

export async function countDirectMessagesSince(userId, since) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_messages
     WHERE sender_id = $1 AND kind = 'direct' AND created_at >= $2`,
    [userId, since],
  );
  return r.rows[0]?.cnt ?? 0;
}

export async function assertDirectMessageAllowed(userId) {
  const settings = await getMessageSettings();
  const now = new Date();
  if (settings.max_direct_per_hour > 0) {
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourCount = await countDirectMessagesSince(userId, hourAgo);
    if (hourCount >= settings.max_direct_per_hour) {
      throw new Error(`سقف پیام مستقیم ساعتی (${settings.max_direct_per_hour} مورد) تکمیل شده است`);
    }
  }
  if (settings.max_direct_per_day > 0) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayCount = await countDirectMessagesSince(userId, dayStart);
    if (dayCount >= settings.max_direct_per_day) {
      throw new Error(`سقف پیام مستقیم روزانه (${settings.max_direct_per_day} مورد) تکمیل شده است`);
    }
  }
}

export async function assertAnnouncementAllowed(userId) {
  const settings = await getMessageSettings();
  if (settings.max_announcements_per_day <= 0) return;
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_messages
     WHERE sender_id = $1 AND kind IN ('announcement', 'entity') AND created_at >= $2`,
    [userId, dayStart],
  );
  const count = r.rows[0]?.cnt ?? 0;
  if (count >= settings.max_announcements_per_day) {
    throw new Error(`سقف ابلاغ روزانه (${settings.max_announcements_per_day} مورد) تکمیل شده است`);
  }
}
