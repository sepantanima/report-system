-- Migration 069: آرشیو و یادداشت reconcile برای تاریخچه sync

ALTER TABLE tbl_sync_runs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE tbl_sync_runs ADD COLUMN IF NOT EXISTS archived_by INT REFERENCES tbl_users(id);
ALTER TABLE tbl_sync_runs ADD COLUMN IF NOT EXISTS reconcile_note TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_runs_org_archived ON tbl_sync_runs(org_code, archived_at);
CREATE INDEX IF NOT EXISTS idx_sync_runs_org_ack ON tbl_sync_runs(org_code, run_type, ack_status);

INSERT INTO tbl_permissions (code, label_fa, module, is_system)
VALUES ('sync.purge', 'پاکسازی تاریخچه sync', 'sync', TRUE)
ON CONFLICT (code) DO UPDATE SET label_fa = EXCLUDED.label_fa, module = EXCLUDED.module, is_system = TRUE;

INSERT INTO tbl_role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM tbl_role_templates rt
CROSS JOIN tbl_permissions p
WHERE rt.code IN ('system_admin', 'tech_admin') AND p.code = 'sync.purge'
ON CONFLICT DO NOTHING;
