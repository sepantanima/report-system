import { extractPlainForCleaning } from "./newsIngest/newsIngestPipeline.js";
import { cleanNewsPlainText } from "./newsIngest/newsPatternCleaner.js";
import { listEnabledPatternsCompiled } from "./newsCleanPatternService.js";
import { ingestRawToCleanedHtml } from "./newsFormat/index.js";

/** پاکسازی متن/HTML تحلیل کوتاه با الگوهای پاکسازی خبر */
export async function cleanBriefSubmissionContent(htmlOrText) {
  const raw = String(htmlOrText ?? "").trim();
  if (!raw) return "";

  const plain = extractPlainForCleaning(raw);
  if (!plain.trim()) return raw;

  const patterns = await listEnabledPatternsCompiled();
  const { text } = cleanNewsPlainText(plain, patterns);
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return raw;

  return ingestRawToCleanedHtml(cleaned, "manual");
}
