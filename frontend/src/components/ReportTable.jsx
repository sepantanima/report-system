import React, { useState, useEffect, useMemo } from "react";

// =========================================================================
// 🌟 راهنمای فعال‌سازی ایمپورت‌ها در پروژه واقعی شما:
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
import api from "../api/api";
import { exportToExcel } from "../utils/excelExport";
// =========================================================================

// // 🌟 تعریف متغیرهای پشتیبان جهت جلوگیری از خطای esbuild در زمان بیلد کانوس
// const api = window.api || {
//   get: async (url, config) => ({ data: [] })
// };
// const exportToExcel = window.exportToExcel || (() => {});

// تابع کمکی برای فارسی‌سازی اعداد در جدول تفصیلی و شماره صفحات
const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

const toEnDigit = (s) => {
  if (!s) return "";
  return s.toString().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
};

export default function ReportTable({
  startDate,
  endDate,
  targetUnitCd,
  targetProvince,
  targetTopic,
  priority,
  quality,
  status, // این متغیر در فیلترها معادل state گزارش است
  showDeleted,
  unitName,
  isDarkMode,
}) {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 🌟 آرایه پیکربندی ستون‌ها هماهنگ با نام فیلدهای جدید پایگاه‌داده شما
  const [columnConfig, setColumnConfig] = useState([
    { key: "date", title: "تاریخ", visible: true, width: 90 },
    { key: "chat_title", title: "موضوع", visible: true, width: 110 },
    { key: "priority", title: "اهمیت", visible: true, width: 80 },
    { key: "state", title: "وضعیت", visible: true, width: 90 }, // فیلد جدید وضعیت (state)
    { key: "quality", title: "کیفیت گزارش", visible: true, width: 110 }, // ستون جدید کیفیت
    { key: "cleaned_text", title: "متن نهایی", visible: true, width: 250 }, // فیلد متن ویراستاری شده
    { key: "raw_text", title: "متن خام", visible: true, width: 250 }, // فیلد متن اصلی ارسالی یگان
    { key: "manager_notes", title: "توضیحات مدیریت", visible: true, width: 200 }, // فیلد جدید یادداشت مدیر
    { key: "StateName", title: "استان", visible: true, width: 100 },
    { key: "UnitShortName", title: "واحد", visible: true, width: 120 },
    { key: "sender_name", title: "فرستنده", visible: true, width: 100 },
  ]);

  // ساخت عنوان پویا و هوشمند برای گزارش‌های چاپی و نام فایل اکسل
  const dynamicTitle = useMemo(() => {
    let title = `گزارش کلی موضوعات`;
    if (unitName) title += ` واحد ${unitName}`;
    if (targetProvince) title += ` استان ${targetProvince}`;
    title += ` بازه ${toPersianDigits(startDate)} الی ${toPersianDigits(endDate)}`;
    return title;
  }, [targetProvince, unitName, targetTopic, startDate, endDate]);

  const getSafeFileName = (name) => {
    return name.replace(/[\\/:*?"<>|]/g, "").trim();
  };

  // دریافت داده‌ها با در نظر گرفتن تمام فیلترها و حل خطای تبدیل نوع داده
  useEffect(() => {
    const fetchReports = async () => {
      if (!startDate || !endDate) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // حل ریشه‌ای خطای دیتابیس (integer = text) با تبدیل مقدار به عدد قبل از ارسال به بک‌باند
        const cleanUnitCd = targetUnitCd && targetUnitCd !== "" ? parseInt(toEnDigit(targetUnitCd), 10) : null;

        const params = {
          startDate,
          endDate,
          province: targetProvince || null,
          unitcd: cleanUnitCd, // تضمین ارسال به صورت Integer عددی
          topic: targetTopic || null,
          priority: priority ? parseInt(priority, 10) : null,
          quality: quality ? parseInt(quality, 10) : null,
          state: status || null, // استفاده از فیلد جدید state در فیلتر وضعیت مانیتورینگ
          showDeleted,
        };

        const res = await api.get("/reports/admin/monitor", { params, headers });
        setReports(Array.isArray(res.data) ? res.data : []);
        setCurrentPage(1); // برگشت به صفحه اول در هر فیلتر جدید
      } catch (error) {
        console.error("خطا در دریافت لیست گزارشات تفصیلی:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [
    startDate,
    endDate,
    targetUnitCd,
    targetProvince,
    targetTopic,
    priority,
    quality,
    status,
    showDeleted,
  ]);

  // استخراج متن ساده برای اکسل و چاپ با تطابق فیلدهای جدید
  const getRawValue = (report, key) => {
    if (key === "state") {
      if (report.state === "verified") return "تایید شده";
      if (report.state === "rejected") return "برگشت خورده";
      return "بررسی نشده";
    }
    if (key === "priority") {
      const p = String(report.priority);
      if (p === "5") return "فوری";
      if (p === "3") return "مهم";
      return "عادی";
    }
    // 🌟 استخراج مقدار متنی ۵ سطح کیفیت جدید در خروجی‌های جدول اکسل
    if (key === "quality") {
      const q = parseInt(report.quality, 10);
      if (q === 5) return "⭐⭐⭐⭐⭐ ممتاز";
      if (q === 4) return "⭐⭐⭐⭐ عالی";
      if (q === 3) return "⭐⭐⭐ متوسط";
      if (q === 2) return "⭐⭐ ضعیف";
      return "⭐ نامعتبر (بسیار ضعیف)";
    }
    return report[key] || "---";
  };

  // نمایش بصری درون جدول با استایل‌های جدید، آیکون و رنگ‌های هماهنگ با فرستنده
  const renderCellVisual = (report, key) => {
    const val = getRawValue(report, key);
    if (key === "state") {
      const isVerified = report.state === "verified";
      const isRejected = report.state === "rejected";
      return (
        <span
          style={{
            color: isVerified ? "#10b981" : (isRejected ? "#ef4444" : "#f59e0b"),
            fontWeight: "bold",
          }}
        >
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
    // 🌟 رندر بصری و رنگی ۵ ستاره کیفیت جدید در جدول تفصیلی
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
  };

  // فیلترینگ و مرتب‌سازی در سمت کلاینت
  const sortedReports = useMemo(() => {
    let result = reports.filter((r) =>
      Object.values(r).some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
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
  }, [reports, searchTerm, sortConfig]);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedReports.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedReports]);

  // خروجی اکسل هماهنگ شده
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
    const safeName = getSafeFileName(dynamicTitle);
    exportToExcel(dataForExcel, `${safeName}.xlsx`);
  };

  // چاپ بهینه‌سازی شده با فیلدها و استایل‌های جدید دیتابیس
  const handlePrint = () => {
    const visibleCols = columnConfig.filter((c) => c.visible);
    const safeFileName = getSafeFileName(dynamicTitle);

    const rowsHtml = sortedReports
      .map(
        (r, i) => `
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
          body { 
            direction: rtl; 
            font-family: 'Tahoma', 'Arial', sans-serif; 
            font-size: 10px; 
            padding: 20px; 
            color: #000;
          }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { 
            border: 1px solid #000; 
            padding: 8px; 
            word-wrap: break-word; 
            vertical-align: top;
          }
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: isDarkMode ? "#fff" : "#000" }}>
        در حال بارگذاری اطلاعات جدول...
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.wrapper,
        backgroundColor: isDarkMode ? "#1e293b" : "#fff",
        color: isDarkMode ? "#fff" : "#000",
      }}
    >
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="جستجو در تمام فیلدها..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            ...styles.input,
            backgroundColor: isDarkMode ? "#0f172a" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
          }}
        />

        <div style={styles.actions}>
          <button onClick={handleExport} style={styles.btnExcel} title="خروجی اکسل">
            <span className="btn-text">📊 اکسل</span>
            <span className="btn-icon">📊</span>
          </button>

          <button onClick={handlePrint} style={styles.btnPrint} title="چاپ فیزیکی">
            <span className="btn-text">🖨️ چاپ</span>
            <span className="btn-icon">🖨️</span>
          </button>

          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            style={styles.btnSec}
            title="تنظیم ستون‌ها"
          >
            ⚙️
          </button>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              ...styles.select,
              backgroundColor: isDarkMode ? "#0f172a" : "#fff",
              color: isDarkMode ? "#fff" : "#000",
            }}
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {toPersianDigits(v)} ردیف
              </option>
            ))}
          </select>
        </div>
      </div>

      {showColumnSettings && (
        <div style={styles.settingsPanel}>
          {columnConfig.map((col, idx) => (
            <label
              key={col.key}
              style={{ fontSize: "11px", cursor: "pointer", display: "flex", gap: "5px", alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() =>
                  setColumnConfig((prev) =>
                    prev.map((c, i) =>
                      i === idx ? { ...c, visible: !c.visible } : c
                    )
                  )
                }
              />{" "}
              {col.title}
            </label>
          ))}
        </div>
      )}

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #334155",
          borderRadius: "8px",
        }}
      >
        <table style={styles.table}>
          <thead>
            <tr style={{ backgroundColor: isDarkMode ? "#0f172a" : "#f5f5f5" }}>
              <th style={{ width: "45px", padding: "12px", border: "1px solid #334155" }}>ردیف</th>
              {columnConfig.map(
                (col) =>
                  col.visible && (
                    <th
                      key={col.key}
                      style={{ ...styles.th, width: `${col.width}px`, border: "1px solid #334155" }}
                    >
                      <span
                        onClick={() =>
                          setSortConfig({
                            key: col.key,
                            direction:
                              sortConfig.direction === "asc" ? "desc" : "asc",
                          })
                        }
                        style={{ cursor: "pointer" }}
                      >
                        {col.title}{" "}
                        {sortConfig.key === col.key
                          ? sortConfig.direction === "asc"
                            ? "🔼"
                            : "🔽"
                          : ""}
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
                          textAlign: [
                            "manager_notes",
                            "cleaned_text",
                            "raw_text",
                          ].includes(col.key)
                            ? "justify"
                            : "center",
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
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          style={styles.pageBtn}
        >
          قبلی
        </button>
        <span>
          صفحه {toPersianDigits(currentPage)} از{" "}
          {toPersianDigits(Math.ceil(sortedReports.length / itemsPerPage) || 1)}
        </span>
        <button
          disabled={
            currentPage >= Math.ceil(sortedReports.length / itemsPerPage)
          }
          onClick={() => setCurrentPage((p) => p + 1)}
          style={styles.pageBtn}
        >
          بعدی
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) { .btn-text { display: none; } .btn-icon { display: inline; font-size: 1.2rem; } }
        @media (min-width: 769px) { .btn-icon { display: none; } }
      `}</style>
    </div>
  );
}

const styles = {
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
    height: "40px",
    padding: "0 10px",
    borderRadius: "8px",
    border: "1px solid #334155",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  },
  actions: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
  },
  select: {
    height: "40px",
    padding: "0 8px",
    borderRadius: "5px",
    cursor: "pointer",
    boxSizing: "border-box",
    border: "1px solid #334155",
    fontFamily: "inherit",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    tableLayout: "fixed",
  },
  th: { padding: "12px" },
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
    gap: "20px",
    marginTop: "15px",
  },
  pageBtn: {
    padding: "7px 20px",
    cursor: "pointer",
    borderRadius: "6px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    fontFamily: "inherit",
  },
  btnPrint: {
    backgroundColor: "#0ea5e9",
    color: "#fff",
    border: "none",
    height: "40px",
    padding: "0 15px",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontWeight: "bold",
  },
  btnExcel: {
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    height: "40px",
    padding: "0 15px",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontWeight: "bold",
  },
  btnSec: {
    backgroundColor: "#64748b",
    color: "#fff",
    border: "none",
    height: "40px",
    width: "40px",
    padding: "0",
    borderRadius: "6px",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsPanel: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    padding: "10px",
    border: "1px solid #334155",
    marginBottom: "10px",
    borderRadius: "8px",
  },
};