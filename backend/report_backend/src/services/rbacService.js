import pool from "../db.js";
import { parseUserRoles, hasAnyRole } from "../middleware/requireRole.js";
import {
  ROLE_PERMISSIONS,
  LEGACY_ROLE_TO_TEMPLATE,
} from "../constants/rbacSeed.js";
import { legacyRoleToTemplate } from "./rbacSeedService.js";

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function cacheKey(userId) {
  return String(userId);
}

function getCached(userId) {
  const entry = cache.get(cacheKey(userId));
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(userId));
    return null;
  }
  return entry.data;
}

function setCache(userId, data) {
  cache.set(cacheKey(userId), { at: Date.now(), data });
}

export function invalidateUserPermissionCache(userId) {
  if (userId != null) cache.delete(cacheKey(userId));
  else cache.clear();
}

async function getGlobalPermissionVersion() {
  try {
    const r = await pool.query("SELECT permission_version FROM tbl_rbac_meta WHERE id = 1");
    return r.rows[0]?.permission_version ?? 1;
  } catch {
    return 1;
  }
}

function legacyPermissionsFromRole(roleField) {
  const roles = parseUserRoles(roleField).map(legacyRoleToTemplate);
  const perms = new Set();
  for (const role of roles) {
    if (role === "admin" || roles.includes("admin")) {
      (ROLE_PERMISSIONS.system_admin || ROLE_PERMISSIONS.admin || []).forEach((p) => perms.add(p));
    }
    (ROLE_PERMISSIONS[role] || []).forEach((p) => perms.add(p));
  }
  if (!perms.size && ROLE_PERMISSIONS.user) {
    ROLE_PERMISSIONS.user.forEach((p) => perms.add(p));
  }
  return [...perms];
}

async function loadFromDb(userId) {
  try {
    const assignments = await pool.query(
      `SELECT rt.code
       FROM tbl_user_role_assignments ura
       JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
       WHERE ura.user_id = $1 AND ura.active = TRUE`,
      [userId],
    );

    const grants = await pool.query(
      `SELECT p.code, g.effect
       FROM tbl_user_permission_grants g
       JOIN tbl_permissions p ON p.id = g.permission_id
       WHERE g.user_id = $1`,
      [userId],
    );

    if (!assignments.rows.length) return null;

    const roleCodes = assignments.rows.map((r) => r.code);
    const permSet = new Set();

    if (roleCodes.length) {
      const tplPerms = await pool.query(
        `SELECT DISTINCT p.code
         FROM tbl_role_template_permissions rtp
         JOIN tbl_permissions p ON p.id = rtp.permission_id
         JOIN tbl_role_templates rt ON rt.id = rtp.role_template_id
         WHERE rt.code = ANY($1::text[])`,
        [roleCodes],
      );
      tplPerms.rows.forEach((r) => permSet.add(r.code));
    }

    grants.rows.forEach((g) => {
      if (g.effect === "allow") permSet.add(g.code);
      if (g.effect === "deny") permSet.delete(g.code);
    });

    const permission_version = await getGlobalPermissionVersion();
    return {
      permissions: [...permSet],
      roleTemplates: roleCodes,
      permission_version,
    };
  } catch (err) {
    if (err.code === "42P01") return null;
    throw err;
  }
}

export async function getEffectivePermissions(userId, legacyRoleField = null) {
  const cached = getCached(userId);
  if (cached) return cached;

  let data = await loadFromDb(userId);
  if (!data) {
    data = {
      permissions: legacyPermissionsFromRole(legacyRoleField),
      roleTemplates: parseUserRoles(legacyRoleField).map(legacyRoleToTemplate),
      permission_version: await getGlobalPermissionVersion(),
    };
  }

  setCache(userId, data);
  return data;
}

export async function userHasPermission(userId, permission, legacyRoleField = null) {
  const { permissions } = await getEffectivePermissions(userId, legacyRoleField);
  if (permissions.includes(permission)) return true;
  if (permissions.includes("rbac.manage") && permission !== "rbac.manage") {
    return permissions.some((p) => p === permission);
  }
  return false;
}

export async function userHasAnyPermission(userId, permissionList, legacyRoleField = null) {
  const { permissions } = await getEffectivePermissions(userId, legacyRoleField);
  const set = new Set(permissions);
  return permissionList.some((p) => set.has(p));
}

/** Bridge: check permission or legacy role list */
export async function checkAccess(req, { permission, permissions, roles }) {
  const userId = req.user?.id;
  const legacyRole = req.user?.role;

  if (userId) {
    if (permission && (await userHasPermission(userId, permission, legacyRole))) return true;
    if (permissions?.length && (await userHasAnyPermission(userId, permissions, legacyRole))) return true;
  }

  if (roles?.length && hasAnyRole(req.user, roles)) return true;
  if (permission || permissions?.length) {
    const legacy = legacyPermissionsFromRole(legacyRole);
    if (permission && legacy.includes(permission)) return true;
    if (permissions?.some((p) => legacy.includes(p))) return true;
  }
  return false;
}

export async function bumpPermissionVersion(client = pool) {
  await client.query(
    "UPDATE tbl_rbac_meta SET permission_version = permission_version + 1, updated_at = NOW() WHERE id = 1",
  );
  invalidateUserPermissionCache(null);
}
