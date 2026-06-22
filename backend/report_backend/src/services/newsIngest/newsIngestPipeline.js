import { stripHtml } from "../newsTextUtils.js";
import { isLikelyHtml, ingestRawToCleanedHtml } from "../newsFormat/index.js";
import { cleanNewsPlainText } from "./newsPatternCleaner.js";
import { computeNewsHashKey } from "./newsHashKey.js";
import { listEnabledPatternsCompiled } from "../newsCleanPatternService.js";

/**
 * استخراج متن ساده برای پاکسازی
 * @param {string} rawText
 */
export function extractPlainForCleaning(rawText) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return "";
  if (isLikelyHtml(raw)) return stripHtml(raw);
  return raw;
}

/**
 * @param {{ rawText: string, source: string, sourcePlatform?: string, dynamicPatterns?: Array }} params
 */
export async function buildCleanedFromRaw({
  rawText,
  source,
  sourcePlatform = "manual",
  dynamicPatterns,
}) {
  const raw = String(rawText ?? "").trim();
  const plain = extractPlainForCleaning(raw);
  const patterns = dynamicPatterns ?? await listEnabledPatternsCompiled();
  const cleaned = cleanNewsPlainText(plain, patterns);
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
