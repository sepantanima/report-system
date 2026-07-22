import { stripHtml, toAsciiDigits } from "./newsTextUtils.js";

/** @param {string} str */
export function normalizeForSimilarity(str) {
  let s = stripHtml(String(str ?? ""));
  s = toAsciiDigits(s);
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

/** @param {string} text */
function bigrams(text) {
  const grams = new Set();
  const t = String(text ?? "");
  if (t.length < 2) {
    if (t) grams.add(t);
    return grams;
  }
  for (let i = 0; i < t.length - 1; i++) {
    grams.add(t.slice(i, i + 2));
  }
  return grams;
}

/**
 * ضریب Dice روی bigram — خروجی ۰ تا ۱۰۰
 * @param {string} a
 * @param {string} b
 */
export function similarityPercent(a, b) {
  const na = normalizeForSimilarity(a);
  const nb = normalizeForSimilarity(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const ga = bigrams(na);
  const gb = bigrams(nb);
  if (!ga.size || !gb.size) return 0;

  let intersection = 0;
  for (const g of ga) {
    if (gb.has(g)) intersection += 1;
  }
  const dice = (2 * intersection) / (ga.size + gb.size);
  return Math.round(dice * 100);
}

/**
 * @param {string} title
 * @param {string} text
 */
export function fieldReportCompareText(title, text) {
  const t = normalizeForSimilarity(title);
  const x = normalizeForSimilarity(text);
  if (!t && !x) return "";
  return t && x ? `${t} ${x}` : (t || x);
}
