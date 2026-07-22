import { getNewsReportSettings } from "./newsReportSettingsService.js";
import {
  DEFAULT_CUSTOM_PROMPT_POLICY,
  mergeCustomPromptPolicy,
} from "../constants/newsSmartCustomPromptPolicy.js";

export async function getCustomPromptPolicy() {
  try {
    const settings = await getNewsReportSettings();
    return mergeCustomPromptPolicy(settings?.custom_prompt_policy);
  } catch {
    return mergeCustomPromptPolicy(DEFAULT_CUSTOM_PROMPT_POLICY);
  }
}

export { mergeCustomPromptPolicy, DEFAULT_CUSTOM_PROMPT_POLICY };
