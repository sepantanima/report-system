import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sqlPath = path.join(__dirname, "../migrations/070_sync_identity_exportables.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration 070_sync_identity_exportables completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
