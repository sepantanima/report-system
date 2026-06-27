import React, { useCallback, useMemo, useState } from "react";
import { Eye, Loader2, Send } from "lucide-react";
import DashboardDataTable from "../../components/dashboard/DashboardDataTable.jsx";
import newsReportService from "../../services/newsReportService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import {
  NEWS_REPORT_TABLE_COLUMNS,
  getNewsRowCellValue,
} from "./newsReportTableConfig.js";
import { buildReportApiBody, reportPayloadDateRange } from "./newsReportUtils.js";

export default function NewsReportNewsTable({
  queryPayload,
  rows,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
  dynamicTitle,
  isDarkMode,
  selection = null,
  onViewDetail,
  onSendSingle,
  sendingId,
}) {
  const [detailRow, setDetailRow] = useState(null);

  const columns = useMemo(() => {
    const cols = [...NEWS_REPORT_TABLE_COLUMNS];
    if (onSendSingle) {
      cols.push({ key: "actions", title: "ارسال", width: 56, visible: true });
    }
    return cols;
  }, [onSendSingle]);

  const openDetail = (row) => {
    if (onViewDetail) onViewDetail(row);
    else setDetailRow(row);
  };

  const fetchAllRows = useCallback(async () => {
    if (!queryPayload) return [];
    const r = await newsReportService.previewRows({
      ...buildReportApiBody(queryPayload),
      page: 1,
      page_size: 2000,
      sort: { key: "ref_key", direction: "desc" },
    });
    return r.rows || [];
  }, [queryPayload]);

  const renderCell = (row, col) => {
    if (col.key === "view") {
      return (
        <button
          type="button"
          title="مشاهده خبر"
          onClick={() => openDetail(row)}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#38bdf8", display: "inline-flex", padding: 4 }}
        >
          <Eye size={16} />
        </button>
      );
    }
    if (col.key === "actions" && onSendSingle) {
      return (
        <button
          type="button"
          title="ارسال"
          disabled={sendingId === row.id}
          onClick={() => onSendSingle(row.id)}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#22c55e", display: "inline-flex", padding: 4 }}
        >
          {sendingId === row.id ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      );
    }
    if (col.key === "full_text") {
      const text = getNewsRowCellValue(row, "full_text");
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "stretch" }}>
          <span style={{ fontSize: 11, lineHeight: 1.6, textAlign: "justify" }}>
            {toPersianDigits(text.length > 160 ? `${text.slice(0, 160)}…` : text)}
          </span>
          <button
            type="button"
            onClick={() => openDetail(row)}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "#38bdf8", cursor: "pointer", fontSize: 11, padding: 0 }}
          >
            <Eye size={14} /> متن کامل
          </button>
        </div>
      );
    }
    if (col.key === "short_text") {
      const t = row.short_text || "—";
      return (
        <span style={{ fontSize: 11, lineHeight: 1.5 }}>
          {toPersianDigits(t.length > 80 ? `${t.slice(0, 80)}…` : t)}
        </span>
      );
    }
    return undefined;
  };

  const activeDetail = detailRow;

  return (
    <>
      <DashboardDataTable
        columns={columns}
        data={rows}
        isDarkMode={isDarkMode}
        dynamicTitle={dynamicTitle || "گزارش اخبار"}
        exportBaseName="اخبار-گزارش"
        exportDateRange={reportPayloadDateRange(queryPayload)}
        defaultSortKey="ref_date"
        defaultSortDir="desc"
        getCellValue={getNewsRowCellValue}
        renderCell={renderCell}
        justifyKeys={["full_text", "short_text"]}
        rowKey="id"
        loading={loading}
        emptyMessage={loading ? "در حال بارگذاری…" : "خبری یافت نشد."}
        serverPagination={{
          page,
          pageSize,
          total,
          onPageChange,
          onPageSizeChange,
        }}
        onExportAll={fetchAllRows}
        selection={selection}
      />

      {activeDetail && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setDetailRow(null)}
        >
          <div
            style={{ background: isDarkMode ? "#1e293b" : "#fff", borderRadius: 12, padding: 20, maxWidth: 640, width: "100%", maxHeight: "80vh", overflow: "auto", color: isDarkMode ? "#f1f5f9" : "#1e293b" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>متن کامل خبر</h3>
            <p style={{ fontSize: 12, opacity: 0.8 }}>
              {toPersianDigits(getNewsRowCellValue(activeDetail, "ref_date"))} — {toPersianDigits(getNewsRowCellValue(activeDetail, "ref_hm"))} — {activeDetail.source}
            </p>
            <div
              dangerouslySetInnerHTML={{ __html: activeDetail.cleaned_text || activeDetail.raw_text || "" }}
              style={{ lineHeight: 1.9, fontSize: 14 }}
            />
            <button type="button" onClick={() => setDetailRow(null)} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "#64748b", color: "#fff", cursor: "pointer" }}>
              بستن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
