import { getPromptBody } from "./promptRegistry.js";
import { listCategories } from "./newsMonitorService.js";
import { getNewsEntrySettings } from "./newsEntrySettingsService.js";
import {
  NEWS_PRIORITIES,
  NEWS_QUALITY,
  NEWS_RELEVANCE_STATUSES,
} from "../constants/newsMonitorMeta.js";
import { NEWS_FIELD_LIMITS } from "../constants/newsFieldLimits.js";

function buildPriorityLegend() {
  return Object.entries(NEWS_PRIORITIES)
    .map(([k, v]) => `${k} = ${v.label}`)
    .join(" | ");
}

function buildQualityLegend() {
  return Object.entries(NEWS_QUALITY)
    .map(([k, v]) => `${k} = ${v.label}`)
    .join(" | ");
}

function buildRelevanceLegend() {
  return Object.entries(NEWS_RELEVANCE_STATUSES)
    .map(([k, v]) => `${k} = ${v.label}`)
    .join(" | ");
}

async function buildCategoryCatalog() {
  const cats = await listCategories();
  if (!cats.length) return "(دسته‌ای در پایگاه ثبت نشده)";
  return cats.map((c) => `${c.code}: ${c.title_fa}`).join("\n");
}

const JSON_OUTPUT_SPEC = `فقط یک JSON معتبر برگردانید (بدون markdown و بدون توضیح اضافه):
{
  "updates": [
    {
      "id": <شناسه عددی خبر — دقیقاً همان [id=...] در متن اخبار>,
      "priority": <1-4>,
      "quality": <1-5>,
      "category_codes": ["<code دسته از فهرست>"],
      "summary": "<خلاصه در صورت نیاز>",
      "relevance_status": "relevant" | "irrelevant"
    }
  ]
}`;

/**
 * پرامپت ادمین = فقط سیاست‌های تشخیص (اهمیت، کیفیت، مرتبط/غیرمرتبط، دسته).
 * مقیاس‌ها، دسته‌ها، آستانه خلاصه و قالب JSON توسط سامانه از پایگاه/کانفیگ تزریق می‌شوند.
 */
export async function buildNewsEditorialPromptForModel(formData, options = {}) {
  const promptKey = String(options.promptKey || "news.editorial.policy").trim();
  const policyText = await getPromptBody(promptKey);
  if (!policyText?.trim()) throw new Error("پرامپت سیاست دبیری یافت نشد");

  const settings = await getNewsEntrySettings();
  const summarizeThreshold = settings.summarize_char_threshold ?? 300;
  const categoryCatalog = await buildCategoryCatalog();
  const digest = String(formData?.news_digest || "").trim() || "(خبری در این دسته یافت نشد)";

  const promptTextForModel = [
    "شما دبیر ارشد خبری هستید. برای هر خبر در لیست زیر، فیلدهای دبیری را طبق سیاست‌های مدیر تعیین کنید.",
    "",
    "=== سیاست‌های تشخیص (نوشته مدیر) ===",
    policyText.trim(),
    "",
    "=== مقیاس‌های سیستم (از پایگاه — فقط برای تفسیر سیاست بالا) ===",
    `اولویت (priority): ${buildPriorityLegend()}`,
    `کیفیت (quality): ${buildQualityLegend()}`,
    `مرتبط بودن (relevance_status): ${buildRelevanceLegend()}`,
    "برای هر خبر حتماً relevant یا irrelevant انتخاب کنید؛ unset مجاز نیست.",
    "",
    "=== دسته‌های مجاز (code از پایگاه) ===",
    categoryCatalog,
    "",
    "=== خلاصه‌سازی ===",
    `اگر طول متن خبر بیش از ${summarizeThreshold} کاراکتر است، فیلد summary بنویسید (حداکثر ${NEWS_FIELD_LIMITS.summary} کاراکتر).`,
    "",
    "=== قالب خروجی ===",
    JSON_OUTPUT_SPEC,
    "",
    "=== اخبار این دسته ===",
    "هر خبر با شماره و [id=شماره_پایگاه] شروع می‌شود؛ در JSON فیلد id را همان [id=...] بگذارید (نه شماره ترتیبی).",
    digest,
  ].join("\n");

  return { promptTextForModel, promptKey };
}
