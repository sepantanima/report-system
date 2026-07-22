import { useAuth } from "../../context/AuthContext.jsx";
import { hasPermission as legacyHasPermission, getSessionRoles } from "../../utils/userRoles.js";

export default function PermissionGate({ permission, anyOf, children, fallback = null }) {
  let allowed = false;
  try {
    const auth = useAuth();
    const perms = anyOf || (permission ? [permission] : []);
    allowed = auth.hasPermission(perms);
  } catch {
    const roles = getSessionRoles();
    const perms = anyOf || (permission ? [permission] : []);
    allowed = perms.some((p) => legacyHasPermission(roles, p));
  }

  if (!allowed) return fallback;
  return children;
}
