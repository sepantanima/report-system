import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Gauge, ExternalLink } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { getRoleLabelFa } from "../../utils/userRoles.js";
import commandCenterService from "../../services/commandCenterService.js";
import DashboardWidget from "../../components/dashboard/DashboardWidget.jsx";
import { useDashboardWidgets } from "../../hooks/useDashboardWidgets.js";

const WIDGET_DEFS = [
  { id: "news_queue", title: "صف اخبار", defaultOpen: true },
  { id: "field_today", title: "گزارشات میدانی امروز", defaultOpen: true },
  { id: "analysis_missions", title: "مأموریت‌های تحلیل", defaultOpen: true },
  { id: "strategy_outputs", title: "خروجی‌های راهبردی", defaultOpen: true },
  { id: "staff_activity", title: "فعالیت کارکنان", defaultOpen: false },
];

function Stat({ label, value, color }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "inherit" }}>
        {value == null ? "—" : toPersianDigits(value)}
      </div>
    </div>
  );
}

export default function CommandKpiDashboard() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#e11d48",
  }), [isDarkMode]);

  const { order, open, toggle, move } = useDashboardWidgets("command-kpi", WIDGET_DEFS);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    commandCenterService.kpiOverview()
      .then((d) => { if (!cancelled) { setData(d); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.error || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const t = setInterval(() => {
      commandCenterService.kpiOverview().then((d) => setData(d)).catch(() => {});
    }, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const widgets = data?.widgets || {};

  const renderBody = (id) => {
    const w = widgets[id];
    if (!w) return <div style={{ color: theme.muted, fontSize: 12 }}>بدون داده</div>;

    if (id === "news_queue") {
      return (
        <div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10 }}>
            <Stat label="صف دبیر" value={w.pending} color="#a855f7" />
            <Stat label="صف سردبیر" value={w.reviewed} color="#38bdf8" />
            <Stat label="نهایی" value={w.finalized} color="#22c55e" />
            <Stat label="امروز" value={w.today} color={theme.accent} />
          </div>
          <DrillButton path={w.drilldown} navigate={navigate} theme={theme} />
        </div>
      );
    }
    if (id === "field_today") {
      return (
        <div>
          <Stat label="گزارش ثبت‌شده امروز" value={w.count} color="#06b6d4" />
          <div style={{ marginTop: 10 }}><DrillButton path={w.drilldown} navigate={navigate} theme={theme} /></div>
        </div>
      );
    }
    if (id === "analysis_missions") {
      return (
        <div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10 }}>
            <Stat label="باز" value={w.open} color="#f59e0b" />
            <Stat label="تأیید نهایی" value={w.done} color="#22c55e" />
            <Stat label="تحلیل کوتاه امروز" value={w.brief_today} color="#10b981" />
          </div>
          <DrillButton path={w.drilldown} navigate={navigate} theme={theme} />
        </div>
      );
    }
    if (id === "strategy_outputs") {
      return (
        <div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10 }}>
            <Stat label="پیش‌نویس" value={w.draft} />
            <Stat label="منتشرشده" value={w.published} color="#22c55e" />
            <Stat label="حواشی امروز" value={w.annotations_today} color={theme.accent} />
          </div>
          <DrillButton path={w.drilldown} navigate={navigate} theme={theme} />
        </div>
      );
    }
    if (id === "staff_activity") {
      const rows = Array.isArray(w.rows) ? w.rows : [];
      return (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.muted, textAlign: "right" }}>
                <th style={{ padding: "6px 4px" }}>کاربر</th>
                <th style={{ padding: "6px 4px" }}>نقش</th>
                <th style={{ padding: "6px 4px" }}>اقدام خبری امروز</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "8px 4px" }}>{r.name || r.username}</td>
                  <td style={{ padding: "8px 4px" }}>
                    {String(r.role || "").split(/[,\[\]"]+/).filter(Boolean).slice(0, 2).map(getRoleLabelFa).join("، ")}
                  </td>
                  <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.news_actions_today || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <div style={{ color: theme.muted, fontSize: 12 }}>فعالیتی ثبت نشده</div> : null}
          <div style={{ marginTop: 10 }}><DrillButton path={w.drilldown} navigate={navigate} theme={theme} /></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, direction: "rtl" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 14px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => navigate("/command")}
            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}
          >
            <ArrowRight size={16} style={{ verticalAlign: "middle" }} /> مرکز فرماندهی
          </button>
          <Gauge size={22} color={theme.accent} />
          <h1 style={{ margin: 0, fontSize: 20 }}>داشبورد KPI راهبردی</h1>
        </div>

        {error ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div> : null}
        {loading ? <div style={{ color: theme.muted }}>در حال بارگذاری…</div> : null}

        {order.map((id, idx) => {
          const def = WIDGET_DEFS.find((w) => w.id === id);
          return (
            <DashboardWidget
              key={id}
              title={def?.title || id}
              isOpen={!!open[id]}
              onToggle={() => toggle(id)}
              theme={theme}
              onMoveUp={idx > 0 ? () => move(id, "up") : null}
              onMoveDown={idx < order.length - 1 ? () => move(id, "down") : null}
            >
              {renderBody(id)}
            </DashboardWidget>
          );
        })}
      </div>
    </div>
  );
}

function DrillButton({ path, navigate, theme }) {
  if (!path) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: `1px solid ${theme.border}`,
        color: theme.text,
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
      }}
    >
      <ExternalLink size={13} /> جزئیات
    </button>
  );
}
