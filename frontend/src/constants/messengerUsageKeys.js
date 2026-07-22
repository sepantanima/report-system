export const MESSENGER_USAGE_KEYS = {
  NEWS_REPORT_PUBLISH: "news.report.publish",
  NEWS_ALERT_BROADCAST: "news.alert.broadcast",
  NEWS_SMART_ANALYSIS_PUBLISH: "news.smart_analysis.publish",
  ANALYSIS_SUBMISSION_PUBLISH: "analysis.submission.publish",
  STRATEGY_OUTPUT_PUBLISH: "strategy.output.publish",
};

export const MESSENGER_TEXT_MAX = 4096;

export const MESSENGER_USAGE_KEY_OPTIONS = [
  { value: MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH, label: "انتشار گزارش اخبار" },
  { value: MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST, label: "هشدار / اطلاع‌رسانی" },
  { value: MESSENGER_USAGE_KEYS.NEWS_SMART_ANALYSIS_PUBLISH, label: "انتشار تحلیل هوشمند اخبار" },
  { value: MESSENGER_USAGE_KEYS.ANALYSIS_SUBMISSION_PUBLISH, label: "انتشار تحلیل ثبت‌شده" },
  { value: MESSENGER_USAGE_KEYS.STRATEGY_OUTPUT_PUBLISH, label: "انتشار خروجی راهبردی" },
];

export const DESTINATION_KIND_OPTIONS = [
  { value: "channel", label: "کانال" },
  { value: "group", label: "گروه" },
  { value: "chat", label: "چت" },
];
