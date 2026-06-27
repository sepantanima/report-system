import React, { useCallback, useEffect, useMemo, useState } from "react";

import { HelpCircle } from "lucide-react";

import HelpModal from "../../components/common/HelpModal.jsx";

import { NEWS_REPORT_RESULTS_HELP } from "../../content/newsFormHelp.jsx";

import newsReportService from "../../services/newsReportService.js";

import { buildReportApiBody, formatReportTitleWithCount } from "./newsReportUtils.js";

import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

import NewsReportNewsTable from "./NewsReportNewsTable.jsx";

import NewsReportCollapsible from "./NewsReportCollapsible.jsx";

import NewsReportDestinationBar from "./NewsReportDestinationBar.jsx";



export default function NewsReportResultsStep({

  queryPayload, selectedIds, setSelectedIds, pageSize: pageSizeProp = 20,

  extractedCount, onExtractedCount, onError, theme,

  destinations = [], destinationId = "", onDestinationChange,

}) {

  const [showHelp, setShowHelp] = useState(false);

  const [rows, setRows] = useState([]);

  const [total, setTotal] = useState(extractedCount ?? 0);

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(pageSizeProp);

  const [loading, setLoading] = useState(false);

  const [sendingId, setSendingId] = useState(null);

  const [bulkSending, setBulkSending] = useState(false);

  const [sendMsg, setSendMsg] = useState("");



  const displayTitle = useMemo(

    () => formatReportTitleWithCount(queryPayload?.label, total),

    [queryPayload?.label, total],

  );



  const outputCount = selectedIds.length > 0 ? selectedIds.length : total;



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

      const count = r.total || 0;

      setRows(r.rows || []);

      setTotal(count);

      onExtractedCount?.(count);

    } catch (e) {

      onError(e.response?.data?.error || e.message);

    } finally {

      setLoading(false);

    }

  }, [queryPayload, onError, onExtractedCount]);



  useEffect(() => { loadRows(page, pageSize); }, [loadRows, page, pageSize]);



  const toggleId = (id) => {

    setSelectedIds((prev) => {

      const s = new Set(prev);

      if (s.has(id)) s.delete(id); else s.add(id);

      return [...s];

    });

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



  const sendSingle = async (newsId) => {

    if (!destinationId) { onError("ابتدا کانال یا گروه مقصد را انتخاب کنید."); return; }

    setSendingId(newsId);

    setSendMsg("");

    onError("");

    try {

      await newsReportService.sendSingle({

        news_id: newsId,

        destination_id: parseInt(destinationId, 10),

      });

      setSendMsg("خبر ارسال شد.");

    } catch (e) {

      onError(e.response?.data?.error || e.message);

    } finally {

      setSendingId(null);

    }

  };



  const sendSelectedBatch = async () => {

    if (!destinationId) { onError("ابتدا کانال یا گروه مقصد را انتخاب کنید."); return; }

    if (!selectedIds.length) { onError("حداقل یک خبر را در جدول انتخاب کنید."); return; }

    setBulkSending(true);

    setSendMsg("");

    onError("");

    try {

      const r = await newsReportService.sendBatch({

        news_ids: selectedIds,

        destination_id: parseInt(destinationId, 10),

      });

      if (r.failed?.length) {

        onError(`${toPersianDigits(r.sent_count)} ارسال شد؛ ${toPersianDigits(r.failed.length)} ناموفق.`);

      } else {

        setSendMsg(`${toPersianDigits(r.sent_count)} خبر با موفقیت ارسال شد.`);

      }

    } catch (e) {

      onError(e.response?.data?.error || e.message);

    } finally {

      setBulkSending(false);

    }

  };



  const handlePageChange = (newPage) => {

    setPage(newPage);

    loadRows(newPage, pageSize);

  };



  const handlePageSizeChange = (size) => {

    setPageSize(size);

    setPage(1);

    loadRows(1, size);

  };



  return (

    <div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>

        <h2 style={{ margin: 0, fontSize: 18 }}>انتخاب اخبار</h2>

        <button type="button" onClick={() => setShowHelp(true)} style={{

          display: "flex", alignItems: "center", gap: 6, background: "none",

          border: `1px solid ${theme.border}`, color: theme.text, padding: "6px 12px", borderRadius: 8, cursor: "pointer",

        }}

        >

          <HelpCircle size={16} /> راهنما

        </button>

      </div>



      <NewsReportDestinationBar

        destinations={destinations}

        destinationId={destinationId}

        onDestinationChange={onDestinationChange}

        theme={theme}

        showBulkSend

        bulkCount={selectedIds.length}

        bulkSending={bulkSending}

        onBulkSend={sendSelectedBatch}

      />



      {sendMsg && (

        <div style={{ color: "#4ade80", marginBottom: 12, fontSize: 13 }}>{sendMsg}</div>

      )}



      <div style={{

        display: "flex",

        flexWrap: "wrap",

        gap: 12,

        padding: "10px 12px",

        borderRadius: 10,

        border: `1px solid ${theme.border}`,

        background: theme.card,

        fontSize: 13,

        marginBottom: 12,

      }}

      >

        <span>استخراج‌شده: <strong>{toPersianDigits(total)}</strong></span>

        <span style={{ color: theme.muted }}>|</span>

        <span>

          انتخاب‌شده: <strong>{toPersianDigits(selectedIds.length)}</strong>

          {selectedIds.length === 0 && <span style={{ color: theme.muted }}> (همه در خروجی)</span>}

        </span>

        <span style={{ color: theme.muted }}>|</span>

        <span>در خروجی: <strong>{toPersianDigits(outputCount)}</strong></span>

      </div>



      <div style={{

        marginBottom: 12,

        padding: "10px 12px",

        borderRadius: 8,

        border: `1px solid ${theme.border}`,

        background: theme.isDarkMode ? "rgba(56,189,248,0.08)" : "rgba(14,165,233,0.06)",

        fontSize: 13,

        fontWeight: 600,

        lineHeight: 1.6,

      }}

      >

        {toPersianDigits(displayTitle)}

      </div>



      <p style={{ margin: "0 0 14px", fontSize: 13, color: theme.muted, lineHeight: 1.7 }}>

        مقصد انتشار را یک‌بار بالا انتخاب کنید. سپس با دکمه سبز همه انتخاب‌شده‌ها را بفرستید، یا از آیکن ارسال در هر ردیف برای تکی استفاده کنید.

      </p>



      <NewsReportCollapsible

        title="لیست اخبار"

        badge={total}

        defaultOpen={false}

        theme={theme}

      >

        <NewsReportNewsTable

          queryPayload={queryPayload}

          rows={rows}

          total={total}

          page={page}

          pageSize={pageSize}

          loading={loading}

          onPageChange={handlePageChange}

          onPageSizeChange={handlePageSizeChange}

          dynamicTitle={displayTitle}

          isDarkMode={theme.isDarkMode}

          onSendSingle={destinationId ? sendSingle : null}

          sendingId={sendingId}

          selection={{

            selectedIds,

            onToggle: toggleId,

            onTogglePageAll: togglePageAll,

          }}

        />

      </NewsReportCollapsible>



      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} title="راهنمای نتایج">

        <NEWS_REPORT_RESULTS_HELP />

      </HelpModal>

    </div>

  );

}

