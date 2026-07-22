import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sqlPath = path.join(__dirname, "../migrations/071_rbac_role_defaults.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration 071_rbac_role_defaults completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
