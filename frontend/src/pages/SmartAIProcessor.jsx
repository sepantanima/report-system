import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { aiManager } from "../services/aiManager"; // مسیر فایل را چک کن
import { useAppTheme } from "../context/ThemeContext";

const SmartAIProcessor = () => {
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(
    () => ({
      bg: isDarkMode ? "#0f172a" : "#f8fafc",
      text: isDarkMode ? "#f1f5f9" : "#1e293b",
      border: isDarkMode ? "#334155" : "#e2e8f0",
      inputBg: isDarkMode ? "#1e293b" : "#ffffff",
      primary: "#007bff",
    }),
    [isDarkMode]
  );
  // --- وضعیت‌های برنامه (States) ---
  const [news, setNews] = useState([]); // لیست اخبار واکشی شده از دیتابیس
  const [sources, setSources] = useState([]); // لیست منابع برای منوی کشویی
  const [selectedIds, setSelectedIds] = useState([]); // آی‌دی‌های تیک‌خورده
  const [processedItems, setProcessedItems] = useState([]); // خروجی‌های هوش مصنوعی برای بازبینی
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ date: "1405-01-17", source: "" });

  // --- ۱. واکشی داده‌های اولیه (منابع و اخبار) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // دریافت منابع برای فیلتر
        const resSources = await axios.get("/api/news/sources");
        setSources(resSources.data);
        // واکشی اولیه اخبار
        fetchNews();
      } catch (error) {
        console.error("خطا در بارگذاری اولیه:", error);
      }
    };
    fetchInitialData();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/news", { params: filters });
      setNews(response.data);
      setSelectedIds([]); // ریست کردن انتخاب‌ها بعد از هر جستجو
    } catch (error) {
      console.error("خطا در واکشی اخبار:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ۲. توابع مدیریت انتخاب (Selection) ---
  const toggleSelectAll = () => {
    if (selectedIds.length === news.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(news.map((n) => n.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // --- ۳. پردازش توسط هوش مصنوعی (AI Processing) ---
  const startAIProcessing = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);

    const toProcess = news.filter((n) => selectedIds.includes(n.id));
    const tempResults = [];

    for (let item of toProcess) {
      try {
        // استفاده از متد زنجیره‌ای که در aiManager ساختیم
        const aiData = await aiManager.processNewsFullCycle(item.raw_text);
        tempResults.push({ ...item, ...aiData });
      } catch (err) {
        console.error(`خطا در پردازش خبر ${item.id}:`, err);
      }
    }

    setProcessedItems(tempResults);
    setLoading(false);
  };

  // --- ۴. ذخیره نهایی در دیتابیس (Final Save) ---
  const handleFinalSave = async (itemData) => {
    try {
      // هماهنگ با متد PUT در بک‌اِند شما
      await axios.put(`/api/news/${itemData.id}`, {
        cleaned_text: itemData.raw_text, // یا هر متنی که مایلید
        summary: itemData.summary,
        analysis: itemData.analysis,
        tags: itemData.tags,
        is_approved: 1, // تایید شده
        status: 1,
      });

      // حذف از لیست بازبینی پس از ذخیره موفق
      setProcessedItems((prev) => prev.filter((i) => i.id !== itemData.id));
      alert(`خبر ${itemData.id} با موفقیت ثبت نهایی شد.`);
    } catch (err) {
      console.error("خطا در ذخیره نهایی:", err);
      alert("خطا در برقراری ارتباط با سرور.");
    }
  };

  // --- رندر رابط کاربری (UI) ---
  return (
    <div
      style={{
        direction: "rtl",
        padding: "20px",
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>میز کار پردازش هوشمند</h2>

      {/* بخش فیلترها */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          placeholder="تاریخ (مثلاً ۱۴۰۵-۰۱-۱۷)"
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: `1px solid ${theme.border}`,
          }}
        />
        <select
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: `1px solid ${theme.border}`,
          }}
        >
          <option value="all">همه منابع</option>
          {sources.map((src, index) => (
            <option key={index} value={src}>
              {src}
            </option>
          ))}
        </select>
        <button
          onClick={fetchNews}
          style={{ padding: "8px 15px", cursor: "pointer" }}
        >
          جستجو
        </button>
      </div>

      {/* جدول اخبار خام */}
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          border: `1px solid ${theme.border}`,
          borderRadius: "8px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "right",
          }}
        >
          <thead
            style={{
              backgroundColor: theme.inputBg,
              position: "sticky",
              top: 0,
            }}
          >
            <tr>
              <th style={{ padding: "10px" }}>
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    selectedIds.length === news.length && news.length > 0
                  }
                />
              </th>
              <th>متن خبر</th>
              <th>منبع</th>
              <th>فرستنده</th>
            </tr>
          </thead>
          <tbody>
            {news.map((n) => (
              <tr
                key={n.id}
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <td style={{ padding: "10px" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(n.id)}
                    onChange={() => toggleSelect(n.id)}
                  />
                </td>
                <td
                  style={{
                    maxWidth: "400px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {n.raw_text}
                </td>
                <td>{n.source}</td>
                <td>{n.sender}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={startAIProcessing}
        disabled={selectedIds.length === 0 || loading}
        style={{
          margin: "20px 0",
          padding: "12px 25px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {loading
          ? "در حال پردازش هوشمند..."
          : `ارسال ${selectedIds.length} مورد به هوش مصنوعی`}
      </button>

      {/* میز ویرایش و تایید نهایی */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {processedItems.map((item, idx) => (
          <div
            key={item.id}
            style={{
              border: `1px solid ${theme.border}`,
              padding: "20px",
              borderRadius: "10px",
              backgroundColor: theme.inputBg,
            }}
          >
            <h4>ویرایش خروجی: {item.source}</h4>

            <label style={{ display: "block", marginTop: "10px" }}>
              خلاصه هوشمند:
            </label>
            <textarea
              style={{
                width: "100%",
                height: "100px",
                padding: "10px",
                marginTop: "5px",
              }}
              value={item.summary}
              onChange={(e) => {
                const copy = [...processedItems];
                copy[idx].summary = e.target.value;
                setProcessedItems(copy);
              }}
            />

            <label style={{ display: "block", marginTop: "10px" }}>
              تگ‌ها:
            </label>
            <input
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              value={item.tags}
              onChange={(e) => {
                const copy = [...processedItems];
                copy[idx].tags = e.target.value;
                setProcessedItems(copy);
              }}
            />

            <button
              onClick={() => handleFinalSave(item)}
              style={{
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                marginTop: "15px",
                cursor: "pointer",
              }}
            >
              تایید و ثبت نهایی در بانک
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartAIProcessor;
