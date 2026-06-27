import React, { useCallback, useEffect, useMemo, useState } from "react";
import newsReportService from "../../services/newsReportService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { buildReportApiBody } from "../newsReport/newsReportUtils.js";
import NewsReportNewsTable from "../newsReport/NewsReportNewsTable.jsx";

export default function NewsSmartAnalysisSelectStep({
  queryPayload, selectedIds, setSelectedIds, extractedCount, onError, theme,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(extractedCount ?? 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async (pageNum, size) => {
    if (!queryPayload) return;
    setLoading(true);
    onError("");
    try {
      const r = await newsReportService.previewRows({
        ...buildReportApiBody(queryPayload),
        page: pageNum,
        page_size: size,
        sort: { key: "ref_key", direction: "desc" },
      });
      setRows(r.rows || []);
      setTotal(r.total || 0);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [queryPayload, onError]);

  useEffect(() => { loadRows(page, pageSize); }, [loadRows, page, pageSize]);

  const toggleId = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const togglePageAll = () => {
    const pageIds = rows.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const outputCount = selectedIds.length > 0 ? selectedIds.length : total;

  const selection = useMemo(() => ({
    selectedIds,
    onToggle: toggleId,
    onTogglePageAll: togglePageAll,
  }), [selectedIds, rows]);

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>انتخاب اخبار برای تحلیل</h2>
      <p style={{ fontSize: 13, color: theme.muted, marginBottom: 14 }}>
        {selectedIds.length > 0
          ? `${toPersianDigits(selectedIds.length)} خبر انتخاب شده — در غیر این صورت همه ${toPersianDigits(total)} خبر تحلیل می‌شوند.`
          : `همه ${toPersianDigits(total)} خبر فیلترشده در تحلیل لحاظ می‌شوند. برای محدود کردن، تیک بزنید.`}
      </p>

      <NewsReportNewsTable
        queryPayload={queryPayload}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        dynamicTitle={`${toPersianDigits(outputCount)} خبر برای تحلیل`}
        isDarkMode={theme.isDarkMode}
        selection={selection}
      />
    </div>
  );
}
