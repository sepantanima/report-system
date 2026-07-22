import api from "../api/api";

const newsReportService = {
  previewCount: (body) => api.post("/news/reports/preview-count", body).then((r) => r.data),
  previewPackCounts: (body) => api.post("/news/reports/preview-pack-counts", body).then((r) => r.data),
  previewRows: (body) => api.post("/news/reports/preview-rows", body).then((r) => r.data),
  previewContent: (body) => api.post("/news/reports/preview-content", body).then((r) => r.data),
  generate: (body) => api.post("/news/reports/generate", body).then((r) => r.data),
  getWorkflowConfig: () => api.get("/news/reports/workflow-config").then((r) => r.data),
  generatePack: (body) => api.post("/news/reports/generate-pack", body).then((r) => r.data),
  sendSingle: (body) => api.post("/news/reports/send-single", body).then((r) => r.data),
  sendBatch: (body) => api.post("/news/reports/send-batch", body).then((r) => r.data),
  publishReport: (id, body) => api.post(`/news/reports/${id}/publish`, body).then((r) => r.data),
  listHistory: (params) => api.get("/news/reports", { params }).then((r) => r.data),
  deleteReport: (id) => api.delete(`/news/reports/${id}`).then((r) => r.data),
  clearHistory: () => api.delete("/news/reports/history/clear").then((r) => r.data),
  download: async (id, fileName) => {
    const res = await api.get(`/news/reports/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "report.txt";
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

export default newsReportService;
