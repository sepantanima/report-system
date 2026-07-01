import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowRight,
  User,
  Lock,
  CheckCircle2,
  Shield,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Bell,
  KeyRound,
  FileText,
  Activity,
} from "lucide-react";

// =========================================================================
// 🌟 راهنمای ایمپورت در پروژه واقعی شما (جهت اتصال به دیتابیس و استایل‌ها):
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
import api from "../api/api";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import {
  MessagingTabContent,
  FieldReportSettingsPanel,
  NewsEntrySettingsPanel,
} from "../components/settings/AdminSettingsPanels.jsx";
// =========================================================================

// // شبیه‌ساز هوشمند وب‌سرویس‌ها جهت جلوگیری از خطای بیلد در پیش‌نمایش کانوس
// const api = window.api || {
//   put: async (url, data) => {
//     console.log("Simulating Profile API PUT request to:", url, data);
//     await new Promise((resolve) => setTimeout(resolve, 800));
//     return {
//       data: {
//         success: true,
//         message: "مشخصات امنیتی و رمز عبور با موفقیت بروزرسانی شد",
//         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwibmFtZSI6InVzZXIiLCJyb2xlcyI6WyJ1c2VyIiwibmV3c19hZG1pbiJdLCJ1bml0Y2QiOiIzMDA5NDAiLCJzdGF0ZW5hbWUiOiLZgdin2LHYsyJ9.signature"
//       }
//     };
//   }
// };

// تابع کمکی برای دیکود کردن مشخصات توکن فعال
const decodeToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return {};
  }
};

// 🌟 مهار و پاکسازی فرمت آرایه خام دیتابیس پستگرس و ممانعت از تکرار نقش‌ها
const getParsedRoles = () => {
  if (typeof window === "undefined") return ["user"];
  let roleRaw = localStorage.getItem("role");
  if (!roleRaw) return ["user"];

  try {
    if (roleRaw.startsWith("[")) {
      const arr = JSON.parse(roleRaw);
      if (Array.isArray(arr)) {
        return [...new Set(arr.map(r => r.trim()).filter(Boolean))];
      }
    }
    if (roleRaw.includes("{") || roleRaw.includes("}")) {
      const cleaned = roleRaw.replace(/[{}"\s]/g, "");
      const arr = cleaned.split(",").filter(Boolean);
      return [...new Set(arr)];
    }
  } catch (e) {
    console.warn("تداخل در پارس جی‌سان نقش؛ متد سنتی اجرا می‌شود.", e);
  }

  const splitted = roleRaw.split(",").map(r => r.trim()).filter(Boolean);
  return [...new Set(splitted)];
};

export default function SystemSetting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = location.state?.returnTo || "/main";
  const returnState = location.state?.returnState;

  const goBack = () => navigate(returnTo, { state: returnState });
  const { isDarkMode, setIsDarkMode } = useAppTheme();
  const roles = getSessionRoles();

  const settingsTheme = useMemo(() => ({
    card: isDarkMode ? "rgba(30,41,59,0.6)" : "rgba(248,250,252,0.9)",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    input: isDarkMode ? "#0f172a" : "#f8fafc",
  }), [isDarkMode]);

  const visibleTabs = useMemo(() => {
    const all = [
      { id: "appearance", label: "پوسته و پروفایل", icon: Sun, show: true },
      { id: "security", label: "امنیت", icon: Lock, show: true },
      {
        id: "messaging",
        label: "پیام و ابلاغ",
        icon: Bell,
        show: hasPermission(roles, "messages")
          || hasPermission(roles, "manage_message_settings")
          || hasPermission(roles, "manage_announcements"),
      },
      {
        id: "field_limits",
        label: "سقف میدانی",
        icon: Activity,
        show: hasPermission(roles, "manage_field_entry_limits"),
      },
      {
        id: "news_limits",
        label: "سقف خبر",
        icon: FileText,
        show: hasPermission(roles, "manage_news_entry_limits"),
      },
    ];
    return all.filter((t) => t.show);
  }, [roles]);

  const tabFromUrl = searchParams.get("tab");
  const defaultTab = visibleTabs[0]?.id || "appearance";
  const [activeTab, setActiveTab] = useState(
    visibleTabs.some((t) => t.id === tabFromUrl) ? tabFromUrl : defaultTab,
  );
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({ 
    username: "User_Spnta", 
    name: "حسن حسنی", 
    roles: ["user"] 
  });

  // فرم‌های مجزای تنظیمات
  const [profileForm, setProfileForm] = useState({
    name: "حسن حسنی",
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // متغیرهای کنترل پنهان/آشکار سازی رمزهای عبور
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    if (tabFromUrl && visibleTabs.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl, visibleTabs, defaultTab]);

  const selectTab = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id }, { replace: true });
  };

  // بارگذاری داده‌های اولیه کاربر از توکن معتبر به همراه نقش‌های دقیق چندگانه
  useEffect(() => {
    const token = localStorage.getItem("token");
    let name = "کاربر محترم";
    let username = localStorage.getItem("username") || "user";
    let userRoles = getParsedRoles();

    if (token) {
      const decoded = decodeToken(token);
      if (decoded.name) name = decoded.name;
      if (decoded.username) username = decoded.username;
      
      // اگر نقش‌ها در سشن وجود نداشت از دیکودر استفاده کن
      if (!userRoles || userRoles.length === 0 || userRoles[0] === "user") {
        if (decoded.roles && Array.isArray(decoded.roles)) {
          userRoles = decoded.roles;
        } else if (decoded.role) {
          userRoles = [decoded.role];
        }
      }
    }

    const storedName = localStorage.getItem("name");
    if (storedName && storedName.trim() !== "") {
      name = storedName;
    }

    setCurrentUser({
      username,
      name,
      roles: userRoles,
    });

    setProfileForm({
      name,
    });
  }, []);

  // نگاشت فارسی و استایل‌دهی دکمه‌ای مجزا نقش‌های جاری شما مطابق با جدول کاربران
  const passwordStrength = useMemo(() => {
    const pass = securityForm.newPassword;
    if (!pass) return { score: 0, label: "هنوز رمزی تایپ نشده", color: "#64748b" };
    if (pass.length < 6) return { score: 1, label: "خیلی کوتاه است (حداقل ۶ کاراکتر)", color: "#ef4444" };
    
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    
    if (hasLetters && hasNumbers) {
      return { score: 3, label: "پیچیدگی مناسب (متوسط رو به بالا) ✅", color: "#10b981" };
    }
    return { score: 2, label: "ضعیف (ترکیب حروف و اعداد انگلیسی را رعایت کنید)", color: "#f59e0b" };
  }, [securityForm.newPassword]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      alert("⚠️ وارد کردن نام و نام خانوادگی الزامی است.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put("/users/profile", {
        name: profileForm.name.trim()
      });

      alert("✅ مشخصات نام شما با موفقیت بروزرسانی شد.");

      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      localStorage.setItem("name", profileForm.name.trim());
      navigate("/main");
    } catch (err) {
      alert(err.response?.data?.error || "❌ خطا در بروزرسانی اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();

    if (!securityForm.currentPassword.trim()) {
      alert("⚠️ وارد کردن رمز عبور کنونی الزامی است.");
      return;
    }

    if (!securityForm.newPassword.trim()) {
      alert("⚠️ کلمه عبور جدید نمی‌تواند خالی باشد.");
      return;
    }

    if (securityForm.newPassword.length < 6) {
      alert("⚠️ کلمه عبور جدید باید حداقل دارای ۶ کاراکتر باشد.");
      return;
    }

    if (passwordStrength.score < 3) {
      alert("⚠️ لطفاً پیچیدگی رمز عبور جدید را افزایش دهید (ترکیب حروف انگلیسی و اعداد).");
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert("⚠️ کلمه عبور جدید با تکرار آن مطابقت ندارد.");
      return;
    }

    setLoading(true);
    try {
      await api.put("/users/profile", {
        name: profileForm.name.trim(),
        currentPassword: securityForm.currentPassword,
        password: securityForm.newPassword
      });

      alert("✅ کلمه عبور شما با موفقیت تغییر یافت.");
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      navigate("/main");
    } catch (err) {
      alert(err.response?.data?.error || "❌ خطا در تغییر کلمه عبور (رمز کنونی معتبر نیست)");
    } finally {
      setLoading(false);
    }
  };

  // نگاشت فارسی و استایل‌دهی دکمه‌ای مجزا نقش‌های جاری شما مطابق با جدول کاربران
  const getRoleBadgeDetails = (roleId) => {
    if (roleId === "admin") return { label: "مدیر کل سیستم", bg: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "rgba(239, 68, 68, 0.25)" };
    if (roleId === "news_monitor") return { label: "پایشگر اخبار", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
    if (roleId === "news_editor") return { label: "دبیر اخبار", bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.25)" };
    if (roleId === "news_chief") return { label: "سردبیر اخبار", bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" };
    return { label: "کاربر واحد", bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.25)" };
  };

  return (
    <div className="loginPage">
      {/* استایل‌های جامع پورتال تنظیمات سازگار با تم پویا و بیلد ۱۰۰٪ موفق */}
      <style>{`
        .loginPage {
          background: var(--bg-main);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow-y: auto;
          font-family: Tahoma, sans-serif;
          padding: 20px;
          box-sizing: border-box;
          transition: background 0.3s ease;
          color: var(--text-main);
        }
        .blob {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          z-index: 0;
        }
        .blob1 {
          background: #1e3a8a;
          top: 15%;
          left: 15%;
        }
        .blob2 {
          background: #0f766e;
          bottom: 15%;
          right: 15%;
        }
        .loginCardWrap {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: min(96vw, 960px);
        }
        .loginCard {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
          transition: all 0.3s ease;
        }
        
        /* 🌟 استایل جدید، مینی‌مال و بسیار شکیل تب‌ها هماهنگ با لایه کلاسیک تیره سپنتا */
        .settings-tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-sub);
          padding: 14px 10px;
          font-size: 12.5px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          flex: 1 1 0;
          min-width: 0;
        }
        .settings-tabs-row {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          background: rgba(0,0,0,0.12);
          border-bottom: 1px solid var(--border-color);
          -webkit-overflow-scrolling: touch;
        }
        .settings-tab-btn:focus-visible {
          outline: none;
        }
        .settings-tab-btn:hover:not(.active) {
          color: #38bdf8;
          background: rgba(255, 255, 255, 0.02);
        }
        .settings-tab-btn.active {
          color: #38bdf8 !important;
          border-bottom-color: #38bdf8;
          background: rgba(56, 189, 248, 0.04);
        }

        .input-box-wrapper {
          position: relative;
          width: 100%;
        }
        .input-icon-left {
          position: absolute;
          left: 12px;
          top: 16px;
          cursor: pointer;
          opacity: 0.6;
          transition: 0.2s;
        }
        .input-icon-left:hover {
          opacity: 1;
          color: #38bdf8;
        }
        .custom-input {
          width: 100%;
          height: 50px;
          padding: 0 15px;
          padding-right: 40px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          color: var(--text-main);
          border-radius: 10px;
          font-size: 14px;
          box-sizing: border-box;
          text-align: right;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease-in-out;
        }
        .custom-input:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
        }
        
        /* استایل چیپ‌های نقش‌های جاری به صورت مستقل و شکیل در هدر سراسری */
        .role-badge {
          display: inline-block;
          font-size: 11px;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: bold;
          border: 1px solid transparent;
        }
        .theme-select-card {
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.25s ease-in-out;
        }
        .theme-select-card:hover {
          transform: translateY(-2px);
        }
        .theme-select-card.active {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.05);
        }
        .strength-indicator-bar {
          height: 6px;
          border-radius: 3px;
          transition: all 0.3s;
        }
        
        /* دکمه انصراف بومی شیک */
        .cancel-btn-classic {
          height: 48px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--input-border);
          color: var(--text-main);
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cancel-btn-classic:hover {
          background: rgba(255,255,255,0.08);
          border-color: var(--text-sub);
        }
      `}</style>

      <div className="blob blob1"></div>
      <div className="blob blob2"></div>

      <div className="loginCardWrap">
        
        {/* هدر بالایی تنظیمات */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "25px", alignItems: "center" }}>
          <button
            onClick={goBack}
            className="submitBtn"
            style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-main)", marginTop: 0 }}
            title="بازگشت به منوی اصلی"
          >
            <ArrowRight size={18} />
          </button>
          <h2 style={{ color: "var(--text-main)", margin: 0, fontSize: "1.4rem", fontWeight: "bold" }}>
            تنظیمات سیستم و کاربری
          </h2>
        </div>

        {/* کارت بدنه چند تبِ پورتال تنظیمات */}
        <div className="loginCard" style={{ borderRadius: "24px", direction: "rtl", overflow: "visible" }}>
          
          {/* 🌟 بخش هویتی جدید بالای تب‌ها به عنوان هدر سراسری با همگام‌سازی کامل نقش‌ها */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.15)", padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Shield size={16} color="#38bdf8" />
              <span style={{ fontSize: "12px", color: "var(--text-sub)" }}>
                شناسه کاربری فعال: <strong style={{ color: "var(--text-main)" }}>{currentUser.username}</strong>
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "11.5px", color: "var(--text-sub)" }}>نقش‌های جاری شما:</span>
              {currentUser.roles.map((role) => {
                const badge = getRoleBadgeDetails(role);
                return (
                  <span key={role} className="role-badge" style={{ backgroundColor: badge.bg, color: badge.color, borderColor: badge.border, border: "1px solid" }}>
                    {badge.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* تب یاب لایه‌ای افقی */}
          <div className="settings-tabs-row">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`settings-tab-btn text-center ${activeTab === id ? "active" : ""}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <div style={{ padding: "30px" }}>

            {/* بدنه تب اول: تنظیمات پوسته و ظاهر سامانه */}
            {activeTab === "appearance" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ fontSize: "13.5px", fontWeight: "bold", margin: 0, color: "var(--text-main)" }}>انتخاب قالب و تم کلی پورتال سپنتا:</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  {/* گزینه تم تیره */}
                  <div 
                    onClick={() => setIsDarkMode(true)}
                    className={`theme-select-card p-5 rounded-xl border-2 flex flex-col items-center gap-3 ${isDarkMode ? "active" : ""}`}
                    style={{ background: "rgba(15, 23, 42, 0.4)", borderColor: isDarkMode ? "#38bdf8" : "var(--border-color)" }}
                  >
                    <Moon size={28} color={isDarkMode ? "#38bdf8" : "#94a3b8"} />
                    <span style={{ fontSize: "12.5px", fontWeight: "bold" }}>پوسته تیره (پیش‌فرض)</span>
                  </div>

                  {/* گزینه تم روشن */}
                  <div 
                    onClick={() => setIsDarkMode(false)}
                    className={`theme-select-card p-5 rounded-xl border-2 flex flex-col items-center gap-3 ${!isDarkMode ? "active" : ""}`}
                    style={{ background: "#ffffff", borderColor: !isDarkMode ? "#38bdf8" : "var(--border-color)", color: "#0f172a" }}
                  >
                    <Sun size={28} color={!isDarkMode ? "#38bdf8" : "#475569"} />
                    <span style={{ fontSize: "12.5px", fontWeight: "bold" }}>پوسته روشن کلاسیک</span>
                  </div>
                </div>

                <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "8px", padding: "12px", color: "var(--text-sub)", fontSize: "11.5px", lineHeight: "1.7", textAlign: "justify" }}>
                  💡 تغییر تم به صورت کاملاً زنده در تمامی صفحات (داشبورد مانیتورینگ، فرم‌های ثبت گزارش، مدیریت کاربران و تنظیمات) شبیه‌سازی و همگام خواهد شد.
                </div>

                {/* فرم ویرایش نام در همین بخش */}
                <form onSubmit={handleProfileSave} style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div>
                    <label style={{ color: "var(--text-sub)", fontSize: "13px", display: "block", marginBottom: "6px" }}>نام و نام خانوادگی:</label>
                    <div style={{ position: "relative" }}>
                      <User size={16} style={{ position: "absolute", right: "12px", top: "16px", opacity: 0.5 }} />
                      <input 
                        type="text" 
                        className="custom-input"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="مثال: علی عباسی"
                      />
                    </div>
                  </div>
                  
                  {/* 🌟 دکمه‌های متقارن جدید ثبت تغییرات و انصراف برای مشخصات فردی */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                    <button type="submit" disabled={loading} className="submitBtn" style={{ flex: 2, height: "48px", background: "linear-gradient(45deg, #6c5ce7, #0984e3)", color: "#fff", fontWeight: "bold", border: "none", borderRadius: "10px", marginTop: 0 }}>
                      {loading ? "درحال ذخیره..." : "ثبت تغییرات"}
                    </button>
                    <button type="button" onClick={goBack} className="cancel-btn-classic" style={{ flex: 1 }}>
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* بدنه تب دوم: امنیت و تغییر کلمه عبور با بررسی پیچیدگی */}
            {activeTab === "security" && (
              <form onSubmit={handleSecuritySave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                
                {/* رمز عبور فعلی */}
                <div>
                  <label style={{ color: "var(--text-sub)", fontSize: "13px", display: "block", marginBottom: "6px" }}>رمز عبور کنونی شما:</label>
                  <div className="input-box-wrapper">
                    <Lock size={16} style={{ position: "absolute", right: "12px", top: "16px", opacity: 0.5 }} />
                    <input 
                      type={showCurrentPass ? "text" : "password"} 
                      className="custom-input"
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      placeholder="کلمه عبور فعلی خود را بنویسید..."
                      required
                    />
                    <div className="input-icon-left" onClick={() => setShowCurrentPass(!showCurrentPass)}>
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "15px", marginTop: "5px" }}>
                  {/* رمز عبور جدید */}
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ color: "var(--text-sub)", fontSize: "13px", display: "block", marginBottom: "6px" }}>رمز عبور جدید:</label>
                    <div className="input-box-wrapper">
                      <Lock size={16} style={{ position: "absolute", right: "12px", top: "16px", opacity: 0.5 }} />
                      <input 
                        type={showNewPass ? "text" : "password"} 
                        className="custom-input"
                        value={securityForm.newPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                        placeholder="حداقل ۶ کاراکتر..."
                        required
                      />
                      <div className="input-icon-left" onClick={() => setShowNewPass(!showNewPass)}>
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </div>
                    </div>
                    
                    {/* ارزیابی قدرت پسورد متوسط */}
                    {securityForm.newPassword && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                          <span style={{ color: "var(--text-sub)" }}>قدرت رمز عبور:</span>
                          <span style={{ color: passwordStrength.color, fontWeight: "bold" }}>{passwordStrength.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: "4px", width: "100%", background: "rgba(128,128,128,0.1)", borderRadius: "3px", padding: "2px" }}>
                          {[1, 2, 3].map((step) => (
                            <div 
                              key={step} 
                              className="strength-indicator-bar" 
                              style={{ 
                                flex: 1, 
                                background: passwordStrength.score >= step ? passwordStrength.color : "transparent" 
                              }} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* تکرار رمز عبور جدید */}
                  <div>
                    <label style={{ color: "var(--text-sub)", fontSize: "13px", display: "block", marginBottom: "6px" }}>تکرار رمز عبور جدید:</label>
                    <div className="input-box-wrapper">
                      <Lock size={16} style={{ position: "absolute", right: "12px", top: "16px", opacity: 0.5 }} />
                      <input 
                        type={showConfirmPass ? "text" : "password"} 
                        className="custom-input"
                        value={securityForm.confirmPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                        placeholder="کلمه عبور جدید را مجددا تکرار کنید..."
                        required
                      />
                      <div className="input-icon-left" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌟 دکمه‌های متقارن جدید ثبت تغییرات و انصراف برای رمز عبور */}
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" disabled={loading} className="submitBtn" style={{ flex: 2, height: "48px", background: "linear-gradient(45deg, #6c5ce7, #0984e3)", border: "none", color: "#fff", fontWeight: "bold", borderRadius: "10px", marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <KeyRound size={16} />
                    {loading ? "درحال تغییر رمز..." : "ثبت تغییرات"}
                  </button>
                  <button type="button" onClick={goBack} className="cancel-btn-classic" style={{ flex: 1 }}>
                    انصراف
                  </button>
                </div>
              </form>
            )}

            {/* بدنه تب سوم: بخش رزرو شده و نمایشی برای اعلانات آینده */}
            {activeTab === "messaging" && (
              <MessagingTabContent theme={settingsTheme} navigate={navigate} />
            )}

            {activeTab === "field_limits" && (
              <FieldReportSettingsPanel theme={settingsTheme} />
            )}

            {activeTab === "news_limits" && (
              <NewsEntrySettingsPanel theme={settingsTheme} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}