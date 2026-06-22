-- بازسازی ساختار خلاصه مدیریتی میدانی (نسخه ۲):
-- نوع خلاصه (استانی/خاص)، زیرعنوان خودکار، فیلترهای چندگانه (استان/یگان/موضوع)،
-- امضای فیلتر برای تشخیص تکرار و شمارنده، بازه دلخواه و تاریخ شمسی.
-- داده‌های قبلی تستی هستند و حذف می‌شوند.

DROP TABLE IF EXISTS tbl_field_mgmt_summary_report_refs;
DROP TABLE IF EXISTS tbl_field_management_summaries;

CREATE TABLE tbl_field_management_summaries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  subtitle TEXT,
  -- provincial = استانی | special = خاص (بر اساس یگان‌ها)
  summary_type VARCHAR(16) NOT NULL DEFAULT 'provincial',
  -- weekly | monthly | semi_annual | annual | custom
  period_kind VARCHAR(24) NOT NULL,
  -- تاریخ شمسی YYYY-MM-DD هم‌راستا با فیلد date در tbl_unit_events
  period_start VARCHAR(10) NOT NULL,
  period_end VARCHAR(10) NOT NULL,
  provinces TEXT[] NOT NULL DEFAULT '{}',
  unit_codes TEXT[] NOT NULL DEFAULT '{}',
  topics TEXT[] NOT NULL DEFAULT '{}',
  classification SMALLINT,
  only_verified BOOLEAN NOT NULL DEFAULT true,
  -- هش کانونیکال فیلترها برای تشخیص خلاصه تکراری
  filter_signature VARCHAR(64) NOT NULL,
  -- شمارنده تکرار برای همان امضای فیلتر
  seq_no SMALLINT NOT NULL DEFAULT 1,
  report_count INTEGER NOT NULL DEFAULT 0,
  summary_body TEXT NOT NULL,
  prompt_key_used VARCHAR(255),
  ai_usage_key_used VARCHAR(120),
  ai_config_id_used INTEGER REFERENCES tbl_ai_api_configs(id) ON DELETE SET NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_field_mgmt_summary_sig_seq UNIQUE (filter_signature, seq_no)
);

CREATE INDEX idx_field_mgmt_summaries_created ON tbl_field_management_summaries(created_at DESC);
CREATE INDEX idx_field_mgmt_summaries_signature ON tbl_field_management_summaries(filter_signature);
CREATE INDEX idx_field_mgmt_summaries_type ON tbl_field_management_summaries(summary_type);

CREATE TABLE tbl_field_mgmt_summary_report_refs (
  id SERIAL PRIMARY KEY,
  summary_id INTEGER NOT NULL REFERENCES tbl_field_management_summaries(id) ON DELETE CASCADE,
  hash_key VARCHAR(64) NOT NULL,
  CONSTRAINT uq_summary_report_ref UNIQUE (summary_id, hash_key)
);

CREATE INDEX idx_summary_refs_summary ON tbl_field_mgmt_summary_report_refs(summary_id);
