import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { StatChart } from "../../components/StatChart.jsx";
import analysisService from "../../services/analysisService";
import { MISSION_STATUS_META, formatPersianDateShort, toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { exportToExcel } from "../../utils/excelExport";
import { buildExportFileName, formatDateRangeLabel } from "../../utils/exportDateRange";

const ANALYST_COLUMNS = {
  rank: "رتبه",
  name: "تحلیل‌گر",
  unit_name: "واحد",
  completed: "تکمیل",
  avg_score: "میانگین امتیاز",
  revisions: "اصلاحات",
};

const REVIEWER_COLUMNS = {
  rank: "رتبه",
  name: "داور / راهنما",
  feedback_count: "تعداد بازخورد",
  reviewed_versions: "نسخه بررسی‌شده",
};

const UNIT_COLUMNS = {
  rank: "رتبه",
  unit_name: "واحد",
  state_name: "استان",
  analyst_count: "تعداد تحلیل‌گر",
  completed: "تحلیل تکمیل",
  avg_score: "میانگین امتیاز",
};

const COMPLETED_COLUMNS = {
  topic_title: "محور",
  title: "عنوان تحلیل",
  analyst_name: "تحلیل‌گر",
  total_score: "امتیاز",
  updated_at: "تاریخ",
};

function Widget({ title, children, theme, action }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function RankTable({ rows, columns, theme, emptyText = "داده‌ای یافت نشد", extraColumn }) {
  if (!rows?.length) return <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>{emptyText}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: "8px 6px", textAlign: "right", color: theme.text, opacity: 0.7, whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
            {extraColumn && <th style={{ padding: "8px 6px", textAlign: "right", color: theme.text, opacity: 0.7 }}>{extraColumn.label}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.rank} style={{ borderBottom: `1px solid ${theme.border}` }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {extraColumn && <td style={{ padding: "8px 6px" }}>{extraColumn.render(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 10, padding: "10px 12px", minWidth: 100 }}>
      <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{toPersianDigits(value ?? 0)}</div>
    </div>
  );
}

function ExcelBtn({ onClick, color = "#10b981" }) {
  return (
    <button type="button" onClick={onClick} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: "none", background: color, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <FileSpreadsheet size={12} /> Excel
    </button>
  );
}

export default function AnalysisReportsDashboard({ theme, isDarkMode, dateRange, loading: parentLoading }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    analysisService.getReportDashboard(dateRange)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateRange?.startDate, dateRange?.endDate]);

  const rangeLabel = useMemo(() => formatDateRangeLabel(dateRange), [dateRange]);
  const rangeSuffix = rangeLabel ? ` — ${rangeLabel}` : "";

  const statusChartData = useMemo(() => (
    (data?.statusBreakdown || []).map((s) => ({
      name: MISSION_STATUS_META[s.status]?.label || s.status,
      value: s.count,
    }))
  ), [data]);

  const summary = data?.summary || {};

  const exportExcel = useCallback((rows, baseName, columnMap) => {
    const mapped = rows.map((r) => ({
      ...r,
      updated_at: r.updated_at ? formatPersianDateShort(r.updated_at) : r.updated_at,
    }));
    exportToExcel(mapped, buildExportFileName(baseName, dateRange), {
      columnMap,
      titleRow: rangeLabel || undefined,
    });
  }, [dateRange, rangeLabel]);

  const handleExportPdf = useCallback(async (analysisId) => {
    setPdfLoadingId(analysisId);
    try {
      const blob = await analysisService.exportPdf(analysisId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFileName(`analysis-${analysisId}`, dateRange, "pdf");
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || "خطا در دریافت PDF");
    } finally {
      setPdfLoadingId(null);
    }
  }, [dateRange]);

  if (loading || parentLoading) {
    return <p style={{ textAlign: "center", opacity: 0.6, padding: 32 }}>در حال بارگذاری گزارش‌ها...</p>;
  }

  if (!data) {
    return <p style={{ textAlign: "center", opacity: 0.6, padding: 32 }}>خطا در بارگذاری گزارش‌ها</p>;
  }

  const hasDateFilter = Boolean(dateRange?.startDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!hasDateFilter && (
        <p style={{ fontSize: 12, color: "#f59e0b", margin: 0, padding: 10, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
          برای فیلتر بازه زمانی، از «فیلتر تاریخ ثبت» در بالای صفحه استفاده کنید.
        </p>
      )}
      {rangeLabel && (
        <p style={{ fontSize: 12, color: "#38bdf8", margin: 0, padding: 10, borderRadius: 10, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
          {rangeLabel}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SummaryCard label="کل مأموریت‌ها" value={summary.total} color="#38bdf8" />
        <SummaryCard label="تکمیل‌شده" value={summary.completed} color="#22c55e" />
        <SummaryCard label="در انتظار بررسی" value={summary.pending_review} color="#f59e0b" />
        <SummaryCard label="نیازمند اصلاح" value={summary.needs_revision} color="#ef4444" />
        <SummaryCard label="لغوشده" value={summary.cancelled} color="#94a3b8" />
        <SummaryCard label="تأخیر" value={summary.delayed} color="#dc2626" />
      </div>

      <Widget title={`توزیع وضعیت مأموریت‌ها${rangeSuffix}`} theme={theme}>
        {statusChartData.length > 0 ? (
          <StatChart data={statusChartData} title={`وضعیت مأموریت‌ها${rangeSuffix}`} isDarkMode={isDarkMode} />
        ) : (
          <p style={{ fontSize: 12, opacity: 0.6 }}>داده‌ای برای نمودار وجود ندارد</p>
        )}
      </Widget>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Widget title={`رتبه‌بندی تحلیل‌گران${rangeSuffix}`} theme={theme}
          action={(data.analystRanking?.length > 0) && (
            <ExcelBtn onClick={() => exportExcel(data.analystRanking, "analyst-ranking", ANALYST_COLUMNS)} />
          )}
        >
          <RankTable theme={theme} rows={data.analystRanking} columns={[
            { key: "rank", label: "رتبه", render: (r) => toPersianDigits(r.rank) },
            { key: "name", label: "تحلیل‌گر" },
            { key: "unit_name", label: "واحد", render: (r) => r.unit_name || "—" },
            { key: "completed", label: "تکمیل", render: (r) => toPersianDigits(r.completed || 0) },
            { key: "avg_score", label: "میانگین امتیاز", render: (r) => r.avg_score != null ? toPersianDigits(r.avg_score) : "—" },
            { key: "revisions", label: "اصلاحات", render: (r) => toPersianDigits(r.revisions || 0) },
          ]} />
        </Widget>

        <Widget title={`فعالیت داوران / راهنماها${rangeSuffix}`} theme={theme}
          action={(data.reviewerRanking?.length > 0) && (
            <ExcelBtn onClick={() => exportExcel(data.reviewerRanking, "reviewer-ranking", REVIEWER_COLUMNS)} color="#8b5cf6" />
          )}
        >
          <RankTable theme={theme} rows={data.reviewerRanking} columns={[
            { key: "rank", label: "رتبه", render: (r) => toPersianDigits(r.rank) },
            { key: "name", label: "داور / راهنما" },
            { key: "feedback_count", label: "بازخورد", render: (r) => toPersianDigits(r.feedback_count || 0) },
            { key: "reviewed_versions", label: "نسخه بررسی‌شده", render: (r) => toPersianDigits(r.reviewed_versions || 0) },
          ]} emptyText="بازخوردی در این بازه ثبت نشده" />
        </Widget>
      </div>

      <Widget title={`رتبه‌بندی واحدها${rangeSuffix}`} theme={theme}
        action={(data.unitRanking?.length > 0) && (
          <ExcelBtn onClick={() => exportExcel(data.unitRanking, "unit-ranking", UNIT_COLUMNS)} color="#0ea5e9" />
        )}
      >
        <RankTable theme={theme} rows={data.unitRanking} columns={[
          { key: "rank", label: "رتبه", render: (r) => toPersianDigits(r.rank) },
          { key: "unit_name", label: "واحد" },
          { key: "state_name", label: "استان", render: (r) => r.state_name || "—" },
          { key: "analyst_count", label: "تحلیل‌گر", render: (r) => toPersianDigits(r.analyst_count || 0) },
          { key: "completed", label: "تحلیل تکمیل", render: (r) => toPersianDigits(r.completed || 0) },
          { key: "avg_score", label: "میانگین امتیاز", render: (r) => r.avg_score != null ? toPersianDigits(r.avg_score) : "—" },
        ]} />
      </Widget>

      <Widget title={`تحلیل‌های انجام‌شده (${toPersianDigits(data.completedAnalyses?.length || 0)})${rangeSuffix}`} theme={theme}
        action={(data.completedAnalyses?.length > 0) && (
          <ExcelBtn onClick={() => exportExcel(data.completedAnalyses, "completed-analyses", COMPLETED_COLUMNS)} />
        )}
      >
        <RankTable theme={theme} rows={data.completedAnalyses} columns={[
          { key: "topic_title", label: "محور" },
          { key: "title", label: "عنوان تحلیل", render: (r) => r.title || "—" },
          { key: "analyst_name", label: "تحلیل‌گر", render: (r) => r.analyst_name || "—" },
          { key: "total_score", label: "امتیاز", render: (r) => r.total_score != null ? toPersianDigits(r.total_score) : "—" },
          { key: "updated_at", label: "تاریخ", render: (r) => formatPersianDateShort(r.updated_at) },
        ]} emptyText="تحلیل تایید‌شده‌ای در این بازه نیست"
          extraColumn={{
            label: "PDF",
            render: (r) => (
              <button type="button" disabled={pdfLoadingId === r.id} onClick={() => handleExportPdf(r.id)}
                style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, opacity: pdfLoadingId === r.id ? 0.6 : 1 }}>
                <Download size={12} /> {pdfLoadingId === r.id ? "..." : "PDF"}
              </button>
            ),
          }}
        />
      </Widget>
    </div>
  );
}
