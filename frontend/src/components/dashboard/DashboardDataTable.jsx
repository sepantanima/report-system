import React, { useEffect, useMemo, useState } from "react";
import { exportToExcel } from "../../utils/excelExport.js";
import { buildExportFileName } from "../../utils/exportDateRange.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const toFa = toPersianDigits;

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function DashboardDataTable({
  columns: columnsProp,
  data = [],
  isDarkMode,
  dynamicTitle = "گزارش",
  exportBaseName = "گزارش",
  exportDateRange,
  defaultSortKey,
  defaultSortDir = "desc",
  getCellValue,
  renderCell,
  justifyKeys = [],
  rowKey = "id",
  loading = false,
  serverPagination = null,
  onExportAll = null,
  selection = null,
  emptyMessage = "داده‌ای یافت نشد.",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: defaultSortKey || columnsProp?.[0]?.key || null,
    direction: defaultSortDir,
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(serverPagination?.pageSize || 20);
  const [columnConfig, setColumnConfig] = useState(columnsProp || []);
  const [exporting, setExporting] = useState(false);

  const isServerMode = Boolean(serverPagination);

  useEffect(() => {
    setColumnConfig(columnsProp || []);
  }, [columnsProp]);

  useEffect(() => {
    if (isServerMode && serverPagination?.pageSize) {
      setItemsPerPage(serverPagination.pageSize);
    }
  }, [isServerMode, serverPagination?.pageSize]);

  useEffect(() => {
    if (!isServerMode) setCurrentPage(1);
  }, [data, searchTerm, itemsPerPage, isServerMode]);

  const resolveCell = (row, col) => {
    if (renderCell) {
      const rendered = renderCell(row, col);
      if (rendered !== undefined) return rendered;
    }
    const raw = getCellValue ? getCellValue(row, col.key) : row[col.key];
    return raw === undefined || raw === null ? "—" : toFa(raw);
  };

  const sortValue = (row, key) => {
    const raw = getCellValue ? getCellValue(row, key) : row[key];
    const n = Number(raw);
    if (!Number.isNaN(n) && raw !== "" && raw != null) return n;
    return String(raw ?? "");
  };

  const sortedRows = useMemo(() => {
    let result = (data || []).filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aV = sortValue(a, sortConfig.key);
        const bV = sortValue(b, sortConfig.key);
        if (aV < bV) return sortConfig.direction === "asc" ? -1 : 1;
        if (aV > bV) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, searchTerm, sortConfig, getCellValue]);

  const activePage = isServerMode ? serverPagination.page : currentPage;
  const activePageSize = isServerMode ? serverPagination.pageSize : itemsPerPage;
  const totalRows = isServerMode ? (serverPagination.total || 0) : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / activePageSize) || 1);

  const currentData = useMemo(() => {
    if (isServerMode) return sortedRows;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [isServerMode, sortedRows, currentPage, itemsPerPage]);

  const visibleCols = columnConfig.filter((c) => c.visible !== false);

  const rowNumberBase = isServerMode
    ? (activePage - 1) * activePageSize
    : (currentPage - 1) * itemsPerPage;

  const buildExportRows = (sourceRows) => sourceRows.map((row) => {
    const o = {};
    visibleCols.forEach((col) => {
      const raw = getCellValue ? getCellValue(row, col.key) : row[col.key];
      o[col.title] = raw ?? "—";
    });
    return o;
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      let sourceRows = sortedRows;
      if (onExportAll) {
        sourceRows = await onExportAll();
      }
      const rows = buildExportRows(sourceRows || []);
      if (!rows.length) {
        alert("داده‌ای برای خروجی وجود ندارد.");
        return;
      }
      const fileName = exportDateRange
        ? buildExportFileName(exportBaseName, exportDateRange)
        : `${String(dynamicTitle).replace(/[\\/:*?"<>|]/g, "").trim()}.xlsx`;
      exportToExcel(rows, fileName);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    let sourceRows = sortedRows;
    if (onExportAll) {
      try {
        sourceRows = await onExportAll();
      } catch {
        sourceRows = sortedRows;
      }
    }
    const safeTitle = String(dynamicTitle).replace(/[\\/:*?"<>|]/g, "").trim();
    const rowsHtml = (sourceRows || []).map((r, i) => `
        <tr>
          <td style="text-align:center;width:40px;">${toFa(i + 1)}</td>
          ${visibleCols.map((c) => {
            const raw = getCellValue ? getCellValue(r, c.key) : r[c.key];
            const text = raw ?? "—";
            const justify = justifyKeys.includes(c.key);
            return `<td style="text-align:${justify ? "justify" : "center"}">${toFa(text)}</td>`;
          }).join("")}
        </tr>`).join("");

    const w = window.open("", "_blank");
    w.document.write(`
      <html dir="rtl"><head><title>${safeTitle}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { direction: rtl; font-family: Tahoma, Arial, sans-serif; font-size: 10px; padding: 20px; color: #000; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 8px; word-wrap: break-word; vertical-align: top; }
        th { background: #f2f2f2; font-weight: bold; }
        h2 { text-align: center; margin-bottom: 20px; font-size: 16px; }
        tr { page-break-inside: avoid; }
      </style></head>
      <body onload="window.print(); window.close();">
        <h2>${toFa(dynamicTitle)}</h2>
        <table><thead><tr>
          ${selection ? "<th style='width:30px;'></th>" : ""}
          <th style="width:40px;">ردیف</th>
          ${visibleCols.map((c) => `<th>${c.title}</th>`).join("")}
        </tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      </body></html>`);
    w.document.close();
  };

  const onPagePrev = () => {
    if (isServerMode) serverPagination.onPageChange(activePage - 1);
    else setCurrentPage((p) => p - 1);
  };

  const onPageNext = () => {
    if (isServerMode) serverPagination.onPageChange(activePage + 1);
    else setCurrentPage((p) => p + 1);
  };

  const onPageSizeChange = (val) => {
    if (isServerMode) serverPagination.onPageSizeChange(val);
    else {
      setItemsPerPage(val);
      setCurrentPage(1);
    }
  };

  const bg = isDarkMode ? "#1e293b" : "#fff";
  const inputBg = isDarkMode ? "#0f172a" : "#fff";
  const text = isDarkMode ? "#fff" : "#000";
  const border = isDarkMode ? "#334155" : "#ccc";

  if (!loading && !data?.length && !isServerMode) {
    return <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", padding: 10 }}>{emptyMessage}</p>;
  }

  if (!loading && !data?.length && isServerMode && totalRows === 0) {
    return <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", padding: 10 }}>{emptyMessage}</p>;
  }

  const getRowId = (row) => (selection?.getRowId ? selection.getRowId(row) : row[rowKey]);

  return (
    <div style={{ width: "100%", padding: 10, direction: "rtl", fontFamily: "Tahoma", boxSizing: "border-box", background: bg, color: text, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder={isServerMode ? "جستجو در صفحه جاری..." : "جستجو در تمام فیلدها..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200, height: 36, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: inputBg, color: text, fontFamily: "inherit", fontSize: 12 }}
        />
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {selection?.onTogglePageAll && (
            <button type="button" onClick={selection.onTogglePageAll} style={s.btnSec(isDarkMode, border)}>
              انتخاب صفحه
            </button>
          )}
          <button type="button" disabled={exporting} onClick={handleExport} style={s.btnExcel} title="دریافت فایل اکسل">
            {exporting ? "…" : "📊 اکسل"}
          </button>
          <button type="button" onClick={handlePrint} style={s.btnPrint} title="چاپ">🖨️ چاپ</button>
          <button type="button" onClick={() => setShowColumnSettings(!showColumnSettings)} style={s.btnSec(isDarkMode, border)} title="تنظیم ستون‌ها">
            <SettingsIcon />
          </button>
          <select
            value={activePageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ height: 34, padding: "0 8px", borderRadius: 6, border: `1px solid ${border}`, background: inputBg, color: text, fontFamily: "inherit", fontSize: 11 }}
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>{toFa(v)} ردیف</option>
            ))}
          </select>
        </div>
      </div>

      {selection?.selectedIds && (
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.85 }}>
          {selection.selectedIds.length
            ? `${toFa(selection.selectedIds.length)} خبر انتخاب‌شده`
            : "بدون انتخاب = همه نتایج در خروجی"}
        </div>
      )}

      {showColumnSettings ? (
        <div style={{ ...s.settingsPanel, borderColor: border }}>
          {columnConfig.map((col, idx) => (
            <label key={col.key} style={{ fontSize: 11, cursor: "pointer", display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={col.visible !== false}
                onChange={() => setColumnConfig((prev) => prev.map((c, i) => (i === idx ? { ...c, visible: !c.visible } : c)))}
              />
              {col.title}
            </label>
          ))}
        </div>
      ) : null}

      <div style={{ overflowX: "auto", border: `1px solid ${border}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: isDarkMode ? "#0f172a" : "#f5f5f5" }}>
              {selection && <th style={{ width: 36, padding: 8, border: `1px solid ${border}` }}>✓</th>}
              <th style={{ width: 45, padding: 12, border: `1px solid ${border}` }}>ردیف</th>
              {visibleCols.map((col) => (
                <th key={col.key} style={{ padding: 10, border: `1px solid ${border}`, width: col.width ? `${col.width}px` : undefined }}>
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => setSortConfig((prev) => ({
                      key: col.key,
                      direction: prev.key === col.key && prev.direction === "asc" ? "desc" : "asc",
                    }))}
                  >
                    {col.title}{" "}
                    {sortConfig.key === col.key ? (sortConfig.direction === "asc" ? "🔼" : "🔽") : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={visibleCols.length + 1 + (selection ? 1 : 0)} style={{ padding: 24, textAlign: "center" }}>
                  در حال بارگذاری…
                </td>
              </tr>
            )}
            {!loading && currentData.map((row, idx) => {
              const rid = getRowId(row);
              return (
                <tr key={rid ?? idx}>
                  {selection && (
                    <td style={{ padding: 8, border: `1px solid ${border}`, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selection.selectedIds?.includes(rid)}
                        onChange={() => selection.onToggle?.(rid)}
                      />
                    </td>
                  )}
                  <td style={{ padding: 8, border: `1px solid ${border}`, textAlign: "center" }}>
                    {toFa(rowNumberBase + idx + 1)}
                  </td>
                  {visibleCols.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: 8,
                        border: `1px solid ${border}`,
                        textAlign: justifyKeys.includes(col.key) ? "justify" : "center",
                        verticalAlign: "top",
                        wordWrap: "break-word",
                      }}
                    >
                      {resolveCell(row, col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 15, marginTop: 15, flexWrap: "wrap" }}>
        <button type="button" disabled={activePage <= 1 || loading} onClick={onPagePrev} style={s.pageBtn}>قبلی</button>
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          صفحه {toFa(activePage)} از {toFa(totalPages)}
          {isServerMode ? ` — ${toFa(totalRows)} ردیف` : ""}
        </span>
        <button type="button" disabled={activePage >= totalPages || loading} onClick={onPageNext} style={s.pageBtn}>بعدی</button>
      </div>
    </div>
  );
}

const s = {
  btnExcel: { background: "#10b981", color: "#fff", border: "none", height: 34, padding: "0 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: "bold" },
  btnPrint: { background: "#0ea5e9", color: "#fff", border: "none", height: 34, padding: "0 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: "bold" },
  btnSec: (dark, border) => ({ display: "flex", alignItems: "center", justifyContent: "center", height: 34, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: dark ? "#0f172a" : "#f8fafc", cursor: "pointer", color: "inherit", fontFamily: "inherit", fontSize: 11 }),
  settingsPanel: { padding: 15, borderRadius: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, marginBottom: 15, fontSize: 11, border: "1px solid" },
  pageBtn: { padding: "5px 12px", cursor: "pointer", borderRadius: 5, background: "#3b82f6", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 11 },
};
