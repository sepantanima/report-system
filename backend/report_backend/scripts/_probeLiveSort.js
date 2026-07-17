import "dotenv/config";
import pool from "../src/db.js";
import { listLiveNewsFeed } from "../src/services/strategyAnnotationService.js";
import { nowJalaliDate, subtractJalaliDays } from "../src/services/newsTextUtils.js";

const today = nowJalaliDate();
console.log("today", today, "from3", subtractJalaliDays(today, 2));

for (const days of [1, 2, 3]) {
  for (const limit of [100, 200]) {
    const data = await listLiveNewsFeed({ limit, days, kind: "all" });
    const kinds = data.items.map((i) => i.kind || "news");
    let transitions = 0;
    for (let i = 1; i < kinds.length; i += 1) if (kinds[i] !== kinds[i - 1]) transitions += 1;
    const firstField = kinds.indexOf("field");
    const lastNews = kinds.lastIndexOf("news");
    const runs = [];
    for (const k of kinds) {
      if (!runs.length || runs[runs.length - 1].k !== k) runs.push({ k, n: 1 });
      else runs[runs.length - 1].n += 1;
    }
    console.log(JSON.stringify({
      days,
      limit,
      total: data.items.length,
      news: kinds.filter((k) => k === "news").length,
      field: kinds.filter((k) => k === "field").length,
      transitions,
      firstField,
      lastNews,
      runs,
    }));
  }
}

const from = subtractJalaliDays(today, 2);
const q = await pool.query(
  `
WITH news AS (
  SELECT (regexp_replace(COALESCE(NULLIF(trim(source_date_jalali), ''), NULLIF(trim(relay_date_jalali), ''))::text, '\\D', '', 'g')
    || COALESCE(
      NULLIF(lpad(regexp_replace(COALESCE(source_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
      NULLIF(lpad(regexp_replace(COALESCE(relay_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
      '0000'
    )) AS sk
  FROM tbl_news
  WHERE COALESCE(is_deleted,false)=false
    AND COALESCE(workflow_status,'') IN ('finalized','reviewed','pending')
    AND COALESCE(NULLIF(trim(source_date_jalali), ''), NULLIF(trim(relay_date_jalali), '')) >= $1
),
field AS (
  SELECT (regexp_replace(date::text, '\\D', '', 'g')
    || lpad(regexp_replace(COALESCE(time::text, ''), '\\D', '', 'g'), 4, '0')) AS sk
  FROM tbl_unit_events
  WHERE COALESCE(is_deleted,false)=false AND state='verified' AND COALESCE(classification,1)<>4
    AND NULLIF(trim(date),'') >= $1
)
SELECT
  (SELECT COUNT(*) FROM news) AS n_cnt,
  (SELECT COUNT(*) FROM field) AS f_cnt,
  (SELECT MAX(sk) FROM field) AS field_max,
  (SELECT MIN(sk) FROM field) AS field_min,
  (SELECT COUNT(*) FROM news n WHERE n.sk > (SELECT MAX(sk) FROM field)) AS news_newer_than_all_field,
  (SELECT COUNT(*) FROM news n WHERE n.sk >= (SELECT MIN(sk) FROM field) AND n.sk <= (SELECT MAX(sk) FROM field)) AS news_in_field_range
`,
  [from],
);
console.log("overlap3d", q.rows[0]);

const interleaved = await listLiveNewsFeed({ limit: 200, days: 3, kind: "all" });
const around = interleaved.items.map((n, i) => ({
  i,
  kind: n.kind,
  id: n.id,
  date: n.source_date_jalali,
  time: n.source_time_hm,
}));
const firstF = around.findIndex((x) => x.kind === "field");
if (firstF >= 0) console.log("around first field", around.slice(Math.max(0, firstF - 5), firstF + 10));
else console.log("no field in 200");

// Also check field-only and whether days=1 excludes all field (field max date is yesterday)
const fieldOnly = await listLiveNewsFeed({ limit: 20, days: 1, kind: "field" });
console.log("field days=1", fieldOnly.items.length, fieldOnly.from_date_jalali, fieldOnly.items.slice(0, 5).map((n) => ({ id: n.id, date: n.source_date_jalali, time: n.source_time_hm })));

const fieldOnly3 = await listLiveNewsFeed({ limit: 20, days: 3, kind: "field" });
console.log("field days=3", fieldOnly3.items.length, fieldOnly3.items.slice(0, 5).map((n) => ({ id: n.id, date: n.source_date_jalali, time: n.source_time_hm })));

await pool.end();
