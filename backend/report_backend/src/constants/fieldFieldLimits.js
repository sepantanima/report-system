export const FIELD_FIELD_LIMITS = {
  short: 80,
  monitorTitle: 110,
  monitorText: 1050,
  adminNote: 150,
  managerComment: 150,
  unitTitle: 210,
  unitContent: 2050,
  unitShort: 200,
  unitLong: 2000,
};

export function validateLength(value, max, label) {
  if (value == null || value === "") return null;
  if (String(value).length > max) return `${label} حداکثر ${max} کاراکتر باشد`;
  return null;
}

export function validateMonitorVerifyPayload(body = {}) {
  const L = FIELD_FIELD_LIMITS;
  return (
    validateLength(body.title, L.monitorTitle, "عنوان") ||
    validateLength(body.cleaned_text, L.monitorText, "متن نهایی") ||
    validateLength(body.admin_note, L.adminNote, "یادداشت مدیریت") ||
    validateLength(body.manager_comment, L.managerComment, "علت برگشت")
  );
}

export function validateUnitReportPayload(body = {}, { edit = false } = {}) {
  const L = FIELD_FIELD_LIMITS;
  const titleMax = edit ? L.unitShort : L.unitTitle;
  const textMax = edit ? L.unitLong : L.unitContent;
  return (
    validateLength(body.title, titleMax, "عنوان") ||
    validateLength(body.text, textMax, "متن گزارش")
  );
}
