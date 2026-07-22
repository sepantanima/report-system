/** محدودیت فیلدهای رجیستری پرامپت — هم‌نام با بک‌اند */
export const PROMPT_FIELD_LIMITS = {
  titleFa: 120,
  descriptionFa: 1500,
  body: 5000,
};

/** محدودیت‌های پرامپت راهبردی (مرکز فرماندهی) — هم‌نام با بک‌اند */
export const STRATEGY_PROMPT_LIMITS = {
  maxCount: 10,
  referenceSlotMax: 3,
  referenceTitleMax: 120,
  referenceTotalChars: 60000,
  sourceDigestMaxChars: 50000,
};

export const STRATEGY_PROMPT_PREFIX = "strategy.";
export const STRATEGY_SYSTEM_PROMPT_KEYS = ["strategy.soft_war_annex"];

export const AI_API_FIELD_LIMITS = {
  titleFa: 120,
  usageKey: 120,
  modelId: 120,
  credentialEnvName: 120,
};

export const MANAGEMENT_SUMMARY_BODY_MAX = 30000;

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

/** قبل از POST — متن پرامپت نباید خالی باشد */
export function validatePromptCreateClient(body = {}) {
  const keyErr = validatePromptKey(body.prompt_key);
  if (keyErr) return keyErr;
  const b = body.body != null ? String(body.body).trim() : "";
  if (!b) return "متن پرامپت الزامی است";
  return null;
}
