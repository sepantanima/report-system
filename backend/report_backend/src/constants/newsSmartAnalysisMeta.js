/** اکشن‌های تحلیل هوشمند اخبار — هم‌نام با aiFormRegistry */
export const NEWS_SMART_ANALYSIS_ACTIONS = {
  analyze_overview: { label_fa: "خلاصه کلی", prompt_key: "news.smart_analysis.overview" },
  analyze_thematic: { label_fa: "تحلیل موضوعی", prompt_key: "news.smart_analysis.thematic" },
  analyze_trends: { label_fa: "روند و الگو", prompt_key: "news.smart_analysis.trends" },
  analyze_risk: { label_fa: "ریسک و تهدید", prompt_key: "news.smart_analysis.risk" },
  analyze_custom: { label_fa: "تحلیل شخصی", prompt_key: "news.smart_analysis.custom" },
};

export const CUSTOM_PROMPT_ACTION = "analyze_custom";
export const CUSTOM_PROMPT_SLOTS = ["custom_prompt_1", "custom_prompt_2", "custom_prompt_3"];
export const MAX_CUSTOM_PROMPT_ANALYSES = CUSTOM_PROMPT_SLOTS.length;
export const MAX_CUSTOM_PROMPT_LEN = 4000;
export const MAX_CUSTOM_PROMPT_TITLE_LEN = 200;
export const MIN_CUSTOM_PROMPT_LEN = 8;

export function isCustomPromptAnalysisType(type) {
  return CUSTOM_PROMPT_SLOTS.includes(String(type || "").trim());
}

export function customPromptSlotFromType(type) {
  const m = String(type || "").match(/^custom_prompt_(\d)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function customPromptTypeFromSlot(slot) {
  const n = parseInt(slot, 10);
  if (![1, 2, 3].includes(n)) return null;
  return `custom_prompt_${n}`;
}

export function customPromptLabelFa(type, customPrompt = "", customPromptTitle = "") {
  const title = String(customPromptTitle || "").trim();
  if (title) return title;
  const slot = customPromptSlotFromType(type);
  const base = slot ? `تحلیل شخصی ${slot}` : "تحلیل شخصی";
  const snippet = String(customPrompt || "").trim().slice(0, 40);
  return snippet ? `${base} — ${snippet}${customPrompt.length > 40 ? "…" : ""}` : base;
}

export const NEWS_SMART_ANALYSIS_FORM = "news_smart_analysis";

export const MESSENGER_TEXT_MAX = 4096;

export const MANUAL_FALLBACK_NOTICE_FA =
  "تولید خودکار تحلیل با هوش‌افزار در دسترس نبود (همهٔ سرویس‌های هوش امتحان شدند). لطفاً متن تحلیل را خودتان بنویسید.";

export function analysisTypeLabelFa(type, customPrompt = "", customPromptTitle = "") {
  if (isCustomPromptAnalysisType(type)) return customPromptLabelFa(type, customPrompt, customPromptTitle);
  return NEWS_SMART_ANALYSIS_ACTIONS[type]?.label_fa || type || "تحلیل";
}
