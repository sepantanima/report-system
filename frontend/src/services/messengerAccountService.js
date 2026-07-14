import api from "../api/api.js";

const PLATFORMS = [
  { value: "bale", label: "بله" },
  { value: "telegram", label: "تلگرام" },
  { value: "eitaa", label: "ایتا" },
];

export function getPlatformLabel(platform) {
  return PLATFORMS.find((p) => p.value === platform)?.label || platform || "—";
}

export { PLATFORMS };

export async function fetchMyMessengerAccounts() {
  const { data } = await api.get("/users/me/messenger-accounts");
  return data;
}

export async function createMyMessengerAccount(payload) {
  const { data } = await api.post("/users/me/messenger-accounts", payload);
  return data;
}

export async function updateMyMessengerAccount(id, payload) {
  const { data } = await api.put(`/users/me/messenger-accounts/${id}`, payload);
  return data;
}

export async function deleteMyMessengerAccount(id) {
  const { data } = await api.delete(`/users/me/messenger-accounts/${id}`);
  return data;
}

export async function fetchUserMessengerAccounts(userId) {
  const { data } = await api.get(`/admin/users/${userId}/messenger-accounts`);
  return data;
}

export async function createUserMessengerAccount(userId, payload) {
  const { data } = await api.post(`/admin/users/${userId}/messenger-accounts`, payload);
  return data;
}

export async function updateMessengerAccountAdmin(id, payload) {
  const { data } = await api.put(`/admin/messenger-accounts/${id}`, payload);
  return data;
}

export async function deleteMessengerAccountAdmin(id) {
  const { data } = await api.delete(`/admin/messenger-accounts/${id}`);
  return data;
}

export async function fetchUnmappedSenders(limit = 200) {
  const { data } = await api.get("/admin/messenger-accounts/unmapped-senders", { params: { limit } });
  return data;
}

export async function linkSenderToUser(payload) {
  const { data } = await api.post("/admin/messenger-accounts/link", payload);
  return data;
}

export async function markSenderAsNewsSource(payload) {
  const { data } = await api.post("/admin/messenger-accounts/mark-as-source", payload);
  return data;
}

export async function fetchMessengerLinkUserOptions() {
  const { data } = await api.get("/admin/messenger-accounts/users-options");
  return data;
}
