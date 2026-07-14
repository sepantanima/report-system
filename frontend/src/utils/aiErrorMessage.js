const CATEGORY_HINTS_FA = {
  no_config: "در «مدیریت API هوش مصنوعی» یک ردیف فعال با usage_key مربوطه تعریف کنید.",
  model_access: "مدل یا کلید API به این مدل دسترسی ندارد؛ مدل را عوض کنید.",
  quota: "سهمیه provider تمام شده؛ اعتبار حساب را شارژ کنید یا provider دیگر امتحان کنید.",
  auth: "کلید API نامعتبر است؛ تنظیمات API را بررسی کنید.",
  timeout: "درخواست طولانی شد؛ مدل سبک‌تر امتحان کنید.",
  network: "اتصال به سرویس هوش مصنوعی برقرار نشد.",
  empty_response: "پاسخ خالی از مدل؛ مدل یا پرامپت را بررسی کنید.",
  unknown: "جزئیات را در لاگ‌های AI ببینید.",
};

/** خلاصهٔ کاربرپسند از error_message ذخیره‌شده (بدون JSON attempts) */
export function formatAiErrorMessage(raw, { withHint = true } = {}) {
  const text = String(raw || "").trim();
  if (!text) return "خطا در فراخوانی هوش مصنوعی";

  const cut = text.indexOf("\n---\nattempts:");
  const summary = (cut === -1 ? text : text.slice(0, cut)).trim();

  let category = "unknown";
  if (cut !== -1) {
    try {
      const attempts = JSON.parse(text.slice(cut + "\n---\nattempts:".length));
      const last = attempts[attempts.length - 1];
      if (last?.category) category = last.category;
    } catch {
      /* ignore */
    }
  }

  const hint = CATEGORY_HINTS_FA[category] || CATEGORY_HINTS_FA.unknown;
  if (withHint && hint && !summary.includes(hint)) {
    return `${summary} — ${hint}`;
  }
  return summary;
}
