const CATEGORY_LABELS_FA = {
  no_config: "پیکربندی API یافت نشد",
  model_access: "عدم دسترسی به مدل",
  quota: "سهمیه / محدودیت نرخ",
  auth: "خطای احراز هویت API",
  timeout: "اتمام مهلت زمانی",
  network: "خطای اتصال شبکه",
  empty_response: "پاسخ خالی از مدل",
  unknown: "خطای نامشخص",
};

const CATEGORY_HINTS_FA = {
  no_config: "در «مدیریت API هوش مصنوعی» یک ردیف فعال با usage_key مربوطه تعریف کنید.",
  model_access: "مدل یا کلید API به این مدل دسترسی ندارد؛ مدل را عوض کنید یا کلید بدون محدودیت بسازید.",
  quota: "سهمیه یا rate limit تمام شده؛ صورتحساب provider را بررسی کنید یا provider دیگر امتحان کنید.",
  auth: "کلید API نامعتبر یا منقضی است؛ متغیر محیطی یا secret ذخیره‌شده را بررسی کنید.",
  timeout: "درخواست بیش از حد طول کشید؛ مدل سبک‌تر یا timeout بیشتر امتحان کنید.",
  network: "دامنه سرویس هوش مصنوعی در این محیط در دسترس نیست؛ اتصال اینترنت، DNS، VPN یا provider جایگزین را بررسی کنید.",
  empty_response: "API پاسخ داد ولی متن خالی بود؛ مدل یا پرامپت را بررسی کنید.",
  unknown: "جزئیات را در لاگ‌های AI ببینید یا provider دیگر امتحان کنید.",
};

function extractProviderPayload(error) {
  const data = error?.response?.data;
  if (!data) return { code: null, message: null };
  if (typeof data === "string") {
    return { code: null, message: data.slice(0, 500) };
  }
  const code = data.code || data.type || data.error?.code || data.error?.type || null;
  const message = data.message || data.error?.message || data.error || null;
  return {
    code: code != null ? String(code) : null,
    message: message != null ? String(message).slice(0, 500) : null,
  };
}

/**
 * @param {Error} error
 * @param {{ id?: number, model_id?: string, provider_type?: string } | null} row
 */
export function classifyLlmFailure(error, row = null) {
  const configId = row?.id ?? null;
  const modelId = row?.model_id ?? null;
  const providerType = row?.provider_type ?? null;
  const httpStatus = error?.response?.status ?? null;
  const { code: providerCode, message: providerMessage } = extractProviderPayload(error);
  const rawMsg = String(error?.message || "");

  let category = "unknown";
  let messageFa = rawMsg || "خطای نامشخص در فراخوانی مدل";

  if (rawMsg.includes("هیچ پیکربندی فعالی")) {
    category = "no_config";
    messageFa = rawMsg;
  } else if (rawMsg.includes("پاسخ خالی از مدل")) {
    category = "empty_response";
    messageFa = "پاسخ خالی از مدل دریافت شد";
  } else if (error?.code === "ECONNABORTED" || rawMsg.includes("timeout")) {
    category = "timeout";
    messageFa = "مهلت زمانی درخواست به API هوش مصنوعی تمام شد";
  } else if (
    ["ENOTFOUND", "ECONNREFUSED", "ENETUNREACH", "EAI_AGAIN", "ETIMEDOUT"].includes(error?.code)
    || /getaddrinfo ENOTFOUND/i.test(rawMsg)
    || /ECONNREFUSED/i.test(rawMsg)
    || /ENETUNREACH/i.test(rawMsg)
  ) {
    category = "network";
    const hostMatch = rawMsg.match(/ENOTFOUND\s+(\S+)/i);
    const host = hostMatch?.[1] || null;
    messageFa = host
      ? `اتصال به ${host} برقرار نشد — DNS یا شبکه را بررسی کنید.`
      : "اتصال به سرویس هوش مصنوعی برقرار نشد — اینترنت، DNS یا فیلترینگ را بررسی کنید.";
  } else if (
    httpStatus === 429
    || (providerCode && /quota|rate_limit|insufficient/i.test(providerCode))
  ) {
    category = "quota";
    messageFa = providerMessage || "سهمیه یا محدودیت نرخ API تمام شده است";
  } else if (
    httpStatus === 401
    || (providerCode && /auth|invalid_api_key|unauthorized/i.test(providerCode))
    || rawMsg.includes("متغیر محیطی")
    || rawMsg.includes("کلید API")
  ) {
    category = "auth";
    messageFa = providerMessage || rawMsg || "خطای احراز هویت API";
  } else if (
    httpStatus === 403
    || httpStatus === 404
    || (providerCode && /model_access|access_denied|not_found|model/i.test(providerCode))
  ) {
    category = "model_access";
    messageFa = providerMessage || rawMsg || "دسترسی به مدل مورد نظر وجود ندارد";
  } else if (httpStatus >= 500) {
    category = "unknown";
    messageFa = providerMessage || `خطای سرور provider (HTTP ${httpStatus})`;
  }

  if (modelId && category === "model_access") {
    messageFa = `${messageFa} — مدل: ${modelId}`;
  }

  return {
    category,
    category_label_fa: CATEGORY_LABELS_FA[category] || CATEGORY_LABELS_FA.unknown,
    hint_fa: CATEGORY_HINTS_FA[category] || CATEGORY_HINTS_FA.unknown,
    message_fa: messageFa,
    http_status: httpStatus,
    provider_code: providerCode,
    provider_message: providerMessage,
    model_id: modelId,
    config_id: configId,
    provider_type: providerType,
  };
}

/** @param {Array<Record<string, unknown>>} attempts */
export function buildLlmChainErrorMessage(diagnostic, attempts = []) {
  const summary = diagnostic?.message_fa || "همه تلاش‌ها برای فراخوانی مدل ناموفق بود";
  const compactAttempts = attempts.map((a) => ({
    config_id: a.config_id,
    provider_type: a.provider_type,
    model_id: a.model_id,
    category: a.category,
    http_status: a.http_status,
    provider_code: a.provider_code,
    message_fa: a.message_fa,
    retried: a.retried,
  }));
  return `${summary}\n---\nattempts:${JSON.stringify(compactAttempts)}`;
}

/** Parse stored error_message from tbl_ai_run_logs */
export function parseStoredLlmErrorMessage(errorMessage) {
  const raw = String(errorMessage || "");
  const idx = raw.indexOf("\n---\nattempts:");
  if (idx === -1) {
    return { summary: raw, attempts: [], diagnostic: null };
  }
  const summary = raw.slice(0, idx).trim();
  let attempts = [];
  try {
    attempts = JSON.parse(raw.slice(idx + "\n---\nattempts:".length));
  } catch {
    attempts = [];
  }
  const last = attempts[attempts.length - 1];
  const diagnostic = last
    ? {
        category: last.category,
        category_label_fa: CATEGORY_LABELS_FA[last.category] || CATEGORY_LABELS_FA.unknown,
        hint_fa: CATEGORY_HINTS_FA[last.category] || CATEGORY_HINTS_FA.unknown,
        message_fa: summary,
      }
    : { category: "unknown", category_label_fa: CATEGORY_LABELS_FA.unknown, hint_fa: CATEGORY_HINTS_FA.unknown, message_fa: summary };
  return { summary, attempts, diagnostic };
}

export function createLlmChainError(message, attempts, diagnostic) {
  const err = new Error(message);
  err.attempts = attempts;
  err.diagnostic = diagnostic;
  return err;
}

/** پاسخ HTTP کاربرپسند برای خطای اجرای AI (بدون JSON attempts) */
export function buildAiRunHttpError(err) {
  const diagnostic = err?.diagnostic || null;
  let summary = diagnostic?.message_fa;
  if (!summary && err?.message) {
    summary = parseStoredLlmErrorMessage(err.message).summary;
  }
  summary = String(summary || "خطا در فراخوانی هوش مصنوعی").trim();
  const cut = summary.indexOf("\n---\nattempts:");
  if (cut !== -1) summary = summary.slice(0, cut).trim();

  const category = diagnostic?.category || "unknown";
  const status = category === "network" || category === "timeout" ? 503 : 400;

  return {
    status,
    body: {
      error: summary,
      code: category,
      category_label_fa: diagnostic?.category_label_fa || CATEGORY_LABELS_FA[category],
      hint_fa: diagnostic?.hint_fa || CATEGORY_HINTS_FA[category],
    },
  };
}
