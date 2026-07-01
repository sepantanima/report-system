-- پک تحلیلی: یک بازهٔ خبری ثابت + فریز شناسهٔ اخبار + چند تحلیل وابسته

CREATE TABLE IF NOT EXISTS tbl_news_smart_analysis_packs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL DEFAULT '',
  query_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  filter_signature VARCHAR(64),
  period_from VARCHAR(20),
  period_to VARCHAR(20),
  selection_mode VARCHAR(20) NOT NULL DEFAULT 'all_filtered',
  news_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  news_count INTEGER NOT NULL DEFAULT 0,
  digest_hash VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES tbl_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_smart_pack_selection_mode CHECK (selection_mode IN ('all_filtered', 'subset')),
  CONSTRAINT chk_smart_pack_status CHECK (status IN ('draft', 'finalized'))
);

CREATE INDEX IF NOT EXISTS idx_smart_analysis_packs_created ON tbl_news_smart_analysis_packs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_analysis_packs_signature ON tbl_news_smart_analysis_packs(filter_signature);
CREATE INDEX IF NOT EXISTS idx_smart_analysis_packs_user ON tbl_news_smart_analysis_packs(created_by);

ALTER TABLE tbl_news_smart_analyses
  ADD COLUMN IF NOT EXISTS pack_id INTEGER REFERENCES tbl_news_smart_analysis_packs(id) ON DELETE CASCADE;

-- backfill: هر تحلیل قدیمی → یک پک تک‌تحلیلی
DO $$
DECLARE
  r RECORD;
  new_pack_id INTEGER;
  ids JSONB;
  sel_mode VARCHAR(20);
BEGIN
  FOR r IN
    SELECT * FROM tbl_news_smart_analyses WHERE pack_id IS NULL ORDER BY id
  LOOP
    ids := COALESCE(r.selected_ids, '[]'::jsonb);
    IF jsonb_array_length(ids) > 0 THEN
      sel_mode := 'subset';
    ELSE
      sel_mode := 'all_filtered';
      ids := '[]'::jsonb;
    END IF;

    INSERT INTO tbl_news_smart_analysis_packs (
      title, query_payload, filter_signature, period_from, period_to,
      selection_mode, news_ids, news_count, status, created_by, created_at, updated_at
    ) VALUES (
      COALESCE(NULLIF(r.title, ''), 'پک مهاجرت — تحلیل ' || r.id),
      COALESCE(r.query_payload, '{}'::jsonb),
      r.filter_signature,
      r.period_from,
      r.period_to,
      sel_mode,
      ids,
      COALESCE(r.news_count, 0),
      'finalized',
      r.created_by,
      r.created_at,
      r.updated_at
    )
    RETURNING id INTO new_pack_id;

    UPDATE tbl_news_smart_analyses SET pack_id = new_pack_id WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_analyses_pack_type
  ON tbl_news_smart_analyses(pack_id, analysis_type)
  WHERE pack_id IS NOT NULL;
