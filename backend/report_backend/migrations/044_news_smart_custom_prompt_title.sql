-- عنوان پرامپت شخصی (جدا از عنوان تحلیل خروجی)

ALTER TABLE tbl_news_smart_analyses
  ADD COLUMN IF NOT EXISTS custom_prompt_title VARCHAR(200);
