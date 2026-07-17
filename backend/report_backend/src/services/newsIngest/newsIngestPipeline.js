import { ingestRawToCleanedHtml } from "../newsFormat/index.js";
import { cleanNewsPlainText, stripHtmlKeepNewlines } from "./newsPatternCleaner.js";
import { computeNewsHashKey } from "./newsHashKey.js";
import { listEnabledPatternsCompiled } from "../newsCleanPatternService.js";
import { getNewsEntrySettings } from "../newsEntrySettingsService.js";

/**
 * استخراج متن ساده برای پاکسازی
 * @param {string} rawText
 */
export function extractPlainForCleaning(rawText) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return "";
  // همیشه تگ‌ها (از جمله <p> و &lt;p&gt;) را حذف کن تا در cleaned plain نمانند
  return stripHtmlKeepNewlines(raw).replace(/[ \t]+\n/g, "\n").trim();
}

/**
 * @param {{ rawText: string, source: string, sourcePlatform?: string, dynamicPatterns?: Array, summarizeThreshold?: number }} params
 */
export async function buildCleanedFromRaw({
  rawText,
  source,
  sourcePlatform = "manual",
  dynamicPatterns,
  summarizeThreshold,
}) {
  const raw = String(rawText ?? "").trim();
  const plain = extractPlainForCleaning(raw);
  const patterns = dynamicPatterns ?? await listEnabledPatternsCompiled();
  const threshold = summarizeThreshold ?? (await getNewsEntrySettings()).summarize_char_threshold;
  const cleaned = cleanNewsPlainText(plain, patterns, { summarizeThreshold: threshold });
  const cleanedHtml = ingestRawToCleanedHtml(cleaned.text, sourcePlatform);

  return {
    raw_text: raw,
    cleaned_text: cleanedHtml,
    cleaned_plain: cleaned.text,
    summary: cleaned.summary,
    char_count: cleaned.text.length,
    hash_key: computeNewsHashKey(cleaned.text, source),
    removed_builtin: cleaned.removedBuiltin,
    removed_pattern_ids: cleaned.removedPatternIds,
  };
}
