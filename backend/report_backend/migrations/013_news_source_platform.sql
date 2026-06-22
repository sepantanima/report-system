-- منبع/کانال ورودی خبر (بله، تلگرام، دستی)
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS source_platform VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_news_source_platform ON tbl_news(source_platform)
  WHERE source_platform IS NOT NULL;
