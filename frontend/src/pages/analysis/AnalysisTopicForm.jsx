import { Navigate } from "react-router-dom";

/** @deprecated Use /analysis/topics?tab=mine */
export default function AnalysisTopicForm() {
  return <Navigate to="/analysis/topics?tab=mine" replace />;
}
