import pool from "../db.js";

export async function getFormActionByFormAndAction(formName, actionName) {
  const r = await pool.query(
    `SELECT id, form_name, action_name, button_label_fa, is_enabled, prompt_key, ai_config_id, usage_key,
            source_fields, assembly_strategy, created_at, updated_at
     FROM tbl_ai_form_actions
     WHERE form_name = $1 AND action_name = $2 AND is_enabled = true`,
    [formName, actionName],
  );
  return r.rows[0] || null;
}

export async function listFormActions({ form_name } = {}) {
  const params = [];
  let q = `SELECT id, form_name, action_name, button_label_fa, is_enabled, prompt_key, ai_config_id, usage_key,
                  source_fields, assembly_strategy, created_at, updated_at
           FROM tbl_ai_form_actions WHERE 1=1`;
  if (form_name) {
    params.push(form_name);
    q += ` AND form_name = $${params.length}`;
  }
  q += ` ORDER BY form_name ASC, action_name ASC`;
  const r = await pool.query(q, params);
  return r.rows;
}

export async function getFormActionById(id) {
  const r = await pool.query(`SELECT * FROM tbl_ai_form_actions WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

export async function insertFormAction(body, userId) {
  const {
    form_name,
    action_name,
    button_label_fa = "",
    is_enabled = true,
    prompt_key = "",
    ai_config_id = null,
    usage_key = null,
    source_fields = [],
    assembly_strategy = "unified_v1",
  } = body;
  const r = await pool.query(
    `INSERT INTO tbl_ai_form_actions (
       form_name, action_name, button_label_fa, is_enabled, prompt_key, ai_config_id, usage_key, source_fields, assembly_strategy, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
     RETURNING id`,
    [
      String(form_name).trim(),
      String(action_name).trim(),
      String(button_label_fa),
      !!is_enabled,
      String(prompt_key || ""),
      ai_config_id != null && ai_config_id !== "" ? parseInt(ai_config_id, 10) : null,
      usage_key != null && String(usage_key).trim() ? String(usage_key).trim() : null,
      JSON.stringify(Array.isArray(source_fields) ? source_fields : []),
      String(assembly_strategy).trim(),
      userId ?? null,
    ],
  );
  return r.rows[0].id;
}

export async function updateFormAction(id, body, userId) {
  const cur = await getFormActionById(id);
  if (!cur) return 0;
  const next = {
    form_name: body.form_name !== undefined ? String(body.form_name).trim() : cur.form_name,
    action_name: body.action_name !== undefined ? String(body.action_name).trim() : cur.action_name,
    button_label_fa: body.button_label_fa !== undefined ? String(body.button_label_fa) : cur.button_label_fa,
    is_enabled: body.is_enabled !== undefined ? !!body.is_enabled : cur.is_enabled,
    prompt_key: body.prompt_key !== undefined ? String(body.prompt_key || "") : cur.prompt_key,
    ai_config_id:
      body.ai_config_id !== undefined
        ? body.ai_config_id != null && body.ai_config_id !== ""
          ? parseInt(body.ai_config_id, 10)
          : null
        : cur.ai_config_id,
    usage_key:
      body.usage_key !== undefined
        ? body.usage_key != null && String(body.usage_key).trim()
          ? String(body.usage_key).trim()
          : null
        : cur.usage_key,
    source_fields:
      body.source_fields !== undefined
        ? JSON.stringify(Array.isArray(body.source_fields) ? body.source_fields : [])
        : JSON.stringify(cur.source_fields || []),
    assembly_strategy:
      body.assembly_strategy !== undefined ? String(body.assembly_strategy).trim() : cur.assembly_strategy,
  };
  await pool.query(
    `UPDATE tbl_ai_form_actions SET
       form_name = $1, action_name = $2, button_label_fa = $3, is_enabled = $4, prompt_key = $5,
       ai_config_id = $6, usage_key = $7, source_fields = $8::jsonb, assembly_strategy = $9,
       updated_at = CURRENT_TIMESTAMP, updated_by = $10
     WHERE id = $11`,
    [
      next.form_name,
      next.action_name,
      next.button_label_fa,
      next.is_enabled,
      next.prompt_key,
      next.ai_config_id,
      next.usage_key,
      next.source_fields,
      next.assembly_strategy,
      userId ?? null,
      id,
    ],
  );
  return 1;
}

export async function deleteFormAction(id) {
  const r = await pool.query(`DELETE FROM tbl_ai_form_actions WHERE id = $1`, [id]);
  return r.rowCount || 0;
}

export async function listActiveActionsForForm(formName) {
  const r = await pool.query(
    `SELECT action_name, button_label_fa FROM tbl_ai_form_actions
     WHERE form_name = $1 AND is_enabled = true ORDER BY action_name ASC`,
    [formName],
  );
  return r.rows;
}
