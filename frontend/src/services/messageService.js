import api from "../api/api";

const BASE = "/messages";

const messageService = {
  inbox: async (params) => {
    const res = await api.get(`${BASE}/inbox`, { params });
    return res.data;
  },
  unreadCount: async () => {
    const res = await api.get(`${BASE}/inbox/unread-count`);
    return res.data?.count ?? 0;
  },
  banners: async () => {
    const res = await api.get(`${BASE}/banners/active`);
    return res.data;
  },
  sent: async (params) => {
    const res = await api.get(`${BASE}/sent`, { params });
    return res.data;
  },
  sentDetail: async (id) => {
    const res = await api.get(`${BASE}/sent/${id}`);
    return res.data;
  },
  readStatus: async (id) => {
    const res = await api.get(`${BASE}/${id}/read-status`);
    return res.data;
  },
  searchUsers: async (q) => {
    const res = await api.get(`${BASE}/users/search`, { params: { q } });
    return res.data;
  },
  sendDirect: async (body) => {
    const res = await api.post(`${BASE}/direct`, body);
    return res.data;
  },
  sendAnnouncement: async (body) => {
    const res = await api.post(`${BASE}/announcements`, body);
    return res.data;
  },
  sendEntity: async (body) => {
    const res = await api.post(`${BASE}/entity`, body);
    return res.data;
  },
  previewAudience: async (targets) => {
    const res = await api.post(`${BASE}/preview-audience`, { targets });
    return res.data;
  },
  markRead: async (id) => {
    const res = await api.patch(`${BASE}/${id}/read`);
    return res.data;
  },
  dismissBanner: async (id) => {
    const res = await api.patch(`${BASE}/${id}/dismiss-banner`);
    return res.data;
  },
  deleteInbox: async (id) => {
    const res = await api.delete(`${BASE}/${id}/inbox`);
    return res.data;
  },
  deleteSent: async (id) => {
    const res = await api.delete(`${BASE}/${id}/sent`);
    return res.data;
  },
  permanentDelete: async (id) => {
    const res = await api.delete(`${BASE}/${id}`);
    return res.data;
  },
  adminAll: async (params) => {
    const res = await api.get(`${BASE}/admin/all`, { params });
    return res.data;
  },
  adminBroadcasts: async (params) => {
    const res = await api.get(`${BASE}/admin/broadcasts`, { params });
    return res.data;
  },
  adminConversations: async (params) => {
    const res = await api.get(`${BASE}/admin/conversations`, { params });
    return res.data;
  },
  adminConversationThread: async (userA, userB) => {
    const res = await api.get(`${BASE}/admin/conversations/${userA}/${userB}`);
    return res.data;
  },
  adminMessageDetail: async (id) => {
    const res = await api.get(`${BASE}/admin/messages/${id}`);
    return res.data;
  },
  bulkDelete: async (ids, scope) => {
    const res = await api.post(`${BASE}/bulk-delete`, { ids, scope });
    return res.data;
  },
  bulkMarkRead: async (ids) => {
    const res = await api.post(`${BASE}/bulk-read`, { ids });
    return res.data;
  },
  updateMessage: async (id, body) => {
    const res = await api.patch(`${BASE}/${id}`, body);
    return res.data;
  },
  entityMessages: async (type, id) => {
    const res = await api.get(`${BASE}/entity/${type}/${encodeURIComponent(id)}`);
    return res.data;
  },
  searchUnits: async (q) => {
    const res = await api.get(`${BASE}/units/search`, { params: { q } });
    return res.data;
  },
  alertDestinations: async () => {
    const res = await api.get("/messenger/destinations", {
      params: { usage_key: "news.alert.broadcast" },
    });
    return res.data;
  },
};

export default messageService;
