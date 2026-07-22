const FILTER_KEY = "analysis-mgmt-filters";
const TOPIC_FILTER_KEY = "analysis-topic-mgmt-filters";

export function getTopicsManagementUrl(tab = "queue", topicId = null) {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  const qs = params.toString();
  const base = topicId ? `/analysis/topics/${topicId}` : "/analysis/topics";
  return qs ? `${base}?${qs}` : base;
}

export function getTopicApprovalDetailUrl(topicId) {
  return `/analysis/topics/${topicId}?tab=queue`;
}

export function getManagementBackUrl(tab = "missions") {
  const resolved = tab === "assign" ? "missions" : tab;
  if (resolved === "briefs") return "/analysis/missions?tab=briefs";
  return "/analysis/missions";
}

export function getManagementMissionsUrl(topicId) {
  const base = getManagementBackUrl("missions");
  if (!topicId) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}topicId=${encodeURIComponent(topicId)}`;
}

export function getManagementAssignTopicUrl(topicId) {
  return `/analysis/missions/topic/${topicId}?fromTab=missions`;
}

export function getApprovalBackUrl(tab = "queue") {
  return getTopicsManagementUrl(tab);
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

export function loadTopicManagementFilters() {
  try {
    const raw = sessionStorage.getItem(TOPIC_FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTopicManagementFilters(data) {
  try {
    sessionStorage.setItem(TOPIC_FILTER_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
