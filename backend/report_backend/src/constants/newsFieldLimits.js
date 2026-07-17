import { stripHtml } from "../services/newsTextUtils.js";

/** محدودیت کاراکتر فرم‌های اخبار — هم‌راستا با frontend/src/constants/newsFieldLimits.js */
export const DEFAULT_DAILY_SUBMISSION_LIMIT = 10;
export const DEFAULT_SUMMARIZE_CHAR_THRESHOLD = 300;

/** پایان-placeholder خودکار ingest — مثل «… ادامه» */
const NEWS_SUMMARY_CONTINUATION_RE = /(?:ادامه(?:\s*دارد)?|خبر\s*ادامه\s*دارد)$/iu;

export const NEWS_FIELD_LIMITS = {
  cleanedText: 1000,
  rawText: 2000,
  summary: 500,
  statusNote: 200,
  monitorNote: 100,
  source: 80,
  sender: 80,
  sourceUrl: 500,
};

export function plainTextLength(html = "") {
  return stripHtml(html).length;
}

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
    validateLength(body.source_url, L.sourceUrl, "لینک منبع") ||
    validateLength(body.monitor_note, L.monitorNote, "توضیح اهمیت و ارتباط")
  );
}

export function validatePlainTextLength(html, max, label) {
  if (html == null || html === "") return null;
  if (plainTextLength(html) > max) return `${label} حداکثر ${max} کاراکتر باشد`;
  return null;
}

/** اعتبارسنجی ویرایش خبر (دبیر/سردبیر) */
export function validateNewsManagePayload(body = {}) {
  const L = NEWS_FIELD_LIMITS;
  return (
    validatePlainTextLength(body.cleaned_text, L.cleanedText, "متن خبر") ||
    validatePlainTextLength(body.summary, L.summary, "خلاصه") ||
    validateLength(body.status_note, L.statusNote, "توضیح") ||
    validateLength(body.source, L.source, "منبع") ||
    validateLength(body.source_url, L.sourceUrl, "لینک منبع")
  );
}

/** خلاصهٔ واقعی نوشته نشده — خالی یا فقط با «… ادامه» / «ادامه» پایان یافته */
export function isNewsSummaryPlaceholder(summaryPlain = "") {
  const s = String(summaryPlain ?? "").trim();
  if (!s) return true;
  const tail = s.replace(/[\s.…·\-—]+$/gu, "").trim();
  return NEWS_SUMMARY_CONTINUATION_RE.test(tail);
}

/** متن خبر بلند است و هنوز خلاصهٔ واقعی ندارد */
export function needsNewsSummaryAttention(cleanedPlain = "", summaryPlain = "", threshold = DEFAULT_SUMMARIZE_CHAR_THRESHOLD) {
  const textLen = String(cleanedPlain ?? "").trim().length;
  const limit = Number.isFinite(Number(threshold)) ? Number(threshold) : DEFAULT_SUMMARIZE_CHAR_THRESHOLD;
  if (textLen <= limit) return false;
  return isNewsSummaryPlaceholder(summaryPlain);
}

/**
 * خبر فوری با متن بلند باید خلاصه داشته باشد.
 * @param {{ cleaned_text?: string, summary?: string, priority?: number }} body
 * @param {number} [threshold]
 */
export function validateHighPrioritySummaryRequired(body = {}, threshold = DEFAULT_SUMMARIZE_CHAR_THRESHOLD) {
  if (Number(body.priority) !== 1) return null;
  const textLen = plainTextLength(body.cleaned_text ?? "");
  const limit = Number.isFinite(Number(threshold)) ? Number(threshold) : DEFAULT_SUMMARIZE_CHAR_THRESHOLD;
  if (textLen <= limit) return null;
  const summaryPlain = stripHtml(body.summary ?? "").trim();
  if (!isNewsSummaryPlaceholder(summaryPlain)) return null;
  return `خبر «فوری» با بیش از ${limit} کاراکتر باید خلاصه داشته باشد. لطفاً با هوش‌افزار یا به‌صورت دستی در جعبه «خلاصه خبر» خلاصه بنویسید.`;
}
