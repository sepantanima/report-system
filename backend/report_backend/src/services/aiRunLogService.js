import pool from "../db.js";
import { parseStoredLlmErrorMessage } from "../utils/aiErrorDiagnostics.js";

const MAX_REQ = 120_000;
const MAX_RES = 120_000;
const LIST_ERROR_PREVIEW = 280;

function trunc(s, max) {
  const t = s == null ? "" : String(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n...[truncated]`;
}

function enrichLogRow(row, { fullError = false } = {}) {
  const out = { ...row };
  if (row.error_message && (row.status === "llm_error" || String(row.error_message).includes("attempts:"))) {
    const parsed = parseStoredLlmErrorMessage(row.error_message);
    out.error_summary = parsed.summary;
    out.error_attempts = parsed.attempts;
    out.error_diagnostic = parsed.diagnostic;
  } else if (row.error_message) {
    out.error_summary = String(row.error_message).slice(0, LIST_ERROR_PREVIEW);
  }
  if (!fullError && out.error_message && out.error_message.length > LIST_ERROR_PREVIEW) {
    out.error_message = `${String(out.error_message).slice(0, LIST_ERROR_PREVIEW)}…`;
  }
  return out;
}

export async function insertAiRunLog(row) {
  const r = await pool.query(
    `INSERT INTO tbl_ai_run_logs (
       user_id, form_name, action_name, prompt_key, ai_config_id, usage_key_used,
       request_text, response_text, status, error_message
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
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
  return r.rows[0]?.id ?? null;
}

export async function listAiRunLogs(filters = {}) {
  const params = [];
  let q = `
    SELECT l.id, l.user_id, l.form_name, l.action_name, l.prompt_key,
           l.ai_config_id, l.usage_key_used, l.status, l.error_message, l.created_at,
           u.username AS user_username, u.name AS user_name
    FROM tbl_ai_run_logs l
    LEFT JOIN tbl_users u ON u.id = l.user_id
    WHERE 1=1`;

  if (filters.form_name) {
    params.push(String(filters.form_name).trim());
    q += ` AND l.form_name = $${params.length}`;
  }
  if (filters.action_name) {
    params.push(String(filters.action_name).trim());
    q += ` AND l.action_name = $${params.length}`;
  }
  if (filters.status) {
    params.push(String(filters.status).trim());
    q += ` AND l.status = $${params.length}`;
  }
  if (filters.usage_key) {
    params.push(String(filters.usage_key).trim());
    q += ` AND l.usage_key_used = $${params.length}`;
  }
  if (filters.ai_config_id != null && filters.ai_config_id !== "") {
    const cid = parseInt(filters.ai_config_id, 10);
    if (Number.isFinite(cid)) {
      params.push(cid);
      q += ` AND l.ai_config_id = $${params.length}`;
    }
  }
  if (filters.from) {
    params.push(filters.from);
    q += ` AND l.created_at >= $${params.length}::timestamptz`;
  }
  if (filters.to) {
    params.push(filters.to);
    q += ` AND l.created_at <= $${params.length}::timestamptz`;
  }

  q += ` ORDER BY l.created_at DESC, l.id DESC`;

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);
  params.push(limit);
  q += ` LIMIT $${params.length}`;
  params.push(offset);
  q += ` OFFSET $${params.length}`;

  const r = await pool.query(q, params);
  return r.rows.map((row) => enrichLogRow(row));
}

export async function getAiRunLogById(id) {
  const r = await pool.query(
    `SELECT l.*, u.username AS user_username, u.name AS user_name
     FROM tbl_ai_run_logs l
     LEFT JOIN tbl_users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [id],
  );
  if (!r.rows.length) return null;
  return enrichLogRow(r.rows[0], { fullError: true });
}
