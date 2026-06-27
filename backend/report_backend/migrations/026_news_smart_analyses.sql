-- تحلیل‌های هوشمند اخبار + seed پرامپت‌ها و اکشن‌های AI

CREATE TABLE IF NOT EXISTS tbl_news_smart_analyses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL DEFAULT '',
  analysis_type VARCHAR(80) NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_plain TEXT NOT NULL DEFAULT '',
  query_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  news_count INTEGER NOT NULL DEFAULT 0,
  period_from VARCHAR(20),
  period_to VARCHAR(20),
  filter_signature VARCHAR(64),
  ai_prompt_key VARCHAR(255),
  ai_run_log_id INTEGER,
  created_by INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  publish_status VARCHAR(40) NOT NULL DEFAULT 'none',
  channel_config_id INTEGER REFERENCES tbl_messenger_channel_configs(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_smart_analyses_created ON tbl_news_smart_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_smart_analyses_type ON tbl_news_smart_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_news_smart_analyses_user ON tbl_news_smart_analyses(created_by);

-- پرامپت‌های تحلیل هوشمند اخبار
INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'news.smart_analysis.overview',
  'تحلیل هوشمند — خلاصه کلی',
  'خلاصه و مرور کلی اخبار بازه',
  E'شما تحلیلگر خبری هستید. بر اساس بازه زمانی {{PERIOD_START}} تا {{PERIOD_END}} و {{NEWS_COUNT}} خبر زیر، یک خلاصه کلی، منسجم و رسمی به فارسی بنویسید.\n\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
),
(
  'news.smart_analysis.thematic',
  'تحلیل هوشمند — موضوعی',
  'تحلیل موضوعات و دسته‌بندی‌ها',
  E'شما تحلیلگر خبری هستید. اخبار بازه {{PERIOD_START}} تا {{PERIOD_END}} ({{NEWS_COUNT}} خبر) را از منظر موضوعی تحلیل کنید: موضوعات غالب، تقاطع‌ها و اولویت‌ها را به فارسی و ساختاریافته بنویسید.\n\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
),
(
  'news.smart_analysis.trends',
  'تحلیل هوشمند — روند و الگو',
  'شناسایی روندها و الگوها',
  E'شما تحلیلگر خبری هستید. در اخبار بازه {{PERIOD_START}} تا {{PERIOD_END}} ({{NEWS_COUNT}} خبر) روندها، تکرارها و الگوهای محتوایی را شناسایی و به فارسی گزارش کنید.\n\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
),
(
  'news.smart_analysis.risk',
  'تحلیل هوشمند — ریسک و تهدید',
  'ارزیابی ریسک و تهدید',
  E'شما تحلیلگر امنیتی-خبری هستید. اخبار بازه {{PERIOD_START}} تا {{PERIOD_END}} ({{NEWS_COUNT}} خبر) را از منظر ریسک، تهدید و پیامدهای احتمالی تحلیل کنید. خروجی رسمی، عملیاتی و به فارسی باشد.\n\nفیلترها: {{FILTER_SUMMARY}}\n\n---\nاخبار:\n{{NEWS_DIGEST}}'
)
ON CONFLICT (prompt_key) DO NOTHING;

-- API config (fallback به env مشابه news.summarize)
INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
SELECT 'news.smart_analysis', 0, 'تحلیل هوشمند اخبار', provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled
FROM tbl_ai_api_configs
WHERE usage_key = 'news.summarize' AND is_enabled = true
ORDER BY sort_order
LIMIT 1
ON CONFLICT (usage_key, sort_order) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
VALUES (
  'news.smart_analysis', 0, 'تحلیل هوشمند اخبار (Gemini)', 'google_gemini', 'gemini-1.5-flash',
  '{}'::jsonb, 'env_ref', 'GEMINI_API_KEY', true
)
ON CONFLICT (usage_key, sort_order) DO NOTHING;

-- اکشن‌های AI
INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  usage_key, source_fields, assembly_strategy
) VALUES
(
  'news_smart_analysis', 'analyze_overview', 'خلاصه کلی', true,
  'news.smart_analysis.overview', 'news.smart_analysis', '[]'::jsonb, 'unified_v1'
),
(
  'news_smart_analysis', 'analyze_thematic', 'تحلیل موضوعی', true,
  'news.smart_analysis.thematic', 'news.smart_analysis', '[]'::jsonb, 'unified_v1'
),
(
  'news_smart_analysis', 'analyze_trends', 'روند و الگو', true,
  'news.smart_analysis.trends', 'news.smart_analysis', '[]'::jsonb, 'unified_v1'
),
(
  'news_smart_analysis', 'analyze_risk', 'ریسک و تهدید', true,
  'news.smart_analysis.risk', 'news.smart_analysis', '[]'::jsonb, 'unified_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;
