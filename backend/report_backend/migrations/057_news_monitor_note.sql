-- یادداشت اختیاری پایشگر: علت اهمیت و ارتباط خبر با سازمان
ALTER TABLE tbl_news
  ADD COLUMN IF NOT EXISTS monitor_note VARCHAR(100);

COMMENT ON COLUMN tbl_news.monitor_note IS 'توضیح اختیاری پایشگر درباره اهمیت و ارتباط خبر با سازمان';
