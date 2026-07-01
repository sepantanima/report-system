-- ویرایش ابلاغ + نمایش مدیر کل

ALTER TABLE tbl_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON tbl_messages(edited_at)
  WHERE edited_at IS NOT NULL;
