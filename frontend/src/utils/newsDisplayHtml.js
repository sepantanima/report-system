/**
 * پیش‌نمایش HTML در کارت — فقط cleaned_text / display_html
 */
export function resolveNewsDisplayHtml(item) {
  if (!item) return "";
  if (item.display_html) return String(item.display_html);

  const cleaned = String(item.cleaned_text ?? "").trim();
  if (!cleaned) return "";

  const hasHtml = (s) => /<\/?[a-z][a-z0-9]*[\s>]/i.test(s);
  if (hasHtml(cleaned)) return cleaned;
  return cleaned;
}
