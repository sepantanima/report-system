import pool from "../src/db.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";

const fromKey = "140504231800";
const toKey = "140504232359";
const sql = `
  ${NEWS_REF_KEY_CTE}
  SELECT bk.id, bk.ref_date, bk.ref_hm, bk.ref_key,
         bk.source_date_jalali, bk.source_time_hm,
         bk.relay_date_jalali, bk.relay_time_hm, bk.source
  FROM base_key bk
  WHERE bk.ref_key >= $1 AND bk.ref_key <= $2
  ORDER BY bk.ref_key DESC
  LIMIT 10
`;

try {
  const r = await pool.query(sql, [fromKey, toKey]);
  console.log("slot rows:", JSON.stringify(r.rows, null, 2));
  const ts = await pool.query(
    `SELECT id, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm,
            source_ts_tehran, relay_ts_tehran, created_at
     FROM tbl_news WHERE id = ANY($1::int[])`,
    [[51847, 51849, 51851]],
  );
  console.log("timestamps:", JSON.stringify(ts.rows, null, 2));
} catch (e) {
  console.error(e.message);
} finally {
  await pool.end();
}
