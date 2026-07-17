-- پک خروجی گزارش اخبار: پیش‌فرض‌های پک و فیلترهای جریان

ALTER TABLE tbl_news_report_settings
  ADD COLUMN IF NOT EXISTS pack_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS report_default_filters JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tbl_news_reports DROP CONSTRAINT IF EXISTS chk_news_report_format;
ALTER TABLE tbl_news_reports ADD CONSTRAINT chk_news_report_format
  CHECK (format IN ('txt', 'html', 'html_card', 'html_table', 'pdf', 'zip'));

UPDATE tbl_news_report_settings SET
  pack_defaults = COALESCE(NULLIF(pack_defaults, '{}'::jsonb), '{
    "pack_types": [
      {"key": "very_important", "label": "اخبار فوری", "file_slug": "فوری", "help": "اخبار با اولویت خیلی مهم (سطح ۱)", "enabled_by_default": true, "format_keys": ["html_card", "pdf_a5_card", "txt"]},
      {"key": "important", "label": "اخبار مهم", "file_slug": "مهم", "enabled_by_default": true, "format_keys": ["html_card", "pdf_a5_card"]},
      {"key": "valuable", "label": "اخبار ارزشمند", "file_slug": "ارزشمند", "help": "شامل اخبار فوری و مهم", "enabled_by_default": true, "format_keys": ["html_table", "html_card", "pdf_a4"]},
      {"key": "all", "label": "همه اخبار", "file_slug": "کل", "enabled_by_default": true, "format_keys": ["txt", "html_table"]}
    ],
    "default_delivery": "zip",
    "filename_style": "full_fa"
  }'::jsonb),
  report_default_filters = COALESCE(NULLIF(report_default_filters, '{}'::jsonb), '{
    "duplicate": "exclude",
    "is_deleted": false,
    "statuses": ["published"],
    "qualities": [3, 4, 5],
    "priorities": [1, 2, 3]
  }'::jsonb)
WHERE id = 1;
