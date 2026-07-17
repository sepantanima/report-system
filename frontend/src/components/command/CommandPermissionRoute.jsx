import { Navigate } from "react-router-dom";
import { hasPermission, getSessionRoles } from "../../utils/userRoles.js";

/**
 * Route guard for command-center pages.
 * @param {string|string[]} permission - permission key(s); any match grants access
 */
export default function CommandPermissionRoute({ children, permission }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;

  const perms = Array.isArray(permission) ? permission : [permission];
  const roles = getSessionRoles();
  const allowed = perms.some((p) => hasPermission(roles, p));
  if (!allowed) return <Navigate to="/main" replace />;

  return children;
}
