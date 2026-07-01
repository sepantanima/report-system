import api from "../api/api";

const newsEntryAdminService = {
  getSettings: async () => {
    const res = await api.get("/admin/news-entry/settings");
    return res.data;
  },

  updateSettings: async (body) => {
    const res = await api.put("/admin/news-entry/settings", body);
    return res.data;
  },
};

export default newsEntryAdminService;
