import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const PERIOD_FIELD_HEIGHT = 50;

function parseValue(value, allowEndOfDay) {
  if (allowEndOfDay && value === "24:00") return { hour: 24, minute: 0 };
  const [h = "00", m = "00"] = String(value || "00:00").split(":");
  return { hour: parseInt(h, 10) || 0, minute: parseInt(m, 10) || 0 };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function SpinCell({ value, min, max, onChange, disabled, theme, fieldHeight }) {
  const step = (delta) => {
    if (disabled) return;
    let next = value + delta;
    if (next > max) next = min;
    if (next < min) next = max;
    onChange(next);
  };

  const btn = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    width: 22,
    height: 12,
    border: "none",
    background: "transparent",
    color: theme.muted || "#94a3b8",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    flexShrink: 0,
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      border: `1px solid ${theme.border}`,
      borderRadius: 8,
      background: theme.input || theme.inputBg || theme.card,
      minWidth: 44,
      height: fieldHeight,
      boxSizing: "border-box",
    }}
    >
      <button type="button" style={btn} onClick={() => step(1)} disabled={disabled} tabIndex={-1}>
        <ChevronUp size={11} />
      </button>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        color: theme.text,
        minWidth: 28,
        textAlign: "center",
      }}
      >
        {pad2(value)}
      </div>
      <button type="button" style={btn} onClick={() => step(-1)} disabled={disabled} tabIndex={-1}>
        <ChevronDown size={11} />
      </button>
    </div>
  );
}

export default function TimeSpin24({
  value, onChange, allowEndOfDay = false, theme = {}, fieldHeight = PERIOD_FIELD_HEIGHT,
}) {
  const { hour, minute } = parseValue(value, allowEndOfDay);
  const isEndOfDay = hour === 24;
  const maxHour = allowEndOfDay ? 24 : 23;

  const emit = (h, m) => {
    if (h === 24) onChange("24:00");
    else onChange(`${pad2(h)}:${pad2(m)}`);
  };

  return (
    <div style={{
      display: "flex",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
      direction: "ltr",
      height: fieldHeight,
    }}
    >
      <SpinCell
        value={hour}
        min={0}
        max={maxHour}
        onChange={(h) => emit(h, isEndOfDay ? 0 : minute)}
        theme={theme}
        fieldHeight={fieldHeight}
      />
      <span style={{ opacity: 0.5, fontWeight: 700, lineHeight: 1 }}>:</span>
      <SpinCell
        value={minute}
        min={0}
        max={59}
        onChange={(m) => emit(hour, m)}
        disabled={isEndOfDay}
        theme={theme}
        fieldHeight={fieldHeight}
      />
    </div>
  );
}
