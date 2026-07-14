import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// =========================================================================
// 🌟 راهنمای فعال‌سازی ایمپورت‌ها در پروژه واقعی شما:
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { useAppTheme } from "../context/ThemeContext.jsx";
import PageToolbarButtons from "../components/common/PageToolbarButtons.jsx";
import PageUserMenu from "../components/common/PageUserMenu.jsx";
import NotificationBell from "../components/messaging/NotificationBell.jsx";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import { FIELD_FIELD_LIMITS } from "../constants/fieldFieldLimits.js";
import { clampText } from "../utils/limitInput.js";
import EntityMessagesPanel from "../components/messaging/EntityMessagesPanel.jsx";
import EntityMessageComposeModal from "../components/messaging/EntityMessageComposeModal.jsx";
import MonitorSortBar from "../components/MonitorSortBar.jsx";
import { useMonitorSort } from "../hooks/useMonitorSort.js";
import { sortItems } from "../utils/listSort.js";
import {
  FIELD_MONITOR_SORT_FIELDS,
  FIELD_MONITOR_SORT_STORAGE_KEY,
  fieldReportSortValue,
} from "../constants/monitorSortFields.js";
import { BASE_PAGE_FONT_PX, usePageFontSize } from "../utils/pageFontSize.js";
import { FORM_PAGE_CSS } from "../theme/formPageStyles.js";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import useAnalysisToast from "../hooks/useAnalysisToast.jsx";
// =========================================================================

// 🌟 تعریف متغیرهای پشتیبان جهت جلوگیری از خطای esbuild در زمان بیلد کانوس
// const api = window.api || {
//   get: async (url) => ({ data: [] }),
//   post: async (url, data) => ({ data: {} }),
//   put: async (url, data) => ({ data: {} }),
//   delete: async (url, data) => ({ data: {} })
// };
// const useNavigate = window.useNavigate || (() => () => {});
// const DatePicker = window.DatePicker || (() => null);

// // بازنویسی کلاس پشتیبان جهت پیاده‌سازی متد format و حل خطای TypeError در بیلد پیش‌نمایش
// const DateObject = window.DateObject || class {
//   constructor(val) {
//     this.val = val || new Date();
//   }
//   format(fmt) {
//     return "1405-02-27";
//   }
// };

// const persian = window.persian || {};
// const persian_fa = window.persian_fa || {};

// تابع کمکی برای فارسی‌سازی اعداد در مانیتورینگ
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

// 🌟 تابع کمکی تبدیل ساعت عددی دیتابیس به فرمت استاندارد دورقمی 00:00 فارسی
const formatTimeDigits = (timeNum) => {
  if (timeNum === undefined || timeNum === null) return "۰۰:۰۰";
  const numStr = String(timeNum).padStart(4, "0");
  const hours = numStr.substring(0, 2);
  const minutes = numStr.substring(2, 4);
  return toPersianDigits(`${hours}:${minutes}`);
};

const toEnDigit = (s) => {
  if (!s) return "";
  return s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
};

const cleanDateString = (dateStr) => {
  if (!dateStr) return "";
  return toEnDigit(dateStr).replace(/[^0-9-]/g, "");
};

// آیکون‌های SVG بومی یکپارچه شده جهت تضمین پایداری نمایش مانیتورینگ بدون وابستگی خارجی
const SearchIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const CalendarIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const ChevronDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const ArrowRightIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const FilterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const Edit3Icon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;
const TypeIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>;
const SunIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const MoonIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const RotateCcwIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>;
const CopyIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const HistoryIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const ClockIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const MapPinIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const RefreshCwIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const SlidersHorizontalIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>;
const Trash2Icon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const CornerUpLeftIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>;
const MessageSquareIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const HelpCircleIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

export default function FieldMonitor() {
  const navigate = useNavigate();
  const sidebarRef = useRef(null); // رفرنس سایدبار فیلترها جهت بستن هوشمند با کلیک بیرون
  const { isDarkMode, setIsDarkMode } = useAppTheme();
  const { level: fontLevel, cycleFont, fontSizePx } = usePageFontSize();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [allProvinces, setAllProvinces] = useState([]);
  const [dynamicTopics, setDynamicTopics] = useState([]); 
  const [reportTypes, setReportTypes] = useState([]); // تعریف متغیر به منظور جلوگیری از ارور
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [pastNotes, setPastNotes] = useState([]);
  const [showPastNotes, setShowPastNotes] = useState(false);

  // آمار کل بازه‌ی تاریخی مستقل از فیلتر وضعیت (برای جلوگیری از گیجی مدیر هنگام فیلتر بررسی‌نشده‌ها)
  const [summaryStats, setSummaryStats] = useState({
    total_reports: 0,
    verified_count: 0,
    rejected_count: 0,
  });
  
  // وضعیت جدید کنترل باز/بسته شدن مودال راهنمای مانیتورینگ ارشد
  const [showManagerHelp, setShowManagerHelp] = useState(false);

  const initialFilters = {
    dates: [new DateObject(), new DateObject()],
    selectedProvinces: [],
    priority: "",
    state: "pending", 
    quality: "",
    topic: "all", 
  };

  const [filters, setFilters] = useState({ ...initialFilters });

  // وضعیت ویرایش گزارش مانیتورینگ
  const [editingReport, setEditingReport] = useState(null);
  const [entityMsgCompose, setEntityMsgCompose] = useState(false);
  const [entityMsgRefresh, setEntityMsgRefresh] = useState(0);
  const canManageMessages = hasRole(getSessionRoles(), "admin", "Field_admin", "news_chief");
  const [sortConfig, setSortConfig] = useMonitorSort(FIELD_MONITOR_SORT_STORAGE_KEY, FIELD_MONITOR_SORT_FIELDS);
  const [editForm, setEditForm] = useState({
    title: "", // قابلیت ویرایش عنوان توسط مدیر
    chat_title: "", // قابلیت ویرایش موضوع توسط مدیر
    cleaned_text: "", // متن نهایی ویراستاری‌شده مدیر (cleaned_text)
    admin_note: "", // یادداشت مدیریت (admin_note)
    priority: 1, // اولویت استاندارد (1: عادی، 3: مهم، 5: فوری)
    quality: 3, // کیفیت (۱–۵؛ پیش‌فرض متوسط)
    classification: 1, // دامنه‌ی انتشار (1: عمومی، 2: استانی، 3: واحد، 4: خاص)
    manager_comment: "", // علت برگشت سریع
    showRejectReason: false
  });

  // --- وضعیت اعلان‌های توست ---
  const { showToast, Toast } = useAnalysisToast();

  // اولویت‌های مپ شده به ساختار ۱۰۰٪ یکسان با فرستنده
  const priorityLevels = {
    1: { label: "عادی", color: "#64748b" },
    3: { label: "مهم", color: "#f59e0b" },
    5: { label: "فوری", color: "#ef4444" },
  };

  // هم‌تراز با داشبورد و API: ۱ نامعتبر … ۵ ممتاز
  const qualityLevels = {
    1: { label: "نامعتبر", color: "#ef4444" },
    2: { label: "ضعیف", color: "#f97316" },
    3: { label: "متوسط", color: "#eab308" },
    4: { label: "عالی", color: "#3b82f6" },
    5: { label: "ممتاز", color: "#22c55e" },
  };

  const statusLabels = {
    pending: { label: "بررسی نشده", color: "#64748b" },
    verified: { label: "تایید شده", color: "#22c55e" },
    rejected: { label: "برگشت خورده", color: "#ef4444" },
  };

  // سطوح دامنه‌ی انتشار گزارش (1=عمومی تا 4=خاص)
  const classificationLevels = {
    1: { label: "عمومی", color: "#10b981" },
    2: { label: "استانی", color: "#3b82f6" },
    3: { label: "واحد", color: "#f59e0b" },
    4: { label: "خاص", color: "#ef4444" },
  };

  const handleResetFilters = () => {
    setFilters({ ...initialFilters });
    setSearchTerm("");
  };

  // هوک افکت هوشمند جهت بستن سایدبار فیلترها با کلیک روی خارج از آن
  useEffect(() => {
    const handleClickOutsideFilters = (event) => {
      if (showFilters && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        // جلوگیری از تداخل با کلیک روی دکمه‌ی بازکننده‌ی سایدبار فیلتر
        if (!event.target.closest(".v3-filter-btn-trigger")) {
          setShowFilters(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutsideFilters);
    return () => document.removeEventListener("mousedown", handleClickOutsideFilters);
  }, [showFilters]);

  useEffect(() => {
    if (!filters.dates || !filters.dates[0]) return;
    const rawSd = new DateObject(filters.dates[0]).format("YYYY-MM-DD");
    const sd = cleanDateString(rawSd);
    const rawEd = filters.dates[1] ? new DateObject(filters.dates[1]).format("YYYY-MM-DD") : rawSd;
    const ed = cleanDateString(rawEd);
    
    api.get(`/reports/admin/filters-data?startDate=${sd}&endDate=${ed}`)
      .then((res) => { 
        if (res.data && res.data.topics) {
          setDynamicTopics(res.data.topics); 
        }
      })
      .catch((err) => console.error("Error fetching dynamic topics:", err));

    // دریافت آمار کل بازه (مستقل از فیلتر وضعیت) جهت نمایش نوار تفکیکی
    api.get(`/reports/admin/summary-stats?startDate=${sd}&endDate=${ed}`)
      .then((res) => setSummaryStats(res.data || {}))
      .catch((err) => console.error("Error fetching summary stats:", err));
  }, [filters.dates]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rawSd = filters.dates[0] ? new DateObject(filters.dates[0]).format("YYYY-MM-DD") : "";
    const sd = cleanDateString(rawSd);
    const rawEd = filters.dates[1] ? new DateObject(filters.dates[1]).format("YYYY-MM-DD") : rawSd;
    const ed = cleanDateString(rawEd);

    try {
      const params = new URLSearchParams({
        startDate: sd, endDate: ed, search: searchTerm, provinces: filters.selectedProvinces.join(","),
        priority: filters.priority, state: filters.state, quality: filters.quality,
      });
      const res = await api.get(`/reports/admin/monitor?${params}`);
      setReports(res.data);
    } catch (e) { 
      console.error(e); 
    } finally { 
      document.title = "سیستم مانیتورینگ گزارشات"; 
      setLoading(false); 
    }
  }, [filters.dates, filters.selectedProvinces, filters.priority, filters.state, filters.quality, searchTerm]);

  useEffect(() => {
    const handleEsc = (event) => { if (event.keyCode === 27) setEditingReport(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // دریافت لیست تمام استان‌ها و تمامی موضوعات مجاز در شروع برنامه
  useEffect(() => { 
    api.get("/reports/admin/provinces").then((res) => setAllProvinces(res.data)); 
    
    // دریافت موضوعات مجاز از دیتابیس واقعی
    api.get("/reports/types")
      .then((res) => {
        setReportTypes(res.data || []);
      })
      .catch((err) => console.error("Error fetching report types:", err));
  }, []);

  const fetchPastNotesByTopic = useCallback(async (topic, excludeHash) => {
    if (!topic || !String(topic).trim()) {
      setPastNotes([]);
      return;
    }
    try {
      const params = new URLSearchParams({ topic: String(topic).trim(), limit: "4" });
      if (excludeHash) params.set("excludeHash", excludeHash);
      const res = await api.get(`/reports/admin/manager-notes-by-topic?${params}`);
      setPastNotes(res.data || []);
    } catch (err) {
      console.error("Error fetching manager notes by topic:", err);
      setPastNotes([]);
    }
  }, []);

  const handleEditClick = (report) => {
    setEditForm({
      title: report.title || "",
      chat_title: report.chat_title || report.category || "",
      cleaned_text: report.cleaned_text || report.raw_text || "",
      admin_note: report.manager_notes || report.text || "",
      priority: report.priority ? Number(report.priority) : 1,
      quality: report.quality ? Number(report.quality) : 1,
      classification: report.classification ? Number(report.classification) : 1,
      manager_comment: "",
      showRejectReason: false,
    });
    setEditingReport(report);
  };

  useEffect(() => {
    if (!editingReport) {
      setPastNotes([]);
      setShowPastNotes(false);
      return;
    }
    fetchPastNotesByTopic(editForm.chat_title, editingReport.hash_key);
  }, [editForm.chat_title, editingReport, fetchPastNotesByTopic]);

  const submitAction = async (stateType, customComment = null) => {
    const commentToSend = customComment !== null ? customComment : editForm.manager_comment;
    if (stateType === "rejected" && (!commentToSend || !commentToSend.trim())) {
      showToast("خطا: ثبت برگشت بدون وارد کردن «علت برگشت به کاربر» امکان‌پذیر نیست.", "error");
      return;
    }

    const L = FIELD_FIELD_LIMITS;
    if (editForm.title.length > L.monitorTitle) {
      showToast(`خطا: عنوان حداکثر ${toPersianDigits(L.monitorTitle)} کاراکتر باشد.`, "error");
      return;
    }
    if (editForm.cleaned_text.length > L.monitorText) {
      showToast(`خطا: متن نهایی حداکثر ${toPersianDigits(L.monitorText)} کاراکتر باشد.`, "error");
      return;
    }
    if (editForm.admin_note.length > L.adminNote) {
      showToast(`خطا: یادداشت مدیریت حداکثر ${toPersianDigits(L.adminNote)} کاراکتر باشد.`, "error");
      return;
    }
    if (commentToSend && commentToSend.length > L.managerComment) {
      showToast(`خطا: علت برگشت حداکثر ${toPersianDigits(L.managerComment)} کاراکتر باشد.`, "error");
      return;
    }

    const payload = {
      title: clampText(editForm.title.trim(), L.monitorTitle),
      chat_title: editForm.chat_title,
      cleaned_text: clampText(editForm.cleaned_text.trim(), L.monitorText),
      admin_note: clampText(editForm.admin_note.trim(), L.adminNote),
      priority: editForm.priority,
      quality: editForm.quality,
      classification: editForm.classification,
      state: stateType,
      manager_comment: clampText(commentToSend || "", L.managerComment),
    };

    try {
      await api.put(`/reports/admin/verify/${editingReport.hash_key}`, payload);
      setEditingReport(null);
      showToast("✅ تغییرات با موفقیت در پایگاه داده ثبت شد", "success");
      fetchData();
    } catch (e) { 
      showToast("خطا در ثبت تغییرات مانیتورینگ", "error"); 
    }
  };

  const handleDeleteAction = async () => {
    if (!editingReport) return;
    if (!window.confirm("آیا از حذف منطقی این گزارش و انتقال آن به سطل زباله اطمینان دارید؟")) return;
    try {
      setLoading(true);
      await api.delete(`/reports/admin/delete/${editingReport.hash_key}`);
      setEditingReport(null);
      showToast("✅ گزارش با موفقیت حذف شد", "success");
      await fetchData();
    } catch (e) { 
      showToast("خطا در حذف گزارش", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleQuickAction = async (report, stateType, comment) => {
    if (stateType === "rejected" && (!comment || !comment.trim())) {
      showToast("خطا: باید علت برگشت را بنویسید.", "error");
      return;
    }
    if (comment && comment.length > FIELD_FIELD_LIMITS.managerComment) {
      showToast(`خطا: علت برگشت حداکثر ${toPersianDigits(FIELD_FIELD_LIMITS.managerComment)} کاراکتر باشد.`, "error");
      return;
    }
    const payload = {
      title: report.title || "",
      chat_title: report.chat_title || report.category || "",
      cleaned_text: report.cleaned_text || report.raw_text || "",
      admin_note: report.manager_notes || report.text || "",
      priority: report.priority || 1,
      quality: report.quality || 1,
      classification: report.classification || 1,
      state: stateType,
      manager_comment: clampText(comment || "", FIELD_FIELD_LIMITS.managerComment),
    };
    try {
      setLoading(true);
      await api.put(`/reports/admin/verify/${report.hash_key}`, payload);
      showToast("✅ اقدام سریع ثبت شد", "success");
      await fetchData(); 
    } catch (e) { 
      showToast("خطا در ثبت تغییرات سریع", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  const sortedReports = useMemo(
    () => sortItems(reports, sortConfig, fieldReportSortValue),
    [reports, sortConfig],
  );

  const groupedData = useMemo(() => {
    return sortedReports.reduce((acc, r) => {
      const key = r.chat_title || "بدون موضوع";
      if (filters.topic !== "all" && key !== filters.topic) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [sortedReports, filters.topic]);

  const totalFilteredCount = useMemo(() => {
    return Object.values(groupedData).reduce((sum, items) => sum + items.length, 0);
  }, [groupedData]);

  // تعداد بررسی‌نشده‌های کل بازه = کل منهای تایید و برگشت‌خورده
  const pendingCount = Math.max(
    0,
    Number(summaryStats.total_reports || 0)
      - Number(summaryStats.verified_count || 0)
      - Number(summaryStats.rejected_count || 0)
  );

  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
    warning: "#f59e0b",
  };

  return (
    <div
      className="page-font-root"
      style={{
        background: theme.bg,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        direction: "rtl",
        color: theme.text,
        overflowX: "hidden",
        fontFamily: "Tahoma, sans-serif",
        fontSize: BASE_PAGE_FONT_PX,
        ["--input-font-size"]: fontSizePx,
      }}
    >
      {Toast}

      {/* Header */}
      <header className="v3-navbar" style={{ background: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <div className="v3-nav-row">
          <button onClick={() => navigate("/main")} className="v3-icon-btn"><ArrowRightIcon /></button>
          <div className="v3-search-input" style={{ background: isDarkMode ? "rgba(0,0,0,0.2)" : "#fff", border: `1px solid ${theme.border}` }}>
            <SearchIcon /><input placeholder="جستجو در متن یا واحد..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="v3-nav-tools">
            <button onClick={() => setShowFilters(!showFilters)} className={`v3-icon-btn v3-filter-btn-trigger ${showFilters ? "active" : ""}`}><FilterIcon /></button>
            {loading && <RefreshCwIcon className="v3-spin" />}
            <NotificationBell isDarkMode={isDarkMode} />
            <PageToolbarButtons
              fontLevel={fontLevel}
              onCycleFont={cycleFont}
              onHelp={() => setShowManagerHelp(true)}
              showHelp
              btnClass="v3-icon-btn"
            />
            <PageUserMenu btnClass="v3-icon-btn" />
          </div>
        </div>
        <div className="v3-nav-row sub">
          <div className="v3-date-box" style={{ border: `1px solid ${theme.border}` }}>
            <CalendarIcon />
            <ThemedDatePicker isDarkMode={isDarkMode} value={filters.dates} onChange={(d) => setFilters({ ...filters, dates: d })} range calendar={persian} locale={persian_fa} calendarPosition="bottom-right" placeholder="انتخاب بازه" />
          </div>
          <div className="v3-summary-bar">
            {/* کل بازه‌ی تاریخی - مستقل از فیلتر */}
            <div className="v3-stat-seg total">
              <span>کل بازه</span>
              <b>{toPersianDigits(summaryStats.total_reports)}</b>
            </div>

            <div className="v3-stat-divider" />

            {/* تفکیک وضعیت‌ها */}
            <div className="v3-stat-seg" style={{ "--seg-color": statusLabels.pending.color }}>
              <span>بررسی‌نشده</span>
              <b>{toPersianDigits(pendingCount)}</b>
            </div>
            <div className="v3-stat-seg" style={{ "--seg-color": statusLabels.verified.color }}>
              <span>تایید شده</span>
              <b>{toPersianDigits(summaryStats.verified_count)}</b>
            </div>
            <div className="v3-stat-seg" style={{ "--seg-color": statusLabels.rejected.color }}>
              <span>برگشتی</span>
              <b>{toPersianDigits(summaryStats.rejected_count)}</b>
            </div>

            {/* برچسب فیلتر فعال - فقط وقتی همه‌ی وضعیت‌ها نمایش داده نمی‌شوند */}
            {filters.state !== "all" && (
              <div className="v3-active-filter-tag">
                <FilterIcon />
                <span>درحال نمایش: {statusLabels[filters.state]?.label} ({toPersianDigits(totalFilteredCount)})</span>
              </div>
            )}
          </div>
        </div>
        <div className="v3-nav-row sort">
          <MonitorSortBar
            fields={FIELD_MONITOR_SORT_FIELDS}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            theme={theme}
            compact
          />
        </div>
      </header>

      {/* Sidebar Filters */}
      <aside ref={sidebarRef} className={`v3-side-filter ${showFilters ? "open" : ""}`} style={{ background: theme.card }}>
        <div className="v3-filter-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><SlidersHorizontalIcon /><span>فیلترهای مدیریت</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleResetFilters} className="v3-reset-btn"><RotateCcwIcon /><span>حذف فیلترها</span></button>
            <XIcon onClick={() => setShowFilters(false)} style={{ cursor: "pointer" }} />
          </div>
        </div>
        <div className="v3-filter-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label className="v3-filter-label">وضعیت بررسی</label>
          <select className="v3-select-filter" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">بررسی نشده</option>
            <option value="verified">تایید شده</option>
            <option value="rejected">برگشت داده شده</option>
          </select>
          <label className="v3-filter-label">اولویت</label>
          <select className="v3-select-filter" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">همه اولویت‌ها</option>
            {Object.entries(priorityLevels).map(([k, v]) => ( <option key={k} value={k}>{v.label}</option> ))}
          </select>
          <label className="v3-filter-label">⭐کیفیت گزارش</label>
          <select className="v3-select-filter" value={filters.quality} onChange={(e) => setFilters({ ...filters, quality: e.target.value })}>
            <option value="">همه کیفیت‌ها</option>
            <option value="5">ممتاز</option>
            <option value="4">عالی</option>
            <option value="3">متوسط</option>
            <option value="2">ضعیف</option>
            <option value="1">نامعتبر</option>
          </select>
          <label className="v3-filter-label">موضوع گزارش</label>
          <select className="v3-select-filter" value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })}>
            <option value="all">همه موضوعات</option>
            {dynamicTopics.map((t) => ( <option key={t} value={t}>{t}</option> ))}
          </select>
          <label className="v3-filter-label">استان‌ها</label>
          <div className="v3-prov-chips">
            {allProvinces.map((p) => (
              <div key={p} onClick={() => setFilters((f) => ({ ...f, selectedProvinces: f.selectedProvinces.includes(p) ? f.selectedProvinces.filter((x) => x !== p) : [...f.selectedProvinces, p] }))} className={`v3-chip ${filters.selectedProvinces.includes(p) ? "active" : ""}`}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="v3-content-scroll">
        {Object.entries(groupedData).map(([topic, items]) => (
          <div key={topic} className="v3-topic-wrap">
            <div className="v3-topic-header" onClick={() => setExpandedGroups((p) => ({ ...p, [topic]: !p[topic] }))}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="v3-topic-indicator" style={{ background: theme.accent }} />
                <b>{topic}</b><span className="v3-topic-badge">{toPersianDigits(items.length)}</span>
              </div>
              {expandedGroups[topic] !== false ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </div>
            <div className="v3-report-grid">
              {expandedGroups[topic] !== false &&
                items.map((r) => (
                  <InnerReportCard key={r.hash_key} r={r} theme={theme} priorityLevels={priorityLevels} qualityLevels={qualityLevels} classificationLevels={classificationLevels} statusLabels={statusLabels} onEdit={() => handleEditClick(r)} onQuickReject={(reason) => handleQuickAction(r, "rejected", reason)} cleanDateString={cleanDateString} />
                ))}
            </div>
          </div>
        ))}
      </main>

      {/* مودال راهنمای گام‌به‌گام پایش مدیریت ارشد */}
      {showManagerHelp && (
        <div className="v3-modal-overlay" onClick={() => setShowManagerHelp(false)}>
          <div className="v3-modal-box shadow-lg" style={{ background: theme.card, border: `1px solid ${theme.border}`, maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="v3-modal-header-new">
              <button onClick={() => setShowManagerHelp(false)} className="v3-close-btn-new"><XIcon /></button>
              <span className="v3-modal-title">دستورالعمل جامع مانیتورینگ مدیریت</span>
            </div>
            <div className="v3-modal-body" style={{ maxHeight: "65vh", overflowY: "auto", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", direction: "rtl", fontSize: "13px", lineHeight: "2", textAlign: "justify", color: isDarkMode ? "#cbd5e1" : "#334155" }}>
                <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#38bdf8" }}>
                  <strong>کارکرد اصلی سامانه پایش:</strong> این پنل جهت بررسی، ویرایش، ویراستاری نهایی، مرجوع کردن یا تایید قطعی گزارش‌های ارسالی یگان‌ها توسط مدیریت کل توسعه یافته است.
                </div>
                
                <b>۱. اصلاح موضوع و عنوان گزارش:</b>
                <p style={{ margin: "-8px 0 0 0", fontSize: "12px" }}>مدیر ارشد این توانایی را دارد که در صورت نامناسب بودن دسته‌بندی موضوعی یا عنوان ثبت‌شده توسط یگان، آن‌ها را از منوی کشویی و ورودی عنوان در مودال اصلاح کند.</p>

                <b>۲. تفکیک متن اصلی و متن نهایی (ویراستاری):</b>
                <p style={{ margin: "-8px 0 0 0", fontSize: "12px" }}>متن خام ارسالی یگان در باکس خاکستری غیرقابل تغییر باقی می‌ماند تا اصالت واقعه حفظ شود. شما باید نسخه اصلاح‌شده، بی‌آزار، بدون جزئیات محرمانه و ویراستاری‌شده را در کادر <b>«متن نهایی جهت انتشار»</b> بنویسید.</p>

                <b>۳. سوابق و یادداشت‌های مدیریت:</b>
                <p style={{ margin: "-8px 0 0 0", fontSize: "12px" }}>بخش «یادداشت مدیریت» برای ثبت در بایگانی است. می‌توانید از دکمه سوابق برای کپی کردن یادداشت‌های پرتکرار قبلی استفاده کنید.</p>

                <b>۴. فرآیند برگشت گزارش (عودت به یگان):</b>
                <p style={{ margin: "-8px 0 0 0", fontSize: "12px" }}>اگر گزارش ناقص یا مبهم است، با دکمه <b>«برگشت گزارش»</b> علت آن را مکتوب کنید. گزارش به کارتابل کاربر برگشته و تا زمان اصلاح یگان، از لیست بررسی مانیتورینگ خارج می‌شود.</p>

                <b>۵. اولویت‌ها و کیفیت‌سنجی:</b>
                <p style={{ margin: "-8px 0 0 0", fontSize: "12px" }}>اولویت‌ها (عادی، مهم، فوری) و کیفیت گزارش در پنج سطح (⭐ نامعتبر تا ⭐⭐⭐⭐⭐ ممتاز، همانند داشبورد) برای تحلیل‌های آماری ارشد در این بخش تعیین تکلیف می‌شوند.</p>
              </div>
            </div>
            <div className="v3-modal-footer-new" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => setShowManagerHelp(false)} className="v3-btn-footer v3-primary-solid" style={{ minWidth: "120px" }}>متوجه شدم</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editingReport && (
        <div className="v3-modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="v3-modal-box shadow-lg" style={{ background: theme.card, border: `1px solid ${theme.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="v3-modal-header-new">
              <button onClick={() => setEditingReport(null)} className="v3-close-btn-new"><XIcon /></button>
              <span className="v3-modal-title">مدیریت و تعیین تکلیف گزارش</span>
            </div>

            <div className="v3-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px", boxSizing: "border-box" }}>
              
              {/* تاریخچه و لاگ رفت و برگشت تعاملات */}
              {editingReport.workflow_logs && (
                <div className="v3-input-group" style={{ marginBottom: "20px" }}>
                  <label className="v3-label-new" style={{ color: "#fb923c", display: "flex", alignItems: "center", gap: "6px" }}>
                    <MessageSquareIcon /> سوابق تعاملات و چرخه رفت و برگشت این گزارش:
                  </label>
                  <div className="text-justify" style={{ background: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", padding: "12px", fontSize: "12px", lineHeight: "1.8", color: isDarkMode ? "#cbd5e1" : "#334155", whiteSpace: "pre-line" }}>
                    {toPersianDigits(editingReport.workflow_logs)}
                  </div>
                </div>
              )}

              {/* بخش ویرایش موضوع گزارش توسط مدیر */}
              <div className="v3-input-group" style={{ marginBottom: "15px" }}>
                <label className="v3-label-new">موضوع گزارش</label>
                <select 
                  className="v3-select-filter" 
                  value={editForm.chat_title} 
                  onChange={(e) => setEditForm({ ...editForm, chat_title: e.target.value })}
                >
                  {reportTypes.map((t, idx) => (
                    <option key={idx} value={t.title_fa}>{t.title_fa}</option>
                  ))}
                </select>
              </div>

              {/* بخش ویرایش عنوان گزارش توسط مدیر با محدودیت ۱۰۰ کاراکتر */}
              <div className="v3-input-group" style={{ marginBottom: "15px" }}>
                <div className="v3-flex-between">
                  <label className="v3-label-new">عنوان گزارش</label>
                  <span style={{ fontSize: "10px", color: editForm.title.length > FIELD_FIELD_LIMITS.monitorTitle ? "#ef4444" : "#64748b", fontWeight: "bold" }}>
                    {toPersianDigits(editForm.title.length)} / {toPersianDigits(FIELD_FIELD_LIMITS.monitorTitle)}
                  </span>
                </div>
                <input 
                  type="text" 
                  className="v3-input-text" 
                  value={editForm.title} 
                  onChange={(e) => setEditForm({ ...editForm, title: clampText(e.target.value, FIELD_FIELD_LIMITS.monitorTitle) })}
                  maxLength={FIELD_FIELD_LIMITS.monitorTitle}
                  style={inputTextStyle}
                />
              </div>

              <div className="v3-input-group">
                <label className="v3-label-new">متن اصلی ارسالی کاربر</label>
                <div className="v3-raw-box">{editingReport.raw_text}</div>
              </div>

              {/* متن نهایی جهت انتشار با محدودیت ۱۰۰0 کاراکتر */}
              <div className="v3-input-group" style={{ marginTop: "20px" }}>
                <div className="v3-flex-between">
                  <label className="v3-label-new">متن نهایی جهت انتشار</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: editForm.cleaned_text.length > FIELD_FIELD_LIMITS.monitorText ? "#ef4444" : "#64748b", fontWeight: "bold" }}>
                      {toPersianDigits(editForm.cleaned_text.length)} / {toPersianDigits(FIELD_FIELD_LIMITS.monitorText)}
                    </span>
                    <button className="v3-action-link" onClick={() => setEditForm({ ...editForm, cleaned_text: clampText(editingReport.raw_text || "", FIELD_FIELD_LIMITS.monitorText) })}><CopyIcon /> کپی از متن اصلی</button>
                  </div>
                </div>
                <textarea className="v3-textarea-new" value={editForm.cleaned_text} onChange={(e) => setEditForm({ ...editForm, cleaned_text: clampText(e.target.value, FIELD_FIELD_LIMITS.monitorText) })} maxLength={FIELD_FIELD_LIMITS.monitorText} />
              </div>

              <div className="v3-input-group" style={{ marginTop: "20px" }}>
                <div className="v3-flex-between">
                  <label className="v3-label-new" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <HistoryIcon size={14} /> یادداشت مدیریت
                  </label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: editForm.admin_note.length > FIELD_FIELD_LIMITS.adminNote ? "#ef4444" : "#64748b", fontWeight: "bold" }}>
                      {toPersianDigits(editForm.admin_note.length)} / {toPersianDigits(FIELD_FIELD_LIMITS.adminNote)}
                    </span>
                    {editForm.chat_title && pastNotes.length > 0 && (
                      <button type="button" className="v3-action-link" onClick={() => setShowPastNotes((v) => !v)}>
                        <HistoryIcon /> {showPastNotes ? "بستن سوابق" : `${toPersianDigits(pastNotes.length)} یادداشت اخیر`}
                      </button>
                    )}
                  </div>
                </div>
                {showPastNotes && editForm.chat_title && (
                  <div className="v3-history-panel">
                    {pastNotes.length === 0 ? (
                      <div style={{ fontSize: "11px", opacity: 0.6, padding: "6px 8px" }}>یادداشت قبلی برای موضوع «{editForm.chat_title}» ثبت نشده است.</div>
                    ) : (
                      pastNotes.map((n, idx) => (
                        <div
                          key={n.hash_key || idx}
                          className="v3-history-chip"
                          title="کلیک برای استفاده در یادداشت"
                          onClick={() => {
                            setEditForm({ ...editForm, admin_note: clampText(n.manager_notes || n.text || "", FIELD_FIELD_LIMITS.adminNote) });
                            setShowPastNotes(false);
                          }}
                        >
                          {n.manager_notes || n.text}
                        </div>
                      ))
                    )}
                  </div>
                )}
                <textarea
                  className="v3-textarea-small-new"
                  value={editForm.admin_note}
                  onChange={(e) => setEditForm({ ...editForm, admin_note: clampText(e.target.value, FIELD_FIELD_LIMITS.adminNote) })}
                  maxLength={FIELD_FIELD_LIMITS.adminNote}
                />
              </div>

              {editForm.showRejectReason && (
                <div className="v3-reject-area" style={{ marginTop: "20px" }}>
                  <label className="v3-label-new" style={{ color: theme.warning }}>دلیل مرجوع کردن به کاربر <span style={{color: '#ef4444'}}>* (اجباری)</span></label>
                  <div className="v3-flex-between" style={{ marginBottom: "6px" }}>
                    <span />
                    <span style={{ fontSize: "10px", color: editForm.manager_comment.length > FIELD_FIELD_LIMITS.managerComment ? "#ef4444" : "#64748b", fontWeight: "bold" }}>
                      {toPersianDigits(editForm.manager_comment.length)} / {toPersianDigits(FIELD_FIELD_LIMITS.managerComment)}
                    </span>
                  </div>
                  <textarea
                    className="v3-textarea-small-new"
                    style={{ border: `1px solid ${theme.warning}88` }}
                    value={editForm.manager_comment}
                    onChange={(e) => setEditForm({ ...editForm, manager_comment: clampText(e.target.value, FIELD_FIELD_LIMITS.managerComment) })}
                    maxLength={FIELD_FIELD_LIMITS.managerComment}
                    placeholder="علت یا ایراد برطرف‌نشده گزارش را اینجا بنویسید..."
                  />
                </div>
              )}

              <div className="v3-selection-section">
                <div className="v3-selection-block">
                  <label className="v3-label-new text-center">تعیین اولویت</label>
                  <div className="v3-pill-row-unified">
                    {[1, 3, 5].map((k) => (
                      <button key={k} type="button" className={`v3-btn-unified-item ${editForm.priority === k ? "active" : ""}`} style={{ "--active-bg": priorityLevels[k].color }} onClick={() => setEditForm({ ...editForm, priority: k })}>{priorityLevels[k].label}</button>
                    ))}
                  </div>
                </div>
                <div className="v3-selection-block">
                  <label className="v3-label-new text-center">تعیین کیفیت (۵ سطح)</label>
                  <div className="v3-pill-row-unified v3-pill-row-quality">
                    {[1, 2, 3, 4, 5].map((k) => (
                      <button key={k} type="button" className={`v3-btn-unified-item ${editForm.quality === k ? "active" : ""}`} style={{ "--active-bg": qualityLevels[k].color }} onClick={() => setEditForm({ ...editForm, quality: k })}>{qualityLevels[k].label}</button>
                    ))}
                  </div>
                </div>
                <div className="v3-selection-block">
                  <label className="v3-label-new text-center">تعیین دامنه‌ی انتشار</label>
                  <div className="v3-pill-row-unified">
                    {[1, 2, 3, 4].map((k) => (
                      <button key={k} type="button" className={`v3-btn-unified-item ${editForm.classification === k ? "active" : ""}`} style={{ "--active-bg": classificationLevels[k].color }} onClick={() => setEditForm({ ...editForm, classification: k })}>{classificationLevels[k].label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {editingReport?.hash_key ? (
                <EntityMessagesPanel
                  key={`${editingReport.hash_key}-${entityMsgRefresh}`}
                  entityType="field_report"
                  entityId={editingReport.hash_key}
                  theme={theme}
                  canCompose={canManageMessages}
                  onCompose={() => setEntityMsgCompose(true)}
                />
              ) : null}
            </div>

            {/* دکمه‌های کامپکت و سازمان‌یافته با ترتیب جدید برای مهار عرض کم و جلوگیری از به هم ریختگی */}
            <div className="v3-modal-footer-new">
              {!editForm.showRejectReason ? (
                <div className="v3-footer-rows">
                  {/* ردیف اول: برگشت گزارش و حذف گزارش در کنار هم */}
                  <div className="v3-footer-row-half">
                    <button onClick={() => setEditForm({ ...editForm, showRejectReason: true })} className="v3-btn-footer v3-warning-outline">برگشت گزارش</button>
                    <button onClick={handleDeleteAction} className="v3-btn-footer v3-danger-ghost"><Trash2Icon /><span>حذف گزارش</span></button>
                  </div>
                  {/* ردیف دوم: انصراف و تایید در کنار هم */}
                  <div className="v3-footer-row-half">
                    <button onClick={() => setEditingReport(null)} className="v3-btn-footer v3-ghost-neutral">انصراف</button>
                    <button onClick={() => submitAction("verified")} className="v3-btn-footer v3-primary-solid">تایید و انتشار نهایی</button>
                  </div>
                  {/* بازگشت به در انتظار */}
                  {(editingReport.state === "verified" || editingReport.state === "rejected") && (
                    <button onClick={() => submitAction("pending", "انتقال مجدد به وضعیت در انتظار بررسی")} className="v3-btn-footer v3-secondary-solid" style={{ width: "100%", marginTop: "4px" }}>بازگشت به در انتظار</button>
                  )}
                </div>
              ) : (
                <div className="v3-footer-row-half">
                  <button onClick={() => setEditForm({ ...editForm, showRejectReason: false, manager_comment: "" })} className="v3-btn-footer v3-ghost-neutral">انصراف</button>
                  <button onClick={() => submitAction("rejected")} className="v3-btn-footer v3-danger-solid" style={{ opacity: editForm.manager_comment.trim() ? 1 : 0.5 }}>تایید برگشت</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EntityMessageComposeModal
        open={entityMsgCompose && !!editingReport?.hash_key}
        onClose={() => setEntityMsgCompose(false)}
        entityType="field_report"
        entityId={editingReport?.hash_key}
        theme={theme}
        onSent={() => setEntityMsgRefresh((k) => k + 1)}
      />

      <style>{FORM_PAGE_CSS}</style>
      <style>{`
        .v3-modal-box { width: 95%; max-width: 680px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; }
        .v3-selection-section { display: flex; flex-direction: column; gap: 20px; margin-top: 24px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.08); }
        .v3-pill-row-quality { flex-wrap: wrap; row-gap: 6px; }
        .v3-pill-row-quality .v3-btn-unified-item { flex: 1 1 calc(33.33% - 4px); min-width: 52px; font-size: 11px; line-height: 1.25; padding: 4px 2px; height: auto; min-height: 38px; }
        .v3-selection-block { display: flex; flex-direction: column; }
        .text-center { text-align: center; width: 100%; margin-bottom: 10px; font-weight: bold; }
        .v3-pill-row-unified { display: flex; width: 100%; background: rgba(0, 0, 0, 0.2); padding: 4px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05); gap: 4px; }
        .v3-btn-unified-item { flex: 1; height: 38px; background: none; border: none; color: #94a3b8; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 7px; transition: all 0.2s ease; }
        .v3-btn-unified-item:hover:not(.active) { color: #fff; background: rgba(255,255,255,0.03); }
        .v3-btn-unified-item.active { background: var(--active-bg); color: #fff; font-weight: bold; box-shadow: 0 4px 12px var(--active-bg) 44; }
        
        /* ریسپانسیو کردن بخش فوتر برای تبلت و موبایل جهت جلوگیری از تداخل و ریزش چیدمان */
        .v3-modal-footer-new { padding: 16px 20px; background: rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.06); box-sizing: border-box; }
        .v3-footer-rows { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .v3-footer-row-half { display: flex; gap: 8px; width: 100%; }
        .v3-footer-row-half .v3-btn-footer { flex: 1; }
        
        .v3-btn-footer { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; text-align: center; }
        
        .v3-primary-solid { background: #38bdf8; color: #0f172a; }
        .v3-primary-solid:hover { background: #7dd3fc; }
        .v3-warning-outline { background: none; border-color: #f59e0b; color: #f59e0b; }
        .v3-warning-outline:hover { background: rgba(245, 158, 11, 0.08); }
        .v3-danger-ghost { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .v3-danger-ghost:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
        .v3-danger-solid { background: #ef4444; color: #fff; }
        .v3-danger-solid:hover { background: #dc2626; }
        .v3-secondary-solid { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border-color: rgba(148, 163, 184, 0.2); }
        .v3-secondary-solid:hover { background: rgba(148, 163, 184, 0.25); color: #fff; }
        .v3-ghost-neutral { background: none; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); }
        .v3-ghost-neutral:hover { color: #fff; background: rgba(255,255,255,0.02); }
        
        @media (max-width: 768px) {
          .v3-modal-footer-new { flex-direction: column; align-items: stretch; gap: 10px; }
          .v3-footer-rows { gap: 10px; }
          .v3-footer-row-half { flex-direction: row; gap: 8px; }
          .v3-btn-footer { width: 100%; height: 42px; }
        }

        @media (max-width: 600px) {
          .v3-selection-section { gap: 15px; }
        }

        .v3-counter-badge { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 10px; font-size: 12px; background: rgba(56, 189, 248, 0.05); color: #38bdf8; }
        .v3-counter-badge b { font-size: 14px; background: rgba(56, 189, 248, 0.2); padding: 0px 6px; border-radius: 4px; }

        /* نوار تفکیکی آمار کل بازه و وضعیت‌ها */
        .v3-summary-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 5px 12px; border-radius: 10px; background: rgba(56, 189, 248, 0.04); border: 1px solid rgba(56, 189, 248, 0.12); font-size: 12px; }
        .v3-stat-seg { display: flex; align-items: center; gap: 6px; color: var(--seg-color, #38bdf8); }
        .v3-stat-seg span { opacity: 0.85; }
        .v3-stat-seg b { font-size: 13px; background: color-mix(in srgb, var(--seg-color, #38bdf8) 18%, transparent); padding: 1px 7px; border-radius: 5px; }
        .v3-stat-seg.total { color: #38bdf8; font-weight: bold; }
        .v3-stat-divider { width: 1px; height: 18px; background: rgba(255, 255, 255, 0.15); }
        .v3-active-filter-tag { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 8px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; font-weight: 600; }
        @media (max-width: 600px) {
          .v3-summary-bar { width: 100%; justify-content: space-between; }
          .v3-stat-divider { display: none; }
        }
        .v3-reset-btn { background: none; border: none; color: #f87171; display: flex; align-items: center; gap: 4px; font-size: 11px; font-family: inherit; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
        .v3-reset-btn:hover { background: rgba(248, 113, 113, 0.1); }
        .v3-select-filter { background-color: rgba(30, 41, 59, 0.7) !important; color: #f8fafc !important; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 8px 12px; font-family: inherit; font-size: 13px; cursor: pointer; outline: none; transition: all 0.2s ease; width: 100%; }
        
        /* استایل جدید و لطیف دکمه‌های هدر مانیتورینگ (شیشه‌ای و هماهنگ) */
        .v3-navbar { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
        .v3-nav-row { display: flex; align-items: center; gap: 10px; }
        
        .v3-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.5); color: #94a3b8; cursor: pointer; transition: all 0.2s ease; }
        .v3-icon-btn:hover { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        
        /* استایل فوق‌العاده لطیف و متقارن دکمه‌های کنترلی مدیریت */
        .v3-icon-btn-gentle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.02); color: #94a3b8; cursor: pointer; transition: all 0.2s ease; }
        .v3-icon-btn-gentle:hover { background: rgba(56, 189, 248, 0.08); color: #38bdf8; border-color: rgba(56, 189, 248, 0.2); }
        
        /* استایل ولوم فیلتر */
        .v3-icon-btn.active { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: #38bdf8; }

        .v3-search-input { flex: 1; display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 12px; }
        .v3-search-input input { background: none; border: none; outline: none; flex: 1; color: inherit; font-size: 13px; }
        .v3-date-box { display: flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 10px; font-size: 12px; background: rgba(255,255,255,0.02); }
        
        /* افکت انیمیشن سایدبار فیلتر */
        .v3-side-filter { position: fixed; top: 0; bottom: 0; right: -320px; z-index: 2500; padding: 20px; transition: right 0.3s ease-in-out; box-shadow: -5px 0 15px rgba(0,0,0,0.3); overflow-y: auto; width: 290px; box-sizing: border-box; border-left: 1px solid rgba(255,255,255,0.06); }
        .v3-side-filter.open { right: 0; }
        
        .v3-filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
        .v3-filter-label { display: block; font-size: 11px; opacity: 0.6; margin-top: 5px; margin-bottom: 2px; }
        .v3-prov-chips { display: flex; flex-wrap: wrap; gap: 5px; max-height: 200px; overflow-y: auto; padding: 5px; }
        .v3-chip { padding: 4px 10px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; }
        .v3-chip.active { background: #38bdf8; color: #000; border-color: #38bdf8; }
        .v3-content-scroll { flex: 1; overflow-y: auto; padding: 15px; }
        .v3-topic-wrap { margin-bottom: 25px; }
        .v3-topic-header { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); cursor: pointer; margin-bottom: 15px; }
        .v3-report-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        @media (min-width: 768px) { .v3-report-grid { grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); } }
        .v3-report-card { border-radius: 20px; padding: 15px; position: relative; overflow: hidden; display: flex; flex-direction: column; min-height: 180px; }
        .v3-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .v3-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .v3-modal-header-new { display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .v3-modal-title { font-size: 16px; font-weight: 600; opacity: 0.9; }
        .v3-close-btn-new { background: none; border: none; color: #f87171; cursor: pointer; transition: 0.2s; }
        .v3-close-btn-new:hover { transform: scale(1.1); }
        .v3-label-new { font-size: 12px; opacity: 0.7; margin-bottom: 8px; display: block; }
        .v3-raw-box { background: rgba(0,0,0,0.15); padding: 12px; border-radius: 10px; font-size: 13px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); line-height: 1.6; text-align: justify; }
        .v3-textarea-new { width: 100%; min-height: 120px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; font-family: inherit; resize: vertical; text-align: justify; }
        .v3-textarea-small-new { width: 100%; min-height: 80px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; color: #fff; font-size: 13px; font-family: inherit; resize: vertical; text-align: justify; }
        .v3-history-panel { background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); border-radius: 12px; padding: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08); }
        .v3-history-chip { padding: 8px 12px; font-size: 11px; cursor: pointer; border-radius: 8px; transition: 0.2s; }
        .v3-history-chip:hover { background: rgba(255,255,255,0.1); color: #38bdf8; }
        .v3-action-link { background: none; border: none; color: #38bdf8; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; margin-bottom: 5px; transition: 0.2s; }
        .v3-flex-between { display: flex; justify-content: space-between; align-items: center; }
        
        /* دکمه‌های کنترلی آیکنی کنار جستجو/فیلتر — یکسان در دسکتاپ و موبایل */
        .v3-header-control-icons { display: flex; align-items: center; gap: 6px; }
        /* ردیف مرتب‌سازی: مرتب‌سازی + کمبو + فلش + صعودی/نزولی در یک خط */
        .v3-nav-row.sort { padding-top: 2px; }
        
        @media (max-width: 768px) {
          /* ردیف اول: جستجو + فیلتر + دکمه‌های کنترلی همگی کنار هم و در صورت نیاز wrap */
          .v3-nav-row { flex-wrap: wrap; }
          /* چیدمان عمودی: تاریخ، سپس آمار، سپس مرتب‌سازی — هرکدام تمام‌عرض */
          .v3-nav-row.sub { flex-direction: column; align-items: stretch; gap: 8px; }
          .v3-date-box { width: 100%; box-sizing: border-box; justify-content: flex-start; }
          .v3-date-box .themed-date-picker { flex: 1; }
          .v3-summary-bar { width: 100%; }
          .v3-nav-row.sort { width: 100%; }
        }
        
        @keyframes userPulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 10px rgba(245, 158, 11, 0.6); }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .v3-user-fix-badge {
          animation: userPulse 2s infinite ease-in-out;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

// 🌟 کامپوننت کارت داخلی مجهز به سیستم تشخیص هوشمند گزارش‌های اصلاح‌شده
function InnerReportCard({ r, theme, priorityLevels, qualityLevels, classificationLevels, statusLabels, onEdit, onQuickReject, cleanDateString }) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // بررسی هوشمند: آیا گزارش در وضعیت در انتظار است اما سابقه مرجوعی و اصلاحیه کاربر را دارد؟
  const isUserAmendment = useMemo(() => {
    return r.state === "pending" && r.workflow_logs && r.workflow_logs.includes("اصلاحیه کاربر");
  }, [r.state, r.workflow_logs]);

  return (
    <div className="v3-report-card" style={{ background: theme.card, border: `1px solid ${theme.border}`, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "4px", height: "100%", background: priorityLevels[Number(r.priority || 1)]?.color || "#64748b" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: theme.accent }}>
          <MapPinIcon />
          {/* نام فرستنده در پرانتز در کنار نام واحد بر روی کارت پایش */}
          <b style={{ fontSize: "12px" }}>{r.UnitShortName || "نامشخص"} ({r.sender_name || "نامشخص"})</b>
        </div>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
          
          {/* نشانگر هوشمند اصلاحیه کاربر با استایل متمایز و انیمیشن پالس */}
          {isUserAmendment && (
            <div className="v3-user-fix-badge" style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "6px", background: "#f59e0b", color: "#000", marginLeft: "4px" }}>
              اصلاحیه کاربر ✍️
            </div>
          )}

          {r.state !== undefined && r.state !== null && statusLabels[r.state] && (
            <div style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: statusLabels[r.state].color + "22", color: statusLabels[r.state].color, border: `1px solid ${statusLabels[r.state].color}44` }}>
              {statusLabels[r.state].label}
            </div>
          )}

          <div style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: (qualityLevels[Number(r.quality || 1)]?.color || "#94a3b8") + "22", color: qualityLevels[Number(r.quality || 1)]?.color || "#94a3b8" }}>
            {qualityLevels[Number(r.quality || 1)]?.label || "⭐ نامعتبر"}
          </div>

          <div style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: priorityLevels[Number(r.priority || 1)]?.color || "#64748b", color: "#fff" }}>
            {priorityLevels[Number(r.priority || 1)]?.label || "عادی"}
          </div>

          {/* نشانگر دامنه‌ی انتشار گزارش */}
          <div style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: (classificationLevels[Number(r.classification || 1)]?.color || "#10b981") + "22", color: classificationLevels[Number(r.classification || 1)]?.color || "#10b981", border: `1px solid ${classificationLevels[Number(r.classification || 1)]?.color || "#10b981"}44` }}>
            {classificationLevels[Number(r.classification || 1)]?.label || "عمومی"}
          </div>
        </div>
      </div>

      {/* نمایش عنوان فرعی کارت در مانیتورینگ */}
      {r.title && (
        <div style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "bold", marginBottom: "6px" }}>
          عنوان: {r.title}
        </div>
      )}

      <p className="page-scalable-text" style={{ flex: 1, lineHeight: "1.7", textAlign: "justify", margin: "5px 0", whiteSpace: "pre-line" }}>
        {r.cleaned_text || r.raw_text}
      </p>

      {showRejectBox && (
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "8px", borderRadius: "8px", margin: "8px 0", display: "flex", flexDirection: "column", gap: "6px" }}>
          <input 
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px", color: "#fff", fontSize: "12px", fontFamily: "inherit" }} 
            placeholder="علت برگشت سریع..." value={rejectReason} onChange={(e) => setRejectReason(clampText(e.target.value, FIELD_FIELD_LIMITS.managerComment))} maxLength={FIELD_FIELD_LIMITS.managerComment}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button onClick={() => setShowRejectBox(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11px", cursor: "pointer" }}>انصراف</button>
            <button onClick={() => { onQuickReject(rejectReason); setShowRejectBox(false); }} style={{ background: "#f59e0b", border: "none", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>تایید برگشت</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "8px", borderTop: `1px dashed ${theme.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", opacity: 0.5, fontSize: "10px" }}>
          <ClockIcon />
          {/* 🌟 نمایش تضمین‌شده ساعت‌ها در کارت پایش به صورت فرمت دورقمی تمیز 00:00 */}
          <span>{toPersianDigits(cleanDateString(r.date))} - {formatTimeDigits(r.time)}</span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {!showRejectBox && (
            <button onClick={() => setShowRejectBox(true)} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", display: "flex", alignItems: "center" }} title="برگشت سریع">
              <CornerUpLeftIcon />
            </button>
          )}
          <button onClick={onEdit} style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", display: "flex", alignItems: "center" }} title="بررسی و اقدام">
            <Edit3Icon />
          </button>
        </div>
      </div>
    </div>
  );
}

// استایل‌های درون‌خطی کمکی
const inputTextStyle = {
  width: "100%",
  background: "rgba(0,0,0,0.2)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "10px 12px",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box"
};
