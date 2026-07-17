-- جنسیت کاربر برای خطاب خوش‌آمدگویی (male | female)
ALTER TABLE tbl_users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(16) NOT NULL DEFAULT 'male';

UPDATE tbl_users SET gender = 'male' WHERE gender IS NULL OR trim(gender) = '';
