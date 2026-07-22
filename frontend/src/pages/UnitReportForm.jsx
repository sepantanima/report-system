import React, { useState, useEffect, useRef, useMemo } from "react";
import apiClient from "../api/api";
import { useNavigate } from "react-router-dom";
import { useAppTheme } from "../context/ThemeContext";
import { getUnitReportFormStyles } from "../theme/unitReportFormStyles";
import CharCounter from "../components/news/CharCounter.jsx";
import { FIELD_FIELD_LIMITS, validateUnitReportPayload } from "../constants/fieldFieldLimits.js";
import { clampText } from "../utils/limitInput.js";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { PAGE_WIDE_MAX, PAGE_CONTENT_PX, scalePageWidth } from "../constants/pageLayoutWidths.js";
import { UNIT_REPORT_HELP, UNIT_REPORT_OUTPUT_HELP } from "../content/fieldFormHelp.jsx";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import DailyQuotaBanner, { isQuotaExhausted } from "../components/common/DailyQuotaBanner.jsx";
import EntityMessagesPanel from "../components/messaging/EntityMessagesPanel.jsx";

// ۶. دیکودر JWT بومی سبک برای استخراج توکن بدون نیاز به jwt-decode
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
    console.error("JWT Decode Error", e);
    return {};
  }
};

// ۷. مبدل بومی تاریخ میلادی به شمسی (بهینه‌شده جهت حذف کامل کاراکترهای نامرئی کنترل جهت یونیکد)
const convertToPersianDate = (gregorianDate) => {
  try {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    let formatted = new Intl.DateTimeFormat("fa-IR-u-ca-persian", options)
      .format(gregorianDate)
      .replace(/\//g, "-")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    
    // پاکسازی قطعی هرگونه کاراکتر کنترل جهت متن یا فضاهای نامرئی متداول مرورگرها پیش از ارسال به دیتابیس
    return formatted.replace(/[^0-9-]/g, "");
  } catch (e) {
    return "1405-01-01"; // بازگشت فرمت عددی تمیز و استاندارد به عنوان فال‌بک
  }
};

// --- آیکون‌های SVG بومی (جهت پایداری کامل در زمان رندر بدون تکیه بر بسته‌های سنگین) ---
const ClipboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const XIcon = ({ onClick, style }) => (
  <svg onClick={onClick} style={{ cursor: "pointer", ...style }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

// سطوح دامنه‌ی انتشار گزارش (به‌جای رده‌بندی حفاظتی، با همین ترتیب محدودیت از کم به زیاد)
const CLASSIFICATION_OPTIONS = [
  { label: "عمومی", color: "#10b981" },
  { label: "استانی", color: "#3b82f6" },
  { label: "واحد", color: "#f59e0b" },
  { label: "خاص", color: "#ef4444" },
];

export default function UnitReportForm() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const {
    containerStyle,
    cardStyle,
    dateTopBar,
    rejectedAlertStyle,
    goToTargetBtn,
    unitBadge,
    formContent,
    inputWrapper,
    labelRow,
    labelStyle,
    inputStyle,
    selectStyle,
    textareaStyle,
    priorityGroup,
    priorityBtn,
    historyLink,
    clearLink,
    miniHistoryBox,
    historyItem,
    btnRow,
    sendBtn,
    showListBtn,
    reportListContainer,
    panelTopBar,
    searchWrapper,
    searchInput,
    closeBtn,
    printActionBtn,
    finalTable,
    thStyle,
    catRow,
    dataRow,
    tdStyleCenter,
    tdStyleBold,
    tdStyleJustify,
    editIconBtn,
    modalOverlay,
    modalContent,
    closeModalBtn,
    backBtn,
    redWarningBox,
    headingOnCard,
    subMuted,
    helpBodyText,
    helpHeadingBorder,
    rejectedCardBg,
    rejectedInnerTextBg,
    rejectedInnerTextColor,
    emptyStateColor,
  } = useMemo(() => getUnitReportFormStyles(isDarkMode), [isDarkMode]);

  const entityMsgTheme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "#334155" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
  }), [isDarkMode]);
  const historyPanelRef = useRef(null);
  
  // --- وضعیت‌های اصلی فرم ثبت گزارش ---
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reportTypes, setReportTypes] = useState([]); // موضوعات مجاز از سرور
  const [selectedType, setSelectedType] = useState(""); // موضوع انتخاب شده
  const [loading, setLoading] = useState(false); // وضعیت لودینگ ارسال
  const [priority, setPriority] = useState("عادی"); // اولویت یکپارچه (عادی، مهم، فوری)
  const [classification, setClassification] = useState("عمومی"); // دامنه‌ی انتشار (عمومی، استانی، واحد، خاص)
  const [rejectedReportsCount, setRejectedReportsCount] = useState(0); // تعداد گزارشات برگشتی

  // --- وضعیت‌های اطلاعات کاربر و پنل‌ها ---
  const [userMeta, setUserMeta] = useState({ name: "...", unitcd: "---", statename: "نامشخص" });
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());
  const [reportPickerDate, setReportPickerDate] = useState(() => new DateObject({ calendar: persian }));
  const [dailyReports, setDailyReports] = useState({}); // گزارش‌های دسته‌بندی شده
  const [searchTerm, setSearchTerm] = useState(""); // فیلتر جستجوی زنده جدول

  // --- وضعیت‌های مربوط به بخش ویرایش گزارش ---
  const [editingReport, setEditingReport] = useState(null); 
  const [editTitle, setEditTitle] = useState(""); 
  const [editText, setEditText] = useState(""); 
  const [editPriority, setEditPriority] = useState("عادی"); 
  const [editClassification, setEditClassification] = useState("عمومی"); 

  const [showHistoryPanel, setShowHistoryPanel] = useState(false); // پاپ‌آپ سوابق کوچک

  // --- وضعیت‌های گزارش‌های برگشتی ---
  const [rejectedReportsList, setRejectedReportsList] = useState([]); 
  const [showRejectedModal, setShowRejectedModal] = useState(false); 
  const [editingRejectedReport, setEditingRejectedReport] = useState(null); 
  const [topicHistory, setTopicHistory] = useState([]);
  const [dailyQuota, setDailyQuota] = useState(null);

  // بستن منوی سوابق با کلیک روی محیط بیرون
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (historyPanelRef.current && !historyPanelRef.current.contains(event.target)) {
        setShowHistoryPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // بارگذاری داده‌های اولیه کاربر و موضوعات مجاز
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = decodeToken(token);
        setUserMeta({
          name: decoded.name || "کاربر",
          unitcd: decoded.unitcd || "---",
          statename: decoded.statename || "نامشخص",
        });
      } catch (e) {
        console.error("Token Error", e);
      }
    }
    
    // دریافت موضوعات مجاز از سرور
    apiClient.get("/reports/types")
      .then((res) => {
        setReportTypes(res.data);
        if (res.data.length > 0) setSelectedType(res.data[0].title_fa);
      })
      .catch((err) => console.error("خطا در دریافت موضوعات", err));

    fetchRejectedCount();
  }, []);

  // دریافت تعداد گزارش‌های برگشت‌خورده کاربر
  const fetchRejectedCount = () => {
    apiClient.get("/reports/rejected-count")
      .then((res) => {
        setRejectedReportsCount(res.data.count || 0);
      })
      .catch((err) => console.log("خطا در بررسی گزارشات برگشتی", err));
  };

  // دریافت لیست کامل گزارش‌های برگشت‌خورده
  const fetchRejectedList = async () => {
    try {
      const res = await apiClient.get("/reports/rejected-list");
      setRejectedReportsList(res.data || []);
    } catch (err) {
      console.error("خطا در دریافت لیست گزارشات برگشتی", err);
    }
  };

  // دریافت سوابق موضوعی سریع بر اساس فیلتر موضوع
  const fetchHistory = async () => {
    if (!selectedType) return;
    try {
      const res = await apiClient.get(`/reports/by-topic?topic=${selectedType}`);
      setTopicHistory(res.data || []);
    } catch (err) {
      setTopicHistory([]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedType]);

  const getTodayFa = () => convertToPersianDate(new Date());

  const fetchDailyQuota = async () => {
    try {
      const res = await apiClient.get(`/reports/daily-quota?date=${getTodayFa()}`);
      setDailyQuota(res.data);
    } catch {
      setDailyQuota(null);
    }
  };

  useEffect(() => {
    fetchDailyQuota();
  }, []);

  // توابع کمکی برای فیلتر و تبدیل اعداد
  const cleanStr = (str) =>
    String(str || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[^0-9]/g, "");

  const getFullTodayText = () => {
    return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  };

  const newReportFieldError = useMemo(
    () => validateUnitReportPayload({ title, text }),
    [title, text],
  );
  const editFieldError = useMemo(
    () => validateUnitReportPayload({ title: editTitle, text: editText }, { edit: true }),
    [editTitle, editText],
  );

  // دریافت گزارش‌های روزانه بر اساس تاریخ انتخابی
  const fetchDailyReports = async (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const formattedPersianDate = convertToPersianDate(d);

    try {
      const res = await apiClient.get(`/reports/by-date?date=${formattedPersianDate}`);
      const rawData = Array.isArray(res.data) ? res.data : [];
      const grouped = rawData.reduce((acc, obj) => {
        const key = obj.category || "گزارشات میدانی";
        if (!acc[key]) acc[key] = [];
        acc[key].push(obj);
        return acc;
      }, {});
      setDailyReports(grouped);
    } catch (err) {
      setDailyReports({});
    }
  };

  // ارسال گزارش جدید به سرور
  const handleSend = async () => {
    if (!title.trim() || !text.trim()) return alert("لطفاً فیلدها را پر کنید");
    const fieldErr = validateUnitReportPayload({ title: title.trim(), text: text.trim() });
    if (fieldErr) return alert(`خطا: ${fieldErr}`);

    setLoading(true);
    const currentTypeObj = reportTypes.find((t) => t.title_fa === selectedType);
    const message_type = currentTypeObj ? currentTypeObj.type_code : "DEFAULT";
    const targetDate = getTodayFa();

    try {
      await apiClient.post("/reports", { 
        title: title.trim(), 
        text: text.trim(), 
        chat_title: selectedType,
        message_type: message_type,
        date: targetDate,
        priority: priority,
        classification: classification 
      });
      setTitle("");
      setText("");
      setPriority("عادی");
      setClassification("عمومی");
      fetchHistory();
      fetchDailyQuota();
      alert("✅ گزارش با موفقیت ثبت شد");
    } catch (err) {
      alert(err.response?.data?.error ? `❌ ${err.response.data.error}` : "❌ خطا در ثبت گزارش");
    } finally {
      setLoading(false);
    }
  };

  // ثبت ویرایش نهایی روی گزارش عادی
  const submitEdit = async () => {
    if (!editTitle.trim() || !editText.trim()) return alert("فیلدها نباید خالی باشند");
    const fieldErr = validateUnitReportPayload(
      { title: editTitle.trim(), text: editText.trim() },
      { edit: true },
    );
    if (fieldErr) return alert(`خطا: ${fieldErr}`);

    try {
      const currentTypeObj = reportTypes.find((t) => t.title_fa === editingReport.category);
      const message_type = currentTypeObj ? currentTypeObj.type_code : "DEFAULT";

      await apiClient.put(`/reports/update/${editingReport.hash_key}`, {
        title: editTitle.trim(),
        text: editText.trim(),
        chat_title: editingReport.category,
        message_type: message_type,
        priority: editPriority,
        classification: editClassification
      });
      alert("✅ تغییرات اعمال شد");
      setEditingReport(null);
      fetchDailyReports(reportDate);
      fetchRejectedCount();
    } catch (err) {
      alert(err.response?.data?.error ? `❌ ${err.response.data.error}` : "❌ خطا در ویرایش گزارش");
    }
  };

  // ثبت اصلاحیه روی گزارش برگشت‌خورده و ارسال مجدد به مرکز
  const submitRejectedEdit = async () => {
    if (!editTitle.trim() || !editText.trim()) return alert("فیلدها نباید خالی باشند");
    const fieldErr = validateUnitReportPayload(
      { title: editTitle.trim(), text: editText.trim() },
      { edit: true },
    );
    if (fieldErr) return alert(`خطا: ${fieldErr}`);

    try {
      const currentTypeObj = reportTypes.find((t) => t.title_fa === editingRejectedReport.category);
      const message_type = currentTypeObj ? currentTypeObj.type_code : "DEFAULT";

      await apiClient.put(`/reports/update/${editingRejectedReport.hash_key}`, {
        title: editTitle.trim(),
        text: editText.trim(),
        chat_title: editingRejectedReport.category,
        message_type: message_type,
        priority: editPriority,
        classification: editClassification
      });
      alert("✅ گزارش با موفقیت اصلاح و مجدداً ارسال گردید");
      setEditingRejectedReport(null);
      
      fetchRejectedCount();
      fetchRejectedList();
      
      if (showReportsPanel) {
        fetchDailyReports(reportDate);
      }
    } catch (err) {
      alert(err.response?.data?.error ? `❌ ${err.response.data.error}` : "❌ خطا در ویرایش و ارسال مجدد گزارش برگشتی");
    }
  };

  const handleDelete = async (hash_key) => {
    if (!window.confirm("آیا از حذف این گزارش اطمینان دارید؟")) return;
    try {
      await apiClient.delete(`/reports/delete/${hash_key}`);
      alert("✅ گزارش با موفقیت حذف شد");
      fetchDailyReports(reportDate);
      fetchRejectedCount();
      if (showRejectedModal) {
        fetchRejectedList();
      }
    } catch (err) {
      alert(err.response?.data?.error || "خطا در حذف گزارش");
    }
  };

  const openReportsPanel = () => {
    const today = new Date();
    const picker = new DateObject({ calendar: persian });
    setSearchTerm("");
    setReportDate(today);
    setReportPickerDate(picker);
    fetchDailyReports(today);
    setShowReportsPanel(true);
  };

  const handleReportDatePickerChange = (d) => {
    if (!d) return;
    setReportPickerDate(d);
    const jsDate = d.toDate?.() ? d.toDate() : new Date(d);
    setReportDate(jsDate);
    fetchDailyReports(jsDate);
  };

  const reportDateSubtitle = useMemo(
    () => `تاریخ: ${toPersianDigits(convertToPersianDate(reportDate).replace(/-/g, "/"))}`,
    [reportDate],
  );

  return (
    <>
      <FormPageLayout
        title={showReportsPanel ? "مشاهده خروجی یگان" : "گزارش میدانی یگان"}
        subtitle={showReportsPanel ? reportDateSubtitle : undefined}
        onBack={showReportsPanel ? () => setShowReportsPanel(false) : undefined}
        backTo="/main"
        onHelp={showReportsPanel ? () => <UNIT_REPORT_OUTPUT_HELP /> : () => <UNIT_REPORT_HELP />}
        helpTitle={showReportsPanel ? "راهنمای مشاهده خروجی یگان" : "راهنمای ثبت گزارش میدانی"}
        card
        wide
        headerEnd={!showReportsPanel ? (
          <>
            <span style={{ fontSize: "0.79em", color: subMuted }}>{userMeta.name}</span>
            <div style={unitBadge}>{userMeta.unitcd}</div>
          </>
        ) : undefined}
      >
      {!showReportsPanel ? (
      <div className="no-print">
        <div style={dateTopBar}>
          📅 امروز: {getFullTodayText()}
        </div>

        <DailyQuotaBanner quota={dailyQuota} itemLabel="گزارش" isDarkMode={isDarkMode} />

        {/* هشدار گزارشات برگشت‌خورده */}
        {rejectedReportsCount > 0 && (
          <div style={rejectedAlertStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertIcon />
              <span>شما تعداد {rejectedReportsCount} گزارش برگشت‌خورده دارید!</span>
            </div>
            <button 
              onClick={() => {
                fetchRejectedList();
                setShowRejectedModal(true);
              }} 
              style={goToTargetBtn}
            >
              مشاهده و ویرایش مجدد
            </button>
          </div>
        )}

        <div style={formContent}>
          <div style={inputWrapper} ref={historyPanelRef}>
            <div style={labelRow}>
              <label style={labelStyle}>موضوع گزارش</label>
              {topicHistory.length > 0 && (
                <button onClick={() => setShowHistoryPanel(!showHistoryPanel)} style={historyLink}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {topicHistory.length} سابقه اخیر
                </button>
              )}
            </div>
            <select
              style={selectStyle}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {reportTypes.map((t, i) => (
                <option key={i} value={t.title_fa}>
                  {t.title_fa}
                </option>
              ))}
            </select>
            {showHistoryPanel && (
              <div style={miniHistoryBox}>
                {topicHistory.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setTitle(h.title);
                      setText(h.raw_text || h.text);
                      setShowHistoryPanel(false);
                    }}
                    style={historyItem}
                  >
                    <div style={{ fontWeight: "bold", color: headingOnCard, fontSize: "12px" }}>{h.title}</div>
                    <div style={{ fontSize: "10px", color: subMuted }}>{(h.raw_text || h.text || "").substring(0, 40)}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={inputWrapper}>
            <div style={labelRow}>
              <label style={labelStyle}>عنوان گزارش</label>
              <CharCounter
                current={title.length}
                max={FIELD_FIELD_LIMITS.unitTitle}
                style={{ fontWeight: "bold", color: title.length > FIELD_FIELD_LIMITS.unitTitle ? "#ef4444" : "#64748b" }}
              />
            </div>
            <input
              style={{
                ...inputStyle,
                borderColor: title.length > FIELD_FIELD_LIMITS.unitTitle ? "#ef4444" : "#334155"
              }}
              value={title}
              onChange={(e) => setTitle(clampText(e.target.value, FIELD_FIELD_LIMITS.unitTitle))}
              placeholder="عنوان خلاصه گزارش را وارد کنید..."
              maxLength={FIELD_FIELD_LIMITS.unitTitle}
            />
          </div>

          <div style={inputWrapper}>
            <div style={labelRow}>
              <label style={labelStyle}>شرح واقعه گزارش</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <CharCounter
                  current={text.length}
                  max={FIELD_FIELD_LIMITS.unitContent}
                  style={{ fontWeight: "bold", color: text.length > FIELD_FIELD_LIMITS.unitContent ? "#ef4444" : "#64748b" }}
                />
                {(title || text) && (
                  <button onClick={() => { setTitle(""); setText(""); }} style={clearLink}>
                    <TrashIcon /> پاکسازی فرم
                  </button>
                )}
              </div>
            </div>
            <textarea
              style={{
                ...textareaStyle,
                borderColor: text.length > FIELD_FIELD_LIMITS.unitContent ? "#ef4444" : "#334155"
              }}
              value={text}
              onChange={(e) => setText(clampText(e.target.value, FIELD_FIELD_LIMITS.unitContent))}
              placeholder="شرح کامل، مستند و جزییات دقیق گزارش را یادداشت کنید..."
              maxLength={FIELD_FIELD_LIMITS.unitContent}
            />
          </div>

          <div style={inputWrapper}>
            <label style={labelStyle}>اولویت فوریت گزارش</label>
            <div style={priorityGroup}>
              {["عادی", "مهم", "فوری"].map((p) => {
                const isActive = priority === p;
                let activeColor = "#3b82f6";
                if (p === "مهم") activeColor = "#f59e0b";
                if (p === "فوری") activeColor = "#ef4444";

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      ...priorityBtn,
                      background: isActive ? activeColor : "#1e293b",
                      border: isActive ? `1px solid ${activeColor}` : "1px solid #334155",
                      color: isActive ? "#fff" : "#94a3b8",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={inputWrapper}>
            <label style={labelStyle}>دامنه‌ی انتشار گزارش</label>
            <div style={priorityGroup}>
              {CLASSIFICATION_OPTIONS.map((c) => {
                const isActive = classification === c.label;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setClassification(c.label)}
                    style={{
                      ...priorityBtn,
                      background: isActive ? c.color : "#1e293b",
                      border: isActive ? `1px solid ${c.color}` : "1px solid #334155",
                      color: isActive ? "#fff" : "#94a3b8",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={btnRow}>
            <button
              onClick={handleSend}
              disabled={loading || !title.trim() || !text.trim() || !!newReportFieldError || isQuotaExhausted(dailyQuota)}
              style={{
                ...sendBtn,
                opacity: loading || !title.trim() || !text.trim() || newReportFieldError || isQuotaExhausted(dailyQuota) ? 0.55 : 1,
                cursor: loading || newReportFieldError || isQuotaExhausted(dailyQuota) ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "در حال ارسال..." : "ارسال نهایی گزارش به مرکز"}
            </button>
          </div>

          <div style={{ marginTop: "12px" }}>
            <button
              onClick={openReportsPanel}
              style={{ ...showListBtn, width: "100%" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg> مشاهده خروجی امروز یگان
            </button>
          </div>
        </div>
      </div>
      ) : (
          <div style={{ padding: "12px 16px 24px", maxWidth: PAGE_WIDE_MAX, margin: "0 auto" }}>
          <div className="form-page-panel-bar no-print">
            <div className="form-page-search" style={{ ...searchWrapper, flex: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "10px", flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                style={{ ...searchInput, flex: 1, minWidth: 0 }}
                placeholder="جستجو در متن یا عنوان گزارش..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.86em", flexShrink: 0 }}
                >
                  حذف فیلتر
                </button>
              ) : null}
            </div>
            <div className="form-page-date">
              <ThemedDatePicker
                isDarkMode={isDarkMode}
                value={reportPickerDate}
                onChange={handleReportDatePickerChange}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                calendarPosition="bottom-right"
                placeholder="انتخاب تاریخ شمسی"
              />
            </div>
            <button type="button" onClick={() => window.print()} style={printActionBtn} className="no-print">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px" }}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              چاپ فیزیکی لیست
            </button>
          </div>

          <div className="form-page-table-wrap print-area">
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ textAlign: "center", color: headingOnCard }} className="print-black-text">گزارش روزانه میدانی یگان</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", color: headingOnCard }} className="print-border-black">
                <tbody>
                  <tr>
                    <td style={{ padding: "10px", border: "1px solid #334155" }} className="print-border-black"><strong>یگان:</strong> {userMeta.unitcd}</td>
                    <td style={{ padding: "10px", border: "1px solid #334155", textAlign: "center" }} className="print-border-black"><strong>اپراتور فرستنده:</strong> {userMeta.name}</td>
                    <td style={{ padding: "10px", border: "1px solid #334155", textAlign: "left" }} className="print-border-black"><strong>تاریخ خروجی:</strong> {convertToPersianDate(reportDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table style={finalTable} className="print-border-black form-page-table">
              <thead>
                <tr style={{ background: "#1e293b" }}>
                  <th style={thStyle} className="col-short">تاریخ ثبت</th>
                  <th style={thStyle} className="col-short">ساعت</th>
                  <th style={thStyle} className="col-short">اولویت</th>
                  <th style={thStyle} className="col-title">عنوان</th>
                  <th style={thStyle} className="col-wide">شرح کامل گزارش واقعه</th>
                  <th style={thStyle} className="col-actions no-print">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(dailyReports).length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>گزارشی یافت نشد.</td></tr>
                )}
                {Object.keys(dailyReports).map((cat) => {
                  const filteredList = dailyReports[cat].filter((r) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.trim();
                    const matchTitle = r.title && r.title.includes(term);
                    const matchText = (r.raw_text || r.text) && (r.raw_text || r.text).includes(term);
                    const matchRejectedStatus = term === "برگشتی" && r.state === "rejected";
                    return matchTitle || matchText || matchRejectedStatus;
                  });

                  if (filteredList.length === 0) return null;

                  return (
                    <React.Fragment key={cat}>
                      <tr style={catRow} className="print-border-black"><td colSpan="6">{cat}</td></tr>
                      {filteredList.map((r, i) => (
                        <tr key={i} style={dataRow} className="print-border-black">
                          <td style={tdStyleCenter} className="p-black">{r.date}</td>
                          <td style={tdStyleCenter} className="p-black">{r.send_time}</td>
                          <td style={{ 
                            ...tdStyleCenter, 
                            color: r.priority === "فوری" ? "#ef4444" : r.priority === "مهم" ? "#f59e0b" : "#3b82f6" 
                          }} className="p-black">
                            {r.priority || "عادی"}
                          </td>
                          <td style={tdStyleBold} className="p-black">{r.title}</td>
                          <td style={tdStyleJustify} className="p-black">
                            {r.state === "rejected" && <span style={{color: "#ef4444", fontWeight: "bold"}}>(⚠️ برگشت خورده) </span>}
                            {r.raw_text || r.text}
                          </td>
                          <td style={tdStyleCenter} className="no-print">
                            {cleanStr(r.date) === cleanStr(getTodayFa()) || r.state === "rejected" ? (
                              <div className="action-btns-container">
                                <button
                                  onClick={() => {
                                    setEditingReport(r);
                                    setEditTitle(r.title);
                                    setEditText(r.raw_text || r.text);
                                    setEditPriority(r.priority || "عادی");
                                    setEditClassification(r.classification || "عمومی");
                                  }}
                                  style={editIconBtn}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDelete(r.hash_key)} style={{ ...editIconBtn, color: "#ef4444" }}><TrashIcon /></button>
                              </div>
                            ) : (<span>🔒</span>)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </FormPageLayout>

      {editingReport && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: `${scalePageWidth(600)}px` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
              <span style={{ fontWeight: "bold", color: "#0ea5e9" }}>اصلاح و ویرایش گزارش عادی</span>
              <XIcon onClick={() => setEditingReport(null)} style={{ color: "#94a3b8" }} />
            </div>
            
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>اصلاح عنوان</label>
              <input
                style={inputStyle}
                value={editTitle}
                onChange={(e) => setEditTitle(clampText(e.target.value, FIELD_FIELD_LIMITS.unitShort))}
                maxLength={FIELD_FIELD_LIMITS.unitShort}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>اصلاح متن گزارش</label>
              <textarea
                style={{ ...textareaStyle, height: "150px" }}
                value={editText}
                onChange={(e) => setEditText(clampText(e.target.value, FIELD_FIELD_LIMITS.unitLong))}
                maxLength={FIELD_FIELD_LIMITS.unitLong}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>اصلاح سطح فوریت</label>
              <div style={priorityGroup}>
                {["عادی", "مهم", "فوری"].map((p) => {
                  const isActive = editPriority === p;
                  let activeColor = "#3b82f6";
                  if (p === "مهم") activeColor = "#f59e0b";
                  if (p === "فوری") activeColor = "#ef4444";

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      style={{
                        ...priorityBtn,
                        background: isActive ? activeColor : "#1e293b",
                        border: isActive ? `1px solid ${activeColor}` : "1px solid #334155",
                        color: isActive ? "#fff" : "#94a3b8",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>اصلاح دامنه‌ی انتشار</label>
              <div style={priorityGroup}>
                {CLASSIFICATION_OPTIONS.map((c) => {
                  const isActive = editClassification === c.label;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setEditClassification(c.label)}
                      style={{
                        ...priorityBtn,
                        background: isActive ? c.color : "#1e293b",
                        border: isActive ? `1px solid ${c.color}` : "1px solid #334155",
                        color: isActive ? "#fff" : "#94a3b8",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingReport?.hash_key ? (
              <EntityMessagesPanel
                entityType="field_report"
                entityId={editingReport.hash_key}
                theme={entityMsgTheme}
              />
            ) : null}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={submitEdit}
                disabled={!editTitle.trim() || !editText.trim() || !!editFieldError}
                style={{
                  ...sendBtn,
                  opacity: !editTitle.trim() || !editText.trim() || editFieldError ? 0.55 : 1,
                  cursor: editFieldError ? "not-allowed" : "pointer",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> ذخیره تغییرات
              </button>
              <button onClick={() => setEditingReport(null)} style={backBtn}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال لیست گزارش‌های برگشتی کاربر */}
      {showRejectedModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: PAGE_CONTENT_PX }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${helpHeadingBorder}`, paddingBottom: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertIcon />
                <span style={{ fontWeight: "bold", color: "#f59e0b", fontSize: "16px" }}>گزارشات برگشت‌خورده توسط مدیریت ارشد ({rejectedReportsList.length})</span>
              </div>
              <XIcon onClick={() => setShowRejectedModal(false)} style={{ color: subMuted }} />
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", paddingLeft: "5px" }}>
              {rejectedReportsList.length === 0 ? (
                <div style={{ textAlign: "center", color: emptyStateColor, padding: "20px" }}>گزارش برگشتی جدیدی یافت نشد.</div>
              ) : (
                rejectedReportsList.map((r, i) => (
                  <div key={i} style={{ background: rejectedCardBg, border: "1px solid #ef4444", borderRadius: "10px", padding: "15px", marginBottom: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
                      <span style={{ color: "#38bdf8", fontWeight: "bold", fontSize: "13px" }}>موضوع: {r.category}</span>
                      <span style={{ color: subMuted, fontSize: "11px" }}>📅 {r.date} | ⏰ {r.send_time}</span>
                    </div>
                    <div style={{ fontWeight: "bold", color: headingOnCard, marginBottom: "8px", fontSize: "14px" }}>عنوان: {r.title}</div>
                    <div style={{ color: rejectedInnerTextColor, fontSize: "12.5px", textAlign: "justify", lineHeight: "1.6", background: rejectedInnerTextBg, padding: "10px", borderRadius: "8px", marginBottom: "10px" }}>{r.raw_text || r.text}</div>
                    
                    {/* نمایش علت برگشت با استفاده از فیلد جدید دیتابیس (workflow_logs) */}
                    {r.workflow_logs && (
                      <div style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.25)", marginBottom: "10px", whiteSpace: "pre-line" }}>
                        <strong>⚠️ تاریخچه جریان رفت و برگشت و علت عدم تایید:</strong>
                        <div style={{ marginTop: "4px" }}>{r.workflow_logs}</div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifySelf: "end", gap: "8px" }}>
                      <button 
                        onClick={() => {
                          setEditingRejectedReport(r);
                          setEditTitle(r.title);
                          setEditText(r.raw_text || r.text);
                          setEditPriority(r.priority || "عادی");
                          setEditClassification(r.classification || "عمومی");
                        }}
                        style={{ ...goToTargetBtn, background: "#f59e0b" }}
                      >
                        <svg style={{ marginLeft: "4px" }} xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> اصلاح و ارسال مجدد به مانیتورینگ
                      </button>
                      <button 
                        onClick={() => handleDelete(r.hash_key)}
                        style={{ ...goToTargetBtn, background: "#ef4444" }}
                      >
                        <TrashIcon /> حذف دائمی
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowRejectedModal(false)} style={closeModalBtn}>بستن پنجره</button>
          </div>
        </div>
      )}

      {/* مودال ویرایش و اصلاح گزارش برگشتی */}
      {editingRejectedReport && (
        <div style={{ ...modalOverlay, zIndex: 1100 }}>
          <div style={{ ...modalContent, maxWidth: `${scalePageWidth(600)}px` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
              <span style={{ fontWeight: "bold", color: "#f59e0b" }}>اصلاح و انتشار مجدد گزارش برگشتی</span>
              <XIcon onClick={() => setEditingRejectedReport(null)} style={{ color: "#94a3b8" }} />
            </div>

            {editingRejectedReport.workflow_logs && (
              <div style={{ background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.15)", marginBottom: "12px", whiteSpace: "pre-line" }}>
                <strong>آخرین بازخورد کارشناس مرکز:</strong>
                <div>{editingRejectedReport.workflow_logs}</div>
              </div>
            )}

            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>عنوان اصلاح‌شده (حداکثر {toPersianDigits(FIELD_FIELD_LIMITS.unitShort)} کاراکتر)</label>
              <input
                style={inputStyle}
                value={editTitle}
                onChange={(e) => setEditTitle(clampText(e.target.value, FIELD_FIELD_LIMITS.unitShort))}
                maxLength={FIELD_FIELD_LIMITS.unitShort}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>متن اصلاح‌شده گزارش (حداکثر {toPersianDigits(FIELD_FIELD_LIMITS.unitLong)} کاراکتر)</label>
              <textarea
                style={{ ...textareaStyle, height: "150px" }}
                value={editText}
                onChange={(e) => setEditText(clampText(e.target.value, FIELD_FIELD_LIMITS.unitLong))}
                maxLength={FIELD_FIELD_LIMITS.unitLong}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>سطح فوریت</label>
              <div style={priorityGroup}>
                {["عادی", "مهم", "فوری"].map((p) => {
                  const isActive = editPriority === p;
                  let activeColor = "#3b82f6";
                  if (p === "مهم") activeColor = "#f59e0b";
                  if (p === "فوری") activeColor = "#ef4444";

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      style={{
                        ...priorityBtn,
                        background: isActive ? activeColor : "#1e293b",
                        border: isActive ? `1px solid ${activeColor}` : "1px solid #334155",
                        color: isActive ? "#fff" : "#94a3b8",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>دامنه‌ی انتشار</label>
              <div style={priorityGroup}>
                {CLASSIFICATION_OPTIONS.map((c) => {
                  const isActive = editClassification === c.label;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setEditClassification(c.label)}
                      style={{
                        ...priorityBtn,
                        background: isActive ? c.color : "#1e293b",
                        border: isActive ? `1px solid ${c.color}` : "1px solid #334155",
                        color: isActive ? "#fff" : "#94a3b8",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingRejectedReport?.hash_key ? (
              <EntityMessagesPanel
                entityType="field_report"
                entityId={editingRejectedReport.hash_key}
                theme={entityMsgTheme}
              />
            ) : null}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={submitRejectedEdit}
                disabled={!editTitle.trim() || !editText.trim() || !!editFieldError}
                style={{
                  ...sendBtn,
                  background: "#f59e0b",
                  opacity: !editTitle.trim() || !editText.trim() || editFieldError ? 0.55 : 1,
                  cursor: editFieldError ? "not-allowed" : "pointer",
                }}
              >
                <svg style={{ marginLeft: "4px" }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> اصلاح و ارسال مجدد
              </button>
              <button onClick={() => setEditingRejectedReport(null)} style={backBtn}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* تزریق استایل‌های سراسری، چاپی و بهینه‌سازی شده */}
      <style>{`
        .date-input { ${isDarkMode ? "background:#1e293b; border:1px solid #334155; color:#fff;" : "background:#ffffff; border:1px solid #cbd5e1; color:#0f172a;"} padding:6px; border-radius:6px; text-align:center; width:130px; cursor:pointer; font-family: inherit; }
        .action-btns-container { display: flex; gap: 10px; justify-content: center; align-items: center; }
        @media (max-width: 600px) {
            .action-btns-container { flex-direction: column; gap: 12px; }
            td, th { font-size: 11px !important; padding: 8px 4px !important; }
        }
        .v3-form-body { ${isDarkMode ? "background: #0f172a; color: #f1f5f9;" : "background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0;"} padding: 24px; border-radius: 16px; max-width: ${scalePageWidth(600)}px; margin: 20px auto; direction: rtl; }
        .v3-form-body label, .v3-form-body .form-label { color: ${isDarkMode ? "#cbd5e1" : "#475569"} !important; font-size: 13px; font-weight: 500; display: block; margin-bottom: 8px; margin-top: 16px; }
        .v3-form-body input[type="text"], .v3-form-body select, .v3-form-body textarea { width: 100% !important; ${isDarkMode ? "background-color: #1e293b !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: #ffffff !important;" : "background-color: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important;"} padding: 10px 14px !important; border-radius: 10px !important; font-family: inherit !important; font-size: inherit !important; outline: none !important; box-sizing: border-box; transition: border-color 0.2s; }
        .v3-form-body input:focus, .v3-form-body select:focus, .v3-form-body textarea:focus { border-color: #38bdf8 !important; }
        .v3-priority-row { display: flex; gap: 8px; width: 100%; }
        .v3-priority-btn { flex: 1; height: 40px; ${isDarkMode ? "background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8;" : "background: #f1f5f9; border: 1px solid #cbd5e1; color: #64748b;"} border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.2s; }
        .v3-priority-btn.active { color: #0f172a; font-weight: bold; border-color: #38bdf8; }
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .print-black-text, .p-black { color: black !important; }
            .print-border-black, .print-border-black td, .print-border-black th { border: 1px solid black !important; }
            th:nth-child(1), td:nth-child(1) { width: 12% !important; }
            th:nth-child(2), td:nth-child(2) { width: 10% !important; }
            th:nth-child(3), td:nth-child(3) { width: 12% !important; }
            th:nth-child(4), td:nth-child(4) { width: 18% !important; }
            th:nth-child(5), td:nth-child(5) { width: 48% !important; }
            th:nth-child(6), td:nth-child(6) { display: none !important; }
        }
      `}</style>
    </>
  );
}