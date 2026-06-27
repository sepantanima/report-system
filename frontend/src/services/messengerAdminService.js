import api from "../api/api";

const messengerAdminService = {
  listChannels: (params) => api.get("/admin/messenger-channel-configs", { params }).then((r) => r.data),
  createChannel: (body) => api.post("/admin/messenger-channel-configs", body).then((r) => r.data),
  updateChannel: (id, body) => api.put(`/admin/messenger-channel-configs/${id}`, body).then((r) => r.data),
  deleteChannel: (id) => api.delete(`/admin/messenger-channel-configs/${id}`).then((r) => r.data),
  testChannel: (id) => api.post(`/admin/messenger-channel-configs/${id}/test`).then((r) => r.data),
  listProviderTemplates: () =>
    api.get("/admin/messenger-provider-templates", { params: { include_disabled: "1" } }).then((r) => r.data),
  listDestinations: (usageKey) =>
    api.get("/messenger/destinations", { params: { usage_key: usageKey } }).then((r) => r.data),
};

export default messengerAdminService;
