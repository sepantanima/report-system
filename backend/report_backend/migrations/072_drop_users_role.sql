-- Migration 072: tbl_users.role removed — tbl_user_role_assignments is source of truth
-- Run backfill via runMigration072.js before applying this file.

ALTER TABLE tbl_users DROP COLUMN IF EXISTS role;

UPDATE tbl_rbac_meta
SET permission_version = permission_version + 1,
    updated_at = NOW()
WHERE id = 1;

COMMENT ON TABLE tbl_user_role_assignments IS 'Source of truth for user roles (post-072)';
