/** اکشن‌های تحلیل هوشمند اخبار — هم‌نام با aiFormRegistry */
export const NEWS_SMART_ANALYSIS_ACTIONS = {
  analyze_overview: { label_fa: "خلاصه کلی", prompt_key: "news.smart_analysis.overview" },
  analyze_thematic: { label_fa: "تحلیل موضوعی", prompt_key: "news.smart_analysis.thematic" },
  analyze_trends: { label_fa: "روند و الگو", prompt_key: "news.smart_analysis.trends" },
  analyze_risk: { label_fa: "ریسک و تهدید", prompt_key: "news.smart_analysis.risk" },
};

export const NEWS_SMART_ANALYSIS_FORM = "news_smart_analysis";

export const MESSENGER_TEXT_MAX = 4096;

export const MANUAL_FALLBACK_NOTICE_FA =
  "تولید خودکار تحلیل با هوش‌افزار در دسترس نبود (همهٔ سرویس‌های هوش امتحان شدند). لطفاً متن تحلیل را خودتان بنویسید.";

export function analysisTypeLabelFa(type) {
  return NEWS_SMART_ANALYSIS_ACTIONS[type]?.label_fa || type || "تحلیل";
}
