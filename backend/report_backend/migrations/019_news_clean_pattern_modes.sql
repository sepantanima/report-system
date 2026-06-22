-- حالت حذف (عبارت / خط) و پشتیبانی regex دستی
ALTER TABLE tbl_news_clean_patterns
  ADD COLUMN IF NOT EXISTS remove_mode VARCHAR(16) NOT NULL DEFAULT 'phrase';

ALTER TABLE tbl_news_clean_patterns
  ADD COLUMN IF NOT EXISTS is_regex BOOLEAN NOT NULL DEFAULT false;
