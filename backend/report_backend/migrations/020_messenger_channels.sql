-- کانال‌ها و مقاصد پیام‌رسان + گزارش‌های اخبار

CREATE TABLE IF NOT EXISTS tbl_messenger_provider_templates (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label_fa VARCHAR(255) NOT NULL DEFAULT '',
  engine VARCHAR(40) NOT NULL,
  default_credential_env_name VARCHAR(120),
  default_extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_messenger_engine CHECK (engine IN ('telegram_bot', 'bale_bot', 'eitaa_bot'))
);

CREATE INDEX IF NOT EXISTS idx_messenger_provider_enabled ON tbl_messenger_provider_templates(is_enabled, sort_order);

CREATE TABLE IF NOT EXISTS tbl_messenger_channel_configs (
  id SERIAL PRIMARY KEY,
  usage_key VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  title_fa VARCHAR(255) NOT NULL DEFAULT '',
  provider_type VARCHAR(80) NOT NULL,
  destination_kind VARCHAR(20) NOT NULL DEFAULT 'channel',
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credential_mode VARCHAR(20) NOT NULL DEFAULT 'env_ref',
  credential_env_name VARCHAR(120),
  credential_secret_cipher TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT chk_messenger_dest_kind CHECK (destination_kind IN ('channel', 'group', 'chat')),
  CONSTRAINT chk_messenger_cred_mode CHECK (credential_mode IN ('env_ref', 'stored_secret')),
  UNIQUE (usage_key, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_messenger_channel_usage ON tbl_messenger_channel_configs(usage_key) WHERE is_enabled = true;

CREATE TABLE IF NOT EXISTS tbl_messenger_send_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  usage_key VARCHAR(120),
  channel_config_id INTEGER REFERENCES tbl_messenger_channel_configs(id) ON DELETE SET NULL,
  payload_kind VARCHAR(20) NOT NULL DEFAULT 'text',
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  platform_message_id VARCHAR(120),
  error_message TEXT,
  request_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messenger_send_logs_created ON tbl_messenger_send_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS tbl_news_reports (
  id SERIAL PRIMARY KEY,
  created_by INTEGER,
  report_kind VARCHAR(20) NOT NULL DEFAULT 'list',
  format VARCHAR(10) NOT NULL DEFAULT 'txt',
  mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  from_ref_key VARCHAR(20),
  to_ref_key VARCHAR(20),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  news_count INT NOT NULL DEFAULT 0,
  file_name VARCHAR(255),
  file_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  channel_config_id INTEGER REFERENCES tbl_messenger_channel_configs(id) ON DELETE SET NULL,
  publish_status VARCHAR(20),
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_news_report_kind CHECK (report_kind IN ('list', 'analytical', 'file')),
  CONSTRAINT chk_news_report_format CHECK (format IN ('txt', 'html', 'pdf')),
  CONSTRAINT chk_news_report_mode CHECK (mode IN ('preset_6h', 'preset_12h', 'preset_24h', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_news_reports_created ON tbl_news_reports(created_at DESC);

INSERT INTO tbl_messenger_provider_templates (slug, label_fa, engine, default_credential_env_name, default_extra_config, sort_order)
VALUES
  ('bale_bot', 'ربات بله', 'bale_bot', 'BALE_NEZNEWS_BOT_TOKEN', '{"base_url":"https://tapi.bale.ai","parse_mode":"Markdown"}'::jsonb, 0),
  ('telegram_bot', 'ربات تلگرام', 'telegram_bot', 'TELEGRAM_BOT_TOKEN', '{"base_url":"https://api.telegram.org","parse_mode":"MarkdownV2"}'::jsonb, 1),
  ('eitaa_bot', 'ربات ایتا', 'eitaa_bot', 'EITAA_BOT_TOKEN', '{"base_url":"https://eitaayar.ir/api","parse_mode":"Markdown"}'::jsonb, 2)
ON CONFLICT (slug) DO UPDATE SET
  label_fa = EXCLUDED.label_fa,
  engine = EXCLUDED.engine,
  default_credential_env_name = EXCLUDED.default_credential_env_name,
  default_extra_config = EXCLUDED.default_extra_config,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO tbl_messenger_channel_configs (
  usage_key, sort_order, title_fa, provider_type, destination_kind, extra_config,
  credential_mode, credential_env_name, is_enabled
) VALUES
  (
    'news.report.publish', 0, 'گزارشات جهت ارسال', 'bale_bot', 'channel',
    '{"chat_id":"5508833982","bot_username":"@NezNewsBot","bot_public_link":"ble.ir/Nima_News_bot"}'::jsonb,
    'env_ref', 'BALE_NEZNEWS_BOT_TOKEN', true
  ),
  (
    'news.report.publish', 1, 'تاب آوری', 'bale_bot', 'group',
    '{"chat_id":"4421359647","bot_username":"@NezNewsBot","bot_public_link":"ble.ir/Nima_News_bot"}'::jsonb,
    'env_ref', 'BALE_NEZNEWS_BOT_TOKEN', true
  ),
  (
    'news.report.publish', 2, 'تعامل داخلی', 'bale_bot', 'group',
    '{"chat_id":"6238319944","bot_username":"@NezNewsBot","bot_public_link":"ble.ir/Nima_News_bot"}'::jsonb,
    'env_ref', 'BALE_NEZNEWS_BOT_TOKEN', true
  )
ON CONFLICT (usage_key, sort_order) DO UPDATE SET
  title_fa = EXCLUDED.title_fa,
  provider_type = EXCLUDED.provider_type,
  destination_kind = EXCLUDED.destination_kind,
  extra_config = EXCLUDED.extra_config,
  credential_mode = EXCLUDED.credential_mode,
  credential_env_name = EXCLUDED.credential_env_name,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = CURRENT_TIMESTAMP;
