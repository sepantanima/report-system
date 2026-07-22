-- پرامپت و اکشن پالایش هوشمند اخبار

INSERT INTO tbl_app_prompts (prompt_key, title_fa, description_fa, body) VALUES
(
  'news.editorial.policy',
  'پالایش هوشمند اخبار — سیاست دبیری',
  'معیارهای تشخیص اهمیت، کیفیت، مرتبط/غیرمرتبط و دسته — فقط متن سیاست (بدون متغیر فنی)',
  E'سیاست‌های تشخیص اهمیت:\n- اخبار مرتبط با حوزه موشکی، پدافند و ارتباطات نظامی، درجه اهمیت بالاتری دارند.\n- اخبار آب‌وهوا و هشدارهای محیطی در صورت تأثیر بر عملیات یا ایمنی عمومی، اهمیت متوسط تا بالا دارند.\n- اخبار صرفاً تبلیغاتی، سرگرمی یا بی‌ارتباط با حوزه خبری سازمان: relevance_status = irrelevant و اولویت پایین.\n\nسیاست‌های تشخیص کیفیت:\n- منبع نامشخص یا متن مبهم: کیفیت پایین.\n- خبر با منبع روشن و متن قابل اتکا: کیفیت متوسط تا بالا.\n\nسیاست دسته‌بندی:\n- موضوع امنیتی/نظامی → security یا military\n- موضوع سیاسی داخلی/خارجی → political یا international\n- در صورت ابهام، نزدیک‌ترین دسته را انتخاب کنید.'
)
ON CONFLICT (prompt_key) DO NOTHING;

INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  usage_key, source_fields, assembly_strategy
) VALUES
(
  'news_editorial_batch', 'run_editorial', 'پالایش و دبیری هوشمند', true,
  'news.editorial.policy', 'news.editorial', '[]'::jsonb, 'news_editorial_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
SELECT 'news.editorial', 0, 'پالایش هوشمند اخبار', provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled
FROM tbl_ai_api_configs
WHERE usage_key = 'news.summarize' AND is_enabled = true
ORDER BY sort_order
LIMIT 1
ON CONFLICT (usage_key, sort_order) DO NOTHING;

INSERT INTO tbl_ai_api_configs (usage_key, sort_order, title_fa, provider_type, model_id, extra_config, credential_mode, credential_env_name, is_enabled)
VALUES (
  'news.editorial', 0, 'پالایش هوشمند اخبار (Gemini)', 'google_gemini', 'gemini-1.5-flash',
  '{}'::jsonb, 'env_ref', 'GEMINI_API_KEY', true
)
ON CONFLICT (usage_key, sort_order) DO NOTHING;
