import pool from "../db.js";

function isMissingRelation(err) {
  if (!err) return false;
  return err.code === "42P01" || /does not exist/i.test(String(err.message || ""));
}

function prefsError(fallbackMigrationMsg, err) {
  const missing = isMissingRelation(err);
  const out = new Error(
    missing
      ? fallbackMigrationMsg
      : `خطای پایگاه‌داده: ${err?.message || "نامشخص"}`,
  );
  out.status = missing ? 503 : 500;
  out.cause = err;
  return out;
}

function requireUserId(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    const err = new Error("شناسه کاربر برای ذخیره تنظیمات نامعتبر است");
    err.status = 400;
    throw err;
  }
  return uid;
}

export async function getDashboardLayout(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return { layout: null, updated_at: null };
  try {
    const r = await pool.query(
      `SELECT layout_json, updated_at FROM tbl_command_dashboard_layouts WHERE user_id = $1`,
      [uid],
    );
    if (!r?.rows?.[0]) return { layout: null, updated_at: null };
    return { layout: r.rows[0].layout_json, updated_at: r.rows[0].updated_at };
  } catch (e) {
    console.warn("[command-prefs] getLayout:", e.message);
    if (isMissingRelation(e)) return { layout: null, updated_at: null };
    throw prefsError("خواندن چیدمان ممکن نیست (migration 060 را اجرا کنید)", e);
  }
}

export async function saveDashboardLayout(userId, layout) {
  const uid = requireUserId(userId);
  const payload = layout && typeof layout === "object" ? layout : {};
  try {
    const r = await pool.query(
      `INSERT INTO tbl_command_dashboard_layouts (user_id, layout_json, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
         SET layout_json = EXCLUDED.layout_json, updated_at = CURRENT_TIMESTAMP
       RETURNING layout_json, updated_at`,
      [uid, JSON.stringify(payload)],
    );
    if (!r?.rows?.[0]) {
      const err = new Error("ذخیره چیدمان نتیجه‌ای برنگرداند");
      err.status = 500;
      throw err;
    }
    return { layout: r.rows[0].layout_json, updated_at: r.rows[0].updated_at };
  } catch (e) {
    if (e.status) throw e;
    console.warn("[command-prefs] saveLayout:", e.code || "", e.message);
    throw prefsError("ذخیره چیدمان ممکن نیست (migration 060 را اجرا کنید)", e);
  }
}

export async function logDashboardView(userId, filters = {}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  try {
    const r = await pool.query(
      `INSERT INTO tbl_command_dashboard_views (user_id, filters_json)
       VALUES ($1, $2::jsonb)
       RETURNING id, viewed_at`,
      [uid, JSON.stringify(filters || {})],
    );
    return r?.rows?.[0] || null;
  } catch (e) {
    console.warn("[command-prefs] logView:", e.message);
    return null;
  }
}

export async function listDashboardViews(userId, limit = 20) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];
  try {
    const r = await pool.query(
      `SELECT id, viewed_at, filters_json
       FROM tbl_command_dashboard_views
       WHERE user_id = $1
       ORDER BY viewed_at DESC
       LIMIT $2`,
      [uid, Math.min(100, Math.max(1, Number(limit) || 20))],
    );
    return r?.rows || [];
  } catch (e) {
    console.warn("[command-prefs] listViews:", e.message);
    return [];
  }
}

export async function listAlertAcks(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];
  try {
    const r = await pool.query(
      `SELECT alert_id, acked_at FROM tbl_command_alert_acks WHERE user_id = $1`,
      [uid],
    );
    return (r?.rows || []).map((x) => x.alert_id);
  } catch (e) {
    console.warn("[command-prefs] listAcks:", e.message);
    return [];
  }
}

export async function ackAlert(userId, alertId) {
  const uid = requireUserId(userId);
  const id = String(alertId || "").trim();
  if (!id) {
    const err = new Error("شناسه هشدار الزامی است");
    err.status = 400;
    throw err;
  }
  try {
    const r = await pool.query(
      `INSERT INTO tbl_command_alert_acks (user_id, alert_id, acked_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, alert_id) DO UPDATE SET acked_at = CURRENT_TIMESTAMP
       RETURNING alert_id, acked_at`,
      [uid, id],
    );
    if (!r?.rows?.[0]) {
      const err = new Error("ثبت رسیدگی نتیجه‌ای برنگرداند");
      err.status = 500;
      throw err;
    }
    return r.rows[0];
  } catch (e) {
    if (e.status) throw e;
    console.warn("[command-prefs] ackAlert:", e.code || "", e.message);
    throw prefsError("ثبت رسیدگی ممکن نیست (migration 060 را اجرا کنید)", e);
  }
}

export async function unackAlert(userId, alertId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return { ok: true };
  try {
    await pool.query(
      `DELETE FROM tbl_command_alert_acks WHERE user_id = $1 AND alert_id = $2`,
      [uid, String(alertId)],
    );
  } catch (e) {
    console.warn("[command-prefs] unack:", e.message);
  }
  return { ok: true };
}
