import React from "react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

/**
 * @param {{
 *   quota: { limit?: number, used?: number, remaining?: number|null, unlimited?: boolean, subject_to_limit?: boolean } | null,
 *   itemLabel?: string,
 *   isDarkMode?: boolean,
 * }} props
 */
export default function DailyQuotaBanner({ quota, itemLabel = "مورد", isDarkMode = true }) {
  if (!quota?.subject_to_limit) return null;

  if (quota.unlimited) {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 13,
          background: isDarkMode ? "rgba(56, 189, 248, 0.1)" : "rgba(14, 165, 233, 0.08)",
          border: `1px solid ${isDarkMode ? "rgba(56, 189, 248, 0.25)" : "rgba(14, 165, 233, 0.3)"}`,
          color: isDarkMode ? "#bae6fd" : "#0369a1",
        }}
      >
        ثبت روزانه بدون محدودیت است.
      </div>
    );
  }

  const used = quota.used ?? 0;
  const limit = quota.limit ?? 0;
  const remaining = quota.remaining ?? 0;
  const exhausted = remaining <= 0;

  let bg;
  let border;
  let color;
  if (exhausted) {
    bg = isDarkMode ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)";
    border = isDarkMode ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.3)";
    color = isDarkMode ? "#fca5a5" : "#b91c1c";
  } else if (remaining <= 2) {
    bg = isDarkMode ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)";
    border = isDarkMode ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.3)";
    color = isDarkMode ? "#fcd34d" : "#b45309";
  } else {
    bg = isDarkMode ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)";
    border = isDarkMode ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.25)";
    color = isDarkMode ? "#6ee7b7" : "#047857";
  }

  const text = exhausted
    ? `سقف ثبت امروز (${toPersianDigits(String(limit))} ${itemLabel}) تکمیل شده است.`
    : `امروز ${toPersianDigits(String(used))} از ${toPersianDigits(String(limit))} ${itemLabel} ثبت کرده‌اید — ${toPersianDigits(String(remaining))} ${itemLabel} باقی‌مانده`;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 13,
        background: bg,
        border: `1px solid ${border}`,
        color,
      }}
    >
      {text}
    </div>
  );
}

export function isQuotaExhausted(quota) {
  if (!quota?.subject_to_limit) return false;
  if (quota.unlimited) return false;
  return (quota.remaining ?? 0) <= 0;
}
