-- قالب کپشن فایل ارسالی گزارش اخبار (قابل ویرایش در تنظیمات ادمین)

ALTER TABLE tbl_news_report_settings
  ADD COLUMN IF NOT EXISTS document_caption_template TEXT NOT NULL DEFAULT $tpl$📊 نوع گزارش: {{report_type}}
📅 تاریخ گزارش: {{report_date}}
🕒 از: {{display_from}}
🕒 تا: {{display_to}}
📰 تعداد خبر: {{news_count_text}}
⚙️ نحوه اجرا: {{system_name}}$tpl$;
