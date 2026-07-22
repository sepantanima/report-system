import React, { useEffect, useRef, useState } from "react";

export function mergeDashboardData(prev, next) {
  if (!next) return prev;
  if (!prev) return next;
  const out = { ...prev };
  for (const [k, v] of Object.entries(next)) {
    if (v == null) continue;
    // ادغام KPI به‌صورت آیتم‌به‌آیتم؛ value=null نباید مقدار قبلی سالم را پاک کند
    if (k === "kpi_bar" && Array.isArray(v)) {
      const prevBar = Array.isArray(prev.kpi_bar) ? prev.kpi_bar : [];
      if (!prevBar.length) {
        out.kpi_bar = v;
        continue;
      }
      const byId = new Map(prevBar.map((x) => [x?.id, x]));
      out.kpi_bar = v.map((item) => {
        if (!item?.id) return item;
        const old = byId.get(item.id);
        if (!old) return item;
        if (item.value == null && old.value != null) {
          return { ...item, value: old.value, prev_value: old.prev_value ?? item.prev_value, delta_pct: old.delta_pct ?? item.delta_pct, status: item.status || old.status };
        }
        return { ...old, ...item };
      });
      continue;
    }
    if (k === "filter_options" && prev.filter_options) {
      out.filter_options = { ...prev.filter_options, ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** آیا دادهٔ لازم برای ویجت آمده؟ */
export function widgetDataReady(widgetId, data) {
  if (!data) return false;
  switch (widgetId) {
    case "processes":
      return Array.isArray(data.processes);
    case "products":
      return !!data.products;
    case "trends":
      return !!data.trends_summary;
    case "alerts":
      return Array.isArray(data.alerts);
    case "health":
      return !!data.health;
    case "roles":
      return Array.isArray(data.roles);
    case "units":
      return Array.isArray(data.units_heatmap);
    case "iran_map":
    case "provinces":
      return Array.isArray(data.provinces_heat);
    case "users":
      return !!data.users_leaderboard;
    case "ai":
      return !!data.ai_performance;
    default:
      return true;
  }
}

/** نوار پیشرفت لود داشبورد */
export function DashboardLoadProgress({ progress, label, theme, active }) {
  if (!active && Number(progress) >= 100) return null;
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.card,
      }}
      aria-live="polite"
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, fontSize: 12 }}>
        <span style={{ color: theme.muted }}>{label || "در حال بارگذاری داشبورد…"}</span>
        <strong style={{ color: theme.accent }}>{pct}٪</strong>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: theme.border, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${theme.accent}, #fb7185)`,
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}

export function WidgetBodySkeleton({ theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: i === 1 ? 18 : 12,
            width: i === 1 ? "40%" : `${70 - i * 10}%`,
            borderRadius: 6,
            background: theme.border,
            opacity: 0.55,
            animation: "commandPulse 1.2s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes commandPulse{0%,100%{opacity:.35}50%{opacity:.7}}`}</style>
    </div>
  );
}

/** Lazy mount بر اساس IntersectionObserver */
export function LazyWidgetBody({ active, theme, children }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!active) {
      setInView(false);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: "180px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  return (
    <div ref={ref} style={{ minHeight: active ? 48 : 0 }}>
      {!active ? null : inView ? children : <WidgetBodySkeleton theme={theme} />}
    </div>
  );
}
