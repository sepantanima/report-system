import api from "../api/api";

export async function fetchPermissions() {
  const { data } = await api.get("/admin/rbac/permissions");
  return data;
}

export async function fetchRoleTemplates() {
  const { data } = await api.get("/admin/rbac/role-templates");
  return data;
}

export async function updateRolePermissions(roleId, permissions) {
  const { data } = await api.put(`/admin/rbac/role-templates/${roleId}/permissions`, { permissions });
  return data;
}

export async function resetRolePermissions(roleId) {
  const { data } = await api.post(`/admin/rbac/role-templates/${roleId}/reset-defaults`);
  return data;
}

export async function saveRoleDefaultPermissions(roleId, permissions) {
  const { data } = await api.put(`/admin/rbac/role-templates/${roleId}/default-permissions`, { permissions });
  return data;
}

export async function resetRoleSeedDefaults(roleId) {
  const { data } = await api.post(`/admin/rbac/role-templates/${roleId}/reset-seed-defaults`);
  return data;
}

export async function fetchRbacSettings() {
  const { data } = await api.get("/admin/rbac/settings");
  return data;
}

export async function updateRbacSettings(payload) {
  const { data } = await api.put("/admin/rbac/settings", payload);
  return data;
}

export async function fetchUserRbac(userId) {
  const { data } = await api.get(`/admin/rbac/users/${userId}/assignments`);
  return data;
}

export async function updateUserAssignments(userId, roleCodes) {
  const { data } = await api.put(`/admin/rbac/users/${userId}/assignments`, { role_codes: roleCodes });
  return data;
}

export async function updateUserGrants(userId, grants) {
  const { data } = await api.put(`/admin/rbac/users/${userId}/grants`, { grants });
  return data;
}
