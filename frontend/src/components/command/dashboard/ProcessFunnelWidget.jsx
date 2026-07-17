import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";

export default function ProcessFunnelWidget({ processes = [], theme, returnTo = "/command" }) {
  const navigate = useNavigate();

  if (!processes?.length) {
    return <div style={{ color: theme.muted, fontSize: 12 }}>بدون داده فرآیند</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14,
      }}
    >
      {processes.map((proc) => (
        <div
          key={proc.id}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: 12,
            background: theme.bg,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>{proc.title}</strong>
            {proc.drilldown ? (
              <button
                type="button"
                onClick={() => navigate(proc.drilldown, { state: { returnTo } })}
                style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 2 }}
              >
                <ExternalLink size={13} />
              </button>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(proc.stages || []).map((st, idx) => (
              <div key={st.id}>
                {idx > 0 ? (
                  <div style={{ textAlign: "center", color: theme.muted, fontSize: 10, margin: "2px 0 6px" }}>↓</div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{st.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: theme.accent }}>
                    {st.count == null ? "—" : toPersianDigits(st.count)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
