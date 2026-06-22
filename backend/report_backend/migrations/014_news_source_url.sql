-- لینک خبر اصلی (URL منبع خارجی)
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
