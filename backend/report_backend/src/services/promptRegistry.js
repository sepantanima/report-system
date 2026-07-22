import pool from "../db.js";
import {
  PROMPT_FIELD_LIMITS,
  STRATEGY_PROMPT_LIMITS,
  STRATEGY_PROMPT_PREFIX,
  STRATEGY_SYSTEM_PROMPT_KEYS,
  validateLength,
  validatePromptKey,
  validatePromptUpsert,
} from "../constants/promptFieldLimits.js";

function parseReferenceSlots(raw) {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/** نرمال‌سازی و اعتبارسنجی اسلات‌های مرجع متنی */
export function normalizeReferenceSlots(raw) {
  const L = STRATEGY_PROMPT_LIMITS;
  const arr = parseReferenceSlots(raw)
    .slice(0, L.referenceSlotMax)
    .map((slot) => ({
      title: String(slot?.title ?? "").trim().slice(0, L.referenceTitleMax),
      body: String(slot?.body ?? "").trim(),
    }))
    .filter((s) => s.title || s.body);

  if (arr.length > L.referenceSlotMax) {
    return { error: `حداکثر ${L.referenceSlotMax} محتوای مرجع مجاز است`, slots: [] };
  }

  let total = 0;
  for (const s of arr) {
    total += s.title.length + s.body.length;
  }
  if (total > L.referenceTotalChars) {
    return {
      error: `مجموع متن مراجع حداکثر ${L.referenceTotalChars.toLocaleString("fa-IR")} کاراکتر باشد (الان ${total.toLocaleString("fa-IR")})`,
      slots: arr,
    };
  }
  return { error: null, slots: arr, totalChars: total };
}

export function formatReferenceSlotsForPrompt(slots) {
  const list = parseReferenceSlots(slots).filter((s) => String(s?.body || "").trim());
  if (!list.length) return "";
  return list
    .map((s, i) => {
      const title = String(s.title || `مرجع ${i + 1}`).trim();
      return `### ${title}\n${String(s.body).trim()}`;
    })
    .join("\n\n");
}

export function mapPromptRow(row) {
  if (!row) return null;
  return {
    ...row,
    reference_slots: parseReferenceSlots(row.reference_slots),
  };
}

export async function getPromptByKey(promptKey) {
  const r = await pool.query(
    `SELECT prompt_key, title_fa, description_fa, body, reference_slots, updated_at, updated_by
     FROM tbl_app_prompts WHERE prompt_key = $1`,
    [promptKey],
  );
  return mapPromptRow(r.rows[0] || null);
}

/** متن قالب پرامپت — نام پیشنهادی طرح */
export async function getPromptBody(promptKey) {
  const row = await getPromptByKey(promptKey);
  return row?.body != null ? String(row.body) : null;
}

export async function listPrompts(prefix = "") {
  if (prefix) {
    const r = await pool.query(
      `SELECT prompt_key, title_fa, description_fa, LEFT(body, 200) AS body_preview,
              reference_slots, updated_at, updated_by
       FROM tbl_app_prompts WHERE prompt_key LIKE $1 ORDER BY prompt_key ASC`,
      [`${prefix}%`],
    );
    return r.rows.map(mapPromptRow);
  }
  const r = await pool.query(
    `SELECT prompt_key, title_fa, description_fa, LEFT(body, 200) AS body_preview,
            reference_slots, updated_at, updated_by
     FROM tbl_app_prompts ORDER BY prompt_key ASC`,
  );
  return r.rows.map(mapPromptRow);
}

export async function countPromptsByPrefix(prefix) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c FROM tbl_app_prompts WHERE prompt_key LIKE $1`,
    [`${prefix}%`],
  );
  return r.rows[0]?.c ?? 0;
}

export function isSystemStrategyPrompt(promptKey) {
  return STRATEGY_SYSTEM_PROMPT_KEYS.includes(String(promptKey || "").trim());
}

export function buildStrategyPromptKey(slug) {
  const raw = String(slug || "").trim().toLowerCase().replace(/^strategy\./, "");
  const cleaned = raw.replace(/[^a-z0-9._]/g, "_").replace(/_+/g, "_").replace(/^[._]+|[._]+$/g, "");
  if (!cleaned) return null;
  return `${STRATEGY_PROMPT_PREFIX}${cleaned}`.slice(0, 255);
}

export function validateStrategyPromptPayload(body = {}, { isCreate = false } = {}) {
  const upsertErr = isCreate
    ? (() => {
        const b = body.body != null ? String(body.body).trim() : "";
        if (!b) return "متن پرامپت الزامی است";
        return validatePromptUpsert(body);
      })()
    : validatePromptUpsert(body);
  if (upsertErr) return upsertErr;

  const { error } = normalizeReferenceSlots(body.reference_slots);
  if (error) return error;
  return null;
}

/** فقط وقتی کلید وجود ندارد درج می‌کند؛ در غیر این صورت خطا */
export async function createPrompt(promptKey, { title_fa, description_fa, body, reference_slots }, userId) {
  const existing = await getPromptByKey(promptKey);
  if (existing) {
    const err = new Error("DUPLICATE_PROMPT_KEY");
    err.code = "DUPLICATE_PROMPT_KEY";
    throw err;
  }
  await upsertPrompt(promptKey, { title_fa, description_fa, body, reference_slots }, userId);
}

export async function upsertPrompt(promptKey, { title_fa, description_fa, body, reference_slots }, userId) {
  const hasRefs = reference_slots !== undefined;
  let slotsJson = null;
  if (hasRefs) {
    const { error, slots } = normalizeReferenceSlots(reference_slots);
    if (error) {
      const err = new Error(error);
      err.status = 400;
      throw err;
    }
    slotsJson = JSON.stringify(slots);
  }

  if (hasRefs) {
    await pool.query(
      `INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body, reference_slots, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP, $6)
       ON CONFLICT (prompt_key) DO UPDATE SET
         title_fa = EXCLUDED.title_fa,
         description_fa = EXCLUDED.description_fa,
         body = EXCLUDED.body,
         reference_slots = EXCLUDED.reference_slots,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = EXCLUDED.updated_by`,
      [
        promptKey,
        title_fa ?? "",
        description_fa ?? "",
        body ?? "",
        slotsJson,
        userId ?? null,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body, reference_slots, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, '[]'::jsonb, CURRENT_TIMESTAMP, $5)
       ON CONFLICT (prompt_key) DO UPDATE SET
         title_fa = EXCLUDED.title_fa,
         description_fa = EXCLUDED.description_fa,
         body = EXCLUDED.body,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = EXCLUDED.updated_by`,
      [
        promptKey,
        title_fa ?? "",
        description_fa ?? "",
        body ?? "",
        userId ?? null,
      ],
    );
  }
}

export async function deletePrompt(promptKey) {
  const key = String(promptKey || "").trim();
  if (isSystemStrategyPrompt(key)) {
    const err = new Error("پرامپت سیستمی قابل حذف نیست");
    err.status = 403;
    throw err;
  }
  const r = await pool.query(
    `DELETE FROM tbl_app_prompts WHERE prompt_key = $1 RETURNING prompt_key`,
    [key],
  );
  return r.rows[0] || null;
}

export async function createStrategyPrompt(body, userId) {
  const count = await countPromptsByPrefix(STRATEGY_PROMPT_PREFIX);
  if (count >= STRATEGY_PROMPT_LIMITS.maxCount) {
    const err = new Error(`حداکثر ${STRATEGY_PROMPT_LIMITS.maxCount} پرامپت راهبردی مجاز است`);
    err.status = 400;
    throw err;
  }

  const key = buildStrategyPromptKey(body?.prompt_key || body?.slug);
  const keyErr = validatePromptKey(key);
  if (keyErr) {
    const err = new Error(keyErr);
    err.status = 400;
    throw err;
  }
  if (!String(key).startsWith(STRATEGY_PROMPT_PREFIX)) {
    const err = new Error("کلید باید با strategy. شروع شود");
    err.status = 400;
    throw err;
  }

  const payloadErr = validateStrategyPromptPayload(body, { isCreate: true });
  if (payloadErr) {
    const err = new Error(payloadErr);
    err.status = 400;
    throw err;
  }

  const lenTitle = validateLength(body.title_fa, PROMPT_FIELD_LIMITS.titleFa, "عنوان");
  if (lenTitle) {
    const err = new Error(lenTitle);
    err.status = 400;
    throw err;
  }

  await createPrompt(key, {
    title_fa: body.title_fa,
    description_fa: body.description_fa,
    body: body.body,
    reference_slots: body.reference_slots,
  }, userId);

  return getPromptByKey(key);
}
