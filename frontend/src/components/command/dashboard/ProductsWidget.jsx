import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { StatChart } from "../../StatChart.jsx";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";
import { useAppTheme } from "../../../context/ThemeContext.jsx";

export default function ProductsWidget({ products, theme, returnTo = "/command" }) {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const [view, setView] = useState("donut");
  const items = products?.items || [];
  const chart = (products?.chart || []).filter((x) => (x.value ?? 0) > 0);

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setView(id)}
      style={{
        border: `1px solid ${view === id ? theme.accent : theme.border}`,
        background: view === id ? `${theme.accent}22` : "transparent",
        color: theme.text,
        borderRadius: 8,
        padding: "4px 10px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: view === id ? 700 : 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {tabBtn("donut", "دوناتی")}
        {tabBtn("bar", "ستونی")}
        {tabBtn("table", "جدول")}
      </div>

      {(view === "donut" || view === "bar") && chart.length ? (
        <StatChart
          data={chart}
          title="محصولات سامانه"
          isDarkMode={isDarkMode}
          defaultChartType={view === "donut" ? "pie" : "verticalBar"}
          defaultInnerRadius={view === "donut" ? 55 : 0}
          compactHeader
        />
      ) : null}

      {(view === "table" || !chart.length) && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: view === "table" ? 0 : 12 }}>
          <thead>
            <tr style={{ color: theme.muted, textAlign: "right" }}>
              <th style={{ padding: "6px 4px" }}>نوع</th>
              <th style={{ padding: "6px 4px" }}>تعداد</th>
              <th style={{ padding: "6px 4px" }} />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 4px" }}>{row.label}</td>
                <td style={{ padding: "8px 4px", fontWeight: 700 }}>
                  {row.value == null ? "—" : toPersianDigits(row.value)}
                </td>
                <td style={{ padding: "8px 4px" }}>
                  {row.drilldown ? (
                    <button
                      type="button"
                      onClick={() => navigate(row.drilldown, { state: { returnTo } })}
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
      )}

      {!items.length ? <div style={{ color: theme.muted, fontSize: 12 }}>محصولی در این بازه نیست</div> : null}
    </div>
  );
}
