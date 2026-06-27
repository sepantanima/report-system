import pool from "../src/db.js";
import { listDuplicatesPanel } from "../src/services/newsMonitorService.js";

const REQUIRED = [
  "duplicate_status",
  "duplicate_parent_id",
  "workflow_status",
  "is_deleted",
  "updated_at",
];

async function main() {
  pool.on("error", () => {});
  try {
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tbl_news'`,
    );
    const names = new Set(cols.rows.map((r) => r.column_name));
    const missing = REQUIRED.filter((c) => !names.has(c));
    console.log("tbl_news columns check:", missing.length ? `MISSING: ${missing.join(", ")}` : "all required columns present");

    const rows = await listDuplicatesPanel({});
    console.log("listDuplicatesPanel OK, rows:", rows.length);
  } catch (err) {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
