-- Normalize Persian digits in Jalali date columns to ASCII (0-9)

UPDATE tbl_news
SET source_date_jalali = translate(source_date_jalali, '۰۱۲۳۴۵۶۷۸۹', '0123456789')
WHERE source_date_jalali IS NOT NULL AND source_date_jalali ~ '[۰-۹]';

UPDATE tbl_news
SET relay_date_jalali = translate(relay_date_jalali, '۰۱۲۳۴۵۶۷۸۹', '0123456789')
WHERE relay_date_jalali IS NOT NULL AND relay_date_jalali ~ '[۰-۹]';
