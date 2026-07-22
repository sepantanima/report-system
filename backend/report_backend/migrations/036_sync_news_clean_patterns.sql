-- همگام‌سازی الگوهای پاکسازی n8n با جدول سامانه
-- الگوهای موجود در کد n8n که در جدول نبودند + تکمیل متادیتا

INSERT INTO tbl_news_clean_patterns (title_fa, phrase, match_kind, remove_mode, is_regex, is_enabled, sort_order, is_builtin)
VALUES
  ('دعوت کانال', 'آخرین اخبار', 'phrase', 'phrase', false, true, 14, true),
  ('دعوت کانال', 'اخبار فوری', 'phrase', 'phrase', false, true, 15, true),
  ('کانال تلگرام', '@khbar1fori', 'handle', 'phrase', false, true, 36, true),
  ('خطوط تزئینی', '┄┅═✧.*?✧═┅┄', 'regex', 'phrase', true, true, 70, true),
  ('خطوط تزئینی', '\\|\\s*\\|', 'regex', 'phrase', true, true, 71, true),
  ('خطوط تزئینی', '\\|\\s*Link\\b', 'regex', 'phrase', true, true, 72, true),
  ('خطوط تزئینی', '[ـ\\-_=]{5,}\\s*نیوز', 'regex', 'phrase', true, true, 73, true),
  ('خطوط تزئینی', '[ـ]{2,}', 'regex', 'phrase', true, true, 74, true),
  ('منبع زمان', '─+\\s*منبع:.*?زمان:\\s*[\\d۰-۹]{1,2}:[\\d۰-۹]{2}\\s*\\|\\s*[\\d۰-۹]{4}/[\\d۰-۹]{1,2}/[\\d۰-۹]{1,2}', 'regex', 'phrase', true, true, 75, true),
  ('لینک چندتایی ble', '\\*?\\s*ble\\.ir/join/[A-Za-z0-9]+\\s*(?:ble\\.ir/join/[A-Za-z0-9]+\\s*)+\\*?', 'regex', 'phrase', true, true, 76, true)
ON CONFLICT (phrase) DO NOTHING;

-- الگوهای دستی کاربر که از قبل در جدول هستند را دست نمی‌زنیم
-- (@Jahan_Fouri, AkhbareFori, @Cataphract1, ...)
