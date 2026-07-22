-- Migration 068: Legacy role column retained (dual-write phase)
-- tbl_users.role remains for JWT backward compatibility until all clients refresh.
-- Source of truth: tbl_user_role_assignments + tbl_user_permission_grants

COMMENT ON COLUMN tbl_users.role IS 'Legacy login role — prefer tbl_user_role_assignments';
