/** قالب‌های پشتیبانی‌شده برای تبدیل متن اخبار */
export const FORMAT = {
  HTML: "html",
  PLAIN: "plain",
  BALE: "bale",
  TELEGRAM: "telegram",
};

export const SOURCE_PLATFORM = {
  BALE: "bale",
  TELEGRAM: "telegram",
  MANUAL: "manual",
  AUTO: "auto",
};

/** کاراکترهایی که در Telegram MarkdownV2 باید escape شوند (خارج از entity) */
export const TELEGRAM_MDV2_ESCAPE_RE = /[_*[\]()~`>#+\-=|{}.!\\]/g;

/** نگاشت underline در بله: از _italic_ استفاده می‌شود اگر underline جدا پشتیبانی نشود */
export const BALE_UNDERLINE_AS_ITALIC = true;

export function normalizeFormat(fmt) {
  const f = String(fmt || "").trim().toLowerCase();
  if (f === "bale" || f === "bale_markdown") return FORMAT.BALE;
  if (f === "telegram" || f === "telegram_markdownv2" || f === "telegram_md2") return FORMAT.TELEGRAM;
  if (f === "html") return FORMAT.HTML;
  if (f === "plain" || f === "text") return FORMAT.PLAIN;
  return null;
}

export function normalizeSourcePlatform(p) {
  const s = String(p || "").trim().toLowerCase();
  if (s === "bale") return SOURCE_PLATFORM.BALE;
  if (s === "telegram" || s === "tg") return SOURCE_PLATFORM.TELEGRAM;
  if (s === "manual" || s === "web") return SOURCE_PLATFORM.MANUAL;
  if (s === "auto" || !s) return SOURCE_PLATFORM.AUTO;
  return null;
}
