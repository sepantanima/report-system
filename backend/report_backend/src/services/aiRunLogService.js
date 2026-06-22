import pool from "../db.js";

const MAX_REQ = 120_000;
const MAX_RES = 120_000;

function trunc(s, max) {
  const t = s == null ? "" : String(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n...[truncated]`;
}

export async function insertAiRunLog(row) {
  await pool.query(
    `INSERT INTO tbl_ai_run_logs (
       user_id, form_name, action_name, prompt_key, ai_config_id, usage_key_used,
       request_text, response_text, status, error_message
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      row.user_id ?? null,
      row.form_name,
      row.action_name,
      row.prompt_key ?? null,
      row.ai_config_id ?? null,
      row.usage_key_used ?? null,
      trunc(row.request_text, MAX_REQ),
      trunc(row.response_text, MAX_RES),
      row.status,
      row.error_message != null ? String(row.error_message).slice(0, 4000) : null,
    ],
  );
}
