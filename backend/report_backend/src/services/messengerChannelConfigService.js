import pool from "../db.js";
import { KNOWN_MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";

function sanitizeRow(row) {
  const out = { ...row };
  const keys = Array.isArray(out.usage_keys) && out.usage_keys.length
    ? out.usage_keys
    : (out.usage_key ? [out.usage_key] : []);
  out.usage_keys = keys;
  out.usage_key = keys[0] || out.usage_key || "";
  const sec = out.credential_secret_cipher;
  if (sec != null && String(sec).trim() !== "") {
    out.has_stored_secret = true;
    const s = String(sec).trim();
    out.stored_secret_hint = s.length <= 4 ? "****" : `…${s.slice(-4)}`;
    delete out.credential_secret_cipher;
  }
  return out;
}

/** @param {Record<string, unknown>} body @param {string[]} [fallback] */
export function normalizeUsageKeys(body = {}, fallback = []) {
  let keys = [];
  if (Array.isArray(body.usage_keys)) {
    keys = body.usage_keys.map((k) => String(k ?? "").trim()).filter(Boolean);
  } else if (body.usage_key != null && String(body.usage_key).trim()) {
    keys = [String(body.usage_key).trim()];
  } else if (fallback.length) {
    keys = [...fallback];
  }
  return [...new Set(keys)];
}

export async function listChannelConfigs({ usage_key, provider_type, is_enabled } = {}) {
  const params = [];
  let q = `SELECT id, usage_key, usage_keys, sort_order, title_fa, provider_type, destination_kind, extra_config,
            credential_mode, credential_env_name,
            CASE WHEN credential_secret_cipher IS NOT NULL AND TRIM(credential_secret_cipher) <> '' THEN true ELSE false END AS has_stored_secret,
            CASE WHEN credential_secret_cipher IS NOT NULL AND TRIM(credential_secret_cipher) <> ''
              THEN RIGHT(TRIM(credential_secret_cipher), 4) ELSE NULL END AS stored_secret_hint,
            is_enabled, created_at, updated_at, updated_by
            FROM tbl_messenger_channel_configs WHERE 1=1`;
  if (usage_key) {
    params.push(usage_key);
    q += ` AND ($${params.length} = ANY(usage_keys) OR usage_key = $${params.length})`;
  }
  if (provider_type) {
    params.push(provider_type);
    q += ` AND provider_type = $${params.length}`;
  }
  if (is_enabled === true || is_enabled === "true" || is_enabled === "1") {
    q += ` AND is_enabled = true`;
  }
  q += ` ORDER BY sort_order ASC, id ASC`;
  const r = await pool.query(q, params);
  return r.rows.map(sanitizeRow);
}

export async function listDestinationsForUser(usage_key) {
  const uk = String(usage_key || "").trim();
  if (!uk) return [];
  const r = await pool.query(
    `SELECT id, usage_key, usage_keys, sort_order, title_fa, provider_type, destination_kind, extra_config
     FROM tbl_messenger_channel_configs
     WHERE is_enabled = true AND ($1 = ANY(usage_keys) OR usage_key = $1)
     ORDER BY sort_order ASC, id ASC`,
    [uk],
  );
  return r.rows.map((row) => {
    const keys = Array.isArray(row.usage_keys) && row.usage_keys.length
      ? row.usage_keys
      : [row.usage_key];
    return {
      id: row.id,
      usage_key: keys[0] || row.usage_key,
      usage_keys: keys,
      title_fa: row.title_fa,
      provider_type: row.provider_type,
      destination_kind: row.destination_kind,
      bot_username: row.extra_config?.bot_username ?? null,
      bot_public_link: row.extra_config?.bot_public_link ?? null,
    };
  });
}

export async function getChannelConfigById(id, { raw = false } = {}) {
  const r = await pool.query(`SELECT * FROM tbl_messenger_channel_configs WHERE id = $1`, [id]);
  if (!r.rows.length) return null;
  return raw ? r.rows[0] : sanitizeRow(r.rows[0]);
}

export async function insertChannelConfig(body, userId) {
  const extra = { ...(body.extra_config || {}) };
  if (body.chat_id != null && String(body.chat_id).trim()) {
    extra.chat_id = String(body.chat_id).trim();
  }
  const usageKeys = normalizeUsageKeys(body);
  const r = await pool.query(
    `INSERT INTO tbl_messenger_channel_configs (
       usage_key, usage_keys, sort_order, title_fa, provider_type, destination_kind, extra_config,
       credential_mode, credential_env_name, credential_secret_cipher, is_enabled, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      usageKeys[0],
      usageKeys,
      parseInt(body.sort_order, 10) || 0,
      body.title_fa || "",
      String(body.provider_type).trim(),
      body.destination_kind || "channel",
      JSON.stringify(extra),
      body.credential_mode || "env_ref",
      body.credential_env_name || null,
      body.credential_secret_cipher || null,
      body.is_enabled !== false,
      userId ?? null,
    ],
  );
  return r.rows[0].id;
}

export async function updateChannelConfig(id, body, userId) {
  const r0 = await pool.query(`SELECT * FROM tbl_messenger_channel_configs WHERE id = $1`, [id]);
  if (!r0.rows.length) return 0;
  const cur = r0.rows[0];
  const extra = body.extra_config !== undefined
    ? { ...(body.extra_config || {}) }
    : { ...(cur.extra_config || {}) };
  if (body.chat_id != null && String(body.chat_id).trim()) {
    extra.chat_id = String(body.chat_id).trim();
  }
  const curKeys = normalizeUsageKeys(cur, cur.usage_key ? [cur.usage_key] : []);
  const usageKeys = body.usage_keys !== undefined || body.usage_key !== undefined
    ? normalizeUsageKeys(body, curKeys)
    : curKeys;
  const next = {
    usage_key: usageKeys[0] || cur.usage_key,
    usage_keys: usageKeys,
    sort_order: body.sort_order !== undefined ? parseInt(body.sort_order, 10) || 0 : cur.sort_order,
    title_fa: body.title_fa !== undefined ? body.title_fa : cur.title_fa,
    provider_type: body.provider_type !== undefined ? String(body.provider_type).trim() : cur.provider_type,
    destination_kind: body.destination_kind !== undefined ? body.destination_kind : cur.destination_kind,
    extra_config: JSON.stringify(extra),
    credential_mode: body.credential_mode !== undefined ? body.credential_mode : cur.credential_mode,
    credential_env_name:
      body.credential_env_name !== undefined ? body.credential_env_name || null : cur.credential_env_name,
    credential_secret_cipher:
      body.credential_secret_cipher !== undefined
        ? body.credential_secret_cipher || null
        : cur.credential_secret_cipher,
    is_enabled: body.is_enabled !== undefined ? !!body.is_enabled : cur.is_enabled,
  };
  const r = await pool.query(
    `UPDATE tbl_messenger_channel_configs SET
       usage_key = $1, usage_keys = $2, sort_order = $3, title_fa = $4, provider_type = $5, destination_kind = $6,
       extra_config = $7::jsonb, credential_mode = $8, credential_env_name = $9,
       credential_secret_cipher = $10, is_enabled = $11, updated_at = CURRENT_TIMESTAMP, updated_by = $12
     WHERE id = $13`,
    [
      next.usage_key,
      next.usage_keys,
      next.sort_order,
      next.title_fa,
      next.provider_type,
      next.destination_kind,
      next.extra_config,
      next.credential_mode,
      next.credential_env_name,
      next.credential_secret_cipher,
      next.is_enabled,
      userId ?? null,
      id,
    ],
  );
  return r.rowCount;
}

export async function deleteChannelConfig(id) {
  const r = await pool.query(`DELETE FROM tbl_messenger_channel_configs WHERE id = $1`, [id]);
  return r.rowCount;
}

export function resolveBotToken(row) {
  if (!row) throw new Error("کانفیگ کانال یافت نشد");
  if (row.credential_mode === "stored_secret") {
    const sec = String(row.credential_secret_cipher || "").trim();
    if (!sec) throw new Error("توکن ربات در کانفیگ ذخیره نشده است");
    return sec;
  }
  const envName = String(row.credential_env_name || "").trim();
  if (!envName) throw new Error("نام متغیر محیطی توکن تنظیم نشده است");
  const token = process.env[envName];
  if (!token || !String(token).trim()) {
    throw new Error(`متغیر محیطی ${envName} تنظیم نشده است`);
  }
  return String(token).trim();
}

export function resolveChatId(row) {
  const chatId = row?.extra_config?.chat_id;
  if (chatId == null || String(chatId).trim() === "") {
    throw new Error("chat_id در کانفیگ مقصد تنظیم نشده است");
  }
  return String(chatId).trim();
}
