import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "../migrations/033_message_soft_delete.sql");

async function run() {
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration 033_message_soft_delete completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
