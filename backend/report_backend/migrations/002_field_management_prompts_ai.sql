-- رجیستری پرامپت، پیکربندی API هوش مصنوعی، خلاصه مدیریتی میدانی و مراجع گزارش

CREATE TABLE IF NOT EXISTS tbl_app_prompts (
  prompt_key VARCHAR(255) PRIMARY KEY,
  title_fa VARCHAR(255) NOT NULL DEFAULT '',
  description_fa TEXT,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS tbl_ai_api_configs (
  id SERIAL PRIMARY KEY,
  usage_key VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  title_fa VARCHAR(255) NOT NULL DEFAULT '',
  provider_type VARCHAR(40) NOT NULL,
  model_id VARCHAR(120) NOT NULL,
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credential_mode VARCHAR(20) NOT NULL DEFAULT 'env_ref',
  credential_env_name VARCHAR(120),
  credential_secret_cipher TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT uq_ai_api_usage_sort UNIQUE (usage_key, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_ai_api_configs_usage ON tbl_ai_api_configs(usage_key);

CREATE TABLE IF NOT EXISTS tbl_field_management_summaries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  period_kind VARCHAR(24) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  classification SMALLINT NOT NULL,
  summary_body TEXT NOT NULL,
  prompt_key_used VARCHAR(255),
  ai_usage_key_used VARCHAR(120),
  ai_config_id_used INTEGER REFERENCES tbl_ai_api_configs(id) ON DELETE SET NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_mgmt_summaries_created ON tbl_field_management_summaries(created_at DESC);

CREATE TABLE IF NOT EXISTS tbl_field_mgmt_summary_report_refs (
  id SERIAL PRIMARY KEY,
  summary_id INTEGER NOT NULL REFERENCES tbl_field_management_summaries(id) ON DELETE CASCADE,
  hash_key VARCHAR(64) NOT NULL,
  CONSTRAINT uq_summary_report_ref UNIQUE (summary_id, hash_key)
);

CREATE INDEX IF NOT EXISTS idx_summary_refs_summary ON tbl_field_mgmt_summary_report_refs(summary_id);

-- Seed: چهار پرامپت خلاصه مدیریتی (بدنه کوتاه پیش‌فرض)
INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'field.management_summary.classification_1',
  'خلاصه مدیریتی — دامنه عمومی',
  'Placeholderها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
),
(
  'field.management_summary.classification_2',
  'خلاصه مدیریتی — دامنه استانی',
  'Placeholderها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی استانی زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
),
(
  'field.management_summary.classification_3',
  'خلاصه مدیریتی — دامنه واحد',
  'Placeholderها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی سطح واحد زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
),
(
  'field.management_summary.classification_4',
  'خلاصه مدیریتی — دامنه خاص',
  'Placeholderها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی با دامنه خاص زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
)
ON CONFLICT (prompt_key) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, credential_mode, credential_env_name, is_enabled)
VALUES (
  'field.management_summary',
  0,
  'Gemini — خلاصه میدانی',
  'google_gemini',
  'gemini-1.5-flash',
  'env_ref',
  'GEMINI_API_KEY',
  true
)
ON CONFLICT (usage_key, sort_order) DO NOTHING;
