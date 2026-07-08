-- Dev-only seed data for local development.
-- Password hashes below are bcrypt of the plaintext "admin123".

INSERT INTO tbl_units ("UnitCode", "Name", "UnitShortName", "StateName")
VALUES (1, 'واحد مرکزی تهران', 'تهران مرکز', 'تهران')
ON CONFLICT ("UnitCode") DO NOTHING;

-- admin user (username: admin, password: admin123)
INSERT INTO tbl_users (username, name, password, role, active, unit_cd)
VALUES (
  'admin',
  'مدیر سیستم',
  '$2b$10$vEiFv.BIeba8XFGYPi6wbeGXMillnB2VeeQObVAjArOR17gEm5W5G',
  'admin',
  true,
  1
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO tbl_report_types (title_fa, type_code) VALUES
  ('گزارش عادی', 'normal'),
  ('گزارش فوری', 'urgent')
ON CONFLICT DO NOTHING;
