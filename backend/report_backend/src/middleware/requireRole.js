import { ROLE_PERMISSIONS, LEGACY_ROLE_TO_TEMPLATE } from "../constants/rbacSeed.js";

/** Union of permission codes granted by any of the allowed legacy roles */
export function permissionsForAllowedRoles(allowedRoles) {
  const perms = new Set();
  for (const role of allowedRoles) {
    if (role === "admin") {
      (ROLE_PERMISSIONS.system_admin || ROLE_PERMISSIONS.admin || []).forEach((p) => perms.add(p));
      continue;
    }
    const template = LEGACY_ROLE_TO_TEMPLATE[role] || role;
    (ROLE_PERMISSIONS[template] || ROLE_PERMISSIONS[role] || []).forEach((p) => perms.add(p));
  }
  return [...perms];
}

/** Parse role field from JWT/user record (string, array, or postgres array string) */
export function parseUserRoles(role) {
  if (!role) return [];
  if (Array.isArray(role)) return role.map((r) => String(r).trim()).filter(Boolean);
  const str = String(role);
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((r) => String(r).trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  if (str.includes("{") || str.includes("}")) {
    return str.replace(/[{}"\s]/g, "").split(",").filter(Boolean);
  }
  if (str.includes(",")) return str.split(",").map((r) => r.trim()).filter(Boolean);
  return [str.trim()];
}

/** Persist multi-role legacy field consistently (JSON array string) */
export function serializeUserRoles(roleCodes) {
  const codes = [...new Set((roleCodes || []).map((r) => String(r).trim()).filter(Boolean))];
  return JSON.stringify(codes.length ? codes : ["user"]);
}

export function userHasRoleCode(userRoles, code) {
  const target = String(code || "").trim();
  if (!target) return false;
  return parseUserRoles(userRoles).some((r) => {
    const normalized = LEGACY_ROLE_TO_TEMPLATE[r] || r;
    return normalized === target || r === target;
  });
}

export function hasAnyRole(user, allowedRoles) {
  const userRoles = parseUserRoles(user?.role);
  const templates = user?.role_templates || [];
  if (userRoles.includes("admin") || templates.includes("system_admin")) return true;
  if (allowedRoles.some((r) => userRoles.includes(r))) return true;
  if (allowedRoles.includes("admin") && templates.includes("system_admin")) return true;
  if (user?.permissions?.includes("rbac.manage")) return true;
  return false;
}

export function hasAnyPermission(user, permissions) {
  if (!permissions?.length) return false;
  const set = new Set(user?.permissions || []);
  if (set.has("rbac.manage")) return true;
  return permissions.some((p) => set.has(p));
}

export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "احراز هویت الزامی است" });
    }
    if (hasAnyRole(req.user, allowedRoles)) {
      return next();
    }
    const mapped = permissionsForAllowedRoles(allowedRoles);
    if (hasAnyPermission(req.user, mapped)) {
      return next();
    }
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  };
}

/** Prefer requirePermission from requirePermission.js — this bridges JWT permissions */
export function requireRoleOrPermission(allowedRoles, permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "احراز هویت الزامی است" });
    }
    if (hasAnyRole(req.user, allowedRoles)) return next();
    if (hasAnyPermission(req.user, [permission])) return next();
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  };
}
