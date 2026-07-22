-- به‌روزرسانی پیش‌فرض فیلتر جریان و برچسب «باهوش»

UPDATE tbl_news_report_settings SET
  report_default_filters = COALESCE(report_default_filters, '{}'::jsonb)
    || '{"statuses": ["published"], "qualities": [5]}'::jsonb,
  pack_defaults = jsonb_set(
    COALESCE(pack_defaults, '{}'::jsonb),
    '{pack_types}',
    (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN pt->>'key' = 'valuable' THEN
            pt || '{"label": "اخبار باهوش", "file_slug": "باهوش", "help": "شامل اخبار فوری و مهم"}'::jsonb
          ELSE pt
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(pack_defaults->'pack_types', '[]'::jsonb)) AS pt
    )
  )
WHERE id = 1;
