import { extractPlainForCleaning } from "./newsIngest/newsIngestPipeline.js";
import { cleanNewsPlainText } from "./newsIngest/newsPatternCleaner.js";
import { listEnabledPatternsCompiled } from "./newsCleanPatternService.js";
import { ingestRawToCleanedHtml } from "./newsFormat/index.js";
import { isLikelyHtml, sanitizeHtmlAllowlist } from "./newsFormat/htmlUtils.js";

/** قالب‌بندی عمدی ویرایشگر (رنگ/اندازه/بولد/تیتر/لیست) که نباید در پاکسازی از بین برود */
function hasRichEditorFormatting(html = "") {
  const s = String(html || "");
  return (
    /<(?:span|font)[^>]*(?:style|color|size)\s*=/i.test(s)
    || /<(?:strong|b|u|em|i|s|strike|h2|h3|ul|ol)[\s>]/i.test(s)
  );
}

/** پاکسازی متن/HTML تحلیل کوتاه با الگوهای پاکسازی خبر */
export async function cleanBriefSubmissionContent(htmlOrText) {
  const raw = String(htmlOrText ?? "").trim();
  if (!raw) return "";

  // HTML قالب‌بندی‌شده از ویرایشگر: تخت نکن — فقط allowlist امن
  // (تخت‌کردن باعث حذف رنگ/اندازه/بولد اعمال‌شده توسط تحلیل‌گر می‌شد)
  if (isLikelyHtml(raw) && hasRichEditorFormatting(raw)) {
    // #region agent log
    try {
      const { default: fs } = await import("fs");
      fs.appendFileSync(
        "c:/workspace/report-system/debug-6de48a.log",
        `${JSON.stringify({ sessionId: "6de48a", runId: "post-fix", hypothesisId: "L", location: "briefContentCleaner.js:cleanBriefSubmissionContent", message: "rich html kept via allowlist (no flatten)", data: { len: raw.length, hasColor: /color/i.test(raw), hasSize: /font-size|size\s*=/i.test(raw) }, timestamp: Date.now() })}\n`,
      );
    } catch (_) { /* ignore */ }
    // #endregion
    return sanitizeHtmlAllowlist(raw);
  }

  const plain = extractPlainForCleaning(raw);
  if (!plain.trim()) return raw;

  const patterns = await listEnabledPatternsCompiled();
  const { text } = cleanNewsPlainText(plain, patterns);
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return raw;

  return ingestRawToCleanedHtml(cleaned, "manual");
}
