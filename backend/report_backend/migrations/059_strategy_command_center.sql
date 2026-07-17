-- مرکز فرماندهی: حاشیه راهبردی اخبار + خروجی‌های راهبردی + پرامپت/اکشن AI

CREATE TABLE IF NOT EXISTS tbl_strategy_news_annotations (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES tbl_news(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES tbl_users(id),
  annotation_type VARCHAR(40) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  notify_roles TEXT[] NOT NULL DEFAULT '{}',
  notify_user_ids INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_strategy_annotation_type CHECK (
    annotation_type IN ('confirm', 'deny', 'investigate', 'note')
  )
);

CREATE INDEX IF NOT EXISTS idx_strategy_ann_news
  ON tbl_strategy_news_annotations(news_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_ann_author
  ON tbl_strategy_news_annotations(author_user_id);

CREATE TABLE IF NOT EXISTS tbl_strategy_outputs (
  id SERIAL PRIMARY KEY,
  output_type VARCHAR(60) NOT NULL,
  title VARCHAR(400) NOT NULL,
  period_start DATE,
  period_end DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  source_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_output_id INTEGER REFERENCES tbl_strategy_outputs(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES tbl_users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_strategy_output_type CHECK (
    output_type IN ('soft_war_annex', 'macro_cognitive', 'psyops_strategic', 'macro_trends')
  ),
  CONSTRAINT chk_strategy_output_status CHECK (
    status IN ('draft', 'published', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_strategy_outputs_type_status
  ON tbl_strategy_outputs(output_type, status);
CREATE INDEX IF NOT EXISTS idx_strategy_outputs_created
  ON tbl_strategy_outputs(created_at DESC);

INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'strategy.soft_war_annex',
  'پیوست جنگ نرم — تولید سند',
  'پرامپت فرمانده برای تولید سیاست‌ها، راهکارهای اجرایی و اقدامات لازم',
  E'شما مشاور راهبردی هستید. بر اساس داده‌ها و متن دوره که در ادامه می‌آید، یک «پیوست جنگ نرم» به فارسی بنویسید.\n\nخروجی را دقیقاً با این سه بخش ساختاریافته ارائه دهید (عنوان فارسی هر بخش را حفظ کنید):\n\n## سیاست‌ها\n(سیاست‌های کلان پیشنهادی)\n\n## راهکارهای اجرایی\n(راهکارهای عملیاتی قابل اجرا در بخش‌های سازمان)\n\n## اقدامات لازم\n(اقدامات مشخص، اولویت‌دار و قابل پیگیری)\n\nلحن رسمی، موجز و راهبردی باشد. از حدس بی‌پایه پرهیز کنید؛ اگر داده کافی نیست، محدودیت را صریح بگویید.'
)
ON CONFLICT (prompt_key) DO NOTHING;

INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  usage_key, source_fields, assembly_strategy
) VALUES
(
  'strategy_command_outputs', 'generate_soft_war_annex', 'تولید پیوست جنگ نرم', true,
  'strategy.soft_war_annex', 'strategy.command_outputs',
  '["period_label","source_summary","prior_annex","extra_notes"]'::jsonb,
  'unified_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
SELECT 'strategy.command_outputs', 0, 'خروجی‌های راهبردی', provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled
FROM tbl_ai_api_configs
WHERE usage_key IN ('news.smart_analysis', 'news.summarize', 'field.management_summary') AND is_enabled = true
ORDER BY CASE usage_key
  WHEN 'news.smart_analysis' THEN 0
  WHEN 'news.summarize' THEN 1
  ELSE 2
END, sort_order
LIMIT 1
ON CONFLICT (usage_key, sort_order) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
VALUES (
  'strategy.command_outputs', 0, 'خروجی‌های راهبردی (Gemini)', 'google_gemini', 'gemini-1.5-flash',
  '{}'::jsonb, 'env_ref', 'GEMINI_API_KEY', true
)
ON CONFLICT (usage_key, sort_order) DO NOTHING;
