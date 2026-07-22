import React from "react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

export default function AiPerformanceWidget({ ai, theme }) {
  if (!ai) {
    return <div style={{ color: theme.muted, fontSize: 12 }}>داده AI در دسترس نیست</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 14 }}>
        <Stat theme={theme} label="درخواست‌ها" value={ai.total_requests} />
        <Stat theme={theme} label="موفق" value={ai.success_count} color="#22c55e" />
        <Stat theme={theme} label="ناموفق" value={ai.fail_count} color="#ef4444" />
        <Stat
          theme={theme}
          label="نرخ موفقیت"
          value={ai.success_rate == null ? null : `${ai.success_rate}%`}
          color={theme.accent}
        />
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Usage / Prompt پرکاربرد</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: theme.muted, textAlign: "right" }}>
            <th style={{ padding: "6px 4px" }}>کلید</th>
            <th style={{ padding: "6px 4px" }}>تعداد</th>
          </tr>
        </thead>
        <tbody>
          {(ai.top_usage_keys || []).map((r) => (
            <tr key={r.key} style={{ borderTop: `1px solid ${theme.border}` }}>
              <td style={{ padding: "8px 4px", fontFamily: "monospace", fontSize: 11 }}>{r.key}</td>
              <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!(ai.top_usage_keys || []).length ? (
        <div style={{ color: theme.muted, fontSize: 12 }}>در این بازه اجرایی ثبت نشده</div>
      ) : null}
    </div>
  );
}

function Stat({ theme, label, value, color }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || theme.text }}>
        {value == null ? "—" : typeof value === "string" ? toPersianDigits(value) : toPersianDigits(value)}
      </div>
    </div>
  );
}
