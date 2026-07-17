-- حاشیه راهبردی برای گزارش‌های میدانی تأییدشده (مرکز فرماندهی / تالار زنده)

CREATE TABLE IF NOT EXISTS tbl_strategy_field_annotations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES tbl_unit_events(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES tbl_users(id),
  annotation_type VARCHAR(40) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  notify_roles TEXT[] NOT NULL DEFAULT '{}',
  notify_user_ids INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_strategy_field_annotation_type CHECK (
    annotation_type IN ('confirm', 'deny', 'investigate', 'note')
  )
);

CREATE INDEX IF NOT EXISTS idx_strategy_field_ann_event
  ON tbl_strategy_field_annotations(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_field_ann_author
  ON tbl_strategy_field_annotations(author_user_id);
