-- یکسان‌سازی برچسب اولویت ۱: «فوری» به‌جای «خیلی مهم» در help پک گزارش

UPDATE tbl_news_report_settings SET
  pack_defaults = jsonb_set(
    COALESCE(pack_defaults, '{}'::jsonb),
    '{pack_types}',
    (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN pt->>'key' = 'very_important' THEN
            pt || '{"help": "اخبار با اولویت فوری (سطح ۱)"}'::jsonb
          ELSE pt
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(pack_defaults->'pack_types', '[]'::jsonb)) AS pt
    )
  )
WHERE id = 1;
