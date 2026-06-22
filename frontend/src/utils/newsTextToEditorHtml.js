import { ingestRawToCleanedHtml } from "./newsFormat/index.js";

/** تبدیل متن/HTML/مارک‌داون به HTML برای نمایش در ویرایشگر */
export function newsTextToEditorHtml(text, sourcePlatform = "auto") {
  return ingestRawToCleanedHtml(text, sourcePlatform);
}
