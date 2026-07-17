-- تنظیمات بررسی تکراری برای اخبار و گزارش میدانی

ALTER TABLE tbl_news_entry_settings
  ADD COLUMN IF NOT EXISTS duplicate_check_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicate_check_scope VARCHAR(16) NOT NULL DEFAULT 'today',
  ADD COLUMN IF NOT EXISTS duplicate_similarity_threshold INTEGER NOT NULL DEFAULT 70;

ALTER TABLE tbl_field_report_settings
  ADD COLUMN IF NOT EXISTS duplicate_check_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicate_check_scope VARCHAR(16) NOT NULL DEFAULT 'today',
  ADD COLUMN IF NOT EXISTS duplicate_similarity_threshold INTEGER NOT NULL DEFAULT 70;

CREATE INDEX IF NOT EXISTS idx_news_hash_key ON tbl_news (hash_key) WHERE hash_key IS NOT NULL;
