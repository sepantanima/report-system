const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;

export const MATCH_KINDS = new Set(["auto", "phrase", "domain", "handle", "hashtag", "url_path", "regex"]);
export const REMOVE_MODES = new Set(["phrase", "line"]);

function escapeRegex(s) {
  return String(s).replace(REGEX_ESCAPE, "\\$&");
}

/** @param {string} phrase @param {string} [explicitKind] */
export function detectMatchKind(phrase, explicitKind = "auto") {
  if (explicitKind && explicitKind !== "auto" && MATCH_KINDS.has(explicitKind)) {
    return explicitKind;
  }
  const p = String(phrase ?? "").trim();
  if (!p) return "phrase";
  if (p.startsWith("@")) return "handle";
  if (p.startsWith("#")) return "hashtag";
  if (/ble\.ir\/join/i.test(p)) return "url_path";
  if (/\.(ir|com|net|org)\b/i.test(p)) return "domain";
  return "phrase";
}

/**
 * تبدیل متن ساده مدیر به RegExp
 * @param {string} phrase
 * @param {string} [matchKind]
 * @returns {RegExp|null}
 */
export function compilePhraseToRegExp(phrase, matchKind = "auto") {
  const p = String(phrase ?? "").trim();
  if (!p) return null;

  const kind = detectMatchKind(p, matchKind);

  switch (kind) {
    case "handle":
      return new RegExp(`${escapeRegex(p)}(?:\\b|$)`, "giu");
    case "hashtag": {
      const tag = p.startsWith("#") ? p.slice(1) : p;
      if (!tag) return null;
      return new RegExp(`#[\\w\\u0600-\\u06FF_‌]*${escapeRegex(tag)}\\b`, "giu");
    }
    case "domain": {
      const dom = escapeRegex(p).replace(/\./g, "\\.");
      return new RegExp(`\\|?\\s*${dom}`, "giu");
    }
    case "url_path": {
      const path = escapeRegex(p).replace(/\\\.\.\./g, "[A-Za-z0-9_-]+");
      return new RegExp(`\\b${path}`, "giu");
    }
    case "phrase":
    default: {
      const flex = escapeRegex(p).replace(/\s+/g, "\\s*");
      return new RegExp(
        `(?:\\[\\s*)?(?:\\(\\s*)?${flex}(?:\\s*\\))?(?:\\s*\\])?`,
        "giu",
      );
    }
  }
}

/**
 * تبدیل رشته regex دستی کاربر
 * @param {string} pattern
 * @returns {RegExp|null}
 */
export function compileRawRegex(pattern) {
  const p = String(pattern ?? "").trim();
  if (!p) return null;
  try {
    return new RegExp(p, "giu");
  } catch {
    return null;
  }
}

/**
 * @param {{ phrase: string, match_kind?: string, is_regex?: boolean }} row
 */
export function compilePatternRow(row) {
  const phrase = String(row?.phrase ?? "").trim();
  if (!phrase) return null;
  if (row.is_regex) return compileRawRegex(phrase);
  return compilePhraseToRegExp(phrase, row.match_kind);
}
