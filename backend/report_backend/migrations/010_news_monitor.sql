-- مدیریت اخبار: ستون‌های جدید (فقط ADD — سازگار با INSERT مستقیم n8n)
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS quality SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS review_state VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE tbl_news SET review_state = 'rejected'
WHERE COALESCE(is_approved, 0) = 2 AND review_state = 'pending';

UPDATE tbl_news SET review_state = 'rumor'
WHERE COALESCE(is_approved, 0) = 1 AND COALESCE(status, 0) = 2 AND review_state = 'pending';

UPDATE tbl_news SET review_state = 'approved'
WHERE COALESCE(is_approved, 0) = 1 AND COALESCE(status, 0) <> 2 AND review_state = 'pending';

CREATE TABLE IF NOT EXISTS tbl_news_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  title_fa VARCHAR(80) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS tbl_news_category_links (
  news_id INTEGER NOT NULL REFERENCES tbl_news(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES tbl_news_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (news_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_news_category_links_news ON tbl_news_category_links(news_id);
CREATE INDEX IF NOT EXISTS idx_news_category_links_cat ON tbl_news_category_links(category_id);

INSERT INTO tbl_news_categories (code, title_fa, sort_order) VALUES
  ('political', 'سیاسی', 1),
  ('military', 'نظامی', 2),
  ('security', 'امنیتی', 3),
  ('sports', 'ورزشی', 4),
  ('general', 'عمومی', 5),
  ('economic', 'اقتصادی', 6),
  ('social', 'اجتماعی', 7),
  ('cultural', 'فرهنگی', 8),
  ('science', 'علمی', 9),
  ('international', 'بین‌الملل', 10)
ON CONFLICT (code) DO NOTHING;
