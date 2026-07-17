-- وضعیت انتشار سردبیر: none | ready | banked
ALTER TABLE tbl_news
  ADD COLUMN IF NOT EXISTS publish_status VARCHAR(16) NOT NULL DEFAULT 'none';

UPDATE tbl_news
SET publish_status = 'ready'
WHERE trim(both '''' from trim(COALESCE(workflow_status, ''))) = 'finalized'
  AND COALESCE(is_approved, 0)::int = 1
  AND publish_status = 'none';

UPDATE tbl_news
SET publish_status = 'none'
WHERE trim(both '''' from trim(COALESCE(workflow_status, ''))) = 'finalized'
  AND COALESCE(is_approved, 0)::int = 2
  AND publish_status = 'none';

CREATE INDEX IF NOT EXISTS idx_news_publish_status ON tbl_news (publish_status)
  WHERE publish_status IN ('ready', 'banked');
