import api from "../api/api";

const BASE = "/command";

const commandCenterService = {
  liveNews: async (params) => {
    const res = await api.get(`${BASE}/live-news`, { params });
    return res.data;
  },

  annotationTypes: async () => {
    const res = await api.get(`${BASE}/live-news/annotation-types`);
    return res.data;
  },

  listAnnotations: async (newsId, kind = "news") => {
    const k = kind === "field" ? "field" : "news";
    const res = await api.get(`${BASE}/live-news/${k}/${newsId}/annotations`);
    return res.data;
  },

  createAnnotation: async (newsId, body, kind = "news") => {
    const k = kind === "field" ? "field" : "news";
    const res = await api.post(`${BASE}/live-news/${k}/${newsId}/annotations`, body);
    return res.data;
  },

  kpiOverview: async () => {
    const res = await api.get(`${BASE}/kpi/overview`);
    return res.data;
  },

  kpiWidget: async (widgetId) => {
    const res = await api.get(`${BASE}/kpi/${widgetId}`);
    return res.data;
  },

  dashboardOverview: async (params, config = {}) => {
    const res = await api.get(`${BASE}/dashboard/overview`, { params, ...config });
    return res.data;
  },

  dashboardTrends: async (params) => {
    const res = await api.get(`${BASE}/dashboard/trends`, { params });
    return res.data;
  },

  dashboardDrillUnit: async (unitId, params) => {
    const res = await api.get(`${BASE}/dashboard/drill/unit/${encodeURIComponent(unitId)}`, { params });
    return res.data;
  },

  dashboardDrillUser: async (userId, params) => {
    const res = await api.get(`${BASE}/dashboard/drill/user/${encodeURIComponent(userId)}`, { params });
    return res.data;
  },

  dashboardLayout: async () => {
    const res = await api.get(`${BASE}/dashboard/layout`);
    return res.data;
  },

  saveDashboardLayout: async (layout) => {
    const res = await api.put(`${BASE}/dashboard/layout`, { layout });
    return res.data;
  },

  logDashboardView: async (filters) => {
    const res = await api.post(`${BASE}/dashboard/view-log`, { filters });
    return res.data;
  },

  dashboardViewHistory: async (params) => {
    const res = await api.get(`${BASE}/dashboard/view-history`, { params });
    return res.data;
  },

  listAlertAcks: async () => {
    const res = await api.get(`${BASE}/dashboard/alert-acks`);
    return res.data;
  },

  ackAlert: async (alert_id) => {
    const res = await api.post(`${BASE}/dashboard/alert-acks`, { alert_id });
    return res.data;
  },

  exportDashboardPdf: async (params) => {
    const res = await api.get(`${BASE}/dashboard/export/pdf`, {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  listLibrary: async (params) => {
    const res = await api.get(`${BASE}/outputs/library`, { params });
    return res.data;
  },

  getLibraryItem: async (kind, id) => {
    const res = await api.get(`${BASE}/outputs/library/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`);
    return res.data;
  },

  outputMeta: async () => {
    const res = await api.get(`${BASE}/outputs/meta`);
    return res.data;
  },

  listOutputs: async (params) => {
    const res = await api.get(`${BASE}/outputs`, { params });
    return res.data;
  },

  getOutput: async (id) => {
    const res = await api.get(`${BASE}/outputs/${id}`);
    return res.data;
  },

  createOutput: async (body) => {
    const res = await api.post(`${BASE}/outputs`, body);
    return res.data;
  },

  updateOutput: async (id, body) => {
    const res = await api.patch(`${BASE}/outputs/${id}`, body);
    return res.data;
  },

  approveOutput: async (id) => {
    const res = await api.post(`${BASE}/outputs/${id}/approve`);
    return res.data;
  },

  publishOutput: async (id, channel_config_ids = []) => {
    const res = await api.post(`${BASE}/outputs/${id}/publish`, { channel_config_ids });
    return res.data;
  },

  generateSoftWarAnnex: async (body) => {
    const res = await api.post(`${BASE}/outputs/generate/soft-war-annex`, body, { timeout: 180000 });
    return res.data;
  },

  previewOutputSources: async (body) => {
    const res = await api.post(`${BASE}/outputs/preview-sources`, body);
    return res.data;
  },

  generateOutput: async (body) => {
    const res = await api.post(`${BASE}/outputs/generate`, body, { timeout: 180000 });
    return res.data;
  },

  listPrompts: async () => {
    const res = await api.get(`${BASE}/prompts`);
    return res.data;
  },

  getPrompt: async (promptKey) => {
    const res = await api.get(`${BASE}/prompts/${encodeURIComponent(promptKey)}`);
    return res.data;
  },

  createPrompt: async (body) => {
    const res = await api.post(`${BASE}/prompts`, body);
    return res.data;
  },

  savePrompt: async (promptKey, body) => {
    const res = await api.put(`${BASE}/prompts/${encodeURIComponent(promptKey)}`, body);
    return res.data;
  },

  deletePrompt: async (promptKey) => {
    const res = await api.delete(`${BASE}/prompts/${encodeURIComponent(promptKey)}`);
    return res.data;
  },
};

export default commandCenterService;
