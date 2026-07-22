-- آستانه کاراکتر برای پیشنهاد/الزام خلاصه‌سازی خبر (پیش‌فرض ۳۰۰)
ALTER TABLE tbl_news_entry_settings
  ADD COLUMN IF NOT EXISTS summarize_char_threshold INTEGER NOT NULL DEFAULT 300;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_news_summarize_threshold'
  ) THEN
    ALTER TABLE tbl_news_entry_settings
      ADD CONSTRAINT chk_news_summarize_threshold
      CHECK (summarize_char_threshold >= 50 AND summarize_char_threshold <= 5000);
  END IF;
END $$;

UPDATE tbl_news_entry_settings
SET summarize_char_threshold = 300
WHERE id = 1 AND summarize_char_threshold IS NULL;
