import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Package } from "lucide-react";
import newsReportService from "../../services/newsReportService.js";
import newsSmartAnalysisService from "../../services/newsSmartAnalysisService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { buildReportApiBody } from "../newsReport/newsReportUtils.js";
import NewsReportNewsTable from "../newsReport/NewsReportNewsTable.jsx";
import { buildSuggestedPackTitle } from "./newsSmartAnalysisUtils.js";

export default function NewsSmartAnalysisSelectStep({
  queryPayload,
  selectedIds,
  setSelectedIds,
  extractedCount,
  onError,
  theme,
  onPackCreated,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(extractedCount ?? 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [packTitle, setPackTitle] = useState("");
  const titleTouchedRef = useRef(false);

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

  const outputCount = selectedIds.length > 0 ? selectedIds.length : total;

  const suggestedTitle = useMemo(
    () => buildSuggestedPackTitle(queryPayload, outputCount),
    [queryPayload, outputCount],
  );

  useEffect(() => {
    if (!titleTouchedRef.current) {
      setPackTitle(suggestedTitle);
    }
  }, [suggestedTitle]);

  useEffect(() => {
    titleTouchedRef.current = false;
    setPackTitle(buildSuggestedPackTitle(queryPayload, extractedCount ?? 0));
  }, [queryPayload]);

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

  const selection = useMemo(() => ({
    selectedIds,
    onToggle: toggleId,
    onTogglePageAll: togglePageAll,
  }), [selectedIds, rows]);

  const handleCreatePack = async () => {
    if (!queryPayload || creating) return;
    if (total <= 0) {
      onError("خبری برای فریز در این بازه یافت نشد.");
      return;
    }
    const title = packTitle.trim();
    if (!title) {
      onError("عنوان بسته تحلیلی الزامی است.");
      return;
    }
    setCreating(true);
    onError("");
    try {
      const pack = await newsSmartAnalysisService.createPack({
        query_payload: queryPayload,
        selected_ids: selectedIds.length ? selectedIds : undefined,
        title,
      });
      onPackCreated?.(pack);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  };

  const createDisabled = creating || loading || total <= 0 || !packTitle.trim();

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>انتخاب اخبار برای تحلیل</h2>
      <p style={{ fontSize: 13, color: theme.muted, marginBottom: 14 }}>
        {selectedIds.length > 0
          ? `${toPersianDigits(selectedIds.length)} خبر انتخاب شده — در غیر این صورت همه ${toPersianDigits(total)} خبر تحلیل می‌شوند.`
          : `همه ${toPersianDigits(total)} خبر فیلترشده در تحلیل لحاظ می‌شوند. برای محدود کردن، تیک بزنید.`}
      </p>

      <div style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.isDarkMode ? "rgba(168,85,247,0.06)" : "rgba(124,58,237,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: theme.text }}>
            عنوان پیشنهادی بسته تحلیلی
          </label>
          <input
            type="text"
            value={packTitle}
            onChange={(e) => {
              titleTouchedRef.current = true;
              setPackTitle(e.target.value);
            }}
            disabled={creating}
            placeholder={suggestedTitle}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.input || theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: 13,
            }}
          />
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, lineHeight: 1.6 }}>
            این عنوان در لیست بسته‌ها نمایش داده می‌شود و با تغییر انتخاب اخبار به‌روز می‌شود
            (مگر آن را دستی ویرایش کرده باشید).
          </div>
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
        >
          <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.7 }}>
            با «ایجاد بسته و ادامه»،
            {" "}
            {toPersianDigits(outputCount)}
            {" "}
            خبر فریز می‌شود و به مرحلهٔ تولید تحلیل می‌روید.
          </div>
          <button
            type="button"
            disabled={createDisabled}
            onClick={handleCreatePack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #7c3aed",
              background: "#7c3aed",
              color: "#fff",
              cursor: createDisabled ? "not-allowed" : "pointer",
              opacity: createDisabled ? 0.6 : 1,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {creating
              ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              : <Package size={16} />}
            ایجاد بسته و ادامه
          </button>
        </div>
      </div>

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
