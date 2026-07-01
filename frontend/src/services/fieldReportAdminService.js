import api from "../api/api";

const fieldReportAdminService = {
  getSettings: async () => {
    const res = await api.get("/admin/field-report/settings");
    return res.data;
  },

  updateSettings: async (body) => {
    const res = await api.put("/admin/field-report/settings", body);
    return res.data;
  },
};

export default fieldReportAdminService;
