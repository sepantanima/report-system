import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export default function MonitorSortBar({
  fields,
  sortConfig,
  onSortChange,
  theme,
  style,
  compact = false,
}) {
  const toggleDirection = () => {
    onSortChange({
      ...sortConfig,
      direction: sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const border = theme?.border || "rgba(255,255,255,0.1)";
  const text = theme?.text || "#f1f5f9";

  return (
    <div
      className="monitor-sort-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        flexWrap: "nowrap",
        width: "100%",
        ...style,
      }}
    >
      <span style={{ fontSize: compact ? 11 : 12, opacity: 0.75, color: text, whiteSpace: "nowrap", flexShrink: 0 }}>
        مرتب‌سازی:
      </span>
      <select
        className="v3-select-filter"
        value={sortConfig.field}
        onChange={(e) => onSortChange({ ...sortConfig, field: e.target.value })}
        style={{
          width: "auto",
          minWidth: compact ? 88 : 100,
          maxWidth: compact ? 120 : 140,
          padding: compact ? "4px 8px" : "5px 10px",
          fontSize: compact ? 11 : 12,
          flexShrink: 0,
        }}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={toggleDirection}
        className="v3-icon-btn-gentle"
        title={sortConfig.direction === "asc" ? "صعودی — کلیک برای نزولی" : "نزولی — کلیک برای صعودی"}
        style={{
          width: compact ? 32 : 34,
          height: compact ? 32 : 34,
          border: `1px solid ${border}`,
          color: theme?.accent || "#38bdf8",
          flexShrink: 0,
        }}
      >
        {sortConfig.direction === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
      </button>
      <span style={{ fontSize: compact ? 11 : 12, opacity: 0.75, color: text, whiteSpace: "nowrap", flexShrink: 0 }}>
        {sortConfig.direction === "asc" ? "صعودی" : "نزولی"}
      </span>
    </div>
  );
}
