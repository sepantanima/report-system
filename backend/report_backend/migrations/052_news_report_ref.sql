-- تاریخ/ساعت مرجع گزارش (پس از reconcile نیمه‌شب) برای فیلتر بازه و نمایش
ALTER TABLE tbl_news
  ADD COLUMN IF NOT EXISTS report_ref_date_jalali VARCHAR(10),
  ADD COLUMN IF NOT EXISTS report_ref_time_hm VARCHAR(4);
