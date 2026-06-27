import React, { useMemo } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import TimeSpin24 from "./TimeSpin24.jsx";
import {
  PERIOD_MODES,
  PRESET_SLOT_MODES,
  clampSlotIndex,
  getSlotsForMode,
  resolveActivePeriod,
  todayJalaliDate,
} from "./newsReportUtils.js";

const fieldLabel = { display: "block", fontSize: 11, marginBottom: 3, opacity: 0.85 };
const DATE_FORMAT = "YYYY/MM/DD";

export default function NewsReportPeriodFilters({ state, setState, theme }) {
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

  const isPreset = Boolean(PRESET_SLOT_MODES[state.mode]);
  const isManual = state.mode === "manual";
  const slots = isPreset ? getSlotsForMode(state.mode) : [];
  const activePeriod = resolveActivePeriod(state);
  const isDarkMode = theme.isDarkMode ?? true;

  const startDate = isManual ? state.fromDate : state.reportDate;
  const endDate = isManual ? state.toDate : state.reportDate;
  const startTime = isPreset ? activePeriod.fromTime : state.fromTime;
  const endTime = isPreset ? activePeriod.toTime : state.toTime;

  const datePickerProps = {
    calendar: persian,
    locale: persian_fa,
    format: DATE_FORMAT,
    isDarkMode,
  };

  const setStartDate = (d) => {
    if (isManual) setState((s) => ({ ...s, fromDate: d }));
    else setState((s) => ({ ...s, reportDate: d }));
  };

  const setEndDate = (d) => {
    if (isManual) setState((s) => ({ ...s, toDate: d }));
    else setState((s) => ({ ...s, reportDate: d }));
  };

  const onModeChange = (mode) => {
    setState((s) => {
      const next = { ...s, mode };
      if (PRESET_SLOT_MODES[mode]) {
        const maxIdx = getSlotsForMode(mode).length - 1;
        const prevIdx = PRESET_SLOT_MODES[s.mode] ? s.slotIndex : maxIdx;
        next.slotIndex = clampSlotIndex(mode, prevIdx ?? maxIdx);
      }
      if (mode === "manual" && (!s.fromDate || !s.toDate)) {
        const today = s.reportDate || todayJalaliDate();
        next.fromDate = s.fromDate || today;
        next.toDate = s.toDate || today;
      }
      return next;
    });
  };

  const gridStyle = {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))",
    alignItems: "end",
  };

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      padding: 12,
      background: theme.card,
    }}
    >
      <div style={gridStyle}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={fieldLabel}>نوع بازه گزارش</label>
          <select
            style={inp}
            value={state.mode}
            onChange={(e) => onModeChange(e.target.value)}
          >
            {PERIOD_MODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {isPreset && slots.length > 1 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={fieldLabel}>بازه ساعتی</label>
            <select
              style={inp}
              value={clampSlotIndex(state.mode, state.slotIndex)}
              onChange={(e) => setState((s) => ({ ...s, slotIndex: parseInt(e.target.value, 10) }))}
            >
              {slots.map((slot, idx) => (
                <option key={idx} value={idx}>{slot.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={fieldLabel}>{isManual ? "تاریخ شروع" : "تاریخ گزارش"}</label>
          <ThemedDatePicker
            value={startDate}
            onChange={setStartDate}
            {...datePickerProps}
          />
        </div>

        <div>
          <label style={fieldLabel}>ساعت شروع</label>
          {isPreset ? (
            <input style={{ ...inp, opacity: 0.75, cursor: "default" }} readOnly value={startTime} />
          ) : (
            <TimeSpin24
              value={startTime}
              onChange={(t) => setState((s) => ({ ...s, fromTime: t }))}
              theme={theme}
            />
          )}
        </div>

        <div>
          <label style={fieldLabel}>تاریخ پایان</label>
          {isManual ? (
            <ThemedDatePicker
              value={endDate}
              onChange={setEndDate}
              {...datePickerProps}
            />
          ) : (
            <ThemedDatePicker
              value={endDate || startDate}
              onChange={() => {}}
              disabled
              {...datePickerProps}
            />
          )}
        </div>

        <div>
          <label style={fieldLabel}>ساعت پایان</label>
          {isPreset ? (
            <input style={{ ...inp, opacity: 0.75, cursor: "default" }} readOnly value={endTime} />
          ) : (
            <TimeSpin24
              value={endTime}
              onChange={(t) => setState((s) => ({ ...s, toTime: t }))}
              allowEndOfDay
              theme={theme}
            />
          )}
        </div>
      </div>

      {isPreset && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
          بازه‌های {PRESET_SLOT_MODES[state.mode].label} از ساعت ۰۰:۰۰ تا ۲۴:۰۰ روز انتخاب‌شده تقسیم می‌شوند؛ تاریخ پیش‌فرض امروز است.
        </p>
      )}
      {state.mode === "same_day" && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
          تاریخ شروع و پایان یکسان است؛ ساعات را برای بازه دلخواه در همان روز تنظیم کنید.
        </p>
      )}
      {isManual && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
          بازه کامل: از تاریخ و ساعت شروع تا تاریخ و ساعت پایان (می‌تواند بین چند روز باشد).
        </p>
      )}
    </div>
  );
}
