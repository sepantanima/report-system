-- حذف منطقی اخبار
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_news_is_deleted ON tbl_news(is_deleted) WHERE is_deleted = true;
