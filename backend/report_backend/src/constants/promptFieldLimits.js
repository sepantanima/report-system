/** محدودیت فیلدهای رجیستری پرامپت — هم‌نام با فرانت */
export const PROMPT_FIELD_LIMITS = {
  titleFa: 120,
  descriptionFa: 1500,
  body: 5000,
};

export const AI_API_FIELD_LIMITS = {
  titleFa: 120,
  usageKey: 120,
  modelId: 120,
  credentialEnvName: 120,
};

/** فرمت slug ذخیره‌شده به‌عنوان provider_type؛ رجیستری واقعی در جدول tbl_ai_provider_templates است */
const AI_PROVIDER_SLUG_RE = /^[a-z0-9_]{1,80}$/;

/** متن خلاصه ذخیره‌شده در DB */
export const MANAGEMENT_SUMMARY_BODY_MAX = 30000;

export function validateLength(value, max, label) {
  if (value == null || value === "") return null;
  if (String(value).length > max) return `${label} حداکثر ${max} کاراکتر باشد`;
  return null;
}

/** کلید پرامپت در DB — فقط حروف کوچک انگلیسی، اعداد، نقطه و زیرخط */
const PROMPT_KEY_RE = /^[a-z][a-z0-9._]{0,254}$/;

export function validatePromptKey(promptKey) {
  const k = promptKey != null ? String(promptKey).trim() : "";
  if (!k) return "کلید پرامپت الزامی است";
  if (k.length > 255) return "کلید پرامپت حداکثر ۲۵۵ کاراکتر";
  if (!PROMPT_KEY_RE.test(k)) {
    return "کلید باید با حرف کوچک انگلیسی شروع شود و فقط a-z و 0-9 و . و _ داشته باشد";
  }
  return null;
}

export function validatePromptUpsert(body = {}) {
  const L = PROMPT_FIELD_LIMITS;
  return (
    validateLength(body.title_fa, L.titleFa, "عنوان") ||
    validateLength(body.description_fa, L.descriptionFa, "توضیحات") ||
    validateLength(body.body, L.body, "متن پرامپت")
  );
}

/** ایجاد پرامپت جدید — بدنه نباید خالی باشد */
export function validatePromptCreate(body = {}) {
  const keyErr = validatePromptKey(body.prompt_key);
  if (keyErr) return keyErr;
  const b = body.body != null ? String(body.body).trim() : "";
  if (!b) return "متن پرامپت الزامی است";
  return validatePromptUpsert(body);
}

export function validateManagementSummarySave(body = {}) {
  return validateLength(body.summary_body, MANAGEMENT_SUMMARY_BODY_MAX, "متن خلاصه مدیریتی");
}

export function validateAiApiConfigBody(body = {}, isUpdate = false) {
  const L = AI_API_FIELD_LIMITS;
  if (!isUpdate) {
    if (!body.usage_key || !String(body.usage_key).trim()) return "کاربرد (usage_key) الزامی است";
    if (!body.provider_type || !String(body.provider_type).trim()) return "نوع ارائه‌دهنده الزامی است";
    if (!body.model_id || !String(body.model_id).trim()) return "شناسه مدل الزامی است";
  }
  if (body.provider_type != null && String(body.provider_type).trim()) {
    const pt = String(body.provider_type).trim();
    if (!AI_PROVIDER_SLUG_RE.test(pt)) {
      return "نوع ارائه‌دهنده باید slug معتبر باشد (a-z و 0-9 و _، حداکثر ۸۰ کاراکتر). نوع‌های مجاز در دیتابیس (قالب‌های ارائه‌دهنده) تعریف می‌شوند.";
    }
  }
  return (
    validateLength(body.title_fa, L.titleFa, "عنوان") ||
    validateLength(body.usage_key, L.usageKey, "کاربرد") ||
    validateLength(body.model_id, L.modelId, "مدل") ||
    validateLength(body.credential_env_name, L.credentialEnvName, "نام متغیر محیطی")
  );
}
