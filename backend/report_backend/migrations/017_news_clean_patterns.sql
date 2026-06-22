-- الگوهای پاکسازی خبر (قابل مدیریت توسط راهبر)
CREATE TABLE IF NOT EXISTS tbl_news_clean_patterns (
  id SERIAL PRIMARY KEY,
  title_fa VARCHAR(120),
  phrase TEXT NOT NULL UNIQUE,
  match_kind VARCHAR(32) NOT NULL DEFAULT 'auto',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_clean_patterns_enabled
  ON tbl_news_clean_patterns(is_enabled, sort_order);

-- seed عبارات n8n (قابل غیرفعال‌سازی، غیرقابل حذف)
INSERT INTO tbl_news_clean_patterns (title_fa, phrase, match_kind, sort_order, is_builtin) VALUES
  ('دعوت کانال', 'با این کانال', 'phrase', 10, true),
  ('دعوت عضویت', 'به کانال', 'phrase', 11, true),
  ('دعوت عضویت', 'بپیوندید', 'phrase', 12, true),
  ('دعوت کلیک', 'روی عضویت کلیک کنید', 'phrase', 13, true),
  ('دامنه', 'akharinkhabar.ir', 'domain', 20, true),
  ('دامنه', 'FilimoSchool.com', 'domain', 21, true),
  ('دامنه', 'khabarmohem.ir', 'domain', 22, true),
  ('دامنه', 'khabarfoori.com', 'domain', 23, true),
  ('کانال تلگرام', '@Artesh_Mardomi', 'handle', 30, true),
  ('کانال تلگرام', '@KhabarFuri', 'handle', 31, true),
  ('نام کانال', 'قدس نیوز', 'phrase', 32, true),
  ('نام کانال', 'صابرین نیوز', 'phrase', 33, true),
  ('نام کانال', 'پدرفتنه', 'phrase', 34, true),
  ('نام کانال', 'ایرانِ‌بیدار', 'phrase', 35, true),
  ('خبرنامه تهران', 'کانال ایتا خبرنامه تهران', 'phrase', 40, true),
  ('خبرنامه تهران', 'کانال تلگرام خبرنامه تهران', 'phrase', 41, true),
  ('خبرنامه تهران', 'کانال روبیکا خبرنامه تهران', 'phrase', 42, true),
  ('خبرنامه تهران', 'کانال ایتا خبرنامه', 'phrase', 43, true),
  ('خبرنامه تهران', 'کانال روبیکا خبرنامه', 'phrase', 44, true),
  ('خبرنامه تهران', 'کانال تلگرام خبرنامه', 'phrase', 45, true),
  ('تبلیغ', 'ما را در سایت و تلگرام اسپوتنیک دنبال کنید', 'phrase', 50, true),
  ('شعار کانال', 'به ثانیه، به دقیقه باخبر باش', 'phrase', 51, true),
  ('لینک', 'ble.ir/join/', 'url_path', 60, true)
ON CONFLICT (phrase) DO NOTHING;
