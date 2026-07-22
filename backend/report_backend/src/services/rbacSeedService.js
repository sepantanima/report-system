import {
  ROLE_PERMISSIONS,
  ROLE_TEMPLATE_LABELS,
  PERMISSION_LABELS,
  SYSTEM_PERMISSION_CODES,
  permissionModule,
  LEGACY_ROLE_TO_TEMPLATE,
} from "../constants/rbacSeed.js";
import { parseUserRoles } from "../middleware/requireRole.js";

function legacyRoleToTemplate(role) {
  const r = String(role || "").trim();
  if (LEGACY_ROLE_TO_TEMPLATE[r]) return LEGACY_ROLE_TO_TEMPLATE[r];
  if (ROLE_TEMPLATE_LABELS[r]) return r;
  return r;
}

export async function seedRbacFromConstants(db) {
  const allPermCodes = new Set();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    perms.forEach((p) => allPermCodes.add(p));
  }

  for (const code of [...allPermCodes].sort()) {
    await db.query(
      `INSERT INTO tbl_permissions (code, label_fa, module, is_system)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET label_fa = EXCLUDED.label_fa, module = EXCLUDED.module, is_system = EXCLUDED.is_system`,
      [
        code,
        PERMISSION_LABELS[code] || code,
        permissionModule(code),
        SYSTEM_PERMISSION_CODES.has(code),
      ],
    );
  }

  for (const [code, label] of Object.entries(ROLE_TEMPLATE_LABELS)) {
    await db.query(
      `INSERT INTO tbl_role_templates (code, label_fa, is_system)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (code) DO UPDATE SET label_fa = EXCLUDED.label_fa`,
      [code, label],
    );
  }

  const permRows = await db.query("SELECT id, code FROM tbl_permissions");
  const permByCode = Object.fromEntries(permRows.rows.map((r) => [r.code, r.id]));
  const roleRows = await db.query("SELECT id, code FROM tbl_role_templates");
  const roleByCode = Object.fromEntries(roleRows.rows.map((r) => [r.code, r.id]));

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    if (roleCode === "admin") continue;
    const roleId = roleByCode[roleCode];
    if (!roleId) continue;
    await db.query("DELETE FROM tbl_role_template_permissions WHERE role_template_id = $1", [roleId]);
    for (const pc of permCodes) {
      const pid = permByCode[pc];
      if (!pid) continue;
      await db.query(
        "INSERT INTO tbl_role_template_permissions (role_template_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [roleId, pid],
      );
    }
  }

  // Migrate existing users from tbl_users.role
  const users = await db.query("SELECT id, role FROM tbl_users WHERE active = TRUE");
  for (const user of users.rows) {
    const roles = parseUserRoles(user.role).map(legacyRoleToTemplate);
    const unique = [...new Set(roles.filter((r) => roleByCode[r]))];
    if (!unique.length && roleByCode.user) unique.push("user");
    for (const rc of unique) {
      await db.query(
        `INSERT INTO tbl_user_role_assignments (user_id, role_template_id, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (user_id, role_template_id) DO UPDATE SET active = TRUE`,
        [user.id, roleByCode[rc]],
      );
    }
  }

  await db.query("UPDATE tbl_rbac_meta SET permission_version = permission_version + 1, updated_at = NOW() WHERE id = 1");
}

export { legacyRoleToTemplate };
