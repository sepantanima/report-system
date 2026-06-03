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
} from "lucide-react";

// =========================================================================
// 🌟 ماتریس کنترل دسترسی‌های متمرکز و پویا (Role-Based Access Control)
// اضافه کردن هر نقش جدید یا جابجایی دسترسی‌ها صرفاً از این کادر مدیریت می‌شود
// =========================================================================
const ROLE_PERMISSIONS = {
  admin: [
    "create_report", "manage_users", "monitor_reports", "news_box", "ai_process",
    "search_reports", "sys_settings", "analytics", "analysis_process",
  ],
  analysis_manager: [
    "analysis_process", "sys_settings", "analytics",
  ],
  analyst: [
    "analysis_process", "sys_settings",
  ],
  mentor: [
    "analysis_process", "sys_settings",
  ],
  topic_proposer: [
    "analysis_process", "sys_settings",
  ],
  news_admin: [
    "news_box", "ai_process", "analytics", "sys_settings",
  ],
  Field_admin: [
    "create_report", "monitor_reports", "analytics", "sys_settings", "analysis_process",
  ],
  user: [
    "create_report", "sys_settings", "analytics",
  ],
};

// =========================================================================
// 🌟 انتقال آرایه ساختاری منوها به خارج از کامپوننت جهت حل خطای کامپایلر ری‌اکت
// متغیرهای استاتیک نباید در هر رندر درون بدنه کامپوننت بازسازی شوند
// =========================================================================
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
  },
  {
    id: 5,
    title: "کارتابل اخبار",
    icon: <LayoutDashboard size={24} />,
    color: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    accentColor: "#3b82f6",
    path: "/news-manager",
    permission: "news_box",
  },
  {
    id: 10,
    title: "پردازش هوشمند",
    icon: <Cpu size={24} />,
    color: "rgba(168, 85, 247, 0.08)",
    borderColor: "rgba(168, 85, 247, 0.25)",
    accentColor: "#a855f7",
    path: "/ai-processor",
    permission: "ai_process",
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
  },
  {
    id: 9,
    permission: "analysis_process",
    title: "مدیریت و ارزیابی تحلیل‌ها",
    icon: <FilePlus size={20} />, // آیکون دلخواه شما
    path: "/analysis-manager",
    accentColor: "#10b981", // رنگ سبز یا دلخواه شما
    borderColor: "rgba(244, 63, 94, 0.25)",
    color: "rgba(244, 63, 94, 0.08)",


}
];

// دیکودر بومی توکن JWT برای دریافت مشخصات زنده پروفایل کاربر جاری
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

// مهار و پاکسازی فرمت آرایه خام دیتابیس پستگرس و ممانعت از تکرار نقش‌ها
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

// 🌟 تابع بومی و فوق‌العاده دقیق تبدیل به فرمت درخواستی شمسی عینا مطابق با خواسته‌ی شما: [روز هفته] [عدد روز] [ماه] [سال]
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

    const roles = getParsedRoles();
    return { name, username, roles };
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const { roles } = userMeta;

  // غربال‌گری هوشمند و پویای دکمه‌ها بدون تداخل با قواعد هوک ری‌اکت
  const filteredActions = useMemo(() => {
    return allActions.filter((action) => {
      return roles.some((role) => {
        const permissions = ROLE_PERMISSIONS[role] || [];
        return permissions.includes(action.permission);
      });
    });
  }, [roles]);

  // مبدل نام انگلیسی نقش به برچسب فارسی شیک
  const getRoleLabelFa = (roleKey) => {
    if (roleKey === "admin") return "مدیر کل";
    if (roleKey === "news_admin") return "مدیر اخبار";
    return "کاربر واحد";
  };

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

        {/* بدنه و گرید منوهای کاربر */}
        <div className="loginCard" style={{ padding: "30px", borderRadius: "20px", direction: "rtl" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              gap: "15px",
              width: "100%",
            }}
          >
            {filteredActions.map((item) => (
              <button
                key={item.id}
                className="action-card-button"
                onClick={() => navigate(item.path)}
                style={{
                  background: item.color,
                  border: `1px solid ${item.borderColor}`,
                  height: "120px",
                  color: "var(--text-main)",
                  "--hover-border": item.accentColor,
                  "--hover-shadow": `${item.accentColor}33`,
                }}
              >
                <div className="icon-box" style={{ color: item.accentColor }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "bold", opacity: 0.95 }}>{item.title}</span>
              </button>
            ))}
          </div>

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