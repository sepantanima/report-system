/**
 * ساخت/به‌روزرسانی کاربران دمو برای ارائه چندایستگاهی.
 *
 * Usage (از پوشه backend/report_backend):
 *   node dev/seed_demo_users.mjs
 *   DEMO_UNIT_CD=1 DEMO_PASSWORD='Demo@1405' node dev/seed_demo_users.mjs
 *   node dev/seed_demo_users.mjs --deactivate
 *
 * Env:
 *   DEMO_UNIT_CD   — کد یگان (پیش‌فرض: اولین واحد موجود یا 1)
 *   DEMO_PASSWORD  — رمز مشترک (پیش‌فرض: Demo@1405)
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import pg from "pg";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@1405";
const deactivate = process.argv.includes("--deactivate");

const CAST = [
  { username: "demo-farmandeh", name: "دمو — فرمانده راهبردی", role: "strategy_commander" },
  { username: "demo-nazer", name: "دمو — ناظر راهبردی", role: "strategy_viewer" },
  { username: "demo-payeshgar", name: "دمو — پایشگر اخبار", role: "news_monitor" },
  { username: "demo-dabir", name: "دمو — دبیر اخبار", role: "news_editor" },
  { username: "demo-sar-dabir", name: "دمو — سردبیر اخبار", role: "news_chief" },
  { username: "demo-vahed", name: "دمو — کاربر واحد", role: "user" },
  { username: "demo-modir-meydani", name: "دمو — مدیر میدانی", role: "Field_admin" },
  { username: "demo-pishnahad", name: "دمو — پیشنهاددهنده محور", role: "topic_proposer" },
  { username: "demo-tasvib", name: "دمو — تصویب‌کننده محور", role: "topic_approver" },
  { username: "demo-tahlilgar", name: "دمو — تحلیل‌گر", role: "analyst" },
  { username: "demo-rahnama", name: "دمو — راهنما/داور", role: "mentor" },
  { username: "demo-modir-tahlil", name: "دمو — مدیر تحلیل", role: "analysis_manager" },
  { username: "demo-admin", name: "دمو — مدیر کل", role: "admin" },
];

async function resolveUnitCd(client) {
  if (process.env.DEMO_UNIT_CD != null && String(process.env.DEMO_UNIT_CD).trim() !== "") {
    const n = Number(process.env.DEMO_UNIT_CD);
    if (!Number.isFinite(n)) throw new Error("DEMO_UNIT_CD باید عدد باشد");
    return n;
  }
  try {
    const r = await client.query(
      `SELECT "UnitCode" AS id FROM tbl_units ORDER BY "UnitCode" ASC LIMIT 1`,
    );
    if (r.rows[0]?.id != null) return Number(r.rows[0].id);
  } catch {
    /* fall through */
  }
  return 1;
}

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const unitCd = await resolveUnitCd(client);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const active = !deactivate;

  console.log(
    deactivate
      ? "حالت: غیرفعال‌سازی کاربران دمو (--deactivate)"
      : "حالت: ایجاد/به‌روزرسانی کاربران دمو",
  );
  console.log(`DB=${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`unit_cd=${unitCd}`);
  if (!deactivate) console.log(`password=${DEMO_PASSWORD}`);
  console.log("---");

  const rows = [];
  for (const u of CAST) {
    const r = await client.query(
      `INSERT INTO tbl_users (username, name, password, role, unit_cd, gender, active)
       VALUES ($1, $2, $3, $4, $5, 'male', $6)
       ON CONFLICT (username) DO UPDATE SET
         name = EXCLUDED.name,
         password = CASE WHEN $7::boolean THEN EXCLUDED.password ELSE tbl_users.password END,
         role = EXCLUDED.role,
         unit_cd = EXCLUDED.unit_cd,
         active = EXCLUDED.active
       RETURNING id, username, role, active, unit_cd`,
      [u.username, u.name, hash, u.role, unitCd, active, !deactivate],
    );
    const row = r.rows[0];
    rows.push({ ...row, label: u.name });
    console.log(
      `${row.username.padEnd(22)} role=${String(row.role).padEnd(22)} active=${row.active} id=${row.id}`,
    );
  }

  console.log("---");
  console.log("جدول لاگین ایستگاه‌ها:");
  console.log(
    ["username", "role", "password", "name"].map((h) => h.padEnd(22)).join(" | "),
  );
  for (const u of CAST) {
    console.log(
      [u.username, u.role, deactivate ? "(disabled)" : DEMO_PASSWORD, u.name]
        .map((h) => String(h).padEnd(22))
        .join(" | "),
    );
  }

  await client.end();
  console.log(deactivate ? "\n✅ کاربران دمو غیرفعال شدند." : "\n✅ کاربران دمو آمادهٔ لاگین هستند.");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
