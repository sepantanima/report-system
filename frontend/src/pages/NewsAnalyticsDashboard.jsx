import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ArrowRight, HelpCircle, X, FileSpreadsheet, FileText, BarChart3, Table2, LayoutDashboard } from "lucide-react";
import { StatChart } from "../components/StatChart.jsx";
import AnalyticsFilterBar from "../components/news/analytics/AnalyticsFilterBar.jsx";
import newsAnalyticsService from "../services/newsAnalyticsService.js";
import { exportToExcel } from "../utils/excelExport.js";
import { buildExportFileName } from "../utils/exportDateRange.js";
import { buildChartTitle, buildNewsFilterLabels, formatPersianDateObjectsRangeLabel } from "../utils/dashboardTitles.js";
import DashboardDataTable from "../components/dashboard/DashboardDataTable.jsx";
import { useChartContainerReady } from "../hooks/useChartContainerReady.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { NEWS_ANALYTICS_HELP } from "../content/newsFormHelp.jsx";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets.js";
import DashboardWidget, { DashboardWidgetToolbar } from "../components/dashboard/DashboardWidget.jsx";
import { dashboardStyles as ds } from "../theme/dashboardStyles.js";

const NEWS_WIDGET_DEFS = [
  { id: "overview", defaultOpen: true },
  { id: "distribution-bar-chart", defaultOpen: false },
  { id: "distribution-bar-table", defaultOpen: false },
  { id: "units-participation-chart", defaultOpen: false },
  { id: "units-participation-table", defaultOpen: false },
  { id: "rankings-monitors-chart", defaultOpen: false },
  { id: "rankings-monitors-table", defaultOpen: false },
  { id: "rankings-editors-chart", defaultOpen: false },
  { id: "rankings-editors-table", defaultOpen: false },
  { id: "rankings-chiefs-chart", defaultOpen: false },
  { id: "rankings-chiefs-table", defaultOpen: false },
  { id: "rankings-units-chart", defaultOpen: false },
  { id: "rankings-units-table", defaultOpen: false },
  { id: "category-distribution-chart", defaultOpen: false },
  { id: "category-distribution-table", defaultOpen: false },
  { id: "priority-distribution-chart", defaultOpen: false },
  { id: "priority-distribution-table", defaultOpen: false },
  { id: "timeline-chart", defaultOpen: false },
  { id: "timeline-table", defaultOpen: false },
  { id: "source-analysis-chart", defaultOpen: false },
  { id: "source-analysis-table", defaultOpen: false },
];

const WIDGET_TITLES = {
  overview: "آمار کلی وضعیت اخبار",
  "distribution-bar-chart": "نمودار توزیع آماری",
  "distribution-bar-table": "جدول توزیع آماری",
  "units-participation-chart": "نمودار مشارکت واحدها",
  "units-participation-table": "جدول مشارکت واحدها",
  "rankings-monitors-chart": "نمودار رتبه‌بندی پایشگران",
  "rankings-monitors-table": "جدول رتبه‌بندی پایشگران",
  "rankings-editors-chart": "نمودار رتبه‌بندی دبیران",
  "rankings-editors-table": "جدول رتبه‌بندی دبیران",
  "rankings-chiefs-chart": "نمودار رتبه‌بندی سردبیران",
  "rankings-chiefs-table": "جدول رتبه‌بندی سردبیران",
  "rankings-units-chart": "نمودار رتبه‌بندی واحدها",
  "rankings-units-table": "جدول رتبه‌بندی واحدها",
  "category-distribution-chart": "نمودار توزیع دسته‌بندی",
  "category-distribution-table": "جدول توزیع دسته‌بندی",
  "priority-distribution-chart": "نمودار توزیع اولویت",
  "priority-distribution-table": "جدول توزیع اولویت",
  "timeline-chart": "نمودار روند زمانی انتشار",
  "timeline-table": "جدول روند زمانی انتشار",
  "source-analysis-chart": "نمودار تحلیل منابع خبری",
  "source-analysis-table": "جدول تحلیل منابع خبری",
};

const PRINT_LABELS = {
  overview: "جدول وضعیت اخبار",
  "distribution-bar-table": "جدول توزیع آماری اخبار",
  "units-participation-table": "جدول مشارکت واحدها در اخبار",
  "rankings-monitors-table": "جدول رتبه‌بندی پایشگران",
  "rankings-editors-table": "جدول رتبه‌بندی دبیران",
  "rankings-chiefs-table": "جدول رتبه‌بندی سردبیران",
  "rankings-units-table": "جدول رتبه‌بندی واحدها",
  "category-distribution-table": "جدول توزیع دسته‌بندی اخبار",
  "priority-distribution-table": "جدول توزیع اولویت اخبار",
  "timeline-table": "جدول روند زمانی انتشار اخبار",
  "source-analysis-table": "جدول تحلیل منابع خبری",
};

function toTableColumns(cols) {
  return cols.map((c) => ({
    key: c.key,
    title: c.label,
    visible: true,
    width: c.key === "name" || c.key === "unit_name" ? 140 : c.key === "score" ? 80 : 100,
  }));
}

function tableRowCount(id, data) {
  if (!data) return 0;
  if (id === "overview") return data.pie?.length || 0;
  if (id === "timeline-table") return data.series?.length || 0;
  return data.rows?.length || 0;
}

function getDataKey(widgetId) {
  if (widgetId === "overview") return "overview";
  return widgetId.replace(/-(chart|table)$/, "");
}

function isChartWidget(id) {
  return id.endsWith("-chart") || id === "timeline-chart";
}

function cleanDateString(s) {
  return String(s || "").replace(/\//g, "-");
}

const DIST_DIM_LABELS = { category: "دسته‌بندی", priority: "اولویت", quality: "کیفیت", source: "منبع" };

const EXPORT_BASE_NAMES = {
  overview: "آمار-کلی-اخبار",
  "distribution-bar": "نوار-آماری",
  "units-participation": "مشارکت-واحدها",
  "rankings-monitors": "رتبه-پایشگران",
  "rankings-editors": "رتبه-دبیران",
  "rankings-chiefs": "رتبه-سردبیران",
  "rankings-units": "رتبه-واحدها",
  "category-distribution": "توزیع-دسته",
  "priority-distribution": "توزیع-اولویت",
  timeline: "روند-زمانی",
  "source-analysis": "تحلیل-منابع",
};

const RANK_COLS = {
  monitor: [
    { key: "rank", label: "رتبه" },
    { key: "name", label: "نام" },
    { key: "unit_name", label: "واحد" },
    { key: "news_count", label: "تعداد خبر" },
    { key: "score", label: "امتیاز" },
  ],
  editor: [
    { key: "rank", label: "رتبه" },
    { key: "name", label: "نام" },
    { key: "unit_name", label: "واحد" },
    { key: "reviewed_count", label: "بررسی‌شده" },
    { key: "approved_count", label: "تأییدشده" },
    { key: "score", label: "امتیاز" },
  ],
  chief: [
    { key: "rank", label: "رتبه" },
    { key: "name", label: "نام" },
    { key: "unit_name", label: "واحد" },
    { key: "published_count", label: "منتشرشده" },
    { key: "score", label: "امتیاز" },
  ],
  unit: [
    { key: "rank", label: "رتبه" },
    { key: "unit_name", label: "واحد" },
    { key: "news_count", label: "اخبار" },
    { key: "monitor_count", label: "پایشگر" },
    { key: "editor_count", label: "دبیر" },
    { key: "chief_count", label: "سردبیر" },
    { key: "score", label: "امتیاز" },
  ],
  participation: [
    { key: "rank", label: "رتبه" },
    { key: "unit_name", label: "واحد" },
    { key: "news_count", label: "اخبار" },
    { key: "share_percent", label: "سهم %" },
  ],
  dist: [
    { key: "name", label: "عنوان" },
    { key: "value", label: "تعداد" },
    { key: "percent", label: "درصد" },
  ],
  timeline: [
    { key: "name", label: "تاریخ" },
    { key: "value", label: "تعداد" },
  ],
  status: [
    { key: "name", label: "وضعیت" },
    { key: "value", label: "تعداد" },
  ],
};

function SummaryCards({ summary, theme }) {
  const items = [
    { label: "کل", key: "total", color: "#38bdf8" },
    { label: "ثبت‌شده", key: "registered", color: "#64748b" },
    { label: "در بررسی", key: "in_review", color: "#eab308" },
    { label: "تأیید", key: "approved", color: "#22c55e" },
    { label: "رد", key: "rejected", color: "#ef4444" },
    { label: "منتشر", key: "published", color: "#10b981" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
      {items.map((it) => (
        <div key={it.key} style={{ padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, textAlign: "center", background: "rgba(128,128,128,0.03)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: it.color }}>{toPersianDigits(summary?.[it.key] ?? 0)}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function exportBtn(theme, onClick, title, Icon) {
  return (
    <button type="button" title={title} onClick={onClick} style={ds.widgetCtrlBtn(theme)}>
      <Icon size={13} />
    </button>
  );
}

export default function NewsAnalyticsDashboard() {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "analytics");
  const { isDarkMode } = useAppTheme();

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    input: isDarkMode ? "#0f172a" : "#ffffff",
    accent: "#38bdf8",
  }), [isDarkMode]);

  const {
    order: widgetOrder,
    open: openWidgets,
    toggle: toggleWidget,
    expandAll: expandAllWidgets,
    collapseAll: collapseAllWidgets,
    resetLayout: resetWidgetLayout,
    move: moveWidget,
  } = useDashboardWidgets("news-analytics-dashboard", NEWS_WIDGET_DEFS);

  const [meta, setMeta] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [appliedVersion, setAppliedVersion] = useState(0);
  const [dateRange, setDateRange] = useState([
    new DateObject({ calendar: persian }),
    new DateObject({ calendar: persian }),
  ]);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    quality: "",
    categories: [],
    sources: [],
    unit_cd: "",
    role: "",
    user_id: "",
  });

  const [widgetData, setWidgetData] = useState({});
  const [widgetLoading, setWidgetLoading] = useState({});
  const [widgetError, setWidgetError] = useState({});
  const [distDimension, setDistDimension] = useState("category");
  const [myRankBanner, setMyRankBanner] = useState(null);

  const apiFilters = useMemo(() => {
    const p = {};
    if (dateRange?.length >= 1 && dateRange[0]) {
      p.start_date = cleanDateString(new DateObject(dateRange[0]).format("YYYY-MM-DD"));
      p.end_date = dateRange[1]
        ? cleanDateString(new DateObject(dateRange[1]).format("YYYY-MM-DD"))
        : p.start_date;
    }
    if (filters.status) p.status = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (filters.quality) p.quality = filters.quality;
    if (filters.categories?.length) p.categories = filters.categories;
    if (filters.sources?.length) p.sources = filters.sources;
    if (filters.unit_cd) p.unit_cd = filters.unit_cd;
    if (filters.user_id) p.user_id = filters.user_id;
    return p;
  }, [filters, dateRange, appliedVersion]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const exportDateRange = useMemo(() => {
    if (!dateRange?.[0]) return {};
    return {
      startDate: cleanDateString(new DateObject(dateRange[0]).format("YYYY-MM-DD")),
      endDate: dateRange[1]
        ? cleanDateString(new DateObject(dateRange[1]).format("YYYY-MM-DD"))
        : undefined,
    };
  }, [dateRange, appliedVersion]);

  const dateRangeLabel = useMemo(
    () => formatPersianDateObjectsRangeLabel(dateRange),
    [dateRange, appliedVersion],
  );

  const filterLabels = useMemo(
    () => buildNewsFilterLabels(filters, meta),
    [filters, meta],
  );

  const buildTitle = useCallback((base, extra = []) => {
    return buildChartTitle(base, dateRangeLabel, [...filterLabels, ...extra]);
  }, [dateRangeLabel, filterLabels]);

  const filterSummary = useMemo(() => {
    const parts = [dateRangeLabel, ...filterLabels].filter(Boolean);
    return parts.length ? toPersianDigits(parts.join(" · ")) : null;
  }, [dateRangeLabel, filterLabels]);

  const getWidgetHeaderTitle = useCallback((id, data) => {
    const base = WIDGET_TITLES[id] || id;
    if (id.endsWith("-table") || id === "overview") {
      const n = tableRowCount(id, data);
      if (n > 0) return `${base} (${toPersianDigits(n)} ردیف)`;
    }
    return base;
  }, []);

  const renderTableWidget = useCallback((id, dataKey, data, colsKey) => {
    const rows = id === "overview" ? data?.pie
      : id === "timeline-table" ? data?.series
        : data?.rows;
    const printLabel = PRINT_LABELS[id] || WIDGET_TITLES[id];
    return (
      <DashboardDataTable
        columns={toTableColumns(RANK_COLS[colsKey])}
        data={rows || []}
        isDarkMode={isDarkMode}
        dynamicTitle={buildTitle(printLabel)}
        exportBaseName={EXPORT_BASE_NAMES[dataKey] || "اخبار"}
        exportDateRange={exportDateRange}
        defaultSortKey={colsKey === "dist" || colsKey === "timeline" ? "value" : "rank"}
        defaultSortDir="desc"
      />
    );
  }, [isDarkMode, buildTitle, exportDateRange]);

  const fetchDataKey = useCallback(async (dataKey) => {
    setWidgetLoading((s) => ({ ...s, [dataKey]: true }));
    setWidgetError((s) => ({ ...s, [dataKey]: null }));
    try {
      let data;
      switch (dataKey) {
        case "overview":
          data = await newsAnalyticsService.overview(apiFilters);
          break;
        case "distribution-bar":
          data = await newsAnalyticsService.distribution(apiFilters, distDimension);
          break;
        case "category-distribution":
          data = await newsAnalyticsService.distribution(apiFilters, "category");
          break;
        case "priority-distribution":
          data = await newsAnalyticsService.distribution(apiFilters, "priority");
          break;
        case "source-analysis":
          data = await newsAnalyticsService.distribution(apiFilters, "source");
          break;
        case "timeline":
          data = await newsAnalyticsService.timeline(apiFilters, "day");
          break;
        case "units-participation":
          data = await newsAnalyticsService.unitsParticipation(apiFilters);
          break;
        case "rankings-monitors":
          data = await newsAnalyticsService.rankingsMonitors(apiFilters);
          if (data.myRank) setMyRankBanner((b) => ({ ...b, monitor: data.myRank }));
          break;
        case "rankings-editors":
          data = await newsAnalyticsService.rankingsEditors(apiFilters);
          if (data.myRank) setMyRankBanner((b) => ({ ...b, editor: data.myRank }));
          break;
        case "rankings-chiefs":
          data = await newsAnalyticsService.rankingsChiefs(apiFilters);
          if (data.myRank) setMyRankBanner((b) => ({ ...b, chief: data.myRank }));
          break;
        case "rankings-units":
          data = await newsAnalyticsService.rankingsUnits(apiFilters);
          break;
        default:
          data = await newsAnalyticsService.widget(dataKey, apiFilters);
      }
      setWidgetData((s) => ({ ...s, [dataKey]: data }));
    } catch (e) {
      setWidgetError((s) => ({ ...s, [dataKey]: e.response?.data?.error || "خطا در بارگذاری" }));
    } finally {
      setWidgetLoading((s) => ({ ...s, [dataKey]: false }));
    }
  }, [apiFilters, distDimension]);

  useEffect(() => {
    if (!allowed) return;
    newsAnalyticsService.filtersMeta().then(setMeta).catch(() => {});
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    const keys = new Set();
    widgetOrder.forEach((id) => {
      if (openWidgets[id]) keys.add(getDataKey(id));
    });
    keys.forEach((key) => fetchDataKey(key));
  }, [allowed, openWidgets, widgetOrder, apiFilters, fetchDataKey]);

  useEffect(() => {
    if (!allowed) return;
    const chartOrTableOpen = openWidgets["distribution-bar-chart"] || openWidgets["distribution-bar-table"];
    if (chartOrTableOpen) fetchDataKey("distribution-bar");
  }, [distDimension]); // eslint-disable-line react-hooks/exhaustive-deps

  const getExportColumns = (id, dataKey) => {
    if (dataKey === "overview") return RANK_COLS.status;
    if (dataKey === "timeline") return RANK_COLS.timeline;
    if (dataKey === "units-participation") return RANK_COLS.participation;
    if (dataKey === "rankings-monitors") return RANK_COLS.monitor;
    if (dataKey === "rankings-editors") return RANK_COLS.editor;
    if (dataKey === "rankings-chiefs") return RANK_COLS.chief;
    if (dataKey === "rankings-units") return RANK_COLS.unit;
    return RANK_COLS.dist;
  };

  const getExportRows = (id, dataKey, data) => {
    if (!data) return [];
    if (dataKey === "overview") return data.pie || [];
    if (id.endsWith("-chart") && data.top10?.length) return data.top10;
    return data.rows || data.series || data.pie || [];
  };

  const handleExportExcel = (id, dataKey) => {
    const data = widgetData[dataKey];
    const rows = getExportRows(id, dataKey, data);
    const columns = getExportColumns(id, dataKey);
    if (!rows.length) return;
    const mapped = rows.map((row) => {
      const o = {};
      columns.forEach((c) => {
        o[c.label] = row[c.key] ?? "—";
      });
      return o;
    });
    const base = EXPORT_BASE_NAMES[dataKey] || "اخبار";
    const suffix = dataKey === "distribution-bar" ? `-${DIST_DIM_LABELS[distDimension] || distDimension}` : "";
    exportToExcel(mapped, buildExportFileName(`${base}${suffix}`, exportDateRange), {
      sheetName: WIDGET_TITLES[id] || base,
    });
  };

  const handleExportWord = async (dataKey) => {
    try {
      const blob = await newsAnalyticsService.downloadExport(dataKey, "docx", apiFilters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFileName(EXPORT_BASE_NAMES[dataKey] || dataKey, exportDateRange, "docx");
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  const chartProps = { defaultChartType: "verticalBar", defaultInnerRadius: 35 };

  const renderWidgetBody = (id, dataKey, data) => {
    if (id === "overview") {
      return (
        <>
          <SummaryCards summary={data?.summary} theme={theme} />
          {renderTableWidget(id, dataKey, data, "status")}
        </>
      );
    }

    if (id === "distribution-bar-chart") {
      return (
        <>
          <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["category", "priority", "quality", "source"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDistDimension(d)}
                style={ds.toolbarBtn(theme, distDimension === d ? "#0ea5e9" : undefined)}
              >
                {DIST_DIM_LABELS[d]}
              </button>
            ))}
          </div>
          <StatChart data={data?.rows || []} title={buildTitle("توزیع آماری اخبار", [`بُعد: ${DIST_DIM_LABELS[distDimension]}`])} isDarkMode={isDarkMode} {...chartProps} />
        </>
      );
    }
    if (id === "distribution-bar-table") {
      return renderTableWidget(id, dataKey, data, "dist");
    }

    if (id === "category-distribution-chart") {
      return <StatChart data={data?.rows || []} title={buildTitle("توزیع دسته‌بندی اخبار")} isDarkMode={isDarkMode} {...chartProps} />;
    }
    if (id === "priority-distribution-chart") {
      return <StatChart data={data?.rows || []} title={buildTitle("توزیع اولویت اخبار")} isDarkMode={isDarkMode} {...chartProps} />;
    }
    if (id === "source-analysis-chart") {
      return <StatChart data={data?.rows || []} title={buildTitle("تحلیل منابع خبری")} isDarkMode={isDarkMode} {...chartProps} />;
    }
    if (id === "category-distribution-table" || id === "priority-distribution-table" || id === "source-analysis-table") {
      return renderTableWidget(id, dataKey, data, "dist");
    }

    if (id === "timeline-chart") {
      return (
        <TimelineChart data={data?.series} theme={theme} title={buildTitle("روند زمانی انتشار اخبار")} />
      );
    }
    if (id === "timeline-table") {
      return renderTableWidget(id, dataKey, data, "timeline");
    }

    if (id === "units-participation-chart") {
      return (
        <StatChart
          data={(data?.top10 || []).map((r) => ({ name: r.unit_name, value: r.news_count }))}
          title={buildTitle("۱۰ واحد برتر — مشارکت در اخبار")}
          isDarkMode={isDarkMode}
          {...chartProps}
        />
      );
    }
    if (id === "units-participation-table") {
      return renderTableWidget(id, dataKey, data, "participation");
    }

    if (id === "rankings-monitors-chart") {
      return (
        <StatChart
          data={(data?.top10 || []).map((r) => ({ name: r.name, value: r.score }))}
          title={buildTitle("۱۰ پایشگر برتر")}
          isDarkMode={isDarkMode}
          {...chartProps}
        />
      );
    }
    if (id === "rankings-monitors-table") {
      return renderTableWidget(id, dataKey, data, "monitor");
    }

    if (id === "rankings-editors-chart") {
      return (
        <StatChart
          data={(data?.top10 || []).map((r) => ({ name: r.name, value: r.score }))}
          title={buildTitle("۱۰ دبیر برتر")}
          isDarkMode={isDarkMode}
          {...chartProps}
        />
      );
    }
    if (id === "rankings-editors-table") {
      return renderTableWidget(id, dataKey, data, "editor");
    }

    if (id === "rankings-chiefs-chart") {
      return (
        <StatChart
          data={(data?.top10 || []).map((r) => ({ name: r.name, value: r.score }))}
          title={buildTitle("۱۰ سردبیر برتر")}
          isDarkMode={isDarkMode}
          {...chartProps}
        />
      );
    }
    if (id === "rankings-chiefs-table") {
      return renderTableWidget(id, dataKey, data, "chief");
    }

    if (id === "rankings-units-chart") {
      return (
        <StatChart
          data={(data?.top10 || []).map((r) => ({ name: r.unit_name, value: r.score }))}
          title={buildTitle("۱۰ واحد برتر — رتبه‌بندی")}
          isDarkMode={isDarkMode}
          {...chartProps}
        />
      );
    }
    if (id === "rankings-units-table") {
      return renderTableWidget(id, dataKey, data, "unit");
    }

    return null;
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>داشبورد تحلیلی اخبار</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowHelp(true)} style={hdrBtn(theme)}>
            <HelpCircle size={16} /> راهنما
          </button>
          <button type="button" onClick={() => navigate("/main")} style={hdrBtn(theme)}>
            <ArrowRight size={16} /> بازگشت
          </button>
        </div>
      </header>

      {myRankBanner ? (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", fontSize: 12 }}>
          {myRankBanner.monitor ? `رتبه پایشگری شما: ${toPersianDigits(myRankBanner.monitor.rank)} · امتیاز ${toPersianDigits(myRankBanner.monitor.score)}` : null}
          {myRankBanner.editor ? ` · رتبه دبیر: ${toPersianDigits(myRankBanner.editor.rank)}` : null}
          {myRankBanner.chief ? ` · رتبه سردبیر: ${toPersianDigits(myRankBanner.chief.rank)}` : null}
        </div>
      ) : null}

      <AnalyticsFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filters={filters}
        setFilter={setFilter}
        meta={meta}
        theme={theme}
        isDarkMode={isDarkMode}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        onApply={() => { setAppliedVersion((v) => v + 1); setWidgetData({}); setMyRankBanner(null); }}
        onReset={() => {
          setDateRange([new DateObject({ calendar: persian }), new DateObject({ calendar: persian })]);
          setFilters({
            status: "", priority: "", quality: "",
            categories: [], sources: [], unit_cd: "", role: "", user_id: "",
          });
          setAppliedVersion((v) => v + 1);
          setWidgetData({});
        }}
        filterSummary={filterSummary}
      />

      <DashboardWidgetToolbar
        onExpandAll={expandAllWidgets}
        onCollapseAll={collapseAllWidgets}
        onReset={resetWidgetLayout}
        theme={theme}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {widgetOrder.map((id, idx) => {
          const dataKey = getDataKey(id);
          const data = widgetData[dataKey];
          const loading = widgetLoading[dataKey];
          const error = widgetError[dataKey];
          const Icon = id === "overview" ? LayoutDashboard : isChartWidget(id) ? BarChart3 : Table2;

          const actions = (
            <>
              {exportBtn(theme, () => handleExportExcel(id, dataKey), "Excel", FileSpreadsheet)}
              {exportBtn(theme, () => handleExportWord(dataKey), "Word", FileText)}
            </>
          );

          return (
            <div key={id}>
              <DashboardWidget
                title={getWidgetHeaderTitle(id, data)}
                icon={<Icon size={16} color={theme.accent} />}
                isOpen={!!openWidgets[id]}
                onToggle={() => toggleWidget(id)}
                theme={theme}
                onMoveUp={idx > 0 ? () => moveWidget(id, "up") : undefined}
                onMoveDown={idx < widgetOrder.length - 1 ? () => moveWidget(id, "down") : undefined}
                actions={actions}
              >
                {loading ? <p style={{ opacity: 0.6, fontSize: 12 }}>در حال بارگذاری...</p> : null}
                {error ? <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p> : null}
                {!loading && !error ? renderWidgetBody(id, dataKey, data) : null}
              </DashboardWidget>
            </div>
          );
        })}
      </div>

      {showHelp ? (
        <div className="v3-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="v3-modal-box" style={{ background: theme.card, border: `1px solid ${theme.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="v3-modal-header-new">
              <button type="button" onClick={() => setShowHelp(false)} className="v3-icon-btn" style={{ color: "#f87171", border: "none" }}><X size={18} /></button>
              <span>راهنمای داشبورد تحلیلی اخبار</span>
            </div>
            <div className="v3-modal-body">{NEWS_ANALYTICS_HELP()}</div>
            <div className="v3-modal-footer-new">
              <button type="button" className="v3-btn-footer v3-primary-solid" onClick={() => setShowHelp(false)}>متوجه شدم</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimelineChart({ data, theme, title }) {
  const [containerRef, ready] = useChartContainerReady(`${data?.length}-${title}`);
  return (
    <div style={{ width: "100%" }}>
      <p style={{ fontSize: 11, opacity: 0.85, marginBottom: 8, fontWeight: 600 }}>{title}</p>
      <div ref={containerRef} style={{ width: "100%", height: 280, minWidth: 0 }}>
        {ready ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <LineChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="name" tick={{ fill: theme.text, fontSize: 10 }} angle={0} />
              <YAxis tick={{ fill: theme.text, fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

function hdrBtn(theme) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px",
    borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card,
    color: theme.text, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
  };
}
