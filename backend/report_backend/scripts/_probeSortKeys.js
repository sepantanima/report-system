import "dotenv/config";
import pool from "../src/db.js";

const from = "1405-04-25";

const counts = await pool.query(
  `
  SELECT 'news' AS kind, COUNT(*)::int AS cnt
  FROM tbl_news n
  WHERE COALESCE(n.is_deleted, false) = false
    AND COALESCE(n.workflow_status, '') IN ('finalized', 'reviewed', 'pending')
    AND COALESCE(NULLIF(trim(n.source_date_jalali), ''), NULLIF(trim(n.relay_date_jalali), '')) >= $1
  UNION ALL
  SELECT 'field', COUNT(*)::int
  FROM tbl_unit_events e
  WHERE COALESCE(e.is_deleted, false) = false
    AND COALESCE(e.state, '') = 'verified'
    AND COALESCE(e.classification, 1) <> 4
    AND NULLIF(trim(e.date), '') >= $1
  `,
  [from],
);
console.log("counts", counts.rows);

const overlap = await pool.query(
  `
  WITH news AS (
    SELECT
      (regexp_replace(
        COALESCE(NULLIF(trim(source_date_jalali), ''), NULLIF(trim(relay_date_jalali), ''))::text,
        '\\D', '', 'g'
      ) || COALESCE(
        NULLIF(lpad(regexp_replace(COALESCE(source_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
        NULLIF(lpad(regexp_replace(COALESCE(relay_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
        '0000'
      )) AS sk,
      COALESCE(updated_at, created_at) AS sort_ts
    FROM tbl_news
    WHERE COALESCE(is_deleted, false) = false
      AND COALESCE(workflow_status, '') IN ('finalized', 'reviewed', 'pending')
      AND COALESCE(NULLIF(trim(source_date_jalali), ''), NULLIF(trim(relay_date_jalali), '')) >= $1
  ),
  field AS (
    SELECT
      (regexp_replace(date::text, '\\D', '', 'g')
        || lpad(regexp_replace(COALESCE(time::text, ''), '\\D', '', 'g'), 4, '0')) AS sk,
      COALESCE(
        NULLIF(trim("updatedAt"), '')::timestamptz,
        NULLIF(trim("createdAt"), '')::timestamptz
      ) AS sort_ts
    FROM tbl_unit_events
    WHERE COALESCE(is_deleted, false) = false
      AND COALESCE(state, '') = 'verified'
      AND COALESCE(classification, 1) <> 4
      AND NULLIF(trim(date), '') >= $1
  )
  SELECT
    (SELECT COUNT(*) FROM news) AS n_cnt,
    (SELECT COUNT(*) FROM field) AS f_cnt,
    (SELECT MIN(sk) FROM (SELECT sk FROM news ORDER BY sk DESC LIMIT 100) x) AS news100_min_sk,
    (SELECT MAX(sk) FROM field) AS field_max_sk,
    (SELECT COUNT(*) FROM field f WHERE f.sk >= (SELECT MIN(sk) FROM (SELECT sk FROM news ORDER BY sk DESC LIMIT 100) x)) AS field_in_news100_event_window,
    (SELECT MAX(sort_ts) FROM field) AS field_max_ts,
    (SELECT MIN(sort_ts) FROM (SELECT sort_ts FROM news ORDER BY sort_ts DESC NULLS LAST LIMIT 100) x) AS news100_min_ts,
    (SELECT COUNT(*) FROM field f WHERE f.sort_ts >= (SELECT MIN(sort_ts) FROM (SELECT sort_ts FROM news ORDER BY sort_ts DESC NULLS LAST LIMIT 100) x)) AS field_in_news100_arrival_window
  `,
  [from],
);
console.log("overlap", overlap.rows[0]);

const recentField = await pool.query(
  `
  SELECT id, date, time::text AS time, "createdAt", "updatedAt"
  FROM tbl_unit_events
  WHERE COALESCE(is_deleted, false) = false
    AND COALESCE(state, '') = 'verified'
    AND COALESCE(classification, 1) <> 4
    AND NULLIF(trim(date), '') >= $1
  ORDER BY COALESCE(NULLIF(trim("updatedAt"), '')::timestamptz, NULLIF(trim("createdAt"), '')::timestamptz) DESC NULLS LAST
  LIMIT 8
  `,
  [from],
);
console.log("recent field by arrival", recentField.rows);

await pool.end();
