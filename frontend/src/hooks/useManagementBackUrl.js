import { useSearchParams } from "react-router-dom";
import { getManagementBackUrl } from "../utils/analysisManagementNav.js";

export function useManagementBackUrl(defaultTab = "approve") {
  const [params] = useSearchParams();
  const fromTab = params.get("fromTab");
  return getManagementBackUrl(fromTab || defaultTab);
}
