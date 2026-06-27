import { periodKindLabelFa } from "../utils/managementPeriod.js";
import {
  resolveFilters,
  fetchReportsForFilters,
  buildDigest,
  faJalali,
} from "./managementSummaryService.js";
import { resolveNewsSmartAnalysisAssembly } from "./newsSmartAnalysisAiAssembly.js";

/**
 * متغیرهای سروری ثبت‌شده برای هر اکشن (فقط اکشن‌های رجیستری).
 * resolveServer در زمان اجرا فراخوانی می‌شود؛ meta برای API ادمین بدون کوئری است.
 */

/** @typedef {{ name: string, label_fa: string, kind: 'server' }} PromptVarMeta */

const SMART_ANALYSIS_SERVER_VARS = [
  { name: "PERIOD_START", label_fa: "تاریخ شروع بازه (جلالی)", kind: "server" },
  { name: "PERIOD_END", label_fa: "تاریخ پایان بازه (جلالی)", kind: "server" },
  { name: "NEWS_COUNT", label_fa: "تعداد اخبار", kind: "server" },
  { name: "FILTER_SUMMARY", label_fa: "خلاصه فیلترهای فعال", kind: "server" },
  { name: "NEWS_DIGEST", label_fa: "فشرده اخبار بازه (از پایگاه)", kind: "server" },
];

/** @type {Record<string, { serverVarsMeta: PromptVarMeta[], resolveServer?: (formData: object) => Promise<Record<string, string>> }>} */
const CATALOG = {
  "field_management_summary_create|generate_summary": {
    serverVarsMeta: [
      { name: "PERIOD_START", label_fa: "تاریخ شروع بازه (جلالی)", kind: "server" },
      { name: "PERIOD_END", label_fa: "تاریخ پایان بازه (جلالی)", kind: "server" },
      { name: "PERIOD_KIND_FA", label_fa: "نوع بازه به فارسی (مثلاً ماهانه)", kind: "server" },
      { name: "REPORTS_DIGEST", label_fa: "خلاصهٔ فشردهٔ گزارش‌های میدانی منطبق با فیلتر فرم (از پایگاه)", kind: "server" },
    ],
  },
  "sample_form|sample_summarize": {
    serverVarsMeta: [
      { name: "SAMPLE_DATA", label_fa: "داده نمونه", kind: "server" },
    ],
  },
  "sample_form|sample_secure": {
    serverVarsMeta: [
      { name: "SAMPLE_DATA", label_fa: "داده نمونه", kind: "server" },
    ],
  },
  "news_monitor_manage|summarize_text": {
    serverVarsMeta: [],
  },
  "news_smart_analysis|analyze_overview": { serverVarsMeta: SMART_ANALYSIS_SERVER_VARS },
  "news_smart_analysis|analyze_thematic": { serverVarsMeta: SMART_ANALYSIS_SERVER_VARS },
  "news_smart_analysis|analyze_trends": { serverVarsMeta: SMART_ANALYSIS_SERVER_VARS },
  "news_smart_analysis|analyze_risk": { serverVarsMeta: SMART_ANALYSIS_SERVER_VARS },
};

export function catalogKey(formName, actionName) {
  return `${String(formName || "").trim()}|${String(actionName || "").trim()}`;
}

export function getCatalogEntry(formName, actionName) {
  return CATALOG[catalogKey(formName, actionName)] || null;
}

/**
 * یک بار کوئری گزارش‌ها؛ برای مونتاژ خلاصه مدیریتی و پر کردن متغیرها.
 * @returns {Promise<{ f: object, reports: object[], digest: string, vars: Record<string, string> }>}
 */
export async function resolveManagementSummaryAssembly(formData) {
  const f = resolveFilters(formData);
  const reports = await fetchReportsForFilters(f);
  const digest = buildDigest(reports);
  const vars = {
    PERIOD_START: faJalali(f.periodStart),
    PERIOD_END: faJalali(f.periodEnd),
    PERIOD_KIND_FA: periodKindLabelFa(f.periodKind),
    REPORTS_DIGEST: digest || "(گزارشی در این بازه یافت نشد)",
  };
  return { f, reports, digest, vars };
}

/**
 * متغیرهای سروری از کاتالوگ برای هر فرم/اکشن (فعلاً فقط خلاصه مدیریتی).
 * @param {Record<string, unknown>} formData
 */
export async function resolveCatalogServerVars(formName, actionName, formData) {
  const key = catalogKey(formName, actionName);
  if (key === "field_management_summary_create|generate_summary") {
    const { vars } = await resolveManagementSummaryAssembly(formData);
    return vars;
  }
  if (String(formName || "").trim() === "news_smart_analysis") {
    const { vars } = await resolveNewsSmartAnalysisAssembly(formData);
    return vars;
  }
  return {};
}

/**
 * لیست متغیرهای سروری برای UI ادمین + راهنمای متغیر فرم.
 * @returns {{ server: PromptVarMeta[], form_token_hint_fa: string }}
 */
export function getPromptVariableMetaForAction(formName, actionName) {
  const entry = getCatalogEntry(formName, actionName);
  const server = entry?.serverVarsMeta ? [...entry.serverVarsMeta] : [];
  return {
    server,
    form_token_hint_fa:
      "برای فیلدهایی که در کانفیگ اکشن در فهرست source_fields آمده‌اند، می‌توانید در متن پرامپت از توکن {{FORM_نام_فیلد}} استفاده کنید (همان نام فیلد، با پیشوند FORM_).",
  };
}

function stringifyFormField(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * متغیرهای قابل جایگزینی از formData؛ فقط کلیدهای مجاز در source_fields.
 * @param {Record<string, unknown>} formData
 * @param {unknown} sourceFields
 * @returns {Record<string, string>}
 */
export function buildFormTemplateVars(formData, sourceFields) {
  const keys = Array.isArray(sourceFields) ? sourceFields.map((k) => String(k)) : [];
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of keys) {
    if (!/^[a-zA-Z0-9_]{1,80}$/.test(key)) continue;
    out[`FORM_${key}`] = stringifyFormField(formData?.[key]);
  }
  return out;
}
