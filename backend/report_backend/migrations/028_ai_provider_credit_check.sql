-- endpoint مانده اعتبار برای ارائه‌دهنده‌هایی که API balance دارند

UPDATE tbl_ai_provider_templates
SET default_extra_config = COALESCE(default_extra_config, '{}'::jsonb) || jsonb_build_object(
  'credit_check', jsonb_build_object(
    'method', 'GET',
    'url', 'https://api.avalai.ir/user/v1/credit',
    'balance_json_path', 'remaining_unit',
    'balance_json_path_secondary', 'remaining_irt',
    'currency_label', 'UNIT'
  )
)
WHERE slug = 'avalai';
