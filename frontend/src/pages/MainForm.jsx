import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  FilePlus,
  Users,
  Search,
  LayoutDashboard,
  Settings,
  Activity,
  Cpu,
  Shield,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  KeyRound,
  Copy,
  Send,
} from "lucide-react";
import {
  decodeToken,
  getSessionRoles,
  getRoleLabelFa,
  hasPermission,
  persistSessionRoles,
} from "../utils/userRoles.js";

// 🌟 انتقال آرایه ساختاری منوها به خارج از کامپوننت جهت حل خطای کامپایلر ری‌اکت
// متغیرهای استاتیک نباید در هر رندر درون بدنه کامپوننت بازسازی شوند
// =========================================================================
const ACTION_CATEGORIES = [
  { id: "field", title: "گزارشات میدانی", color: "#06b6d4" },
  { id: "analysis", title: "فرایند تحلیل", color: "#10b981" },
  { id: "news", title: "اخبار و پردازش", color: "#a855f7" },
  { id: "system", title: "مدیریت و گزارشات", color: "#f59e0b" },
];

const allActions = [
  {
    id: 1,
    title: "ثبت گزارش میدانی",
    icon: <FilePlus size={24} />,
    color: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.25)",
    accentColor: "#6366f1",
    path: "/report",
    permission: "create_report",
    category: "field",
  },
  {
    id: 2,
    title: "مدیریت کاربران",
    icon: <Users size={24} />,
    color: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    accentColor: "#10b981",
    path: "/users",
    permission: "manage_users",
    category: "system",
  },
  {
    id: 3,
    title: "پایش گزارشات میدانی",
    icon: <Activity size={24} />,
    color: "rgba(6, 182, 212, 0.08)",
    borderColor: "rgba(6, 182, 212, 0.25)",
    accentColor: "#06b6d4",
    path: "/field-monitor",
    permission: "monitor_reports",
    category: "field",
  },
  {
    id: 51,
    title: "مدیریت اخبار",
    icon: <LayoutDashboard size={24} />,
    color: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    accentColor: "#3b82f6",
    path: "/news-manager",
    permission: "news_review",
    category: "news",
  },
  {
    id: 5,
    title: "ورود خبر (پایشگر)",
    icon: <FilePlus size={24} />,
    color: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    accentColor: "#38bdf8",
    path: "/news-entry",
    permission: "news_entry",
    category: "news",
  },
  {
    id: 52,
    title: "مدیریت تکراری‌ها",
    icon: <Copy size={24} />,
    color: "rgba(148, 163, 184, 0.08)",
    borderColor: "rgba(148, 163, 184, 0.25)",
    accentColor: "#94a3b8",
    path: "/news-duplicates",
    permission: "news_duplicates",
    category: "news",
  },
  {
    id: 53,
    title: "داشبورد اخبار",
    icon: <Activity size={24} />,
    color: "rgba(14, 165, 233, 0.08)",
    borderColor: "rgba(14, 165, 233, 0.25)",
    accentColor: "#0ea5e9",
    path: "/news-analytics",
    permission: "analytics",
    category: "news",
  },
  {
    id: 54,
    title: "گزارش و انتشار اخبار",
    icon: <Send size={24} />,
    color: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.25)",
    accentColor: "#22c55e",
    path: "/news-reports",
    permission: "news_report",
    category: "news",
  },
  {
    id: 55,
    title: "کانال‌های پیام‌رسان",
    icon: <Send size={24} />,
    color: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    accentColor: "#38bdf8",
    path: "/admin/messenger-channels",
    permission: "manage_messenger",
    category: "system",
  },
  {
    id: 56,
    title: "تنظیمات گزارش اخبار",
    icon: <FileText size={24} />,
    color: "rgba(192, 0, 0, 0.08)",
    borderColor: "rgba(192, 0, 0, 0.25)",
    accentColor: "#c00000",
    path: "/admin/news-report-settings",
    permission: "manage_news_reports",
    category: "system",
  },
  {
    id: 10,
    title: "پردازش هوشمند اخبار",
    icon: <Cpu size={24} />,
    color: "rgba(168, 85, 247, 0.08)",
    borderColor: "rgba(168, 85, 247, 0.25)",
    accentColor: "#a855f7",
    path: "/ai-processor",
    permission: "ai_process",
    category: "news",
  },
  {
    id: 6,
    title: "جستجوی گزارشات",
    icon: <Search size={24} />,
    color: "rgba(236, 72, 153, 0.08)",
    borderColor: "rgba(236, 72, 153, 0.25)",
    accentColor: "#ec4899",
    path: "/search",
    permission: "search_reports",
    category: "field",
  },
  {
    id: 7,
    title: "تنظیمات سیستم",
    icon: <Settings size={24} />,
    color: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    accentColor: "#f59e0b",
    path: "/SystemSetting",
    permission: "sys_settings",
    category: "system",
  },
  {
    id: 8,
    title: "گزارشات تحلیلی",
    icon: <Activity size={24} />,
    color: "rgba(244, 63, 94, 0.08)",
    borderColor: "rgba(244, 63, 94, 0.25)",
    accentColor: "#f43f5e",
    path: "/field-reports-dashboard",
    permission: "analytics",
    category: "field",
  },
  {
    id: 20,
    title: "خلاصه مدیریتی میدانی",
    icon: <FileText size={24} />,
    color: "rgba(14, 165, 233, 0.08)",
    borderColor: "rgba(14, 165, 233, 0.25)",
    accentColor: "#0ea5e9",
    path: "/field-management-summary",
    permission: "field_mgmt_summary",
    category: "field",
  },
  {
    id: 21,
    title: "مدیریت پرامپت‌ها",
    icon: <FileText size={24} />,
    color: "rgba(234, 179, 8, 0.08)",
    borderColor: "rgba(234, 179, 8, 0.25)",
    accentColor: "#eab308",
    path: "/admin/prompts",
    permission: "manage_prompts",
    category: "system",
  },
  {
    id: 22,
    title: "مدیریت API هوش مصنوعی",
    icon: <KeyRound size={24} />,
    color: "rgba(139, 92, 246, 0.08)",
    borderColor: "rgba(139, 92, 246, 0.25)",
    accentColor: "#8b5cf6",
    path: "/admin/ai-api-configs",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 23,
    title: "اکشن‌های AI فرم‌ها",
    icon: <Cpu size={24} />,
    color: "rgba(124, 58, 237, 0.08)",
    borderColor: "rgba(124, 58, 237, 0.25)",
    accentColor: "#7c3aed",
    path: "/admin/ai-form-actions",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 25,
    title: "لاگ اجرای AI",
    icon: <FileText size={24} />,
    color: "rgba(244, 63, 94, 0.08)",
    borderColor: "rgba(244, 63, 94, 0.25)",
    accentColor: "#f43f5e",
    path: "/admin/ai-run-logs",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 24,
    title: "الگوهای پاکسازی خبر",
    icon: <FileText size={24} />,
    color: "rgba(236, 72, 153, 0.08)",
    borderColor: "rgba(236, 72, 153, 0.25)",
    accentColor: "#ec4899",
    path: "/admin/news-clean-patterns",
    permission: "manage_prompts",
    category: "system",
  },
  {
    id: 11,
    title: "مدیریت تحلیل‌ها",
    icon: <Shield size={24} />,
    color: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    accentColor: "#10b981",
    path: "/analysis/management",
    permission: "analysis_manage",
    category: "analysis",
  },
  {
    id: 12,
    title: "مأموریت‌های تحلیل من",
    icon: <FilePlus size={24} />,
    color: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.25)",
    accentColor: "#6366f1",
    path: "/analysis/my-missions",
    permission: "analysis_missions",
    category: "analysis",
  },
  {
    id: 13,
    title: "ثبت موضوع تحلیل",
    icon: <FilePlus size={24} />,
    color: "rgba(20, 184, 166, 0.08)",
    borderColor: "rgba(20, 184, 166, 0.25)",
    accentColor: "#14b8a6",
    path: "/analysis/propose-topic",
    permission: "analysis_propose",
    category: "analysis",
  },
  {
    id: 14,
    title: "بازبینی تحلیل‌ها",
    icon: <Activity size={24} />,
    color: "rgba(168, 85, 247, 0.08)",
    borderColor: "rgba(168, 85, 247, 0.25)",
    accentColor: "#a855f7",
    path: "/analysis/review",
    permission: "analysis_review",
    category: "analysis",
  },
];

// 🌟 تابع بومی و فوق‌العاده دقیق تبدیل به فرمت درخواستی شمسی
const getPersianLongDate = (date) => {
  try {
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    
    // خروجی قالب‌بندی شده به صورت پیش‌فرض شامل ویرگول یا حروف اضافه است که در اینجا تصحیح و مرتب‌سازی می‌شود
    const formattedParts = formatter.formatToParts(date);
    let weekday = "";
    let day = "";
    let month = "";
    let year = "";

    formattedParts.forEach(part => {
      if (part.type === "weekday") weekday = part.value;
      if (part.type === "day") day = part.value;
      if (part.type === "month") month = part.value;
      if (part.type === "year") year = part.value;
    });

    // چینش نهایی با ساختار مد نظر شما: [روز هفته] [عدد روز] [ماه] [سال] (مثال: دوشنبه ۲۸ اردیبهشت ۱۴۰۵)
    return `${weekday} ${day} ${month} ${year}`;
  } catch (e) {
    return "دوشنبه ۲۸ اردیبهشت ۱۴۰۵";
  }
};

// تبدیل اعداد انگلیسی به فارسی برای زیبایی هدر فرم اصلی
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

export default function MainForm() {
  const navigate = useNavigate();

  // مهار و نمایش ساعت زنده در بالای فرم
  const [liveTime, setLiveTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  });

  // افکت مانیتورینگ ثانیه‌ای ساعت در بالای پنل کاربری
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // حل مشکل عدم تشخیص نام با ردیابی چندمرحله‌ای لوکال استوریج و توکن دیکود شده
  const [userMeta] = useState(() => {
    if (typeof window === "undefined") {
      return { name: "...", username: "...", roles: ["user"] };
    }
    
    let name = "کاربر محترم";
    let username = localStorage.getItem("username") || "user";
    
    // ۱. بررسی وجود مشخصه نام در توکن معتبر
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded.name) name = decoded.name;
      if (decoded.username) username = decoded.username;
    }
    
    // ۲. در صورت عدم ردیابی در توکن، واکشی مستقیم از سشن مرورگر
    if (name === "کاربر محترم") {
      const storedName = localStorage.getItem("name");
      if (storedName && storedName.trim() !== "") {
        name = storedName;
      } else {
        // ۳. در غیر این صورت، نام کاربری جایگزین شود
        name = username;
      }
    }

    const roles = getSessionRoles();
    persistSessionRoles(roles);
    return { name, username, roles };
  });

  const [roles, setRoles] = useState(userMeta.roles);

  useEffect(() => {
    const fresh = getSessionRoles();
    setRoles(fresh);
    persistSessionRoles(fresh);
  }, []);

  const filteredActions = useMemo(() => {
    return allActions.filter((action) => hasPermission(roles, action.permission));
  }, [roles]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const groupedActions = useMemo(() => {
    return ACTION_CATEGORIES.map((cat) => ({
      ...cat,
      items: filteredActions.filter((a) => a.category === cat.id),
    })).filter((g) => g.items.length > 0);
  }, [filteredActions]);

  const [collapsed, setCollapsed] = useState({});
  const toggleCategory = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (groupedActions.length === 1) {
      setCollapsed({ [groupedActions[0].id]: false });
    }
  }, [groupedActions.length]);

  // مبدل نام انگلیسی نقش به برچسب فارسی — از userRoles.js

  return (
    <div className="loginPage">
      {/* استایل‌های سفارشی و بسیار باوقار کلاسیک (پایداری کامل در بیلد) */}
      <style>{`
        .loginPage {
          background: var(--bg-main);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow: hidden;
          font-family: Tahoma, sans-serif;
          padding: 20px;
          box-sizing: border-box;
          color: var(--text-main);
          transition: background 0.3s ease, color 0.3s ease;
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
        }
        .loginCard {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
        }
        .action-card-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .action-card-button:hover {
          transform: translateY(-4px);
          background-color: rgba(255, 255, 255, 0.03) !important;
          border-color: var(--hover-border) !important;
          box-shadow: 0 8px 24px var(--hover-shadow);
        }
        .action-card-button:hover .icon-box {
          transform: scale(1.1);
          color: var(--hover-border) !important;
        }
        .icon-box {
          transition: transform 0.3s ease;
        }
        .logout-btn {
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #ef4444 !important;
          color: #fff !important;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }
        .role-badge-pill {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          color: var(--text-sub);
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
          display: inline-block;
          margin-left: 4px;
        }
        
        /* 🌟 استایل بهینه‌سازی و درشت‌تر کردن فونت کادر تاریخ و ساعت در هدر فرم اصلی */
        .live-date-time-bar {
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          padding: 10px 20px; /* افزایش فضای داخلی جهت خوانایی */
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          gap: 18px;
          font-size: 13.5px; /* 🌟 افزایش سایز فونت تاریخ برای وضوح بیشتر */
          color: #38bdf8;
          font-weight: bold;
          margin-bottom: 24px;
          direction: rtl;
        }
        .live-time-display {
          font-size: 14.5px; /* 🌟 سایز فونت ساعت کمی درشت‌تر از تاریخ رندر شود */
          font-weight: 800;
          color: #f59e0b;
        }
        .menu-category-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--input-bg);
          cursor: pointer;
          font-family: inherit;
          color: var(--text-main);
          margin-bottom: 10px;
        }
        .menu-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          width: 100%;
          margin-bottom: 18px;
        }
      `}</style>

      <div className="blob blob1"></div>
      <div className="blob blob2"></div>

      <div className="loginCardWrap" style={{ maxWidth: "700px", width: "95%" }}>
        
        {/* هدر کلاسیک پنل */}
        <div className="loginHeader" style={{ marginBottom: "25px", textAlign: "center" }}>
          
          {/* 🌟 رندر با چیدمان تصحیح شده: [روز هفته] [عدد روز] [ماه] [سال] به همراه اندازه قلم بزرگتر و واضح‌تر */}
          <div className="live-date-time-bar">
            <span>📅 {getPersianLongDate(new Date())}</span>
            <span style={{ color: "var(--sep-faint)" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }} className="live-time-display">
              <Clock size={16} style={{ color: "#f59e0b" }} />
              {liveTime}
            </span>
          </div>

          <div style={{ clear: "both" }} />

          <div
            className="logoBox"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-color)",
              padding: "15px",
              borderRadius: "50%",
              display: "inline-flex",
            }}
          >
            <LayoutDashboard size={36} color="#38bdf8" />
          </div>
          <h2 className="title" style={{ marginTop: "15px", fontSize: "1.6rem", fontWeight: "bold", color: "var(--text-main)" }}>
            سامانه پایش و مانیتورینگ سپنتا
          </h2>
          
          {/* مشخصات هویتی و نقش‌های فعال کاربر جاری */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-sub)" }}>
              <User size={14} color="#38bdf8" />
              {/* نام کامل کاربر با اولویت‌بندی هوشمند و بدون بازگشت به مقدار پیش‌فرض هاردکد */}
              <span>جناب آقای <b>{userMeta.name}</b> خوش آمدید</span>
            </div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
              <Shield size={12} color="#f59e0b" />
              <span style={{ fontSize: "11px", color: "var(--text-sub)" }}>سطوح دسترسی جاری:</span>
              {userMeta.roles.map(role => (
                <span key={role} className="role-badge-pill">
                  {getRoleLabelFa(role)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* بدنه و گرید منوهای کاربر — دسته‌بندی بر اساس فرایند */}
        <div className="loginCard" style={{ padding: "30px", borderRadius: "20px", direction: "rtl" }}>
          {groupedActions.map((group) => {
            const isOpen = collapsed[group.id] !== true;
            return (
              <div key={group.id} style={{ marginBottom: 8 }}>
                <button type="button" className="menu-category-header" onClick={() => toggleCategory(group.id)}>
                  <span style={{ fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: group.color, display: "inline-block" }} />
                    {group.title}
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: "normal" }}>({toPersianDigits(group.items.length)})</span>
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="menu-category-grid">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        className="action-card-button"
                        onClick={() => navigate(item.path)}
                        style={{
                          background: item.color,
                          border: `1px solid ${item.borderColor}`,
                          height: "110px",
                          color: "var(--text-main)",
                          "--hover-border": item.accentColor,
                          "--hover-shadow": `${item.accentColor}33`,
                        }}
                      >
                        <div className="icon-box" style={{ color: item.accentColor }}>{item.icon}</div>
                        <span style={{ fontSize: "12px", fontWeight: "bold", opacity: 0.95, textAlign: "center", lineHeight: 1.5 }}>{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* دکمه خروج کلاسیک */}
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              marginTop: "25px",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
              padding: "12px",
              borderRadius: "12px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <LogOut size={16} /> خروج از حساب کاربری
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "var(--text-sub)" }}>
          طراحی شده توسط واحد IT سپنتا | {toPersianDigits(2026)}
        </div>
      </div>
    </div>
  );
}