import pool from "../src/db.js";
import { inferWorkflowStatus, inferReviewState } from "../src/constants/newsMonitorMeta.js";
import { sqlEffectiveNewsWorkflow } from "../src/services/newsDbEnums.js";
import { jalaliDateToRefKeyStart, jalaliDateToRefKeyEnd, NEWS_REF_KEY_CTE } from "../src/services/newsMonitorService.js";

const EWS = sqlEffectiveNewsWorkflow();
const start = "1405-02-06";
const end = "1405-02-06";
const fromKey = jalaliDateToRefKeyStart(start);
const toKey = jalaliDateToRefKeyEnd(end);

async function main() {
  pool.on("error", () => {});
  try {
    const stats = await pool.query(
      `${NEWS_REF_KEY_CTE}
       SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE ${EWS} = 'reviewed')::int AS wf_reviewed,
         COUNT(*) FILTER (WHERE ${EWS} = 'pending')::int AS wf_pending
       FROM base_key bk
       WHERE bk.ref_key >= $1 AND bk.ref_key <= $2`,
      [fromKey, toKey],
    );
    console.log("STATS", stats.rows[0]);

    const sample = await pool.query(
      `${NEWS_REF_KEY_CTE}
       SELECT bk.id, bk.workflow_status, bk.review_state, bk.is_approved, bk.status,
              ${EWS} AS ews
       FROM base_key bk
       WHERE bk.ref_key >= $1 AND bk.ref_key <= $2
       LIMIT 15`,
      [fromKey, toKey],
    );
    for (const row of sample.rows) {
      const rs = row.review_state || inferReviewState(row.is_approved, row.status);
      const inferred = inferWorkflowStatus({ ...row, review_state: rs });
      console.log({
        id: row.id,
        db_ws: row.workflow_status,
        db_rs: row.review_state,
        ews: row.ews,
        inferred,
      });
    }

    const mismatch = await pool.query(
      `${NEWS_REF_KEY_CTE}
       SELECT COUNT(*)::int AS c
       FROM base_key bk
       WHERE bk.ref_key >= $1 AND bk.ref_key <= $2
         AND ${EWS} <> 'reviewed'
         AND trim(both '''' from trim(COALESCE(bk.workflow_status, 'new'))) = 'reviewed'`,
      [fromKey, toKey],
    );
    console.log("raw reviewed but ews not reviewed:", mismatch.rows[0].c);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
