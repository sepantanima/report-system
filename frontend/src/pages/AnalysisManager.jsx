import { Navigate } from "react-router-dom";
import { getUserRoles } from "../utils/analysisAuth.js";
import { ANALYSIS_TERMS } from "../constants/analysisTerminology.js";

/** هدایت مسیر قدیمی به صفحه مناسب نقش کاربر */
export default function AnalysisManagerRedirect() {
  const roles = getUserRoles();

  if (roles.includes("admin") || roles.includes("analysis_manager")) {
    return <Navigate to={ANALYSIS_TERMS.missionsManagementPath} replace />;
  }

  if (roles.includes("topic_approver") || roles.includes("Field_admin")) {
    return <Navigate to={ANALYSIS_TERMS.ratifyAxesPath} replace />;
  }

  if (roles.includes("analyst")) {
    return <Navigate to="/analysis/my-missions" replace />;
  }

  if (roles.includes("mentor")) {
    return <Navigate to="/analysis/review" replace />;
  }

  if (roles.includes("topic_proposer")) {
    return <Navigate to="/analysis/topics?tab=mine" replace />;
  }

  return <Navigate to="/main" replace />;
}
