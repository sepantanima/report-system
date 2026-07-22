-- پیشنهاد موضوع در فرم ثبت تحلیل

ALTER TABLE tbl_analysis_brief_submissions
  ADD COLUMN IF NOT EXISTS importance_reason TEXT;
