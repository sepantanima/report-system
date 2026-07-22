import React, { useMemo, useState } from "react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";
import { getRoleLabelFa } from "../../../utils/userRoles.js";

const TABS = [
  { id: "online", label: "آنلاین" },
  { id: "most_active", label: "فعال‌ترین" },
  { id: "least_active", label: "کم‌فعال" },
  { id: "most_delay", label: "بیشترین تأخیر" },
  { id: "most_analysis", label: "بیشترین تحلیل" },
];

export default function UsersActivityWidget({ leaderboard, theme, onSelectUser, onlineCount }) {
  const [tab, setTab] = useState("most_active");
  const rows = useMemo(() => leaderboard?.[tab] || [], [leaderboard, tab]);
  const onlineLabel =
    onlineCount != null || leaderboard?.online_count != null
      ? toPersianDigits(onlineCount ?? leaderboard.online_count)
      : null;

  return (
    <div>
      {onlineLabel != null ? (
        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>
          کاربران آنلاین (۱۵ دقیقه اخیر):{" "}
          <strong style={{ color: "#22c55e" }}>{onlineLabel}</strong>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              border: `1px solid ${tab === t.id ? theme.accent : theme.border}`,
              background: tab === t.id ? `${theme.accent}22` : "transparent",
              color: theme.text,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: tab === t.id ? 700 : 500,
            }}
          >
            {t.label}
            {t.id === "online" && onlineLabel != null ? ` (${onlineLabel})` : ""}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
          <thead>
            <tr style={{ color: theme.muted, textAlign: "right" }}>
              <th style={{ padding: "6px 4px" }}>کاربر</th>
              <th style={{ padding: "6px 4px" }}>نقش</th>
              <th style={{ padding: "6px 4px" }}>یگان</th>
              <th style={{ padding: "6px 4px" }}>فعالیت</th>
              <th style={{ padding: "6px 4px" }}>تحلیل</th>
              <th style={{ padding: "6px 4px" }}>معوق</th>
              <th style={{ padding: "6px 4px" }}>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                style={{ borderTop: `1px solid ${theme.border}`, cursor: onSelectUser ? "pointer" : "default" }}
                onClick={() => onSelectUser?.(r.id)}
              >
                <td style={{ padding: "8px 4px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "8px 4px" }}>
                  {String(r.role || "")
                    .split(/[,\[\]"]+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(getRoleLabelFa)
                    .join("، ") || "—"}
                </td>
                <td style={{ padding: "8px 4px" }}>{r.unit_name || "—"}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.activity ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.analyses_done ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.analyses_open ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>
                  {r.online ? (
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>آنلاین</span>
                  ) : (
                    <span style={{ color: theme.muted }}>آفلاین</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <div style={{ color: theme.muted, fontSize: 12 }}>
          {tab === "online" ? "کاربر آنلاینی نیست (پس از migration حضور و فعالیت کاربران)" : "کاربری نیست"}
        </div>
      ) : null}
    </div>
  );
}
