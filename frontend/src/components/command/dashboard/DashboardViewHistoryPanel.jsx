import React, { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import commandCenterService from "../../../services/commandCenterService.js";
import { formatGregorianAsJalali } from "./dashboardDateUtils.js";
import { formatPersianDateShort } from "../../../utils/analysisMonitorUtils.js";
import { getRoleLabelFa } from "../../../utils/userRoles.js";

const PROCESS_STATUS_FA = {
  pending: "در انتظار",
  reviewed: "در بررسی",
  finalized: "نهایی",
  open_analysis: "تحلیل باز",
};
const PRODUCT_TYPE_FA = { field: "رصد", news: "خبر", analysis: "تحلیل", strategy: "راهبردی" };
const PRIORITY_FA = { urgent: "فوری", important: "مهم", normal: "عادی" };

function summarizeFilters(f, units = []) {
  if (!f || typeof f !== "object") return "—";
  const parts = [];
  if (f.from && f.to) {
    const fromFa = formatGregorianAsJalali(f.from);
    const toFa = formatGregorianAsJalali(f.to);
    parts.push(fromFa === toFa ? fromFa : `${fromFa} تا ${toFa}`);
  }
  if (f.unit_id) {
    const u = units.find((x) => String(x.id) === String(f.unit_id));
    parts.push(u?.name ? `یگان: ${u.name}` : `یگان: ${f.unit_id}`);
  }
  if (f.province) parts.push(`استان: ${f.province}`);
  if (f.role) parts.push(`نقش: ${getRoleLabelFa(f.role) || f.role}`);
  if (f.process_status) parts.push(`فرآیند: ${PROCESS_STATUS_FA[f.process_status] || f.process_status}`);
  if (f.product_type) parts.push(`محصول: ${PRODUCT_TYPE_FA[f.product_type] || f.product_type}`);
  if (f.priority) parts.push(`اهمیت: ${PRIORITY_FA[f.priority] || f.priority}`);
  return parts.length ? parts.join(" · ") : "بدون فیلتر";
}

function filtersJsonToDashboard(f) {
  if (!f || typeof f !== "object" || !f.from) return null;
  return {
    preset: "custom",
    from: f.from,
    to: f.to || f.from,
    unit_id: f.unit_id ? String(f.unit_id) : "",
    role: f.role ? String(f.role) : "",
    province: f.province ? String(f.province) : "",
    process_status: f.process_status ? String(f.process_status) : "",
    product_type: f.product_type ? String(f.product_type) : "",
    priority: f.priority ? String(f.priority) : "",
  };
}

export default function DashboardViewHistoryPanel({ theme, units = [], onClose, onApplyFilters }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    commandCenterService
      .dashboardViewHistory({ limit: 25 })
      .then((d) => {
        if (!cancelled) {
          setItems(d?.items || []);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <History size={14} color={theme.accent} />
          تاریخچه مشاهده داشبورد
        </strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text,
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
          }}
        >
          بستن
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>در حال بارگذاری…</p>
      ) : error ? (
        <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{error}</p>
      ) : !items.length ? (
        <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>هنوز بازدیدی ثبت نشده است.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflow: "auto" }}>
          {items.map((row) => {
            const f = row.filters_json || {};
            const summary = summarizeFilters(f, units);
            const when = row.viewed_at ? formatPersianDateShort(row.viewed_at) : "—";
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  fontSize: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: theme.muted, fontSize: 11, marginBottom: 4 }}>{when}</div>
                  <div style={{ color: theme.text, lineHeight: 1.5 }}>{summary}</div>
                </div>
                {onApplyFilters ? (
                  <button
                    type="button"
                    title="اعمال فیلترها"
                    onClick={() => {
                      const next = filtersJsonToDashboard(f);
                      if (next?.from) onApplyFilters(next);
                    }}
                    style={{
                      flexShrink: 0,
                      background: "transparent",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: theme.text,
                      padding: "4px 8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "inherit",
                      fontSize: 11,
                    }}
                  >
                    <RotateCcw size={12} />
                    اعمال
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
