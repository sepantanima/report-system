import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AnalyticsFilterBar from "../../components/news/analytics/AnalyticsFilterBar.jsx";
import api from "../../api/api.js";
import newsReportService from "../../services/newsReportService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { DEFAULT_CONTENT_FILTERS } from "../newsReport/newsReportUtils.js";
import NewsReportNewsTable from "../newsReport/NewsReportNewsTable.jsx";
import NewsSmartAnalysisPeriodFilters from "./NewsSmartAnalysisPeriodFilters.jsx";
import {
  buildSmartAnalysisPeriodPayload,
  validateSmartAnalysisDates,
} from "./newsSmartAnalysisUtils.js";

export default function NewsSmartAnalysisQueryStep({
  state, setState, onExtracted, onError, extractedCount, theme,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(state.pageSize || 20);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    api.get("/news/analytics/filters/meta").then((r) => setMeta(r.data)).catch(() => setMeta({}));
  }, []);

  const setFilter = (key, val) => setState((s) => ({ ...s, filters: { ...s.filters, [key]: val } }));

  const handleFilterChange = () => {
    setApplied(false);
    setRows([]);
    setTotal(0);
    setPage(1);
    setState((s) => ({ ...s, queryPayload: null }));
    onExtracted(null, null);
  };

  const buildPayload = useCallback(
    () => buildSmartAnalysisPeriodPayload(state),
    [state],
  );

  const fetchResults = useCallback(async (payload, pageNum, size) => {
    setLoading(true);
    onError("");
    try {
      const r = await newsReportService.previewRows({
        ...payload,
        page: pageNum,
        page_size: size,
        sort: { key: "ref_key", direction: "desc" },
      });
      const count = r.total || 0;
      const fullPayload = { ...payload, label: `تحلیل (${count} خبر)` };
      setRows(r.rows || []);
      setTotal(count);
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
  }, [onError, onExtracted, setState]);

  const handleApply = async () => {
    const err = validateSmartAnalysisDates(state);
    if (err) { onError(err); return; }
    const payload = buildPayload();
    setPage(1);
    await fetchResults(payload, 1, pageSize);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const payload = state.queryPayload || buildPayload();
    fetchResults(payload, newPage, pageSize);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setState((s) => ({ ...s, pageSize: size }));
    setPage(1);
    if (applied) fetchResults(state.queryPayload || buildPayload(), 1, size);
  };

  const displayCount = applied ? total : extractedCount;

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>جستجوی اخبار</h2>

      <NewsSmartAnalysisPeriodFilters
        state={state}
        setState={setState}
        theme={theme}
        onChange={handleFilterChange}
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

      <div style={{ marginTop: 14 }}>
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
            setState((s) => ({ ...s, filters: { ...DEFAULT_CONTENT_FILTERS } }));
          }}
          priorityQualityMultiSelect
          statusMultiSelect
          unitMultiSelect
        />
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          background: "#7c3aed",
          color: "#fff",
          cursor: loading ? "wait" : "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
        جستجو
      </button>

      {applied && (
        <div style={{ marginTop: 16, fontSize: 13, color: theme.muted }}>
          تعداد اخبار یافت‌شده: {toPersianDigits(displayCount ?? 0)}
        </div>
      )}

      {applied && rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <NewsReportNewsTable
            queryPayload={state.queryPayload}
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            dynamicTitle="پیش‌نمایش اخبار"
            isDarkMode={theme.isDarkMode}
          />
        </div>
      )}
    </div>
  );
}
