-- Dev-only base schema for local development.
--
-- In production these base tables (tbl_units, tbl_users, tbl_unit_events,
-- tbl_news, tbl_report_types) already exist in the target PostgreSQL database;
-- the repo's numbered migrations only ADD modules on top of them. This file
-- recreates a minimal but sufficient base schema so the app can run locally.
-- Columns mirror what the application code and migrations reference.
-- Safe to run repeatedly (CREATE TABLE IF NOT EXISTS).

-- Organizational units
CREATE TABLE IF NOT EXISTS tbl_units (
  "UnitCode" INTEGER PRIMARY KEY,
  "Name" VARCHAR(255),
  "UnitShortName" VARCHAR(255),
  "StateName" VARCHAR(255)
);

-- Application users
CREATE TABLE IF NOT EXISTS tbl_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(128) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(128) NOT NULL DEFAULT 'user',
  gender VARCHAR(16) NOT NULL DEFAULT 'male',
  active BOOLEAN NOT NULL DEFAULT true,
  unit_cd INTEGER
);

-- Field report events
CREATE TABLE IF NOT EXISTS tbl_unit_events (
  id SERIAL PRIMARY KEY,
  unitcd INTEGER,
  chat_title TEXT,
  raw_text TEXT,
  cleaned_text TEXT,
  title TEXT,
  date VARCHAR(10),
  time INTEGER,
  news_ts VARCHAR(32),
  sender_id VARCHAR(64),
  sender_name VARCHAR(255),
  sender_platform VARCHAR(16),
  province VARCHAR(255),
  hash_key VARCHAR(64),
  priority INTEGER DEFAULT 1,
  quality INTEGER DEFAULT 3,
  source VARCHAR(64),
  message_type VARCHAR(64),
  state VARCHAR(32) DEFAULT 'pending',
  classification INTEGER DEFAULT 1,
  manager_notes TEXT,
  workflow_logs TEXT,
  is_deleted BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ
);

-- News items (base columns; migrations add module-specific columns on top)
CREATE TABLE IF NOT EXISTS tbl_news (
  id SERIAL PRIMARY KEY,
  raw_text TEXT,
  cleaned_text TEXT,
  char_count INTEGER,
  hash_key VARCHAR(64),
  summary TEXT,
  source VARCHAR(255),
  sender VARCHAR(255),
  sender_external_id VARCHAR(64),
  sender_platform VARCHAR(16),
  source_platform VARCHAR(64),
  source_url TEXT,
  source_date_jalali VARCHAR(10),
  source_time_hm VARCHAR(5),
  source_ts_utc TIMESTAMPTZ,
  source_ts_tehran TIMESTAMPTZ,
  relay_date_jalali VARCHAR(10),
  relay_time_hm VARCHAR(5),
  relay_ts_utc TIMESTAMPTZ,
  relay_ts_tehran TIMESTAMPTZ,
  observer_id INTEGER,
  observer_username VARCHAR(128),
  observer_first_name VARCHAR(255),
  workflow_status VARCHAR(16) DEFAULT 'new',
  publish_status VARCHAR(16) NOT NULL DEFAULT 'none',
  is_approved INTEGER DEFAULT 0,
  status INTEGER DEFAULT 0,
  duplicate_status VARCHAR(16) DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  monitor_note VARCHAR(100)
);

-- Report types lookup
CREATE TABLE IF NOT EXISTS tbl_report_types (
  id SERIAL PRIMARY KEY,
  title_fa VARCHAR(255),
  type_code VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS tbl_user_messenger_accounts (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  platform          VARCHAR(16) NOT NULL,
  external_id       VARCHAR(64),
  external_username VARCHAR(128),
  display_name      VARCHAR(255),
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_uma_platform CHECK (platform IN ('bale', 'telegram', 'eitaa')),
  CONSTRAINT chk_uma_has_identity CHECK (
    NULLIF(trim(COALESCE(external_id, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(external_username, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(display_name, '')), '') IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS tbl_news_sender_source_markers (
  id                  SERIAL PRIMARY KEY,
  sender_text         VARCHAR(255) NOT NULL,
  sender_key          VARCHAR(255) NOT NULL,
  platform            VARCHAR(16) NOT NULL DEFAULT 'bale',
  source_label        VARCHAR(255) NOT NULL,
  marked_by_user_id   INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_nssm_platform CHECK (platform IN ('bale', 'telegram', 'eitaa')),
  CONSTRAINT uq_nssm_platform_sender UNIQUE (platform, sender_key)
);
