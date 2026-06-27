import React, { useMemo } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import { jalaliStr } from "../newsReport/newsReportUtils.js";

const fieldLabel = { display: "block", fontSize: 11, marginBottom: 3, opacity: 0.85 };
const DATE_FORMAT = "YYYY/MM/DD";

export default function NewsSmartAnalysisPeriodFilters({ state, setState, theme, onChange }) {
  const inp = useMemo(() => ({
    width: "100%",
    padding: "7px 8px",
    borderRadius: 8,
    background: theme.input || "#1e293b",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    fontSize: 13,
  }), [theme]);

  const isDarkMode = theme.isDarkMode ?? true;
  const datePickerProps = {
    calendar: persian,
    locale: persian_fa,
    format: DATE_FORMAT,
    isDarkMode,
  };

  const wrapChange = (fn) => {
    onChange?.();
    setState(fn);
  };

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      padding: 12,
      background: theme.card,
      display: "grid",
      gap: 8,
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      alignItems: "end",
    }}
    >
      <div>
        <label style={fieldLabel}>تاریخ شروع</label>
        <ThemedDatePicker
          {...datePickerProps}
          value={state.fromDate}
          onChange={(d) => wrapChange((s) => ({ ...s, fromDate: d }))}
          style={inp}
        />
      </div>
      <div>
        <label style={fieldLabel}>تاریخ پایان</label>
        <ThemedDatePicker
          {...datePickerProps}
          value={state.toDate}
          onChange={(d) => wrapChange((s) => ({ ...s, toDate: d }))}
          style={inp}
        />
      </div>
      {jalaliStr(state.fromDate) && jalaliStr(state.toDate) && (
        <div style={{ gridColumn: "1 / -1", fontSize: 11, color: theme.muted }}>
          بازه: کل روزهای انتخاب‌شده (۰۰:۰۰ تا ۲۴:۰۰)
        </div>
      )}
    </div>
  );
}
