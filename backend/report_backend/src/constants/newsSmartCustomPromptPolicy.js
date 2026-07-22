/** سیاست الزامات خروجی پرامپت شخصی تحلیل هوشمند */

export const DEFAULT_CUSTOM_PROMPT_POLICY = {
  enabled: true,
  max_output_chars: 300,
  no_extra_explanation: true,
  source_only: true,
  extra_rules_fa: "",
};

export function mergeCustomPromptPolicy(raw) {
  const src = typeof raw === "string"
    ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
    : (raw && typeof raw === "object" ? raw : {});

  const max = parseInt(src.max_output_chars, 10);
  return {
    enabled: src.enabled !== false,
    max_output_chars: Number.isFinite(max) && max > 0 ? Math.min(max, 2000) : DEFAULT_CUSTOM_PROMPT_POLICY.max_output_chars,
    no_extra_explanation: src.no_extra_explanation !== false,
    source_only: src.source_only !== false,
    extra_rules_fa: String(src.extra_rules_fa || "").trim().slice(0, 500),
  };
}

/**
 * متن پرامپت کاربر + الزامات ثابت سیستمی (قابل پیکربندی توسط مدیر)
 */
export function augmentCustomPromptForAi(userPrompt, policyInput) {
  const policy = mergeCustomPromptPolicy(policyInput);
  const base = String(userPrompt || "").trim();
  if (!policy.enabled || !base) return base;

  const rules = [];
  if (policy.max_output_chars > 0) {
    rules.push(`خروجی نهایی حداکثر ${policy.max_output_chars} کاراکتر (شامل فاصله) باشد.`);
  }
  if (policy.no_extra_explanation) {
    rules.push("فقط نتیجهٔ نهایی را بنویس؛ بدون مقدمه، پیش‌گفتار، توضیح روش، یا جمع‌بندی اضافه.");
  }
  if (policy.source_only) {
    rules.push("فقط از اطلاعات اخبار ارائه‌شده استفاده کن؛ هیچ واقعیت، تحلیل یا نتیجه‌ای از خودت اضافه نکن.");
  }
  if (policy.extra_rules_fa) {
    rules.push(policy.extra_rules_fa);
  }
  if (!rules.length) return base;

  return `${base}\n\n---\nالزامات خروجی (سیستمی):\n${rules.map((r, i) => `${i + 1}) ${r}`).join("\n")}`;
}

export function customPromptPolicyHintFa(policyInput) {
  const policy = mergeCustomPromptPolicy(policyInput);
  if (!policy.enabled) return null;
  const parts = [];
  if (policy.max_output_chars > 0) {
    parts.push(`حداکثر ${policy.max_output_chars} کاراکتر`);
  }
  if (policy.no_extra_explanation) parts.push("بدون توضیح اضافه");
  if (policy.source_only) parts.push("فقط بر اساس اخبار موجود");
  return parts.length ? parts.join(" · ") : null;
}

export function truncateAiOutputText(text, maxChars) {
  const limit = parseInt(maxChars, 10);
  if (!Number.isFinite(limit) || limit <= 0) return String(text ?? "");
  const s = String(text ?? "").trim();
  if (s.length <= limit) return s;
  return [...s].slice(0, limit).join("");
}
