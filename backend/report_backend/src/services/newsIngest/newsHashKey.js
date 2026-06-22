/** FNV-1a — هم‌راستا با n8n */
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  const s = String(str ?? "");
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * @param {string} cleanedPlain متن ساده پاک‌شده
 * @param {string} source منبع خبر
 */
export function computeNewsHashKey(cleanedPlain, source) {
  const text = String(cleanedPlain ?? "").trim();
  const src = String(source ?? "unknown").trim() || "unknown";
  if (!text) return null;
  return fnv1a(`${text}||${src}`);
}
