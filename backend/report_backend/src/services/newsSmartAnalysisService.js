import pool from "../db.js";
import { executeFormAiAction } from "./aiFormRunOrchestrator.js";
import {
  NEWS_SMART_ANALYSIS_FORM,
  MANUAL_FALLBACK_NOTICE_FA,
  CUSTOM_PROMPT_ACTION,
  CUSTOM_PROMPT_SLOTS,
  MAX_CUSTOM_PROMPT_LEN,
  MAX_CUSTOM_PROMPT_TITLE_LEN,
  MIN_CUSTOM_PROMPT_LEN,
  customPromptTypeFromSlot,
  isCustomPromptAnalysisType,
  analysisTypeLabelFa,
} from "../constants/newsSmartAnalysisMeta.js";
import { getPackById } from "./newsSmartAnalysisPackService.js";
import { newSyncIdentity, syncIdentityInsertColumns, syncIdentityInsertValues } from "./syncIdentityService.js";
import { instanceEntityAndSql } from "./instanceScopeService.js";
import {
  resolveNewsSmartAnalysisAssembly,
  buildAutoAnalysisTitle,
  computeQuerySignature,
} from "./newsSmartAnalysisAiAssembly.js";
import { buildSmartAnalysisDocx, buildSmartAnalysisPrintHtml } from "./newsSmartAnalysisDocx.js";
import { buildAnalysisMessengerTextWithSettings } from "./newsSmartAnalysisMessenger.js";
import { htmlToPdfBuffer } from "./newsReportPdf.js";
import { getNewsReportSettings } from "./newsReportSettingsService.js";
import { getCustomPromptPolicy } from "./newsSmartCustomPromptPolicyService.js";
import {
  augmentCustomPromptForAi,
  truncateAiOutputText,
} from "../constants/newsSmartCustomPromptPolicy.js";
import { sendMessengerText } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";
import { stripHtml } from "./newsTextUtils.js";

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    pack_id: row.pack_id ?? null,
    title: row.title,
    analysis_type: row.analysis_type,
    body_html: row.body_html,
    body_plain: row.body_plain,
    query_payload: row.query_payload,
    selected_ids: row.selected_ids,
    news_count: row.news_count,
    period_from: row.period_from,
    period_to: row.period_to,
    ai_prompt_key: row.ai_prompt_key,
    custom_prompt: row.custom_prompt || null,
    custom_prompt_title: row.custom_prompt_title || null,
    publish_status: row.publish_status,
    published_at: row.published_at,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    creator_name: row.creator_name,
  };
}

export async function runSmartAnalysisAi({ actionName, formData, userId, userRole }) {
  const scope = { userId, role: userRole };
  await resolveNewsSmartAnalysisAssembly(formData, scope);
  return executeFormAiAction({
    formName: NEWS_SMART_ANALYSIS_FORM,
    actionName,
    formData,
    userId,
  });
}

/** اجرای AI با fallback دستی: در صورت شکست همه providerها، عنوان پیشنهادی + فرم خالی */
export async function runSmartAnalysisAiWithFallback({ actionName, formData, userId, userRole }) {
  const scope = { userId, role: userRole };
  const resolved = await resolveCustomPromptRun(actionName, formData);
  const suggestedTitle = await buildSuggestedTitle(
    resolved.actionName,
    resolved.formData,
    scope,
    resolved.analysisType,
  );
  try {
    const data = await runSmartAnalysisAi({
      actionName: resolved.actionName,
      formData: resolved.formData,
      userId,
      userRole,
    });
    const policy = await getCustomPromptPolicy();
    if (isCustomPromptAnalysisType(resolved.analysisType) && policy.enabled && policy.max_output_chars > 0) {
      if (data.draft) data.draft = truncateAiOutputText(data.draft, policy.max_output_chars);
      if (data.result_text) data.result_text = truncateAiOutputText(data.result_text, policy.max_output_chars);
    }
    return {
      ...data,
      suggested_title: suggestedTitle,
      analysis_type: resolved.analysisType,
      custom_prompt: resolved.customPrompt || null,
      custom_prompt_title: resolved.customPromptTitle || null,
    };
  } catch (e) {
    return {
      status: "manual_fallback",
      suggested_title: suggestedTitle,
      analysis_type: resolved.analysisType,
      custom_prompt: resolved.customPrompt || null,
      custom_prompt_title: resolved.customPromptTitle || null,
      draft: "",
      result_text: "",
      manual_notice_fa: MANUAL_FALLBACK_NOTICE_FA,
      ai_error: e.message,
    };
  }
}

async function resolveCustomPromptRun(actionName, formData = {}) {
  const an = String(actionName || "").trim();
  if (an !== CUSTOM_PROMPT_ACTION) {
    return {
      actionName: an,
      formData,
      analysisType: an,
      customPrompt: null,
      customPromptTitle: null,
    };
  }

  const customPrompt = String(formData?.custom_prompt || "").trim();
  const customPromptTitle = String(formData?.custom_prompt_title || "").trim().slice(0, MAX_CUSTOM_PROMPT_TITLE_LEN);
  if (!customPrompt) throw new Error("پرامپت شخصی الزامی است");
  if (!customPromptTitle) throw new Error("عنوان پرامپت شخصی الزامی است");
  if (customPrompt.length < MIN_CUSTOM_PROMPT_LEN) {
    throw new Error(`پرامپت شخصی باید حداقل ${MIN_CUSTOM_PROMPT_LEN} کاراکتر باشد`);
  }
  if (customPrompt.length > MAX_CUSTOM_PROMPT_LEN) {
    throw new Error(`پرامپت شخصی بیش از حد مجاز است (حداکثر ${MAX_CUSTOM_PROMPT_LEN} کاراکتر)`);
  }

  const packId = formData?.pack_id != null ? parseInt(formData.pack_id, 10) : null;
  if (!Number.isFinite(packId)) throw new Error("pack_id برای تحلیل شخصی الزامی است");

  const pack = await getPackById(packId);
  if (!pack) throw new Error("پک یافت نشد");

  let slot = parseInt(formData?.custom_slot, 10);
  const existingType = String(formData?.analysis_type || "").trim();
  if (isCustomPromptAnalysisType(existingType)) {
    slot = parseInt(existingType.replace("custom_prompt_", ""), 10);
  }
  if (![1, 2, 3].includes(slot)) {
    const used = new Set(
      Object.keys(pack.analyses || {}).filter((t) => isCustomPromptAnalysisType(t)),
    );
    slot = CUSTOM_PROMPT_SLOTS.map((t) => parseInt(t.replace("custom_prompt_", ""), 10))
      .find((n) => !used.has(`custom_prompt_${n}`));
    if (!slot) throw new Error(`حداکثر ${CUSTOM_PROMPT_SLOTS.length} تحلیل شخصی برای هر بسته مجاز است`);
  }

  const analysisType = customPromptTypeFromSlot(slot);
  if (!analysisType) throw new Error("اسلات تحلیل شخصی نامعتبر است");

  const existing = pack.analyses?.[analysisType];
  if (!existing) {
    const customCount = Object.keys(pack.analyses || {}).filter((t) => isCustomPromptAnalysisType(t)).length;
    if (customCount >= CUSTOM_PROMPT_SLOTS.length) {
      throw new Error(`حداکثر ${CUSTOM_PROMPT_SLOTS.length} تحلیل شخصی برای هر بسته مجاز است`);
    }
  }

  const policy = await getCustomPromptPolicy();
  const augmentedPrompt = augmentCustomPromptForAi(customPrompt, policy);

  return {
    actionName: CUSTOM_PROMPT_ACTION,
    formData: {
      ...formData,
      pack_id: packId,
      custom_prompt: augmentedPrompt,
      custom_slot: slot,
      custom_prompt_title: customPromptTitle,
    },
    analysisType,
    customPrompt,
    customPromptTitle,
  };
}

export async function saveSmartAnalysis(body = {}, userId) {
  const id = body.id != null ? parseInt(body.id, 10) : null;
  const title = String(body.title || "").trim().slice(0, 500);
  const analysisType = String(body.analysis_type || "").trim();
  const bodyHtml = String(body.body_html ?? body.body ?? "");
  const bodyPlain = String(body.body_plain ?? stripHtml(bodyHtml));
  const queryPayload = body.query_payload || {};
  const selectedIds = Array.isArray(body.selected_ids) ? body.selected_ids : [];
  const newsCount = parseInt(body.news_count, 10) || 0;
  const periodFrom = body.period_from || queryPayload.from_date || null;
  const periodTo = body.period_to || queryPayload.to_date || periodFrom;
  const filterSignature = body.filter_signature || computeQuerySignature(queryPayload);

  if (!title) throw new Error("عنوان الزامی است");
  if (!analysisType) throw new Error("نوع تحلیل الزامی است");

  if (id) {
    const r = await pool.query(
      `UPDATE tbl_news_smart_analyses SET
         title = $1, analysis_type = $2, body_html = $3, body_plain = $4,
         query_payload = $5, selected_ids = $6, news_count = $7,
         period_from = $8, period_to = $9, filter_signature = $10,
         ai_prompt_key = COALESCE($11, ai_prompt_key),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        title, analysisType, bodyHtml, bodyPlain,
        JSON.stringify(queryPayload), JSON.stringify(selectedIds), newsCount,
        periodFrom, periodTo, filterSignature,
        body.ai_prompt_key || null,
        id,
      ],
    );
    if (!r.rows.length) throw new Error("تحلیل یافت نشد");
    return mapRow(r.rows[0]);
  }

  const ins = await pool.query(
    `INSERT INTO tbl_news_smart_analyses (
       title, analysis_type, body_html, body_plain, query_payload, selected_ids,
       news_count, period_from, period_to, filter_signature,
       ai_prompt_key, created_by, ${syncIdentityInsertColumns().join(", ")}
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      title, analysisType, bodyHtml, bodyPlain,
      JSON.stringify(queryPayload), JSON.stringify(selectedIds), newsCount,
      periodFrom, periodTo, filterSignature,
      body.ai_prompt_key || null,
      userId ?? null,
      ...syncIdentityInsertValues(newSyncIdentity()),
    ],
  );
  return mapRow(ins.rows[0]);
}

export async function getSmartAnalysis(id) {
  const r = await pool.query(
    `SELECT s.*, u.name AS creator_name
     FROM tbl_news_smart_analyses s
     LEFT JOIN tbl_users u ON u.id = s.created_by
     WHERE s.id = $1${instanceEntityAndSql("s")}`,
    [id],
  );
  return mapRow(r.rows[0]);
}

export async function listSmartAnalyses(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.page_size, 10) || 20));
  const offset = (page - 1) * pageSize;
  const params = [];
  let where = " WHERE 1=1";
  where += instanceEntityAndSql("s");

  const q = String(query.q || "").trim();
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (s.title ILIKE $${params.length} OR s.body_plain ILIKE $${params.length})`;
  }
  if (query.analysis_type) {
    params.push(String(query.analysis_type));
    where += ` AND s.analysis_type = $${params.length}`;
  }

  const countR = await pool.query(
    `SELECT COUNT(*)::int AS n FROM tbl_news_smart_analyses s ${where}`,
    params,
  );
  const total = countR.rows[0]?.n ?? 0;

  params.push(pageSize, offset);
  const r = await pool.query(
    `SELECT s.*, u.name AS creator_name
     FROM tbl_news_smart_analyses s
     LEFT JOIN tbl_users u ON u.id = s.created_by
     ${where}
     ORDER BY s.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    rows: r.rows.map(mapRow),
    total,
    page,
    page_size: pageSize,
  };
}

export async function deleteSmartAnalysis(id) {
  const r = await pool.query(
    `DELETE FROM tbl_news_smart_analyses WHERE id = $1${instanceEntityAndSql("tbl_news_smart_analyses")} RETURNING id`,
    [id],
  );
  if (!r.rows.length) throw new Error("تحلیل یافت نشد");
  return { ok: true, id };
}

export async function exportSmartAnalysisPdf(id) {
  const analysis = await getSmartAnalysis(id);
  if (!analysis) throw new Error("تحلیل یافت نشد");
  const settings = await getNewsReportSettings();
  const html = buildSmartAnalysisPrintHtml(analysis, settings);
  const buffer = await htmlToPdfBuffer(html, { pdf_paper_size: settings.pdf_paper_size || "A4" });
  return { buffer, fileName: `smart-analysis-${id}.pdf`, mime: "application/pdf" };
}

export async function exportSmartAnalysisDocx(id) {
  const analysis = await getSmartAnalysis(id);
  if (!analysis) throw new Error("تحلیل یافت نشد");
  const buffer = await buildSmartAnalysisDocx(analysis);
  return {
    buffer,
    fileName: `smart-analysis-${id}.docx`,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

export async function exportSmartAnalysisTxt(id) {
  const analysis = await getSmartAnalysis(id);
  if (!analysis) throw new Error("تحلیل یافت نشد");
  const { text, truncated, charCount, maxChars } = await buildAnalysisMessengerTextWithSettings(analysis);
  return {
    text,
    truncated,
    charCount,
    maxChars,
    fileName: `smart-analysis-${id}.txt`,
    mime: "text/plain; charset=utf-8",
  };
}

export async function publishSmartAnalysis(id, { channelConfigId, userId }) {
  const cid = parseInt(channelConfigId, 10);
  if (!Number.isFinite(cid)) throw new Error("مقصد انتشار نامعتبر است");

  const analysis = await getSmartAnalysis(id);
  if (!analysis) throw new Error("تحلیل یافت نشد");

  const { text, truncated } = await buildAnalysisMessengerTextWithSettings(analysis);
  const usageKey = MESSENGER_USAGE_KEYS.NEWS_SMART_ANALYSIS_PUBLISH;

  try {
    const res = await sendMessengerText(cid, text);
    await insertMessengerSendLog({
      user_id: userId,
      usage_key: usageKey,
      channel_config_id: cid,
      payload_kind: "text",
      status: "ok",
      platform_message_id: res.messageId,
      request_meta: { analysis_id: id, truncated },
    });
    await pool.query(
      `UPDATE tbl_news_smart_analyses SET
         publish_status = 'published', channel_config_id = $1,
         published_at = CURRENT_TIMESTAMP, error_message = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [cid, id],
    );
    return { ok: true, truncated };
  } catch (e) {
    await insertMessengerSendLog({
      user_id: userId,
      usage_key: usageKey,
      channel_config_id: cid,
      payload_kind: "text",
      status: "error",
      error_message: e.message,
      request_meta: { analysis_id: id },
    });
    await pool.query(
      `UPDATE tbl_news_smart_analyses SET
         publish_status = 'failed', channel_config_id = $1,
         error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [cid, e.message, id],
    );
    throw e;
  }
}

export async function buildSuggestedTitle(actionName, formData, userScope = {}, analysisTypeOverride = null) {
  const assembly = await resolveNewsSmartAnalysisAssembly(formData, userScope);
  const type = analysisTypeOverride || actionName;
  const typeFa = analysisTypeLabelFa(type, "", formData?.custom_prompt_title);
  const from = assembly.periodFrom || "";
  const to = assembly.periodTo || from;
  const count = assembly.newsCount ?? 0;
  const range = from === to ? from : `${from} — ${to}`;
  return `${typeFa} — ${range} (${count} خبر)`;
}

export { resolveNewsSmartAnalysisAssembly, buildAutoAnalysisTitle };
export { getCustomPromptPolicy } from "./newsSmartCustomPromptPolicyService.js";
