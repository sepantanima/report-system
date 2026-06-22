import { getPromptBody } from "./promptRegistry.js";
import { promptKeyForClassification } from "../constants/promptKeys.js";
import { resolveFilters } from "./managementSummaryService.js";
import { resolveManagementSummaryAssembly } from "./promptVariableCatalog.js";
import {
  fillTemplateSafe,
  findUnfilledPlaceholders,
  templateHasPlaceholders,
} from "./promptTemplateFill.js";

/**
 * ساخت متن نهایی ارسالی به مدل برای خلاصه مدیریتی.
 * بدنه از `options.promptKey` (کانفیگ اکشن) خوانده می‌شود؛ اگر خالی باشد از طبقه‌بندی فرم fallback می‌شود.
 * دادهٔ گزارش‌ها و متغیرهای {{PERIOD_*}} / {{REPORTS_DIGEST}} همان‌طور از سرور پر می‌شوند.
 * @param {{ promptKey?: string|null }} [options]
 */
export async function buildManagementSummaryPromptForModel(formData, options = {}) {
  const f = resolveFilters(formData);
  const override = options.promptKey != null ? String(options.promptKey).trim() : "";
  const promptKey = override || promptKeyForClassification(f.classifications?.[0] ?? f.classification ?? 1);
  const template = await getPromptBody(promptKey);
  if (!template?.trim()) throw new Error("پرامپت برای این دامنه یافت نشد");

  const { reports, digest, vars } = await resolveManagementSummaryAssembly(formData);

  const hasPh = templateHasPlaceholders(template);
  let promptTextForModel;
  if (hasPh) {
    promptTextForModel = fillTemplateSafe(template, vars);
    const unfilled = findUnfilledPlaceholders(promptTextForModel);
    if (unfilled.length) {
      throw new Error(`متغیرهای پرنشده در پرامپت: ${unfilled.join(", ")}`);
    }
  } else {
    const structured = [
      `بازه: از ${vars.PERIOD_START} تا ${vars.PERIOD_END} (${vars.PERIOD_KIND_FA}).`,
      `تعداد گزارش‌های منطبق: ${reports.length}.`,
      "",
      "خلاصه فشردهٔ گزارش‌ها:",
      digest || "(گزارشی در این بازه یافت نشد)",
    ].join("\n");
    promptTextForModel = `${template.trim()}\n\n---\nورودی ساخت‌یافته:\n${structured}`;
  }

  return {
    promptTextForModel,
    promptKey,
    hash_keys: reports.map((r) => r.hash_key),
    period_start: f.periodStart,
    period_end: f.periodEnd,
    period_kind: f.periodKind,
    classification: f.classification,
  };
}
