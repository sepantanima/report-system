-- متن ساده برای پرامپت‌های خلاصه مدیریتی (بدون {{...}} در DB)؛ پرامپت و API نمونه برای دمو

UPDATE tbl_app_prompts
SET
  description_fa = '',
  body = E'شما مدیر هستید. بر اساس بازه و دادهٔ ساخت‌یافتهٔ گزارش‌هایی که در ادامهٔ همین پیام برای مدل ارسال می‌شود، یک خلاصه مدیریتی کوتاه، رسمی و قابل چاپ به فارسی بنویسید.'
WHERE prompt_key IN (
  'field.management_summary.classification_1',
  'field.management_summary.classification_2',
  'field.management_summary.classification_3',
  'field.management_summary.classification_4'
);

INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'sample.gemini.simple',
  'نمونه — پرامپت ساده (Gemini)',
  '',
  E'فقط به پیام کاربر کوتاه و مودبانه به فارسی پاسخ بده.'
),
(
  'sample.avalai.simple',
  'نمونه — پرامپت ساده (AvalAI / سازگار با OpenAI)',
  '',
  E'فقط به پیام کاربر کوتاه و مودبانه به فارسی پاسخ بده.'
)
ON CONFLICT (prompt_key) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
VALUES
(
  'demo.sample',
  0,
  'نمونه Gemini',
  'google_gemini',
  'gemini-1.5-flash',
  '{}'::jsonb,
  'env_ref',
  'GEMINI_API_KEY',
  true
),
(
  'demo.sample',
  1,
  'نمونه AvalAI',
  'avalai',
  'gpt-4o-mini',
  '{"base_url":"https://api.avalai.ir/v1"}'::jsonb,
  'env_ref',
  'AVALAI_API_KEY',
  true
)
ON CONFLICT (usage_key, sort_order) DO NOTHING;
