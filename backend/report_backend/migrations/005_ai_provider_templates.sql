-- رجیستری انواع ارائه‌دهنده: slug نمایشی در UI و DB؛ engine = پیاده‌سازی واقعی در سرور

CREATE TABLE IF NOT EXISTS tbl_ai_provider_templates (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label_fa VARCHAR(255) NOT NULL DEFAULT '',
  engine VARCHAR(40) NOT NULL,
  default_model_id VARCHAR(120),
  default_credential_env_name VARCHAR(120),
  default_extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_system_prompt TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_ai_provider_engine CHECK (engine IN ('google_gemini', 'openai_chat'))
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_templates_enabled ON tbl_ai_provider_templates(is_enabled, sort_order);

INSERT INTO tbl_ai_provider_templates (slug, label_fa, engine, default_model_id, default_credential_env_name, default_extra_config, sort_order)
VALUES
  ('google_gemini', 'Google Gemini', 'google_gemini', 'gemini-1.5-flash', 'GEMINI_API_KEY', '{}'::jsonb, 0),
  ('openai_chat', 'OpenAI (رسمی)', 'openai_chat', 'gpt-4o-mini', 'OPENAI_API_KEY', '{"base_url":"https://api.openai.com/v1"}'::jsonb, 1),
  ('avalai', 'AvalAI', 'openai_chat', 'gpt-5.5', 'AVALAI_API_KEY', '{"base_url":"https://api.avalai.ir/v1"}'::jsonb, 2)
ON CONFLICT (slug) DO UPDATE SET
  label_fa = EXCLUDED.label_fa,
  engine = EXCLUDED.engine,
  default_model_id = EXCLUDED.default_model_id,
  default_credential_env_name = EXCLUDED.default_credential_env_name,
  default_extra_config = EXCLUDED.default_extra_config,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;
