/** نرمال‌سازی entityهای HTML برای نمایش (داده‌های قدیمی با &amp;nbsp;) */
export function normalizeNewsDisplayEntities(html = "") {
  return String(html ?? "")
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&nbsp;/gi, " ");
}

/**
 * پیش‌نمایش HTML در کارت — فقط cleaned_text / display_html
 */
export function resolveNewsDisplayHtml(item) {
  if (!item) return "";
  if (item.display_html) {
    return normalizeNewsDisplayEntities(String(item.display_html));
  }

  const cleaned = String(item.cleaned_text ?? "").trim();
  if (!cleaned) return "";

  return normalizeNewsDisplayEntities(cleaned);
}
