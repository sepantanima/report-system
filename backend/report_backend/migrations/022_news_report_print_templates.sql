-- تنظیمات چاپ per-format و قالب‌های خروجی فایل

ALTER TABLE tbl_news_report_settings
  ADD COLUMN IF NOT EXISTS print_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS html_card_template TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS html_table_template TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS txt_output_template TEXT NOT NULL DEFAULT '';
