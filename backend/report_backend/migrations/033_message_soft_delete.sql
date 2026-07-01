-- حذف منطقی پیام برای گیرنده و فرستنده

ALTER TABLE tbl_message_recipients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tbl_messages
  ADD COLUMN IF NOT EXISTS sender_deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_message_recipients_user_active
  ON tbl_message_recipients (user_id, message_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_active
  ON tbl_messages (sender_id, created_at DESC)
  WHERE sender_deleted_at IS NULL;
