import api from "../api/api";

const newsReportAdminService = {
  getSettings: () => api.get("/admin/news-report/settings").then((r) => r.data),
  getDefaults: () => api.get("/admin/news-report/defaults").then((r) => r.data),
  updateSettings: (body) => api.put("/admin/news-report/settings", body).then((r) => r.data),
  listTemplates: (type) => api.get("/admin/news-report/templates", { params: type ? { type } : {} }).then((r) => r.data),
  createTemplate: (body) => api.post("/admin/news-report/templates", body).then((r) => r.data),
  updateTemplate: (id, body) => api.put(`/admin/news-report/templates/${id}`, body).then((r) => r.data),
  deleteTemplate: (id) => api.delete(`/admin/news-report/templates/${id}`).then((r) => r.data),
};

export default newsReportAdminService;
