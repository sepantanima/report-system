-- Migration 066: Instance sync columns + channel_policy + org_code

ALTER TABLE tbl_report_types ADD COLUMN IF NOT EXISTS channel_policy VARCHAR(32) NOT NULL DEFAULT 'BOTH';
UPDATE tbl_report_types SET channel_policy = 'BOTH' WHERE channel_policy IS NULL OR channel_policy = '';

-- Sync columns on key entities
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS global_id UUID;
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS org_code VARCHAR(64);
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS origin_instance VARCHAR(16) DEFAULT 'online';
ALTER TABLE tbl_news ADD COLUMN IF NOT EXISTS sync_version INT NOT NULL DEFAULT 0;

UPDATE tbl_news SET global_id = gen_random_uuid() WHERE global_id IS NULL;
UPDATE tbl_news SET org_code = COALESCE(org_code, 'hq');
UPDATE tbl_news SET origin_instance = COALESCE(origin_instance, 'online');

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_global_id ON tbl_news(global_id) WHERE global_id IS NOT NULL;

-- Field reports (tbl_unit_events)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_unit_events') THEN
    ALTER TABLE tbl_unit_events ADD COLUMN IF NOT EXISTS global_id UUID;
    ALTER TABLE tbl_unit_events ADD COLUMN IF NOT EXISTS org_code VARCHAR(64);
    ALTER TABLE tbl_unit_events ADD COLUMN IF NOT EXISTS origin_instance VARCHAR(16) DEFAULT 'online';
    ALTER TABLE tbl_unit_events ADD COLUMN IF NOT EXISTS sync_version INT NOT NULL DEFAULT 0;
    UPDATE tbl_unit_events SET global_id = gen_random_uuid() WHERE global_id IS NULL;
    UPDATE tbl_unit_events SET org_code = COALESCE(org_code, 'hq');
    UPDATE tbl_unit_events SET origin_instance = COALESCE(origin_instance, 'online');
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_events_global_id ON tbl_unit_events(global_id) WHERE global_id IS NOT NULL;
  END IF;
END $$;

-- Admin briefings ledger
CREATE TABLE IF NOT EXISTS tbl_admin_briefings (
  id SERIAL PRIMARY KEY,
  briefing_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  org_code VARCHAR(64) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operator_user_id INT REFERENCES tbl_users(id),
  delivered_at TIMESTAMPTZ,
  checksum_sha256 VARCHAR(64),
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
