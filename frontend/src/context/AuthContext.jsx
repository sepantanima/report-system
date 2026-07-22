import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import {
  decodeToken,
  getSessionRoles,
  normalizeRoles,
  persistSessionRoles,
} from "../utils/userRoles.js";

const AuthContext = createContext(null);

function readStoredPermissions() {
  try {
    const raw = localStorage.getItem("permissions");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistPermissions(perms, version) {
  if (Array.isArray(perms)) {
    localStorage.setItem("permissions", JSON.stringify(perms));
  }
  if (version != null) {
    localStorage.setItem("permission_version", String(version));
  }
}

export function AuthProvider({ children }) {
  const [permissions, setPermissions] = useState(() => readStoredPermissions() || []);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [permissionVersion, setPermissionVersion] = useState(
    () => Number(localStorage.getItem("permission_version") || 0),
  );
  const [instanceMode, setInstanceMode] = useState(localStorage.getItem("instance_mode") || "online");
  const [orgCode, setOrgCode] = useState(localStorage.getItem("org_code") || "Nezaja");
  const [orgRole, setOrgRole] = useState(localStorage.getItem("org_role") || "standalone");
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = useMemo(() => getSessionRoles(), [permissions, permissionVersion]);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    setLoading(true);
    try {
      const { data } = await api.get("/auth/me");
      if (data.permissions) {
        setPermissions(data.permissions);
        persistPermissions(data.permissions, data.permission_version);
      }
      if (data.role_templates) setRoleTemplates(data.role_templates);
      if (data.permission_version != null) setPermissionVersion(data.permission_version);
      if (data.instance_mode) {
        setInstanceMode(data.instance_mode);
        localStorage.setItem("instance_mode", data.instance_mode);
      }
      if (data.org_code) {
        setOrgCode(data.org_code);
        localStorage.setItem("org_code", data.org_code);
      }
      if (data.org_role) {
        setOrgRole(data.org_role);
        localStorage.setItem("org_role", data.org_role);
      }
      if (data.capabilities) setCapabilities(data.capabilities);
      if (data.role) persistSessionRoles(normalizeRoles(data.role));
      return data;
    } catch {
      const decoded = decodeToken(token);
      setPermissions([]);
      return decoded ? null : null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const hasPermission = useCallback(
    (perm) => {
      if (!perm) return true;
      const list = Array.isArray(perm) ? perm : [perm];
      const set = new Set(permissions);
      if (set.has("rbac.manage")) return true;
      return list.some((p) => set.has(p));
    },
    [permissions],
  );

  const applyLoginPayload = useCallback((data) => {
    if (data.permissions) {
      setPermissions(data.permissions);
      persistPermissions(data.permissions, data.permission_version);
    }
    if (data.permission_version != null) setPermissionVersion(data.permission_version);
    if (data.instance_mode) {
      setInstanceMode(data.instance_mode);
      localStorage.setItem("instance_mode", data.instance_mode);
    }
    if (data.org_code) {
      setOrgCode(data.org_code);
      localStorage.setItem("org_code", data.org_code);
    }
    if (data.org_role) {
      setOrgRole(data.org_role);
      localStorage.setItem("org_role", data.org_role);
    }
  }, []);

  const value = useMemo(
    () => ({
      permissions,
      roles,
      roleTemplates,
      permissionVersion,
      instanceMode,
      orgCode,
      orgRole,
      capabilities,
      loading,
      hasPermission,
      refreshMe,
      applyLoginPayload,
      isOnlineHub: instanceMode === "online",
      isOfflineHub: instanceMode === "offline",
    }),
    [
      permissions,
      roles,
      roleTemplates,
      permissionVersion,
      instanceMode,
      orgCode,
      orgRole,
      capabilities,
      loading,
      hasPermission,
      refreshMe,
      applyLoginPayload,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export default AuthContext;
