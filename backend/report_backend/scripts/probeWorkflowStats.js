import pool from "../src/db.js";
import { getSummaryStats, listNewsMonitor } from "../src/services/newsMonitorService.js";
import { inferWorkflowStatus, inferReviewState } from "../src/constants/newsMonitorMeta.js";
import { sqlEffectiveNewsWorkflow } from "../src/services/newsDbEnums.js";

const EWS = sqlEffectiveNewsWorkflow("bk");
const date = { start_date: "1405-02-06", end_date: "1405-02-06" };

async function main() {
  pool.on("error", () => {});
  try {
    const stats = await getSummaryStats(date);
    console.log("stats", stats);

    const mismatch = await pool.query(`
      WITH base AS (
        SELECT n.*,
          CASE WHEN n.source_date_jalali IS NOT NULL AND trim(n.source_date_jalali) <> ''
               AND n.source_time_hm IS NOT NULL AND trim(n.source_time_hm) <> ''
            THEN trim(n.source_date_jalali) ELSE trim(n.relay_date_jalali) END AS ref_date,
          lpad(regexp_replace(CASE WHEN n.source_date_jalali IS NOT NULL AND trim(n.source_date_jalali) <> ''
               AND n.source_time_hm IS NOT NULL AND trim(n.source_time_hm) <> ''
            THEN n.source_time_hm ELSE n.relay_time_hm END, '\\D','','g'), 4, '0') AS ref_hm
        FROM tbl_news n
        WHERE COALESCE(NULLIF(trim(n.cleaned_text), ''), NULLIF(trim(n.raw_text), '')) IS NOT NULL
          AND COALESCE(n.is_deleted, false) = false
      ),
      base_key AS (SELECT *, (regexp_replace(ref_date, '[^0-9]', '', 'g') || ref_hm) AS ref_key FROM base)
      SELECT id, workflow_status, review_state, is_approved, status,
             ${EWS} AS sql_ews
      FROM base_key bk
      WHERE bk.ref_key >= '140502060000' AND bk.ref_key <= '140502069999'
      LIMIT 500
    `);

    let jsReviewed = 0;
    let sqlReviewed = 0;
    let mismatchRows = [];
    for (const row of mismatch.rows) {
      const rs = row.review_state || inferReviewState(row.is_approved, row.status);
      const jsWs = inferWorkflowStatus({ ...row, review_state: rs });
      if (jsWs === "reviewed") jsReviewed++;
      if (row.sql_ews === "reviewed") sqlReviewed++;
      if (jsWs !== row.sql_ews) {
        mismatchRows.push({
          id: row.id,
          workflow_status: row.workflow_status,
          review_state: row.review_state,
          jsWs,
          sqlEws: row.sql_ews,
        });
      }
    }
    console.log("jsReviewed", jsReviewed, "sqlReviewed", sqlReviewed, "mismatches", mismatchRows.length);
    console.log("sample mismatches", mismatchRows.slice(0, 10));

    const listReviewed = await listNewsMonitor({ ...date, workflow_status: "reviewed", duplicate: "exclude", review_state: "all" });
    const listAll = await listNewsMonitor({ ...date, workflow_status: "all", duplicate: "exclude", review_state: "all" });
    console.log("list reviewed", listReviewed.items.length, "total", listReviewed.total, "list all", listAll.items.length, "total", listAll.total);
    console.log("list reviewed sample ws", listReviewed.items.slice(0, 3).map((r) => ({ id: r.id, ws: r.workflow_status, rs: r.review_state })));
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
