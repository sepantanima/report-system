-- تحلیل شخصی با پرامپت کاربر (حداکثر ۳ اسلات per پک)

ALTER TABLE tbl_news_smart_analyses
  ADD COLUMN IF NOT EXISTS custom_prompt TEXT;

INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'news.smart_analysis.custom',
  'تحلیل هوشمند — پرامپت شخصی',
  'تحلیل اخبار با دستور متنی کاربر',
  E'شما تحلیلگر خبری هستید. دستور کاربر:\n{{FORM_custom_prompt}}\n\nبازه: {{PERIOD_START}} تا {{PERIOD_END}} ({{NEWS_COUNT}} خبر)\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
)
ON CONFLICT (prompt_key) DO NOTHING;

INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  usage_key, source_fields, assembly_strategy
) VALUES
(
  'news_smart_analysis', 'analyze_custom', 'تحلیل با پرامپت شخصی', true,
  'news.smart_analysis.custom', 'news.smart_analysis', '["custom_prompt"]'::jsonb, 'unified_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;
