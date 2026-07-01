import api from "../api/api";

const messageAdminService = {
  getSettings: async () => {
    const res = await api.get("/admin/message-settings/settings");
    return res.data;
  },
  updateSettings: async (body) => {
    const res = await api.put("/admin/message-settings/settings", body);
    return res.data;
  },
};

export default messageAdminService;
