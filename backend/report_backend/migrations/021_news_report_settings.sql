-- تنظیمات و قالب‌های گزارش اخبار

CREATE TABLE IF NOT EXISTS tbl_news_report_settings (
  id SERIAL PRIMARY KEY,
  system_name VARCHAR(255) NOT NULL DEFAULT 'سامانه پایش و تحلیل اخبار',
  organization_name VARCHAR(255) NOT NULL DEFAULT '',
  system_link TEXT NOT NULL DEFAULT '',
  signature_text TEXT NOT NULL DEFAULT 'سامانه پایش و تحلیل اخبار',
  hashtags TEXT NOT NULL DEFAULT '#پایش_خبر
#رصد_رسانه',
  pdf_paper_size VARCHAR(10) NOT NULL DEFAULT 'A4',
  report_color VARCHAR(20) NOT NULL DEFAULT '#c00000',
  default_label VARCHAR(255) NOT NULL DEFAULT 'گزارش اخبار',
  messenger_template TEXT NOT NULL DEFAULT '📌 {{label}}

تاریخ: {{report_date}}
بازه: {{display_from}} تا {{display_to}}

{{news_list}}

{{signature}}
{{hashtags}}',
  news_item_template TEXT NOT NULL DEFAULT '{{index}}) {{news_date}} {{news_time}}
{{news_source}}
{{news_text}}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER
);

INSERT INTO tbl_news_report_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tbl_news_report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '',
  type VARCHAR(30) NOT NULL,
  template_content TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_news_report_tpl_type CHECK (type IN ('html_card', 'html_table', 'txt', 'messenger'))
);

CREATE INDEX IF NOT EXISTS idx_news_report_templates_type ON tbl_news_report_templates(type) WHERE active = true;

-- گسترش محدودیت‌های tbl_news_reports
ALTER TABLE tbl_news_reports DROP CONSTRAINT IF EXISTS chk_news_report_mode;
ALTER TABLE tbl_news_reports ADD CONSTRAINT chk_news_report_mode
  CHECK (mode IN ('preset_1h', 'preset_3h', 'preset_6h', 'preset_12h', 'preset_24h', 'same_day', 'manual'));

ALTER TABLE tbl_news_reports DROP CONSTRAINT IF EXISTS chk_news_report_format;
ALTER TABLE tbl_news_reports ADD CONSTRAINT chk_news_report_format
  CHECK (format IN ('txt', 'html', 'html_card', 'html_table', 'pdf'));

ALTER TABLE tbl_news_reports ADD COLUMN IF NOT EXISTS selected_ids JSONB DEFAULT '[]'::jsonb;
