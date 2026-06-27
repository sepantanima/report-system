import React, { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Search, Send, Trash2 } from "lucide-react";
import newsReportService from "../../services/newsReportService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const FORMAT_LABELS = {
  html_card: "HTML کارتی",
  html_table: "HTML جدولی",
  txt: "TXT",
  pdf: "PDF",
  html: "HTML",
};

const PAGE_SIZES = [10, 20, 50];

export default function NewsReportHistoryTable({
  theme,
  isDarkMode,
  refreshKey = 0,
  onError,
  destinations = [],
  destinationId = "",
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await newsReportService.listHistory({ page, page_size: pageSize, q: search || undefined });
      setRows(r.rows || []);
      setTotal(r.total || 0);
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [onError, page, pageSize, search]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onDelete = async (id) => {
    if (!window.confirm("این گزارش حذف شود؟")) return;
    setDeletingId(id);
    onError?.("");
    try {
      await newsReportService.deleteReport(id);
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const onPublish = async (row) => {
    if (!destinationId) {
      onError?.("مقصد انتشار را از بالا انتخاب کنید.");
      return;
    }
    setPublishingId(row.id);
    onError?.("");
    try {
      await newsReportService.publishReport(row.id, { destination_id: parseInt(destinationId, 10) });
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setPublishingId(null);
    }
  };

  const onClearAll = async () => {
    if (!window.confirm(`همه ${toPersianDigits(total)} گزارش ذخیره‌شده حذف شوند؟`)) return;
    setClearing(true);
    onError?.("");
    try {
      await newsReportService.clearHistory();
      setPage(1);
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setClearing(false);
    }
  };

  const border = theme.border;
  const thStyle = {
    padding: "10px 8px",
    border: `1px solid ${border}`,
    background: isDarkMode ? "#0f172a" : "#f5f5f5",
    fontSize: 11,
    textAlign: "center",
  };
  const tdStyle = {
    padding: "8px",
    border: `1px solid ${border}`,
    fontSize: 11,
    textAlign: "center",
    verticalAlign: "middle",
  };

  const rowOffset = (page - 1) * pageSize;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>گزارش‌های قبلی ({toPersianDigits(total)})</h3>
        {total > 0 && (
          <button
            type="button"
            disabled={clearing || loading}
            onClick={onClearAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #ef4444",
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            {clearing ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
            پاکسازی همه
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.muted }} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجو در نام، فرمت یا شناسه..."
            style={{
              width: "100%",
              padding: "8px 32px 8px 10px",
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: 12,
              boxSizing: "border-box",
            }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted }}>
          در صفحه
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${border}`,
              background: theme.card,
              color: theme.text,
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{toPersianDigits(n)}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${border}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={thStyle}>ردیف</th>
              <th style={thStyle}>شناسه</th>
              <th style={thStyle}>نام فایل</th>
              <th style={thStyle}>فرمت</th>
              <th style={thStyle}>تعداد</th>
              <th style={thStyle}>وضعیت</th>
              <th style={thStyle}>انتشار</th>
              <th style={thStyle}>تاریخ</th>
              <th style={thStyle}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, padding: 20 }}>در حال بارگذاری…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, padding: 20, color: theme.muted }}>
                  {search ? "نتیجه‌ای یافت نشد." : "گزارشی ثبت نشده است."}
                </td>
              </tr>
            )}
            {!loading && rows.map((row, idx) => (
              <tr key={row.id}>
                <td style={tdStyle}>{toPersianDigits(rowOffset + idx + 1)}</td>
                <td style={tdStyle}>{toPersianDigits(row.id)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.file_name || "—"}</td>
                <td style={tdStyle}>{FORMAT_LABELS[row.format] || row.format}</td>
                <td style={tdStyle}>{toPersianDigits(row.news_count ?? 0)}</td>
                <td style={tdStyle}>{row.status || "—"}</td>
                <td style={tdStyle}>{row.publish_status || "—"}</td>
                <td style={tdStyle}>{formatDate(row.created_at)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      title="ارسال به پیام‌رسان"
                      disabled={row.status !== "ready" || publishingId === row.id || !destinationId}
                      onClick={() => onPublish(row)}
                      style={{ ...iconBtn(theme), color: "#22c55e" }}
                    >
                      {publishingId === row.id ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                    </button>
                    <button
                      type="button"
                      title="دانلود"
                      disabled={row.status !== "ready"}
                      onClick={() => newsReportService.download(row.id, row.file_name)}
                      style={iconBtn(theme)}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      disabled={deletingId === row.id}
                      onClick={() => onDelete(row.id)}
                      style={{ ...iconBtn(theme), color: "#ef4444" }}
                    >
                      {deletingId === row.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          <span style={{ color: theme.muted }}>
            نمایش {toPersianDigits(rowOffset + 1)}–{toPersianDigits(Math.min(rowOffset + rows.length, total))} از {toPersianDigits(total)}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={pageBtn(theme)}
            >
              قبلی
            </button>
            <span>{toPersianDigits(page)} / {toPersianDigits(totalPages)}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={pageBtn(theme)}
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function iconBtn(theme) {
  return {
    border: `1px solid ${theme.border}`,
    background: theme.card,
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  };
}

function pageBtn(theme) {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
  };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return toPersianDigits(d.toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" }));
  } catch {
    return "—";
  }
}
