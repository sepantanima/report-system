import pool from "../src/db.js";
import { computeReportRefFields } from "../src/services/newsTextUtils.js";
import { ensureReportRefForPeriod } from "../src/services/newsReportRefService.js";
import { resolveReportPeriod } from "../src/services/newsReportPeriod.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";

const period = resolveReportPeriod({
  mode: "preset_6h",
  report_date: "1405-04-23",
  from_time: "18:00",
  to_time: "24:00",
});
const ids = [51847, 51849, 51851];

const before = await pool.query(
  `SELECT id, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm,
          report_ref_date_jalali, report_ref_time_hm, created_at
   FROM tbl_news WHERE id = ANY($1::int[])`,
  [ids],
);
for (const row of before.rows) {
  const computed = computeReportRefFields(
    row.source_date_jalali,
    row.source_time_hm,
    row.relay_date_jalali,
    row.relay_time_hm,
    row.created_at,
  );
  console.log("before", row.id, {
    source: row.source_time_hm,
    relay: row.relay_time_hm,
    stored: row.report_ref_time_hm,
    created_at: row.created_at,
    computed,
  });
}

const updated = await ensureReportRefForPeriod(period.from_ref_key, period.to_ref_key);
console.log("updated rows:", updated);

const after = await pool.query(
  "SELECT id, report_ref_date_jalali, report_ref_time_hm FROM tbl_news WHERE id = ANY($1::int[])",
  [ids],
);
console.log("after stored:", after.rows);

const slot = await pool.query(
  `${NEWS_REF_KEY_CTE}
   SELECT id, ref_key, ref_hm FROM base_key
   WHERE ref_key >= $1 AND ref_key <= $2 AND id = ANY($3::int[])`,
  [period.from_ref_key, period.to_ref_key, ids],
);
console.log("still in 18-24 slot:", slot.rows);

await pool.end();
