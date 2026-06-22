import pool from "../db.js";

const SLUG_RE = /^[a-z0-9_]{1,80}$/;

export function validateTemplateSlug(slug) {
  const s = String(slug || "").trim();
  if (!SLUG_RE.test(s)) return "شناسه انگلیسی (slug) فقط a-z و 0-9 و _ و حداکثر ۸۰ کاراکتر";
  return null;
}

export async function listProviderTemplates({ includeDisabled = false } = {}) {
  let q = `SELECT id, slug, label_fa, engine, default_model_id, default_credential_env_name,
                  default_extra_config, default_system_prompt, is_enabled, sort_order, updated_at
           FROM tbl_ai_provider_templates`;
  if (!includeDisabled) q += ` WHERE is_enabled = true`;
  q += ` ORDER BY sort_order ASC, slug ASC`;
  const r = await pool.query(q);
  return r.rows;
}

export async function getProviderTemplateBySlug(slug) {
  const r = await pool.query(
    `SELECT * FROM tbl_ai_provider_templates WHERE slug = $1`,
    [String(slug || "").trim()],
  );
  return r.rows[0] || null;
}

export async function getProviderTemplateById(id) {
  const r = await pool.query(`SELECT * FROM tbl_ai_provider_templates WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

/** برای ذخیرهٔ ردیف API: slug باید در رجیستری باشد و فعال باشد */
export async function assertProviderSlugAllowed(slug) {
  const s = String(slug || "").trim();
  const err = validateTemplateSlug(s);
  if (err) return err;
  const row = await getProviderTemplateBySlug(s);
  if (!row) return `نوع ارائه‌دهنده «${s}» در رجیستری وجود ندارد. از منوی «انواع ارائه‌دهنده» یک قالب بسازید یا مهاجرت دیتابیس را اجرا کنید.`;
  if (!row.is_enabled) return `نوع ارائه‌دهنده «${s}» غیرفعال است.`;
  return null;
}

export async function insertProviderTemplate(body, userId) {
  const err = validateTemplateSlug(body.slug);
  if (err) throw new Error(err);
  const slug = String(body.slug).trim();
  const engine = String(body.engine || "").trim();
  if (!["google_gemini", "openai_chat"].includes(engine)) throw new Error("engine نامعتبر است");
  const r = await pool.query(
    `INSERT INTO tbl_ai_provider_templates (
       slug, label_fa, engine, default_model_id, default_credential_env_name,
       default_extra_config, default_system_prompt, is_enabled, sort_order
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
     RETURNING id`,
    [
      slug,
      String(body.label_fa || ""),
      engine,
      body.default_model_id != null ? String(body.default_model_id).trim() || null : null,
      body.default_credential_env_name != null ? String(body.default_credential_env_name).trim() || null : null,
      JSON.stringify(body.default_extra_config && typeof body.default_extra_config === "object" ? body.default_extra_config : {}),
      body.default_system_prompt != null ? String(body.default_system_prompt) : null,
      body.is_enabled !== false,
      parseInt(body.sort_order, 10) || 0,
    ],
  );
  return r.rows[0].id;
}

export async function updateProviderTemplate(id, body) {
  const cur = await pool.query(`SELECT * FROM tbl_ai_provider_templates WHERE id = $1`, [id]);
  if (!cur.rows.length) return 0;
  const c = cur.rows[0];
  const slug = body.slug !== undefined ? String(body.slug).trim() : c.slug;
  const se = validateTemplateSlug(slug);
  if (se) throw new Error(se);
  const engine = body.engine !== undefined ? String(body.engine).trim() : c.engine;
  if (!["google_gemini", "openai_chat"].includes(engine)) throw new Error("engine نامعتبر است");
  await pool.query(
    `UPDATE tbl_ai_provider_templates SET
       slug = $1, label_fa = $2, engine = $3, default_model_id = $4, default_credential_env_name = $5,
       default_extra_config = $6::jsonb, default_system_prompt = $7, is_enabled = $8, sort_order = $9,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $10`,
    [
      slug,
      body.label_fa !== undefined ? String(body.label_fa) : c.label_fa,
      engine,
      body.default_model_id !== undefined ? (body.default_model_id ? String(body.default_model_id).trim() : null) : c.default_model_id,
      body.default_credential_env_name !== undefined
        ? body.default_credential_env_name
          ? String(body.default_credential_env_name).trim()
          : null
        : c.default_credential_env_name,
      JSON.stringify(
        body.default_extra_config !== undefined
          ? body.default_extra_config && typeof body.default_extra_config === "object"
            ? body.default_extra_config
            : {}
          : c.default_extra_config || {},
      ),
      body.default_system_prompt !== undefined ? body.default_system_prompt : c.default_system_prompt,
      body.is_enabled !== undefined ? !!body.is_enabled : c.is_enabled,
      body.sort_order !== undefined ? parseInt(body.sort_order, 10) || 0 : c.sort_order,
      id,
    ],
  );
  return 1;
}

export async function deleteProviderTemplate(id) {
  const cur = await pool.query(`SELECT slug FROM tbl_ai_provider_templates WHERE id = $1`, [id]);
  if (!cur.rows.length) return 0;
  const slug = cur.rows[0].slug;
  const cnt = await pool.query(`SELECT COUNT(*)::int AS n FROM tbl_ai_api_configs WHERE provider_type = $1`, [slug]);
  if ((cnt.rows[0]?.n || 0) > 0) {
    throw new Error("این قالب در ردیف‌های پیکربندی API استفاده شده؛ ابتدا آن ردیف‌ها را حذف یا نوعشان را عوض کنید.");
  }
  const r = await pool.query(`DELETE FROM tbl_ai_provider_templates WHERE id = $1`, [id]);
  return r.rowCount || 0;
}

/**
 * ادغام پیش‌فرض قالب با extra_config ردیف پیکربندی؛ خروجی engine برای dispatch.
 */
export async function resolveEngineAndMergedExtra(row) {
  const slug = String(row.provider_type || "").trim();
  const tpl = await getProviderTemplateBySlug(slug);
  const rowEx = row.extra_config && typeof row.extra_config === "object" ? { ...row.extra_config } : {};
  if (tpl && tpl.is_enabled) {
    const def = tpl.default_extra_config && typeof tpl.default_extra_config === "object" ? { ...tpl.default_extra_config } : {};
    const merged = { ...def, ...rowEx };
    const dsp = tpl.default_system_prompt && String(tpl.default_system_prompt).trim();
    if (dsp && !merged.system_prompt && !merged.system && !merged.system_message) {
      merged.system_prompt = dsp;
    }
    return { engine: tpl.engine, extra: merged };
  }
  if (slug === "google_gemini" || slug === "openai_chat") {
    return { engine: slug, extra: rowEx };
  }
  throw new Error(
    `نوع ارائه‌دهنده «${slug}» در رجیستری نیست. در بخش «انواع ارائه‌دهنده API» یک قالب با همین slug بسازید (موتور: openai_chat برای سرویس‌هایی مثل AvalAI).`,
  );
}
