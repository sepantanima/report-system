export const MESSENGER_USAGE_KEYS = {
  NEWS_REPORT_PUBLISH: "news.report.publish",
  NEWS_ALERT_BROADCAST: "news.alert.broadcast",
  NEWS_SMART_ANALYSIS_PUBLISH: "news.smart_analysis.publish",
};

export const MESSENGER_USAGE_KEY_LABELS = {
  [MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH]: "انتشار گزارش اخبار",
  [MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST]: "هشدار / اطلاع‌رسانی",
  [MESSENGER_USAGE_KEYS.NEWS_SMART_ANALYSIS_PUBLISH]: "انتشار تحلیل هوشمند اخبار",
};

export const KNOWN_MESSENGER_USAGE_KEYS = Object.values(MESSENGER_USAGE_KEYS);

export const DESTINATION_KIND_LABELS = {
  channel: "کانال",
  group: "گروه",
  chat: "چت",
};
