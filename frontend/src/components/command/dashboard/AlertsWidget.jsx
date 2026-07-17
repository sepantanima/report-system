import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ExternalLink, X } from "lucide-react";
import { toPersianDigits, formatPersianDateShort } from "../../../utils/analysisMonitorUtils.js";
import commandCenterService from "../../../services/commandCenterService.js";

const PRIORITY_FA = { high: "بالا", medium: "متوسط", low: "پایین" };
const PRIORITY_COLOR = { high: "#ef4444", medium: "#eab308", low: "#38bdf8" };
const STORAGE_KEY = "command-dashboard-dismissed-alerts";

function loadLocalDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function AlertsWidget({ alerts = [], theme, returnTo = "/command" }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(loadLocalDismissed);

  useEffect(() => {
    commandCenterService
      .listAlertAcks()
      .then((d) => {
        const ids = d?.items || [];
        if (ids.length) {
          setDismissed((prev) => [...new Set([...prev, ...ids])]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }, [dismissed]);

  const visible = useMemo(
    () => (alerts || []).filter((a) => !dismissed.includes(a.id)),
    [alerts, dismissed],
  );

  const dismiss = (id) => {
    setDismissed((p) => (p.includes(id) ? p : [...p, id]));
    commandCenterService.ackAlert(id).catch(() => {});
  };

  if (!visible.length) {
    return (
      <div style={{ color: theme.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Bell size={14} /> هشدار فعالی نیست
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visible.map((a) => (
        <div
          key={a.id}
          style={{
            border: `1px solid ${theme.border}`,
            borderRight: `3px solid ${PRIORITY_COLOR[a.priority] || PRIORITY_COLOR.medium}`,
            borderRadius: 10,
            padding: "10px 12px",
            background: theme.bg,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{a.title}</strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: PRIORITY_COLOR[a.priority] || theme.muted,
                    border: `1px solid ${PRIORITY_COLOR[a.priority] || theme.border}`,
                    borderRadius: 999,
                    padding: "1px 8px",
                  }}
                >
                  {PRIORITY_FA[a.priority] || a.priority}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>{a.message}</div>
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
                مسئول: {a.owner || "—"}
                {a.time ? ` · ${formatPersianDateShort(a.time)}` : ""}
                {` · ${a.status === "open" ? "باز" : a.status}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {a.drilldown ? (
                <button
                  type="button"
                  title="جزئیات"
                  onClick={() => navigate(a.drilldown, { state: { returnTo } })}
                  style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 2 }}
                >
                  <ExternalLink size={14} />
                </button>
              ) : null}
              <button
                type="button"
                title="رسیدگی شد"
                onClick={() => dismiss(a.id)}
                style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
