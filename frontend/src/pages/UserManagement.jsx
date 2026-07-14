import React, { useState, useEffect, useMemo, useRef } from "react";
import { UserPlus, Trash2, Edit, X, Search, CheckSquare, Square, ChevronDown, Key, HelpCircle } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { PAGE_ADMIN_PX } from "../constants/pageLayoutWidths.js";
import MessengerAccountsPanel from "../components/settings/MessengerAccountsPanel.jsx";
import { USER_ROLE_GUIDE_HELP } from "../content/userRoleGuideHelp.jsx";
import { GENDER_OPTIONS, normalizeGender } from "../utils/userGreeting.js";

// =========================================================================
// 🌟 راهنمای ایمپورت در پروژه واقعی شما (جهت اتصال به دیتابیس و استایل‌ها):
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
 import api from "../api/api";
// =========================================================================

// // شبیه‌ساز هوشمند وب‌سرویس‌ها جهت جلوگیری از خطای بیلد در پیش‌نمایش کانوس
// const api = window.api || {
//   get: async (url) => {
//     await new Promise((resolve) => setTimeout(resolve, 500));
//     if (url === "/users") {
//       return {
//         data: [
//           { id: 1, name: "نیما امینی", username: "nima_amini", role: ["admin", "news_admin", "user"], UnitShortName: "ABHAD", unit_cd: 300940, active: true },
//           { id: 2, name: "علی عباسی", username: "Ali_Abasi", role: ["user"], UnitShortName: "واحد تهران ۱۰۰۲۰۰", unit_cd: 100200, active: true },
//           { id: 3, name: "مدیر سیستم", username: "Admin_System", role: ["admin"], UnitShortName: "واحد اصفهان ۲۰۰۳۰۰", unit_cd: 200300, active: true }
//         ]
//       };
//     }
//     if (url === "/users/units") {
//       return {
//         data: [
//           { UnitCode: 300940, UnitShortName: "واحد فارس ۳۰۰۹۴۰" },
//           { UnitCode: 100200, UnitShortName: "واحد تهران ۱۰۰۲۰۰" },
//           { UnitCode: 200300, UnitShortName: "واحد اصفهان ۲۰۰۳۰۰" }
//         ]
//       };
//     }
//     return { data: [] };
//   },
//   post: async (url, data) => {
//     console.log("Mock POST request:", url, data);
//     await new Promise((resolve) => setTimeout(resolve, 600));
//     return { data: { ...data, id: Date.now() } };
//   },
//   put: async (url, data) => {
//     console.log("Mock PUT request:", url, data);
//     await new Promise((resolve) => setTimeout(resolve, 600));
//     return { data };
//   },
//   delete: async (url) => {
//     console.log("Mock DELETE request:", url);
//     await new Promise((resolve) => setTimeout(resolve, 500));
//     return { data: { success: true } };
//   }
// };

// لیست ثابت نقش‌های موجود در سیستم جهت مدیریت متمرکز به همراه برچسب‌های فارسی مصوب
const AVAILABLE_ROLES = [
  { id: "admin", label: "مدیر کل سیستم" },
  { id: "analysis_manager", label: "مدیر تحلیل / سردبیر" },
  { id: "analyst", label: "تحلیل‌گر" },
  { id: "mentor", label: "راهنما / داور" },
  { id: "topic_proposer", label: "پیشنهاددهنده موضوع" },
  { id: "topic_approver", label: "تصویب‌کننده محور" },
  { id: "news_monitor", label: "پایشگر اخبار" },
  { id: "news_editor", label: "دبیر اخبار" },
  { id: "news_chief", label: "سردبیر اخبار" },
  { id: "Field_admin", label: "مدیر گزارشات میدانی" },
  { id: "user", label: "کاربر واحد (ثبت گزارش)" },
];

// تابع فارسی‌سازی مقادیر عددی برای شمارنده‌ها
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // 🌟 استیت پویای کنترل نمایش فیلد پسورد در حالت ویرایش کاربر قدیمی
  const [showPassField, setShowPassField] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [contributorFilter, setContributorFilter] = useState("all");
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

  // تابع مدیریت تیک زدن نقش‌ها
  const toggleRole = (roleId) => {
    setFormData(prev => {
      const currentRoles = [...prev.role];
      if (currentRoles.includes(roleId)) {
        if (currentRoles.length > 1) {
          return { ...prev, role: currentRoles.filter(r => r !== roleId) };
        }
        return prev;
      } else {
        return { ...prev, role: [...currentRoles, roleId] };
      }
    });
  };

  // 🌟 باز کردن پنجره ویرایش کاربر قدیمی
  const openEdit = (user) => {
    let userRoles = [];
    if (user.role) {
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

      if (editMode) {
        // 🌟 در حالت ویرایش، اگر تیک فیلد پسورد زده نشده باشد، پسورد از پارامترهای ارسالی حذف می‌شود تا رمز قدیمی دیتابیس حفظ شود
        if (!showPassField) delete payload.password;
        await api.put(`/users/${formData.id}`, payload);
      } else {
        await api.post("/users", payload);
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
        const roleObj = AVAILABLE_ROLES.find(ar => ar.id === r);
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
    if (roleId === "analysis_manager") return { label: "مدیر تحلیل", bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.25)" };
    if (roleId === "analyst") return { label: "تحلیل‌گر", bg: "rgba(99, 102, 241, 0.12)", color: "#6366f1", border: "rgba(99, 102, 241, 0.25)" };
    if (roleId === "mentor") return { label: "راهنما", bg: "rgba(168, 85, 247, 0.12)", color: "#a855f7", border: "rgba(168, 85, 247, 0.25)" };
    if (roleId === "topic_proposer") return { label: "پیشنهاددهنده", bg: "rgba(20, 184, 166, 0.12)", color: "#14b8a6", border: "rgba(20, 184, 166, 0.25)" };
    if (roleId === "topic_approver") return { label: "تصویب‌کننده", bg: "rgba(14, 165, 233, 0.12)", color: "#0ea5e9", border: "rgba(14, 165, 233, 0.25)" };
    if (roleId === "news_monitor") return { label: "پایشگر اخبار", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
    if (roleId === "news_editor") return { label: "دبیر اخبار", bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.25)" };
    if (roleId === "news_chief") return { label: "سردبیر اخبار", bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" };
    if (roleId === "Field_admin") return { label: "مدیر میدانی", bg: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", border: "rgba(244, 63, 94, 0.25)" };
    return { label: "کاربر واحد", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
  };

  return (
    <FormPageLayout
      title="مدیریت کاربران"
      onHelp={() => <USER_ROLE_GUIDE_HELP />}
      helpTitle="راهنمای جامع نقش‌ها و مسئولیت‌ها"
      wide
      maxWidth={PAGE_ADMIN_PX}
      contentPadding="0 0 32px"
      toolbarExtra={(
        <span className="user-count-badge">
          تعداد کاربران: {toPersianDigits(filteredUsers.length)} از {toPersianDigits(users.length)}
        </span>
      )}
    >
      {/* استایل‌های درونی و بلورین سازمانی تیره جهت ممانعت از ایجاد وابستگی خارجی */}
      <style>{`
        .loginPage {
          background: var(--bg-main);
          min-height: 100vh;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          position: relative;
          overflow-x: hidden;
          font-family: Tahoma, sans-serif;
          box-sizing: border-box;
          color: var(--text-main);
        }
        .loginCardWrap {
          position: relative;
          z-index: 10;
        }
        .loginCard {
          background: var(--bg-card);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
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

        .checkbox-item { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          padding: 12px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 10px; 
          cursor: pointer; 
          transition: 0.2s; 
          user-select: none;
        }
        .checkbox-item:hover { 
          background: rgba(255,255,255,0.08); 
        }
        .checkbox-item.active { 
          border-color: #00cec9; 
          background: rgba(0, 206, 201, 0.05); 
        }

        .custom-searchable-select {
          position: relative;
          width: 100%;
        }
        .select-trigger-box {
          width: 100%;
          height: 52px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 0 14px;
          color: #fff;
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
          background: rgba(20, 30, 50, 0.95);
        }
        .select-dropdown-panel {
          position: absolute;
          top: 58px;
          left: 0;
          width: 100%;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 11000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .dropdown-search-input {
          width: 100%;
          height: 44px;
          background: rgba(0, 0, 0, 0.2);
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
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
          color: #cbd5e1;
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
              style={{ height: 42, borderRadius: 10, padding: "0 12px", background: "#1e293b", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", fontFamily: "inherit" }}
            >
              <option value="all">همه کاربران</option>
              <option value="contributors">دارای تحلیل کوتاه</option>
              <option value="suggested">پیشنهاد تحلیل‌گر</option>
            </select>
            <div style={{ position: "relative", flex: 1, maxWidth: "450px", minWidth: 200 }}>
              <Search style={{ position: "absolute", right: "12px", top: "12px", opacity: 0.5, color: "#fff" }} size={18} />
              <input className="input" style={{ width: "100%", paddingRight: "40px", height: "45px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "8px", boxSizing: "border-box", textAlign: "right", fontSize: "13.5px" }} placeholder="جستجو بر اساس نام، یوزرنیم، نقش، نام واحد، وضعیت..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setEditMode(false); setFormData({ id: "", username: "", name: "", password: "", role: ["user"], unit_cd: "", gender: "male", active: true }); setUnitSearchQuery(""); setShowModal(true); }} className="submitBtn" style={{ width: "auto", padding: "0 20px", height: "45px", marginTop: 0, background: "#00cec9", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "bold", display: "flex", alignItems: "center" }}><UserPlus size={18} style={{ marginLeft: "8px" }} /> کاربر جدید</button>
          </div>
        </div>

        {/* جدول نمایش کاربران */}
        <div className="loginCard" style={{ width: "100%", padding: "10px", overflowX: "auto", borderRadius: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff", direction: "rtl" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "15px", textAlign: "right" }}>نام کاربر</th>
                <th style={{ textAlign: "center" }}>واحد سازمانی</th>
                <th style={{ textAlign: "center" }}>نقش‌های دسترسی</th>
                <th style={{ textAlign: "center" }}>تحلیل کوتاه</th>
                <th style={{ textAlign: "center" }}>وضعیت</th>
                <th style={{ textAlign: "center" }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>کاربری با مشخصات جستجو شده یافت نشد.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  let parsedRoles = [];
                  if (user.role) {
                    if (Array.isArray(user.role)) {
                      parsedRoles = user.role;
                    } else if (typeof user.role === "string") {
                      const cleaned = user.role.replace(/[{}"\s]/g, "");
                      parsedRoles = cleaned.split(",").filter(Boolean);
                    }
                  }
                  if (parsedRoles.length === 0) parsedRoles = ["user"];

                  return (
                    <tr key={user.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <b style={{ color: "#fff" }}>{user.name}</b> 
                        <br/>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{user.username}</span>
                      </td>
                      <td style={{ textAlign: "center", color: "#e2e8f0" }}>
                        {user.UnitShortName || <span style={{ color: "#475569" }}>فاقد واحد</span>}
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
                        {user.analyst_suggested ? (
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
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: "20px" }}>
          <div className="loginCard" style={{ width: "520px", maxHeight: "90vh", overflowY: "auto", padding: "35px", display: "flex", flexDirection: "column", gap: "15px", border: "1px solid rgba(255,255,255,0.1)", direction: "rtl", borderRadius: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", marginBottom: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>{editMode ? "ویرایش مشخصات کاربر" : "تعریف کاربر جدید"}</h2>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer", color: "#ff7675" }} />
            </div>

            <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right" }}>نام و نام خانوادگی:</label>
            <input className="input" style={{ width: "100%", height: "45px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0 10px", borderRadius: "8px", boxSizing: "border-box", textAlign: "right", fontFamily: "inherit" }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

            <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right" }}>نام کاربری:</label>
            <input className="input" style={{ width: "100%", height: "45px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0 10px", borderRadius: "8px", boxSizing: "border-box", textAlign: "right", fontFamily: "inherit" }} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />

            <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right" }}>جنسیت (برای خطاب خوش‌آمدگویی):</label>
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
                    border: formData.gender === opt.value ? "1px solid #00cec9" : "1px solid rgba(255,255,255,0.12)",
                    background: formData.gender === opt.value ? "rgba(0,206,201,0.15)" : "rgba(255,255,255,0.05)",
                    color: formData.gender === opt.value ? "#fff" : "#94a3b8",
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
                    style={{ height: "45px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fdcb6e", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <Key size={14} /> تغییر کلمه عبور کاربر قدیمی
                  </button>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right" }}>رمز عبور جدید:</label>
                      <span onClick={() => { setShowPassField(false); setFormData({ ...formData, password: "" }); }} style={{ color: "#f87171", fontSize: "11px", cursor: "pointer" }}>انصراف از تغییر رمز</span>
                    </div>
                    <input 
                      type="password"
                      className="input" 
                      style={{ width: "100%", height: "45px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0 10px", borderRadius: "8px", boxSizing: "border-box", textAlign: "right", fontFamily: "inherit" }} 
                      placeholder="رمز عبور جدید را وارد کنید..."
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right", display: "block", marginBottom: "6px" }}>رمز عبور اولیه کاربر:</label>
                <input 
                  type="password"
                  className="input" 
                  style={{ width: "100%", height: "45px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0 10px", borderRadius: "8px", boxSizing: "border-box", textAlign: "right", fontFamily: "inherit" }} 
                  placeholder="******"
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>
            )}

            {/* بخش انتخاب چندگانه نقش‌ها */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label style={{ color: "#aaa", fontSize: "12px", textAlign: "right", margin: 0 }}>تخصیص نقش‌های دسترسی (چندنقشی):</label>
              <button type="button" onClick={() => setShowRoleGuide(true)} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                <HelpCircle size={13} /> راهنمای نقش‌ها
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {AVAILABLE_ROLES.map((role) => (
                <div 
                  key={role.id} 
                  className={`checkbox-item ${formData.role.includes(role.id) ? "active" : ""}`}
                  onClick={() => toggleRole(role.id)}
                >
                  {formData.role.includes(role.id) ? <CheckSquare size={18} color="#00cec9" /> : <Square size={18} color="#64748b" />}
                  <span style={{ color: formData.role.includes(role.id) ? "#fff" : "#94a3b8", fontSize: "13px" }}>{role.label}</span>
                </div>
              ))}
            </div>

            <label style={{ color: "#aaa", fontSize: "12px", marginTop: "10px", textAlign: "right" }}>واحد مربوطه (اختیاری):</label>
            <div className="custom-searchable-select" ref={dropdownRef}>
              <div 
                className="select-trigger-box" 
                onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              >
                <span style={{ color: formData.unit_cd ? "#fff" : "#64748b" }}>
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
                      <div style={{ padding: "12px", fontSize: "11px", color: "#64748b", textAlign: "center" }}>واحدی یافت نشد.</div>
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
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed rgba(255,255,255,0.15)" }}>
                <MessengerAccountsPanel
                  mode="admin"
                  userId={formData.id}
                  theme={{
                    card: "rgba(15,23,42,0.5)",
                    border: "rgba(255,255,255,0.12)",
                    text: "#f8fafc",
                    input: "rgba(15,23,42,0.9)",
                  }}
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
    </FormPageLayout>
  );
}