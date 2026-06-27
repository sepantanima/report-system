import axios from "axios";
import pool from "../db.js";
import { resolveEngineAndMergedExtra } from "./aiProviderTemplateService.js";
import {
  classifyLlmFailure,
  buildLlmChainErrorMessage,
  createLlmChainError,
} from "../utils/aiErrorDiagnostics.js";

async function callGoogleGemini(apiKey, modelId, promptText, extra = {}) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const maxTokens = extra.maxOutputTokens ?? 8192;
  const temperature = extra.temperature ?? 0.4;
  const { data } = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    },
    { timeout: 120000 },
  );
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("پاسخ خالی از مدل دریافت شد");
  return text;
}

/** API چت سازگار با OpenAI (آدرس کامل chat/completions یا پایهٔ .../v1 در extra_config) */
function resolveOpenAiChatCompletionsUrl(extra) {
  const direct =
    (extra.chat_completions_url || extra.chatCompletionsUrl || "").trim() ||
    (extra.chat_url || "").trim();
  if (direct) return direct.replace(/\/+$/, "");
  const base = (extra.base_url || extra.baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

async function callOpenAiChat(apiKey, modelId, promptText, extra = {}) {
  const url = resolveOpenAiChatCompletionsUrl(extra);
  const maxTokens = extra.max_tokens ?? extra.maxTokens ?? 4096;
  const temperature = extra.temperature ?? 0.4;
  const systemRaw =
    (extra.system_prompt || extra.system || extra.system_message || "").trim();
  const messages = [];
  if (systemRaw) messages.push({ role: "system", content: systemRaw });
  messages.push({ role: "user", content: promptText });

  const body = {
    model: modelId,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (extra.request_extensions && typeof extra.request_extensions === "object") {
    Object.assign(body, extra.request_extensions);
  }

  const { data } = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 120000,
  });
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    const msg = data?.error?.message || JSON.stringify(data?.error || {});
    throw new Error(data?.error ? `خطای API: ${msg}` : "پاسخ خالی از مدل دریافت شد");
  }
  return text;
}

export function resolveApiKey(row) {
  if (row.credential_mode === "env_ref") {
    const name = (row.credential_env_name || "").trim();
    if (!name) throw new Error("نام متغیر محیطی برای کلید API تنظیم نشده است");
    const v = process.env[name];
    if (!v) throw new Error(`متغیر محیطی ${name} مقداردهی نشده است`);
    return v;
  }
  if (row.credential_mode === "stored_secret") {
    const cipher = row.credential_secret_cipher;
    if (!cipher) throw new Error("کلید API ذخیره‌شده موجود نیست");
    return String(cipher).trim();
  }
  throw new Error("نوع اعتبارنامه پشتیبانی نمی‌شود");
}

async function invokeOneRow(row, promptText) {
  const apiKey = resolveApiKey(row);
  const { engine, extra } = await resolveEngineAndMergedExtra(row);
  if (engine === "google_gemini") {
    const text = await callGoogleGemini(apiKey, row.model_id, promptText, extra);
    return { text, configId: row.id };
  }
  if (engine === "openai_chat") {
    const text = await callOpenAiChat(apiKey, row.model_id, promptText, extra);
    return { text, configId: row.id };
  }
  throw new Error(`موتور ارائه‌دهنده ناشناخته: ${engine}`);
}

/** تست یک ردیف مشخص بدون زنجیره */
export async function invokeLlmSingleRow(row, promptText) {
  return invokeOneRow(row, promptText);
}

const selectRowSql = `SELECT id, provider_type, model_id, extra_config, credential_mode, credential_env_name, credential_secret_cipher
     FROM tbl_ai_api_configs`;

/**
 * @param {{ usageKey: string, promptText: string, preferredConfigId?: number|null }} opts
 * @returns {{ text: string, configId: number|null }}
 */
export async function invokeLlm({ usageKey, promptText, preferredConfigId = null }) {
  const rows = [];

  if (preferredConfigId != null && Number.isFinite(Number(preferredConfigId))) {
    const pref = await pool.query(
      `${selectRowSql} WHERE id = $1 AND is_enabled = true`,
      [preferredConfigId],
    );
    if (pref.rows[0]) rows.push(pref.rows[0]);
  }

  const r = await pool.query(
    `${selectRowSql}
     WHERE usage_key = $1 AND is_enabled = true
     ORDER BY sort_order ASC, id ASC`,
    [usageKey],
  );
  for (const row of r.rows) {
    if (!rows.some((x) => x.id === row.id)) rows.push(row);
  }

  if (!rows.length) {
    const diagnostic = classifyLlmFailure(
      new Error(`هیچ پیکربندی فعالی برای کاربرد «${usageKey}» یافت نشد`),
      null,
    );
    throw createLlmChainError(diagnostic.message_fa, [], diagnostic);
  }

  const attempts = [];
  let lastDiagnostic = null;
  const isRetriable = (status, code) => (
    status === 401
    || status === 403
    || status === 404
    || status === 429
    || (status >= 500 && status < 600)
    || code === "ECONNABORTED"
  );

  for (const row of rows) {
    try {
      return await invokeOneRow(row, promptText);
    } catch (e) {
      const diagnostic = classifyLlmFailure(e, row);
      lastDiagnostic = diagnostic;
      const willRetry = isRetriable(e.response?.status, e.code);
      attempts.push({
        config_id: row.id,
        provider_type: row.provider_type,
        model_id: row.model_id,
        category: diagnostic.category,
        http_status: diagnostic.http_status,
        provider_code: diagnostic.provider_code,
        message_fa: diagnostic.message_fa,
        retried: willRetry,
      });
      if (!willRetry) {
        throw createLlmChainError(
          buildLlmChainErrorMessage(diagnostic, attempts),
          attempts,
          diagnostic,
        );
      }
    }
  }

  const diagnostic = lastDiagnostic || classifyLlmFailure(new Error("همه تلاش‌ها ناموفق بود"), null);
  throw createLlmChainError(
    buildLlmChainErrorMessage(diagnostic, attempts),
    attempts,
    diagnostic,
  );
}
