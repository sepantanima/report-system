import { useSearchParams } from "react-router-dom";
import { getManagementBackUrl, getApprovalBackUrl } from "../utils/analysisManagementNav.js";

export function useManagementBackUrl(defaultTab = "missions") {
  const [params] = useSearchParams();
  const fromTab = params.get("fromTab");
  const tab = fromTab === "assign" ? "missions" : (fromTab || defaultTab);
  return getManagementBackUrl(tab);
}

export function useApprovalBackUrl() {
  return getApprovalBackUrl();
}
