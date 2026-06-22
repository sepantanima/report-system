-- یکسان‌سازی استراتژی مونتاژ برای اکشن‌های AI فرم‌ها
UPDATE tbl_ai_form_actions
SET assembly_strategy = 'unified_v1'
WHERE assembly_strategy IN ('labeled_fields', 'field_management_summary_v1');
