import { Router } from "express";
import auth from "../middleware/auth.js";
import requirePermission from "../middleware/requirePermission.js";
import pool from "../db.js";
import { bumpPermissionVersion, invalidateUserPermissionCache } from "../services/rbacService.js";
import {
  ROLE_TEMPLATE_LABELS,
  PERMISSION_DESCRIPTIONS,
  getDefaultPermissionsForRole,
} from "../constants/rbacSeed.js";
import { legacyRoleToTemplate, backfillAssignmentsFromLegacyRole } from "../services/rbacSeedService.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import { resolveAnalystRoleSuggestions } from "../services/analysisBriefSubmissionService.js";

const router = Router();

router.use(auth);
router.use(requirePermission("rbac.manage", { legacyRoles: ["admin"] }));

router.get("/permissions", async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, code, label_fa, module, is_system FROM tbl_permissions ORDER BY module, code`,
    );
    res.json(
      r.rows.map((row) => ({
        ...row,
        description_fa: PERMISSION_DESCRIPTIONS[row.code] || "",
      })),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/role-templates", async (_req, res) => {
  try {
    const roles = await pool.query(
      `SELECT rt.id, rt.code, rt.label_fa, rt.is_system, rt.default_permission_codes,
              COALESCE(json_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
       FROM tbl_role_templates rt
       LEFT JOIN tbl_role_template_permissions rtp ON rtp.role_template_id = rt.id
       LEFT JOIN tbl_permissions p ON p.id = rtp.permission_id
       GROUP BY rt.id ORDER BY rt.code`,
    );
    res.json(
      roles.rows.map((row) => ({
        ...row,
        default_permissions: Array.isArray(row.default_permission_codes) ? row.default_permission_codes : [],
      })),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function applyPermissionsToRole(roleId, codes) {
  const perms = await pool.query(`SELECT id, code FROM tbl_permissions WHERE code = ANY($1::text[])`, [codes]);
  await pool.query(`DELETE FROM tbl_role_template_permissions WHERE role_template_id = $1`, [roleId]);
  for (const p of perms.rows) {
    await pool.query(
      `INSERT INTO tbl_role_template_permissions (role_template_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [roleId, p.id],
    );
  }
}

router.put("/role-templates/:id/permissions", async (req, res) => {
  const roleId = parseInt(req.params.id, 10);
  const codes = req.body?.permissions || [];
  try {
    const role = await pool.query(`SELECT id, is_system, code FROM tbl_role_templates WHERE id = $1`, [roleId]);
    if (!role.rows[0]) return res.status(404).json({ error: "نقش یافت نشد" });
    if (role.rows[0].is_system && ["system_admin", "tech_admin"].includes(role.rows[0].code)) {
      return res.status(403).json({ error: "ویرایش مجوز نقش‌های سیستمی محدود است" });
    }

    await applyPermissionsToRole(roleId, codes);
    await bumpPermissionVersion();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/role-templates/:id/default-permissions", async (req, res) => {
  const roleId = parseInt(req.params.id, 10);
  const codes = req.body?.permissions || [];
  try {
    const role = await pool.query(`SELECT id FROM tbl_role_templates WHERE id = $1`, [roleId]);
    if (!role.rows[0]) return res.status(404).json({ error: "نقش یافت نشد" });
    await pool.query(
      `UPDATE tbl_role_templates SET default_permission_codes = $1::jsonb WHERE id = $2`,
      [JSON.stringify(codes), roleId],
    );
    res.json({ success: true, permissions: codes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/role-templates/:id/reset-defaults", async (req, res) => {
  const roleId = parseInt(req.params.id, 10);
  try {
    const role = await pool.query(
      `SELECT id, code, default_permission_codes FROM tbl_role_templates WHERE id = $1`,
      [roleId],
    );
    if (!role.rows[0]) return res.status(404).json({ error: "نقش یافت نشد" });

    const stored = role.rows[0].default_permission_codes;
    const codes = Array.isArray(stored) && stored.length
      ? stored
      : getDefaultPermissionsForRole(role.rows[0].code);
    await applyPermissionsToRole(roleId, codes);
    await bumpPermissionVersion();
    res.json({
      success: true,
      permissions: codes,
      source: Array.isArray(stored) && stored.length ? "admin_default" : "seed",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/role-templates/:id/reset-seed-defaults", async (req, res) => {
  const roleId = parseInt(req.params.id, 10);
  try {
    const role = await pool.query(`SELECT id, code FROM tbl_role_templates WHERE id = $1`, [roleId]);
    if (!role.rows[0]) return res.status(404).json({ error: "نقش یافت نشد" });
    const codes = getDefaultPermissionsForRole(role.rows[0].code);
    await pool.query(
      `UPDATE tbl_role_templates SET default_permission_codes = $1::jsonb WHERE id = $2`,
      [JSON.stringify(codes), roleId],
    );
    await applyPermissionsToRole(roleId, codes);
    await bumpPermissionVersion();
    res.json({ success: true, permissions: codes, source: "seed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/settings", async (_req, res) => {
  try {
    const r = await pool.query(`SELECT default_new_user_role_codes FROM tbl_rbac_meta WHERE id = 1`);
    const codes = r.rows[0]?.default_new_user_role_codes;
    res.json({
      default_new_user_role_codes: Array.isArray(codes) && codes.length ? codes : ["user"],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", async (req, res) => {
  const codes = req.body?.default_new_user_role_codes;
  try {
    if (!Array.isArray(codes) || !codes.length) {
      return res.status(400).json({ error: "حداقل یک نقش پیش‌فرض برای کاربر جدید لازم است" });
    }
    await pool.query(
      `UPDATE tbl_rbac_meta SET default_new_user_role_codes = $1::jsonb, updated_at = NOW() WHERE id = 1`,
      [JSON.stringify(codes)],
    );
    res.json({ success: true, default_new_user_role_codes: codes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/users/:userId/assignments", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const r = await pool.query(
      `SELECT ura.id, ura.active, rt.id AS role_template_id, rt.code, rt.label_fa
       FROM tbl_user_role_assignments ura
       JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
       WHERE ura.user_id = $1`,
      [userId],
    );
    const grants = await pool.query(
      `SELECT g.id, g.effect, p.code, p.label_fa
       FROM tbl_user_permission_grants g
       JOIN tbl_permissions p ON p.id = g.permission_id
       WHERE g.user_id = $1`,
      [userId],
    );
    res.json({ assignments: r.rows, grants: grants.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/users/:userId/assignments", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const roleCodes = req.body?.role_codes || [];
  try {
    const roles = await pool.query(`SELECT id, code FROM tbl_role_templates WHERE code = ANY($1::text[])`, [roleCodes]);
    await pool.query(`UPDATE tbl_user_role_assignments SET active = FALSE WHERE user_id = $1`, [userId]);
    for (const rt of roles.rows) {
      await pool.query(
        `INSERT INTO tbl_user_role_assignments (user_id, role_template_id, active)
         VALUES ($1,$2,TRUE) ON CONFLICT (user_id, role_template_id) DO UPDATE SET active = TRUE`,
        [userId, rt.id],
      );
    }
    if (roleCodes.includes("analyst")) {
      await resolveAnalystRoleSuggestions(userId);
    }
    invalidateUserPermissionCache(userId);
    await bumpPermissionVersion();
    res.json({ success: true, role_codes: roleCodes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/users/:userId/grants", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const grants = req.body?.grants || [];
  try {
    await pool.query(`DELETE FROM tbl_user_permission_grants WHERE user_id = $1`, [userId]);
    for (const g of grants) {
      const p = await pool.query(`SELECT id FROM tbl_permissions WHERE code = $1`, [g.code]);
      if (!p.rows[0]) continue;
      if (p.rows[0] && (await pool.query(`SELECT is_system FROM tbl_permissions WHERE code = $1`, [g.code])).rows[0]?.is_system) {
        continue;
      }
      await pool.query(
        `INSERT INTO tbl_user_permission_grants (user_id, permission_id, effect) VALUES ($1,$2,$3)`,
        [userId, p.rows[0].id, g.effect === "deny" ? "deny" : "allow"],
      );
    }
    invalidateUserPermissionCache(userId);
    await bumpPermissionVersion();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/sync-from-legacy/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const exists = await pool.query(`SELECT id FROM tbl_users WHERE id = $1`, [userId]);
    if (!exists.rows[0]) return res.status(404).json({ error: "کاربر یافت نشد" });
    const backfill = await backfillAssignmentsFromLegacyRole(pool);
    invalidateUserPermissionCache(userId);
    res.json({ synced: true, backfill });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/role-labels", (_req, res) => {
  res.json(ROLE_TEMPLATE_LABELS);
});

export default router;
