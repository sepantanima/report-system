-- کاربرد چندانتخابی برای مقاصد پیام‌رسان

ALTER TABLE tbl_messenger_channel_configs
  ADD COLUMN IF NOT EXISTS usage_keys TEXT[] NOT NULL DEFAULT '{}';

UPDATE tbl_messenger_channel_configs
SET usage_keys = ARRAY[usage_key]
WHERE cardinality(usage_keys) = 0 AND usage_key IS NOT NULL AND TRIM(usage_key) <> '';

ALTER TABLE tbl_messenger_channel_configs
  DROP CONSTRAINT IF EXISTS tbl_messenger_channel_configs_usage_key_sort_order_key;

CREATE INDEX IF NOT EXISTS idx_messenger_channel_usage_keys
  ON tbl_messenger_channel_configs USING GIN (usage_keys)
  WHERE is_enabled = true;
