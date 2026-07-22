import { ingestRawToCleanedHtml, isLikelyHtml } from "./newsFormat/index.js";
import { sanitizeHtmlAllowlist } from "./newsFormat/htmlUtils.js";
import { newsContentToEditorHtml } from "./newsTextToEditorHtml.js";

function unwrapCodeFence(raw = "") {
  let s = String(raw || "").trim();
  const m = s.match(/^```[a-zA-Z0-9_-]*\s*\r?\n([\s\S]*?)\r?\n```$/);
  if (m) return m[1].trim();
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

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * محتوای راهبردی را برای نمایش/ویرایشگر به HTML تمیز تبدیل می‌کند.
 * ستاره‌ها و ## مارک‌داون به تگ واقعی تبدیل می‌شوند (نمایش UI، نه بله).
 * ورودی HTML فقط allowlist می‌شود تا color/font-size کاربر حفظ شود.
 */
export function strategyContentToDisplayHtml(htmlOrText = "") {
  const src = unwrapCodeFence(String(htmlOrText ?? "").trim());
  if (!src) return "";

  if (isLikelyHtml(src)) {
    // #region agent log
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify({
        sessionId: "6de48a",
        runId: "post-fix",
        hypothesisId: "G",
        location: "strategyContentFormat.js:strategyContentToDisplayHtml",
        message: "client html path keeps styles via allowlist",
        data: {
          hasColorBefore: /color\s*[:=]/i.test(src),
          hasFontSizeBefore: /font-size|size\s*=/i.test(src),
          hasMdLikeList: /(^|\n)\s*[-*•]\s+\S/.test(stripTagsToText(src)),
          len: src.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return sanitizeHtmlAllowlist(newsContentToEditorHtml(src));
  }
  return strategyMarkdownToHtml(src);
}

export function strategyMarkdownToHtml(raw = "") {
  let s = unwrapCodeFence(String(raw ?? "").replace(/\r\n/g, "\n").trim());
  if (!s) return "";

  const headings = [];
  s = s.replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, title) => {
    const idx = headings.length;
    headings.push({ level: hashes.length, title: String(title || "").trim() });
    return `\n\n@@STRAT_H${idx}@@\n\n`;
  });

  s = s.replace(/^(?:[-*•])\s+(.+)$/gm, (_, item) => `• ${item.trim()}`);

  let html = ingestRawToCleanedHtml(s, "auto");
  headings.forEach((h, i) => {
    const tag = h.level >= 3 ? "h3" : "h2";
    const block = `<${tag}>${escapeHtml(h.title)}</${tag}>`;
    html = html.replace(new RegExp(`<p>\\s*@@STRAT_H${i}@@\\s*</p>`, "g"), block);
    html = html.replace(new RegExp(`@@STRAT_H${i}@@`, "g"), block);
  });
  return sanitizeHtmlAllowlist(html);
}

export function strategyPlainPreview(htmlOrText = "", max = 280) {
  const plain = stripTagsToText(strategyContentToDisplayHtml(htmlOrText));
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}

/** استایل مشترک بدنه HTML راهبردی برای کارت/جزئیات/چاپ */
export const STRATEGY_HTML_BODY_CSS = `
.strategy-html-body { text-align: justify; }
.strategy-html-body h2 { font-size: 1.15em; font-weight: 700; margin: 0.9em 0 0.4em; }
.strategy-html-body h3 { font-size: 1.05em; font-weight: 600; margin: 0.7em 0 0.35em; }
.strategy-html-body p { margin: 0.4em 0; text-align: justify; }
.strategy-html-body strong, .strategy-html-body b { font-weight: 700; }
.strategy-html-body em, .strategy-html-body i { font-style: italic; }
.strategy-html-body u { text-decoration: underline; }
.strategy-html-body s { text-decoration: line-through; }
.strategy-html-body ul, .strategy-html-body ol { margin: 0.4em 0 0.4em 1.2em; padding: 0; }
.strategy-html-body li { margin: 0.2em 0; }
.strategy-card-preview { line-height: 1.7; text-align: justify; }
.strategy-card-preview p, .strategy-card-preview h2, .strategy-card-preview h3 { margin: 0 0 0.25em; font-size: inherit; }
.strategy-card-preview h2, .strategy-card-preview h3, .strategy-card-preview strong, .strategy-card-preview b { font-weight: 700; }
.strategy-card-preview ul, .strategy-card-preview ol { margin: 0.2em 0 0.2em 1em; padding: 0; }
.strategy-card-preview li { margin: 0.1em 0; }
`;
