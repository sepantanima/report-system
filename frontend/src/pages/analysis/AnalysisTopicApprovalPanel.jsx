import { Navigate } from "react-router-dom";

/** @deprecated Use /analysis/topics?tab=queue */
export default function AnalysisTopicApprovalPanel() {
  return <Navigate to="/analysis/topics?tab=queue" replace />;
}
