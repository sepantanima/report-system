import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus, ExternalLink, CircleHelp } from "lucide-react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";
import { KPI_HELP } from "./dashboardWidgetHelp.js";
import { StaleDataBanner, StaleBodyWrap } from "./WidgetHelpButton.jsx";

const STATUS_COLOR = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#94a3b8",
};

function Delta({ pct, theme }) {
  if (pct == null) {
    return <span style={{ color: theme.muted, fontSize: 11 }}>—</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  const color = flat ? theme.muted : up ? "#22c55e" : "#ef4444";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 3, color, fontSize: 11, fontWeight: 600 }}
      title={KPI_HELP._delta}
    >
      <Icon size={12} />
      {toPersianDigits(`${up ? "+" : ""}${pct}%`)}
    </span>
  );
}

export default function ExecutiveKpiBar({
  items = [],
  theme,
  loading,
  returnTo = "/command",
  wallMode = false,
  stale = false,
}) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const valueSize = wallMode ? 30 : 22;
  const labelSize = wallMode ? 13 : 11;
  const minCol = wallMode ? 180 : 140;

  if (loading && !items.length) {
    return (
      <div style={{ color: theme.muted, fontSize: 13, marginBottom: 16, padding: "12px 0" }}>
        در حال بارگذاری شاخص‌ها…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13, color: theme.text }}>شاخص‌های کلیدی</strong>
          {stale ? <StaleDataBanner theme={theme} /> : null}
        </div>
        {!wallMode ? (
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: showHelp ? "rgba(225,29,72,0.12)" : theme.card,
              border: `1px solid ${theme.border}`,
              color: theme.muted,
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11,
            }}
          >
            <CircleHelp size={14} /> راهنمای شاخص‌ها
          </button>
        ) : null}
      </div>

      {showHelp && !wallMode ? (
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            fontSize: 12,
            lineHeight: 1.75,
            color: theme.text,
          }}
        >
          <p style={{ margin: "0 0 8px", color: theme.muted }}>{KPI_HELP._intro}</p>
          <p style={{ margin: "0 0 10px", color: theme.muted }}>{KPI_HELP._delta}</p>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {(items || []).map((item) => (
              <li key={item.id} style={{ marginBottom: 6 }}>
                <strong>{item.label}: </strong>
                {KPI_HELP[item.id] || item.note || "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <StaleBodyWrap stale={stale} theme={theme}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${minCol}px, 1fr))`,
            gap: wallMode ? 14 : 10,
          }}
        >
          {(items || []).map((item) => {
            const color = STATUS_COLOR[item.status] || STATUS_COLOR.gray;
            const tip = KPI_HELP[item.id] || item.note || "";
            return (
              <div
                key={item.id}
                title={tip}
                style={{
                  minWidth: 0,
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRight: `3px solid ${color}`,
                  borderRadius: 12,
                  padding: wallMode ? "16px 18px" : "12px 14px",
                }}
              >
                <div style={{ fontSize: labelSize, color: theme.muted, marginBottom: 6, lineHeight: 1.4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: valueSize, fontWeight: 800, color: theme.text, marginBottom: 6 }}>
                  {item.value == null ? "—" : toPersianDigits(item.value)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <Delta pct={item.delta_pct} theme={theme} />
                  {item.drilldown && !wallMode ? (
                    <button
                      type="button"
                      title="جزئیات"
                      onClick={() => navigate(item.drilldown, { state: { returnTo } })}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: theme.muted,
                        cursor: "pointer",
                        padding: 2,
                        display: "inline-flex",
                      }}
                    >
                      <ExternalLink size={13} />
                    </button>
                  ) : null}
                </div>
                {item.note ? (
                  <div style={{ fontSize: 10, color: theme.muted, marginTop: 6, opacity: 0.85 }}>{item.note}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </StaleBodyWrap>
    </div>
  );
}
