import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout.js";
import {
  LogOut,
  FilePlus,
  Users,
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
  Bell,
  Megaphone,
  CheckCircle,
  BarChart3,
  Layers,
  Crosshair,
  Radio,
  ScrollText,
  FilePenLine,
} from "lucide-react";
import {
  decodeToken,
  getSessionRoles,
  getRoleLabelFa,
  hasPermission,
  persistSessionRoles,
} from "../utils/userRoles.js";
import { ANALYSIS_TERMS, BRIEF_TERMS } from "../constants/analysisTerminology.js";
import useAnalysisMenuBadges from "../hooks/useAnalysisMenuBadges.js";
import { getWelcomeGreeting, normalizeGender } from "../utils/userGreeting.js";
import NotificationBell from "../components/messaging/NotificationBell.jsx";
import GlobalAnnouncementBanner from "../components/messaging/GlobalAnnouncementBanner.jsx";
import { PAGE_WIDE_CSS } from "../constants/pageLayoutWidths.js";

// 🌟 انتقال آرایه ساختاری منوها به خارج از کامپوننت جهت حل خطای کامپایلر ری‌اکت
// متغیرهای استاتیک نباید در هر رندر درون بدنه کامپوننت بازسازی شوند
// =========================================================================
const ACTION_CATEGORIES = [
  { id: "field", title: "گزارشات میدانی", color: "#06b6d4" },
  { id: "analysis", title: "فرایند تحلیل", color: "#10b981" },
  { id: "news", title: "اخبار و پردازش", color: "#a855f7" },
  { id: "command", title: "مرکز فرماندهی", color: "#e11d48" },
  { id: "system", title: "مدیریت و گزارشات", color: "#f59e0b" },
];

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return [100, 116, 139];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbaHex(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** پالت هر دسته: زمینه بخش + چند پرده از همان رنگ برای دکمه‌ها */
const CATEGORY_THEMES = {
  field: {
    base: "#06b6d4",
    accents: ["#0e7490", "#0891b2", "#06b6d4", "#22d3ee", "#155e75", "#67e8f9"],
  },
  analysis: {
    base: "#10b981",
    accents: ["#047857", "#059669", "#10b981", "#34d399", "#14b8a6", "#6ee7b7"],
  },
  news: {
    base: "#a855f7",
    accents: ["#7e22ce", "#9333ea", "#a855f7", "#c084fc", "#8b5cf6", "#d8b4fe"],
  },
  command: {
    base: "#e11d48",
    accents: ["#9f1239", "#be123c", "#e11d48", "#fb7185", "#f43f5e", "#fda4af"],
  },
  system: {
    base: "#f59e0b",
    accents: ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#ea580c", "#fcd34d"],
  },
};

function getCategoryTheme(categoryId) {
  return CATEGORY_THEMES[categoryId] || CATEGORY_THEMES.system;
}

function getActionButtonStyle(categoryId, index) {
  const theme = getCategoryTheme(categoryId);
  const accent = theme.accents[index % theme.accents.length];
  return {
    background: rgbaHex(accent, 0.14),
    borderColor: rgbaHex(accent, 0.38),
    accentColor: accent,
    hoverShadow: rgbaHex(accent, 0.28),
  };
}

const allActions = [
  {
    id: 3,
    title: "مدیریت گزارشات",
    icon: <Activity size={24} />,
    path: "/field-monitor",
    permission: "monitor_reports",
    category: "field",
  },
  {
    id: 1,
    title: "ثبت گزارش میدانی",
    icon: <FilePlus size={24} />,
    path: "/report",
    permission: "create_report",
    category: "field",
  },
  {
    id: 2,
    title: "مدیریت کاربران",
    icon: <Users size={24} />,
    path: "/users",
    permission: "manage_users",
    category: "system",
  },
  {
    id: 51,
    title: "مدیریت اخبار",
    icon: <LayoutDashboard size={24} />,
    path: "/news-manager",
    permission: "news_review",
    category: "news",
  },
  {
    id: 5,
    title: "ورود خبر (پایشگر)",
    icon: <FilePlus size={24} />,
    path: "/news-entry",
    permission: "news_entry",
    category: "news",
  },
  {
    id: 52,
    title: "مدیریت تکراری‌ها",
    icon: <Copy size={24} />,
    path: "/news-duplicates",
    permission: "news_duplicates",
    category: "news",
  },
  {
    id: 53,
    title: "داشبورد اخبار",
    icon: <Activity size={24} />,
    path: "/news-analytics",
    permission: "analytics",
    category: "news",
  },
  {
    id: 54,
    title: "گزارش و انتشار اخبار",
    icon: <Send size={24} />,
    path: "/news-reports",
    permission: "news_report",
    category: "news",
  },
  {
    id: 55,
    title: "کانال‌های پیام‌رسان",
    icon: <Send size={24} />,
    path: "/admin/messenger-channels",
    permission: "manage_messenger",
    category: "system",
  },
  {
    id: 56,
    title: "تنظیمات گزارش اخبار",
    icon: <FileText size={24} />,
    path: "/admin/news-report-settings",
    permission: "manage_news_reports",
    category: "system",
  },
  {
    id: 57,
    title: "فرستنده‌های ناشناس",
    icon: <Users size={24} />,
    path: "/admin/unmapped-senders",
    permission: "manage_messenger_accounts",
    category: "news",
  },
  {
    id: 10,
    title: "پردازش هوشمند اخبار",
    icon: <Cpu size={24} />,
    path: "/ai-processor",
    permission: "ai_process",
    category: "news",
  },
  {
    id: 7,
    title: "تنظیمات سیستم",
    icon: <Settings size={24} />,
    path: "/SystemSetting",
    permission: "sys_settings",
    category: "system",
  },
  {
    id: 59,
    title: "پیام‌ها",
    icon: <Bell size={24} />,
    path: "/messages",
    permission: "messages",
    category: "system",
  },
  {
    id: 61,
    title: "صدور ابلاغ",
    icon: <Megaphone size={24} />,
    path: "/messages/compose",
    permission: "manage_announcements",
    category: "system",
  },
  {
    id: 8,
    title: "داشبورد گزارشات میدانی",
    icon: <Activity size={24} />,
    path: "/field-reports-dashboard",
    permission: "analytics",
    category: "field",
  },
  {
    id: 20,
    title: "خلاصه مدیریتی میدانی",
    icon: <FileText size={24} />,
    path: "/field-management-summary",
    permission: "field_mgmt_summary",
    category: "field",
  },
  {
    id: 21,
    title: "مدیریت پرامپت‌ها",
    icon: <FileText size={24} />,
    path: "/admin/prompts",
    permission: "manage_prompts",
    category: "system",
  },
  {
    id: 22,
    title: "مدیریت API هوش مصنوعی",
    icon: <KeyRound size={24} />,
    path: "/admin/ai-api-configs",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 23,
    title: "اکشن‌های AI فرم‌ها",
    icon: <Cpu size={24} />,
    path: "/admin/ai-form-actions",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 25,
    title: "لاگ اجرای AI",
    icon: <FileText size={24} />,
    path: "/admin/ai-run-logs",
    permission: "manage_ai_api",
    category: "system",
  },
  {
    id: 24,
    title: "الگوهای پاکسازی خبر",
    icon: <FileText size={24} />,
    path: "/admin/news-clean-patterns",
    permission: "manage_prompts",
    category: "system",
  },
  {
    id: 16,
    title: BRIEF_TERMS?.menuLabel || "ارسال تحلیل کوتاه",
    icon: <FilePlus size={24} />,
    path: "/analysis/brief-submit",
    permission: "analysis_brief_submit",
    category: "analysis",
  },
  {
    id: 18,
    title: ANALYSIS_TERMS.manageAxesMenu,
    icon: <Layers size={24} />,
    path: ANALYSIS_TERMS.topicsManagementPath,
    permissions: ["analysis_propose", "analysis_topic_approve", "analysis_manage"],
    badgeKey: "approve_topics",
    category: "analysis",
  },
  {
    id: 11,
    title: ANALYSIS_TERMS.missionManagementMenu,
    icon: <Shield size={24} />,
    path: ANALYSIS_TERMS.missionsManagementPath,
    permission: "analysis_manage",
    category: "analysis",
  },
  {
    id: 17,
    title: "داشبورد تحلیل‌ها",
    icon: <BarChart3 size={24} />,
    path: "/analysis/dashboard",
    permission: "analysis_manage",
    category: "analysis",
  },
  {
    id: 12,
    title: "مأموریت‌های تحلیل من",
    icon: <FilePlus size={24} />,
    path: "/analysis/my-missions",
    permissions: ["analysis_missions", "analysis_review"],
    badgeKeys: ["my_missions", "review_queue"],
    category: "analysis",
  },
  {
    id: 70,
    title: "مرکز فرماندهی",
    icon: <Crosshair size={24} />,
    path: "/command",
    permission: "command_center",
    category: "command",
  },
  {
    id: 71,
    title: "تالار اخبار زنده",
    icon: <Radio size={24} />,
    path: "/command/live-news",
    permission: "command_live_news",
    category: "command",
  },
  {
    id: 73,
    title: "خروجی‌های راهبردی",
    icon: <ScrollText size={24} />,
    path: "/command/outputs",
    permission: "command_outputs",
    category: "command",
  },
  {
    id: 74,
    title: "پرامپت‌های راهبردی",
    icon: <FilePenLine size={24} />,
    path: "/command/prompts",
    permission: "command_manage_prompts",
    category: "command",
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

const formatBadgeCount = (n) => {
  const num = Number(n) || 0;
  if (num <= 0) return null;
  if (num > 99) return toPersianDigits("99+");
  return toPersianDigits(num);
};

export default function MainForm() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { badges } = useAnalysisMenuBadges();

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
      return { name: "...", username: "...", roles: ["user"], gender: "male" };
    }
    
    let name = "کاربر محترم";
    let username = localStorage.getItem("username") || "user";
    let gender = normalizeGender(localStorage.getItem("gender"));
    
    // ۱. بررسی وجود مشخصه نام در توکن معتبر
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded.name) name = decoded.name;
      if (decoded.username) username = decoded.username;
      if (decoded.gender) gender = normalizeGender(decoded.gender);
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
    return { name, username, roles, gender };
  });

  const welcomeGreeting = useMemo(
    () => getWelcomeGreeting(userMeta.name, userMeta.gender),
    [userMeta.name, userMeta.gender],
  );

  const [roles, setRoles] = useState(userMeta.roles);

  useEffect(() => {
    const fresh = getSessionRoles();
    setRoles(fresh);
    persistSessionRoles(fresh);
  }, []);

  const filteredActions = useMemo(() => {
    return allActions.filter((action) => {
      if (action.permissions?.length) {
        return action.permissions.some((p) => hasPermission(roles, p));
      }
      return hasPermission(roles, action.permission);
    });
  }, [roles]);

  const handleLogout = () => {
    if (window.confirm("خروج از حساب کاربری؟")) {
      logout();
    }
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
          width: ${PAGE_WIDE_CSS};
          max-width: ${PAGE_WIDE_CSS};
          margin: 0 auto;
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
        .menu-action-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.45);
          pointer-events: none;
          z-index: 1;
        }
        .action-card-button:hover {
          transform: translateY(-4px);
          filter: brightness(1.08);
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
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          font-family: inherit;
          color: var(--text-main);
          margin-bottom: 10px;
          transition: filter 0.2s ease;
        }
        .menu-category-header:hover {
          filter: brightness(1.06);
        }
        .menu-category-block {
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 14px;
          border: 1px solid transparent;
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

      <div className="loginCardWrap">
        
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
            سامانه پایش، نظارت و تحلیل اخبار
          </h2>
          
          {/* مشخصات هویتی و نقش‌های فعال کاربر جاری */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
              <NotificationBell />
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-sub)" }}>
                <User size={14} color="#38bdf8" />
                <span>
                  {welcomeGreeting.titleBefore}{" "}
                  <b>{welcomeGreeting.name}</b>{" "}
                  {welcomeGreeting.titleAfter}
                </span>
              </div>
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
        <GlobalAnnouncementBanner />
        <div className="loginCard" style={{ padding: "30px", borderRadius: "20px", direction: "rtl" }}>
          {groupedActions.map((group) => {
            const isOpen = collapsed[group.id] !== true;
            const catTheme = getCategoryTheme(group.id);
            const base = catTheme.base;
            return (
              <div
                key={group.id}
                className="menu-category-block"
                style={{
                  background: rgbaHex(base, 0.07),
                  borderColor: rgbaHex(base, 0.22),
                }}
              >
                <button
                  type="button"
                  className="menu-category-header"
                  onClick={() => toggleCategory(group.id)}
                  style={{
                    background: rgbaHex(base, 0.16),
                    borderColor: rgbaHex(base, 0.32),
                    color: base,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: base, display: "inline-block", boxShadow: `0 0 8px ${rgbaHex(base, 0.5)}` }} />
                    {group.title}
                    <span style={{ fontSize: 10, opacity: 0.75, fontWeight: "normal", color: "var(--text-main)" }}>({toPersianDigits(group.items.length)})</span>
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="menu-category-grid">
                    {group.items.map((item, idx) => {
                      const btnStyle = getActionButtonStyle(group.id, idx);
                      const badgeCount = item.badgeKeys
                        ? item.badgeKeys.reduce((sum, key) => sum + (Number(badges[key]) || 0), 0)
                        : item.badgeKey
                          ? badges[item.badgeKey]
                          : 0;
                      const badgeLabel = formatBadgeCount(badgeCount);
                      return (
                      <button
                        key={item.id}
                        className="action-card-button"
                        onClick={() => navigate(item.path)}
                        style={{
                          background: btnStyle.background,
                          border: `1px solid ${btnStyle.borderColor}`,
                          height: "110px",
                          color: "var(--text-main)",
                          "--hover-border": btnStyle.accentColor,
                          "--hover-shadow": btnStyle.hoverShadow,
                        }}
                      >
                        {badgeLabel && (
                          <span className="menu-action-badge" aria-label={`${badgeCount} مورد در انتظار`}>
                            {badgeLabel}
                          </span>
                        )}
                        <div className="icon-box" style={{ color: btnStyle.accentColor }}>{item.icon}</div>
                        <span style={{ fontSize: "12px", fontWeight: "bold", opacity: 0.95, textAlign: "center", lineHeight: 1.5 }}>{item.title}</span>
                      </button>
                      );
                    })}
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