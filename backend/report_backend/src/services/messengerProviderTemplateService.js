import pool from "../db.js";

export async function listProviderTemplates({ include_disabled } = {}) {
  let q = `SELECT * FROM tbl_messenger_provider_templates`;
  if (!include_disabled) q += ` WHERE is_enabled = true`;
  q += ` ORDER BY sort_order ASC, id ASC`;
  const r = await pool.query(q);
  return r.rows;
}

export async function getProviderTemplateBySlug(slug) {
  const r = await pool.query(`SELECT * FROM tbl_messenger_provider_templates WHERE slug = $1`, [slug]);
  return r.rows[0] || null;
}

export async function assertProviderSlugAllowed(slug) {
  const row = await getProviderTemplateBySlug(String(slug || "").trim());
  if (!row) return `نوع ارائه‌دهنده «${slug}» در رجیستری نیست`;
  if (!row.is_enabled) return `نوع ارائه‌دهنده «${slug}» غیرفعال است`;
  return null;
}
