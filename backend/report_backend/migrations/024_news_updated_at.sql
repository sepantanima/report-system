-- ستون updated_at برای مرتب‌سازی و audit (در صورت نبود)
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE tbl_news SET updated_at = COALESCE(reviewed_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;
