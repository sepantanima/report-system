import { AI_USAGE_KEYS } from "../constants/aiUsageKeys.js";
import { AI_ASSEMBLY_STRATEGIES } from "../constants/aiFormActions.js";
import { getFormActionByFormAndAction } from "./aiFormActionService.js";
import { buildFinalPromptText } from "./aiInputAssembly.js";
import { invokeLlm } from "./llmInvoke.js";
import { insertAiRunLog } from "./aiRunLogService.js";
import { buildLlmChainErrorMessage } from "../utils/aiErrorDiagnostics.js";

function defaultUsageKeyForForm(formName) {
  if (formName === "field_management_summary_create") return AI_USAGE_KEYS.FIELD_MANAGEMENT_SUMMARY;
  if (formName === "news_monitor_manage") return AI_USAGE_KEYS.NEWS_SUMMARIZE;
  if (formName === "news_smart_analysis") return AI_USAGE_KEYS.NEWS_SMART_ANALYSIS;
  if (formName === "news_editorial_batch") return AI_USAGE_KEYS.NEWS_EDITORIAL;
  if (formName === "strategy_command_outputs") return AI_USAGE_KEYS.STRATEGY_COMMAND_OUTPUTS;
  return null;
}

/**
 * اجرای مرکزی یک اکشن AI بر اساس کانفیگ دیتابیس.
 */
export async function executeFormAiAction({ formName, actionName, formData, userId, promptKeyOverride, appendPromptSuffix }) {
  const cfg = await getFormActionByFormAndAction(formName, actionName);
  if (!cfg) {
    const err = "کانفیگ اکشن برای این فرم یافت نشد یا غیرفعال است";
    try {
      await insertAiRunLog({
        user_id: userId,
        form_name: formName,
        action_name: actionName,
        prompt_key: null,
        ai_config_id: null,
        usage_key_used: null,
        request_text: JSON.stringify(formData ?? {}).slice(0, 2000),
        response_text: null,
        status: "config_missing",
        error_message: err,
      });
    } catch {
      /* ignore log failure */
    }
    throw new Error(err);
  }

  if (!AI_ASSEMBLY_STRATEGIES.includes(cfg.assembly_strategy)) {
    throw new Error("استراتژی مونتاژ نامعتبر در کانفیگ");
  }

  const usageKey =
    cfg.usage_key && String(cfg.usage_key).trim()
      ? String(cfg.usage_key).trim()
      : defaultUsageKeyForForm(formName);
  if (!usageKey) {
    throw new Error("usage_key در کانفیگ تنظیم نشده است");
  }

  const effectivePromptKey = String(promptKeyOverride || cfg.prompt_key || "").trim() || cfg.prompt_key;

  let promptKeyUsed = null;
  let promptTextForModel = "";
  let extra = null;

  try {
    const built = await buildFinalPromptText(cfg.assembly_strategy, formData, cfg.source_fields, effectivePromptKey, {
      formName,
      actionName,
    });
    promptTextForModel = built.promptTextForModel;
    promptKeyUsed = built.promptKey;
    extra = built.extra;
    const suffix = String(appendPromptSuffix || "").trim();
    if (suffix) {
      promptTextForModel = `${promptTextForModel}\n\n${suffix}`.trim();
    }
  } catch (e) {
    try {
      await insertAiRunLog({
        user_id: userId,
        form_name: formName,
        action_name: actionName,
        prompt_key: effectivePromptKey,
        ai_config_id: cfg.ai_config_id,
        usage_key_used: usageKey,
        request_text: String(e.message),
        response_text: null,
        status: "assembly_error",
        error_message: e.message,
      });
    } catch {
      /* ignore */
    }
    throw e;
  }

  try {
    const { text, configId } = await invokeLlm({
      usageKey,
      promptText: promptTextForModel,
      preferredConfigId: cfg.ai_config_id,
    });

    try {
      await insertAiRunLog({
        user_id: userId,
        form_name: formName,
        action_name: actionName,
        prompt_key: promptKeyUsed,
        ai_config_id: configId,
        usage_key_used: usageKey,
        request_text: promptTextForModel,
        response_text: text,
        status: "ok",
        error_message: null,
      });
    } catch {
      /* ignore */
    }

    if (extra) {
      return {
        status: "ok",
        result_text: text,
        draft: text,
        period_start: extra.period_start,
        period_end: extra.period_end,
        period_kind: extra.period_kind,
        classification: extra.classification,
        prompt_key_used: promptKeyUsed,
        ai_usage_key_used: usageKey,
        ai_config_id_used: configId,
        hash_keys: extra.hash_keys,
      };
    }

    return {
      status: "ok",
      result_text: text,
      draft: text,
      prompt_key_used: promptKeyUsed,
      ai_usage_key_used: usageKey,
      ai_config_id_used: configId,
    };
  } catch (e) {
    const logMessage = e.attempts?.length
      ? buildLlmChainErrorMessage(e.diagnostic || { message_fa: e.message }, e.attempts)
      : e.message;
    try {
      await insertAiRunLog({
        user_id: userId,
        form_name: formName,
        action_name: actionName,
        prompt_key: promptKeyUsed,
        ai_config_id: cfg.ai_config_id,
        usage_key_used: usageKey,
        request_text: promptTextForModel,
        response_text: null,
        status: "llm_error",
        error_message: logMessage,
      });
    } catch {
      /* ignore */
    }
    throw e;
  }
}
