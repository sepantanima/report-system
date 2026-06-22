-- n8n ingest: DEFAULT pending so INSERT without workflow_status lands in editor queue.
-- Monitor drafts still use explicit workflow_status = 'new' via API.

UPDATE tbl_news
SET workflow_status = 'pending'
WHERE workflow_status = 'new'
  AND observer_id IS NULL;

ALTER TABLE tbl_news
  ALTER COLUMN workflow_status SET DEFAULT 'pending';
