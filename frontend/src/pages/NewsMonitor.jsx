import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { LayoutList, Focus } from "lucide-react";
import AnalysisMonitorLayout from "../components/analysis/AnalysisMonitorLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import NewsWorkspaceLayout from "../components/news/NewsWorkspaceLayout.jsx";
import NewsListPane from "../components/news/NewsListPane.jsx";
import NewsDetailPane from "../components/news/NewsDetailPane.jsx";
import NewsReviewPane from "../components/news/NewsReviewPane.jsx";
import NewsDetailDrawer from "../components/news/NewsDetailDrawer.jsx";
import { NewsEditorFormProvider } from "../components/news/NewsEditorFormContext.jsx";
import newsMonitorService from "../services/newsMonitorService.js";
import { getSessionRoles, getNewsRoleLevel, hasPermission, hasRole } from "../utils/userRoles.js";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";
import {
  NEWS_PRIORITIES, NEWS_QUALITY, NEWS_REVIEW_STATES, NEWS_WORKFLOW_STATES,
  DUPLICATE_FILTER_OPTIONS,
} from "../constants/newsMonitorMeta.js";
import { NEWS_MONITOR_HELP } from "../content/newsFormHelp.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import EntityMessagesPanel from "../components/messaging/EntityMessagesPanel.jsx";
import EntityMessageComposeModal from "../components/messaging/EntityMessageComposeModal.jsx";

const cleanDateString = (str) => String(str ?? "").replace(/[\/]/g, "-").trim();

const todayRange = () => {
  const t = new DateObject({ calendar: persian });
  return [t, t];
};

const BASE_FILTERS = {
  review_state: "all",
  priority: "",
  quality: "",
  sources: [],
  categories: [],
  duplicate: "exclude",
};

function getInitialFilters(roles) {
  const level = getNewsRoleLevel(roles);
  const workflow_status = level === "chief" ? "reviewed" : "pending";
  return { ...BASE_FILTERS, workflow_status };
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function NewsMonitor() {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "news_review") || hasPermission(roles, "news_finalize");
  const { isDarkMode } = useAppTheme();
  const isMobile = useIsMobile();

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
    isDarkMode,
  }), [isDarkMode]);

  const [dates, setDates] = useState(todayRange);
  const [filters, setFilters] = useState(() => getInitialFilters(roles));
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("focus");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [sourceOptions, setSourceOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");
  const [entityMsgCompose, setEntityMsgCompose] = useState(false);
  const [entityMsgRefresh, setEntityMsgRefresh] = useState(0);
  const canManageMessages = hasRole(roles, "admin", "Field_admin", "news_chief");

  const dateParams = useMemo(() => {
    if (!dates?.[0]) return {};
    const sd = cleanDateString(new DateObject(dates[0]).format("YYYY-MM-DD"));
    const ed = dates[1]
      ? cleanDateString(new DateObject(dates[1]).format("YYYY-MM-DD"))
      : sd;
    return { start_date: sd, end_date: ed };
  }, [dates]);

  const queryParams = useMemo(() => ({
    ...dateParams,
    workflow_status: filters.workflow_status || "all",
    review_state: filters.review_state || "all",
    duplicate: filters.duplicate,
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.quality ? { quality: filters.quality } : {}),
    ...(filters.sources.length ? { sources: filters.sources.join(",") } : {}),
    ...(filters.categories.length ? { categories: filters.categories.join(",") } : {}),
    ...(searchTerm.trim() ? { q: searchTerm.trim() } : {}),
  }), [dateParams, filters, searchTerm]);

  const selectedIndex = useMemo(
    () => items.findIndex((x) => x.id === selectedId),
    [items, selectedId],
  );
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadMeta = useCallback(async () => {
    try {
      const [sources, cats] = await Promise.all([
        newsMonitorService.sources(),
        newsMonitorService.categories(),
      ]);
      setSourceOptions((sources || []).map((s) => ({ value: s, label: s })));
      setCategoryOptions((cats || []).map((c) => ({ value: String(c.id), label: c.title_fa })));
    } catch {
      /* optional */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await newsMonitorService.summaryStats(dateParams);
      setStats(data || {});
    } catch {
      setStats({});
    }
  }, [dateParams]);

  const loadList = useCallback(async (keepSelection = true) => {
    setLoading(true);
    try {
      const rows = await newsMonitorService.list(queryParams);
      setItems(rows || []);
      if (keepSelection && rows?.length) {
        setSelectedId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0].id;
        });
      } else if (!rows?.length) {
        setSelectedId(null);
      }
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در بارگذاری اخبار");
      setItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    if (!allowed) return;
    loadMeta();
  }, [allowed, loadMeta]);

  useEffect(() => {
    if (!allowed) return;
    loadStats();
  }, [allowed, loadStats]);

  useEffect(() => {
    if (!allowed) return;
    loadList(false);
  }, [allowed, loadList]);

  const patchItemInList = (updated) => {
    if (!updated) return;
    setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  };

  const handleSave = async (id, patch, advance = false) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.update(id, patch);
      patchItemInList(updated);
      showToast("ذخیره شد");
      if (advance) {
        const idx = items.findIndex((x) => x.id === id);
        if (idx >= 0 && idx < items.length - 1) {
          setSelectedId(items[idx + 1].id);
        }
      }
      loadStats();
      return updated;
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در ذخیره");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickVerdict = async (id, reviewState, statusNote) => {
    const patch = { review_state: reviewState };
    if (statusNote) patch.status_note = statusNote;
    await handleSave(id, patch, true);
  };

  const handleFinalize = async (id) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.finalize(id);
      patchItemInList(updated);
      showToast("تأیید نهایی شد");
      const idx = items.findIndex((x) => x.id === id);
      if (idx >= 0 && idx < items.length - 1) {
        setSelectedId(items[idx + 1].id);
      }
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در تأیید نهایی");
    } finally {
      setBusyId(null);
    }
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    if (isMobile) setMobileOpen(true);
  };

  const handleNavigate = (idx) => {
    if (idx >= 0 && idx < items.length) setSelectedId(items[idx].id);
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    try {
      await newsMonitorService.deleteNews(id);
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (selectedId === id) {
          const idx = prev.findIndex((x) => x.id === id);
          setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? null);
        }
        return next;
      });
      if (isMobile) setMobileOpen(false);
      showToast("خبر حذف شد");
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در حذف");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleDuplicate = async (id, isCurrentlySuspicious) => {
    setBusyId(id);
    try {
      const updated = isCurrentlySuspicious
        ? await newsMonitorService.unflagDuplicate(id)
        : await newsMonitorService.flagDuplicate(id);
      patchItemInList(updated);
      showToast(isCurrentlySuspicious ? "علامت «مشکوک به تکرار» برداشته شد" : "به‌عنوان مشکوک به تکرار علامت‌گذاری شد");
    } catch (e) {
      showToast(e.response?.data?.error || "خطا");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleImportant = async (id) => {
    const item = items.find((x) => x.id === id);
    const p = Number(item?.priority || 3);
    const newPriority = (p === 1 || p === 2) ? 3 : 2;
    setBusyId(id);
    try {
      const updated = await newsMonitorService.update(id, { priority: newPriority });
      patchItemInList(updated);
      showToast(newPriority === 2 ? "خبر مهم شد" : "اهمیت عادی شد");
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در تغییر اهمیت");
    } finally {
      setBusyId(null);
    }
  };

  const statBar = useMemo(() => [
    { key: "total", label: "کل بازه", value: stats.total, color: "#38bdf8" },
    { key: "wf_pending", label: "صف دبیر", value: stats.wf_pending, color: "#64748b" },
    { key: "wf_reviewed", label: "ارسال به سردبیر", value: stats.wf_reviewed, color: "#eab308" },
    { key: "wf_finalized", label: "آماده انتشار", value: stats.wf_finalized, color: "#22c55e" },
    { key: "duplicate", label: "تکراری", value: stats.duplicate, color: "#94a3b8" },
  ], [stats]);

  const resetFilters = () => {
    setFilters(getInitialFilters(roles));
    setSearchTerm("");
    setDates(todayRange());
  };

  const actionProps = {
    onNavigate: handleNavigate,
    onSave: handleSave,
    onFinalize: handleFinalize,
    onToggleDuplicate: handleToggleDuplicate,
    onToggleImportant: handleToggleImportant,
    onDelete: handleDelete,
    saving: busyId === selectedId,
  };

  const editorProviderProps = {
    item: selectedItem,
    items,
    index: selectedIndex >= 0 ? selectedIndex : 0,
    roles,
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  const filterContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="v3-filter-label">گردش کار</label>
      <select className="v3-select-filter" value={filters.workflow_status} onChange={(e) => setFilters((f) => ({ ...f, workflow_status: e.target.value }))}>
        <option value="all">همه</option>
        {Object.entries(NEWS_WORKFLOW_STATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <label className="v3-filter-label">نتیجه بررسی</label>
      <select className="v3-select-filter" value={filters.review_state} onChange={(e) => setFilters((f) => ({ ...f, review_state: e.target.value }))}>
        <option value="all">همه</option>
        {Object.entries(NEWS_REVIEW_STATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <label className="v3-filter-label">اولویت</label>
      <select className="v3-select-filter" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
        <option value="">همه</option>
        {Object.entries(NEWS_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <label className="v3-filter-label">کیفیت</label>
      <select className="v3-select-filter" value={filters.quality} onChange={(e) => setFilters((f) => ({ ...f, quality: e.target.value }))}>
        <option value="">همه</option>
        {Object.entries(NEWS_QUALITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <label className="v3-filter-label">منبع</label>
      <MultiSelect options={sourceOptions} values={filters.sources} onChange={(v) => setFilters((f) => ({ ...f, sources: v }))} placeholder="همه منابع" />

      <label className="v3-filter-label">دسته‌بندی</label>
      <MultiSelect options={categoryOptions} values={filters.categories} onChange={(v) => setFilters((f) => ({ ...f, categories: v }))} placeholder="همه دسته‌ها" />

      <label className="v3-filter-label">تکراری</label>
      <select className="v3-select-filter" value={filters.duplicate} onChange={(e) => setFilters((f) => ({ ...f, duplicate: e.target.value }))}>
        {DUPLICATE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const viewToggle = (
    <button
      type="button"
      className="news-view-toggle"
      onClick={() => setViewMode((m) => (m === "compact" ? "focus" : "compact"))}
    >
      {viewMode === "compact" ? <Focus /> : <LayoutList />}
      نمایش: {viewMode === "compact" ? "فشرده" : "کارت کامل"}
      {" "}({toPersianDigits(items.length)})
    </button>
  );

  return (
    <>
      <AnalysisMonitorLayout
        pageTitle="مدیریت اخبار"
        searchPlaceholder="جستجو در متن، فرستنده، منبع..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dates={dates}
        onDatesChange={setDates}
        stats={statBar}
        showFilters={showFilters}
        onToggleFilters={setShowFilters}
        onResetFilters={resetFilters}
        filterContent={filterContent}
        loading={loading}
        onHelp={NEWS_MONITOR_HELP}
        helpTitle="راهنمای مدیریت اخبار"
        backTo="/main"
        fillViewport
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 6 }}>
        {toast ? (
          <div style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 8, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.35)", fontSize: 12 }}>
            {toast}
          </div>
        ) : null}


        <NewsEditorFormProvider {...editorProviderProps}>
          <NewsWorkspaceLayout
            isMobile={isMobile}
            drawerOpen={mobileOpen && !!selectedItem}
            theme={theme}
            listPane={(
              <NewsListPane
                items={items}
                selectedId={selectedId}
                onSelect={handleSelect}
                theme={theme}
                viewMode={isMobile ? "card" : viewMode}
                busyId={busyId}
                listHeader={!isMobile ? viewToggle : null}
                roles={roles}
                onQuickVerdict={handleQuickVerdict}
                onFinalize={handleFinalize}
                onToggleDuplicate={handleToggleDuplicate}
                onToggleImportant={handleToggleImportant}
              />
            )}
            centerPane={!isMobile ? (
              <NewsDetailPane {...actionProps} theme={theme} isMobile={false} />
            ) : null}
            reviewPane={!isMobile ? (
              <NewsReviewPane theme={theme} categoryOptions={categoryOptions} />
            ) : null}
            mobileDrawer={(
              <NewsDetailDrawer
                open={mobileOpen && !!selectedItem}
                onClose={() => setMobileOpen(false)}
                item={selectedItem}
                items={items}
                index={selectedIndex >= 0 ? selectedIndex : 0}
                roles={roles}
                categoryOptions={categoryOptions}
                theme={theme}
                {...actionProps}
              />
            )}
          />
          {selectedItem?.id && !isMobile ? (
            <div style={{ flexShrink: 0, padding: "0 4px 8px" }}>
              <EntityMessagesPanel
                key={`${selectedItem.id}-${entityMsgRefresh}`}
                entityType="news"
                entityId={selectedItem.id}
                theme={theme}
                canCompose={canManageMessages}
                onCompose={() => setEntityMsgCompose(true)}
              />
            </div>
          ) : null}
        </NewsEditorFormProvider>
        <EntityMessageComposeModal
          open={entityMsgCompose && !!selectedItem?.id}
          onClose={() => setEntityMsgCompose(false)}
          entityType="news"
          entityId={selectedItem?.id}
          theme={theme}
          onSent={() => setEntityMsgRefresh((k) => k + 1)}
        />
        </div>
      </AnalysisMonitorLayout>
    </>
  );
}
