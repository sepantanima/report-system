import { Navigate } from "react-router-dom";
import { hasPermission, getSessionRoles } from "../../utils/userRoles.js";

/**
 * Route guard for analysis pages.
 * @param {string|string[]} permission - permission key(s); any match grants access
 * @param {boolean} [anyAuthenticated] - if true, any logged-in user passes
 */
export default function AnalysisPermissionRoute({ children, permission, anyAuthenticated = false }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;

  if (anyAuthenticated) return children;

  const perms = Array.isArray(permission) ? permission : [permission];
  const roles = getSessionRoles();
  const allowed = perms.some((p) => hasPermission(roles, p));
  if (!allowed) return <Navigate to="/main" replace />;

  return children;
}
