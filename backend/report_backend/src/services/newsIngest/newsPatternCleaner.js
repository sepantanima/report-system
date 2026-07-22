import { compilePatternRow } from "./newsPatternCompiler.js";
import { DEFAULT_SUMMARIZE_CHAR_THRESHOLD } from "../../constants/newsFieldLimits.js";

/** الگوهای ساختاری ثابت — معادل n8n Node 11 */
const BUILTIN_REGEX = [
  /با این کانال.*?👇/giu,
  /به کانال.*?بپیوندید.*?👇/giu,
  /آخرین اخبار.*?👇/giu,
  /اخبار فوری.*?👇/giu,
  /روی عضویت کلیک کنید/giu,
  /\|?\s*akharinkhabar\.ir/giu,
  /FilimoSchool\.com/giu,
  /khabarmohem\.ir/giu,
  /\bkhabarfoori\.com\b/giu,
  /\bble\.ir\/join\/[A-Za-z0-9_-]+\b/giu,
  /\*?\s*ble\.ir\/join\/[A-Za-z0-9]+\s*(?:ble\.ir\/join\/[A-Za-z0-9]+\s*)+\*?/giu,
  /[ـ\-_=]{5,}\s*نیوز/giu,
  /\[کانال\s*ایتا\s*خبرنامه\s*تهران\]/giu,
  /\[کانال\s*تلگرام\s*خبرنامه\s*تهران\]/giu,
  /\[کانال\s*روبیکا\s*خبرنامه\s*تهران\]/giu,
  /\(\s*\[کانال\s*روبیکا\s*خبرنامه\s*تهران\]\s*\)/giu,
  /@Artesh_Mardomi/giu,
  /@KhabarFuri/giu,
  /@khbar1fori/giu,
  /قدس نیوز/giu,
  /صابرین نیوز.*?👇/giu,
  /پدرفتنه/giu,
  /ایرانِ‌بیدار/giu,
  /┄┅═✧.*?✧═┅┄/giu,
  /\|\s*\|/giu,
  /\|\s*Link\b/giu,
  /به ثانیه، به دقیقه باخبر باش/giu,
  /(?:\(\s*){2,}/gu,
  /(?:\)\s*){2,}/gu,
  /[ـ]{2,}/giu,
  /\s*نیوز\s*/giu,
  /\[?\s*کانال\s*ایتا\s*خبرنامه\s*(?:تهران)?\s*\]?/giu,
  /\[?\s*کانال\s*روبیکا\s*خبرنامه\s*(?:تهران)?\s*\]?/giu,
  /\[?\s*کانال\s*تلگرام\s*خبرنامه\s*(?:تهران)?\s*\]?/giu,
  /\(\s*کانال\s*ایتا\s*خبرنامه\s*(?:تهران)?\s*\)/giu,
  /\(\s*کانال\s*روبیکا\s*خبرنامه\s*(?:تهران)?\s*\)/giu,
  /\(\s*کانال\s*تلگرام\s*خبرنامه\s*(?:تهران)?\s*\)/giu,
  /ما را در سایت و تلگرام اسپوتنیک دنبال کنید/giu,
  /─+\s*منبع:.*?زمان:\s*[\d۰-۹]{1,2}:[\d۰-۹]{2}\s*\|\s*[\d۰-۹]{4}\/[\d۰-۹]{1,2}\/[\d۰-۹]{1,2}/giu,
  /(کانال\s*ایتا\s*خبرنامه|کانال\s*روبیکا\s*خبرنامه|کانال\s*تلگرام\s*خبرنامه)/giu,
  /https?:\/\/[^\s]+/giu,
  /www\.[^\s]+/giu,
];

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
const ALL_HASHTAG_REGEX = /#[\w\u0600-\u06FF_‌]+/gu;

export function buildNewsSummary(text, threshold = DEFAULT_SUMMARIZE_CHAR_THRESHOLD) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  const limit = Number.isFinite(Number(threshold)) ? Number(threshold) : DEFAULT_SUMMARIZE_CHAR_THRESHOLD;
  return s.length > limit ? `${s.slice(0, limit)}… ادامه` : s;
}

function normalizeZwnj(text) {
  return String(text ?? "")
    .replace(/\u200c+/g, "\u200c")
    .replace(/\s*\u200c\s*/g, "\u200c")
    .replace(/\u200c{2,}/g, "\u200c");
}

/** حذف تگ‌های HTML با حفظ خطوط (برخلاف stripHtml که فاصله‌ها را یکدست می‌کند) */
export function stripHtmlKeepNewlines(text) {
  return String(text ?? "")
    .replace(/&lt;(\/?)\s*p\s*&gt;/gi, "<$1p>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function finalWhitespaceCleanup(text) {
  return String(text ?? "")
    .replace(/^\s*<\/?p>\s*/i, "")
    .replace(/\s*<\/?p>\s*$/i, "")
    .replace(/<\/?p>/gi, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cloneRegex(rx) {
  return new RegExp(rx.source, rx.flags);
}

function testRegex(rx, text) {
  const r = cloneRegex(rx);
  return r.test(text);
}

/**
 * @param {string} text
 * @param {RegExp} regex
 * @param {'phrase'|'line'} removeMode
 */
export function applyPatternRemove(text, regex, removeMode = "phrase") {
  if (removeMode === "line") {
    const lines = String(text ?? "").split("\n");
    let matched = false;
    const kept = lines.filter((line) => {
      if (testRegex(regex, line)) {
        matched = true;
        return false;
      }
      return true;
    });
    return { text: kept.join("\n"), matched };
  }

  const matched = testRegex(regex, text);
  const r = cloneRegex(regex);
  return { text: String(text ?? "").replace(r, ""), matched };
}

/**
 * @param {string} text
 * @param {Array<{ id?: number, phrase?: string, match_kind?: string, is_regex?: boolean, remove_mode?: string, regex?: RegExp }>} [dynamicPatterns]
 * @param {{ summarizeThreshold?: number }} [options]
 */
export function cleanNewsPlainText(text, dynamicPatterns = [], options = {}) {
  const summarizeThreshold = options.summarizeThreshold ?? DEFAULT_SUMMARIZE_CHAR_THRESHOLD;
  let result = stripHtmlKeepNewlines(text);
  const removedBuiltin = [];
  const removedPatternIds = [];

  for (const rx of BUILTIN_REGEX) {
    if (testRegex(rx, result)) removedBuiltin.push(rx.toString());
    result = applyPatternRemove(result, rx, "phrase").text;
  }

  for (const row of dynamicPatterns) {
    const rx = row.regex || compilePatternRow(row);
    if (!rx) continue;
    const mode = row.remove_mode === "line" ? "line" : "phrase";
    const applied = applyPatternRemove(result, rx, mode);
    if (applied.matched && row.id != null) removedPatternIds.push(row.id);
    result = applied.text;
  }

  result = result.replace(EMOJI_REGEX, "");
  result = result.replace(ALL_HASHTAG_REGEX, "");
  result = normalizeZwnj(result);
  result = finalWhitespaceCleanup(result);

  return {
    text: result,
    summary: buildNewsSummary(result, summarizeThreshold),
    removedBuiltin,
    removedPatternIds,
  };
}
