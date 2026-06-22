const FILTER_KEY = "analysis-mgmt-filters";

export function getManagementBackUrl(tab = "approve") {
  return `/analysis/management?tab=${encodeURIComponent(tab)}`;
}

export function loadManagementFilters() {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveManagementFilters(data) {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearManagementFilters() {
  try {
    sessionStorage.removeItem(FILTER_KEY);
  } catch {
    /* ignore */
  }
}
