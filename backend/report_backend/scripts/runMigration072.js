import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";
import { backfillAssignmentsFromLegacyRole } from "../src/services/rbacSeedService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const backfill = await backfillAssignmentsFromLegacyRole(client);
    console.log(`Backfill assignments: ${backfill.updated} user(s), ${backfill.skipped} already had roles.`);

    const sqlPath = path.join(__dirname, "../migrations/072_drop_users_role.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration 072_drop_users_role completed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
