import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";
import { useChartContainerReady } from "../../../hooks/useChartContainerReady.js";
import commandCenterService from "../../../services/commandCenterService.js";
import { filtersToApiParams, formatGregorianAsJalali } from "./dashboardDateUtils.js";

const METRICS = [
  { id: "news", label: "اخبار", color: "#38bdf8" },
  { id: "field", label: "رصد", color: "#06b6d4" },
  { id: "news_finalized", label: "اخبار تأییدشده", color: "#22c55e" },
  { id: "analysis", label: "تحلیل", color: "#a855f7" },
  { id: "strategy", label: "راهبردی", color: "#e11d48" },
  { id: "ai", label: "AI", color: "#f59e0b" },
];

function mergeSeries(mapByMetric) {
  const keys = new Set();
  Object.values(mapByMetric).forEach((series) => {
    (series || []).forEach((p) => keys.add(p.name));
  });
  return [...keys].sort().map((key) => {
    const row = { name: key, label: key };
    for (const m of METRICS) {
      const hit = (mapByMetric[m.id] || []).find((p) => p.name === key);
      if (hit?.label) row.label = hit.label;
      else if (!String(key).includes("T")) row.label = formatGregorianAsJalali(key);
      row[m.id] = hit ? hit.value : 0;
    }
    return row;
  });
}

function grainBtn(theme, on, onClick, label) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${on ? theme.accent : theme.border}`,
        background: on ? `${theme.accent}18` : "transparent",
        color: theme.text,
        borderRadius: 8,
        padding: "4px 10px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: on ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

export default function TrendsWidget({ filters, theme, summary }) {
  const singleDay = filters?.from && filters.from === filters.to;
  const rangeDays = useMemo(() => {
    if (!filters?.from || !filters?.to) return 1;
    const a = new Date(`${filters.from}T00:00:00Z`).getTime();
    const b = new Date(`${filters.to}T00:00:00Z`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [filters?.from, filters?.to]);

  const hourAllowed = rangeDays <= 7;
  const [granularity, setGranularity] = useState(singleDay ? "hour" : "day");
  const [metricIds, setMetricIds] = useState(["news", "field"]);
  const [seriesMap, setSeriesMap] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chartData = useMemo(() => mergeSeries(seriesMap), [seriesMap]);
  const [containerRef, ready] = useChartContainerReady(
    `${chartData.length}-${metricIds.join(",")}-${granularity}`,
  );

  useEffect(() => {
    if (singleDay) setGranularity("hour");
    else if (!hourAllowed) setGranularity("day");
    else setGranularity((g) => (g === "hour" && !hourAllowed ? "day" : g === "hour" ? "hour" : "day"));
  }, [singleDay, hourAllowed, filters?.from, filters?.to]);

  useEffect(() => {
    let cancelled = false;
    const params = filtersToApiParams(filters);
    const grain = granularity === "hour" && hourAllowed ? "hour" : "day";
    setLoading(true);
    setError("");
    Promise.all(
      metricIds.map((metric) =>
        commandCenterService
          .dashboardTrends({ ...params, metric, granularity: grain })
          .then((d) => ({ metric, data: d })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const next = {};
        let primaryStats = null;
        for (const r of results) {
          next[r.metric] = r.data?.series || [];
          if (!primaryStats) primaryStats = r.data?.stats;
        }
        setSeriesMap(next);
        setStats(primaryStats);
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
  }, [
    filters.from,
    filters.to,
    filters.unit_id,
    filters.role,
    filters.province,
    metricIds.join("|"),
    granularity,
    hourAllowed,
  ]);

  const toggleMetric = (id) => {
    setMetricIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const displayStats = stats || summary?.news;
  const activeGrain = granularity === "hour" && hourAllowed ? "hour" : "day";

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: theme.muted }}>بازهٔ نمودار:</span>
        {grainBtn(theme, activeGrain === "day", () => setGranularity("day"), "روزانه")}
        {grainBtn(
          theme,
          activeGrain === "hour",
          () => hourAllowed && setGranularity("hour"),
          hourAllowed ? "ساعتی" : "ساعتی (حداکثر ۷ روز)",
        )}
        {singleDay ? (
          <span style={{ fontSize: 11, color: theme.muted }}>فیلتر یک‌روزه → پیش‌فرض ساعتی</span>
        ) : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {METRICS.map((m) => {
          const on = metricIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMetric(m.id)}
              style={{
                border: `1px solid ${on ? m.color : theme.border}`,
                background: on ? `${m.color}22` : "transparent",
                color: theme.text,
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: on ? 700 : 500,
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {displayStats ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, fontSize: 12 }}>
          <span style={{ color: theme.muted }}>
            میانگین: <strong style={{ color: theme.text }}>{toPersianDigits(displayStats.avg ?? 0)}</strong>
          </span>
          <span style={{ color: theme.muted }}>
            بیشترین: <strong style={{ color: theme.text }}>{toPersianDigits(displayStats.max ?? 0)}</strong>
          </span>
          <span style={{ color: theme.muted }}>
            کمترین: <strong style={{ color: theme.text }}>{toPersianDigits(displayStats.min ?? 0)}</strong>
          </span>
          <span style={{ color: theme.muted }}>
            رشد:{" "}
            <strong style={{ color: theme.text }}>
              {displayStats.growth_pct == null ? "—" : `${toPersianDigits(displayStats.growth_pct)}٪`}
            </strong>
          </span>
        </div>
      ) : null}

      {loading ? <div style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>در حال بارگذاری روند…</div> : null}
      {error ? <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{error}</div> : null}

      <div ref={containerRef} style={{ width: "100%", height: 280, minWidth: 0 }}>
        {ready && chartData.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis
                dataKey="label"
                tick={{ fill: theme.text, fontSize: 10 }}
                interval={activeGrain === "hour" ? Math.max(0, Math.floor(chartData.length / 12) - 1) : "preserveStartEnd"}
              />
              <YAxis tick={{ fill: theme.text, fontSize: 10 }} tickFormatter={(v) => toPersianDigits(v)} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
                formatter={(value, name) => [toPersianDigits(value), name]}
              />
              <Legend />
              {METRICS.filter((m) => metricIds.includes(m.id)).map((m) => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.id}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={activeGrain === "hour" && chartData.length <= 24}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          !loading && <div style={{ color: theme.muted, fontSize: 12 }}>داده‌ای برای نمودار نیست</div>
        )}
      </div>
    </div>
  );
}
