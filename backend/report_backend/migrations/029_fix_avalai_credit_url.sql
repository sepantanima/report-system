-- اصلاح URL مانده اعتبار AvalAI (v1 نه 1)

UPDATE tbl_ai_provider_templates
SET default_extra_config = jsonb_set(
  COALESCE(default_extra_config, '{}'::jsonb),
  '{credit_check}',
  jsonb_build_object(
    'method', 'GET',
    'url', 'https://api.avalai.ir/user/v1/credit',
    'balance_json_path', 'remaining_unit',
    'balance_json_path_secondary', 'remaining_irt',
    'currency_label', 'UNIT'
  ),
  true
)
WHERE slug = 'avalai';
