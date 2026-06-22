import api from "../api/api";

const BASE = "/news/analytics";

function buildParams(filters) {
  const p = { ...filters };
  if (Array.isArray(p.categories)) p.categories = p.categories.join(",");
  if (Array.isArray(p.sources)) p.sources = p.sources.join(",");
  return p;
}

const newsAnalyticsService = {
  filtersMeta: async () => {
    const res = await api.get(`${BASE}/filters/meta`);
    return res.data;
  },

  overview: async (filters) => {
    const res = await api.get(`${BASE}/overview`, { params: buildParams(filters) });
    return res.data;
  },

  distribution: async (filters, dimension = "category") => {
    const res = await api.get(`${BASE}/distribution`, { params: { ...buildParams(filters), dimension } });
    return res.data;
  },

  timeline: async (filters, granularity = "day") => {
    const res = await api.get(`${BASE}/timeline`, { params: { ...buildParams(filters), granularity } });
    return res.data;
  },

  unitsParticipation: async (filters) => {
    const res = await api.get(`${BASE}/units/participation`, { params: buildParams(filters) });
    return res.data;
  },

  rankingsMonitors: async (filters) => {
    const res = await api.get(`${BASE}/rankings/monitors`, { params: buildParams(filters) });
    return res.data;
  },

  rankingsEditors: async (filters) => {
    const res = await api.get(`${BASE}/rankings/editors`, { params: buildParams(filters) });
    return res.data;
  },

  rankingsChiefs: async (filters) => {
    const res = await api.get(`${BASE}/rankings/chiefs`, { params: buildParams(filters) });
    return res.data;
  },

  rankingsUnits: async (filters) => {
    const res = await api.get(`${BASE}/rankings/units`, { params: buildParams(filters) });
    return res.data;
  },

  widget: async (widgetId, filters) => {
    const res = await api.get(`${BASE}/widget/${widgetId}`, { params: buildParams(filters) });
    return res.data;
  },

  downloadExport: async (widgetId, format, filters) => {
    const res = await api.get(`${BASE}/export/${widgetId}`, {
      params: { ...buildParams(filters), format },
      responseType: "blob",
    });
    return res.data;
  },
};

export default newsAnalyticsService;
