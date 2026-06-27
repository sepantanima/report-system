-- گسترش modeهای مجاز گزارش خبری (هم‌خوان با UI)
ALTER TABLE tbl_news_reports DROP CONSTRAINT IF EXISTS chk_news_report_mode;
ALTER TABLE tbl_news_reports ADD CONSTRAINT chk_news_report_mode
  CHECK (mode IN (
    'preset_1h', 'preset_3h', 'preset_6h', 'preset_12h', 'preset_24h',
    'same_day', 'manual'
  ));
