import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { UserPlus, Trash2, Edit, X, Search, ChevronDown, Key, HelpCircle } from "lucide-react";
import RoleAssignMultiSelect from "../components/settings/RoleAssignMultiSelect.jsx";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import HelpModal from "../components/common/HelpModal.jsx";
import { PAGE_ADMIN_PX } from "../constants/pageLayoutWidths.js";
import MessengerAccountsPanel from "../components/settings/MessengerAccountsPanel.jsx";
import { USER_ROLE_GUIDE_HELP } from "../content/userRoleGuideHelp.jsx";
import { ANALYST_SUGGESTION_HELP } from "../content/analystSuggestionHelp.jsx";
import { GENDER_OPTIONS, normalizeGender } from "../utils/userGreeting.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme, FORM_PAGE_MODAL_Z_INDEX } from "../theme/formPageTheme.js";
import { getRoleLabelFa, normalizeRoles } from "../utils/userRoles.js";
import {
  fetchRoleTemplates,
  fetchUserRbac,
  updateUserAssignments,
} from "../services/rbacAdminService.js";
import api from "../api/api";

const UI_LEGACY_ROLE_MAP = { system_admin: "admin" };
const API_LEGACY_ROLE_MAP = { admin: "system_admin" };

function toUiRoleCode(code) {
  return UI_LEGACY_ROLE_MAP[code] || code;
}

function toApiRoleCode(uiCode) {
  return API_LEGACY_ROLE_MAP[uiCode] || uiCode;
}

// fallback if RBAC API unavailable
const DEFAULT_ROLES = [
  { id: "admin", label: "مدیر کل سیستم" },
  { id: "tech_admin", label: "مدیر فنی" },
  { id: "analysis_manager", label: "مدیر تحلیل / سردبیر" },
  { id: "analyst", label: "تحلیل‌گر" },
  { id: "mentor", label: "راهنما / داور" },
  { id: "topic_proposer", label: "پیشنهاددهنده موضوع" },
  { id: "topic_approver", label: "تصویب‌کننده محور" },
  { id: "news_monitor", label: "پایشگر اخبار" },
  { id: "news_editor", label: "دبیر اخبار" },
  { id: "news_chief", label: "سردبیر اخبار" },
  { id: "Field_admin", label: "مدیر گزارشات میدانی" },
  { id: "user", label: "کاربر واحد (گزارش، پایش، تحلیل کوتاه)" },
  { id: "strategy_viewer", label: "ناظر راهبردی" },
  { id: "strategy_commander", label: "فرمانده راهبردی" },
  { id: "strategy_analysis_manager", label: "مدیر تحلیل راهبردی" },
];

// تابع فارسی‌سازی مقادیر عددی برای شمارنده‌ها
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

export default function UserManagement() {
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => getFormPageTheme(isDarkMode), [isDarkMode]);
  const inputStyle = useMemo(() => ({
    width: "100%",
    height: "45px",
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "0 10px",
    borderRadius: "8px",
    boxSizing: "border-box",
    textAlign: "right",
    fontFamily: "inherit",
  }), [theme]);
  const labelStyle = useMemo(() => ({
    color: theme.muted,
    fontSize: "12px",
    textAlign: "right",
  }), [theme]);
  const messengerTheme = useMemo(() => ({
    card: isDarkMode ? "rgba(15,23,42,0.5)" : "#f8fafc",
    border: theme.border,
    text: theme.text,
    input: theme.inputBg,
  }), [isDarkMode, theme]);

  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(DEFAULT_ROLES);
  const [showModal, setShowModal] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [showAnalystHelp, setShowAnalystHelp] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // 🌟 استیت پویای کنترل نمایش فیلد پسورد در حالت ویرایش کاربر قدیمی
  const [showPassField, setShowPassField] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [contributorFilter, setContributorFilter] = useState("all");
  const [newUserDefaultRoles, setNewUserDefaultRoles] = useState(["user"]);
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    name: "",
    password: "", // فیلد کلمه عبور
    role: ["user"],
    unit_cd: "",
    gender: "male",
    active: true,
  });

  // استیت‌های مربوط به کنترل باکس انتخاب واحد سازمانی به همراه سرچ زنده داخلی
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // تعریف متد دریافت لیست کاربران
  const fetchData = async () => {
    try {
      const res = await api.get("/users", { params: { include_brief_stats: "true" } });
      setUsers(res.data);
    } catch (err) { alert("خطا در دریافت لیست کاربران"); }
  };

  // تعریف متد دریافت لیست واحدها
  const fetchUnits = async () => {
    try {
      const res = await api.get("/users/units");
      setUnits(res.data || []);
    } catch (err) { console.error("خطا در دریافت واحدها", err); }
  };

  useEffect(() => {
    fetchData();
    fetchUnits();
    api.get("/users/new-user-default-roles")
      .then((res) => {
        const codes = (res.data?.role_codes || ["user"]).map(toUiRoleCode);
        setNewUserDefaultRoles(codes.length ? codes : ["user"]);
      })
      .catch(() => {});
    fetchRoleTemplates()
      .then((templates) => {
        if (!templates?.length) return;
        setAvailableRoles(
          templates.map((t) => ({
            id: toUiRoleCode(t.code),
            label: t.label_fa || t.code,
          })),
        );
      })
      .catch(() => {});
  }, []);

  // هندلر بستن پاپ‌آپ واحد با کلیک روی بیرون از کادر
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUnitDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // حداقل یک نقش همیشه فعال بماند
  const handleRolesChange = useCallback((nextRoles) => {
    setFormData((prev) => ({
      ...prev,
      role: nextRoles?.length ? nextRoles : ["user"],
    }));
  }, []);

  // 🌟 باز کردن پنجره ویرایش کاربر قدیمی
  const openEdit = async (user) => {
    let userRoles = [];
    try {
      const rbac = await fetchUserRbac(user.id);
      userRoles = (rbac.assignments || [])
        .filter((a) => a.active)
        .map((a) => toUiRoleCode(a.code));
    } catch {
      /* fallback legacy role field */
    }
    if (!userRoles.length && user.role) {
      if (Array.isArray(user.role)) {
        userRoles = user.role;
      } else if (typeof user.role === "string") {
        const cleanedStr = user.role.replace(/[{}"\s]/g, "");
        userRoles = cleanedStr.split(",").filter(Boolean);
      }
    }
    if (userRoles.length === 0) userRoles = ["user"];

    setFormData({ 
      id: user.id,
      username: user.username || "",
      name: user.name || "",
      role: userRoles, 
      password: "", // ابتدا فیلد پسورد ویرایش خالی رها شود
      unit_cd: user.unit_cd || "",
      gender: normalizeGender(user.gender),
      active: user.active !== undefined ? user.active : true
    });
    setUnitSearchQuery("");
    setEditMode(true);
    setShowPassField(false); // 🌟 پیش‌فرض دکمه‌ی تغییر پسورد مخفی باشد تا کاربر قدیمی بی دلیل پسوردش خالی نشود
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.name) {
      alert("لطفاً فیلدهای ضروری (نام و نام کاربری) را تکمیل کنید");
      return;
    }
    
    // کلمه عبور برای تعریف کاربر جدید اجباری است
    if (!editMode && !formData.password.trim()) {
      alert("لطفاً کلمه عبور را برای کاربر جدید وارد کنید");
      return;
    }

    try {
      const payload = { 
        ...formData,
        unit_cd: formData.unit_cd ? parseInt(formData.unit_cd, 10) : null 
      };
      const roleCodes = formData.role.map(toApiRoleCode);

      if (editMode) {
        if (!showPassField) delete payload.password;
        await api.put(`/users/${formData.id}`, payload);
        await updateUserAssignments(formData.id, roleCodes);
      } else {
        const res = await api.post("/users", payload);
        const newId = res.data?.id;
        if (newId) await updateUserAssignments(newId, roleCodes);
      }
      setShowModal(false);
      fetchData();
      alert("تغییرات با موفقیت اعمال شد ✅");
    } catch (err) { alert(err.response?.data?.error || "خطا در ذخیره‌سازی مشخصات کاربر"); }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("آیا از حذف این کاربر اطمینان دارید؟")) {
      try {
        await api.delete(`/users/${id}`);
        fetchData();
        alert("کاربر با موفقیت حذف گردید ✅");
      } catch (err) {
        alert("خطا در حذف کاربر");
      }
    }
  };

  // سیستم جستجوی همه‌جانبه و عمیق بر روی تمام مشخصات هویتی، واحدها، نقش‌ها و وضعیت فعال بودن کاربر
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (contributorFilter === "contributors" && !(u.brief_submission_count > 0)) return false;
      if (contributorFilter === "suggested" && !u.analyst_suggested) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();

      const matchName = (u.name || "").toLowerCase().includes(term);
      const matchUsername = (u.username || "").toLowerCase().includes(term);
      const matchUnit = (u.UnitShortName || "").toLowerCase().includes(term);

      const statusText = u.active ? "فعال" : "غیرفعال";
      const matchStatus = statusText.includes(term);

      let userRoles = [];
      if (u.role) {
        if (Array.isArray(u.role)) {
          userRoles = u.role;
        } else if (typeof u.role === "string") {
          userRoles = u.role.replace(/[{}"\s]/g, "").split(",").filter(Boolean);
        }
      }
      const matchRole = userRoles.some(r => {
        const roleObj = availableRoles.find(ar => ar.id === r);
        const persianLabel = roleObj ? roleObj.label : "";
        return r.toLowerCase().includes(term) || persianLabel.toLowerCase().includes(term);
      });

      return matchName || matchUsername || matchUnit || matchStatus || matchRole;
    });
  }, [users, searchTerm, contributorFilter]);

  // فیلتر کردن هوشمند واحدهای سازمانی درون کمبوباکس بر اساس تایپ کاربر
  const filteredUnits = useMemo(() => {
    return units.filter(u => 
      (u.UnitShortName || "").toLowerCase().includes(unitSearchQuery.toLowerCase())
    );
  }, [units, unitSearchQuery]);

  // پیدا کردن مشخصات واحد انتخاب شده فعلی جهت نمایش در کادر متنی کمبوباکس
  const selectedUnitLabel = useMemo(() => {
    if (!formData.unit_cd) return "انتخاب واحد سازمانی (اختیاری)...";
    const found = units.find(u => u.UnitCode === formData.unit_cd);
    return found ? found.UnitShortName : "انتخاب واحد سازمانی (اختیاری)...";
  }, [units, formData.unit_cd]);

  // تبدیل نام انگلیسی نقش به برچسب فارسی شیک و تخصیص پالت رنگی مناسب
  const getRoleBadgeDetails = (roleId) => {
    if (roleId === "admin") return { label: "مدیر کل", bg: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "rgba(239, 68, 68, 0.25)" };
    if (roleId === "tech_admin") return { label: "مدیر فنی", bg: "rgba(100, 116, 139, 0.14)", color: "#475569", border: "rgba(100, 116, 139, 0.3)" };
    if (roleId === "analysis_manager") return { label: "مدیر تحلیل", bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.25)" };
    if (roleId === "analyst") return { label: "تحلیل‌گر", bg: "rgba(99, 102, 241, 0.12)", color: "#6366f1", border: "rgba(99, 102, 241, 0.25)" };
    if (roleId === "mentor") return { label: "راهنما", bg: "rgba(168, 85, 247, 0.12)", color: "#a855f7", border: "rgba(168, 85, 247, 0.25)" };
    if (roleId === "topic_proposer") return { label: "پیشنهاددهنده", bg: "rgba(20, 184, 166, 0.12)", color: "#14b8a6", border: "rgba(20, 184, 166, 0.25)" };
    if (roleId === "topic_approver") return { label: "تصویب‌کننده", bg: "rgba(14, 165, 233, 0.12)", color: "#0ea5e9", border: "rgba(14, 165, 233, 0.25)" };
    if (roleId === "news_monitor") return { label: "پایشگر اخبار", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
    if (roleId === "news_editor") return { label: "دبیر اخبار", bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.25)" };
    if (roleId === "news_chief") return { label: "سردبیر اخبار", bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" };
    if (roleId === "Field_admin") return { label: "مدیر میدانی", bg: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", border: "rgba(244, 63, 94, 0.25)" };
    if (roleId === "user") return { label: "کاربر واحد", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
    if (roleId === "strategy_viewer") return { label: "ناظر راهبردی", bg: "rgba(100, 116, 139, 0.14)", color: "#64748b", border: "rgba(100, 116, 139, 0.3)" };
    if (roleId === "strategy_commander") return { label: "فرمانده راهبردی", bg: "rgba(15, 118, 110, 0.14)", color: "#0f766e", border: "rgba(15, 118, 110, 0.3)" };
    if (roleId === "strategy_analysis_manager") return { label: "مدیر تحلیل راهبردی", bg: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", border: "rgba(124, 58, 237, 0.28)" };
    // نقش ناشناس را دیگر به‌اشتباه «کاربر واحد» نشان نده
    return { label: getRoleLabelFa(roleId) || roleId || "نقش نامشخص", bg: "rgba(148, 163, 184, 0.12)", color: "#64748b", border: "rgba(148, 163, 184, 0.3)" };
  };

  return (
    <FormPageLayout
      title="مدیریت کاربران"
      onHelp={() => <USER_ROLE_GUIDE_HELP />}
      helpTitle="راهنمای نقش‌ها، مجوزها و پیشنهاد تحلیل‌گر"
      wide
      maxWidth={PAGE_ADMIN_PX}
      contentPadding="0 0 32px"
      toolbarExtra={(
        <span className="user-count-badge">
          تعداد کاربران: {toPersianDigits(filteredUsers.length)} از {toPersianDigits(users.length)}
        </span>
      )}
    >
      {/* استایل‌های تم‌آگاه برای جدول، مودال و دراپ‌داون */}
      <style>{`
        .loginCard {
          background: ${theme.card};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid ${theme.border};
          box-shadow: 0 8px 24px 0 rgba(0, 0, 0, ${isDarkMode ? "0.37" : "0.08"});
          color: ${theme.text};
        }
        .input {
          transition: all 0.3s ease;
          outline: none;
        }
        .input:focus {
          border-color: #00cec9 !important;
          box-shadow: 0 0 10px rgba(0, 206, 201, 0.2);
        }
        .submitBtn {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .submitBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 206, 201, 0.3);
        }
        .submitBtn:active {
          transform: translateY(0);
        }
        
        .user-count-badge {
          background: rgba(0, 206, 201, 0.1);
          border: 1px solid rgba(0, 206, 201, 0.25);
          color: #00cec9;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: bold;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        
        .role-chip-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          align-items: center;
        }
        .role-badge-button {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 8px;
          font-weight: bold;
          transition: all 0.2s;
          user-select: none;
        }
        .role-badge-button:hover {
          transform: scale(1.03);
        }

        .custom-searchable-select {
          position: relative;
          width: 100%;
        }
        .select-trigger-box {
          width: 100%;
          height: 52px;
          background: ${theme.inputBg};
          border: 1px solid ${theme.border};
          border-radius: 10px;
          padding: 0 14px;
          color: ${theme.text};
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          box-sizing: border-box;
          font-size: 13px;
          transition: all 0.2s ease-in-out;
        }
        .select-trigger-box:hover {
          border-color: rgba(0, 206, 201, 0.5);
        }
        .select-dropdown-panel {
          position: absolute;
          top: 58px;
          left: 0;
          width: 100%;
          background: ${theme.card};
          border: 1px solid ${theme.border};
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, ${isDarkMode ? "0.5" : "0.12"});
          z-index: 11000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .dropdown-search-input {
          width: 100%;
          height: 44px;
          background: ${isDarkMode ? "rgba(0, 0, 0, 0.2)" : "#f8fafc"};
          border: none;
          border-bottom: 1px solid ${theme.border};
          color: ${theme.text};
          padding: 0 12px;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
          font-size: 12.5px;
          text-align: right;
        }
        .options-scroll-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .option-item {
          padding: 12px 14px;
          color: ${theme.text};
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: right;
        }
        .option-item:hover {
          background: #3b82f6;
          color: #fff;
        }
        .option-item.selected {
          background: #00cec9;
          color: #000;
          font-weight: bold;
        }
      `}</style>

      <div style={{ width: "100%" }}>
        
        {/* بخش فیلتر و افزودن کاربر */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "25px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: "10px", flex: "1", minWidth: "280px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <select
              value={contributorFilter}
              onChange={(e) => setContributorFilter(e.target.value)}
              style={{ height: 42, borderRadius: 10, padding: "0 12px", background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, fontFamily: "inherit" }}
            >
              <option value="all">همه کاربران</option>
              <option value="contributors">دارای تحلیل کوتاه</option>
              <option value="suggested">پیشنهاد تحلیل‌گر (نیاز به اعمال نقش)</option>
            </select>
            <button
              type="button"
              onClick={() => setShowAnalystHelp(true)}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.muted,
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              title="راهنمای پیشنهاد تحلیل‌گر"
            >
              <HelpCircle size={16} />
              راهنمای پیشنهاد
            </button>
            <div style={{ position: "relative", flex: 1, maxWidth: "450px", minWidth: 200 }}>
              <Search style={{ position: "absolute", right: "12px", top: "12px", opacity: 0.5, color: theme.muted }} size={18} />
              <input className="input" style={{ ...inputStyle, paddingRight: "40px", fontSize: "13.5px" }} placeholder="جستجو بر اساس نام، یوزرنیم، نقش، نام واحد، وضعیت..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setEditMode(false); setFormData({ id: "", username: "", name: "", password: "", role: [...newUserDefaultRoles], unit_cd: "", gender: "male", active: true }); setUnitSearchQuery(""); setShowModal(true); }} className="submitBtn" style={{ width: "auto", padding: "0 20px", height: "45px", marginTop: 0, background: "#00cec9", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "bold", display: "flex", alignItems: "center" }}><UserPlus size={18} style={{ marginLeft: "8px" }} /> کاربر جدید</button>
          </div>
        </div>

        {/* جدول نمایش کاربران */}
        <div className="loginCard" style={{ width: "100%", padding: "10px", overflowX: "auto", borderRadius: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: theme.text, direction: "rtl" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ padding: "15px", textAlign: "right" }}>نام کاربر</th>
                <th style={{ textAlign: "center" }}>واحد سازمانی</th>
                <th style={{ textAlign: "center" }}>نقش‌های دسترسی</th>
                <th style={{ textAlign: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    تحلیل کوتاه
                    <HelpCircle
                      size={15}
                      style={{ cursor: "pointer", opacity: 0.65 }}
                      title="راهنمای پیشنهاد تحلیل‌گر"
                      onClick={() => setShowAnalystHelp(true)}
                    />
                  </span>
                </th>
                <th style={{ textAlign: "center" }}>وضعیت</th>
                <th style={{ textAlign: "center" }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: theme.muted }}>کاربری با مشخصات جستجو شده یافت نشد.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleSource = Array.isArray(user.role_codes) && user.role_codes.length
                    ? user.role_codes.map(toUiRoleCode)
                    : user.role;
                  let parsedRoles = normalizeRoles(roleSource);
                  if (parsedRoles.length === 0) parsedRoles = ["user"];

                  return (
                    <tr key={user.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <b style={{ color: theme.text }}>{user.name}</b> 
                        <br/>
                        <span style={{ fontSize: "11px", color: theme.muted }}>{user.username}</span>
                      </td>
                      <td style={{ textAlign: "center", color: theme.text }}>
                        {user.UnitShortName || <span style={{ color: theme.muted }}>فاقد واحد</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="role-chip-container">
                          {parsedRoles.map(r => {
                            const badge = getRoleBadgeDetails(r);
                            return (
                              <span 
                                key={r} 
                                className="role-badge-button" 
                                style={{ 
                                  backgroundColor: badge.bg, 
                                  color: badge.color, 
                                  border: `1px solid ${badge.border}` 
                                }}
                              >
                                {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>
                        {toPersianDigits(user.brief_submission_count || 0)}
                        {user.analyst_suggested && !parsedRoles.includes("analyst") ? (
                          <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#a855f7", fontWeight: 700 }}>پیشنهاد تحلیل‌گر</span>
                        ) : null}
                      </td>
                      <td style={{ textAlign: "center" }}>{user.active ? "✅" : "❌"}</td>
                      <td style={{ textAlign: "center" }}>
                        <Edit size={18} onClick={() => openEdit(user)} style={{ color: "#fdcb6e", cursor: "pointer", marginLeft: "12px" }} />
                        <Trash2 size={18} onClick={() => handleDeleteUser(user.id)} style={{ color: "#ff7675", cursor: "pointer" }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال تعریف/ویرایش کاربر (با فیلد رمز عبور جدید و بهبودیافته) */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: isDarkMode ? "rgba(0,0,0,0.85)" : "rgba(15,23,42,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: FORM_PAGE_MODAL_Z_INDEX, padding: "20px" }}>
          <div className="loginCard" style={{ width: "520px", maxHeight: "90vh", overflowY: "auto", padding: "35px", display: "flex", flexDirection: "column", gap: "15px", border: `1px solid ${theme.border}`, direction: "rtl", borderRadius: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: theme.text, marginBottom: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>{editMode ? "ویرایش مشخصات کاربر" : "تعریف کاربر جدید"}</h2>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer", color: "#ff7675" }} />
            </div>

            <label style={labelStyle}>نام و نام خانوادگی:</label>
            <input className="input" style={inputStyle} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

            <label style={labelStyle}>نام کاربری:</label>
            <input className="input" style={inputStyle} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />

            <label style={labelStyle}>جنسیت (برای خطاب خوش‌آمدگویی):</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: opt.value })}
                  style={{
                    flex: 1,
                    height: "42px",
                    borderRadius: "8px",
                    border: formData.gender === opt.value ? "1px solid #00cec9" : `1px solid ${theme.border}`,
                    background: formData.gender === opt.value ? "rgba(0,206,201,0.15)" : theme.inputBg,
                    color: formData.gender === opt.value ? theme.text : theme.muted,
                    fontFamily: "inherit",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 🌟 بخش مدیریت کلمه عبور به همراه مهار امنیتی برای حالت ویرایش */}
            {editMode ? (
              <div>
                {!showPassField ? (
                  <button 
                    onClick={() => setShowPassField(true)}
                    className="submitBtn" 
                    style={{ height: "45px", background: theme.inputBg, border: `1px solid ${theme.border}`, color: "#d97706", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <Key size={14} /> تغییر کلمه عبور کاربر قدیمی
                  </button>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={labelStyle}>رمز عبور جدید:</label>
                      <span onClick={() => { setShowPassField(false); setFormData({ ...formData, password: "" }); }} style={{ color: "#f87171", fontSize: "11px", cursor: "pointer" }}>انصراف از تغییر رمز</span>
                    </div>
                    <input 
                      type="password"
                      className="input" 
                      style={inputStyle} 
                      placeholder="رمز عبور جدید را وارد کنید..."
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ ...labelStyle, display: "block", marginBottom: "6px" }}>رمز عبور اولیه کاربر:</label>
                <input 
                  type="password"
                  className="input" 
                  style={inputStyle} 
                  placeholder="******"
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>
            )}

            {/* بخش انتخاب چندگانه نقش‌ها */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label style={{ ...labelStyle, margin: 0 }}>تخصیص نقش‌های دسترسی (چندنقشی):</label>
              <button type="button" onClick={() => setShowRoleGuide(true)} style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                <HelpCircle size={13} /> راهنمای نقش‌ها
              </button>
            </div>
            <RoleAssignMultiSelect
              roles={availableRoles}
              values={formData.role}
              onChange={handleRolesChange}
              theme={theme}
              isDarkMode={isDarkMode}
            />

            <label style={{ ...labelStyle, marginTop: "10px" }}>واحد مربوطه (اختیاری):</label>
            <div className="custom-searchable-select" ref={dropdownRef}>
              <div 
                className="select-trigger-box" 
                onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              >
                <span style={{ color: formData.unit_cd ? theme.text : theme.muted }}>
                  {selectedUnitLabel}
                </span>
                <ChevronDown size={18} style={{ opacity: 0.7, transform: isUnitDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
              </div>

              {isUnitDropdownOpen && (
                <div className="select-dropdown-panel">
                  <input 
                    type="text" 
                    className="dropdown-search-input" 
                    placeholder="جستجو و فیلتر واحدها..."
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()} 
                  />
                  <div className="options-scroll-list">
                    <div 
                      className={`option-item ${!formData.unit_cd ? "selected" : ""}`}
                      onClick={() => {
                        setFormData({ ...formData, unit_cd: "" });
                        setIsUnitDropdownOpen(false);
                      }}
                    >
                      بدون واحد سازمانی (اختیاری)
                    </div>
                    {filteredUnits.length === 0 ? (
                      <div style={{ padding: "12px", fontSize: "11px", color: theme.muted, textAlign: "center" }}>واحدی یافت نشد.</div>
                    ) : (
                      filteredUnits.map((unit) => (
                        <div 
                          key={unit.UnitCode} 
                          className={`option-item ${formData.unit_cd === unit.UnitCode ? "selected" : ""}`}
                          onClick={() => {
                            setFormData({ ...formData, unit_cd: unit.UnitCode });
                            setIsUnitDropdownOpen(false);
                          }}
                        >
                          {unit.UnitShortName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {editMode && formData.id ? (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${theme.border}` }}>
                <MessengerAccountsPanel
                  mode="admin"
                  userId={formData.id}
                  theme={messengerTheme}
                  title="اکانت‌های پیام‌رسان این کاربر"
                  description="برای نگاشت sender اخبار دریافتی از بله/تلگرام/ایتا به این کاربر."
                />
              </div>
            ) : null}

            <button onClick={handleSave} className="submitBtn" style={{ height: "50px", background: "linear-gradient(45deg, #6c5ce7, #0984e3)", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "bold", marginTop: "15px", fontFamily: "inherit" }}>
              {editMode ? "بروزرسانی نهایی" : "ثبت و ایجاد کاربر"}
            </button>
          </div>
        </div>
      )}

      <HelpModal
        open={showAnalystHelp}
        onClose={() => setShowAnalystHelp(false)}
        title="راهنمای پیشنهاد تحلیل‌گر"
        maxWidth={640}
      >
        <ANALYST_SUGGESTION_HELP />
      </HelpModal>

      <HelpModal
        open={showRoleGuide}
        onClose={() => setShowRoleGuide(false)}
        title="راهنمای جامع نقش‌ها و مجوزها"
        maxWidth={720}
      >
        <USER_ROLE_GUIDE_HELP />
      </HelpModal>
    </FormPageLayout>
  );
}