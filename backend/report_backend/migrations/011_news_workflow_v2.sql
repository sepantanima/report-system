-- News Monitor v2: workflow, duplicates, audit (ADD-only — n8n-safe)
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(16) NOT NULL DEFAULT 'new';
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS duplicate_status VARCHAR(16) NOT NULL DEFAULT 'none';
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS duplicate_parent_id INTEGER REFERENCES tbl_news(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tbl_news_audit_log (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES tbl_news(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  action VARCHAR(32) NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_audit_log_news ON tbl_news_audit_log(news_id);
CREATE INDEX IF NOT EXISTS idx_news_workflow_status ON tbl_news(workflow_status);
CREATE INDEX IF NOT EXISTS idx_news_duplicate_status ON tbl_news(duplicate_status);

-- Backfill workflow_status from review_state
UPDATE tbl_news SET workflow_status = 'pending'
WHERE COALESCE(review_state, 'pending') = 'pending' AND workflow_status = 'new';

UPDATE tbl_news SET workflow_status = 'reviewed'
WHERE COALESCE(review_state, 'pending') <> 'pending' AND workflow_status = 'new';

UPDATE tbl_news SET workflow_status = 'finalized'
WHERE COALESCE(review_state, 'pending') = 'approved'
  AND COALESCE(is_approved, 0) = 1
  AND workflow_status IN ('new', 'reviewed');

-- Backfill duplicate_status from is_duplicate
UPDATE tbl_news SET duplicate_status = 'suspicious'
WHERE COALESCE(is_duplicate, false) = true AND duplicate_status = 'none';

-- Remap priority 5-level → 4-level PRD
UPDATE tbl_news SET priority = 4 WHERE priority = 5;
UPDATE tbl_news SET priority = 3 WHERE priority > 4;

-- Sync is_duplicate for filters
UPDATE tbl_news SET is_duplicate = (duplicate_status <> 'none');

-- Migrate news_admin role → news_chief in user roles (text/JSON)
UPDATE tbl_users
SET role = REPLACE(role::text, 'news_admin', 'news_chief')
WHERE role::text LIKE '%news_admin%';
