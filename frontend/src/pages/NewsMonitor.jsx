import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { LayoutList, Focus, Sparkles, RotateCcw as RotateCcwIcon } from "lucide-react";
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
  DUPLICATE_FILTER_OPTIONS, RELEVANCE_FILTER_OPTIONS, EDITORIAL_FILTER_OPTIONS,
  PUBLISH_FILTER_OPTIONS,
} from "../constants/newsMonitorMeta.js";
import NewsEditorialProgressOverlay, { NewsEditorialConfirmModal } from "../components/news/NewsEditorialRunModal.jsx";
import { formatAiErrorMessage } from "../utils/aiErrorMessage.js";
import { isEditorialCandidate, EDITORIAL_MAX_PER_RUN } from "../utils/editorialUtils.js";
import { NEWS_MONITOR_HELP } from "../content/newsFormHelp.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import EntityMessagesPanel from "../components/messaging/EntityMessagesPanel.jsx";
import EntityMessageComposeModal from "../components/messaging/EntityMessageComposeModal.jsx";
import MonitorSortBar from "../components/MonitorSortBar.jsx";
import { useMonitorSort } from "../hooks/useMonitorSort.js";
import useAnalysisToast from "../hooks/useAnalysisToast.jsx";
import { sortItems } from "../utils/listSort.js";
import {
  NEWS_MONITOR_SORT_FIELDS,
  NEWS_MONITOR_SORT_STORAGE_KEY,
  newsSortValue,
} from "../constants/monitorSortFields.js";

const cleanDateString = (str) => String(str ?? "").replace(/[\/]/g, "-").trim();

const todayRange = () => {
  const t = new DateObject({ calendar: persian });
  return [t, t];
};

const BASE_FILTERS = {
  review_state: "all",
  publish_status: "",
  priority: "",
  quality: "",
  sources: [],
  categories: [],
  duplicate: "exclude",
  relevance: "active",
  editorial_state: "",
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

const VERDICT_TOAST = {
  approved: "حکم ثبت شد — تأیید محتوا",
  rejected: "حکم ثبت شد — برگشت به فرستنده",
  rumor: "حکم ثبت شد — شایعه",
};

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
  const [listTotal, setListTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [sourceOptions, setSourceOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { showToast, Toast } = useAnalysisToast();
  const [entityMsgCompose, setEntityMsgCompose] = useState(false);
  const [entityMsgRefresh, setEntityMsgRefresh] = useState(0);
  const canManageMessages = hasRole(roles, "admin", "Field_admin", "news_chief");
  const canAiProcess = hasPermission(roles, "ai_process");
  const [sortConfig, setSortConfig] = useMonitorSort(NEWS_MONITOR_SORT_STORAGE_KEY, NEWS_MONITOR_SORT_FIELDS);
  const loadSeqRef = useRef(0);
  const [editorialModalOpen, setEditorialModalOpen] = useState(false);
  const [editorialBusy, setEditorialBusy] = useState(false);
  const [editorialRunId, setEditorialRunId] = useState(null);
  const editorialPollRef = useRef(null);
  const [editorFormKey, setEditorFormKey] = useState(0);

  const sortedItems = useMemo(
    () => sortItems(items, sortConfig, newsSortValue),
    [items, sortConfig],
  );

  const visibleUnprocessedItems = useMemo(
    () => sortedItems.filter(isEditorialCandidate),
    [sortedItems],
  );
  const visibleUnprocessedCount = visibleUnprocessedItems.length;
  const canRunEditorial = visibleUnprocessedCount > 0 && visibleUnprocessedCount <= EDITORIAL_MAX_PER_RUN;
  const showEditorialButton = canAiProcess && visibleUnprocessedCount > 0;

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
    relevance: filters.relevance || "active",
    ...(filters.editorial_state ? { editorial_state: filters.editorial_state } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.quality ? { quality: filters.quality } : {}),
    ...(filters.sources.length ? { sources: filters.sources.join(",") } : {}),
    ...(filters.categories.length ? { categories: filters.categories.join(",") } : {}),
    ...(filters.publish_status ? { publish_status: filters.publish_status } : {}),
    ...(searchTerm.trim() ? { q: searchTerm.trim() } : {}),
  }), [dateParams, filters, searchTerm]);

  const selectedIndex = useMemo(
    () => sortedItems.findIndex((x) => x.id === selectedId),
    [sortedItems, selectedId],
  );
  const selectedItem = selectedIndex >= 0 ? sortedItems[selectedIndex] : null;

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
    const seq = ++loadSeqRef.current;
    const params = queryParams;
    setLoading(true);
    try {
      const { items: rows, total } = await newsMonitorService.list(params);
      if (seq !== loadSeqRef.current) return;
      setItems(rows || []);
      setListTotal(Number.isFinite(total) ? total : (rows?.length ?? 0));
      if (keepSelection && rows?.length) {
        setSelectedId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0].id;
        });
      } else if (!rows?.length) {
        setSelectedId(null);
        setListTotal(0);
      }
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      showToast(e.response?.data?.error || "خطا در بارگذاری اخبار");
      setItems([]);
      setSelectedId(null);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
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

  useEffect(() => () => {
    if (editorialPollRef.current) clearInterval(editorialPollRef.current);
  }, []);

  const patchItemInList = (updated) => {
    if (!updated) return;
    setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  };

  const handleSave = async (id, patch, advance = false, saveKind = "edit") => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.update(id, patch);
      patchItemInList(updated);
      if (saveKind === "verdict") {
        showToast(VERDICT_TOAST[patch.review_state] || "حکم ثبت شد");
      } else {
        showToast("تغییرات متن و جزئیات ذخیره شد");
      }
      if (advance) {
        const idx = sortedItems.findIndex((x) => x.id === id);
        if (idx >= 0 && idx < sortedItems.length - 1) {
          setSelectedId(sortedItems[idx + 1].id);
        }
        if (isMobile && mobileOpen) {
          const nextId = sortedItems[idx + 1]?.id;
          if (!nextId) setMobileOpen(false);
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

  const handleQuickVerdict = async (id, reviewState, statusNote, priority) => {
    const patch = { review_state: reviewState };
    if (statusNote) patch.status_note = statusNote;
    if (priority != null) patch.priority = priority;
    await handleSave(id, patch, true, "verdict");
  };

  const handleFinalize = async (id) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.finalize(id);
      patchItemInList(updated);
      showToast("برگشت نهایی تأیید شد — خبر منتشر نمی‌شود");
      advanceAfterChiefAction(id);
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در تأیید برگشت");
    } finally {
      setBusyId(null);
    }
  };

  const advanceAfterChiefAction = (id) => {
    const idx = sortedItems.findIndex((x) => x.id === id);
    if (idx >= 0 && idx < sortedItems.length - 1) {
      setSelectedId(sortedItems[idx + 1].id);
    }
    loadStats();
  };

  const handleFinalizePublish = async (id) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.finalizePublish(id);
      patchItemInList(updated);
      showToast("تأیید و انتشار — آماده انتشار");
      advanceAfterChiefAction(id);
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در تأیید انتشار");
    } finally {
      setBusyId(null);
    }
  };

  const handleFinalizeBank = async (id) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.finalizeBank(id);
      patchItemInList(updated);
      showToast("در بانک انتظار ثبت شد");
      advanceAfterChiefAction(id);
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در ثبت بانک انتظار");
    } finally {
      setBusyId(null);
    }
  };

  const handleChiefReject = async (id, note) => {
    setBusyId(id);
    try {
      const updated = await newsMonitorService.chiefReject(id, note);
      patchItemInList(updated);
      showToast("خبر به صف دبیر برگشت");
      advanceAfterChiefAction(id);
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در برگشت به دبیر");
    } finally {
      setBusyId(null);
    }
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleOpenEdit = (id) => {
    setSelectedId(id);
    setMobileOpen(true);
  };

  const handleNavigate = (idx) => {
    if (idx >= 0 && idx < sortedItems.length) setSelectedId(sortedItems[idx].id);
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

  const pollEditorialRun = useCallback((runId) => {
    if (editorialPollRef.current) clearInterval(editorialPollRef.current);
    editorialPollRef.current = setInterval(async () => {
      try {
        const run = await newsMonitorService.getEditorialRun(runId);
        if (!run) return;
        if (run.status === "done") {
          clearInterval(editorialPollRef.current);
          editorialPollRef.current = null;
          setEditorialRunId(null);
          setEditorialBusy(false);
          const sj = typeof run?.stats_json === "string"
            ? JSON.parse(run.stats_json)
            : (run?.stats_json || {});
          const applied = Number(sj.llm_applied ?? 0);
          const hashL = Number(sj.hash_duplicates_linked ?? 0) + Number(sj.db_hash_duplicates_linked ?? 0);
          const simL = Number(sj.similarity_duplicates_linked ?? 0) + Number(sj.db_similarity_duplicates_linked ?? 0);
          const skipped = Number(run?.skipped_count ?? sj.llm_skipped ?? 0);
          const skipReasons = sj.llm_skip_reasons || {};
          const skipHint = Object.keys(skipReasons).length
            ? ` — دلایل رد: ${Object.entries(skipReasons).map(([k, v]) => `${k}:${v}`).join("، ")}`
            : "";
          if (applied + hashL + simL > 0) {
            showToast(`پالایش انجام شد: ${toPersianDigits(applied)} خبر به‌روز شد، ${toPersianDigits(hashL + simL)} تکراری لینک شد`);
          } else if (skipped > 0) {
            showToast(`پالایش تمام شد اما ${toPersianDigits(skipped)} خبر بدون تغییر ماند${skipHint}`);
          } else {
            showToast("پالایش تمام شد — تغییری اعمال نشد");
          }
          loadStats();
          await loadList(true);
          setEditorFormKey((k) => k + 1);
        } else if (run.status === "failed") {
          clearInterval(editorialPollRef.current);
          editorialPollRef.current = null;
          setEditorialRunId(null);
          setEditorialBusy(false);
          const sj = typeof run.stats_json === "string"
            ? JSON.parse(run.stats_json)
            : (run.stats_json || {});
          const mechLinked =
            Number(sj.hash_duplicates_linked ?? 0)
            + Number(sj.similarity_duplicates_linked ?? 0)
            + Number(sj.db_hash_duplicates_linked ?? 0)
            + Number(sj.db_similarity_duplicates_linked ?? 0);
          const errText = formatAiErrorMessage(run.error_message);
          if (mechLinked > 0) {
            showToast(`تکراری‌های مکانیکی لینک شد (${toPersianDigits(mechLinked)})؛ مرحله AI ناموفق: ${errText}`);
          } else {
            showToast(`پالایش هوشمند ناموفق: ${errText}`);
          }
          loadStats();
          loadList(true);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  }, [loadStats, loadList]);

  const handleStartEditorial = async () => {
    const ids = visibleUnprocessedItems.map((x) => x.id);
    if (!ids.length) {
      showToast("خبر پالایش‌نشده‌ای در لیست فعلی نیست");
      return;
    }
    if (ids.length > EDITORIAL_MAX_PER_RUN) {
      showToast(`حداکثر ${toPersianDigits(EDITORIAL_MAX_PER_RUN)} خبر در هر اجرا — لیست را محدودتر کنید`);
      return;
    }
    setEditorialBusy(true);
    try {
      const run = await newsMonitorService.startEditorialRun({
        ...queryParams,
        news_ids: ids.join(","),
      });
      setEditorialModalOpen(false);
      setEditorialRunId(run.id);
      pollEditorialRun(run.id);
    } catch (e) {
      setEditorialBusy(false);
      setEditorialModalOpen(false);
      showToast(e.response?.data?.error || "خطا در شروع پالایش");
    }
  };

  const handleRestoreIrrelevant = async () => {
    const ids = sortedItems
      .filter((x) => x.relevance_status === "irrelevant")
      .map((x) => x.id);
    if (!ids.length) {
      showToast("خبر غیرمرتبطی در لیست فعلی نیست");
      return;
    }
    setBusyId(-1);
    try {
      const { restored } = await newsMonitorService.restoreRelevance(ids);
      showToast(`${toPersianDigits(restored)} خبر به مرتبط بازگردانده شد`);
      loadList();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در بازگردانی");
    } finally {
      setBusyId(null);
    }
  };

  const statBar = useMemo(() => [
    { key: "total", label: "کل بازه", value: stats.total, color: "#38bdf8" },
    { key: "relevant", label: "مرتبط", value: stats.relevant, color: "#22c55e" },
    { key: "irrelevant", label: "غیرمرتبط", value: stats.irrelevant, color: "#94a3b8" },
    { key: "unprocessed", label: "پالایش‌نشده", value: stats.unprocessed, color: "#f59e0b" },
    { key: "duplicate", label: "تکراری", value: stats.duplicate, color: "#64748b" },
    { key: "wf_pending", label: "صف دبیر", value: stats.wf_pending, color: "#64748b" },
    { key: "wf_reviewed", label: "ارسال به سردبیر", value: stats.wf_reviewed, color: "#eab308" },
    { key: "wf_finalized", label: "آماده انتشار", value: stats.wf_finalized, color: "#22c55e" },
    { key: "wf_banked", label: "بانک انتظار", value: stats.wf_banked, color: "#0ea5e9" },
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
    onFinalizePublish: handleFinalizePublish,
    onFinalizeBank: handleFinalizeBank,
    onChiefReject: handleChiefReject,
    onToggleDuplicate: handleToggleDuplicate,
    onDelete: handleDelete,
    saving: busyId === selectedId,
  };

  const editorProviderProps = {
    item: selectedItem,
    items: sortedItems,
    index: selectedIndex >= 0 ? selectedIndex : 0,
    total: listTotal || sortedItems.length,
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

      <label className="v3-filter-label">وضعیت انتشار</label>
      <select className="v3-select-filter" value={filters.publish_status} onChange={(e) => setFilters((f) => ({ ...f, publish_status: e.target.value }))}>
        {PUBLISH_FILTER_OPTIONS.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
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

      <label className="v3-filter-label">مرتبط بودن</label>
      <select className="v3-select-filter" value={filters.relevance} onChange={(e) => setFilters((f) => ({ ...f, relevance: e.target.value }))}>
        {RELEVANCE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <label className="v3-filter-label">وضعیت پالایش</label>
      <select className="v3-select-filter" value={filters.editorial_state} onChange={(e) => setFilters((f) => ({ ...f, editorial_state: e.target.value }))}>
        {EDITORIAL_FILTER_OPTIONS.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
      </select>

      {filters.relevance === "irrelevant" ? (
        <button
          type="button"
          className="v3-btn-footer v3-primary-solid"
          style={{ marginTop: 4 }}
          disabled={busyId === -1}
          onClick={handleRestoreIrrelevant}
        >
          <RotateCcwIcon size={14} style={{ marginLeft: 6 }} />
          بازگردانی همه به مرتبط
        </button>
      ) : null}
    </div>
  );

  const editorialButton = showEditorialButton ? (
    <button
      type="button"
      className="v3-btn-footer v3-primary-solid"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        fontSize: 12,
        whiteSpace: "nowrap",
        opacity: canRunEditorial && !editorialRunId ? 1 : 0.55,
      }}
      disabled={!canRunEditorial || Boolean(editorialRunId) || editorialBusy}
      title={
        visibleUnprocessedCount > EDITORIAL_MAX_PER_RUN
          ? `بیش از ${toPersianDigits(EDITORIAL_MAX_PER_RUN)} خبر — لیست را محدودتر کنید`
          : `${toPersianDigits(visibleUnprocessedCount)} خبر پالایش‌نشده در لیست نمایش‌داده‌شده`
      }
      onClick={() => setEditorialModalOpen(true)}
    >
      <Sparkles size={15} />
      پالایش هوشمند
      <span style={{ fontSize: 11, opacity: 0.9 }}>({toPersianDigits(visibleUnprocessedCount)})</span>
    </button>
  ) : null;

  const viewToggle = (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <MonitorSortBar
        fields={NEWS_MONITOR_SORT_FIELDS}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        theme={theme}
        compact
      />
      <button
        type="button"
        className="news-view-toggle"
        onClick={() => setViewMode((m) => (m === "compact" ? "focus" : "compact"))}
      >
        {viewMode === "compact" ? <Focus /> : <LayoutList />}
        نمایش: {viewMode === "compact" ? "فشرده" : "کارت کامل"}
        {" "}({toPersianDigits(listTotal || sortedItems.length)})
      </button>
    </div>
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
        subNavExtra={editorialButton}
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
        {Toast}

        <NewsEditorFormProvider key={editorFormKey} {...editorProviderProps}>
          <NewsWorkspaceLayout
            isMobile={isMobile}
            drawerOpen={mobileOpen && !!selectedItem}
            theme={theme}
            listPane={(
              <NewsListPane
                items={sortedItems}
                selectedId={selectedId}
                onSelect={handleSelect}
                onEdit={handleOpenEdit}
                isMobile={isMobile}
                theme={theme}
                viewMode={isMobile ? "card" : viewMode}
                busyId={busyId}
                listHeader={!isMobile ? viewToggle : (
                  <MonitorSortBar
                    fields={NEWS_MONITOR_SORT_FIELDS}
                    sortConfig={sortConfig}
                    onSortChange={setSortConfig}
                    theme={theme}
                    compact
                    style={{ marginBottom: 4 }}
                  />
                )}
                roles={roles}
                onQuickVerdict={handleQuickVerdict}
                onFinalize={handleFinalize}
                onFinalizePublish={handleFinalizePublish}
                onFinalizeBank={handleFinalizeBank}
                onChiefReject={handleChiefReject}
                onToggleDuplicate={handleToggleDuplicate}
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
                items={sortedItems}
                index={selectedIndex >= 0 ? selectedIndex : 0}
                total={listTotal || sortedItems.length}
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
          showChannels
          onSent={() => setEntityMsgRefresh((k) => k + 1)}
        />
        </div>
      </AnalysisMonitorLayout>
      <NewsEditorialConfirmModal
        open={editorialModalOpen}
        onClose={() => !editorialBusy && setEditorialModalOpen(false)}
        onConfirm={handleStartEditorial}
        unprocessedCount={visibleUnprocessedCount}
        theme={theme}
        busy={editorialBusy}
      />
      {editorialRunId ? (
        <NewsEditorialProgressOverlay theme={theme} message="پالایش، تکراری‌یابی و دبیری هوشمند در حال اجراست…" />
      ) : null}
    </>
  );
}
