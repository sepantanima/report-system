import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Crosshair,
  GitBranch,
  Package,
  TrendingUp,
  Users,
  LayoutGrid,
  Bell,
  HeartPulse,
  Cpu,
  Map,
  Monitor,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  History,
  RefreshCw,
} from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import FormPageLayout from "../../components/common/FormPageLayout.jsx";
import commandCenterService from "../../services/commandCenterService.js";
import DashboardWidget, { DashboardWidgetToolbar } from "../../components/dashboard/DashboardWidget.jsx";
import { useDashboardWidgets } from "../../hooks/useDashboardWidgets.js";
import CommandOpsNav from "../../components/command/dashboard/CommandOpsNav.jsx";
import CommandFilterBar from "../../components/command/dashboard/CommandFilterBar.jsx";
import ExecutiveKpiBar from "../../components/command/dashboard/ExecutiveKpiBar.jsx";
import ProcessFunnelWidget from "../../components/command/dashboard/ProcessFunnelWidget.jsx";
import ProductsWidget from "../../components/command/dashboard/ProductsWidget.jsx";
import TrendsWidget from "../../components/command/dashboard/TrendsWidget.jsx";
import RolesPerformanceWidget from "../../components/command/dashboard/RolesPerformanceWidget.jsx";
import UnitsHeatMapWidget from "../../components/command/dashboard/UnitsHeatMapWidget.jsx";
import AlertsWidget from "../../components/command/dashboard/AlertsWidget.jsx";
import HealthScoreWidget from "../../components/command/dashboard/HealthScoreWidget.jsx";
import UsersActivityWidget from "../../components/command/dashboard/UsersActivityWidget.jsx";
import AiPerformanceWidget from "../../components/command/dashboard/AiPerformanceWidget.jsx";
import ProvincesHeatWidget from "../../components/command/dashboard/ProvincesHeatWidget.jsx";
import IranMapWidget from "../../components/command/dashboard/IranMapWidget.jsx";
import CommandDrillPanel from "../../components/command/dashboard/CommandDrillPanel.jsx";
import WidgetPersonalizePanel from "../../components/command/dashboard/WidgetPersonalizePanel.jsx";
import DashboardViewHistoryPanel from "../../components/command/dashboard/DashboardViewHistoryPanel.jsx";
import WidgetHelpButton, {
  StaleDataBanner,
  StaleBodyWrap,
} from "../../components/command/dashboard/WidgetHelpButton.jsx";
import { getWidgetHelp } from "../../components/command/dashboard/dashboardWidgetHelp.js";
import {
  DashboardLoadProgress,
  LazyWidgetBody,
  WidgetBodySkeleton,
  mergeDashboardData,
  widgetDataReady,
} from "../../components/command/dashboard/DashboardLoadProgress.jsx";
import { exportCommandDashboardExcel } from "../../utils/commandDashboardExcel.js";
import { useCommandDashboardLive } from "../../hooks/useCommandDashboardLive.js";
import {
  defaultDashboardFilters,
  filtersToApiParams,
  formatGregorianAsJalali,
} from "../../components/command/dashboard/dashboardDateUtils.js";

const WIDGET_DEFS = [
  { id: "alerts", title: "هشدارهای مدیریتی", defaultOpen: true },
  { id: "health", title: "شاخص سلامت سامانه", defaultOpen: true },
  { id: "iran_map", title: "نقشه ایران", defaultOpen: true },
  { id: "provinces", title: "وضعیت استان‌ها (کارت)", defaultOpen: false },
  { id: "roles", title: "وضعیت نقش‌ها", defaultOpen: true },
  { id: "units", title: "عملکرد یگان‌ها", defaultOpen: true },
  { id: "users", title: "فعالیت کاربران", defaultOpen: true },
  { id: "ai", title: "عملکرد هوش مصنوعی", defaultOpen: false },
  { id: "processes", title: "وضعیت فرآیندهای عملیاتی", defaultOpen: true },
  { id: "products", title: "محصولات سامانه", defaultOpen: true },
  { id: "trends", title: "روند زمانی", defaultOpen: false },
];

const WALL_WIDGETS = new Set(["alerts", "health", "iran_map", "units"]);
const RETURN_TO = "/command";
const DASH_CACHE_KEY = "command-dashboard-last-good-v1";
const FILTER_CACHE_KEY = "command-dashboard-filters-v1";

/** هر ویجت به کدام مرحلهٔ بارگذاری وابسته است */
const WIDGET_SECTION = {
  processes: "core",
  products: "core",
  trends: "core",
  alerts: "ops",
  health: "ops",
  roles: "ops",
  units: "ops",
  users: "deep",
  ai: "deep",
  iran_map: "deep",
  provinces: "deep",
};

const EMPTY_FRESH = { core: false, ops: false, deep: false };

function readDashCache() {
  try {
    const raw = sessionStorage.getItem(DASH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.data?.kpi_bar?.some((x) => x?.value != null)) return parsed.data;
  } catch {
    /* ignore */
  }
  return null;
}

function writeDashCache(data) {
  try {
    if (data?.kpi_bar?.some((x) => x?.value != null)) {
      sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    }
  } catch {
    /* ignore */
  }
}

/** فیلترها را بین رفتن به فرم‌های دیگر و برگشت حفظ می‌کنیم */
function readSavedFilters() {
  try {
    const raw = sessionStorage.getItem(FILTER_CACHE_KEY);
    if (!raw) return defaultDashboardFilters();
    const parsed = JSON.parse(raw);
    if (!parsed?.from || !parsed?.to) return defaultDashboardFilters();
    return { ...defaultDashboardFilters(), ...parsed };
  } catch {
    return defaultDashboardFilters();
  }
}

function writeSavedFilters(filters) {
  try {
    sessionStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export default function CommandCenterHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wallMode = searchParams.get("wall") === "1";
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(
    () => ({
      bg: isDarkMode ? "#0f172a" : "#f8fafc",
      card: isDarkMode ? "#1e293b" : "#ffffff",
      border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
      text: isDarkMode ? "#f1f5f9" : "#0f172a",
      muted: isDarkMode ? "#94a3b8" : "#64748b",
      accent: "#e11d48",
    }),
    [isDarkMode],
  );

  const {
    order,
    open,
    visible,
    toggle,
    setWidgetVisible,
    move,
    expandAll,
    collapseAll,
    resetLayout,
  } = useDashboardWidgets("command-exec-dashboard-v4", WIDGET_DEFS, { syncServer: true });

  const cachedInit = useMemo(() => readDashCache(), []);
  const [filters, setFilters] = useState(() => readSavedFilters());
  const [data, setData] = useState(() => cachedInit);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !cachedInit);
  const [loadProgress, setLoadProgress] = useState(() => (cachedInit ? 100 : 0));
  const [loadLabel, setLoadLabel] = useState(() => (cachedInit ? "آماده" : "در حال بارگذاری…"));
  const [drill, setDrill] = useState(null);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [liveOnline, setLiveOnline] = useState(null);
  const [fresh, setFresh] = useState(() => (cachedInit ? { core: true, ops: true, deep: true } : { ...EMPTY_FRESH }));
  const [reloadNonce, setReloadNonce] = useState(0);
  const loadGen = useRef(0);

  useEffect(() => {
    writeSavedFilters(filters);
  }, [filters]);

  useEffect(() => {
    commandCenterService.logDashboardView(filtersToApiParams(filters)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const gen = ++loadGen.current;
    const ac = new AbortController();
    const params = filtersToApiParams(filters);
    setFresh({ ...EMPTY_FRESH });

    async function loadStaged() {
      setLoading(true);
      setLoadProgress(8);
      setLoadLabel("آماده‌سازی فیلترها و شاخص‌ها…");
      setError("");
      try {
        const core = await commandCenterService.dashboardOverview(
          { ...params, sections: "core" },
          { signal: ac.signal },
        );
        if (cancelled || gen !== loadGen.current) return;
        setData((prev) => {
          const merged = mergeDashboardData(prev, core);
          writeDashCache(merged);
          return merged;
        });
        setFresh((f) => ({ ...f, core: true }));
        setLoadProgress(40);
        setLoadLabel("بارگذاری نقش‌ها، یگان‌ها و هشدارها…");

        const ops = await commandCenterService.dashboardOverview(
          { ...params, sections: "ops", skip_kpi: "1" },
          { signal: ac.signal },
        );
        if (cancelled || gen !== loadGen.current) return;
        setData((prev) => {
          const merged = mergeDashboardData(prev, ops);
          writeDashCache(merged);
          return merged;
        });
        setFresh((f) => ({ ...f, ops: true }));
        setLoadProgress(70);
        setLoadLabel("بارگذاری کاربران، استان‌ها و AI…");

        const deep = await commandCenterService.dashboardOverview(
          { ...params, sections: "deep", skip_kpi: "1" },
          { signal: ac.signal },
        );
        if (cancelled || gen !== loadGen.current) return;
        setData((prev) => {
          const merged = mergeDashboardData(prev, deep);
          writeDashCache(merged);
          return merged;
        });
        setFresh((f) => ({ ...f, deep: true }));
        setLoadProgress(100);
        setLoadLabel("آماده");
      } catch (e) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || ac.signal.aborted) return;
        if (!cancelled && gen === loadGen.current) setError(e?.response?.data?.error || e.message);
      } finally {
        if (!cancelled && gen === loadGen.current) setLoading(false);
      }
    }

    loadStaged();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only on filter fields / refresh
  }, [
    filters.from,
    filters.to,
    filters.unit_id,
    filters.role,
    filters.province,
    filters.process_status,
    filters.product_type,
    filters.priority,
    reloadNonce,
  ]);

  useCommandDashboardLive(filtersToApiParams(filters), {
    enabled: !loading && loadProgress >= 100,
    intervalMs: wallMode ? 12000 : 25000,
    onPulse: (pulse) => {
      setData((prev) => {
        const patch = {
          kpi_bar: pulse.kpi_bar,
          alerts: pulse.alerts,
          health: pulse.health,
          online_users: pulse.online_users,
        };
        if (pulse.online_users != null && prev?.users_leaderboard) {
          patch.users_leaderboard = {
            ...prev.users_leaderboard,
            online_count: pulse.online_users,
          };
        }
        const merged = mergeDashboardData(prev, patch);
        writeDashCache(merged);
        return merged;
      });
      if (pulse.online_users != null) setLiveOnline(pulse.online_users);
    },
  });

  useEffect(() => {
    if (!wallMode) return undefined;
    const onFs = () => {
      if (!document.fullscreenElement && searchParams.get("wall") === "1") {
        const next = new URLSearchParams(searchParams);
        next.delete("wall");
        setSearchParams(next, { replace: true });
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [wallMode, searchParams, setSearchParams]);

  const widgetMeta = {
    alerts: { icon: <Bell size={15} color={theme.accent} />, title: "هشدارهای مدیریتی" },
    health: { icon: <HeartPulse size={15} color={theme.accent} />, title: "شاخص سلامت سامانه" },
    iran_map: { icon: <Map size={15} color={theme.accent} />, title: "نقشه ایران" },
    provinces: { icon: <Map size={15} color={theme.accent} />, title: "وضعیت استان‌ها (کارت)" },
    roles: { icon: <Users size={15} color={theme.accent} />, title: "وضعیت نقش‌ها" },
    units: { icon: <LayoutGrid size={15} color={theme.accent} />, title: "عملکرد یگان‌ها" },
    users: { icon: <Users size={15} color={theme.accent} />, title: "فعالیت کاربران" },
    ai: { icon: <Cpu size={15} color={theme.accent} />, title: "عملکرد هوش مصنوعی" },
    processes: { icon: <GitBranch size={15} color={theme.accent} />, title: "وضعیت فرآیندهای عملیاتی" },
    products: { icon: <Package size={15} color={theme.accent} />, title: "محصولات سامانه" },
    trends: { icon: <TrendingUp size={15} color={theme.accent} />, title: "روند زمانی" },
  };

  const visibleOrder = order.filter((id) => {
    if (visible[id] === false) return false;
    if (wallMode) return WALL_WIDGETS.has(id);
    return true;
  });

  const onSelectUnit = (unitId) => {
    setFilters((f) => ({ ...f, unit_id: String(unitId) }));
    setDrill({ mode: "unit", id: String(unitId) });
  };

  const onSelectProvince = (province) => {
    setFilters((f) => ({ ...f, province: String(province), unit_id: "" }));
  };

  const exportKpi = () => {
    const ok = exportCommandDashboardExcel(data, filters);
    if (!ok) setError("داده‌ای برای خروجی Excel نیست");
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await commandCenterService.exportDashboardPdf(filtersToApiParams(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `command-dashboard-${filters.from}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "خطا در PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const toggleWall = () => {
    const next = new URLSearchParams(searchParams);
    if (wallMode) {
      next.delete("wall");
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } else {
      next.set("wall", "1");
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    setSearchParams(next, { replace: true });
  };

  const renderBody = (id) => {
    if (id === "alerts") return <AlertsWidget alerts={data?.alerts || []} theme={theme} returnTo={RETURN_TO} />;
    if (id === "health") return <HealthScoreWidget health={data?.health} theme={theme} />;
    if (id === "iran_map") {
      return (
        <IranMapWidget
          provinces={data?.provinces_heat || []}
          theme={theme}
          onSelectProvince={onSelectProvince}
        />
      );
    }
    if (id === "provinces") {
      return (
        <ProvincesHeatWidget
          provinces={data?.provinces_heat || []}
          theme={theme}
          onSelectProvince={onSelectProvince}
        />
      );
    }
    if (id === "roles") {
      return <RolesPerformanceWidget roles={data?.roles || []} theme={theme} returnTo={RETURN_TO} />;
    }
    if (id === "units") {
      return (
        <UnitsHeatMapWidget
          units={data?.units_heatmap || []}
          theme={theme}
          onSelectUnit={onSelectUnit}
          returnTo={RETURN_TO}
        />
      );
    }
    if (id === "users") {
      return (
        <UsersActivityWidget
          leaderboard={data?.users_leaderboard}
          theme={theme}
          onlineCount={liveOnline ?? data?.online_users ?? data?.users_leaderboard?.online_count}
          onSelectUser={(uid) => setDrill({ mode: "user", id: String(uid) })}
        />
      );
    }
    if (id === "ai") return <AiPerformanceWidget ai={data?.ai_performance} theme={theme} />;
    if (id === "processes") {
      return <ProcessFunnelWidget processes={data?.processes || []} theme={theme} returnTo={RETURN_TO} />;
    }
    if (id === "products") {
      return <ProductsWidget products={data?.products} theme={theme} returnTo={RETURN_TO} />;
    }
    if (id === "trends") {
      return <TrendsWidget filters={filters} theme={theme} summary={data?.trends_summary} />;
    }
    return null;
  };

  const subtitle = `${formatGregorianAsJalali(filters.from)}${
    filters.from !== filters.to ? ` تا ${formatGregorianAsJalali(filters.to)}` : ""
  }`;

  const isWidgetStale = (id) => {
    const section = WIDGET_SECTION[id];
    if (!section) return false;
    return !fresh[section];
  };

  const toolbarExtra = !wallMode ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setReloadNonce((n) => n + 1)}
        disabled={loading}
        style={toolBtn(theme)}
        title="بارگذاری مجدد با فیلتر فعلی"
      >
        <RefreshCw size={14} /> به‌روزرسانی
      </button>
      <button type="button" onClick={() => setShowPersonalize((v) => !v)} style={toolBtn(theme)}>
        <SlidersHorizontal size={14} /> شخصی‌سازی
      </button>
      <button
        type="button"
        onClick={() => {
          setShowHistory((v) => !v);
          setShowPersonalize(false);
        }}
        style={toolBtn(theme)}
      >
        <History size={14} /> تاریخچه
      </button>
      <button type="button" onClick={exportKpi} style={toolBtn(theme)}>
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button type="button" onClick={exportPdf} disabled={exportingPdf} style={toolBtn(theme)}>
        <FileText size={14} /> {exportingPdf ? "PDF…" : "PDF"}
      </button>
      <button type="button" onClick={toggleWall} style={toolBtn(theme)}>
        <Monitor size={14} /> Video Wall
      </button>
    </div>
  ) : (
    <button type="button" onClick={toggleWall} style={toolBtn(theme)}>خروج از Wall</button>
  );

  const body = (
    <>
      {!wallMode ? <CommandOpsNav theme={theme} returnTo={RETURN_TO} /> : null}

      {!wallMode && showPersonalize ? (
        <WidgetPersonalizePanel
          widgetDefs={WIDGET_DEFS}
          visible={visible}
          setWidgetVisible={setWidgetVisible}
          theme={theme}
          onClose={() => setShowPersonalize(false)}
        />
      ) : null}

      {!wallMode && showHistory ? (
        <DashboardViewHistoryPanel
          theme={theme}
          units={data?.filter_options?.units || []}
          onClose={() => setShowHistory(false)}
          onApplyFilters={(next) => {
            setFilters((f) => ({ ...f, ...next }));
            setShowHistory(false);
          }}
        />
      ) : null}

      {!wallMode ? (
        <CommandFilterBar
          filters={filters}
          onChange={setFilters}
          units={data?.filter_options?.units || []}
          roles={data?.filter_options?.roles || []}
          provinces={data?.filter_options?.provinces || []}
          theme={theme}
        />
      ) : null}

      {error ? <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <DashboardLoadProgress
        active={loading || loadProgress < 100}
        progress={loadProgress}
        label={loadLabel}
        theme={theme}
      />

      <ExecutiveKpiBar
        items={data?.kpi_bar || []}
        theme={theme}
        loading={!data?.kpi_bar && !fresh.core}
        returnTo={RETURN_TO}
        wallMode={wallMode}
        stale={!fresh.core}
      />

      {!wallMode ? (
        <DashboardWidgetToolbar
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onReset={resetLayout}
          theme={theme}
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleOrder.map((id, idx) => {
          const meta = widgetMeta[id] || { title: id };
          const isOpen = wallMode ? true : !!open[id];
          const ready = widgetDataReady(id, data);
          const stale = isWidgetStale(id);
          const help = getWidgetHelp(id);
          return (
            <DashboardWidget
              key={id}
              title={meta.title}
              icon={meta.icon}
              isOpen={isOpen}
              onToggle={() => !wallMode && toggle(id)}
              theme={theme}
              badge={stale && !wallMode ? <StaleDataBanner theme={theme} label="به‌روزرسانی…" /> : null}
              actions={
                !wallMode ? (
                  <WidgetHelpButton help={help} theme={theme} compact />
                ) : null
              }
              onMoveUp={!wallMode && idx > 0 ? () => move(id, "up") : undefined}
              onMoveDown={!wallMode && idx < visibleOrder.length - 1 ? () => move(id, "down") : undefined}
            >
              {isOpen ? (
                <LazyWidgetBody active={isOpen} theme={theme}>
                  {!ready ? (
                    <WidgetBodySkeleton theme={theme} />
                  ) : (
                    <StaleBodyWrap stale={stale} theme={theme}>
                      {renderBody(id)}
                    </StaleBodyWrap>
                  )}
                </LazyWidgetBody>
              ) : null}
            </DashboardWidget>
          );
        })}
      </div>

      {drill ? (
        <CommandDrillPanel
          mode={drill.mode}
          id={drill.id}
          filters={filters}
          theme={theme}
          returnTo={RETURN_TO}
          onClose={() => setDrill(null)}
          onSelectUser={(uid) => setDrill({ mode: "user", id: String(uid) })}
        />
      ) : null}
    </>
  );

  if (wallMode) {
    const onlineWall = liveOnline ?? data?.online_users;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme.bg,
          color: theme.text,
          direction: "rtl",
          padding: "16px 20px 24px",
          fontSize: 17,
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ fontSize: 28, letterSpacing: "-0.02em", display: "block" }}>
              مرکز فرماندهی — Video Wall
            </strong>
            <span style={{ color: theme.muted, fontSize: 14 }}>
              {subtitle}
              {onlineWall != null ? ` · آنلاین: ${onlineWall}` : ""}
              {" · به‌روزرسانی خودکار"}
            </span>
          </div>
          {toolbarExtra}
        </div>
        <div
          style={{
            ["--wall-kpi-scale"]: 1.15,
            fontSize: "1.05em",
          }}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <FormPageLayout
      title="داشبورد مرکز فرماندهی"
      subtitle={subtitle}
      documentTitle="مرکز فرماندهی"
      backTo="/main"
      wide
      maxWidth={1280}
      toolbarExtra={toolbarExtra}
      onHelp={() => (
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p>داشبورد اجرایی برای پایش KPI، فرآیندها، یگان‌ها، هشدارها و روندهاست.</p>
          <p>
            با تغییر فیلتر، ویجت‌هایی که هنوز دادهٔ جدید نگرفته‌اند با برچسب «به‌روزرسانی» و پوشش نیمه‌شفاف مشخص
            می‌شوند تا با دادهٔ فیلتر قبلی اشتباه گرفته نشوند.
          </p>
          <p>
            روی هر ویجت دکمهٔ «راهنما» تفسیر دقیق اعداد همان بخش را نشان می‌دهد. برای KPI هم «راهنمای شاخص‌ها» بالای
            نوار شاخص‌ها در دسترس است.
          </p>
          <p>دکمهٔ «به‌روزرسانی» کل داشبورد را با فیلتر فعلی دوباره از سرور می‌گیرد.</p>
        </div>
      )}
      helpTitle="راهنمای مرکز فرماندهی"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: theme.muted, fontSize: 12 }}>
        <Crosshair size={16} color={theme.accent} />
        کمترین پیچیدگی، بیشترین آگاهی
      </div>
      {body}
    </FormPageLayout>
  );
}

function toolBtn(theme) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: theme.card,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
  };
}
