import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api/api";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  HelpCircle,
  Clock,
  Hash,
  AlertTriangle,
  Check,
  Download,
  Info,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppTheme } from "../context/ThemeContext.jsx";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";

const p2e = (s) =>
  s
    ? s
        .toString()
        .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    : "";

const getTodayJalaliStr = () => {
  const d = new Date().toLocaleDateString("fa-IR-u-nu-latn").split("/");
  return `${d[0]}-${d[1].padStart(2, "0")}-${d[2].padStart(2, "0")}`;
};

export default function NewsCardManager() {
  const [news, setNews] = useState([]);
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // وضعیت نمایش راهنما
  const [editedText, setEditedText] = useState("");
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);
  const [localStatus, setLocalStatus] = useState(0);
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const newsShellStyle = useMemo(
    () => ({
      outer: {
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        background: isDarkMode ? "#0b1426" : "#e8eef4",
        position: "fixed",
        top: 0,
        left: 0,
      },
      header: {
        flexShrink: 0,
        background: isDarkMode ? "#0f172a" : "#ffffff",
        padding: "10px 15px",
        borderBottom: isDarkMode
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid #cbd5e1",
        direction: "rtl",
      },
    }),
    [isDarkMode]
  );

  const [filters, setFilters] = useState({
    date: getTodayJalaliStr(),
    approval_filter: "pending",
  });

  const fetchDailyStats = async (targetDate) => {
    try {
      const cleanDate = p2e(targetDate);
      const res = await api.get("/news", {
        params: { date: cleanDate, approval_filter: "all" },
      });
      const all = Array.isArray(res.data) ? res.data : [];
      setDailyStats({
        total: all.length,
        approved: all.filter((n) => Number(n.is_approved) === 1).length,
        rejected: all.filter((n) => Number(n.is_approved) === 2).length,
        pending: all.filter(
          (n) => !n.is_approved || Number(n.is_approved) === 0,
        ).length,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      let dateStr =
        typeof filters.date === "object"
          ? filters.date.format("YYYY-MM-DD")
          : String(filters.date);
      const cleanDate = p2e(dateStr);
      const res = await api.get("/news", {
        params: { date: cleanDate, approval_filter: filters.approval_filter },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setNews(data);
      setCurrentIndex(0);
      if (data.length > 0) setLocalStatus(data[0].status || 0);
      await fetchDailyStats(cleanDate);
    } catch (err) {
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    if (news[currentIndex]) setLocalStatus(news[currentIndex].status || 0);
  }, [currentIndex, news]);

  const currentItem = news[currentIndex] || null;
  const hasData = news.length > 0 && currentItem;
  const charCount = hasData
    ? (isEditing ? editedText : currentItem.cleaned_text || "").length
    : 0;

  const handleDownload = () => {
    if (selectedNewsIds.length === 0) {
      alert("ابتدا خبرهای مورد نظر را انتخاب کنید (تیک بزنید)");
      return;
    }
    alert(`آماده‌سازی خروجی برای ${selectedNewsIds.length} مورد...`);
  };

  const saveAndNavigate = async (direction, updatedApproved = null) => {
    if (!hasData) return;

    // ۱. گرفتن آخرین مقدار وضعیت از استیت محلی
    const currentStatusValue = Number(localStatus);

    // ۲. تعیین مقدار تایید (اگر دکمه های سبز/قرمز زده شده باشد updatedApproved مقدار دارد، وگرنه از مقدار قبلی استفاده میکند)
    const finalApprovedStatus =
      updatedApproved !== null
        ? Number(updatedApproved)
        : Number(currentItem.is_approved || 0);

    const payload = {
      cleaned_text: isEditing ? editedText : currentItem.cleaned_text,
      is_approved: finalApprovedStatus,
      status: currentStatusValue,
    };

    try {
      // ۳. اول ذخیره در دیتابیس (حتما با await)
      await api.put(`/news/${currentItem.id}`, payload);

      // ۴. آپدیت لیست در حافظه (Frontend) برای اینکه تغییرات در جا دیده شوند
      const updatedNews = [...news];
      updatedNews[currentIndex] = {
        ...updatedNews[currentIndex],
        ...payload,
      };
      setNews(updatedNews);

      // ۵. حالا جابجایی بین رکوردها
      if (filters.approval_filter !== "all" && updatedApproved !== null) {
        // اگر در حالت فیلتر بودیم، خبر تایید شده را از لیست حذف کن
        const updatedList = updatedNews.filter(
          (_, idx) => idx !== currentIndex,
        );
        setNews(updatedList);
        if (currentIndex >= updatedList.length && updatedList.length > 0) {
          setCurrentIndex(updatedList.length - 1);
        }
      } else {
        // جابجایی معمولی با دکمه های چپ و راست یا تایید/رد در حالت نمایش "همه"
        if (direction === "next" && currentIndex < news.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (direction === "prev" && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      }

      setIsEditing(false);
      // آپدیت آمار هدر
      fetchDailyStats(
        p2e(
          typeof filters.date === "object"
            ? filters.date.format("YYYY-MM-DD")
            : filters.date,
        ),
      );
    } catch (err) {
      console.error("Save Error:", err);
      alert("خطا در ذخیره سازی! لطفا اینترنت خود را چک کنید.");
    }
  };
  return (
    <div style={newsShellStyle.outer}>
      {/* Header */}
      <div style={newsShellStyle.header}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              fontSize: "10px",
              color: "#eee",
            }}
          >
            <span>
              کل:<b>{dailyStats.total}</b>
            </span>
            <span style={{ color: "#55efc4" }}>
              تایید:<b>{dailyStats.approved}</b>
            </span>
            <span style={{ color: "#ff7675" }}>
              رد:<b>{dailyStats.rejected}</b>
            </span>
            <span style={{ color: "#fdcb6e" }}>
              بررسی:<b>{dailyStats.pending}</b>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              fontSize: "11px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "rgba(0, 206, 201, 0.15)",
                color: "#00cec9",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              {hasData ? currentItem.source : "---"}
            </div>
            <div
              style={{
                color: "#fdcb6e",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Clock size={12} />{" "}
              {hasData ? currentItem.source_time_hm : "--:--"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/main")}
            style={{
              background: "#1e293b",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              width: "35px",
              height: "35px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowRight size={18} />
          </button>
          <div style={{ flex: "0 0 100px" }}>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={filters.date}
              onChange={(d) => setFilters({ ...filters, date: d })}
              inputClass="mobile-date-input"
              editable={false}
            />
          </div>
          <select
            style={{
              height: "35px",
              flex: 1,
              color: "#fff",
              background: "#1e293b",
              fontSize: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "0 5px",
            }}
            value={filters.approval_filter}
            onChange={(e) =>
              setFilters({ ...filters, approval_filter: e.target.value })
            }
          >
            <option value="all">نمایش همه</option>
            <option value="pending">بررسی نشده‌ها</option>
            <option value="approved">تایید شده‌ها</option>
            <option value="rejected">رد شده‌ها</option>
          </select>
          <div
            style={{
              color: "#a29bfe",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Hash size={12} />
            {charCount}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "15px",
          direction: "rtl",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            width: "100%",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isEditing ? (
            <textarea
              style={{
                flexGrow: 1,
                width: "100%",
                background: "#000",
                color: "#fff",
                fontSize: "18px",
                lineHeight: "1.8",
                padding: "12px",
                border: "2px solid #0984e3",
                borderRadius: "10px",
                outline: "none",
                resize: "none",
              }}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
            />
          ) : (
            <div
              style={{
                color: "#fff",
                fontSize: "18px",
                lineHeight: "2.1",
                textAlign: "justify",
                whiteSpace: "pre-wrap",
                borderRight: `4px solid ${hasData && Number(currentItem.is_approved) === 1 ? "#00b894" : hasData && Number(currentItem.is_approved) === 2 ? "#d63031" : "#4b5563"}`,
                paddingRight: "12px",
              }}
            >
              {loading
                ? "در حال بارگذاری..."
                : hasData
                  ? currentItem.cleaned_text
                  : "موردی یافت نشد"}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          background: "#0f172a",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "10px 10px 30px 10px",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "#1e293b",
              borderRadius: "8px",
              padding: "0 5px",
            }}
          >
            <AlertTriangle
              size={14}
              color="#fdcb6e"
              style={{ marginLeft: 5 }}
            />
            <select
              disabled={!hasData}
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                height: "42px",
                flex: 1,
                fontSize: "12px",
                outline: "none",
              }}
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value)}
            >
              <option value={0}>وضعیت محتوا: نامشخص</option>
              <option value={1}>✅ تایید محتوا</option>
              <option value={2}>⚠️ شایعه / تکذیب</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "10px",
              padding: "2px",
              flex: 1.2,
            }}
          >
            <button
              disabled={!hasData}
              onClick={() => saveAndNavigate("next", 1)}
              style={{
                flex: 1,
                height: "42px",
                borderRadius: "8px",
                border: "none",
                background:
                  hasData && Number(currentItem.is_approved) === 1
                    ? "#00b894"
                    : "transparent",
                color: "#fff",
              }}
            >
              <CheckCircle size={22} />
            </button>
            <button
              disabled={!hasData}
              onClick={() => saveAndNavigate("next", 0)}
              style={{
                flex: 1,
                height: "42px",
                borderRadius: "8px",
                border: "none",
                background:
                  hasData &&
                  (!currentItem.is_approved ||
                    Number(currentItem.is_approved) === 0)
                    ? "#4b5563"
                    : "transparent",
                color: "#fff",
              }}
            >
              <HelpCircle size={22} />
            </button>
            <button
              disabled={!hasData}
              onClick={() => saveAndNavigate("next", 2)}
              style={{
                flex: 1,
                height: "42px",
                borderRadius: "8px",
                border: "none",
                background:
                  hasData && Number(currentItem.is_approved) === 2
                    ? "#d63031"
                    : "transparent",
                color: "#fff",
              }}
            >
              <XCircle size={22} />
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <button
            onClick={() => saveAndNavigate("prev")}
            disabled={currentIndex === 0 || !hasData}
            style={{
              background: "#1e293b",
              color: "#fff",
              border: "none",
              width: "42px",
              height: "42px",
              borderRadius: "8px",
            }}
          >
            <ArrowRight size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                color: "#fff",
                fontSize: "13px",
                fontWeight: "bold",
                minWidth: "45px",
                textAlign: "center",
              }}
            >
              {news.length > 0 ? currentIndex + 1 : 0}/{news.length}
            </span>

            <button
              onClick={() => setShowHelp(true)}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                background: "#f1c40f",
                color: "#000",
                border: "none",
              }}
            >
              <Info size={18} />
            </button>

            <div style={{ position: "relative" }}>
              <button
                onClick={handleDownload}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  background: "#6c5ce7",
                  color: "#fff",
                  border: "none",
                }}
              >
                <Download size={18} />
              </button>
              {selectedNewsIds.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#ff7675",
                    color: "white",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #0f172a",
                  }}
                >
                  {selectedNewsIds.length}
                </span>
              )}
            </div>

            <button
              disabled={!hasData}
              onClick={() =>
                setSelectedNewsIds((p) =>
                  p.includes(currentItem.id)
                    ? p.filter((i) => i !== currentItem.id)
                    : [...p, currentItem.id],
                )
              }
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                border: "2px solid #00cec9",
                background:
                  hasData && selectedNewsIds.includes(currentItem.id)
                    ? "#00cec9"
                    : "transparent",
                color:
                  hasData && selectedNewsIds.includes(currentItem.id)
                    ? "#000"
                    : "#00cec9",
              }}
            >
              <Check size={18} />
            </button>
            <button
              disabled={!hasData}
              onClick={() => {
                if (isEditing) saveAndNavigate("stay");
                else {
                  setIsEditing(true);
                  setEditedText(currentItem.cleaned_text);
                }
              }}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                background: isEditing ? "#0984e3" : "#1e293b",
                color: "#fff",
                border: "none",
              }}
            >
              {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
            </button>
          </div>
          <button
            onClick={() => saveAndNavigate("next")}
            disabled={currentIndex === news.length - 1 || !hasData}
            style={{
              background: "#1e293b",
              color: "#fff",
              border: "none",
              width: "42px",
              height: "42px",
              borderRadius: "8px",
            }}
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      {/* Modal راهنمای جامع کاربر */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "15px",
            direction: "rtl",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              width: "100%",
              maxWidth: "450px",
              maxHeight: "90dvh",
              borderRadius: "20px",
              padding: "25px",
              border: "1px solid #38bdf8",
              position: "relative",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: "absolute",
                left: "15px",
                top: "15px",
                background: "#334155",
                border: "none",
                color: "#fff",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>

            <h2
              style={{
                color: "#38bdf8",
                marginBottom: "5px",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              آموزش کار با پنل اخبار
            </h2>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                marginBottom: "20px",
              }}
            >
              از بررسی تا خروجی نهایی در ۴ قدم
            </p>

            {/* گام های اجرایی */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <section>
                <h3
                  style={{
                    color: "#fdcb6e",
                    fontSize: "14px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      background: "#fdcb6e",
                      color: "#000",
                      padding: "0 6px",
                      borderRadius: "4px",
                    }}
                  >
                    ۱
                  </span>{" "}
                  انتخاب و فیلتر
                </h3>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  ابتدا از هدر بالا، <b>تاریخ</b> مورد نظر و <b>وضعیت نمایش</b>{" "}
                  (مثلاً بررسی نشده‌ها) را انتخاب کنید. آمار کلی در بالای صفحه
                  به شما می‌گوید چقدر کار باقی مانده است.
                </p>
              </section>

              <section>
                <h3
                  style={{
                    color: "#fdcb6e",
                    fontSize: "14px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      background: "#fdcb6e",
                      color: "#000",
                      padding: "0 6px",
                      borderRadius: "4px",
                    }}
                  >
                    ۲
                  </span>{" "}
                  ویرایش و تعیین وضعیت
                </h3>
                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: "12px",
                    lineHeight: "1.8",
                    background: "rgba(255,255,255,0.05)",
                    padding: "10px",
                    borderRadius: "10px",
                  }}
                >
                  • اگر متن نیاز به اصلاح دارد، دکمه{" "}
                  <Edit3 size={14} style={{ verticalAlign: "middle" }} /> را
                  بزنید و ویرایش کنید.
                  <br />• اگر محتوا شایعه یا تکذیبیه است، از لیست{" "}
                  <b>"وضعیت محتوا"</b> آن را مشخص کنید.
                  <br />
                  • با دکمه <CheckCircle size={14} color="#00b894" /> تایید، با{" "}
                  <HelpCircle size={14} color="#94a3b8" /> رزرو و با{" "}
                  <XCircle size={14} color="#f43f5e" /> خبر را رد کنید.
                </div>
              </section>

              <section>
                <h3
                  style={{
                    color: "#fdcb6e",
                    fontSize: "14px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      background: "#fdcb6e",
                      color: "#000",
                      padding: "0 6px",
                      borderRadius: "4px",
                    }}
                  >
                    ۳
                  </span>{" "}
                  نشانه‌گذاری برای خروجی
                </h3>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  هر خبری که می‌خواهید در فایل نهایی باشد را با دکمه{" "}
                  <Check size={14} color="#00cec9" /> تیک بزنید. تعداد موارد
                  انتخاب شده روی دکمه بنفش <Download size={14} /> نمایش داده
                  می‌شود.
                </p>
              </section>

              <section
                style={{
                  background: "rgba(244, 63, 94, 0.1)",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px dashed #f43f5e",
                }}
              >
                <h3
                  style={{
                    color: "#f43f5e",
                    fontSize: "14px",
                    marginBottom: "5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <AlertTriangle size={16} /> رفع مشکل (اگر خبرها نمی‌آیند)
                </h3>
                <ul
                  style={{
                    color: "#fda4af",
                    fontSize: "11px",
                    paddingRight: "15px",
                    lineHeight: "1.6",
                  }}
                >
                  <li>مطمئن شوید تاریخ به درستی انتخاب شده است.</li>
                  <li>
                    وضعیت نمایش را روی "همه" بگذارید تا مطمئن شوید دیتایی وجود
                    دارد.
                  </li>
                  <li>
                    اگر در موبایل دکمه‌ها زیر نوار مرورگر هستند، صفحه را یکبار
                    رفرش کنید.
                  </li>
                </ul>
              </section>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              style={{
                width: "100%",
                marginTop: "25px",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              فهمیدم، شروع کار
            </button>
          </div>
        </div>
      )}
      <style>{`.mobile-date-input { height: 35px; background: #1e293b !important; color: #fff !important; width: 100% !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px; text-align: center; font-size: 11px !important; outline: none; }`}</style>
    </div>
  );
}
