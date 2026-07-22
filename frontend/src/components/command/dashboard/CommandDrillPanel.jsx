import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ExternalLink } from "lucide-react";
import { toPersianDigits, formatPersianDateShort } from "../../../utils/analysisMonitorUtils.js";
import { getRoleLabelFa } from "../../../utils/userRoles.js";
import commandCenterService from "../../../services/commandCenterService.js";
import { filtersToApiParams } from "./dashboardDateUtils.js";

export default function CommandDrillPanel({ mode, id, filters, theme, returnTo = "/command", onClose, onSelectUser }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mode || !id) return;
    let cancelled = false;
    setLoading(true);
    const params = filtersToApiParams(filters);
    const req =
      mode === "unit"
        ? commandCenterService.dashboardDrillUnit(id, params)
        : commandCenterService.dashboardDrillUser(id, params);
    req
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, filters.from, filters.to]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        justifyContent: "flex-start",
        direction: "rtl",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          height: "100%",
          background: theme.card,
          color: theme.text,
          borderLeft: `1px solid ${theme.border}`,
          padding: 16,
          overflow: "auto",
          boxShadow: "0 0 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ fontSize: 15 }}>
            {mode === "unit" ? "جزئیات یگان" : "جزئیات کاربر"}
          </strong>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? <div style={{ color: theme.muted, fontSize: 12 }}>در حال بارگذاری…</div> : null}
        {error ? <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div> : null}

        {mode === "unit" && data?.unit ? (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{data.unit.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: theme.muted }}>
              {data.unit.province || "—"}
            </p>
            <StatRow theme={theme} label="کاربران" value={data.stats?.users} />
            <StatRow theme={theme} label="رصد بازه" value={data.stats?.reports} />
            <StatRow theme={theme} label="اقدام خبری" value={data.stats?.news_actions} />
            <StatRow theme={theme} label="تحلیل باز" value={data.stats?.open_analysis} />

            <div style={{ fontWeight: 700, fontSize: 12, margin: "16px 0 8px" }}>کاربران یگان</div>
            {(data.users || []).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectUser?.(u.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 6,
                  cursor: "pointer",
                  color: theme.text,
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                {u.name}
                <span style={{ color: theme.muted, marginRight: 8 }}>
                  {String(u.role || "")
                    .split(/[,\[\]"]+/)
                    .filter(Boolean)
                    .slice(0, 1)
                    .map(getRoleLabelFa)
                    .join("")}
                </span>
              </button>
            ))}
          </>
        ) : null}

        {mode === "user" && data?.user ? (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{data.user.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: theme.muted }}>
              {data.user.unit_name || "—"} ·{" "}
              {String(data.user.role || "")
                .split(/[,\[\]"]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(getRoleLabelFa)
                .join("، ")}
            </p>
            <StatRow theme={theme} label="اقدام خبری" value={data.stats?.news_actions} />
            <StatRow theme={theme} label="رصد" value={data.stats?.field_reports} />
            <StatRow theme={theme} label="تحلیل" value={data.stats?.analyses} />

            <div style={{ fontWeight: 700, fontSize: 12, margin: "16px 0 8px" }}>فعالیت اخیر</div>
            {(data.recent_activity || []).map((a, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  padding: "6px 0",
                  borderBottom: `1px solid ${theme.border}`,
                  color: theme.muted,
                }}
              >
                {formatPersianDateShort(a.at)} — {a.detail || a.kind}
              </div>
            ))}
          </>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {(data?.links || []).map((l) => (
            <button
              key={l.path}
              type="button"
              onClick={() => navigate(l.path, { state: { returnTo } })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                color: theme.text,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
              }}
            >
              <ExternalLink size={13} /> {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({ theme, label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
      <span style={{ color: theme.muted }}>{label}</span>
      <strong>{value == null ? "—" : toPersianDigits(value)}</strong>
    </div>
  );
}
