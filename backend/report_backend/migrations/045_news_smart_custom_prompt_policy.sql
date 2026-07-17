-- سیاست الزامات خروجی پرامپت شخصی (قابل پیکربندی)

ALTER TABLE tbl_news_report_settings
  ADD COLUMN IF NOT EXISTS custom_prompt_policy JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "max_output_chars": 300,
    "no_extra_explanation": true,
    "source_only": true,
    "extra_rules_fa": ""
  }'::jsonb;

UPDATE tbl_app_prompts
SET body = E'شما تحلیلگر خبری هستید. دستور کاربر (همراه الزامات سیستمی) در ادامه آمده است:\n{{FORM_custom_prompt}}\n\nبازه: {{PERIOD_START}} تا {{PERIOD_END}} ({{NEWS_COUNT}} خبر)\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
WHERE prompt_key = 'news.smart_analysis.custom';
