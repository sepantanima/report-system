-- اخباری که بدون حکم دبیر به صف سردبیر رفته‌اند را به صف دبیر برمی‌گرداند
UPDATE tbl_news
SET workflow_status = 'pending',
    updated_at = CURRENT_TIMESTAMP
WHERE workflow_status = 'reviewed'
  AND COALESCE(review_state, 'pending') = 'pending';
