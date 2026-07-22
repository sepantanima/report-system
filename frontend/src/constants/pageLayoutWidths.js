/** عرض پیش‌فرض صفحات — ~۷۰٪ بیشتر از مقادیر اولیه (×۱.۷) */

export const PAGE_LAYOUT_SCALE = 1.7;

export function scalePageWidth(px) {
  return Math.round(px * PAGE_LAYOUT_SCALE);
}

export const PAGE_WIDE_MAX = scalePageWidth(1100);
export const PAGE_NARROW_MAX = scalePageWidth(640);
export const PAGE_ADMIN_MAX = scalePageWidth(1200);
export const PAGE_MESSAGE_MAX = scalePageWidth(920);
export const PAGE_MEDIUM_MAX = scalePageWidth(720);
export const PAGE_CONTENT_MAX = scalePageWidth(800);
export const PAGE_REPORT_MAX = scalePageWidth(1000);
export const PAGE_SETTINGS_WIDE_MAX = scalePageWidth(960);
export const PAGE_SETTINGS_SECTION_MAX = scalePageWidth(900);
export const PAGE_CHANNEL_MAX = scalePageWidth(760);

/** صفحه RBAC — عرض بیشتر برای دو ستون نقش/مجوز */
export const PAGE_RBAC_MAX = scalePageWidth(1500);
export const PAGE_RBAC_CSS = `min(${PAGE_RBAC_MAX}px, 99vw)`;
export const PAGE_RBAC_PX = `${PAGE_RBAC_MAX}px`;

export const PAGE_WIDE_CSS = `min(${PAGE_WIDE_MAX}px, 96vw)`;
export const PAGE_NARROW_CSS = `min(${PAGE_NARROW_MAX}px, 94vw)`;
export const PAGE_MESSAGE_CSS = `min(96vw, ${PAGE_MESSAGE_MAX}px)`;
export const PAGE_SETTINGS_WIDE_CSS = `min(96vw, ${PAGE_SETTINGS_WIDE_MAX}px)`;
export const PAGE_WIDE_PX = `${PAGE_WIDE_MAX}px`;
export const PAGE_ADMIN_PX = `${PAGE_ADMIN_MAX}px`;
export const PAGE_MEDIUM_PX = `${PAGE_MEDIUM_MAX}px`;
export const PAGE_CONTENT_PX = `${PAGE_CONTENT_MAX}px`;
export const PAGE_NARROW_PX = `${PAGE_NARROW_MAX}px`;
