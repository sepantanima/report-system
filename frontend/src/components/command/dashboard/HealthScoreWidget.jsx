import React from "react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

const STATUS_COLOR = { green: "#22c55e", yellow: "#eab308", red: "#ef4444", gray: "#94a3b8" };
const STATUS_FA = { green: "مطلوب", yellow: "نیازمند توجه", red: "بحرانی", gray: "نامشخص" };

export default function HealthScoreWidget({ health, theme }) {
  if (!health) {
    return <div style={{ color: theme.muted, fontSize: 12 }}>امتیاز سلامت در دسترس نیست</div>;
  }

  const score = health.system_score;
  const color = STATUS_COLOR[health.system_status] || STATUS_COLOR.gray;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          border: `4px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: theme.bg,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{score == null ? "—" : toPersianDigits(score)}</div>
        <div style={{ fontSize: 10, color: theme.muted }}>از ۱۰۰</div>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color }}>
          {STATUS_FA[health.system_status] || health.system_status}
        </div>
        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.8 }}>
          میانگین یگان‌ها: {health.units_avg == null ? "—" : toPersianDigits(health.units_avg)}
          <br />
          یگان فعال: {toPersianDigits(health.active_units ?? 0)} · بدون فعالیت:{" "}
          {toPersianDigits(health.idle_units ?? 0)}
          <br />
          مشارکت:{" "}
          {health.factors?.participation == null
            ? "—"
            : `${toPersianDigits(health.factors.participation)}٪`}
          {health.factors?.overdue != null
            ? ` · معوق: ${toPersianDigits(health.factors.overdue)}`
            : ""}
        </div>
      </div>
    </div>
  );
}
