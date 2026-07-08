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
  is_approved INTEGER DEFAULT 0,
  status INTEGER DEFAULT 0,
  duplicate_status VARCHAR(16) DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Report types lookup
CREATE TABLE IF NOT EXISTS tbl_report_types (
  id SERIAL PRIMARY KEY,
  title_fa VARCHAR(255),
  type_code VARCHAR(64)
);
