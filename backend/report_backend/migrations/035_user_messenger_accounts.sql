-- User ↔ messenger account mapping (news sender resolve + field reports)
CREATE TABLE IF NOT EXISTS tbl_user_messenger_accounts (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  platform          VARCHAR(16) NOT NULL,
  external_id       VARCHAR(64),
  external_username VARCHAR(128),
  display_name      VARCHAR(255),
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_uma_platform CHECK (platform IN ('bale', 'telegram', 'eitaa')),
  CONSTRAINT chk_uma_has_identity CHECK (
    NULLIF(trim(COALESCE(external_id, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(external_username, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(display_name, '')), '') IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uma_platform_external_id
  ON tbl_user_messenger_accounts (platform, external_id)
  WHERE external_id IS NOT NULL AND trim(external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_uma_platform_external_username
  ON tbl_user_messenger_accounts (platform, external_username)
  WHERE external_username IS NOT NULL AND trim(external_username) <> '';

CREATE INDEX IF NOT EXISTS idx_uma_user_id ON tbl_user_messenger_accounts (user_id);

ALTER TABLE tbl_news
  ADD COLUMN IF NOT EXISTS sender_external_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS sender_platform VARCHAR(16);

ALTER TABLE tbl_unit_events
  ADD COLUMN IF NOT EXISTS sender_platform VARCHAR(16);
