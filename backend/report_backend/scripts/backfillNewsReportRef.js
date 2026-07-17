import pool from "../src/db.js";
import {
  computeReportRefFields,
  reconcileSourceDateWithRelay,
  normalizeJalaliDate,
  sourceJalaliToTimestamps,
} from "../src/services/newsTextUtils.js";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 500;

async function main() {
  let lastId = 0;
  let updated = 0;
  for (;;) {
    const r = await pool.query(
      `SELECT id, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm,
              report_ref_date_jalali, report_ref_time_hm, created_at
       FROM tbl_news
       WHERE id > $1
         AND COALESCE(is_deleted, false) = false
       ORDER BY id
       LIMIT $2`,
      [lastId, BATCH],
    );
    if (!r.rows.length) break;
    for (const row of r.rows) {
      lastId = row.id;
      const { ref_date, ref_hm } = computeReportRefFields(
        row.source_date_jalali,
        row.source_time_hm,
        row.relay_date_jalali,
        row.relay_time_hm,
        row.created_at,
      );
      if (!ref_date || !ref_hm) continue;

      const { sourceDate, sourceTime } = reconcileSourceDateWithRelay(
        row.source_date_jalali,
        row.source_time_hm,
        row.relay_date_jalali,
        row.relay_time_hm,
      );
      const prevDate = normalizeJalaliDate(row.source_date_jalali);
      const fixSource = sourceDate && prevDate !== sourceDate;
      const fixRef = row.report_ref_date_jalali !== ref_date || row.report_ref_time_hm !== ref_hm;
      if (!fixSource && !fixRef) continue;

      const { source_ts_utc, source_ts_tehran } = sourceJalaliToTimestamps(
        fixSource ? sourceDate : ref_date,
        fixSource ? sourceTime : ref_hm,
      );

      if (DRY_RUN) {
        if (fixSource) {
          console.log(`#${row.id}: source ${prevDate} ${row.source_time_hm} -> ${sourceDate} ${sourceTime}; ref ${ref_date} ${ref_hm}`);
        }
        updated += 1;
        continue;
      }

      await pool.query(
        `UPDATE tbl_news
         SET report_ref_date_jalali = $1,
             report_ref_time_hm = $2,
             source_date_jalali = CASE WHEN $3 THEN $4 ELSE source_date_jalali END,
             source_time_hm = CASE WHEN $3 THEN $5 ELSE source_time_hm END,
             source_ts_utc = $6,
             source_ts_tehran = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          ref_date,
          ref_hm,
          fixSource,
          sourceDate,
          sourceTime,
          source_ts_utc,
          source_ts_tehran,
          row.id,
        ],
      );
      updated += 1;
    }
  }
  console.log(DRY_RUN ? `[dry-run] would update ${updated} rows` : `updated ${updated} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
