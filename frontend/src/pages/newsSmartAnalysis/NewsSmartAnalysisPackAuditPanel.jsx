import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import newsSmartAnalysisService from "../../services/newsSmartAnalysisService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function NewsSmartAnalysisPackAuditPanel({ packId, theme }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !packId) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    newsSmartAnalysisService.getPackNews(packId)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setErr(e.response?.data?.error || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, packId]);

  if (!packId) return null;

  const missing = data?.missing_ids?.length ?? 0;

  return (
    <div style={{
      marginTop: 16,
      borderRadius: 10,
      border: `1px solid ${theme.border}`,
      overflow: "hidden",
    }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: theme.card,
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          color: theme.text,
        }}
      >
        <span>ممیزی اخبار فریزشدهٔ پک</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${theme.border}`, background: theme.isDarkMode ? "rgba(15,23,42,0.4)" : "#f8fafc" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.muted }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              بارگذاری…
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: "#f87171" }}>{err}</div>}
          {!loading && data && (
            <>
              {missing > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 8,
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  fontSize: 12,
                  color: theme.isDarkMode ? "#fcd34d" : "#b45309",
                }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {toPersianDigits(missing)}
                    {" "}
                    خبر از DB حذف شده یا در دسترس نیست؛ لیست فریزشده با وضعیت فعلی DB متفاوت است.
                  </span>
                </div>
              )}
              <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8 }}>
                {toPersianDigits(data.rows?.length ?? 0)}
                {" "}
                خبر از
                {" "}
                {toPersianDigits(data.ordered_ids?.length ?? 0)}
                {" "}
                شناسهٔ فریزشده
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <th style={{ padding: 6, textAlign: "right" }}>#</th>
                      <th style={{ padding: 6, textAlign: "right" }}>تاریخ</th>
                      <th style={{ padding: 6, textAlign: "right" }}>منبع</th>
                      <th style={{ padding: 6, textAlign: "right" }}>خلاصه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows || []).map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: 6, whiteSpace: "nowrap" }}>{toPersianDigits(row.id)}</td>
                        <td style={{ padding: 6, whiteSpace: "nowrap" }}>
                          {toPersianDigits(row.source_date_jalali || row.ref_date || "—")}
                        </td>
                        <td style={{ padding: 6 }}>{row.source || "—"}</td>
                        <td style={{ padding: 6, maxWidth: 320 }}>
                          {(row.cleaned_text || row.summary || row.raw_text || "").slice(0, 120)}
                          …
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
