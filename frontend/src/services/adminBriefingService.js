import api from "../api/api";

export async function previewAdminBriefing() {
  const { data } = await api.get("/admin-briefing/preview");
  return data;
}

export async function downloadAdminBriefingHtml() {
  const { data } = await api.get("/admin-briefing/export", { responseType: "blob" });
  return data;
}

export async function markBriefingDelivered(briefingId) {
  const { data } = await api.post("/admin-briefing/delivered", { briefing_id: briefingId });
  return data;
}

export async function fetchBriefingHistory() {
  const { data } = await api.get("/admin-briefing/history");
  return data;
}
