import crypto from "crypto";
import pool from "../db.js";
import { getOrgCode, getInstanceMode } from "./instanceConfig.js";

async function getLastBriefingAt() {
  const r = await pool.query(
    `SELECT generated_at FROM tbl_admin_briefings WHERE org_code = $1 ORDER BY generated_at DESC LIMIT 1`,
    [getOrgCode()],
  ).catch(() => ({ rows: [] }));
  return r.rows[0]?.generated_at || new Date(0);
}

export async function previewAdminBriefing() {
  if (getInstanceMode() !== "offline") {
    throw new Error("گزارش راهبر فقط روی hub آفلاین تولید می‌شود");
  }

  const since = await getLastBriefingAt();

  const users = await pool.query(
    `SELECT id, username, name, role, unit_cd, active
     FROM tbl_users ORDER BY id DESC LIMIT 200`,
  ).catch(() => ({ rows: [] }));

  const assignments = await pool.query(
    `SELECT u.username, rt.code AS role_code, ura.created_at
     FROM tbl_user_role_assignments ura
     JOIN tbl_users u ON u.id = ura.user_id
     JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
     WHERE ura.created_at > $1`,
    [since],
  ).catch(() => ({ rows: [] }));

  return {
    org_code: getOrgCode(),
    since,
    user_changes: users.rows.length,
    assignment_changes: assignments.rows.length,
    users: users.rows,
    assignments: assignments.rows,
    note: "رمز عبور در گزارش نیست — فقط اطلاعات لازم برای ثبت دستی روی آنلاین",
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateAdminBriefingHtml(operatorUserId) {
  const data = await previewAdminBriefing();
  const briefingId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();

  const userRows = data.users
    .map(
      (u) =>
        `<tr><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.role)}</td><td>${escapeHtml(u.unit_cd)}</td><td>${u.active ? "فعال" : "غیرفعال"}</td></tr>`,
    )
    .join("");

  const assignRows = data.assignments
    .map((a) => `<tr><td>${escapeHtml(a.username)}</td><td>${escapeHtml(a.role_code)}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><title>گزارش راهبر آنلاین — ${escapeHtml(data.org_code)}</title>
<style>
body{font-family:Tahoma,sans-serif;margin:2rem;line-height:1.6}
table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{border:1px solid #ccc;padding:8px;text-align:right}
th{background:#f0f0f0}
.warn{background:#fff3cd;padding:1rem;border-radius:4px}
</style></head>
<body>
<h1>گزارش تغییرات اداری برای راهبر آنلاین</h1>
<p><strong>سازمان:</strong> ${escapeHtml(data.org_code)} | <strong>تاریخ:</strong> ${escapeHtml(generatedAt)}</p>
<div class="warn">این فایل فقط راهنمای اعمال دستی است — import خودکار ندارد. رمز عبور منتقل نمی‌شود.</div>
<h2>تغییرات کاربر (${data.user_changes})</h2>
<table><thead><tr><th>نام کاربری</th><th>نام</th><th>نقش legacy</th><th>واحد</th><th>وضعیت</th></tr></thead>
<tbody>${userRows || "<tr><td colspan='5'>بدون تغییر</td></tr>"}</tbody></table>
<h2>تغییرات assignment (${data.assignment_changes})</h2>
<table><thead><tr><th>کاربر</th><th>نقش</th></tr></thead>
<tbody>${assignRows || "<tr><td colspan='2'>بدون تغییر</td></tr>"}</tbody></table>
<p><em>briefing_id: ${briefingId}</em></p>
</body></html>`;

  const checksum = crypto.createHash("sha256").update(html).digest("hex");

  await pool.query(
    `INSERT INTO tbl_admin_briefings (briefing_id, org_code, operator_user_id, checksum_sha256, summary_json)
     VALUES ($1,$2,$3,$4,$5)`,
    [briefingId, getOrgCode(), operatorUserId, checksum, JSON.stringify({
      user_changes: data.user_changes,
      assignment_changes: data.assignment_changes,
    })],
  ).catch(() => {});

  return { briefingId, html, checksum, generatedAt };
}

export async function markBriefingDelivered(briefingId) {
  await pool.query(
    `UPDATE tbl_admin_briefings SET delivered_at = NOW() WHERE briefing_id = $1 AND org_code = $2`,
    [briefingId, getOrgCode()],
  );
}

export async function listBriefings(limit = 20) {
  const r = await pool.query(
    `SELECT briefing_id, generated_at, delivered_at, checksum_sha256, summary_json
     FROM tbl_admin_briefings WHERE org_code = $1 ORDER BY generated_at DESC LIMIT $2`,
    [getOrgCode(), limit],
  ).catch(() => ({ rows: [] }));
  return r.rows;
}
