import React from "react";

export function toPersianChartDigits(val) {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** برچسب بیرون از بدنه نمودار حلقه‌ای */
export function renderPieExternalLabel(isDarkMode) {
  const fill = isDarkMode ? "#e2e8f0" : "#334155";
  return ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
    if (value == null || value === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = percent != null ? `${toPersianChartDigits(Math.round(percent * 100))}٪` : "";
    const text = `${name} (${toPersianChartDigits(value)}${pct ? ` · ${pct}` : ""})`;
    return (
      <text
        x={x}
        y={y}
        fill={fill}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
      >
        {text}
      </text>
    );
  };
}
