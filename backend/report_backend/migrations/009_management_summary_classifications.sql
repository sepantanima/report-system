-- پشتیبانی از چند دامنه انتشار در فیلتر خلاصه مدیریتی
ALTER TABLE tbl_field_management_summaries
  ADD COLUMN IF NOT EXISTS classifications SMALLINT[] NOT NULL DEFAULT '{}';

UPDATE tbl_field_management_summaries
SET classifications = ARRAY[classification]
WHERE classification IS NOT NULL
  AND (classifications IS NULL OR classifications = '{}');
