import pool from "../src/db.js";
import { sqlNewsWorkflow, sqlEffectiveNewsWorkflow } from "../src/services/newsDbEnums.js";
import { NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";
import { jalaliDateToRefKeyStart, jalaliDateToRefKeyEnd } from "../src/services/newsMonitorService.js";

const WS = sqlNewsWorkflow();
const EWS = sqlEffectiveNewsWorkflow();
const fromKey = jalaliDateToRefKeyStart("1405-02-06");
const toKey = jalaliDateToRefKeyEnd("1405-02-06");

async function main() {
  pool.on("error", () => {});
  try {
    const r = await pool.query(
      `${NEWS_REF_KEY_CTE}
       SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE ${WS} = 'reviewed')::int AS raw_reviewed,
         COUNT(*) FILTER (WHERE ${EWS} = 'reviewed')::int AS effective_reviewed,
         COUNT(*) FILTER (WHERE ${WS} = 'pending' AND ${EWS} = 'reviewed')::int AS pending_but_shows_reviewed
       FROM base_key bk
       WHERE bk.ref_key >= $1 AND bk.ref_key <= $2`,
      [fromKey, toKey],
    );
    console.log(JSON.stringify(r.rows[0], null, 2));
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
