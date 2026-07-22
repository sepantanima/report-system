import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasPermission as legacyHasPermission, getSessionRoles } from "../../utils/userRoles.js";

export default function ProtectedRoute({ permission, anyOf, children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" />;

  const perms = anyOf || (permission ? [permission] : null);
  if (!perms) return children;

  try {
    const { hasPermission } = useAuth();
    if (hasPermission(perms)) return children;
  } catch {
    const roles = getSessionRoles();
    if (perms.some((p) => legacyHasPermission(roles, p))) return children;
  }

  return <Navigate to="/main" replace />;
}
