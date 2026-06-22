import pool from "../db.js";

export async function getPromptByKey(promptKey) {
  const r = await pool.query(
    `SELECT prompt_key, title_fa, description_fa, body, updated_at, updated_by FROM tbl_app_prompts WHERE prompt_key = $1`,
    [promptKey],
  );
  return r.rows[0] || null;
}

/** متن قالب پرامپت — نام پیشنهادی طرح */
export async function getPromptBody(promptKey) {
  const row = await getPromptByKey(promptKey);
  return row?.body != null ? String(row.body) : null;
}

export async function listPrompts(prefix = "") {
  if (prefix) {
    const r = await pool.query(
      `SELECT prompt_key, title_fa, description_fa, LEFT(body, 200) AS body_preview, updated_at, updated_by
       FROM tbl_app_prompts WHERE prompt_key LIKE $1 ORDER BY prompt_key ASC`,
      [`${prefix}%`],
    );
    return r.rows;
  }
  const r = await pool.query(
    `SELECT prompt_key, title_fa, description_fa, LEFT(body, 200) AS body_preview, updated_at, updated_by
     FROM tbl_app_prompts ORDER BY prompt_key ASC`,
  );
  return r.rows;
}

/** فقط وقتی کلید وجود ندارد درج می‌کند؛ در غیر این صورت خطا */
export async function createPrompt(promptKey, { title_fa, description_fa, body }, userId) {
  const existing = await getPromptByKey(promptKey);
  if (existing) {
    const err = new Error("DUPLICATE_PROMPT_KEY");
    err.code = "DUPLICATE_PROMPT_KEY";
    throw err;
  }
  await upsertPrompt(promptKey, { title_fa, description_fa, body }, userId);
}

export async function upsertPrompt(promptKey, { title_fa, description_fa, body }, userId) {
  await pool.query(
    `INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
     ON CONFLICT (prompt_key) DO UPDATE SET
       title_fa = EXCLUDED.title_fa,
       description_fa = EXCLUDED.description_fa,
       body = EXCLUDED.body,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by`,
    [promptKey, title_fa ?? "", description_fa ?? "", body ?? "", userId ?? null],
  );
}
