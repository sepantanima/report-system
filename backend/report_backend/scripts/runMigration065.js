import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";
import { seedRbacFromConstants } from "../src/services/rbacSeedService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sqlPath = path.join(__dirname, "../migrations/065_rbac.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("Migration 065_rbac schema completed.");
    await seedRbacFromConstants(pool);
    console.log("RBAC seed completed.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
