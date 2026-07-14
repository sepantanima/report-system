import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import AnalyticsFilterBar from "../../components/news/analytics/AnalyticsFilterBar.jsx";
import HelpModal from "../../components/common/HelpModal.jsx";
import api from "../../api/api.js";
import newsReportService from "../../services/newsReportService.js";
import { NEWS_REPORT_QUERY_HELP } from "../../content/newsFormHelp.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import {
  DEFAULT_CONTENT_FILTERS, buildContentFiltersFromWorkflow, buildNewsReportTitle, buildNewsReportFilterSummary, buildQueryDebugInfo, buildReportFilters, buildPeriodPayload,
  buildReportApiBody, formatReportTitleWithCount, getCurrentPresetSlotIndex, jalaliStr, sanitizeNewsReportPayload, todayJalaliDate,
} from "./newsReportUtils.js";
import NewsReportPeriodFilters from "./NewsReportPeriodFilters.jsx";
import NewsReportNewsTable from "./NewsReportNewsTable.jsx";
import NewsReportCollapsible from "./NewsReportCollapsible.jsx";

export default function NewsReportQueryStep({
  state, setState, onExtracted, onError, extractedCount, theme, isMobile,
  workflowDefaultFilters = null,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(state.pageSize || 20);
  const [applied, setApplied] = useState(false);
  const [showQueryDebug, setShowQueryDebug] = useState(false);
  const [resolvedPeriod, setResolvedPeriod] = useState(null);

  useEffect(() => {
    api.get("/news/analytics/filters/meta").then((r) => setMeta(r.data)).catch(() => setMeta({}));
  }, []);

  const setFilter = (key, val) => setState((s) => ({ ...s, filters: { ...s.filters, [key]: val } }));

  const validate = () => {
    const { mode, reportDate, fromDate, toDate } = state;
    if ((mode.startsWith("preset_") || mode === "same_day") && !jalaliStr(reportDate)) {
      return "تاریخ گزارش را انتخاب کنید.";
    }
    if (mode === "manual" && (!jalaliStr(fromDate) || !jalaliStr(toDate))) {
      return "تاریخ شروع و پایان را انتخاب کنید.";
    }
    return null;
  };

  const reportTitle = useMemo(() => buildNewsReportTitle(state), [state]);
  const filterSummary = useMemo(() => buildNewsReportFilterSummary(state, meta), [state, meta]);
  const displayTitle = useMemo(
    () => formatReportTitleWithCount(reportTitle, applied ? total : extractedCount),
    [reportTitle, applied, total, extractedCount],
  );

  const queryDebug = useMemo(() => buildQueryDebugInfo(state), [state]);

  const buildPayload = useCallback(() => sanitizeNewsReportPayload({
    ...buildPeriodPayload(state),
    filters: buildReportFilters(state.filters),
    label: buildNewsReportTitle(state),
  }), [state]);

  const fetchResults = useCallback(async (payload, pageNum, size) => {
    setLoading(true);
    onError("");
    try {
      const r = await newsReportService.previewRows({
        ...buildReportApiBody(payload),
        page: pageNum,
        page_size: size,
        sort: { key: "ref_key", direction: "desc" },
      });
      const count = r.total || 0;
      const label = buildNewsReportTitle(state);
      const fullPayload = sanitizeNewsReportPayload({
        ...payload,
        label: formatReportTitleWithCount(label, count),
      });
      setRows(r.rows || []);
      setTotal(count);
      setResolvedPeriod(r.period || null);
      setApplied(true);
      setState((s) => ({ ...s, queryPayload: fullPayload, pageSize: size }));
      onExtracted(count, fullPayload);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [onError, onExtracted, setState, state, meta]);

  useEffect(() => {
    setPageSize(state.pageSize || 20);
  }, [state.pageSize]);

  useEffect(() => {
    if (!state.queryPayload) return;
    setApplied(true);
    setPage(1);
    setTotal(extractedCount ?? 0);
    const payload = state.queryPayload;
    setLoading(true);
    newsReportService.previewRows({
      ...buildReportApiBody(payload),
      page: 1,
      page_size: pageSize,
      sort: { key: "ref_key", direction: "desc" },
    })
      .then((r) => {
        setRows(r.rows || []);
        setTotal(r.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = async () => {
    const err = validate();
    if (err) { onError(err); return; }
    const payload = buildPayload();
    setPage(1);
    await fetchResults(payload, 1, pageSize);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const payload = sanitizeNewsReportPayload(state.queryPayload || buildPayload());
    fetchResults(payload, newPage, pageSize);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setState((s) => ({ ...s, pageSize: size }));
    setPage(1);
    const payload = sanitizeNewsReportPayload(state.queryPayload || buildPayload());
    if (applied) fetchResults(payload, 1, size);
  };

  const handleFilterChange = () => {
    setApplied(false);
    setRows([]);
    setTotal(0);
    setPage(1);
    setState((s) => ({ ...s, queryPayload: null }));
    onExtracted(null, null);
  };

  const activePayload = state.queryPayload || buildPayload();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 18 }}>استخراج گزارش</h2>
        <button type="button" onClick={() => setShowHelp(true)} style={helpBtn(theme)}>
          <HelpCircle size={16} /> راهنما
        </button>
      </div>

      <div style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.isDarkMode ? "rgba(56,189,248,0.08)" : "rgba(14,165,233,0.06)",
      }}
      >
        <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>عنوان گزارش</div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>
          {toPersianDigits(displayTitle) || "—"}
        </div>
        {filterSummary && (
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 8, lineHeight: 1.6 }}>
            فیلتر: {filterSummary}
          </div>
        )}
        {applied && (
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
            تعداد اخبار فیلترشده: {toPersianDigits(total)}
          </div>
        )}
      </div>

      <NewsReportPeriodFilters
        state={state}
        setState={(fn) => { handleFilterChange(); setState(fn); }}
        theme={theme}
        isMobile={isMobile}
      />

      <div style={{ marginTop: 14 }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4, opacity: 0.85 }}>کلیدواژه</label>
        <input
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            background: theme.isDarkMode ? "#0f172a" : "#f1f5f9",
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          value={state.filters.keyword}
          onChange={(e) => { handleFilterChange(); setFilter("keyword", e.target.value); }}
          placeholder="جستجو در متن و منبع..."
        />
      </div>

      <AnalyticsFilterBar
        showDateRange={false}
        showApplyButton={false}
        dateRange={null}
        onDateRangeChange={() => {}}
        filters={state.filters}
        setFilter={(key, val) => { handleFilterChange(); setFilter(key, val); }}
        meta={meta}
        theme={theme}
        isDarkMode={theme.isDarkMode}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        onApply={handleApply}
        onReset={() => {
          handleFilterChange();
          const resetFilters = buildContentFiltersFromWorkflow(workflowDefaultFilters);
          setState((s) => ({ ...s, filters: resetFilters }));
        }}
        priorityQualityMultiSelect
        statusMultiSelect
        unitMultiSelect
      />

      <button
        type="button"
        onClick={() => setShowQueryDebug((v) => !v)}
        style={{
          marginTop: 4,
          padding: 0,
          border: "none",
          background: "none",
          color: theme.muted,
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {showQueryDebug ? "پنهان کردن جزئیات کوئری" : "نمایش فیلتر ارسالی به دیتابیس"}
      </button>
      {showQueryDebug && (
        <pre style={{
          marginTop: 8,
          marginBottom: 12,
          padding: 10,
          borderRadius: 8,
          background: theme.isDarkMode ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
          fontSize: 11,
          lineHeight: 1.6,
          overflow: "auto",
          direction: "ltr",
          textAlign: "left",
          color: theme.text,
        }}
        >
          {JSON.stringify({ client: queryDebug, server: resolvedPeriod }, null, 2)}
        </pre>
      )}

      <div style={{ marginTop: 16, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          disabled={loading}
          onClick={handleApply}
          style={{
            flex: "1 1 200px",
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: "#0ea5e9",
            color: "#fff",
            cursor: loading ? "wait" : "pointer",
            fontSize: 15,
            fontFamily: "inherit",
          }}
        >
          {loading ? <Loader2 size={18} className="spin" /> : "اعمال فیلتر"}
        </button>
      </div>

      {applied && (
        <NewsReportCollapsible
          title="لیست اخبار"
          badge={total}
          defaultOpen={false}
          theme={theme}
        >
          <NewsReportNewsTable
            queryPayload={activePayload}
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            dynamicTitle={displayTitle}
            isDarkMode={theme.isDarkMode}
          />
        </NewsReportCollapsible>
      )}

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} title="راهنمای استخراج گزارش">
        <NEWS_REPORT_QUERY_HELP />
      </HelpModal>
    </div>
  );
}

function helpBtn(theme) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "5px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  };
}

export function createInitialQueryState() {
  const today = todayJalaliDate();
  return {
    mode: "preset_6h",
    slotIndex: getCurrentPresetSlotIndex("preset_6h"),
    reportDate: today,
    fromDate: today,
    toDate: today,
    fromTime: "00:00",
    toTime: "23:59",
    filters: { ...DEFAULT_CONTENT_FILTERS },
    queryPayload: null,
    pageSize: 20,
  };
}
