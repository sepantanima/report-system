/**
 * ثبت و خواندن حضور کاربر (last_activity)
 */
import pool from "../db.js";

const touchCooldown = new Map();
const TOUCH_MIN_MS = 60_000;
const ONLINE_WINDOW_MIN = 15;

export function touchUserActivity(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return;

  const now = Date.now();
  const last = touchCooldown.get(id) || 0;
  if (now - last < TOUCH_MIN_MS) return;
  touchCooldown.set(id, now);

  pool
    .query(`UPDATE tbl_users SET last_activity = NOW() WHERE id = $1`, [id])
    .catch((e) => console.warn("[presence]", e.message));
}

export async function countOnlineUsers(minutes = ONLINE_WINDOW_MIN) {
  try {
    const mins = Math.max(1, Number(minutes) || ONLINE_WINDOW_MIN);
    const r = await pool.query(
      `SELECT COUNT(*)::int AS c FROM tbl_users
       WHERE active IS NOT FALSE
         AND last_activity IS NOT NULL
         AND last_activity >= NOW() - ($1::int * INTERVAL '1 minute')`,
      [mins],
    );
    return Number(r.rows[0]?.c ?? 0);
  } catch (e) {
    console.warn("[presence]", e.message);
    return null;
  }
}

export async function listOnlineUserIds(minutes = ONLINE_WINDOW_MIN) {
  try {
    const mins = Math.max(1, Number(minutes) || ONLINE_WINDOW_MIN);
    const r = await pool.query(
      `SELECT id FROM tbl_users
       WHERE active IS NOT FALSE
         AND last_activity IS NOT NULL
         AND last_activity >= NOW() - ($1::int * INTERVAL '1 minute')`,
      [mins],
    );
    return new Set(r.rows.map((x) => Number(x.id)));
  } catch (e) {
    console.warn("[presence]", e.message);
    return new Set();
  }
}
