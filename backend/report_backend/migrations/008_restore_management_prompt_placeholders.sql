-- بازگرداندن قالب خلاصه مدیریتی با placeholderهای استاندارد (هم‌راستا با promptVariableCatalog)

UPDATE tbl_app_prompts
SET
  description_fa = 'متغیرها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  body = E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
WHERE prompt_key = 'field.management_summary.classification_1';

UPDATE tbl_app_prompts
SET
  description_fa = 'متغیرها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  body = E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی استانی زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
WHERE prompt_key = 'field.management_summary.classification_2';

UPDATE tbl_app_prompts
SET
  description_fa = 'متغیرها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  body = E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی سطح واحد زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
WHERE prompt_key = 'field.management_summary.classification_3';

UPDATE tbl_app_prompts
SET
  description_fa = 'متغیرها: {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}}',
  body = E'شما یک مدیر ارشد هستید. بر اساس خلاصه گزارش‌های میدانی با دامنه خاص زیر در بازه {{PERIOD_START}} تا {{PERIOD_END}} (نوع بازه: {{PERIOD_KIND_FA}})، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.\n\nداده گزارش‌ها:\n{{REPORTS_DIGEST}}'
WHERE prompt_key = 'field.management_summary.classification_4';
