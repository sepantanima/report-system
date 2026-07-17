-- Mark news sender strings that are channel/source names (not system users)
CREATE TABLE IF NOT EXISTS tbl_news_sender_source_markers (
  id                  SERIAL PRIMARY KEY,
  sender_text         VARCHAR(255) NOT NULL,
  sender_key          VARCHAR(255) NOT NULL,
  platform            VARCHAR(16) NOT NULL DEFAULT 'bale',
  source_label        VARCHAR(255) NOT NULL,
  marked_by_user_id   INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_nssm_platform CHECK (platform IN ('bale', 'telegram', 'eitaa')),
  CONSTRAINT uq_nssm_platform_sender UNIQUE (platform, sender_key)
);

CREATE INDEX IF NOT EXISTS idx_nssm_sender_text ON tbl_news_sender_source_markers (sender_text);
