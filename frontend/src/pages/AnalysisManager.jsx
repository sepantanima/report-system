import { Navigate } from "react-router-dom";
import { getUserRoles } from "../utils/analysisAuth.js";

/** هدایت مسیر قدیمی به صفحه مناسب نقش کاربر */
export default function AnalysisManagerRedirect() {
  const roles = getUserRoles();
  if (roles.includes("admin") || roles.includes("analysis_manager") || roles.includes("Field_admin")) {
    return <Navigate to="/analysis/management" replace />;
  }
  if (roles.includes("analyst")) {
    return <Navigate to="/analysis/my-missions" replace />;
  }
  if (roles.includes("mentor")) {
    return <Navigate to="/analysis/review" replace />;
  }
  if (roles.includes("topic_proposer")) {
    return <Navigate to="/analysis/propose-topic" replace />;
  }
  return <Navigate to="/main" replace />;
}
