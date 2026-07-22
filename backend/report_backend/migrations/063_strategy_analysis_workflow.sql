-- جریان مدیریت تحلیل راهبردی و نمایش گزیده در اتاق فرمان

ALTER TABLE tbl_analysis_brief_submissions
  ADD COLUMN IF NOT EXISTS show_in_command BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS command_visible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS command_visible_by INTEGER REFERENCES tbl_users(id);

CREATE INDEX IF NOT EXISTS idx_brief_show_in_command
  ON tbl_analysis_brief_submissions(show_in_command, manager_approved_at DESC)
  WHERE show_in_command = true;

ALTER TABLE tbl_strategy_outputs
  ADD COLUMN IF NOT EXISTS content_html TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES tbl_users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE tbl_strategy_outputs
  DROP CONSTRAINT IF EXISTS chk_strategy_output_status;

ALTER TABLE tbl_strategy_outputs
  ADD CONSTRAINT chk_strategy_output_status CHECK (
    status IN ('draft', 'approved', 'published', 'archived')
  );

CREATE INDEX IF NOT EXISTS idx_strategy_outputs_approved
  ON tbl_strategy_outputs(status, approved_at DESC);

-- خروجی‌های قدیمی منتشرشده، تأییدشده محسوب می‌شوند.
UPDATE tbl_strategy_outputs
SET approved_at = COALESCE(approved_at, published_at, updated_at, created_at)
WHERE status = 'published' AND approved_at IS NULL;
