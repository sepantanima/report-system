import pool from "../src/db.js";
import {
  normalizeJalaliDate,
  normalizeTimeHm,
  reconcileSourceDateWithRelay,
  sourceJalaliToTimestamps,
} from "../src/services/newsTextUtils.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const r = await pool.query(
    `SELECT id, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm
     FROM tbl_news
     WHERE source_date_jalali IS NOT NULL AND trim(source_date_jalali) <> ''
       AND source_time_hm IS NOT NULL AND trim(source_time_hm) <> ''
       AND relay_date_jalali IS NOT NULL AND trim(relay_date_jalali) <> ''
       AND relay_time_hm IS NOT NULL AND trim(relay_time_hm) <> ''
       AND trim(source_date_jalali) = trim(relay_date_jalali)
       AND lpad(regexp_replace(source_time_hm, '\\D','','g'), 4, '0')
           > lpad(regexp_replace(relay_time_hm, '\\D','','g'), 4, '0')
     ORDER BY id`,
  );

  let updated = 0;
  for (const row of r.rows) {
    const { sourceDate, sourceTime } = reconcileSourceDateWithRelay(
      row.source_date_jalali,
      row.source_time_hm,
      row.relay_date_jalali,
      row.relay_time_hm,
    );
    const prev = normalizeJalaliDate(row.source_date_jalali);
    if (!sourceDate || sourceDate === prev) continue;
    const { source_ts_utc, source_ts_tehran } = sourceJalaliToTimestamps(sourceDate, sourceTime);
    console.log(`#${row.id}: ${prev} ${row.source_time_hm} -> ${sourceDate} ${sourceTime}`);
    if (!DRY_RUN) {
      await pool.query(
        `UPDATE tbl_news
         SET source_date_jalali = $1, source_ts_utc = $2, source_ts_tehran = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [sourceDate, source_ts_utc, source_ts_tehran, row.id],
      );
    }
    updated += 1;
  }
  console.log(DRY_RUN ? `[dry-run] would update ${updated} rows` : `updated ${updated} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
