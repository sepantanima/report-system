import { KNOWN_MESSENGER_USAGE_KEYS } from "./messengerUsageKeys.js";

const USAGE_KEY_RE = /^[a-z][a-z0-9_.]{2,119}$/;
const PROVIDER_SLUG_RE = /^[a-z][a-z0-9_]{1,79}$/;

export const MESSENGER_FIELD_LIMITS = {
  usage_key: 120,
  title_fa: 255,
  provider_type: 80,
  credential_env_name: 120,
  chat_id: 32,
  max_usage_keys: 10,
};

function validateUsageKeyValue(uk) {
  if (!uk || !USAGE_KEY_RE.test(uk)) return false;
  if (KNOWN_MESSENGER_USAGE_KEYS.length && !KNOWN_MESSENGER_USAGE_KEYS.includes(uk)) {
    return false;
  }
  return true;
}

function validateUsageKeysArray(body, isUpdate) {
  const hasArray = body.usage_keys !== undefined;
  const hasSingle = body.usage_key !== undefined;
  if (!isUpdate && !hasArray && !hasSingle) {
    return "حداقل یک کاربرد (usage_key) الزامی است";
  }
  let keys = [];
  if (Array.isArray(body.usage_keys)) {
    keys = body.usage_keys.map((k) => String(k ?? "").trim()).filter(Boolean);
  } else if (hasSingle) {
    keys = [String(body.usage_key || "").trim()].filter(Boolean);
  }
  if ((hasArray || hasSingle) && !keys.length) {
    return "حداقل یک کاربرد (usage_key) الزامی است";
  }
  if (keys.length > MESSENGER_FIELD_LIMITS.max_usage_keys) {
    return `حداکثر ${MESSENGER_FIELD_LIMITS.max_usage_keys} کاربرد مجاز است`;
  }
  for (const uk of keys) {
    if (!validateUsageKeyValue(uk)) return `usage_key نامعتبر است: ${uk}`;
  }
  return null;
}

export function validateMessengerChannelBody(body = {}, isUpdate = false) {
  const usageErr = validateUsageKeysArray(body, isUpdate);
  if (usageErr) return usageErr;

  if (!isUpdate || body.usage_key !== undefined) {
    if (body.usage_key !== undefined && body.usage_keys === undefined) {
      const uk = String(body.usage_key || "").trim();
      if (!validateUsageKeyValue(uk)) return "usage_key نامعتبر است";
    }
  }
  if (!isUpdate || body.title_fa !== undefined) {
    const t = String(body.title_fa || "").trim();
    if (!t) return "عنوان فارسی الزامی است";
    if (t.length > MESSENGER_FIELD_LIMITS.title_fa) return "عنوان بیش از حد مجاز است";
  }
  if (!isUpdate || body.provider_type !== undefined) {
    const pt = String(body.provider_type || "").trim();
    if (!pt || !PROVIDER_SLUG_RE.test(pt)) return "نوع ارائه‌دهنده نامعتبر است";
  }
  const kind = body.destination_kind;
  if (kind != null && !["channel", "group", "chat"].includes(kind)) {
    return "نوع مقصد نامعتبر است";
  }
  const cm = body.credential_mode;
  if (cm != null && !["env_ref", "stored_secret"].includes(cm)) {
    return "credential_mode نامعتبر است";
  }
  if (body.credential_mode === "env_ref" && !isUpdate) {
    if (!String(body.credential_env_name || "").trim()) return "نام متغیر محیطی الزامی است";
  }
  const ex = body.extra_config;
  if (ex != null && typeof ex !== "object") return "extra_config باید شیء JSON باشد";
  if (!isUpdate) {
    const chatId = ex?.chat_id ?? body.chat_id;
    if (chatId == null || String(chatId).trim() === "") return "chat_id الزامی است";
  }
  return null;
}
