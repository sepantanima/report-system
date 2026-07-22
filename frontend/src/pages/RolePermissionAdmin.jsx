import React, { useEffect, useMemo, useRef, useState } from "react";
import { Save, Search, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import { PAGE_RBAC_CSS } from "../constants/pageLayoutWidths.js";
import {
  groupPermissionsByCategory,
  countFilteredPermissions,
} from "../constants/permissionCategories.js";
import { getPermissionDescription } from "../constants/permissionDescriptions.js";
import FormStatusBanner from "../components/common/FormStatusBanner.jsx";
import { RBAC_ADMIN_HELP } from "../content/rbacFormHelp.jsx";
import {
  fetchRoleTemplates,
  fetchPermissions,
  updateRolePermissions,
  resetRolePermissions,
  saveRoleDefaultPermissions,
  resetRoleSeedDefaults,
  fetchRbacSettings,
  updateRbacSettings,
} from "../services/rbacAdminService.js";
import RoleAssignMultiSelect from "../components/settings/RoleAssignMultiSelect.jsx";

function enrichPermissions(list) {
  return (list || []).map((p) => ({
    ...p,
    description_fa: getPermissionDescription(p.code, p.description_fa),
  }));
}

function useRbacMobileLayout() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export default function RolePermissionAdmin() {
  const { isDarkMode } = useAppTheme();
  const isMobile = useRbacMobileLayout();
  const theme = useMemo(() => getFormPageTheme(isDarkMode), [isDarkMode]);
  const permsPanelRef = useRef(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [permSearch, setPermSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState({});
  const [mobileRolesOpen, setMobileRolesOpen] = useState(true);
  const [newUserDefaultRoles, setNewUserDefaultRoles] = useState(["user"]);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rolesData, permsData, settings] = await Promise.all([
          fetchRoleTemplates(),
          fetchPermissions(),
          fetchRbacSettings().catch(() => ({ default_new_user_role_codes: ["user"] })),
        ]);
        setRoles(rolesData);
        setPermissions(enrichPermissions(permsData));
        setNewUserDefaultRoles(settings.default_new_user_role_codes || ["user"]);
      } catch (e) {
        setMessage(e.response?.data?.error || e.message);
      }
    })();
  }, []);

  const groupedPermissions = useMemo(
    () => groupPermissionsByCategory(permissions, permSearch),
    [permissions, permSearch],
  );

  const filteredCount = useMemo(
    () => countFilteredPermissions(permissions, permSearch),
    [permissions, permSearch],
  );

  const scrollToPermissions = () => {
    requestAnimationFrame(() => {
      permsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const selectRole = (role) => {
    setSelectedRole(role);
    const perms = Array.isArray(role.permissions)
      ? role.permissions
      : JSON.parse(role.permissions || "[]");
    setSelectedPerms(perms);
    setMessage("");
    setPermSearch("");
    setCollapsedCats({});
    if (window.innerWidth <= 900) {
      setMobileRolesOpen(false);
      scrollToPermissions();
    }
  };

  const togglePerm = (code) => {
    setSelectedPerms((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const toggleCategory = (catId) => {
    setCollapsedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const save = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setMessage("");
    try {
      await updateRolePermissions(selectedRole.id, selectedPerms);
      setMessage("ذخیره شد");
      setRoles(await fetchRoleTemplates());
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!selectedRole) return;
    const storedCount = selectedRole.default_permissions?.length || 0;
    const confirmMsg = storedCount
      ? `مجوزهای فعال نقش «${selectedRole.label_fa}» به پیش‌فرض ذخیره‌شده (${storedCount} مجوز) بازگردانده شود؟`
      : `پیش‌فرض ذخیره‌شده‌ای برای «${selectedRole.label_fa}» نیست — از seed سیستم استفاده می‌شود. ادامه؟`;
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await resetRolePermissions(selectedRole.id);
      const codes = result.permissions || [];
      setSelectedPerms(codes);
      setMessage(result.source === "admin_default" ? "به پیش‌فرض ذخیره‌شده بازگشت" : "به پیش‌فرض seed بازگشت");
      const refreshed = await fetchRoleTemplates();
      setRoles(refreshed);
      const updated = refreshed.find((r) => r.id === selectedRole.id);
      if (updated) setSelectedRole(updated);
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDefault = async () => {
    if (!selectedRole) return;
    if (!window.confirm(`مجوزهای انتخاب‌شده فعلی (${selectedPerms.length}) به‌عنوان پیش‌فرض نقش «${selectedRole.label_fa}» ذخیره شود؟`)) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await saveRoleDefaultPermissions(selectedRole.id, selectedPerms);
      setMessage("پیش‌فرض این نقش ذخیره شد");
      const refreshed = await fetchRoleTemplates();
      setRoles(refreshed);
      const updated = refreshed.find((r) => r.id === selectedRole.id);
      if (updated) setSelectedRole(updated);
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSeedDefaults = async () => {
    if (!selectedRole) return;
    if (!window.confirm(`پیش‌فرض seed سیستم برای «${selectedRole.label_fa}» جایگزین پیش‌فرض ذخیره‌شده شود و مجوزهای فعال هم اعمال گردد؟`)) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await resetRoleSeedDefaults(selectedRole.id);
      setSelectedPerms(result.permissions || []);
      setMessage("پیش‌فرض seed بازنشانی و ذخیره شد");
      const refreshed = await fetchRoleTemplates();
      setRoles(refreshed);
      const updated = refreshed.find((r) => r.id === selectedRole.id);
      if (updated) setSelectedRole(updated);
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewUserDefaults = async () => {
    setSettingsSaving(true);
    setMessage("");
    try {
      await updateRbacSettings({ default_new_user_role_codes: newUserDefaultRoles });
      setMessage("نقش‌های پیش‌فرض کاربر جدید ذخیره شد");
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const panelStyle = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 16,
  };

  const searchInputStyle = {
    width: "100%",
    height: 42,
    padding: "0 12px 0 36px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const descColor = isDarkMode ? "#cbd5e1" : "#475569";

  return (
    <FormPageLayout
      title="مدیریت نقش و مجوز"
      documentTitle="مدیریت نقش و مجوز"
      subtitle={isMobile ? "تخصیص مجوز به نقش‌ها" : "تخصیص مجوز به الگوهای نقش — مجوزهای sync فقط روی hub مشخص (آنلاین/آفلاین) عمل می‌کنند؛ توضیح هر مجوز را بخوانید"}
      helpTitle="راهنمای نقش و مجوز"
      onHelp={RBAC_ADMIN_HELP}
      maxWidth={PAGE_RBAC_CSS}
      wide
      fillViewport
      contentPadding={isMobile ? "8px 10px 28px" : "12px 20px 40px"}
    >
      <style>{`
        .rbac-admin-layout {
          display: grid;
          grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
          grid-template-rows: auto calc(100vh - 220px);
          grid-template-areas:
            "settings settings"
            "roles perms";
          gap: 20px;
          align-items: stretch;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .rbac-settings-panel {
          grid-area: settings;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .rbac-roles-panel {
          grid-area: roles;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 220px);
          min-height: calc(100vh - 220px);
          max-height: calc(100vh - 220px);
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          position: sticky;
          top: 72px;
          align-self: start;
          overflow: hidden;
        }
        .rbac-roles-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding-left: 4px;
          -webkit-overflow-scrolling: touch;
        }
        .rbac-perms-panel {
          grid-area: perms;
          display: flex;
          flex-direction: column;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          height: calc(100vh - 220px);
          min-height: calc(100vh - 220px);
          max-height: calc(100vh - 220px);
          overflow: hidden;
        }
        .rbac-perms-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }
        .rbac-perms-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .rbac-perms-scroll {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 32px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        .rbac-cat-body {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
          gap: 12px;
          padding: 12px 14px 14px;
          min-width: 0;
        }
        .rbac-perms-toolbar {
          min-width: 0;
          max-width: 100%;
        }
        .rbac-toolbar-actions {
          min-width: 0;
          max-width: 100%;
        }
        .rbac-cat-card {
          min-width: 0;
          max-width: 100%;
        }
        .rbac-perm-item {
          min-height: auto;
          box-sizing: border-box;
          align-items: flex-start !important;
        }
        .rbac-perm-desc {
          display: block;
          font-size: 12px;
          line-height: 1.65;
          margin-top: 6px;
          white-space: normal;
          word-break: break-word;
        }
        .rbac-perm-code {
          display: block;
          font-size: 10px;
          margin-top: 4px;
          direction: ltr;
          text-align: right;
          opacity: 0.7;
        }
        .rbac-mobile-role-bar {
          display: none;
        }
        @media (min-width: 1400px) {
          .rbac-cat-body {
            grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
          }
        }
        @media (max-width: 900px) {
          .rbac-admin-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
            grid-template-areas:
              "settings"
              "roles"
              "perms";
            gap: 10px;
          }
          .rbac-settings-panel,
          .rbac-roles-panel,
          .rbac-perms-panel {
            padding: 12px !important;
            border-radius: 10px;
          }
          .rbac-settings-panel h3,
          .rbac-roles-title {
            font-size: 0.92em;
          }
          .rbac-settings-panel p {
            font-size: 11px;
            line-height: 1.6;
          }
          .rbac-settings-panel .form-page-btn {
            width: 100%;
            justify-content: center;
            min-height: 44px;
          }
          .rbac-roles-panel {
            position: static;
            height: auto;
            min-height: 0;
            max-height: none;
          }
          .rbac-perms-panel {
            height: auto;
            min-height: 0;
            max-height: none;
            scroll-margin-top: 72px;
          }
          .rbac-perms-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            margin-bottom: 12px !important;
          }
          .rbac-perms-toolbar > div:first-child {
            width: 100%;
          }
          .rbac-perms-toolbar h3 {
            font-size: 1.05em;
            line-height: 1.4;
          }
          .rbac-perms-toolbar-meta {
            font-size: 11px !important;
            line-height: 1.5;
          }
          .rbac-toolbar-actions {
            flex-direction: column !important;
            width: 100%;
            gap: 8px !important;
          }
          .rbac-toolbar-actions .form-page-btn {
            width: 100%;
            justify-content: center;
            min-height: 44px;
            font-size: 13px;
          }
          .rbac-toolbar-actions .rbac-btn-primary {
            order: -1;
          }
          .rbac-mobile-role-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.04);
          }
          .rbac-mobile-role-bar .form-page-btn {
            flex-shrink: 0;
            min-height: 40px;
            white-space: nowrap;
          }
          .rbac-roles-panel.is-collapsed .rbac-roles-list {
            display: none;
          }
          .rbac-roles-panel.is-collapsed .rbac-roles-title {
            display: none;
          }
          .rbac-roles-panel.is-collapsed {
            padding: 10px 12px !important;
          }
          .rbac-mobile-role-bar .selected-role-name {
            font-weight: 600;
            font-size: 14px;
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .rbac-roles-list {
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            max-height: none;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 6px;
            -webkit-overflow-scrolling: touch;
          }
          .rbac-roles-list li {
            flex: 0 0 auto;
            margin-bottom: 0 !important;
          }
          .rbac-roles-list .form-page-btn {
            white-space: nowrap;
            min-height: 40px;
            padding: 8px 14px;
            font-size: 13px;
          }
          .rbac-cat-body {
            grid-template-columns: 1fr;
            padding: 10px 12px 12px;
          }
          .rbac-cat-card button {
            font-size: 13px;
            padding: 10px 12px !important;
          }
          .rbac-perm-item {
            padding: 10px 12px !important;
          }
        }
        @media (max-width: 480px) {
          .rbac-mobile-role-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .rbac-mobile-role-bar .selected-role-name {
            white-space: normal;
            text-align: center;
          }
          .rbac-mobile-role-bar .form-page-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      {message && (
        <FormStatusBanner
          variant={message.includes("ذخیره") || message.includes("بازنشانی") ? "success" : "error"}
          isDarkMode={isDarkMode}
          theme={theme}
        >
          {message}
        </FormStatusBanner>
      )}

      <div className="rbac-admin-layout">
        <div className="rbac-settings-panel" style={panelStyle}>
          <h3 style={{ margin: "0 0 8px", fontSize: "0.95em", color: theme.text }}>نقش‌های پیش‌فرض فرم «کاربر جدید»</h3>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: theme.muted, lineHeight: 1.7 }}>
            وقتی مدیر «کاربر جدید» می‌سازد، این نقش‌ها از قبل انتخاب شده‌اند (قابل تغییر قبل از ذخیره).
          </p>
          <RoleAssignMultiSelect
            roles={roles.map((r) => ({ id: r.code, label: r.label_fa || r.code }))}
            values={newUserDefaultRoles}
            onChange={setNewUserDefaultRoles}
            theme={theme}
            isDarkMode={isDarkMode}
          />
          <button
            type="button"
            disabled={settingsSaving}
            onClick={handleSaveNewUserDefaults}
            className="form-page-btn form-page-btn-primary"
            style={{ marginTop: 12 }}
          >
            <Save size={16} /> ذخیره نقش‌های پیش‌فرض کاربر جدید
          </button>
        </div>

        <aside
          className={`rbac-roles-panel${!mobileRolesOpen && selectedRole ? " is-collapsed" : ""}`}
          style={panelStyle}
        >
          <div className="rbac-mobile-role-bar">
            {selectedRole ? (
              <span className="selected-role-name" style={{ color: theme.text }}>
                نقش: {selectedRole.label_fa}
              </span>
            ) : (
              <span className="selected-role-name" style={{ color: theme.muted }}>نقشی انتخاب نشده</span>
            )}
            <button
              type="button"
              className="form-page-btn form-page-btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setMobileRolesOpen((v) => !v)}
            >
              {mobileRolesOpen ? "بستن لیست" : "تغییر نقش"}
            </button>
          </div>
          <h2 className="rbac-roles-title" style={{ margin: "0 0 12px", fontSize: "0.95em", color: theme.text }}>نقش‌ها</h2>
          <ul className="rbac-roles-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {roles.map((r) => {
              const active = selectedRole?.id === r.id;
              return (
                <li key={r.id} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => selectRole(r)}
                    className={`form-page-btn form-page-btn-secondary${active ? " v3-tab-btn active" : ""}`}
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      textAlign: "right",
                      ...(active ? { background: "rgba(56,189,248,0.15)", borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8" } : {}),
                    }}
                  >
                    {r.label_fa || r.code}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section ref={permsPanelRef} className="rbac-perms-panel" style={panelStyle}>
          {!selectedRole ? (
            <div className="rbac-perms-empty" style={{ color: theme.muted }}>
              <p style={{ margin: 0, textAlign: "center" }}>یک نقش از فهرست انتخاب کنید.</p>
            </div>
          ) : (
            <div className="rbac-perms-body">
              <div className="rbac-perms-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14, flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: 0, color: theme.text }}>{selectedRole.label_fa}</h3>
                  <p className="rbac-perms-toolbar-meta" style={{ margin: "4px 0 0", fontSize: 11, color: theme.muted }}>
                    پیش‌فرض ذخیره‌شده: {selectedRole.default_permissions?.length || 0} مجوز
                    {" · "}
                    فعال: {selectedPerms.length} مجوز
                  </p>
                </div>
                <div className="rbac-toolbar-actions" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSaveAsDefault}
                    className="form-page-btn form-page-btn-secondary"
                    title="مجوزهای تیک‌خورده فعلی را به‌عنوان baseline پیش‌فرض این نقش ذخیره می‌کند"
                  >
                    <Save size={16} /> ذخیره پیش‌فرض نقش
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResetDefaults}
                    className="form-page-btn form-page-btn-secondary"
                    title="اعمال پیش‌فرض ذخیره‌شده (یا seed اگر ذخیره نشده)"
                  >
                    <RotateCcw size={16} /> بازنشانی پیش‌فرض
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResetSeedDefaults}
                    className="form-page-btn form-page-btn-secondary"
                    title="بازگشت به seed اولیه کد — جایگزین پیش‌فرض ذخیره‌شده"
                  >
                    <RotateCcw size={16} /> seed سیستم
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={save}
                    className="form-page-btn form-page-btn-primary rbac-btn-primary"
                  >
                    <Save size={16} /> ذخیره مجوزهای فعال
                  </button>
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: 16 }}>
                <Search
                  size={16}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: theme.muted, pointerEvents: "none" }}
                />
                <input
                  type="search"
                  placeholder="جستجو در مجوزها (نام، توضیح، کد، دسته)..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  style={searchInputStyle}
                />
              </div>

              <p style={{ margin: "0 0 12px", fontSize: 12, color: theme.muted }}>
                {filteredCount} مجوز
                {permSearch.trim() ? ` (از ${permissions.length})` : ""}
                {" · "}
                {selectedPerms.length} انتخاب‌شده
              </p>

              {filteredCount === 0 ? (
                <p style={{ color: theme.muted, margin: 0, flexShrink: 0 }}>مجوزی با این عبارت یافت نشد.</p>
              ) : (
                <div className="rbac-perms-scroll">
                  {groupedPermissions.map((cat) => {
                    const collapsed = collapsedCats[cat.id];
                    const selectedInCat = cat.permissions.filter((p) => selectedPerms.includes(p.code)).length;
                    return (
                      <div
                        key={cat.id}
                        className="rbac-cat-card"
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRight: `3px solid ${cat.color}`,
                          borderRadius: 10,
                          background: theme.card,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "10px 14px",
                            border: "none",
                            borderRadius: collapsed ? 10 : "10px 10px 0 0",
                            background: isDarkMode ? "rgba(255,255,255,0.04)" : `${cat.color}12`,
                            color: theme.text,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                            {cat.title}
                            <span style={{ fontWeight: 400, fontSize: 12, color: theme.muted }}>
                              ({selectedInCat}/{cat.permissions.length})
                            </span>
                          </span>
                          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>

                        {!collapsed && (
                          <div
                            className="rbac-cat-body"
                            style={{
                              background: isDarkMode ? "rgba(0,0,0,0.15)" : "#fafafa",
                            }}
                          >
                            {cat.permissions.map((p) => (
                              <label
                                key={p.id}
                                className="rbac-perm-item"
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "flex-start",
                                  padding: "12px 14px",
                                  borderRadius: 8,
                                  border: `1px solid ${theme.border}`,
                                  background: theme.card,
                                  cursor: p.is_system && selectedRole.is_system ? "not-allowed" : "pointer",
                                  opacity: p.is_system && selectedRole.is_system ? 0.7 : 1,
                                  color: theme.text,
                                  fontSize: 13,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPerms.includes(p.code)}
                                  disabled={p.is_system && selectedRole.is_system}
                                  onChange={() => togglePerm(p.code)}
                                  style={{ marginTop: 4, flexShrink: 0, width: 16, height: 16 }}
                                />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{p.label_fa || p.code}</span>
                                  {p.description_fa ? (
                                    <span className="rbac-perm-desc" style={{ color: descColor }}>
                                      {p.description_fa}
                                    </span>
                                  ) : null}
                                  <span className="rbac-perm-code" style={{ color: theme.muted }}>
                                    {p.code}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </FormPageLayout>
  );
}
