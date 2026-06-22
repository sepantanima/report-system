import React from "react";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, ChevronsDownUp, ChevronsUpDown, RotateCcw } from "lucide-react";
import { dashboardStyles as s } from "../../theme/dashboardStyles.js";

export default function DashboardWidget({
  title,
  icon,
  isOpen,
  onToggle,
  theme,
  onMoveUp,
  onMoveDown,
  actions,
  children,
}) {
  return (
    <div style={{ ...s.widget, backgroundColor: theme.card, borderColor: theme.border }}>
      <div style={s.widgetHeader} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {icon}
          <strong style={{ fontSize: 11, color: theme.text }}>{title}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {actions}
          {onMoveUp ? (
            <button type="button" title="بالا" onClick={onMoveUp} style={s.widgetCtrlBtn(theme)}>
              <ArrowUp size={13} />
            </button>
          ) : null}
          {onMoveDown ? (
            <button type="button" title="پایین" onClick={onMoveDown} style={s.widgetCtrlBtn(theme)}>
              <ArrowDown size={13} />
            </button>
          ) : null}
          <span style={{ opacity: 0.7, display: "inline-flex" }}>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>
      {isOpen ? (
        <div style={{ ...s.widgetBody, borderTopColor: theme.border }}>{children}</div>
      ) : null}
    </div>
  );
}

export function DashboardWidgetToolbar({ onExpandAll, onCollapseAll, onReset, theme }) {
  const btn = (title, onClick, accent) => (
    <button type="button" title={title} onClick={onClick} style={s.widgetCtrlBtn(theme, accent)}>
      {title === "باز کردن همه" ? <ChevronsUpDown size={16} /> : title === "بستن همه" ? <ChevronsDownUp size={16} /> : <RotateCcw size={16} />}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
      {btn("باز کردن همه", onExpandAll)}
      {btn("بستن همه", onCollapseAll)}
      {btn("ریست چیدمان", onReset)}
    </div>
  );
}
