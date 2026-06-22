import React, { useState, useMemo } from "react";

// =========================================================================
// 🌟 راهنمای فعال‌سازی ایمپورت‌ها در پروژه واقعی شما:
// هنگام کپی کردن این فایل به پروژه محلی خود، کافیست خطوط زیر را از حالت کامنت خارج کنید:
//
import {
  ResponsiveContainer, PieChart, Pie, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, Legend, CartesianGrid, LabelList
} from "recharts";
import { Printer, Settings, RotateCcw } from "lucide-react";
import { renderPieExternalLabel, toPersianChartDigits } from "../utils/chartLabelUtils.jsx";
import { useChartContainerReady } from "../hooks/useChartContainerReady.js";
// =========================================================================

// // 🌟 تعریف متغیرها و کلاس‌های شبیه‌ساز Recharts جهت تضمین عدم بروز خطای کامپایل در بیلد پیش‌نمایش
// const ResponsiveContainer = window.ResponsiveContainer || (({ children }) => <div style={{width: "100%", height: "100%"}}>{children}</div>);
// const PieChart = window.PieChart || (({ children }) => <div>{children}</div>);
// const Pie = window.Pie || (() => null);
// const BarChart = window.BarChart || (({ children }) => <div>{children}</div>);
// const Bar = window.Bar || (() => null);
// const XAxis = window.XAxis || (() => null);
// const YAxis = window.YAxis || (() => null);
// const Cell = window.Cell || (() => null);
// const Tooltip = window.Tooltip || (() => null);
// const Legend = window.Legend || (() => null);
// const CartesianGrid = window.CartesianGrid || (() => null);
// const LabelList = window.LabelList || (() => null);

// پالت‌های رنگی جذاب و سازمانی پایش گزارشات یگان
const COLOR_PALETTES = {
  default: ["#38bdf8", "#10b981", "#fb923c", "#ef4444", "#a855f7", "#ec4899"],
  warm: ["#f43f5e", "#f97316", "#eab308", "#ec4899", "#d946ef", "#fae8ff"],
  cool: ["#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#6366f1", "#4f46e5"],
  alert: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#fca5a5"] // پالت اختصاصی حوادث فوری
};

const INITIAL_STATE = {
  chartType: "verticalBar",
  displayMode: "both",
  legendVertical: "bottom",
  legendAlign: "center",
  showLegend: true,
  labelRotation: 0,
  innerRadius: 60,
  palette: "default",
  sortBy: "desc",
  showGrid: true,
  showLabelsOnChart: true,
};

function buildInitialState(defaultChartType, defaultInnerRadius) {
  return {
    ...INITIAL_STATE,
    chartType: defaultChartType || INITIAL_STATE.chartType,
    innerRadius: defaultInnerRadius ?? INITIAL_STATE.innerRadius,
    showLegend: defaultChartType === "pie",
    showLabelsOnChart: defaultChartType !== "pie",
  };
}

// تابع فارسی‌سازی مقادیر عددی داخل چارت
const toPersianDigits = toPersianChartDigits;

// کامپوننت اصلی با قرارداد App و صادرات default جهت نمایش زنده در پیش‌نمایش کانوس
export default function App() {
  // شبیه‌ساز داده‌های ارسالی یگان متناظر با عکس ارسالی شما
  const mockData = [
    { name: "نقاط قوت", value: 9 },
    { name: "شایعات", value: 4 },
    { name: "نقاط ضعف", value: 3 },
    { name: "وضعیت روحیه", value: 2 },
    { name: "صدمات", value: 2 },
    { name: "وضعیت خدمات شهری", value: 2 },
    { name: "تعداد غیبت و فرار", value: 2 },
    { name: "تهدیدات", value: 2 },
    { name: "مشکلات", value: 2 },
    { name: "فرصت‌ها", value: 1 },
    { name: "سایر موضوعات", value: 1 },
  ];

  return (
    <div style={{ padding: "20px", background: "#020617", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "850px", background: "#0f172a", borderRadius: "16px", border: "1px solid #1e293b", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        <StatChart data={mockData} title="نمودار توزیع فراوانی موضوعات پایش گزارش‌ها" isDarkMode={true} />
      </div>
    </div>
  );
}

// کامپوننت پیشرفته و توسعه یافته مانیتورینگ StatChart
export function StatChart({
  data,
  title,
  isDarkMode,
  defaultChartType = "verticalBar",
  defaultInnerRadius = 35,
  compactHeader = false,
}) {
  const [settings, setSettings] = useState(() => buildInitialState(defaultChartType, defaultInnerRadius));
  const [isOpen, setIsOpen] = useState(false);
  const [containerRef, chartReady] = useChartContainerReady(`${defaultChartType}-${data?.length}-${title}`);

  const update = (key, val) => setSettings((p) => ({ ...p, [key]: val }));
  const nameKey = data[0]?.name ? "name" : "label";

  // محاسبه مجموع کل داده‌ها جهت استخراج زنده درصدها
  const totalSum = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [data]);

  // اعمال فیلتر مرتب‌سازی پیشرفته بر مبنای تنظیمات زنده کاربر
  const processedData = useMemo(() => {
    let result = [...data];
    if (settings.sortBy === "desc") {
      result.sort((a, b) => b.value - a.value);
    } else if (settings.sortBy === "asc") {
      result.sort((a, b) => a.value - b.value);
    }
    return result;
  }, [data, settings.sortBy]);

  // پالت رنگی انتخاب شده جاری
  const colors = COLOR_PALETTES[settings.palette] || COLOR_PALETTES.default;

  // قالب‌بندی نمایش اطلاعات روی نمودار بر اساس Display Mode انتخاب شده
  const formatLabelText = (name, value) => {
    const percentage = totalSum > 0 ? ((value / totalSum) * 100).toFixed(0) : "0";
    if (settings.displayMode === "count") {
      return `${name} (${toPersianDigits(value)} مورد)`;
    }
    if (settings.displayMode === "percent") {
      return `${name} (${toPersianDigits(percentage)}٪)`;
    }
    return `${name} (${toPersianDigits(value)} مورد - ${toPersianDigits(percentage)}٪)`;
  };

  const handlePrint = () => {
    const content = containerRef.current?.innerHTML || "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>چاپ نمودار تحلیلی - ${title}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
            body { 
              direction: rtl; 
              font-family: 'Tahoma', sans-serif; 
              text-align: center; 
              padding: 20px; 
              color: #000 !important;
              background: #fff !important;
            }
            svg { max-width: 100%; height: auto !important; }
            .recharts-text { fill: #000 !important; font-size: 11px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2 style="margin-bottom: 25px; border-bottom: 2px solid #38bdf8; padding-bottom: 10px;">${toPersianDigits(title)}</h2>
          <div style="width:100%">${content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ width: "100%", direction: "rtl", fontFamily: "Tahoma" }}>
      {/* هدر ابزارک چارت با استایل پیشرفته شیشه‌ای */}
      <div style={styles.chartHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "4px", height: "18px", background: "#38bdf8", borderRadius: "2px" }} />
          <h3 style={{ color: isDarkMode ? "#f1f5f9" : "#1e293b", fontSize: "0.95rem", margin: 0, fontWeight: "bold" }}>
            {toPersianDigits(title)}
          </h3>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{ ...styles.iconBtn, background: isOpen ? "rgba(56, 189, 248, 0.15)" : "none", color: isOpen ? "#38bdf8" : "#94a3b8", borderColor: isOpen ? "#38bdf8" : "#334155" }}
            title="تنظیمات شخصی‌سازی نمودار"
          >
            ⚙️ تنظیمات
          </button>
          <button
            onClick={() => setSettings(buildInitialState(defaultChartType, defaultInnerRadius))}
            style={{ ...styles.iconBtn, color: "#f87171", borderColor: "rgba(248, 113, 113, 0.2)", background: "rgba(248, 113, 113, 0.05)" }}
            title="بازگشت به تنظیمات اولیه"
          >
            🔄 ریست چارت
          </button>
          <button
            onClick={handlePrint}
            style={{ ...styles.iconBtn, color: "#10b981", borderColor: "rgba(16, 185, 129, 0.2)", background: "rgba(16, 185, 129, 0.05)" }}
            title="چاپ بهینه‌سازی شده"
          >
            🖨️ چاپ چارت
          </button>
        </div>
      </div>

      {/* پنل تنظیمات پیشرفته و کشویی کاستومایز چارت */}
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
              <option value="count">نمایش تعداد گزارشات</option>
              <option value="percent">نمایش سهم درصد (٪)</option>
              <option value="both">نمایش هردو همزمان</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.fieldLabel}>مرتب‌سازی داده‌ها:</label>
            <select value={settings.sortBy} onChange={(e) => update("sortBy", e.target.value)} style={styles.select}>
              <option value="none">ترتیب ثبت واقعه</option>
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

          {/* چک‌باکس‌های پویای کنترل المان‌ها */}
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

      {/* بخش رندر نهایی نمودارها */}
      <div ref={containerRef} style={{ height: "420px", width: "100%", position: "relative", minHeight: "420px", minWidth: 0, marginTop: "10px" }}>
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
                label={settings.showLabelsOnChart ? renderPieExternalLabel(isDarkMode) : false}
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
              {/* نام موضوعات به صورت افقی، تمیز و خوانا بدون شکستگی یا چرخش کج رندر می‌شوند */}
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
            // نمودار ستونی عمودی ارتقا یافته
            <BarChart data={processedData} margin={{ bottom: 65, top: 25, left: 10, right: 10 }}>
              {settings.showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"} />}
              {/* مهار تداخل برچسب‌ها با انتقال به زیر محور x با استفاده از height و dy تنظیم شده */}
              <XAxis 
                dataKey={nameKey} 
                angle={settings.labelRotation} 
                interval={0} 
                textAnchor="end" 
                height={85}
                dx={-4}
                dy={8}
                tick={{ fontSize: 10, fill: isDarkMode ? "#cbd5e1" : "#475569" }} 
              />
              <YAxis tick={{ fontSize: 11, fill: isDarkMode ? "#cbd5e1" : "#475569" }} tickFormatter={(v) => toPersianDigits(v)} />
              <Tooltip cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }} contentStyle={{ backgroundColor: isDarkMode ? "#1e293b" : "#fff", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }} formatter={(v) => toPersianDigits(v)} />
              {settings.showLegend && <Legend verticalAlign={settings.legendVertical} align={settings.legendAlign} />}
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                {processedData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
                {settings.showLabelsOnChart && (
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    style={{ fill: isDarkMode ? "#fff" : "#000", fontSize: 10, fontWeight: "bold" }} 
                    formatter={(v) => toPersianDigits(v)} 
                  />
                )}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, fontSize: 12 }}>در حال آماده‌سازی نمودار...</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    paddingBottom: "12px",
    flexWrap: "wrap",
    gap: "10px"
  },
  iconBtn: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(128,128,128,0.25)",
    background: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    fontFamily: "inherit",
    gap: "4px",
    transition: "all 0.2s"
  },
  settingsPanel: {
    padding: "15px",
    borderRadius: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    marginBottom: "15px",
    fontSize: "12px",
    border: "1px solid",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)"
  },
  settingItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  fieldLabel: {
    fontSize: "11px",
    opacity: 0.75,
    fontWeight: "bold"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    cursor: "pointer",
    userSelect: "none"
  },
  select: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(148,163,184,0.25)",
    backgroundColor: "rgba(0,0,0,0.15)",
    color: "inherit",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer"
  },
};