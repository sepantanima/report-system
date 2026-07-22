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
    form_name: "news_smart_analysis",
    actions: ["analyze_overview", "analyze_thematic", "analyze_trends", "analyze_risk", "analyze_custom"],
  },
  {
    form_name: "news_editorial_batch",
    actions: ["run_editorial"],
  },
  {
    form_name: "strategy_command_outputs",
    actions: ["generate_soft_war_annex", "generate_from_strategy_prompt"],
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

/** پالایش هوشمند اخبار — بدنهٔ پرامپت فقط سیاست دبیری؛ بقیه در سرور مونتاژ می‌شود */
export function isNewsEditorialRunAction(formName, actionName) {
  const fn = String(formName || "").trim();
  const an = String(actionName || "").trim();
  return fn === "news_editorial_batch" && an === "run_editorial";
}
