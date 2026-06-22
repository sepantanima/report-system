-- اکشن‌های مرکزی AI برای فرم‌ها + لاگ اجرا

CREATE TABLE IF NOT EXISTS tbl_ai_form_actions (
  id SERIAL PRIMARY KEY,
  form_name VARCHAR(120) NOT NULL,
  action_name VARCHAR(120) NOT NULL,
  button_label_fa VARCHAR(255) NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  prompt_key VARCHAR(255) NOT NULL DEFAULT '',
  ai_config_id INTEGER REFERENCES tbl_ai_api_configs(id) ON DELETE SET NULL,
  usage_key VARCHAR(120),
  source_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  assembly_strategy VARCHAR(80) NOT NULL DEFAULT 'labeled_fields',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT uq_ai_form_actions_form_action UNIQUE (form_name, action_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_form_actions_form ON tbl_ai_form_actions(form_name) WHERE is_enabled = true;

CREATE TABLE IF NOT EXISTS tbl_ai_run_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  form_name VARCHAR(120) NOT NULL,
  action_name VARCHAR(120) NOT NULL,
  prompt_key VARCHAR(255),
  ai_config_id INTEGER,
  usage_key_used VARCHAR(120),
  request_text TEXT,
  response_text TEXT,
  status VARCHAR(40) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_run_logs_user ON tbl_ai_run_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_run_logs_form_created ON tbl_ai_run_logs(form_name, action_name, created_at DESC);

-- نمونه: خلاصه مدیریتی (prompt_key پیش‌فرض؛ برای strategy میدانی کلید واقعی از طبقه‌بندی محاسبه می‌شود)
INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  ai_config_id, usage_key, source_fields, assembly_strategy
) VALUES (
  'field_management_summary_create',
  'generate_summary',
  'تولید پیش‌نویس با هوش‌افزار',
  true,
  'field.management_summary.classification_1',
  NULL,
  'field.management_summary',
  '[]'::jsonb,
  'unified_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;
