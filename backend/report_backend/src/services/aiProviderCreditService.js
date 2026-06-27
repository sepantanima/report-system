import axios from "axios";
import { getRawConfigForTest } from "./aiApiConfigService.js";
import { getProviderTemplateBySlug, resolveEngineAndMergedExtra } from "./aiProviderTemplateService.js";
import { resolveApiKey } from "./llmInvoke.js";

function getByPath(obj, pathStr) {
  if (!pathStr || obj == null) return undefined;
  const parts = String(pathStr).split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function pickBalance(data, creditCheck) {
  const path = creditCheck?.balance_json_path;
  if (path) {
    const v = getByPath(data, path);
    if (v != null && v !== "") return v;
  }
  if (data == null) return null;
  if (typeof data === "number" || typeof data === "string") return data;
  const keys = ["credit", "remaining_unit", "remaining_irt", "balance", "remaining", "remaining_balance", "available_credit", "amount"];
  for (const k of keys) {
    if (data[k] != null && data[k] !== "") return data[k];
  }
  if (data.data && typeof data.data === "object") {
    for (const k of keys) {
      if (data.data[k] != null && data.data[k] !== "") return data.data[k];
    }
  }
  return null;
}

function resolveCreditCheckConfig(row, mergedExtra, template) {
  const rowEx = row.extra_config && typeof row.extra_config === "object" ? row.extra_config : {};
  const tplEx = template?.default_extra_config && typeof template.default_extra_config === "object"
    ? template.default_extra_config
    : {};
  return rowEx.credit_check || mergedExtra?.credit_check || tplEx.credit_check || null;
}

/**
 * @param {number} configId
 */
export async function fetchConfigCredit(configId) {
  const row = await getRawConfigForTest(configId);
  if (!row) throw new Error("پیکربندی یافت نشد");

  const template = await getProviderTemplateBySlug(row.provider_type);
  const { extra } = await resolveEngineAndMergedExtra(row);
  const creditCheck = resolveCreditCheckConfig(row, extra, template);

  if (!creditCheck?.url) {
    throw new Error(
      `ارائه‌دهنده «${row.provider_type}» endpoint مانده اعتبار ندارد. در قالب provider فیلد credit_check را تنظیم کنید.`,
    );
  }

  const apiKey = resolveApiKey(row);
  const method = String(creditCheck.method || "GET").toUpperCase();
  const authPrefix = creditCheck.auth_prefix != null ? String(creditCheck.auth_prefix) : "Bearer ";
  const authHeader = String(creditCheck.auth_header || "Authorization");

  const headers = { "Content-Type": "application/json" };
  headers[authHeader] = `${authPrefix}${apiKey}`.trim();

  let data;
  try {
    const res = await axios({
      method,
      url: String(creditCheck.url).trim(),
      headers,
      timeout: 30000,
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      const msg = res.data?.message || res.data?.error?.message || JSON.stringify(res.data || {}).slice(0, 200);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    data = res.data;
  } catch (e) {
    if (e.message?.startsWith("HTTP ")) throw e;
    throw new Error(e.response?.data?.message || e.message || "خطا در دریافت مانده اعتبار");
  }

  const balance = pickBalance(data, creditCheck);
  const secondaryPath = creditCheck.balance_json_path_secondary;
  const secondary = secondaryPath ? getByPath(data, secondaryPath) : null;

  if (balance == null) {
    throw new Error("مانده اعتبار در پاسخ provider شناسایی نشد");
  }

  let balance_display = String(balance);
  if (creditCheck.currency_label) balance_display += ` ${creditCheck.currency_label}`;
  if (secondary != null && secondary !== "") {
    balance_display += ` (${secondary} IRT)`;
  }

  return {
    ok: true,
    provider_type: row.provider_type,
    config_id: row.id,
    balance,
    balance_display,
    currency_label: creditCheck.currency_label || null,
    checked_at: new Date().toISOString(),
    raw: data,
  };
}
