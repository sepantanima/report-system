import api from "../api/api";

const BASE = "/news";

const newsMonitorService = {
  list: async (params) => {
    const res = await api.get(`${BASE}/monitor`, { params });
    if (Array.isArray(res.data)) return { items: res.data, total: res.data.length };
    return {
      items: Array.isArray(res.data?.items) ? res.data.items : [],
      total: Number.isFinite(res.data?.total) ? res.data.total : (res.data?.items?.length ?? 0),
    };
  },

  myDrafts: async () => {
    const res = await api.get(`${BASE}/monitor/my-drafts`);
    return res.data;
  },

  mySubmissions: async (params) => {
    const res = await api.get(`${BASE}/monitor/my-submissions`, { params });
    return res.data;
  },

  entrySettings: async () => {
    const res = await api.get(`${BASE}/monitor/entry-settings`);
    return res.data;
  },

  deleteDraft: async (id) => {
    const res = await api.post(`${BASE}/monitor/my-drafts/${id}/delete`);
    return res.data;
  },

  exportText: async (id, format = "telegram") => {
    const res = await api.get(`${BASE}/monitor/export-text/${id}`, { params: { format } });
    return res.data;
  },

  bulkExportText: async (params) => {
    const res = await api.get(`${BASE}/monitor/bulk-export`, { params });
    return res.data;
  },

  listAiActions: async (formName = "news_monitor_manage") => {
    const res = await api.get(`${BASE}/monitor/ai/form-actions`, { params: { form_name: formName } });
    return Array.isArray(res.data) ? res.data : [];
  },

  runAiAction: async ({ form_name, action_name, form_data }) => {
    const res = await api.post(`${BASE}/monitor/ai/run`, { form_name, action_name, form_data }, { timeout: 180000 });
    return res.data;
  },

  deleteNews: async (id) => {
    const res = await api.delete(`${BASE}/monitor/${id}`);
    return res.data;
  },

  summaryStats: async (params) => {
    const res = await api.get(`${BASE}/summary-stats`, { params });
    return res.data;
  },

  categories: async () => {
    const res = await api.get(`${BASE}/categories`);
    return res.data;
  },

  sources: async () => {
    const res = await api.get(`${BASE}/sources`);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.patch(`${BASE}/${id}`, payload);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post(`${BASE}/monitor/create`, payload);
    return res.data;
  },

  dailyQuota: async (date) => {
    const res = await api.get(`${BASE}/monitor/daily-quota`, { params: date ? { date } : {} });
    return res.data;
  },

  submit: async (id, body = {}) => {
    const res = await api.post(`${BASE}/monitor/${id}/submit`, body);
    return res.data;
  },

  finalize: async (id) => {
    const res = await api.post(`${BASE}/monitor/${id}/finalize`);
    return res.data;
  },

  finalizePublish: async (id) => {
    const res = await api.post(`${BASE}/monitor/${id}/finalize-publish`);
    return res.data;
  },

  finalizeBank: async (id) => {
    const res = await api.post(`${BASE}/monitor/${id}/finalize-bank`);
    return res.data;
  },

  chiefReject: async (id, note) => {
    const res = await api.post(`${BASE}/monitor/${id}/chief-reject`, { note });
    return res.data;
  },

  flagDuplicate: async (id) => {
    const res = await api.post(`${BASE}/monitor/${id}/flag-duplicate`);
    return res.data;
  },

  unflagDuplicate: async (id) => {
    const res = await api.post(`${BASE}/monitor/${id}/unflag-duplicate`);
    return res.data;
  },

  listDuplicates: async (params) => {
    const res = await api.get(`${BASE}/monitor/duplicates`, { params });
    return res.data;
  },

  duplicatesStats: async () => {
    const res = await api.get(`${BASE}/monitor/duplicates/stats`);
    return res.data;
  },

  searchParent: async (q) => {
    const res = await api.get(`${BASE}/monitor/parent-search`, { params: { q } });
    return res.data;
  },

  findSimilarDuplicates: async (id, body = {}) => {
    const res = await api.post(`${BASE}/monitor/duplicates/${id}/similar`, body);
    return res.data;
  },

  clusterLinkDuplicates: async (newsIds) => {
    const res = await api.post(`${BASE}/monitor/duplicates/cluster-link`, { news_ids: newsIds });
    return res.data;
  },

  linkDuplicate: async (id, parentId) => {
    const res = await api.patch(`${BASE}/monitor/duplicates/${id}/link`, { parent_id: parentId });
    return res.data;
  },

  clearDuplicate: async (id) => {
    const res = await api.post(`${BASE}/monitor/duplicates/${id}/clear`);
    return res.data;
  },

  getAudit: async (id) => {
    const res = await api.get(`${BASE}/monitor/${id}/audit`);
    return res.data;
  },

  editorialEligibility: async (params) => {
    const res = await api.get(`${BASE}/monitor/editorial/eligibility`, { params });
    return res.data;
  },

  startEditorialRun: async (body) => {
    const res = await api.post(`${BASE}/monitor/editorial/run`, body, { timeout: 60000 });
    return res.data;
  },

  getEditorialRun: async (id) => {
    const res = await api.get(`${BASE}/monitor/editorial/runs/${id}`);
    return res.data;
  },

  restoreRelevance: async (newsIds) => {
    const res = await api.post(`${BASE}/monitor/editorial/restore-relevance`, { news_ids: newsIds });
    return res.data;
  },
};

export default newsMonitorService;
