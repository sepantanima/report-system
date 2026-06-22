/**
 * فرم‌ها و اکشن‌هایی که برنامه در کد به آن‌ها وصل است.
 * برای افزودن فرم/دکمهٔ جدید، توسعه‌دهنده همینجا و mirror فرانت `frontend/src/constants/aiFormNames.js` (REGISTERED_FORM_AI_ACTIONS) را به‌روز کند.
 */
export const REGISTERED_FORM_ACTION_KEYS = [
  {
    form_name: "field_management_summary_create",
    actions: ["generate_summary"],
  },
  {
    form_name: "news_monitor_manage",
    actions: ["summarize_text"],
  },
  {
    form_name: "sample_form",
    actions: ["sample_summarize", "sample_secure"],
  },
];

export function isRegisteredFormAction(formName, actionName) {
  const fn = String(formName || "").trim();
  const an = String(actionName || "").trim();
  const entry = REGISTERED_FORM_ACTION_KEYS.find((x) => x.form_name === fn);
  return !!(entry && entry.actions.includes(an));
}

/** اکشن «تولید پیش‌نویس خلاصه میدانی» — مونتاژ داده از گزارش‌ها در سرور؛ بدنهٔ پرامپت از prompt_key کانفیگ خوانده می‌شود */
export function isFieldManagementSummaryGenerateAction(formName, actionName) {
  const fn = String(formName || "").trim();
  const an = String(actionName || "").trim();
  return fn === "field_management_summary_create" && an === "generate_summary";
}
