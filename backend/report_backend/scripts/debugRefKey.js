import pool from "../src/db.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";
import { resolveReportPeriod } from "../src/services/newsReportPeriod.js";

const ids = [51847, 51849, 51851];
const period = resolveReportPeriod({
  mode: "preset_6h",
  report_date: "1405-04-23",
  from_time: "18:00",
  to_time: "24:00",
});

const sql = `
  ${NEWS_REF_KEY_CTE}
  SELECT bk.id, bk.ref_date, bk.ref_hm, bk.ref_key,
         bk.source_date_jalali, bk.source_time_hm,
         bk.relay_date_jalali, bk.relay_time_hm
  FROM base_key bk
  WHERE bk.id = ANY($1::int[])
`;
const r = await pool.query(sql, [ids]);
console.log("period:", period.from_ref_key, period.to_ref_key);
console.log("rows:", JSON.stringify(r.rows, null, 2));

const slot = await pool.query(
  `${NEWS_REF_KEY_CTE}
   SELECT bk.id, bk.ref_key, bk.ref_hm, bk.source_time_hm, bk.relay_time_hm
   FROM base_key bk
   WHERE bk.ref_key >= $1 AND bk.ref_key <= $2
   ORDER BY bk.ref_key DESC LIMIT 10`,
  [period.from_ref_key, period.to_ref_key],
);
console.log("in slot:", JSON.stringify(slot.rows, null, 2));

await pool.end();
