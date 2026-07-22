-- Migration 070: sync identity for all exportable entities + auto bump sync_version

-- Smart analysis packs
ALTER TABLE tbl_news_smart_analysis_packs ADD COLUMN IF NOT EXISTS global_id UUID;
ALTER TABLE tbl_news_smart_analysis_packs ADD COLUMN IF NOT EXISTS org_code VARCHAR(64);
ALTER TABLE tbl_news_smart_analysis_packs ADD COLUMN IF NOT EXISTS origin_instance VARCHAR(16) DEFAULT 'online';
ALTER TABLE tbl_news_smart_analysis_packs ADD COLUMN IF NOT EXISTS sync_version INT NOT NULL DEFAULT 0;

UPDATE tbl_news_smart_analysis_packs SET global_id = gen_random_uuid() WHERE global_id IS NULL;
UPDATE tbl_news_smart_analysis_packs SET org_code = COALESCE(org_code, 'hq');
UPDATE tbl_news_smart_analysis_packs SET origin_instance = COALESCE(origin_instance, 'online');

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_packs_global_id
  ON tbl_news_smart_analysis_packs(global_id) WHERE global_id IS NOT NULL;

-- Smart analyses
ALTER TABLE tbl_news_smart_analyses ADD COLUMN IF NOT EXISTS global_id UUID;
ALTER TABLE tbl_news_smart_analyses ADD COLUMN IF NOT EXISTS org_code VARCHAR(64);
ALTER TABLE tbl_news_smart_analyses ADD COLUMN IF NOT EXISTS origin_instance VARCHAR(16) DEFAULT 'online';
ALTER TABLE tbl_news_smart_analyses ADD COLUMN IF NOT EXISTS sync_version INT NOT NULL DEFAULT 0;

UPDATE tbl_news_smart_analyses SET global_id = gen_random_uuid() WHERE global_id IS NULL;
UPDATE tbl_news_smart_analyses SET org_code = COALESCE(org_code, 'hq');
UPDATE tbl_news_smart_analyses SET origin_instance = COALESCE(origin_instance, 'online');

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_analyses_global_id
  ON tbl_news_smart_analyses(global_id) WHERE global_id IS NOT NULL;

-- Defaults on core export tables (new rows always get identity)
ALTER TABLE tbl_news ALTER COLUMN global_id SET DEFAULT gen_random_uuid();
ALTER TABLE tbl_news ALTER COLUMN org_code SET DEFAULT 'hq';
ALTER TABLE tbl_news ALTER COLUMN origin_instance SET DEFAULT 'online';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_unit_events') THEN
    ALTER TABLE tbl_unit_events ALTER COLUMN global_id SET DEFAULT gen_random_uuid();
    ALTER TABLE tbl_unit_events ALTER COLUMN org_code SET DEFAULT 'hq';
    ALTER TABLE tbl_unit_events ALTER COLUMN origin_instance SET DEFAULT 'online';
  END IF;
END $$;

ALTER TABLE tbl_news_smart_analysis_packs ALTER COLUMN global_id SET DEFAULT gen_random_uuid();
ALTER TABLE tbl_news_smart_analysis_packs ALTER COLUMN org_code SET DEFAULT 'hq';
ALTER TABLE tbl_news_smart_analysis_packs ALTER COLUMN origin_instance SET DEFAULT 'online';

ALTER TABLE tbl_news_smart_analyses ALTER COLUMN global_id SET DEFAULT gen_random_uuid();
ALTER TABLE tbl_news_smart_analyses ALTER COLUMN org_code SET DEFAULT 'hq';
ALTER TABLE tbl_news_smart_analyses ALTER COLUMN origin_instance SET DEFAULT 'online';

-- Auto-increment sync_version on local edits (merge import sets sync_version explicitly)
CREATE OR REPLACE FUNCTION trg_bump_sync_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.sync_version IS NOT DISTINCT FROM OLD.sync_version THEN
      NEW.sync_version := COALESCE(OLD.sync_version, 0) + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bump_sync_version_news ON tbl_news;
CREATE TRIGGER bump_sync_version_news
  BEFORE UPDATE ON tbl_news
  FOR EACH ROW EXECUTE FUNCTION trg_bump_sync_version();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_unit_events') THEN
    DROP TRIGGER IF EXISTS bump_sync_version_unit_events ON tbl_unit_events;
    EXECUTE 'CREATE TRIGGER bump_sync_version_unit_events
      BEFORE UPDATE ON tbl_unit_events
      FOR EACH ROW EXECUTE FUNCTION trg_bump_sync_version()';
  END IF;
END $$;

DROP TRIGGER IF EXISTS bump_sync_version_smart_packs ON tbl_news_smart_analysis_packs;
CREATE TRIGGER bump_sync_version_smart_packs
  BEFORE UPDATE ON tbl_news_smart_analysis_packs
  FOR EACH ROW EXECUTE FUNCTION trg_bump_sync_version();

DROP TRIGGER IF EXISTS bump_sync_version_smart_analyses ON tbl_news_smart_analyses;
CREATE TRIGGER bump_sync_version_smart_analyses
  BEFORE UPDATE ON tbl_news_smart_analyses
  FOR EACH ROW EXECUTE FUNCTION trg_bump_sync_version();
