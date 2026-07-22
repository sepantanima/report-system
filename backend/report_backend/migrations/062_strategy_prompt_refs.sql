-- پرامپت‌های راهبردی: محتوای مرجع متنی + نوع خروجی عمومی + اکشن تولید دینامیک

ALTER TABLE tbl_app_prompts
  ADD COLUMN IF NOT EXISTS reference_slots JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE tbl_strategy_outputs
  ADD COLUMN IF NOT EXISTS prompt_key VARCHAR(255);

ALTER TABLE tbl_strategy_outputs
  DROP CONSTRAINT IF EXISTS chk_strategy_output_type;

ALTER TABLE tbl_strategy_outputs
  ADD CONSTRAINT chk_strategy_output_type CHECK (
    output_type IN (
      'soft_war_annex',
      'macro_cognitive',
      'psyops_strategic',
      'macro_trends',
      'strategy_prompt'
    )
  );

CREATE INDEX IF NOT EXISTS idx_strategy_outputs_prompt_key
  ON tbl_strategy_outputs(prompt_key);

-- اکشن عمومی: پرامپت در زمان اجرا override می‌شود
INSERT INTO tbl_ai_form_actions (
  form_name, action_name, button_label_fa, is_enabled, prompt_key,
  usage_key, source_fields, assembly_strategy
) VALUES
(
  'strategy_command_outputs', 'generate_from_strategy_prompt', 'تولید خروجی از پرامپت راهبردی', true,
  'strategy.soft_war_annex', 'strategy.command_outputs',
  '["period_label","source_summary","reference_texts","prior_annex","extra_notes"]'::jsonb,
  'unified_v1'
)
ON CONFLICT (form_name, action_name) DO NOTHING;

-- به‌روزرسانی اکشن قدیمی برای پشتیبانی از reference_texts
UPDATE tbl_ai_form_actions
SET source_fields = '["period_label","source_summary","reference_texts","prior_annex","extra_notes"]'::jsonb
WHERE form_name = 'strategy_command_outputs'
  AND action_name = 'generate_soft_war_annex';
