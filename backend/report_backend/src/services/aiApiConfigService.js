import pool from "../db.js";

function sanitizeRow(row) {
  const out = { ...row };
  const sec = out.credential_secret_cipher;
  if (sec != null && String(sec).trim() !== "") {
    out.has_stored_secret = true;
    const s = String(sec).trim();
    out.stored_secret_hint = s.length <= 4 ? "****" : `…${s.slice(-4)}`;
    delete out.credential_secret_cipher;
  }
  return out;
}

export async function listAiConfigs({ usage_key, provider_type } = {}) {
  const params = [];
  let q = `SELECT id, usage_key, sort_order, title_fa, provider_type, model_id, extra_config,
            credential_mode, credential_env_name,
            CASE WHEN credential_secret_cipher IS NOT NULL AND TRIM(credential_secret_cipher) <> '' THEN true ELSE false END AS has_stored_secret,
            CASE WHEN credential_secret_cipher IS NOT NULL AND TRIM(credential_secret_cipher) <> ''
              THEN RIGHT(TRIM(credential_secret_cipher), 4) ELSE NULL END AS stored_secret_hint,
            is_enabled, created_at, updated_at, updated_by
            FROM tbl_ai_api_configs WHERE 1=1`;
  if (usage_key) {
    params.push(usage_key);
    q += ` AND usage_key = $${params.length}`;
  }
  if (provider_type) {
    params.push(provider_type);
    q += ` AND provider_type = $${params.length}`;
  }
  q += ` ORDER BY usage_key ASC, sort_order ASC, id ASC`;
  const r = await pool.query(q, params);
  return r.rows;
}

export async function getAiConfigById(id) {
  const r = await pool.query(`SELECT * FROM tbl_ai_api_configs WHERE id = $1`, [id]);
  if (!r.rows.length) return null;
  return sanitizeRow(r.rows[0]);
}

export async function insertAiConfig(body, userId) {
  const {
    usage_key,
    sort_order = 0,
    title_fa = "",
    provider_type,
    model_id,
    extra_config = {},
    credential_mode = "env_ref",
    credential_env_name = null,
    credential_secret_cipher = null,
    is_enabled = true,
  } = body;
  const r = await pool.query(
    `INSERT INTO tbl_ai_api_configs (
       usage_key, sort_order, title_fa, provider_type, model_id, extra_config,
       credential_mode, credential_env_name, credential_secret_cipher, is_enabled, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      usage_key.trim(),
      parseInt(sort_order, 10) || 0,
      title_fa,
      provider_type.trim(),
      model_id.trim(),
      JSON.stringify(extra_config || {}),
      credential_mode,
      credential_env_name || null,
      credential_secret_cipher || null,
      !!is_enabled,
      userId ?? null,
    ],
  );
  return r.rows[0].id;
}

export async function updateAiConfig(id, body, userId) {
  const r0 = await pool.query(`SELECT * FROM tbl_ai_api_configs WHERE id = $1`, [id]);
  if (!r0.rows.length) return 0;
  const cur = r0.rows[0];
  const next = {
    usage_key: body.usage_key !== undefined ? String(body.usage_key).trim() : cur.usage_key,
    sort_order: body.sort_order !== undefined ? parseInt(body.sort_order, 10) || 0 : cur.sort_order,
    title_fa: body.title_fa !== undefined ? body.title_fa : cur.title_fa,
    provider_type: body.provider_type !== undefined ? String(body.provider_type).trim() : cur.provider_type,
    model_id: body.model_id !== undefined ? String(body.model_id).trim() : cur.model_id,
    extra_config:
      body.extra_config !== undefined ? JSON.stringify(body.extra_config || {}) : JSON.stringify(cur.extra_config || {}),
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
    `UPDATE tbl_ai_api_configs SET
       usage_key = $1, sort_order = $2, title_fa = $3, provider_type = $4, model_id = $5,
       extra_config = $6::jsonb, credential_mode = $7, credential_env_name = $8,
       credential_secret_cipher = $9, is_enabled = $10, updated_at = CURRENT_TIMESTAMP, updated_by = $11
     WHERE id = $12`,
    [
      next.usage_key,
      next.sort_order,
      next.title_fa,
      next.provider_type,
      next.model_id,
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

export async function deleteAiConfig(id) {
  const r = await pool.query(`DELETE FROM tbl_ai_api_configs WHERE id = $1`, [id]);
  return r.rowCount;
}

export async function getRawConfigForTest(id) {
  const r = await pool.query(`SELECT * FROM tbl_ai_api_configs WHERE id = $1`, [id]);
  return r.rows[0] || null;
}
