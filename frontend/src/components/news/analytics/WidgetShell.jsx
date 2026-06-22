import React from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet, FileText, Printer, ArrowUp, ArrowDown } from "lucide-react";

export default function WidgetShell({
  id,
  title,
  open,
  onToggle,
  onMoveUp,
  onMoveDown,
  onExportExcel,
  onExportWord,
  onPrint,
  theme,
  children,
  loading,
  error,
}) {
  return (
    <div
      id={`widget-${id}`}
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          cursor: "pointer",
          borderBottom: open ? `1px solid ${theme.border}` : "none",
          flexWrap: "wrap",
        }}
        onClick={onToggle}
      >
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>{title}</h3>
        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {onMoveUp ? (
            <button type="button" title="بالا" onClick={onMoveUp} style={iconBtn(theme)}>
              <ArrowUp size={14} />
            </button>
          ) : null}
          {onMoveDown ? (
            <button type="button" title="پایین" onClick={onMoveDown} style={iconBtn(theme)}>
              <ArrowDown size={14} />
            </button>
          ) : null}
          {onExportExcel ? (
            <button type="button" title="Excel" onClick={onExportExcel} style={iconBtn(theme)}>
              <FileSpreadsheet size={14} />
            </button>
          ) : null}
          {onExportWord ? (
            <button type="button" title="Word" onClick={onExportWord} style={iconBtn(theme)}>
              <FileText size={14} />
            </button>
          ) : null}
          {onPrint ? (
            <button type="button" title="چاپ" onClick={onPrint} style={iconBtn(theme)}>
              <Printer size={14} />
            </button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div style={{ padding: 14 }} className="news-analytics-widget-body">
          {loading ? <p style={{ opacity: 0.6, fontSize: 13 }}>در حال بارگذاری...</p> : null}
          {error ? <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p> : null}
          {!loading && !error ? children : null}
        </div>
      ) : null}
    </div>
  );
}

function iconBtn(theme) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: "transparent",
    color: theme.text,
    cursor: "pointer",
  };
}
