-- Migration 065: Dynamic RBAC tables + seed hooks

CREATE TABLE IF NOT EXISTS tbl_permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(128) NOT NULL UNIQUE,
  label_fa VARCHAR(256) NOT NULL DEFAULT '',
  module VARCHAR(64) NOT NULL DEFAULT 'general',
  perm_type VARCHAR(32) NOT NULL DEFAULT 'action',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tbl_role_templates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  label_fa VARCHAR(256) NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tbl_role_template_permissions (
  role_template_id INT NOT NULL REFERENCES tbl_role_templates(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES tbl_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_template_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tbl_user_role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  role_template_id INT NOT NULL REFERENCES tbl_role_templates(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_template_id)
);

CREATE TABLE IF NOT EXISTS tbl_user_permission_grants (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES tbl_permissions(id) ON DELETE CASCADE,
  effect VARCHAR(8) NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS tbl_rbac_meta (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  permission_version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tbl_rbac_meta (id, permission_version) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS permission_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON tbl_user_role_assignments(user_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_permission_grants_user ON tbl_user_permission_grants(user_id);
