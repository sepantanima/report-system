import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

const STATUS_FA = { green: "مطلوب", yellow: "نیازمند توجه", red: "بحرانی", gray: "بدون فعالیت" };
const STATUS_COLOR = { green: "#22c55e", yellow: "#eab308", red: "#ef4444", gray: "#94a3b8" };

const SORTS = [
  { id: "activity_desc", label: "بیشترین فعالیت" },
  { id: "activity_asc", label: "کمترین فعالیت" },
  { id: "overdue_desc", label: "بیشترین تأخیر" },
  { id: "best", label: "بهترین عملکرد" },
];

function sortRows(rows, sortId) {
  const list = [...(rows || [])];
  const rank = { green: 0, yellow: 1, red: 2, gray: 3 };
  switch (sortId) {
    case "activity_asc":
      return list.sort((a, b) => (a.activity || 0) - (b.activity || 0));
    case "overdue_desc":
      return list.sort((a, b) => (b.tasks_overdue || 0) - (a.tasks_overdue || 0));
    case "best":
      return list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (b.activity || 0) - (a.activity || 0));
    case "activity_desc":
    default:
      return list.sort((a, b) => (b.activity || 0) - (a.activity || 0));
  }
}

export default function RolesPerformanceWidget({ roles = [], theme, returnTo = "/command" }) {
  const navigate = useNavigate();
  const [sortId, setSortId] = useState("activity_desc");
  const rows = useMemo(() => sortRows(roles, sortId), [roles, sortId]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSortId(s.id)}
            style={{
              border: `1px solid ${sortId === s.id ? theme.accent : theme.border}`,
              background: sortId === s.id ? `${theme.accent}22` : "transparent",
              color: theme.text,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: sortId === s.id ? 700 : 500,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 640 }}>
          <thead>
            <tr style={{ color: theme.muted, textAlign: "right" }}>
              <th style={{ padding: "6px 4px" }}>نقش</th>
              <th style={{ padding: "6px 4px" }}>کاربران</th>
              <th style={{ padding: "6px 4px" }}>فعال</th>
              <th style={{ padding: "6px 4px" }}>غیرفعال</th>
              <th style={{ padding: "6px 4px" }}>فعالیت</th>
              <th style={{ padding: "6px 4px" }}>انجام‌شده</th>
              <th style={{ padding: "6px 4px" }}>معوق</th>
              <th style={{ padding: "6px 4px" }}>وضعیت</th>
              <th style={{ padding: "6px 4px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 4px", fontWeight: 600 }}>{r.label}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.users ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.active ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.inactive ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.activity ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.tasks_done ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>{toPersianDigits(r.tasks_overdue ?? 0)}</td>
                <td style={{ padding: "8px 4px" }}>
                  <span style={{ color: STATUS_COLOR[r.status] || STATUS_COLOR.gray, fontWeight: 700 }}>
                    {STATUS_FA[r.status] || r.status}
                  </span>
                </td>
                <td style={{ padding: "8px 4px" }}>
                  {r.drilldown ? (
                    <button
                      type="button"
                      onClick={() => navigate(r.drilldown, { state: { returnTo } })}
                      style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer" }}
                    >
                      <ExternalLink size={13} />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <div style={{ color: theme.muted, fontSize: 12 }}>نقشی برای نمایش نیست</div> : null}
    </div>
  );
}
