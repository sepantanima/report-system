import { escapeHtml, isLikelyHtml, sanitizeHtmlAllowlist } from "./newsFormat/htmlUtils.js";
import { messengerToHtml } from "./newsFormat/messengerToHtml.js";
import { htmlToMessenger } from "./newsFormat/htmlToMessenger.js";
import { FORMAT } from "./newsFormat/dialects.js";

function hasMarkdownMarkers(text = "") {
  const s = String(text || "");
  return (
    /(^|\n)\s{0,3}#{1,3}\s+\S/.test(s)
    || /\*\*[^*\n]+\*\*/.test(s)
    || /(^|[^\w*])\*[^*\n]+\*(?!\*)/.test(s)
    || /__[^_\n]+__/.test(s)
    || /(^|\n)\s*[-*•]\s+\S/.test(s)
  );
}

function unwrapCodeFence(raw = "") {
  let s = String(raw || "").trim();
  const m = s.match(/^```[a-zA-Z0-9_-]*\s*\r?\n([\s\S]*?)\r?\n```$/);
  if (m) return m[1].trim();
  // تک‌خطی: ```html ... ```
  const oneLine = s.match(/^```[a-zA-Z0-9_-]*\s+([\s\S]*?)\s*```$/);
  if (oneLine) return oneLine[1].trim();
  return s;
}

function stripTagsToText(html = "") {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * تبدیل خروجی مدل (Markdown / متن ساده / HTML ناقص) به HTML نمایشی.
 * ستاره‌ها و ## به تگ‌های واقعی تبدیل می‌شوند — برای نمایش در UI، نه برای بله.
 *
 * اگر ورودی از قبل HTML باشد، فقط allowlist می‌شود تا استایل‌های امن
 * (color / font-size روی span) هنگام ذخیرهٔ ویرایشگر از بین نروند.
 * تشخیص مارک‌داون فقط برای ورودی غیر‌HTML است.
 */
export function strategyAiTextToHtml(raw) {
  let s = unwrapCodeFence(String(raw ?? "").replace(/\r\n/g, "\n"));
  if (!s) return "";

  if (isLikelyHtml(s)) {
    // #region agent log
    const plain = stripTagsToText(s);
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify({
        sessionId: "6de48a",
        runId: "post-fix",
        hypothesisId: "G",
        location: "strategyContentFormat.js:strategyAiTextToHtml",
        message: "html input uses allowlist only (no md strip)",
        data: {
          hasMdMarkersInPlain: hasMarkdownMarkers(plain),
          hasColorBefore: /color\s*[:=]/i.test(s),
          hasFontSizeBefore: /font-size|size\s*=/i.test(s),
          len: s.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return sanitizeHtmlAllowlist(s);
  }

  const headings = [];
  s = s.replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, title) => {
    const idx = headings.length;
    headings.push({ level: hashes.length, title: String(title || "").trim() });
    return `\n\n@@STRAT_H${idx}@@\n\n`;
  });

  s = s.replace(/^(?:[-*•])\s+(.+)$/gm, (_, item) => `• ${item.trim()}`);

  let html = messengerToHtml(s, "auto");

  headings.forEach((h, i) => {
    const tag = h.level >= 3 ? "h3" : "h2";
    const block = `<${tag}>${escapeHtml(h.title)}</${tag}>`;
    html = html.replace(new RegExp(`<p>\\s*@@STRAT_H${i}@@\\s*</p>`, "g"), block);
    html = html.replace(new RegExp(`@@STRAT_H${i}@@`, "g"), block);
  });

  html = html.replace(/<p>\s*•\s*/g, "<p>• ");
  return sanitizeHtmlAllowlist(html.replace(/\n{3,}/g, "\n\n").trim());
}

export function ensureStrategyHtml(htmlOrText) {
  const src = String(htmlOrText ?? "").trim();
  if (!src) return "";
  return strategyAiTextToHtml(src);
}

export function strategyHtmlToPlain(htmlOrText) {
  return stripTagsToText(htmlOrText);
}

/** فقط برای ارسال بله — HTML نمایشی → مارک‌داون بله */
export function strategyHtmlToBaleMarkdown(htmlOrText) {
  const html = ensureStrategyHtml(htmlOrText);
  if (!html) return "";
  return htmlToMessenger(html, FORMAT.BALE);
}

export function strategyPreviewHtml(htmlOrText, maxChars = 280) {
  const html = ensureStrategyHtml(htmlOrText);
  if (!html) return "";
  const plain = strategyHtmlToPlain(html);
  if (plain.length <= maxChars) return html;
  const short = `${plain.slice(0, maxChars)}…`;
  return `<p>${escapeHtml(short)}</p>`;
}

/** راهنمای ثابت برای مدل: HTML بده، Markdown نده */
export const STRATEGY_HTML_OUTPUT_HINT = [
  "======= قالب خروجی الزامی =======",
  "فقط HTML معتبر برگردان (بدون توضیح اضافه، بدون بلوک ```).",
  "تگ‌های مجاز: h2, h3, p, br, strong, em, u, ul, li, span (با style فقط color و font-size)",
  "ممنوع: Markdown مثل ## یا ** یا * برای بولد/تیتر",
  "تیتر: <h2>عنوان</h2>",
  "تاکید: <strong>متن</strong>",
  "پاراگراف: <p>متن</p>",
].join("\n");
