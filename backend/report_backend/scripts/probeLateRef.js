import pool from "../src/db.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";
import { computeReportRefFields } from "../src/services/newsTextUtils.js";

const r = await pool.query(
  `${NEWS_REF_KEY_CTE}
  SELECT id, ref_key, ref_date, ref_hm, source_date_jalali, source_time_hm,
         relay_date_jalali, relay_time_hm, report_ref_date_jalali, report_ref_time_hm, created_at
  FROM base_key
  WHERE ref_hm >= '2300' AND ref_date LIKE '1405-04-23%'
  ORDER BY ref_key DESC LIMIT 15`,
);

console.log("23:xx on 1405-04-23 count:", r.rows.length);
for (const row of r.rows) {
  const computed = computeReportRefFields(
    row.source_date_jalali, row.source_time_hm,
    row.relay_date_jalali, row.relay_time_hm, row.created_at,
  );
  console.log({
    id: row.id,
    ref_key: row.ref_key,
    source: `${row.source_date_jalali} ${row.source_time_hm}`,
    relay: `${row.relay_date_jalali} ${row.relay_time_hm}`,
    stored: `${row.report_ref_date_jalali} ${row.report_ref_time_hm}`,
    computed,
    created_at: row.created_at,
  });
}

await pool.end();
