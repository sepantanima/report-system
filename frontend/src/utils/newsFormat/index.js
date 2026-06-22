import { FORMAT, SOURCE_PLATFORM, normalizeFormat, normalizeSourcePlatform } from "./dialects.js";
import { isLikelyHtml, astToHtml, htmlToAst } from "./htmlUtils.js";
import { messengerToHtml } from "./messengerToHtml.js";
import { htmlToMessenger, htmlToPlainFromContent } from "./htmlToMessenger.js";

export { FORMAT, SOURCE_PLATFORM, normalizeFormat, normalizeSourcePlatform };
export { messengerToHtml, htmlToMessenger, htmlToPlainFromContent, isLikelyHtml };

/**
 * تشخیص heuristic پلتفرم برای ingest
 * @param {string} text
 */
export function detectSourcePlatform(text) {
  const s = String(text ?? "");
  if (isLikelyHtml(s)) return SOURCE_PLATFORM.MANUAL;
  if (/__[^_]+__/.test(s)) return SOURCE_PLATFORM.TELEGRAM;
  if (/\*[^*\n]+\*/.test(s) || /_[^_\n]+_/.test(s) || /`[^`\n]+`/.test(s)) {
    return SOURCE_PLATFORM.BALE;
  }
  return SOURCE_PLATFORM.MANUAL;
}

/**
 * @param {string} text
 * @param {{ from?: string, to?: string, platform?: string }} opts
 */
export function convertNewsText(text, opts = {}) {
  const from = normalizeFormat(opts.from) || (isLikelyHtml(text) ? FORMAT.HTML : FORMAT.PLAIN);
  const to = normalizeFormat(opts.to);
  if (!to) throw new Error("فرمت مقصد نامعتبر است");

  let html = text;
  if (from === FORMAT.BALE || from === FORMAT.TELEGRAM) {
    const plat = from === FORMAT.BALE ? SOURCE_PLATFORM.BALE : SOURCE_PLATFORM.TELEGRAM;
    html = messengerToHtml(text, plat);
  } else if (from === FORMAT.PLAIN) {
    html = messengerToHtml(text, opts.platform || SOURCE_PLATFORM.AUTO);
    if (!isLikelyHtml(html) && String(text).trim()) {
      html = `<p>${String(text).replace(/\n/g, "<br>")}</p>`;
    }
  } else if (from === FORMAT.HTML) {
    html = String(text ?? "");
  }

  if (to === FORMAT.HTML) return html;
  if (to === FORMAT.PLAIN) return htmlToPlainFromContent(html);
  if (to === FORMAT.BALE) return htmlToMessenger(html, FORMAT.BALE);
  if (to === FORMAT.TELEGRAM) return htmlToMessenger(html, FORMAT.TELEGRAM);

  throw new Error("تبدیل پشتیبانی نمی‌شود");
}

/**
 * ingest: raw messenger → cleaned HTML
 * @param {string} rawText
 * @param {string} [sourcePlatform]
 */
export function ingestRawToCleanedHtml(rawText, sourcePlatform = SOURCE_PLATFORM.AUTO) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return "";

  if (isLikelyHtml(raw)) return raw;

  const plat = normalizeSourcePlatform(sourcePlatform) || SOURCE_PLATFORM.AUTO;
  const resolved = plat === SOURCE_PLATFORM.AUTO ? detectSourcePlatform(raw) : plat;

  if (resolved === SOURCE_PLATFORM.MANUAL) {
    return `<p>${raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;
  }

  return messengerToHtml(raw, resolved);
}

/**
 * export cleaned_text به فرمت bot
 * @param {string} cleanedText
 * @param {string} format
 */
export function exportCleanedText(cleanedText, format) {
  const fmt = normalizeFormat(format);
  if (!fmt) throw new Error("format نامعتبر است");

  const src = String(cleanedText ?? "");
  if (fmt === FORMAT.HTML) return src;
  if (fmt === FORMAT.PLAIN) return htmlToPlainFromContent(src);
  if (fmt === FORMAT.BALE) return htmlToMessenger(src, FORMAT.BALE);
  if (fmt === FORMAT.TELEGRAM) return htmlToMessenger(src, FORMAT.TELEGRAM);

  throw new Error("format نامعتبر است");
}
