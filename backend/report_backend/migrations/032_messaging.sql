-- سیستم پیام و ابلاغ درون‌سامانه

CREATE TABLE IF NOT EXISTS tbl_message_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  max_direct_per_day INTEGER NOT NULL DEFAULT 30,
  max_direct_per_hour INTEGER NOT NULL DEFAULT 10,
  max_announcements_per_day INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT chk_msg_settings_direct_day CHECK (max_direct_per_day >= 0),
  CONSTRAINT chk_msg_settings_direct_hour CHECK (max_direct_per_hour >= 0),
  CONSTRAINT chk_msg_settings_ann CHECK (max_announcements_per_day >= 0)
);

INSERT INTO tbl_message_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tbl_messages (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  title VARCHAR(120) NOT NULL DEFAULT '',
  body VARCHAR(500) NOT NULL DEFAULT '',
  sender_id INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20),
  entity_id VARCHAR(64),
  show_as_banner BOOLEAN NOT NULL DEFAULT false,
  banner_dismissible BOOLEAN NOT NULL DEFAULT true,
  publish_to_messenger BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_messages_kind CHECK (kind IN ('direct', 'announcement', 'entity')),
  CONSTRAINT chk_messages_priority CHECK (priority IN ('normal', 'important', 'order')),
  CONSTRAINT chk_messages_entity_type CHECK (entity_type IS NULL OR entity_type IN ('news', 'field_report'))
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON tbl_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_entity ON tbl_messages(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_banner ON tbl_messages(show_as_banner, starts_at, expires_at) WHERE show_as_banner = true;

CREATE TABLE IF NOT EXISTS tbl_message_targets (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES tbl_messages(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_value VARCHAR(120),
  CONSTRAINT chk_message_target_type CHECK (
    target_type IN ('user', 'role', 'unit', 'all', 'news_category', 'report_type')
  )
);

CREATE INDEX IF NOT EXISTS idx_message_targets_msg ON tbl_message_targets(message_id);

CREATE TABLE IF NOT EXISTS tbl_message_recipients (
  message_id INTEGER NOT NULL REFERENCES tbl_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  delivery_reason VARCHAR(40) NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON tbl_message_recipients(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_message_recipients_unread ON tbl_message_recipients(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS tbl_message_messenger_publishes (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES tbl_messages(id) ON DELETE CASCADE,
  channel_config_id INTEGER REFERENCES tbl_messenger_channel_configs(id) ON DELETE SET NULL,
  send_log_id INTEGER REFERENCES tbl_messenger_send_logs(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_msg_messenger_status CHECK (status IN ('pending', 'ok', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_msg_messenger_pub_msg ON tbl_message_messenger_publishes(message_id);
