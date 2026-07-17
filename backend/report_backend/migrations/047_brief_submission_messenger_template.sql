-- قالب پیام‌رسان برای انتشار تحلیل کوتاه (ثبت‌شده)

ALTER TABLE tbl_news_report_settings
  ADD COLUMN IF NOT EXISTS brief_submission_messenger_template TEXT NOT NULL DEFAULT $tpl$#تحلیل کوتاه
#{{author_hashtag}}  #{{composition_date}}

{{brief_body}}

#{{submitter_hashtag}}$tpl$;
