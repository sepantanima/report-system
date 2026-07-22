import React from "react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

const BG = {
  green: "rgba(34,197,94,0.2)",
  yellow: "rgba(234,179,8,0.22)",
  red: "rgba(239,68,68,0.2)",
  gray: "rgba(148,163,184,0.15)",
};
const BORDER = { green: "#22c55e", yellow: "#eab308", red: "#ef4444", gray: "#94a3b8" };

/** نقشه حرارتی استانی (شبکه کارت — choropleth کامل در فاز بعد با GeoJSON) */
export default function ProvincesHeatWidget({ provinces = [], theme, onSelectProvince, selectedProvince = "" }) {
  if (!provinces.length) {
    return <div style={{ color: theme.muted, fontSize: 12 }}>استانی ثبت نشده</div>;
  }

  const selected = String(selectedProvince || "");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {provinces.map((p) => {
        const st = p.status || "gray";
        const isSel = selected && (String(p.id) === selected || String(p.name) === selected);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProvince?.(p.id)}
            style={{
              textAlign: "right",
              background: BG[st],
              border: `2px solid ${isSel ? theme.accent : BORDER[st]}`,
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              color: theme.text,
              boxShadow: isSel ? `0 0 0 2px ${theme.accent}33` : "none",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.7 }}>
              یگان: {toPersianDigits(p.units ?? 0)}
              <br />
              فعالیت: {toPersianDigits(p.activity ?? 0)}
              <br />
              سلامت: {p.health_score == null ? "—" : toPersianDigits(p.health_score)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
