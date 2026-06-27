import React, { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Send, Trash2 } from "lucide-react";
import newsSmartAnalysisService, { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsSmartAnalysisHistoryTable({
  theme, refreshKey = 0, onError, destinationId, onLoadIntoEditor,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await newsSmartAnalysisService.list({ page, page_size: 10 });
      setRows(r.rows || []);
      setTotal(r.total || 0);
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [onError, page]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const onDelete = async (id) => {
    if (!window.confirm("این تحلیل حذف شود؟")) return;
    setDeletingId(id);
    try {
      await newsSmartAnalysisService.remove(id);
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const onPublish = async (row) => {
    if (!destinationId) {
      onError?.("مقصد انتشار را انتخاب کنید.");
      return;
    }
    setPublishingId(row.id);
    try {
      await newsSmartAnalysisService.publish(row.id, parseInt(destinationId, 10));
      await load();
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
    } finally {
      setPublishingId(null);
    }
  };

  if (!rows.length && !loading) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 15, marginBottom: 10 }}>تحلیل‌های ذخیره‌شده</h3>
      {loading && !rows.length ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> بارگذاری…
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ padding: 8, textAlign: "right" }}>عنوان</th>
                <th style={{ padding: 8 }}>نوع</th>
                <th style={{ padding: 8 }}>تاریخ</th>
                <th style={{ padding: 8 }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: 8, maxWidth: 280 }}>
                    <button
                      type="button"
                      onClick={() => onLoadIntoEditor?.(row)}
                      style={{
                        background: "none",
                        border: "none",
                        color: theme.accent || "#38bdf8",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "right",
                        padding: 0,
                      }}
                    >
                      {row.title}
                    </button>
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {ANALYSIS_ACTION_LABELS[row.analysis_type] || row.analysis_type}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {toPersianDigits(String(row.created_at || "").slice(0, 10))}
                  </td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button type="button" title="PDF" onClick={() => newsSmartAnalysisService.download(row.id, "pdf")} style={iconBtn(theme)}>
                        <Download size={12} />
                      </button>
                      <button type="button" title="Word" onClick={() => newsSmartAnalysisService.download(row.id, "docx")} style={iconBtn(theme)}>
                        W
                      </button>
                      <button type="button" title="انتشار" disabled={publishingId === row.id} onClick={() => onPublish(row)} style={iconBtn(theme)}>
                        {publishingId === row.id ? <Loader2 size={12} /> : <Send size={12} />}
                      </button>
                      <button type="button" title="حذف" disabled={deletingId === row.id} onClick={() => onDelete(row.id)} style={iconBtn(theme, true)}>
                        {deletingId === row.id ? <Loader2 size={12} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 10 && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={iconBtn(theme)}>قبلی</button>
              <span style={{ fontSize: 12, color: theme.muted }}>{toPersianDigits(page)}</span>
              <button type="button" disabled={page * 10 >= total} onClick={() => setPage((p) => p + 1)} style={iconBtn(theme)}>بعدی</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function iconBtn(theme, danger = false) {
  return {
    padding: "4px 8px",
    borderRadius: 6,
    border: `1px solid ${danger ? "#ef4444" : theme.border}`,
    background: theme.card,
    color: danger ? "#ef4444" : theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
  };
}
