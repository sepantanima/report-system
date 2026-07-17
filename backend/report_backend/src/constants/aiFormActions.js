import { isRegisteredFormAction } from "./aiFormRegistry.js";

/** استراتژی‌های مونتاژ؛ مقدار جدید فقط unified_v1 — بقیه برای ردیف‌های قدیمی دیتابیس */
export const AI_ASSEMBLY_STRATEGIES = ["unified_v1", "labeled_fields", "field_management_summary_v1", "news_editorial_v1"];

export const FORM_AI_NAMES = {
  FIELD_MANAGEMENT_SUMMARY_CREATE: "field_management_summary_create",
  ACTION_GENERATE_SUMMARY: "generate_summary",
};

const NAME_RE = /^[a-z0-9_]{1,120}$/;

export function validateFormActionName(name) {
  return typeof name === "string" && NAME_RE.test(name);
}

export function validateFormDataObject(formData) {
  if (formData == null || typeof formData !== "object" || Array.isArray(formData)) {
    return "form_data باید یک آبجکت باشد";
  }
  try {
    const s = JSON.stringify(formData);
    if (s.length > 400_000) return "حجم form_data بیش از حد مجاز است";
  } catch {
    return "form_data قابل سریال‌سازی نیست";
  }
  return null;
}

export function validateAiFormActionBody(body = {}, isUpdate = false) {
  const fn = body.form_name != null ? String(body.form_name).trim() : "";
  const an = body.action_name != null ? String(body.action_name).trim() : "";
  if (!isUpdate) {
    if (!validateFormActionName(fn)) return "form_name نامعتبر است";
    if (!validateFormActionName(an)) return "action_name نامعتبر است";
  } else {
    if (fn && !validateFormActionName(fn)) return "form_name نامعتبر است";
    if (an && !validateFormActionName(an)) return "action_name نامعتبر است";
  }
  if (fn && an && !isRegisteredFormAction(fn, an)) {
    return "این نام فرم یا نام دکمه در نسخهٔ فعلی برنامه تعریف نشده است. فقط ترکیب‌هایی که در کد ثبت شده‌اند مجازند؛ از پنل فقط همان موارد را انتخاب کنید یا با توسعه‌دهنده برای افزودن فرم/دکمهٔ جدید هماهنگ کنید.";
  }
  if (body.assembly_strategy != null && !AI_ASSEMBLY_STRATEGIES.includes(String(body.assembly_strategy).trim())) {
    return "assembly_strategy نامعتبر است";
  }
  const aid = body.ai_config_id;
  const hasId = aid != null && aid !== "" && Number.isFinite(parseInt(aid, 10));
  const uk = body.usage_key != null && String(body.usage_key).trim();
  if (!isUpdate && !hasId && !uk) {
    return "حداقل یکی از ai_config_id یا usage_key الزامی است";
  }
  if (body.source_fields != null && !Array.isArray(body.source_fields)) {
    return "source_fields باید آرایه باشد";
  }
  const needsPromptKey = !!(fn && an && isRegisteredFormAction(fn, an));
  if (needsPromptKey && !String(body.prompt_key || "").trim()) {
    return "برای این اکشن باید یک پرامپت از رجیستری انتخاب شود";
  }
  return null;
}
