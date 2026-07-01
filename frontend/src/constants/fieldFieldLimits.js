/**
 * محدودیت کاراکتر فرم‌های گزارش میدانی — برای تغییر فقط این فایل را ویرایش کنید.
 * (جدا از newsFieldLimits.js که مخصوص ماژول اخبار است.)
 */
export const DEFAULT_DAILY_SUBMISSION_LIMIT = 10;

export const FIELD_FIELD_LIMITS = {
  short: 80,
  monitorTitle: 110,
  monitorText: 1050,
  adminNote: 150,
  managerComment: 150,
  unitTitle: 210,
  unitContent: 1000,
  unitShort: 200,
  unitLong: 2000,
};

export function validateLength(value, max, label) {
  if (value == null || value === "") return null;
  if (String(value).length > max) return `${label} حداکثر ${max} کاراکتر باشد`;
  return null;
}

/** @param {{ edit?: boolean }} opts — edit: محدودیت ویرایش (unitShort/unitLong) */
export function validateUnitReportPayload(body = {}, { edit = false } = {}) {
  const L = FIELD_FIELD_LIMITS;
  const titleMax = edit ? L.unitShort : L.unitTitle;
  const textMax = edit ? L.unitLong : L.unitContent;
  return (
    validateLength(body.title, titleMax, "عنوان") ||
    validateLength(body.text, textMax, "متن گزارش")
  );
}
