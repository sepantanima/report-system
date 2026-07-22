-- Migration 067: Sync pack ledger + entity state + conflicts

CREATE TABLE IF NOT EXISTS tbl_sync_runs (
  id SERIAL PRIMARY KEY,
  pack_id UUID NOT NULL DEFAULT gen_random_uuid(),
  batch_id UUID,
  org_code VARCHAR(64) NOT NULL DEFAULT 'hq',
  direction VARCHAR(32) NOT NULL DEFAULT 'online_to_offline',
  run_type VARCHAR(16) NOT NULL CHECK (run_type IN ('export', 'import', 'ack')),
  status VARCHAR(32) NOT NULL DEFAULT 'exported',
  operator_user_id INT REFERENCES tbl_users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  counts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pack_checksum VARCHAR(128),
  manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  supersedes_pack_id UUID,
  ack_status VARCHAR(32) DEFAULT 'pending',
  ack_received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_pack_id ON tbl_sync_runs(pack_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON tbl_sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_sync_runs_org ON tbl_sync_runs(org_code);

CREATE TABLE IF NOT EXISTS tbl_sync_entity_state (
  id SERIAL PRIMARY KEY,
  global_id UUID NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  org_code VARCHAR(64) NOT NULL DEFAULT 'hq',
  last_applied_at TIMESTAMPTZ,
  last_applied_pack_id UUID,
  last_exported_pack_id UUID,
  last_sync_direction VARCHAR(32),
  local_updated_at TIMESTAMPTZ,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'pending_outbound',
  UNIQUE (global_id, entity_type, org_code)
);

CREATE TABLE IF NOT EXISTS tbl_sync_conflicts (
  id SERIAL PRIMARY KEY,
  pack_id UUID NOT NULL,
  global_id UUID NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  local_snapshot JSONB,
  remote_snapshot JSONB,
  resolution VARCHAR(32),
  resolved_at TIMESTAMPTZ,
  resolved_by INT REFERENCES tbl_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
