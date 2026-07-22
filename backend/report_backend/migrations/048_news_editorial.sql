-- پالایش و دبیری هوشمند اخبار: مرتبط/غیرمرتبط، وضعیت پالایش، اجرای دسته‌ای

ALTER TABLE tbl_news
  ADD COLUMN IF NOT EXISTS relevance_status VARCHAR(16) NOT NULL DEFAULT 'unset',
  ADD COLUMN IF NOT EXISTS editorial_state VARCHAR(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS editorial_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS editorial_by INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editorial_run_id INTEGER;

CREATE TABLE IF NOT EXISTS tbl_news_editorial_runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  date_from VARCHAR(16),
  date_to VARCHAR(16),
  status VARCHAR(16) NOT NULL DEFAULT 'queued',
  total_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_news_relevance_status ON tbl_news (relevance_status);
CREATE INDEX IF NOT EXISTS idx_news_editorial_state ON tbl_news (editorial_state);
CREATE INDEX IF NOT EXISTS idx_news_editorial_run_id ON tbl_news (editorial_run_id);
CREATE INDEX IF NOT EXISTS idx_news_editorial_runs_status ON tbl_news_editorial_runs (status);

ALTER TABLE tbl_news
  DROP CONSTRAINT IF EXISTS tbl_news_relevance_status_check;
ALTER TABLE tbl_news
  ADD CONSTRAINT tbl_news_relevance_status_check
  CHECK (relevance_status IN ('unset', 'relevant', 'irrelevant'));

ALTER TABLE tbl_news
  DROP CONSTRAINT IF EXISTS tbl_news_editorial_state_check;
ALTER TABLE tbl_news
  ADD CONSTRAINT tbl_news_editorial_state_check
  CHECK (editorial_state IN ('pending', 'manual', 'ai'));

ALTER TABLE tbl_news
  DROP CONSTRAINT IF EXISTS tbl_news_editorial_run_fk;
ALTER TABLE tbl_news
  ADD CONSTRAINT tbl_news_editorial_run_fk
  FOREIGN KEY (editorial_run_id) REFERENCES tbl_news_editorial_runs(id) ON DELETE SET NULL;
