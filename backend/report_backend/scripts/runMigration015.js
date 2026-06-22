import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "../migrations/015_news_workflow_default_pending.sql");

async function run() {
  pool.on("error", () => {});
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration 015_news_workflow_default_pending completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

run().then(() => process.exit(process.exitCode ?? 0));
