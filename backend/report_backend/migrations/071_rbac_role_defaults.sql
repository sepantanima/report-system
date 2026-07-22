-- Per-role default permission snapshot (admin-configurable reset baseline)
ALTER TABLE tbl_role_templates
  ADD COLUMN IF NOT EXISTS default_permission_codes JSONB;

COMMENT ON COLUMN tbl_role_templates.default_permission_codes IS
  'Admin-saved default permissions for reset-defaults; NULL = use code seed';

-- Default role(s) pre-selected when creating a new user
ALTER TABLE tbl_rbac_meta
  ADD COLUMN IF NOT EXISTS default_new_user_role_codes JSONB NOT NULL DEFAULT '["user"]'::jsonb;

COMMENT ON COLUMN tbl_rbac_meta.default_new_user_role_codes IS
  'UI role codes assigned by default on new user form (e.g. ["user"])';

-- Bootstrap default permission snapshots from current template permissions where empty
UPDATE tbl_role_templates rt
SET default_permission_codes = sub.codes
FROM (
  SELECT rtp.role_template_id,
         COALESCE(json_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '[]'::json) AS codes
  FROM tbl_role_template_permissions rtp
  JOIN tbl_permissions p ON p.id = rtp.permission_id
  GROUP BY rtp.role_template_id
) sub
WHERE rt.id = sub.role_template_id
  AND rt.default_permission_codes IS NULL;
