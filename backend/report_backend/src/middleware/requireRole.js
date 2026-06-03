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

export function hasAnyRole(user, allowedRoles) {
  const userRoles = parseUserRoles(user?.role);
  if (userRoles.includes("admin")) return true;
  return allowedRoles.some((r) => userRoles.includes(r));
}

export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "احراز هویت الزامی است" });
    }
    if (hasAnyRole(req.user, allowedRoles)) {
      return next();
    }
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  };
}
