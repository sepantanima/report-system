import "dotenv/config";
import pg from "pg";

const c = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});
await c.connect();
const cols = await c.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='tbl_units' ORDER BY 1`,
);
console.log("units:", cols.rows.map((r) => r.column_name).join(","));
const v = await c.query(
  `SELECT COUNT(*)::int AS c FROM tbl_unit_events WHERE state='verified' AND COALESCE(is_deleted,false)=false`,
);
console.log("verified", v.rows[0]);
try {
  const feed = await c.query(`
    SELECT 'field'::text AS kind, e.id
    FROM tbl_unit_events e
    LEFT JOIN tbl_units u ON e.unitcd = u."UnitCode"
    WHERE COALESCE(e.is_deleted, false) = false
      AND COALESCE(e.state, '') = 'verified'
    LIMIT 1
  `);
  console.log("sample join ok", feed.rows[0] || null);
} catch (e) {
  console.error("join error", e.message);
}
await c.end();
