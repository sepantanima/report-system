-- ارزشمند + کیفیت ۳–۵ + برچسب آماده انتشار

UPDATE tbl_news_report_settings SET
  report_default_filters = COALESCE(report_default_filters, '{}'::jsonb)
    || '{"qualities": [3, 4, 5]}'::jsonb,
  pack_defaults = jsonb_set(
    COALESCE(pack_defaults, '{}'::jsonb),
    '{pack_types}',
    (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN pt->>'key' = 'valuable' THEN
            pt || '{"label": "اخبار ارزشمند", "file_slug": "ارزشمند", "help": "شامل اخبار فوری و مهم"}'::jsonb
          ELSE pt
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(pack_defaults->'pack_types', '[]'::jsonb)) AS pt
    )
  )
WHERE id = 1;
