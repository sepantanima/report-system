import api from "../api/api";

const aiRunLogAdminService = {
  listLogs: (params) => api.get("/admin/ai-run-logs", { params }).then((r) => r.data),
  getLog: (id) => api.get(`/admin/ai-run-logs/${id}`).then((r) => r.data),
};

export default aiRunLogAdminService;
