import { decodeHtmlEntities } from "../constants/analysisFieldLimits.js";
import { normalizeNewsDisplayEntities } from "./newsDisplayHtml.js";
import { ingestRawToCleanedHtml, isLikelyHtml } from "./newsFormat/index.js";

/** تبدیل متن/HTML/مارک‌داون به HTML برای نمایش در ویرایشگر */
export function newsTextToEditorHtml(text, sourcePlatform = "auto") {
  return ingestRawToCleanedHtml(text, sourcePlatform);
}

/** نرمال‌سازی cleaned_text / summary برای بارگذاری در RichTextEditor */
export function newsContentToEditorHtml(text, sourcePlatform = "auto") {
  const src = String(text ?? "").trim();
  if (!src) return "";
  if (isLikelyHtml(src)) return normalizeNewsDisplayEntities(src);
  return ingestRawToCleanedHtml(decodeHtmlEntities(src), sourcePlatform);
}
