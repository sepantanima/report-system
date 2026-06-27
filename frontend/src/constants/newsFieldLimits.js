/** محدودیت کاراکتر فرم‌های اخبار — برای تغییر فقط این فایل را ویرایش کنید. */
import { plainTextLength } from "./analysisFieldLimits.js";

export const NEWS_FIELD_LIMITS = {
  cleanedText: 700,
  rawText: 1200,
  summary: 500,
  statusNote: 200,
  source: 80,
  sender: 80,
  sourceUrl: 500,
};

export function validateLength(value, max, label) {
  if (value == null || value === "") return null;
  if (String(value).length > max) return `${label} حداکثر ${max} کاراکتر باشد`;
  return null;
}

/** اعتبارسنجی فرم ورود خبر (پایشگر) */
export function validateNewsEntryPayload(body = {}) {
  const L = NEWS_FIELD_LIMITS;
  const plainLen = plainTextLength(body.raw_text ?? "");
  if (!plainLen) return "متن خبر الزامی است";
  if (plainLen > L.rawText) return `متن حداکثر ${L.rawText} کاراکتر باشد`;
  if (!String(body.source ?? "").trim()) return "منبع الزامی است";
  return (
    validateLength(body.source, L.source, "منبع") ||
    validateLength(body.source_url, L.sourceUrl, "لینک منبع")
  );
}