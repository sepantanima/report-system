import React from "react";
import { useNavigate } from "react-router-dom";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

const BG = {
  green: "rgba(34,197,94,0.18)",
  yellow: "rgba(234,179,8,0.2)",
  red: "rgba(239,68,68,0.18)",
  gray: "rgba(148,163,184,0.15)",
};
const BORDER = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#94a3b8",
};

export default function UnitsHeatMapWidget({ units = [], theme, onSelectUnit, returnTo = "/command" }) {
  const navigate = useNavigate();

  if (!units.length) {
    return <div style={{ color: theme.muted, fontSize: 12 }}>یگانی ثبت نشده</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, fontSize: 11, color: theme.muted }}>
        <span><span style={{ color: BORDER.green }}>■</span> مطلوب</span>
        <span><span style={{ color: BORDER.yellow }}>■</span> نیازمند توجه</span>
        <span><span style={{ color: BORDER.red }}>■</span> بحرانی</span>
        <span><span style={{ color: BORDER.gray }}>■</span> بدون فعالیت</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {units.map((u) => {
          const st = u.status || "gray";
          return (
            <button
              key={u.id}
              type="button"
              title={u.province || ""}
              onClick={() => {
                if (onSelectUnit) onSelectUnit(u.id);
                else if (u.drilldown) navigate(u.drilldown, { state: { returnTo } });
              }}
              style={{
                textAlign: "right",
                background: BG[st] || BG.gray,
                border: `1px solid ${BORDER[st] || BORDER.gray}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                color: theme.text,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.7 }}>
                کاربران: {toPersianDigits(u.users ?? 0)}
                <br />
                فعالیت: {toPersianDigits(u.activity ?? 0)}
                <br />
                رصد: {toPersianDigits(u.reports ?? 0)} · خبر: {toPersianDigits(u.news ?? 0)}
                <br />
                سلامت: {u.health_score == null ? "—" : toPersianDigits(u.health_score)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
