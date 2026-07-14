import { Navigate, useSearchParams } from "react-router-dom";

/** @deprecated Use /analysis/missions */
export default function AnalysisManagerPanel() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const topicId = searchParams.get("topicId");
  const params = new URLSearchParams();
  if (tab && tab !== "approve" && tab !== "assign") params.set("tab", tab);
  if (topicId) params.set("topicId", topicId);
  const qs = params.toString();
  return <Navigate to={`/analysis/missions${qs ? `?${qs}` : ""}`} replace />;
}
