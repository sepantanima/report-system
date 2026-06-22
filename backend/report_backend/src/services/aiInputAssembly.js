import { getPromptBody } from "./promptRegistry.js";
import { buildManagementSummaryPromptForModel } from "./managementSummaryAiAssembly.js";
import { isFieldManagementSummaryGenerateAction } from "../constants/aiFormRegistry.js";
import {
  buildFormTemplateVars,
  resolveCatalogServerVars,
} from "./promptVariableCatalog.js";
import {
  fillTemplateSafe,
  findUnfilledPlaceholders,
  templateHasPlaceholders,
} from "./promptTemplateFill.js";

function stringifyField(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * @param {Record<string, unknown>} formData
 * @param {unknown} sourceFields
 * @returns {Promise<string>}
 */
export async function buildLabeledFieldsBlock(formData, sourceFields) {
  const keys = Array.isArray(sourceFields) ? sourceFields.map((k) => String(k)) : [];
  const lines = [];
  for (const key of keys) {
    if (!/^[a-zA-Z0-9_]{1,80}$/.test(key)) continue;
    lines.push(`${key}: ${stringifyField(formData?.[key])}`);
  }
  return lines.join("\n");
}

/**
 * متن نهایی ارسال به LLM — مسیر خلاصه مدیریتی یا unified_v1 / labeled_fields با پشتیبانی {{...}}.
 * @param {string} strategy
 * @param {Record<string, unknown>} formData
 * @param {unknown} sourceFields
 * @param {string|null|undefined} configPromptKey
 * @param {{ formName?: string, actionName?: string }} [ctx]
 * @returns {Promise<{ promptTextForModel: string, promptKey: string|null, extra?: unknown }>}
 */
export async function buildFinalPromptText(strategy, formData, sourceFields, configPromptKey, ctx = {}) {
  const s = String(strategy || "").trim();
  const fn = String(ctx.formName || "").trim();
  const an = String(ctx.actionName || "").trim();

  if (isFieldManagementSummaryGenerateAction(fn, an) || s === "field_management_summary_v1") {
    const built = await buildManagementSummaryPromptForModel(formData, {
      promptKey: configPromptKey,
    });
    return { promptTextForModel: built.promptTextForModel, promptKey: built.promptKey, extra: built };
  }

  if (s === "unified_v1" || s === "labeled_fields") {
    const body = await getPromptBody(configPromptKey);
    if (!body?.trim()) throw new Error("پرامپت یافت نشد");
    const block = await buildLabeledFieldsBlock(formData, sourceFields);

    const serverVars = await resolveCatalogServerVars(fn, an, formData);
    const formVars = buildFormTemplateVars(formData, sourceFields);
    const merged = { ...serverVars, ...formVars };

    if (templateHasPlaceholders(body)) {
      const filled = fillTemplateSafe(body, merged);
      const unfilled = findUnfilledPlaceholders(filled);
      if (unfilled.length) {
        throw new Error(`متغیرهای پرنشده در پرامپت: ${unfilled.join(", ")}`);
      }
      let promptTextForModel = filled.trim();
      if (s === "labeled_fields") {
        promptTextForModel += `\n\n---\nورودی:\n${block || "(خالی)"}`;
      }
      return { promptTextForModel, promptKey: configPromptKey, extra: null };
    }

    const promptTextForModel = `${body.trim()}\n\n---\nورودی:\n${block || "(خالی)"}`;
    return { promptTextForModel, promptKey: configPromptKey, extra: null };
  }

  throw new Error(`استراتژی مونتاژ ناشناخته: ${s}`);
}
