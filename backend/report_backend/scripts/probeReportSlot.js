import pool from "../src/db.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";
import { computeReportRefFields } from "../src/services/newsTextUtils.js";
import { resolveReportPeriod } from "../src/services/newsReportPeriod.js";

const period = resolveReportPeriod({
  mode: "preset_6h",
  report_date: "1405-04-23",
  from_time: "18:00",
  to_time: "24:00",
});

const r = await pool.query(
  `${NEWS_REF_KEY_CTE}
  SELECT id, ref_date, ref_hm, ref_key, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm,
         report_ref_date_jalali, report_ref_time_hm, created_at
  FROM base_key bk
  WHERE ref_key >= $1 AND ref_key <= $2
  ORDER BY ref_key DESC LIMIT 15`,
  [period.from_ref_key, period.to_ref_key],
);

console.log("period", period.from_ref_key, "->", period.to_ref_key, "count", r.rows.length);
for (const row of r.rows) {
  const computed = computeReportRefFields(
    row.source_date_jalali,
    row.source_time_hm,
    row.relay_date_jalali,
    row.relay_time_hm,
    row.created_at,
  );
  const mismatch = computed.ref_key !== row.ref_key;
  console.log({
    id: row.id,
    ref_key: row.ref_key,
    cte: `${row.ref_date} ${row.ref_hm}`,
    source: `${row.source_date_jalali} ${row.source_time_hm}`,
    relay: `${row.relay_date_jalali} ${row.relay_time_hm}`,
    stored: `${row.report_ref_date_jalali} ${row.report_ref_time_hm}`,
    computed,
    mismatch,
    created_at: row.created_at,
  });
}

await pool.end();
