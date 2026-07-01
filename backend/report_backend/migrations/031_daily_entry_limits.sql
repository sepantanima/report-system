-- سقف ثبت روزانه گزارش میدانی و ورود خبر

CREATE TABLE IF NOT EXISTS tbl_field_report_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  max_submissions_per_day INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT chk_field_daily_limit CHECK (max_submissions_per_day >= 0)
);

INSERT INTO tbl_field_report_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tbl_news_entry_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  max_submissions_per_day INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT chk_news_daily_limit CHECK (max_submissions_per_day >= 0)
);

INSERT INTO tbl_news_entry_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
