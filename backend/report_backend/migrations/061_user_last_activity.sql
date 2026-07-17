-- حضور کاربران برای داشبورد مرکز فرماندهی
ALTER TABLE tbl_users
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tbl_users_last_activity
  ON tbl_users (last_activity DESC NULLS LAST)
  WHERE active IS NOT FALSE;
