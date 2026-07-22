-- Topic manager completion (اتمام موضوع) — distinct from archive (Closed + deleted_at)
ALTER TABLE tbl_analysis_topics ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

COMMENT ON COLUMN tbl_analysis_topics.completed_at IS 'When a manager closed the topic for new missions (status=Completed)';
