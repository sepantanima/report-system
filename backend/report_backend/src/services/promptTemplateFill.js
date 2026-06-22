/**
 * جایگزینی امن placeholder در قالب پرامپت.
 * توکن مجاز: {{VAR}} با VAR = حروف بزرگ/عدد/_ ، یا {{FORM_field}} با field از whitelist.
 */

const INNER_TOKEN_RE = /^([A-Z][A-Z0-9_]*|FORM_[a-zA-Z0-9_]+)$/;

/** تشخیص وجود حداقل یک placeholder با قالب پشتیبانی‌شده */
export function templateHasPlaceholders(template) {
  if (template == null || String(template) === "") return false;
  return /\{\{([A-Z][A-Z0-9_]*|FORM_[a-zA-Z0-9_]+)\}\}/.test(String(template));
}

/**
 * @param {string} template
 * @returns {string[]} نام‌های یکتا داخل {{...}} (بدون براکت)
 */
export function collectPlaceholderNames(template) {
  const s = String(template);
  const names = new Set();
  const re = /\{\{([A-Z][A-Z0-9_]*|FORM_[a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (INNER_TOKEN_RE.test(m[1])) names.add(m[1]);
  }
  return [...names];
}

/**
 * فقط کلیدهای موجود در vars جایگزین می‌شوند.
 * @param {string} template
 * @param {Record<string, string|number|boolean|null|undefined>} vars
 */
export function fillTemplateSafe(template, vars) {
  let out = String(template);
  for (const [k, v] of Object.entries(vars || {})) {
    if (!INNER_TOKEN_RE.test(k)) continue;
    const token = `{{${k}}}`;
    out = out.split(token).join(String(v ?? ""));
  }
  return out;
}

/**
 * توکن‌هایی که هنوز به شکل {{...}} در متن مانده‌اند.
 * @param {string} filled
 * @returns {string[]}
 */
export function findUnfilledPlaceholders(filled) {
  const s = String(filled);
  const left = [];
  const re = /\{\{([A-Z][A-Z0-9_]*|FORM_[a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (INNER_TOKEN_RE.test(m[1])) left.push(m[0]);
  }
  return left;
}
