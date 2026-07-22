import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// =========================================================================
// 🌟 راهنمای فعال‌سازی ایمپورت‌ها در پروژه واقعی شما:
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
import api from "../api/api";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import DatePicker from "react-multi-date-picker";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { exportToExcel } from "../utils/excelExport";
import { buildExportFileName } from "../utils/exportDateRange";
import { buildChartTitle, buildFieldFilterLabels, formatJalaliRangeLabel } from "../utils/dashboardTitles.js";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets.js";
import { useChartContainerReady } from "../hooks/useChartContainerReady.js";
import DashboardWidget, { DashboardWidgetToolbar } from "../components/dashboard/DashboardWidget.jsx";
// ==========================================
// 🌟 بخش کامپوننت‌های بهینه‌سازی شده Recharts
// ==========================================
import {
  ResponsiveContainer, PieChart, Pie, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, Legend, CartesianGrid, LabelList
} from "recharts";

// =========================================================================

// =========================================================================
// 🛠️ شبیه‌سازها و پالی‌فیل‌ها جهت تضمین پایداری بیلد در محیط نمایش کانوس
// =========================================================================

// // شبیه‌ساز api جهت تست و پایداری در مرورگر پیش‌نویس
// const api = {
//   get: async (url, config) => {
//     if (url.includes("/provinces")) return { data: ["تهران", "خراسان رضوی", "اصفهان", "فارس"] };
//     if (url.includes("/types")) return { data: [{ id: 1, title_fa: "امنیتی" }, { id: 2, title_fa: "تجمعات" }] };
//     if (url.includes("/summary-stats")) return { data: { total_reports: 0, total_units: 0, total_provinces: 0 } };
//     if (url.includes("/filters-data")) {
//       return { 
//         data: { 
//           units: [
//             { id: 300940, name: "واحد فارس ۳۰۰۹۴۰", province: "فارس" },
//             { id: 100200, name: "واحد تهران ۱۰۰۲۰۰", province: "تهران" },
//             { id: 200300, name: "واحد اصفهان ۲۰۰۳۰۰", province: "اصفهان" }
//           ] 
//         } 
//       };
//     }
//     if (url.includes("/unit-rankings")) {
//       return {
//         data: [
//           { unitcd: 300940, unit_name: "واحد فارس ۳۰۰۹۴۰", total_reports: 45, score: 75.5, reports_per_day: 3.5, avg_quality: 4.2, avg_priority: 3.8, range_days: 12 },
//           { unitcd: 100200, unit_name: "واحد تهران ۱۰۰۲۰۰", total_reports: 30, score: 62.1, reports_per_day: 2.8, avg_quality: 4.5, avg_priority: 3.2, range_days: 12 },
//           { unitcd: 200300, unit_name: "واحد اصفهان ۲۰۰۳۰۰", total_reports: 25, score: 48.3, reports_per_day: 2.1, avg_quality: 3.8, avg_priority: 3.0, range_days: 12 }
//         ]
//       };
//     }
//     if (url.includes("/monitor")) {
//       return {
//         data: [
//           { date: "1405-02-27", chat_title: "امنیتی", value: 9, quality: 5, unitcd: 300940, UnitShortName: "واحد فارس ۳۰۰۹۴۰", priority: 3, state: "verified", cleaned_text: "گزارش نهایی از حوزه فیلد مانیتورینگ", raw_text: "متن اولیه", manager_notes: "یادداشت مدیر" },
//           { date: "1405-02-27", chat_title: "تجمعات", value: 4, quality: 3, unitcd: 300940, UnitShortName: "واحد فارس ۳۰۰۹۴۰", priority: 1, state: "pending", cleaned_text: "گزارش تجمع در میدان اصلی", raw_text: "متن تجمعات", manager_notes: "" },
//         ]
//       };
//     }
//     return { data: [] };
//   }
// };

// const useNavigate = () => (path) => console.log("Navigate to:", path);

// کامپوننت ساده شبیه‌ساز تقویم شمسی
// const DatePicker = ({ placeholder, ...props }) => (
//   <input 
//     type="text" 
//     placeholder={placeholder || "انتخاب تاریخ"} 
//     className="dark-input" 
//     style={{ width: "160px", background: "#0f172a", color: "#fff", border: "1px solid #444", borderRadius: "8px", padding: "6px" }}
//     readOnly 
//     value="۱۴۰۵-۰۲-۲۷ تا ۱۴۰۵-۰۲-۲۷"
//   />
// );
// const persian = {};
// const persian_fa = {};
//const exportToExcel = (data, filename) => console.log("Exported data to Excel file:", filename);


// توابع کمکی سراسری برای استخراج راحت شناسه و عنوان واحدها در دیتابیس
const getUnitCode = (u) => u?.UnitCode || u?.id;
const getUnitName = (u) => u?.UnitShortName || u?.name;

// تابع کمکی برای فارسی‌سازی اعداد در کل بخش‌های داشبورد
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

const toEnDigit = (s) => s?.toString().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

const getTodayFa = () => {
  try {
    const options = { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" };
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", options)
      .format(new Date())
      .replace(/\//g, "-")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵6۷۸۹"[d]);
  } catch (e) {
    console.log(e);
    return "۱۴۰۵-۰۱-۰۱";
  }
};

// دیکودر بومی توکن JWT جهت استخراج اطلاعات کاربر جاری دیتابیس بدون پیش‌فرض ثابت
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

// واکشی پروفایل زنده و جاری از سشن ذخیره‌شده مپ با کدهای فرم هدر اصلی
const getUserInfo = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    // بازگشت ساختار پایه خالی در صورت عدم وجود سشن
    return { name: "کاربر مهمان", username: "guest", role: "user", unitcd: "", statename: "" };
  }
  return decodeToken(token);
};

// --- آیکون‌های بومی SVG مانیتورینگ تحلیلی ---
const CalendarIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const FilterIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const RotateCcwIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>;
const LayoutDashboardIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>;
const BarChart3IconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const TableIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>;

const FIELD_WIDGET_DEFS = [
  { id: "stats", defaultOpen: true },
  { id: "chart", defaultOpen: false },
  { id: "qualityChart", defaultOpen: false },
  { id: "rankingsTable", defaultOpen: false },
  { id: "table", defaultOpen: false },
];

const FIELD_WIDGET_TITLES = {
  stats: "خلاصه آمار",
  chart: "نمودار توزیع موضوعی",
  qualityChart: "نمودار رتبه‌بندی عملکرد",
  rankingsTable: "جدول رتبه‌بندی عملکرد",
  table: "لیست گزارشات تفصیلی",
};

const FIELD_WIDGET_ICONS = {
  stats: LayoutDashboardIconCustom,
  chart: BarChart3IconCustom,
  qualityChart: BarChart3IconCustom,
  rankingsTable: TableIconCustom,
  table: TableIconCustom,
};
const ChevronDownIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUpIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const PrinterIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const SettingsIconCustom = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

const PRIORITY_OPTIONS = [
  { value: "5", label: "🔴 فوری (آنی)" },
  { value: "3", label: "🟡 مهم" },
  { value: "1", label: "🟢 عادی" },
];
const QUALITY_OPTIONS = [
  { value: "5", label: "⭐⭐⭐⭐⭐ ممتاز" },
  { value: "4", label: "⭐⭐⭐⭐ عالی" },
  { value: "3", label: "⭐⭐⭐ متوسط" },
  { value: "2", label: "⭐⭐ ضعیف" },
  { value: "1", label: "⭐ نامعتبر" },
];
const CLASSIFICATION_OPTIONS = [
  { value: "1", label: "🟢 عمومی" },
  { value: "2", label: "🔵 استانی" },
  { value: "3", label: "🟠 واحد" },
  { value: "4", label: "🔴 خاص" },
];
const STATUS_OPTIONS = [
  { value: "pending", label: "⏳ بررسی نشده" },
  { value: "verified", label: "✅ تایید شده" },
  { value: "rejected", label: "❌ برگشت خورده" },
];

const faJoin = (items) => {
  const arr = (items || []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return `${arr.slice(0, -1).join("، ")} و ${arr[arr.length - 1]}`;
};

export default function FieldReportDashboard() {
  const { isDarkMode: darkMode } = useAppTheme();
  const user = getUserInfo();
  
  // 🌟 متد بومی پارس و تحلیل پویای ساختارهای گوناگون نقش پستگرس (شامل آرایه‌ها، متون رشته‌ای و ماتریس نقش‌ها)
  // computeUserRoles: تابع کمکی خارج از useMemo تا از مشکلات بهینه‌سازی کامپایلر جلوگیری شود
  const computeUserRoles = (rawRole) => {
    if (!rawRole) return ["user"];

    // ۱. بررسی آرایه بودن نوع فیلد
    if (Array.isArray(rawRole)) {
      return rawRole.map((r) => r.trim()).filter(Boolean);
    }

    // ۲. بررسی وجود ساختار آرایه متنی پستگرس مانند {"admin"} یا {"admin","manager"}
    if (typeof rawRole === "string") {
      if (rawRole.includes("{") || rawRole.includes("}")) {
        const cleaned = rawRole.replace(/[{}"\s]/g, "");
        return cleaned.split(",").filter(Boolean);
      }

      // ۳. بررسی ساختار آرایه متنی JSON معمولی
      if (rawRole.startsWith("[")) {
        try {
          const parsed = JSON.parse(rawRole);
          if (Array.isArray(parsed)) {
            return parsed.map((r) => r.trim()).filter(Boolean);
          }
        } catch (e) {
          console.warn("Error parsing JSON role array in FieldMonitor", e);
        }
      }

      // ۴. بررسی وجود کاما در متن معمولی
      if (rawRole.includes(",")) {
        return rawRole.split(",").map((r) => r.trim()).filter(Boolean);
      }

      // ۵. مقدار متنی منفرد ساده
      return [rawRole.trim()];
    }

    return ["user"];
  };

  const userRoles = computeUserRoles(user?.role);
  
  // دسترسی مدیریتی سامانه: اگر کاربر ادمین یا مدیر گزارشات میدانی باشد
  const isAdminOrManager = useMemo(() => {
    return userRoles.includes("admin") || userRoles.includes("manager") || userRoles.includes("Field_admin");
  }, [userRoles]);
  
  const today = getTodayFa();

  // استیت‌های اصلی بازه زمانی
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // تنظیم خودکار مقدار اولیه فیلترها بر اساس دسترسی کاربر جاری به جای فرضیات استاتیک
  const [targetProvinces, setTargetProvinces] = useState(
    isAdminOrManager ? [] : (user?.statename ? [user.statename] : []),
  );
  const [targetUnitCds, setTargetUnitCds] = useState(
    isAdminOrManager ? [] : (user?.unitcd ? [String(user.unitcd)] : []),
  );

  const [targetPriorities, setTargetPriorities] = useState([]);
  const [targetQualities, setTargetQualities] = useState([]);
  const [targetClassifications, setTargetClassifications] = useState([]);
  const [targetStatuses, setTargetStatuses] = useState([]);
  const [showDeleted, setShowDeleted] = useState("false");
  const [dates, setDates] = useState([new Date(), new Date()]);
  const [targetTopics, setTargetTopics] = useState([]);

  const [statsData, setStatsData] = useState([]);
  const [reports, setReports] = useState([]); // داده‌های زنده واکشی شده جهت تزریق به عنوان Props به جدول
  
  // استیت مربوط به اطلاعات امتیاز رتبه‌بندی عملکرد یگان‌ها واکشی‌شده مستقیم از روت جدید بک‌باند
  const [rankingsRawData, setRankingsRawData] = useState([]);

  const [summary, setSummary] = useState({
    total_reports: 0,
    total_units: 0,
    total_provinces: 0,
    topic_summary: {},  // آمار تفکیک موضوعات در فیلتر جاری
    status_summary: {}, // آمار تفکیک وضعیت‌ها در فیلتر جاری
    priority_summary: {}, // آمار تفکیک اولویت‌ها در فیلتر جاری
    quality_summary: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },  // بهینه‌شده به ۵ ستاره زنده
    classification_summary: { 1: 0, 2: 0, 3: 0, 4: 0 }, // آمار تفکیک دامنه‌ی انتشار
  });
  const [units, setUnits] = useState([]);
  const [reportTypes, setReportTypes] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // 🌟 چیدمان ویجت‌ها — ذخیره در localStorage
  const {
    order: widgetOrder,
    open: openWidgets,
    toggle: toggleWidget,
    expandAll: expandAllWidgets,
    collapseAll: collapseAllWidgets,
    resetLayout: resetWidgetLayout,
    move: moveWidget,
  } = useDashboardWidgets("field-reports-dashboard", FIELD_WIDGET_DEFS);

  const multiSelectTheme = useMemo(() => ({ isDarkMode: darkMode }), [darkMode]);

  const provinceOptions = useMemo(
    () => [...new Set(units.map((u) => u.province || u.Province || u.StateName || u.statename).filter(Boolean))]
      .sort()
      .map((p) => ({ value: p, label: p })),
    [units],
  );

  const unitFilterOptions = useMemo(
    () => units
      .filter((u) => {
        const prov = u.province || u.Province || u.StateName || u.statename;
        return !targetProvinces.length || targetProvinces.includes(prov);
      })
      .map((u) => ({ value: String(getUnitCode(u)), label: getUnitName(u) })),
    [units, targetProvinces],
  );

  const topicOptions = useMemo(
    () => (reportTypes || []).map((t) => ({ value: t.title_fa, label: t.title_fa })),
    [reportTypes],
  );

  const buildApiFilterParams = useCallback(() => {
    const unitList = isAdminOrManager
      ? targetUnitCds.map((x) => parseInt(toEnDigit(x), 10)).filter(Number.isFinite)
      : (user?.unitcd ? [parseInt(user.unitcd, 10)] : []);
    const provinceList = isAdminOrManager
      ? targetProvinces
      : (user?.statename ? [user.statename] : []);

    const params = {
      startDate,
      endDate,
      showDeleted,
    };
    if (provinceList.length) params.provinces = provinceList.join(",");
    if (unitList.length) params.unitcds = unitList.join(",");
    if (targetTopics.length) params.topics = targetTopics.join(",");
    if (targetPriorities.length) params.priorities = targetPriorities.join(",");
    if (targetQualities.length) params.qualities = targetQualities.join(",");
    if (targetClassifications.length) params.classifications = targetClassifications.join(",");
    if (targetStatuses.length) params.states = targetStatuses.join(",");
    return params;
  }, [
    startDate, endDate, showDeleted, isAdminOrManager, user?.unitcd, user?.statename,
    targetProvinces, targetUnitCds, targetTopics, targetPriorities, targetQualities,
    targetClassifications, targetStatuses,
  ]);

  // ساخت عنوان هوشمند گزارش
  const reportTitle = useMemo(() => {
    const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

    const e2p = (s) => {
      if (s === undefined || s === null || isNaN(s)) return "";
      return s.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const cleanStr = toEnDigit(dateStr);
      const parts = cleanStr.includes("-") ? cleanStr.split("-") : cleanStr.split("/");
      if (parts.length !== 3) return cleanStr;
      const [y, m, d] = parts;
      const monthIndex = parseInt(m, 10) - 1;
      const monthName = months[monthIndex] || "نامشخص";
      return `${e2p(parseInt(d, 10))} ${monthName} ${e2p(parseInt(y, 10))}`;
    };

    const topicPart = targetTopics.length
      ? `گزارش ${faJoin(targetTopics.map((t) => `"${t}"`))}`
      : "گزارش کلی موضوعات";

    const unitNames = targetUnitCds.map((cd) => {
      const u = units.find((x) => String(getUnitCode(x)) === String(cd));
      return u ? getUnitName(u) : cd;
    });
    const unitPart = unitNames.length ? ` واحد ${faJoin(unitNames)}` : "";

    const provincePart = targetProvinces.length ? ` استان ${faJoin(targetProvinces)}` : "";
    const datePart = startDate === endDate
      ? ` در تاریخ ${formatDate(startDate)}`
      : ` از ${formatDate(startDate)} تا ${formatDate(endDate)}`;

    return `${topicPart}${unitPart}${provincePart}${datePart}`;
  }, [startDate, endDate, targetTopics, targetUnitCds, targetProvinces, units]);

  const filterLabels = useMemo(() => buildFieldFilterLabels({
    targetTopics, targetPriorities, targetStatuses, targetQualities,
    targetClassifications, targetProvinces, targetUnitCds, units,
  }), [
    targetTopics, targetPriorities, targetStatuses, targetQualities,
    targetClassifications, targetProvinces, targetUnitCds, units,
  ]);

  const dateRangeLabel = useMemo(
    () => formatJalaliRangeLabel(startDate, endDate),
    [startDate, endDate],
  );

  const chartTitleTopic = useMemo(
    () => buildChartTitle("توزیع موضوعی گزارشات", dateRangeLabel, filterLabels),
    [dateRangeLabel, filterLabels],
  );

  const chartTitleRankings = useMemo(
    () => buildChartTitle("رتبه‌بندی عملکرد یگان‌ها", dateRangeLabel, filterLabels),
    [dateRangeLabel, filterLabels],
  );

  const exportDateRange = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate],
  );

  // دریافت داده‌های تحلیلی و اعمال محاسبات ۱۰۰٪ دقیق بر مبنای فیلتر جاری (کلاینت‌ساید)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const params = buildApiFilterParams();

        const [resFilters, resTypes, monitorRes, rankingsRes] = await Promise.all([
          api.get("/reports/admin/filters-data", { params: { startDate, endDate }, headers }).catch(() => ({ data: { units: [] } })),
          api.get("/reports/types", { headers }).catch(() => ({ data: [] })),
          // فرستادن درخواست اصلی مانیتورینگ برای محاسبات زنده کلاینت
          api.get("/reports/admin/monitor", { params, headers }).catch(() => ({ data: [] })),
          // فراخوانی هوشمند و مستقیم روت جدید امتیاز رتبه‌بندی عملکرد یگان‌ها از سرور بک‌باند
          api.get("/reports/admin/unit-rankings", { params, headers }).catch(() => ({ data: [] }))
        ]);

        const rawReports = Array.isArray(monitorRes.data) ? monitorRes.data : [];
        setReports(rawReports); // ثبت داده‌های دریافتی مانیتور جهت تزریق Props به جدول کپسوله‌شده
        setUnits(resFilters.data?.units || []);
        setReportTypes(resTypes.data || []);
        
        // ذخیره خروجی رده‌بندی فیلتر شده واقعی بک‌باند در استیت سراسری
        setRankingsRawData(Array.isArray(rankingsRes.data) ? rankingsRes.data : []);

        // محاسبات خلاصه آمار دقیق کلاینت‌ساید بر مبنای فیلتر اعمال‌شده
        const uniqueUnits = new Set(rawReports.map((r) => r.unitcd).filter(Boolean));
        const uniqueProvinces = new Set(rawReports.map((r) => r.StateName || r.province).filter(Boolean));

        // ۱. محاسبه بلادرنگ تعداد گزارش‌ها بر اساس تفکیک موضوعی در فیلتر جاری
        const topicCounts = rawReports.reduce((acc, obj) => {
          const topicKey = obj.chat_title || "سایر موضوعات";
          acc[topicKey] = (acc[topicKey] || 0) + 1;
          return acc;
        }, {});

        // ۲. محاسبه بلادرنگ تعداد گزارش‌ها بر اساس وضعیت در فیلتر جاری
        const statusCounts = rawReports.reduce((acc, obj) => {
          const stateKey = obj.state || "pending";
          acc[stateKey] = (acc[stateKey] || 0) + 1;
          return acc;
        }, { pending: 0, verified: 0, rejected: 0 });

        // ۳. محاسبه تفکیک زنده بر اساس اولویت‌ها (عادی: ۱، مهم: ۳، فوری: ۵)
        const priorityCounts = rawReports.reduce((acc, obj) => {
          const pKey = String(obj.priority || 1);
          acc[pKey] = (acc[pKey] || 0) + 1;
          return acc;
        }, { 1: 0, 3: 0, 5: 0 });

        // ۴. 🌟 اصلاح محاسبات کیفی برای ۵ سطح زنده گزارشات در خلاصه آمار پورتال (۱ تا ۵ ستاره)
        const qualityCounts = rawReports.reduce((acc, obj) => {
          const qKey = String(obj.quality || 3); // در صورت خالی بودن روی ۳ ستاره متوسط رندر شود
          acc[qKey] = (acc[qKey] || 0) + 1;
          return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

        // ۵. محاسبه تفکیک زنده بر اساس دامنه‌ی انتشار (عمومی، استانی، واحد، خاص)
        const classificationCounts = rawReports.reduce((acc, obj) => {
          const cKey = String(obj.classification || 1);
          acc[cKey] = (acc[cKey] || 0) + 1;
          return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0 });

        setSummary({
          total_reports: rawReports.length,
          total_units: uniqueUnits.size,
          total_provinces: uniqueProvinces.size,
          topic_summary: topicCounts,
          status_summary: statusCounts,
          priority_summary: priorityCounts,
          quality_summary: qualityCounts,
          classification_summary: classificationCounts,
        });

        // فرمت داده‌های چارت موضوعی به صورت پویا و هماهنگ
        const formattedChartData = Object.entries(topicCounts).map(([label, value]) => ({
          name: label,
          value: value
        }));
        
        setStatsData(formattedChartData);

      } catch (error) {
        console.error("Dashboard Global Load Error:", error);
      }
    };
    loadDashboardData();
  }, [buildApiFilterParams, startDate, endDate]);

  // مپ کردن مستقیم رده‌بندی امتیازات پویا (۱۰ واحد اول برای رندر بهینه در نمودار رتبه‌بندی)
  const rankingsChartData = useMemo(() => {
    return rankingsRawData.slice(0, 10).map((item) => ({
      name: item.unit_name,
      value: item.score, // اختصاص فیلد امتیاز حاصل‌ضرب به عنوان value جهت رندر چارت
      total_reports: item.total_reports,
      reports_per_day: item.reports_per_day
    }));
  }, [rankingsRawData]);

  // 🌟 ساختار ستون‌های جدول جدید امتیاز رتبه‌بندی عملکرد یگان‌ها جهت رندر Reusable جدول (بدون محدودیت ۱۰ تایی - شامل تمامی یگان‌های فعال)
  const rankingsTableColumns = useMemo(() => [
    { key: "unit_name", title: "نام واحد سازمانی یگان", visible: true, width: 220 },
    { key: "score", title: "امتیاز شاخص عملکرد علمی (کیفیت * اولویت * ضریب فعالیت)", visible: true, width: 250 },
    { key: "reports_per_day", title: "نرخ ارسال روزانه گزارش (کل محدوده)", visible: true, width: 180 },
    { key: "total_reports", title: "تعداد کل گزارش‌ها", visible: true, width: 150 },
    { key: "range_days", title: "تعداد روز کل محدوده", visible: true, width: 130 },
    { key: "avg_quality", title: "میانگین کیفیت گزارشات", visible: true, width: 150 },
    { key: "avg_priority", title: "میانگین اولویت گزارشات", visible: true, width: 150 },
  ], []);

  const theme = {
    bg: darkMode ? "#0f172a" : "#f8fafc",
    text: darkMode ? "#f1f5f9" : "#1e293b",
    card: darkMode ? "#1e293b" : "#ffffff",
    border: darkMode ? "#334155" : "#e2e8f0",
    input: darkMode ? "#0f172a" : "#fff",
  };

  // fields های جدول تفصیلی گزارشات مانیتورینگ
  const tableColumns = useMemo(() => [
    { key: "date", title: "تاریخ ثبت", visible: true, width: 90 },
    { key: "chat_title", title: "موضوع", visible: true, width: 110 },
    { key: "priority", title: "اولویت/اهمیت", visible: true, width: 95 }, 
    { key: "classification", title: "دامنه‌ی انتشار", visible: true, width: 100 }, 
    { key: "state", title: "وضعیت", visible: true, width: 95 }, 
    { key: "quality", title: "کیفیت گزارش", visible: true, width: 110 }, // ستون کیفیت ۵ ستاره
    { key: "UnitShortName", title: "واحد یگان", visible: true, width: 120 }, 
    { key: "cleaned_text", title: "متن نهایی", visible: true, width: 250 }, 
    { key: "raw_text", title: "متن خام ارسالی یگان", visible: true, width: 250 }, 
    { key: "manager_notes", title: "یادداشت مدیریت", visible: true, width: 200 }, 
    { key: "StateName", title: "استان", visible: true, width: 120 },
    { key: "sender_name", title: "فرستنده", visible: true, width: 100 },
  ], []);

  return (
    <FormPageLayout
      title="داشبورد گزارشات میدانی"
      wide
      contentPadding="15px 15px 32px"
    >
      <div style={{ ...styles.filterCard, backgroundColor: theme.card, borderColor: theme.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
          <div style={styles.datePickerWrapper}>
            <CalendarIconCustom />
            <ThemedDatePicker
              isDarkMode={darkMode}
              value={dates}
              onChange={(dateObjects) => {
                setDates(dateObjects);
                if (dateObjects?.length === 2) {
                  setStartDate(toEnDigit(dateObjects[0].format("YYYY-MM-DD")));
                  setEndDate(toEnDigit(dateObjects[1].format("YYYY-MM-DD")));
                }
              }}
              range
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              placeholder="انتخاب بازه زمانی"
            />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{ ...styles.advFilterBtn, background: showFilters ? "#ef4444" : "#3b82f6" }}
            >
              <FilterIconCustom /> {showFilters ? "بستن فیلتر" : "فیلتر پیشرفته"}
            </button>

            <button
              onClick={() => {
                setTargetTopics([]);
                setTargetPriorities([]);
                setTargetStatuses([]);
                setTargetQualities([]);
                setTargetClassifications([]);
                setShowDeleted("false");
                if (isAdminOrManager) {
                  setTargetUnitCds([]);
                  setTargetProvinces([]);
                }
              }}
              style={styles.resetBtn}
            >
              <RotateCcwIconCustom /> ریست فیلتر
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={styles.drawer}>
            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>استان (چندانتخابی):</label>
              <MultiSelect
                options={isAdminOrManager ? provinceOptions : provinceOptions.filter((o) => targetProvinces.includes(o.value))}
                values={targetProvinces}
                onChange={(vals) => {
                  setTargetProvinces(vals);
                  if (vals.length) {
                    setTargetUnitCds((prev) => prev.filter((cd) => {
                      const u = units.find((x) => String(getUnitCode(x)) === String(cd));
                      const prov = u?.province || u?.Province || u?.StateName || u?.statename;
                      return vals.includes(prov);
                    }));
                  }
                }}
                placeholder="همه استان‌ها"
                disabled={!isAdminOrManager}
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>واحد (چندانتخابی):</label>
              <MultiSelect
                options={isAdminOrManager ? unitFilterOptions : unitFilterOptions.filter((o) => targetUnitCds.includes(o.value))}
                values={targetUnitCds}
                onChange={setTargetUnitCds}
                placeholder="همه واحدها"
                disabled={!isAdminOrManager}
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>موضوع (چندانتخابی):</label>
              <MultiSelect
                options={topicOptions}
                values={targetTopics}
                onChange={setTargetTopics}
                placeholder="همه موضوعات"
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>اولویت (چندانتخابی):</label>
              <MultiSelect
                options={PRIORITY_OPTIONS}
                values={targetPriorities}
                onChange={setTargetPriorities}
                placeholder="همه اولویت‌ها"
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>کیفیت گزارش (چندانتخابی):</label>
              <MultiSelect
                options={QUALITY_OPTIONS}
                values={targetQualities}
                onChange={setTargetQualities}
                placeholder="همه کیفیت‌ها"
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>دامنه‌ی انتشار (چندانتخابی):</label>
              <MultiSelect
                options={CLASSIFICATION_OPTIONS}
                values={targetClassifications}
                onChange={setTargetClassifications}
                placeholder="همه دامنه‌ها"
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>وضعیت بررسی (چندانتخابی):</label>
              <MultiSelect
                options={STATUS_OPTIONS}
                values={targetStatuses}
                onChange={setTargetStatuses}
                placeholder="همه موارد"
                theme={multiSelectTheme}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.labelWithIcon}>نمایش گزارشات:</label>
              <select
                value={showDeleted}
                onChange={(e) => setShowDeleted(e.target.value)}
                style={{ ...styles.select, backgroundColor: theme.input, color: theme.text }}
              >
                <option value="false">🔹 حذف نشده‌ها</option>
                <option value="true">🚫 فقط حذفیات</option>
                <option value="all">🌐 نمایش همه</option>
              </select>
            </div>
          </div>
        )}
        <div style={styles.reportTitleDisplay}>{toPersianDigits(reportTitle)}</div>
      </div>

      <DashboardWidgetToolbar
        onExpandAll={expandAllWidgets}
        onCollapseAll={collapseAllWidgets}
        onReset={resetWidgetLayout}
        theme={theme}
      />

      {widgetOrder.map((wid, idx) => {
        const Icon = FIELD_WIDGET_ICONS[wid];
        const title = wid === "rankingsTable"
          ? `${FIELD_WIDGET_TITLES[wid]} (${toPersianDigits(rankingsRawData.length)} واحد واجد شرایط)`
          : FIELD_WIDGET_TITLES[wid];

        let body = null;
        if (wid === "stats") {
          body = (
            <>
              <div style={styles.statsGrid}>
                <StatBox label="تعداد گزارش" value={toPersianDigits(summary.total_reports)} color="#3b82f6" />
                <StatBox label="واحدهای فعال" value={toPersianDigits(summary.total_units)} color="#10b981" />
                <StatBox label="استان‌های درگیر" value={toPersianDigits(summary.total_provinces)} color="#f59e0b" />
              </div>
              {summary.total_reports > 0 && (
                <div style={{ ...styles.detailedStatsRow, borderTop: `1px dashed ${theme.border}` }}>
                  <div style={styles.statsSubSectionGrid}>
                    <div style={styles.detailedStatsCol}>
                      <strong style={{ color: "#38bdf8", fontSize: "11.5px", display: "block", marginBottom: "8px" }}>📊 وضعیت بررسی:</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={styles.detailedBadgeSimple}>⏳ بررسی نشده: {toPersianDigits(summary.status_summary.pending || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#10b981" }}>✅ تایید شده: {toPersianDigits(summary.status_summary.verified || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#ef4444" }}>❌ برگشت خورده: {toPersianDigits(summary.status_summary.rejected || 0)}</span>
                      </div>
                    </div>
                    <div style={styles.detailedStatsCol}>
                      <strong style={{ color: "#ef4444", fontSize: "11.5px", display: "block", marginBottom: "8px" }}>🚨 اولویت و فوریت:</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#ef4444" }}>🔴 فوری (آنی): {toPersianDigits(summary.priority_summary["5"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#f59e0b" }}>🟡 مهم: {toPersianDigits(summary.priority_summary["3"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#10b981" }}>🟢 عادی: {toPersianDigits(summary.priority_summary["1"] || 0)}</span>
                      </div>
                    </div>
                    <div style={styles.detailedStatsCol}>
                      <strong style={{ color: "#fb923c", fontSize: "11.5px", display: "block", marginBottom: "8px" }}>⭐ کیفیت گزارش‌ها (۵ سطح زنده):</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#22c55e" }}>⭐⭐⭐⭐⭐ ممتاز: {toPersianDigits(summary.quality_summary["5"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#3b82f6" }}>⭐⭐⭐⭐ عالی: {toPersianDigits(summary.quality_summary["4"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#eab308" }}>⭐⭐⭐ متوسط: {toPersianDigits(summary.quality_summary["3"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#f97316" }}>⭐⭐ ضعیف: {toPersianDigits(summary.quality_summary["2"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#ef4444" }}>⭐ نامعتبر: {toPersianDigits(summary.quality_summary["1"] || 0)}</span>
                      </div>
                    </div>
                    <div style={styles.detailedStatsCol}>
                      <strong style={{ color: "#38bdf8", fontSize: "11.5px", display: "block", marginBottom: "8px" }}>🛡️ دامنه‌ی انتشار:</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#10b981" }}>🟢 عمومی: {toPersianDigits(summary.classification_summary["1"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#3b82f6" }}>🔵 استانی: {toPersianDigits(summary.classification_summary["2"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#f59e0b" }}>🟠 واحد: {toPersianDigits(summary.classification_summary["3"] || 0)}</span>
                        <span style={{ ...styles.detailedBadgeSimple, color: "#ef4444" }}>🔴 خاص: {toPersianDigits(summary.classification_summary["4"] || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...styles.detailedStatsCol, marginTop: "14px", borderTop: `1px dotted ${theme.border}`, paddingTop: "10px" }}>
                    <strong style={{ color: "#fb923c", fontSize: "11.5px", display: "block", marginBottom: "8px" }}>📋 تعداد به تفکیک موضوعات در فیلتر جاری:</strong>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {Object.entries(summary.topic_summary).map(([topic, count]) => (
                        <span key={topic} style={{ ...styles.detailedBadge, borderColor: "#475569", color: "#94a3b8" }}>
                          {topic}: {toPersianDigits(count)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        } else if (wid === "chart") {
          body = (
            <StatChart data={statsData} title={chartTitleTopic} isDarkMode={darkMode} defaultChartType="verticalBar" defaultInnerRadius={35} />
          );
        } else if (wid === "qualityChart") {
          body = (
            <StatChart
              data={rankingsChartData}
              title={chartTitleRankings}
              isDarkMode={darkMode}
              defaultChartType="verticalBar"
              defaultInnerRadius={35}
            />
          );
        } else if (wid === "rankingsTable") {
          body = rankingsRawData.length > 0 ? (
            <ReportTable
              columns={rankingsTableColumns}
              data={rankingsRawData}
              isDarkMode={darkMode}
              units={units}
              dynamicTitle={`جدول رتبه‌بندی عملکرد — ${dateRangeLabel}`}
              exportBaseName="رتبه‌بندی-عملکرد"
              exportDateRange={exportDateRange}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "10px", color: darkMode ? "#cbd5e1" : "#475569" }}>داده‌ای جهت رتبه‌بندی یافت نشد. بازه را فیلتر کنید.</div>
          );
        } else if (wid === "table") {
          body = (
            <ReportTable
              columns={tableColumns}
              data={reports}
              isDarkMode={darkMode}
              units={units}
              dynamicTitle={reportTitle}
              exportBaseName="لیست-گزارشات"
              exportDateRange={exportDateRange}
            />
          );
        }

        return (
          <DashboardWidget
            key={wid}
            title={title}
            icon={Icon ? <Icon /> : null}
            isOpen={!!openWidgets[wid]}
            onToggle={() => toggleWidget(wid)}
            theme={theme}
            onMoveUp={idx > 0 ? () => moveWidget(wid, "up") : undefined}
            onMoveDown={idx < widgetOrder.length - 1 ? () => moveWidget(wid, "down") : undefined}
          >
            {body}
          </DashboardWidget>
        );
      })}

      <style>{`
        .dark-input, .light-input { padding: 8px; border-radius: 8px; border: 1px solid #444; width: 210px; text-align: center; font-family: inherit; font-size: 13px; }
        .dark-input { background: #0f172a; color: #fff; }
        .light-input { background: #fff; color: #000; }
        
        /* حل قطعی مشکل عدم خوانایی گزینه‌های داخل منوهای کشویی در تم تیره مرورگرها */
        select option {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
        }
        
        .light-input option,
        select.light-input option {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }
        
        /* 🌟 ملیح‌سازی و خوشگل‌تر کردن دکمه‌ها در کل داشبورد */
        button, select {
          transition: all 0.2s ease-in-out;
        }
        
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15);
        }
        
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </FormPageLayout>
  );
}

// ==========================================
// ۲. کامپوننت نمودار تحلیلی پیشرفته (StatChart) - کاملاً Reusable و بهینه‌سازی شده
// ==========================================
const CHART_COLORS = ["#38bdf8", "#10b981", "#fb923c", "#ef4444", "#a855f7", "#ec4899"];
const COLOR_PALETTES = {
  default: ["#38bdf8", "#10b981", "#fb923c", "#ef4444", "#a855f7", "#ec4899"],
  warm: ["#f43f5e", "#f97316", "#eab308", "#ec4899", "#d946ef", "#fae8ff"],
  cool: ["#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#6366f1", "#4f46e5"],
  alert: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#fca5a5"] 
};

function StatChart({ data, title, isDarkMode, defaultChartType = "verticalBar", defaultInnerRadius = 35 }) {
  const [settings, setSettings] = useState({
    chartType: defaultChartType,
    displayMode: "both",
    legendVertical: "bottom",
    legendAlign: "center",
    showLegend: defaultChartType === "pie",
    labelRotation: 0,
    innerRadius: defaultInnerRadius,
    palette: "default",
    sortBy: "desc",
    showGrid: true,
    showLabelsOnChart: defaultChartType !== "pie",
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [containerRef, chartReady] = useChartContainerReady(`${defaultChartType}-${data?.length}-${title}`);

  const update = (key, val) => setSettings((p) => ({ ...p, [key]: val }));

  // 🌟 مهار قطعی هوک‌ها: اول تمام هوک‌های سراسری و useMemo را تعریف می‌کنیم و هیچ دستور شرطی یا بازگشت زودهنگام قبل از آن‌ها قرار نمی‌دهیم
  const totalSum = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [data]);

  const processedData = useMemo(() => {
    if (!data) return [];
    let result = [...data];
    if (settings.sortBy === "desc") {
      result.sort((a, b) => b.value - a.value);
    } else if (settings.sortBy === "asc") {
      result.sort((a, b) => a.value - b.value);
    }
    return result;
  }, [data, settings.sortBy]);

  // بازگشت‌های رندری در صورت خالی بودن داده‌ها بعد از تمام تعاریف هوک قرار می‌گیرند تا قوانین هوک ری‌اکت نقض نشود
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: isDarkMode ? "#ccc" : "#666", fontSize: "11px" }}>
        داده‌ای یافت نشد.
      </div>
    );
  }

  const nameKey = data[0]?.name ? "name" : "label";
  const colors = COLOR_PALETTES[settings.palette] || COLOR_PALETTES.default;

  // قالب‌بندی متون راهنما و برچسب‌های آماری
  const formatLabelText = (name, value) => {
    const percentage = totalSum > 0 ? ((value / totalSum) * 100).toFixed(0) : "0";
    if (settings.displayMode === "count") {
      return `${name} (${toPersianDigits(value)})`;
    }
    if (settings.displayMode === "percent") {
      return `${name} (${toPersianDigits(percentage)}٪)`;
    }
    return `${name} (${toPersianDigits(value)} - ${toPersianDigits(percentage)}٪)`;
  };

  const handlePrint = () => {
    const content = containerRef.current?.innerHTML || "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>چاپ نمودار - ${title}</title>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; } }
            body { direction: rtl; font-family: 'Tahoma', sans-serif; text-align: center; padding: 20px; color: #000 !important; background: #fff !important; }
            /* 🌟 ترازبندی کاملاً متمرکز و قرارگیری در وسط صفحه چاپی */
            .print-center-container {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              width: 100% !important;
              margin: 0 auto !important;
            }
            svg { max-width: 100%; height: auto !important; margin: 0 auto !important; display: block !important; }
            .recharts-text { fill: #000 !important; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2 style="margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; text-align: center;">${toPersianDigits(title)}</h2>
          <div class="print-center-container" style="width:100%">${content}</div>
          <p style="margin-top: 20px; font-size: 10px; color: #666; text-align: center;">گزارش استخراج شده از سامانه تحلیل هوشمند</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ width: "100%", direction: "rtl", fontFamily: "Tahoma" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h4 style={{ color: isDarkMode ? "#fff" : "#333", fontSize: "0.8rem", margin: 0, opacity: 0.9 }}>
          {toPersianDigits(title)}
        </h4>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setIsOpen(!isOpen)} style={{ ...styles.iconBtn, color: isDarkMode ? "#fff" : "#000" }} title="تنظیمات">
            <SettingsIconCustom />
          </button>
          <button onClick={() => setSettings(p => ({ ...p, chartType: defaultChartType, showLegend: false, innerRadius: defaultInnerRadius, palette: "default" }))} style={{ ...styles.iconBtn, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }} title="پیش‌فرض">
            <RotateCcwIconCustom />
          </button>
          <button onClick={handlePrint} style={{ ...styles.iconBtn, color: isDarkMode ? "#fff" : "#000" }} title="چاپ نمودار">
            <PrinterIconCustom />
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ ...styles.settingsPanel, backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9", color: isDarkMode ? "#f1f5f9" : "#1e293b", borderColor: isDarkMode ? "#334155" : "#cbd5e1" }}>
          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>نوع نمودار آماری:</label>
            <select value={settings.chartType} onChange={(e) => update("chartType", e.target.value)} style={styles.select}>
              <option value="pie">دایره‌ای تفکیکی (Pie Chart)</option>
              <option value="verticalBar">ستونی عمودی (Vertical Bar)</option>
              <option value="horizontalBar">ستونی افقی (Horizontal Bar)</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>نحوه نمایش مقادیر:</label>
            <select value={settings.displayMode} onChange={(e) => update("displayMode", e.target.value)} style={styles.select}>
              <option value="count">نمایش مقادیر عددی</option>
              <option value="percent">نمایش سهم درصد (٪)</option>
              <option value="both">نمایش هردو همزمان</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>مرتب‌سازی داده‌ها:</label>
            <select value={settings.sortBy} onChange={(e) => update("sortBy", e.target.value)} style={styles.select}>
              <option value="none">ترتیب پیش‌فرض</option>
              <option value="desc">بیشترین به کمترین (نزولی)</option>
              <option value="asc">کمترین به بیشترین (صعودی)</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>پالت رنگی نمودار:</label>
            <select value={settings.palette} onChange={(e) => update("palette", e.target.value)} style={styles.select}>
              <option value="default">سازمانی رنگارنگ</option>
              <option value="warm">طیف گرم (روشن)</option>
              <option value="cool">طیف سرد (آرامش‌بخش)</option>
              <option value="alert">طیف هشدار (سرخ حفاظتی)</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>چرخش برچسب‌ها (عمودی):</label>
            <select value={settings.labelRotation} onChange={(e) => update("labelRotation", parseInt(e.target.value))} style={styles.select} disabled={settings.chartType === "horizontalBar"}>
              <option value="0">بدون چرخش (۰ درجه)</option>
              <option value="-30">زاویه ملایم (۳۰- درجه)</option>
              <option value="-45">کج (۴۵- درجه)</option>
              <option value="-90">کامل عمودی (۹۰- درجه)</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>ضخامت مرکز دایره (برش):</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="range" min="0" max="80" value={settings.innerRadius} onChange={(e) => update("innerRadius", parseInt(e.target.value))} disabled={settings.chartType !== "pie"} style={{ flex: 1 }} />
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>{toPersianDigits(settings.innerRadius)}٪</span>
            </div>
          </div>

          {/* چک‌باکس‌های کنترل المان‌ها */}
          <div style={{ ...styles.settingItem, gridColumn: "1 / -1", display: "flex", flexDirection: "row", gap: "20px", borderTop: "1px dashed rgba(148,163,184,0.15)", paddingTop: "10px", marginTop: "5px" }}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={settings.showLegend} onChange={(e) => update("showLegend", e.target.checked)} />
              نمایش راهنمای رنگ‌ها (Legend)
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={settings.showGrid} onChange={(e) => update("showGrid", e.target.checked)} disabled={settings.chartType === "pie"} />
              نمایش خطوط شطرنجی پس‌زمینه
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={settings.showLabelsOnChart} onChange={(e) => update("showLabelsOnChart", e.target.checked)} />
              نمایش برچسب مقادیر روی بدنه نمودار
            </label>
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ height: "400px", width: "100%", position: "relative", minHeight: "400px", minWidth: 0 }}>
        {chartReady ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
          {settings.chartType === "pie" ? (
            <PieChart margin={{ top: 10, right: 80, bottom: 10, left: 80 }}>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                innerRadius={`${settings.innerRadius}%`}
                outerRadius="62%"
                dataKey="value"
                nameKey={nameKey}
                labelLine={{ stroke: isDarkMode ? "#64748b" : "#94a3b8", strokeWidth: 1 }}
                label={settings.showLabelsOnChart ? (() => {
                  const fill = isDarkMode ? "#e2e8f0" : "#334155";
                  return ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
                    if (!value) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 22;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    const pct = percent != null ? `${toPersianDigits(Math.round(percent * 100))}٪` : "";
                    return (
                      <text x={x} y={y} fill={fill} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fontWeight={600}>
                        {`${name} (${toPersianDigits(value)}${pct ? ` · ${pct}` : ""})`}
                      </text>
                    );
                  };
                })() : false}
              >
                {processedData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? "#1e293b" : "#fff", color: isDarkMode ? "#fff" : "#000", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }} formatter={(v, name) => [toPersianDigits(v), name]} />
              {settings.showLegend && <Legend verticalAlign={settings.legendVertical} align={settings.legendAlign} />}
            </PieChart>
          ) : settings.chartType === "horizontalBar" ? (
            <BarChart data={processedData} layout="vertical" margin={{ left: 30, right: 30, top: 15, bottom: 5 }}>
              {settings.showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"} />}
              <XAxis type="number" tick={{ fontSize: 10, fill: isDarkMode ? "#cbd5e1" : "#475569" }} tickFormatter={(v) => toPersianDigits(v)} />
              <YAxis dataKey={nameKey} type="category" width={110} tick={{ fontSize: 10, fill: isDarkMode ? "#cbd5e1" : "#475569" }} />
              <Tooltip cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }} contentStyle={{ backgroundColor: isDarkMode ? "#1e293b" : "#fff", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }} formatter={(v) => toPersianDigits(v)} />
              {settings.showLegend && <Legend verticalAlign={settings.legendVertical} align={settings.legendAlign} />}
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {processedData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
                {settings.showLabelsOnChart && (
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    style={{ fill: isDarkMode ? "#cbd5e1" : "#475569", fontSize: 10, fontWeight: "bold" }} 
                    formatter={(v) => toPersianDigits(v)} 
                  />
                )}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={processedData} margin={{ bottom: 50, top: 20 }}>
              {settings.showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"} />}
              <XAxis 
                dataKey={nameKey} 
                angle={settings.labelRotation} 
                interval={0} 
                textAnchor="end" 
                height={90}
                dx={-5}
                dy={12}
                tick={{ fontSize: 10, fill: isDarkMode ? "#cbd5e1" : "#475569" }} 
              />
              <YAxis tick={{ fontSize: 11, fill: isDarkMode ? "#cbd5e1" : "#475569" }} tickFormatter={(v) => toPersianDigits(v)} />
              <Tooltip cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }} contentStyle={{ backgroundColor: isDarkMode ? "#1e293b" : "#fff", borderRadius: "8px" }} formatter={(v) => toPersianDigits(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {processedData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
                {settings.showLabelsOnChart && (
                  <LabelList dataKey="value" position="top" style={{ fill: isDarkMode ? "#fff" : "#000", fontSize: 10 }} formatter={(v) => toPersianDigits(v)} />
                )}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

// ==========================================
// ۳. کامپوننت جدول تفصیلی گزارشات (ReportTable) - کاملاً Reusable و کپسوله شده
// ==========================================
function ReportTable({
  columns,
  data,
  isDarkMode,
  units,
  dynamicTitle,
  exportBaseName = "گزارش",
  exportDateRange,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // استیت محلی نگهداری ستون‌ها به صورت پویای چک‌باکس با کپی گرفتن از props
  const [columnConfig, setColumnConfig] = useState(columns);

  // به روزرسانی تنظیم ستون‌ها در صورت تغییر ورودی بالا
  useEffect(() => {
    setColumnConfig(columns);
  }, [columns]);

  const getSafeFileName = (name) => name.replace(/[\\/:*?"<>|]/g, "").trim();

  // استخراج مقدار خام با تطبیق فیلدهای دیتابیس
  const getRawValue = (report, key) => {
    if (key === "state") {
      return report.state === "verified" ? "تایید شده" : (report.state === "rejected" ? "برگشت خورده" : "بررسی نشده");
    }
    if (key === "priority") {
      const p = String(report.priority);
      return p === "5" ? "فوری" : p === "3" ? "مهم" : "عادی";
    }
    // استخراج برچسب دامنه‌ی انتشار (عمومی/استانی/واحد/خاص)
    if (key === "classification") {
      const c = parseInt(report.classification, 10);
      if (c === 4) return "خاص";
      if (c === 3) return "واحد";
      if (c === 2) return "استانی";
      return "عمومی";
    }
    // استخراج و نمایش بصری ۵ رده کیفیت جدید در جدول کپسوله‌شده
    if (key === "quality") {
      const q = parseInt(report.quality, 10);
      if (q === 5) return "⭐⭐⭐⭐⭐ ممتاز";
      if (q === 4) return "⭐⭐⭐⭐ عالی";
      if (q === 3) return "⭐⭐⭐ متوسط";
      if (q === 2) return "⭐⭐ ضعیف";
      return "⭐ نامعتبر (بسیار ضعیف)";
    }
    // استخراج و نمایش هوشمند نام یگان برای خانه‌های جدول با نگاشت کدهای عددی
    if (key === "UnitShortName") {
      const uObj = units.find((u) => getUnitCode(u) == report.unitcd);
      return uObj ? getUnitName(uObj) : (report.UnitShortName || report.unitcd || "---");
    }
    return report[key] || "---";
  };

  // 🌟 ترازبندی، مصورسازی و رنگ‌آمیزی سلول‌های جدول مجهز به useCallback جهت رفع هشدار کامپایلر
  const renderCellVisual = useCallback((report, key) => {
    const val = getRawValue(report, key);
    if (key === "state") {
      const isVerified = report.state === "verified";
      const isRejected = report.state === "rejected";
      return (
        <span style={{ color: isVerified ? "#10b981" : (isRejected ? "#ef4444" : "#f59e0b"), fontWeight: "bold" }}>
          {isVerified ? "✅ تایید شده" : (isRejected ? "❌ برگشت خورده" : "⏳ بررسی نشده")}
        </span>
      );
    }
    if (key === "priority") {
      const p = String(report.priority);
      const color = p === "5" ? "#ef4444" : p === "3" ? "#f59e0b" : "#10b981";
      return (
        <span style={{ color, fontWeight: "bold" }}>
          {p === "5" ? "🔴 فوری" : p === "3" ? "🟡 مهم" : "🟢 عادی"}
        </span>
      );
    }
    // رندر رنگی دامنه‌ی انتشار در جدول تفصیلی
    if (key === "classification") {
      const c = parseInt(report.classification, 10);
      let color = "#10b981";
      let label = "🟢 عمومی";
      if (c === 2) { color = "#3b82f6"; label = "🔵 استانی"; }
      if (c === 3) { color = "#f59e0b"; label = "🟠 واحد"; }
      if (c === 4) { color = "#ef4444"; label = "🔴 خاص"; }
      return (
        <span style={{ color, fontWeight: "bold", fontSize: "11px" }}>
          {label}
        </span>
      );
    }
    // رندر رنگی و ستاره‌دار کیفیت جدید در پورتال اصلی جدول تفصیلی
    if (key === "quality") {
      const q = parseInt(report.quality, 10);
      let color = "#cbd5e1";
      if (q === 5) color = "#22c55e"; // سبز ممتاز
      if (q === 4) color = "#3b82f6"; // آبی عالی
      if (q === 3) color = "#eab308"; // زرد متوسط
      if (q === 2) color = "#f97316"; // نارنجی ضعیف
      if (q === 1) color = "#ef4444"; // قرمز نامعتبر

      return (
        <span style={{ color, fontWeight: "bold", fontSize: "11px" }}>
          {val}
        </span>
      );
    }
    return toPersianDigits(val);
  }, [units]);

  const sortedReports = useMemo(() => {
    let result = data.filter((r) =>
      Object.values(r).some((v) =>
        String(v || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aV = getRawValue(a, sortConfig.key);
        const bV = getRawValue(b, sortConfig.key);
        if (aV < bV) return sortConfig.direction === "asc" ? -1 : 1;
        if (aV > bV) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, searchTerm, sortConfig, units]);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedReports.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedReports]);

  const handleExport = () => {
    const visibleCols = columnConfig.filter((c) => c.visible);
    const dataForExcel = sortedReports.map((report) => {
      const row = {};
      visibleCols.forEach((col) => {
        row[col.title] = getRawValue(report, col.key);
      });
      return row;
    });

    if (dataForExcel.length === 0) return alert("داده‌ای برای خروجی وجود ندارد.");
    const fileName = exportDateRange
      ? buildExportFileName(exportBaseName, exportDateRange)
      : `${getSafeFileName(dynamicTitle)}.xlsx`;
    exportToExcel(dataForExcel, fileName);
  };

  const handlePrint = () => {
    const visibleCols = columnConfig.filter((c) => c.visible);
    const safeFileName = getSafeFileName(dynamicTitle);

    const rowsHtml = sortedReports
      .map((r, i) => `
        <tr>
          <td style="text-align:center; width: 40px;">${toPersianDigits(i + 1)}</td>
          ${visibleCols
            .map((c) => {
              const text = getRawValue(r, c.key);
              const isJustify = ["manager_notes", "cleaned_text", "raw_text"].includes(c.key);
              return `<td style="text-align:${isJustify ? "justify" : "center"}">${toPersianDigits(text)}</td>`;
            })
            .join("")}
        </tr>`
      )
      .join("");

    const printWin = window.open("", "_blank");
    printWin.document.write(`
    <html>
      <head>
        <title>${safeFileName}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { direction: rtl; font-family: 'Tahoma', 'Arial', sans-serif; font-size: 10px; padding: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 8px; word-wrap: break-word; vertical-align: top; }
          th { background: #f2f2f2; font-weight: bold; }
          h2 { text-align: center; margin-bottom: 20px; font-size: 16px; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <h2>${toPersianDigits(dynamicTitle)}</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">ردیف</th>
              ${visibleCols.map((c) => `<th>${c.title}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>`);
    printWin.document.close();
  };

  return (
    <div style={{ ...styles.wrapper, backgroundColor: isDarkMode ? "#1e293b" : "#fff", color: isDarkMode ? "#fff" : "#000" }}>
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="جستجو در تمام فیلدها..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...styles.input, backgroundColor: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#fff" : "#000" }}
        />

        <div style={styles.actions}>
          {/* 🌟 دکمه اکسل مدرن و لطیف */}
          <button onClick={handleExport} style={styles.btnExcel} title="دریافت فایل اکسل">
            <span className="btn-text">📊 اکسل</span>
          </button>

          {/* 🌟 دکمه چاپ مدرن و لطیف */}
          <button onClick={handlePrint} style={styles.btnPrint} title="چاپ لیست تفصیلی">
            <span className="btn-text">🖨️ چاپ</span>
          </button>

          <button onClick={() => setShowColumnSettings(!showColumnSettings)} style={styles.btnSec} title="تنظیم ستون‌های جدول">
            <SettingsIconCustom />
          </button>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ ...styles.select, backgroundColor: isDarkMode ? "#0f172a" : "#fff", color: isDarkMode ? "#fff" : "#000" }}
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>{toPersianDigits(v)} ردیف</option>
            ))}
          </select>
        </div>
      </div>

      {showColumnSettings && (
        <div style={styles.settingsPanel}>
          {columnConfig.map((col, idx) => (
            <label key={col.key} style={{ fontSize: "11px", cursor: "pointer", display: "flex", gap: "4px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() =>
                  setColumnConfig((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, visible: !c.visible } : c))
                  )
                }
              />
              {col.title}
            </label>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #334155", borderRadius: "8px" }}>
        <table style={styles.table}>
          <thead>
            <tr style={{ backgroundColor: isDarkMode ? "#0f172a" : "#f5f5f5" }}>
              <th style={{ width: "45px", padding: "12px", border: "1px solid #334155" }}>ردیف</th>
              {columnConfig.map(
                (col) =>
                  col.visible && (
                    <th key={col.key} style={{ ...styles.th, width: `${col.width}px`, border: "1px solid #334155" }}>
                      <span
                        onClick={() =>
                          setSortConfig((prev) => ({
                            key: col.key,
                            direction: prev.key === col.key && prev.direction === "asc" ? "desc" : "asc",
                          }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        {col.title}{" "}
                        {sortConfig.key === col.key ? (sortConfig.direction === "asc" ? "🔼" : "🔽") : ""}
                      </span>
                    </th>
                  )
              )}
            </tr>
          </thead>
          <tbody>
            {currentData.map((report, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ ...styles.td, border: "1px solid #334155", textAlign: "center" }}>
                  {toPersianDigits((currentPage - 1) * itemsPerPage + idx + 1)}
                </td>
                {columnConfig.map(
                  (col) =>
                    col.visible && (
                      <td
                        key={col.key}
                        style={{
                          ...styles.td,
                          border: "1px solid #334155",
                          textAlign: ["manager_notes", "cleaned_text", "raw_text"].includes(col.key) ? "justify" : "center",
                        }}
                      >
                        {renderCellVisual(report, col.key)}
                      </td>
                    )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        {/* 🌟 دکمه‌های صفحه‌بندی لطیف، جمع‌وجور و بسیار شیک با پدینگ و هاور متقارن */}
        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} style={styles.pageBtn}>
          قبلی
        </button>
        <span style={{ fontSize: "12px", color: isDarkMode ? "#cbd5e1" : "#475569" }}>
          صفحه {toPersianDigits(currentPage)} از {toPersianDigits(Math.ceil(sortedReports.length / itemsPerPage) || 1)}
        </span>
        <button
          disabled={currentPage >= Math.ceil(sortedReports.length / itemsPerPage)}
          onClick={() => setCurrentPage((p) => p + 1)}
          style={styles.pageBtn}
        >
          بعدی
        </button>
      </div>
    </div>
  );
}

// ==========================================
// ۴. ساختار استایل‌دهی (Styles)
// ==========================================
const styles = {
  container: {
    padding: "15px",
    direction: "rtl",
    minHeight: "100vh",
    fontFamily: "Tahoma, Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  backBtn: {
    padding: "4px 12px",
    borderRadius: "6px",
    border: "1px solid",
    background: "none",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "inherit",
  },
  title: {
    margin: 0,
    fontSize: "1.05rem",
    borderRight: "4px solid #3b82f6",
    paddingRight: "10px",
  },
  themeToggle: {
    width: "48px",
    height: "24px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    padding: "0 3px",
    cursor: "pointer",
  },
  toggleCircle: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    transition: "0.3s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
  },
  filterCard: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid",
    marginBottom: "12px",
  },
  datePickerWrapper: {
    display: "flex",
    alignItems: "center",
    background: "rgba(59, 130, 246, 0.08)",
    padding: "4px 10px",
    borderRadius: "8px",
  },
  advFilterBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: "11px",
    transition: "0.2s",
    fontFamily: "inherit",
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "6px",
    background: "rgba(239, 68, 68, 0.08)",
    color: "#ef4444",
    border: "1px solid #ef4444",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "inherit",
  },
  drawer: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "12px",
    padding: "12px",
    background: "rgba(128,128,128,0.05)",
    borderRadius: "8px",
  },
  inputGroup: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px", flex: "1 1 200px" },
  select: {
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #444",
    width: "160px",
    fontSize: "11px",
    outline: "none",
    fontFamily: "inherit",
  },
  reportTitleDisplay: {
    marginTop: "12px",
    textAlign: "center",
    fontWeight: "bold",
    color: "#3b82f6",
    fontSize: "12px",
  },
  widget: {
    borderRadius: "10px",
    border: "1px solid",
    marginBottom: "8px",
    overflow: "hidden",
  },
  widgetHeader: {
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    alignItems: "center",
  },
  widgetBody: { padding: "12px", borderTop: "1px solid rgba(128,128,128,0.1)" },
  statsGrid: { display: "flex", gap: "12px" },
  statBox: {
    flex: 1,
    padding: "12px",
    background: "rgba(128,128,128,0.03)",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  labelWithIcon: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    marginBottom: "2px",
    fontWeight: "500",
  },
  detailedStatsRow: {
    marginTop: "15px",
    paddingTop: "12px",
  },
  detailedStatsCol: {
    display: "flex",
    flexDirection: "column",
  },
  detailedBadge: {
    padding: "4px 10px",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    background: "rgba(30, 41, 59, 0.4)",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#94a3b8",
  },
  statsSubSectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    marginTop: "10px",
  },
  detailedBadgeSimple: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#94a3b8",
  },
  iconBtn: {
    padding: "5px",
    borderRadius: "6px",
    border: "1px solid rgba(128,128,128,0.3)",
    background: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsPanel: {
    padding: "15px",
    borderRadius: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    marginBottom: "15px",
    fontSize: "11px",
    border: "1px solid rgba(128,128,128,0.2)",
  },
  settingItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  fieldLabel: {
    fontSize: "10px",
    opacity: 0.75,
    fontWeight: "bold"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    cursor: "pointer",
    userSelect: "none"
  },
  wrapper: {
    width: "100%",
    padding: "10px",
    direction: "rtl",
    fontFamily: "Tahoma",
    boxSizing: "border-box",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: "200px",
    height: "36px",
    padding: "0 10px",
    borderRadius: "6px",
    border: "1px solid #666",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
    fontSize: "12px",
  },
  actions: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
    tableLayout: "fixed",
  },
  th: { padding: "10px" },
  td: {
    padding: "8px",
    verticalAlign: "top",
    wordWrap: "break-word",
    lineHeight: "1.6",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "15px",
    marginTop: "15px",
  },
  pageBtn: {
    padding: "5px 12px",
    cursor: "pointer",
    borderRadius: "5px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    fontFamily: "inherit",
    fontSize: "11px",
  },
  btnPrint: {
    backgroundColor: "#0ea5e9",
    color: "#fff",
    border: "none",
    height: "34px",
    padding: "0 12px",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontSize: "11px",
    fontWeight: "bold",
  },
  btnExcel: {
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    height: "34px",
    padding: "0 12px",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontSize: "11px",
    fontWeight: "bold",
  },
  btnSec: {
    backgroundColor: "#64748b",
    color: "#fff",
    border: "none",
    height: "34px",
    width: "34px",
    padding: "0",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))",
    gap: "15px",
    marginBottom: "12px",
  },
  chartCol: {
    minWidth: "0",
  }
};

// ==========================================
// ۵. کامپوننت‌های فرعی و ابزارک‌های کانتینر
// ==========================================
const Widget = ({ title, icon, children, isOpen, onToggle, theme }) => (
  <div style={{ ...styles.widget, backgroundColor: theme.card, borderColor: theme.border }}>
    <div onClick={onToggle} style={styles.widgetHeader}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {icon} <strong style={{ fontSize: "11px", color: theme.text }}>{title}</strong>
      </div>
      {isOpen ? <ChevronUpIconCustom /> : <ChevronDownIconCustom />}
    </div>
    {isOpen && <div style={styles.widgetBody}>{children}</div>}
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ ...styles.statBox, borderRight: `4px solid ${color}` }}>
    <span style={{ fontSize: "12px", opacity: 0.7 }}>{label}</span>
    <strong style={{ fontSize: "20px" }}>{value}</strong>
  </div>
);