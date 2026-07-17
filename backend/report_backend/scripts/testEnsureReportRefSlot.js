/**
 * سناریوی باگ: source_time تلگرام 23:59، relay روز بعد 00:10، report_ref قدیمی 23:59
 * باید بعد از ensureReportRef به ساعت واقعی ingest (17:09) برگردد.
 */
import pool from "../src/db.js";
import { ensureReportRefForPeriod } from "../src/services/newsReportRefService.js";
import { resolveReportPeriod } from "../src/services/newsReportPeriod.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";
import { computeReportRefFields } from "../src/services/newsTextUtils.js";

const TEST_ID = 52243;
const period = resolveReportPeriod({
  mode: "preset_6h",
  report_date: "1405-04-23",
  from_time: "18:00",
  to_time: "24:00",
});

const before = await pool.query(
  "SELECT * FROM tbl_news WHERE id = $1",
  [TEST_ID],
);
if (!before.rows.length) {
  console.error("test row missing");
  process.exit(1);
}
const backup = before.rows[0];

await pool.query(
  `UPDATE tbl_news
   SET source_date_jalali = $1::varchar, source_time_hm = $2::varchar,
       relay_date_jalali = $3::varchar, relay_time_hm = $4::varchar,
       report_ref_date_jalali = $1::varchar, report_ref_time_hm = $2::varchar,
       created_at = $5::timestamptz
   WHERE id = $6`,
  ["1405-04-23", "2359", "1405-04-24", "0010", new Date("2026-07-14T13:39:00Z"), TEST_ID],
);

const computed = computeReportRefFields(
  "1405-04-23", "2359", "1405-04-24", "0010", new Date("2026-07-14T13:39:00Z"),
);
console.log("expected computed ref:", computed);

const updated = await ensureReportRefForPeriod(period.from_ref_key, period.to_ref_key);
console.log("updated rows:", updated);

const after = await pool.query(
  "SELECT report_ref_date_jalali, report_ref_time_hm FROM tbl_news WHERE id = $1",
  [TEST_ID],
);
console.log("stored after:", after.rows[0]);

const slot = await pool.query(
  `${NEWS_REF_KEY_CTE}
   SELECT id, ref_key FROM base_key WHERE id = $1 AND ref_key >= $2 AND ref_key <= $3`,
  [TEST_ID, period.from_ref_key, period.to_ref_key],
);
console.log("in 18-24 slot after fix:", slot.rows.length > 0);

// restore
await pool.query(
  `UPDATE tbl_news
   SET source_date_jalali = $1, source_time_hm = $2,
       relay_date_jalali = $3, relay_time_hm = $4,
       report_ref_date_jalali = $5, report_ref_time_hm = $6,
       created_at = $7
   WHERE id = $8`,
  [
    backup.source_date_jalali, backup.source_time_hm,
    backup.relay_date_jalali, backup.relay_time_hm,
    backup.report_ref_date_jalali, backup.report_ref_time_hm,
    backup.created_at, TEST_ID,
  ],
);

const ok = after.rows[0].report_ref_time_hm === computed.ref_hm
  && after.rows[0].report_ref_date_jalali === computed.ref_date
  && slot.rows.length === 0;
console.log(ok ? "PASS" : "FAIL");

await pool.end();
process.exit(ok ? 0 : 1);
