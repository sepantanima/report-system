-- Analysis submission bank (بانک تحلیل) — entry modes, publish workflow

ALTER TABLE tbl_analysis_brief_submissions
  ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20) DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS attribution_text VARCHAR(500),
  ADD COLUMN IF NOT EXISTS composition_date DATE,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS editor_id INTEGER REFERENCES tbl_users(id),
  ADD COLUMN IF NOT EXISTS editor_note TEXT,
  ADD COLUMN IF NOT EXISTS editor_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS publish_status VARCHAR(30) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS channel_config_id INTEGER,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS publish_error TEXT,
  ADD COLUMN IF NOT EXISTS bank_content TEXT;

CREATE INDEX IF NOT EXISTS idx_brief_submissions_entry_mode ON tbl_analysis_brief_submissions(entry_mode);
CREATE INDEX IF NOT EXISTS idx_brief_submissions_publish_status ON tbl_analysis_brief_submissions(publish_status);
