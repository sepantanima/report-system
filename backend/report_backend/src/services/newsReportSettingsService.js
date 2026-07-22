import pool from "../db.js";
import { getDefaultReportSettings, mergeReportSettings } from "./newsReportMeta.js";
import { getAllReportDefaults } from "../constants/newsReportDefaults.js";

let settingsTableExists = null;

async function checkSettingsTable() {
  if (settingsTableExists !== null) return settingsTableExists;
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_news_report_settings' LIMIT 1`,
    );
    settingsTableExists = r.rows.length > 0;
  } catch {
    settingsTableExists = false;
  }
  return settingsTableExists;
}

export async function getNewsReportSettings() {
  if (!(await checkSettingsTable())) return getDefaultReportSettings();
  const r = await pool.query(`SELECT * FROM tbl_news_report_settings WHERE id = 1`);
  return mergeReportSettings(r.rows[0]);
}

export async function updateNewsReportSettings(body, userId) {
  if (!(await checkSettingsTable())) {
    throw new Error("جدول تنظیمات گزارش وجود ندارد — مایگریشن 021 را اجرا کنید");
  }
  const fields = [
    "system_name", "organization_name", "system_link", "signature_text",
    "hashtags", "pdf_paper_size", "report_color", "default_label",
    "messenger_template", "document_caption_template", "news_item_template", "brief_submission_messenger_template",
    "html_card_template", "html_table_template", "txt_output_template",
    "print_settings", "custom_prompt_policy", "pack_defaults", "report_default_filters",
  ];
  const jsonFields = new Set(["print_settings", "custom_prompt_policy", "pack_defaults", "report_default_filters"]);
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const val = jsonFields.has(f) ? JSON.stringify(body[f]) : body[f];
      params.push(val);
      sets.push(`${f} = $${params.length}${jsonFields.has(f) ? "::jsonb" : ""}`);
    }
  }
  if (!sets.length) return getNewsReportSettings();
  params.push(userId ?? null);
  sets.push(`updated_by = $${params.length}`);
  sets.push("updated_at = CURRENT_TIMESTAMP");
  await pool.query(`UPDATE tbl_news_report_settings SET ${sets.join(", ")} WHERE id = 1`, params);
  return getNewsReportSettings();
}

export async function listNewsReportTemplates(type) {
  if (!(await checkSettingsTable())) return [];
  let q = `SELECT * FROM tbl_news_report_templates WHERE active = true`;
  const params = [];
  if (type) {
    params.push(type);
    q += ` AND type = $${params.length}`;
  }
  q += ` ORDER BY id`;
  const r = await pool.query(q, params);
  return r.rows;
}

export async function getNewsReportTemplateById(id) {
  const r = await pool.query(`SELECT * FROM tbl_news_report_templates WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

export async function insertNewsReportTemplate(body) {
  const r = await pool.query(
    `INSERT INTO tbl_news_report_templates (name, type, template_content, active)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [body.name, body.type, body.template_content || "", body.active !== false],
  );
  return r.rows[0].id;
}

export async function updateNewsReportTemplate(id, body) {
  const fields = ["name", "type", "template_content", "active"];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      params.push(body[f]);
      sets.push(`${f} = $${params.length}`);
    }
  }
  if (!sets.length) return;
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  await pool.query(
    `UPDATE tbl_news_report_templates SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params,
  );
}

export async function deleteNewsReportTemplate(id) {
  await pool.query(`DELETE FROM tbl_news_report_templates WHERE id = $1`, [id]);
}

export function getReportSettingsDefaults() {
  return getAllReportDefaults();
}

export async function getNewsReportWorkflowConfig() {
  const settings = await getNewsReportSettings();
  return {
    pack_defaults: settings.pack_defaults,
    report_default_filters: settings.report_default_filters,
  };
}
