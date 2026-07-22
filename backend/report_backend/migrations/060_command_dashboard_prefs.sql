-- مرکز فرماندهی: چیدمان شخصی، تاریخچه مشاهده، acknowledge هشدار

CREATE TABLE IF NOT EXISTS tbl_command_dashboard_layouts (
  user_id INTEGER PRIMARY KEY REFERENCES tbl_users(id) ON DELETE CASCADE,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_command_dashboard_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_command_dash_views_user
  ON tbl_command_dashboard_views(user_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS tbl_command_alert_acks (
  user_id INTEGER NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  alert_id VARCHAR(120) NOT NULL,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, alert_id)
);
