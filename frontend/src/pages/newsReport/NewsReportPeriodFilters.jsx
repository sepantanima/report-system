import React, { useMemo } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import SearchableOptionSelect from "../../components/analysis/SearchableOptionSelect.jsx";
import TimeSpin24, { PERIOD_FIELD_HEIGHT } from "./TimeSpin24.jsx";
import {
  PERIOD_MODES,
  PRESET_SLOT_MODES,
  clampSlotIndex,
  getSlotsForMode,
  resolveActivePeriod,
  todayJalaliDate,
  getCurrentPresetSlotIndex,
} from "./newsReportUtils.js";

const fieldLabel = { display: "block", fontSize: 11, marginBottom: 4, opacity: 0.85, lineHeight: 1.3 };
const subLabel = { display: "block", fontSize: 11, marginBottom: 4, opacity: 0.85, textAlign: "center", lineHeight: 1.3 };
const DATE_FORMAT = "YYYY/MM/DD";

function FieldCell({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <label style={fieldLabel}>{label}</label>
      <div style={{ minHeight: 38, display: "flex", alignItems: "center", width: "100%" }}>{children}</div>
    </div>
  );
}

function PeriodRangeSection({ title, dateNode, timeNode, theme }) {
  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 8,
      padding: 10,
      minWidth: 0,
    }}
    >
      <div style={{
        textAlign: "center",
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 10,
        color: theme.text,
      }}
      >
        {title}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
      }}
      >
        <span style={{ ...subLabel, color: theme.muted, marginBottom: 0 }}>تاریخ</span>
        <span style={{ ...subLabel, color: theme.muted, marginBottom: 0 }}>ساعت</span>
        <div style={{ minWidth: 0, height: PERIOD_FIELD_HEIGHT, display: "flex", alignItems: "center" }}>
          {dateNode}
        </div>
        <div style={{ height: PERIOD_FIELD_HEIGHT, display: "flex", alignItems: "center" }}>
          {timeNode}
        </div>
      </div>
    </div>
  );
}

export default function NewsReportPeriodFilters({ state, setState, theme, isMobile = false }) {
  const isDarkMode = theme.isDarkMode ?? false;

  const inp = useMemo(() => ({
    width: "100%",
    padding: "7px 8px",
    borderRadius: 8,
    background: theme.input || theme.inputBg || theme.card,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    fontSize: 13,
  }), [theme]);

  const datePickerWrap = useMemo(() => ({
    ...inp,
    display: "flex",
    alignItems: "center",
    height: PERIOD_FIELD_HEIGHT,
    minHeight: PERIOD_FIELD_HEIGHT,
    width: "100%",
    boxSizing: "border-box",
  }), [inp]);

  const readonlyTimeStyle = useMemo(() => ({
    ...inp,
    height: PERIOD_FIELD_HEIGHT,
    minHeight: PERIOD_FIELD_HEIGHT,
    minWidth: 100,
    opacity: 0.75,
    cursor: "default",
    boxSizing: "border-box",
  }), [inp]);

  const comboStyle = useMemo(() => ({
    width: "100%",
    fontSize: 13,
    fontFamily: "inherit",
  }), []);

  const isPreset = Boolean(PRESET_SLOT_MODES[state.mode]);
  const isManual = state.mode === "manual";
  const slots = isPreset ? getSlotsForMode(state.mode) : [];
  const activePeriod = resolveActivePeriod(state);

  const modeOptions = useMemo(
    () => PERIOD_MODES.map((p) => ({ value: p.value, label: p.label })),
    [],
  );

  const slotOptions = useMemo(
    () => slots.map((slot, idx) => ({ value: String(idx), label: slot.label })),
    [slots],
  );

  const showSlotSelect = isPreset && slots.length > 1;

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
        const prevIdx = PRESET_SLOT_MODES[s.mode]
          ? s.slotIndex
          : getCurrentPresetSlotIndex(mode);
        next.slotIndex = clampSlotIndex(mode, prevIdx ?? 0);
      }
      if (mode === "manual" && (!s.fromDate || !s.toDate)) {
        const today = s.reportDate || todayJalaliDate();
        next.fromDate = s.fromDate || today;
        next.toDate = s.toDate || today;
      }
      return next;
    });
  };

  const modeRowStyle = {
    display: "grid",
    gridTemplateColumns: showSlotSelect ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
    gap: 10,
    alignItems: "start",
  };

  const sectionsRowStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 12,
  };

  const startDateNode = (
    <div style={datePickerWrap}>
      <ThemedDatePicker
        value={startDate}
        onChange={setStartDate}
        {...datePickerProps}
      />
    </div>
  );

  const endDateNode = isManual ? (
    <div style={datePickerWrap}>
      <ThemedDatePicker
        value={endDate}
        onChange={setEndDate}
        {...datePickerProps}
      />
    </div>
  ) : (
    <div style={{ ...datePickerWrap, opacity: 0.75 }}>
      <ThemedDatePicker
        value={endDate || startDate}
        onChange={() => {}}
        disabled
        {...datePickerProps}
      />
    </div>
  );

  const startTimeNode = isPreset ? (
    <input style={readonlyTimeStyle} readOnly value={startTime} />
  ) : (
    <TimeSpin24
      value={startTime}
      onChange={(t) => setState((s) => ({ ...s, fromTime: t }))}
      theme={theme}
      fieldHeight={PERIOD_FIELD_HEIGHT}
    />
  );

  const endTimeNode = isPreset ? (
    <input style={readonlyTimeStyle} readOnly value={endTime} />
  ) : (
    <TimeSpin24
      value={endTime}
      onChange={(t) => setState((s) => ({ ...s, toTime: t }))}
      allowEndOfDay
      theme={theme}
      fieldHeight={PERIOD_FIELD_HEIGHT}
    />
  );

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      padding: 12,
      background: theme.card,
    }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={modeRowStyle}>
          <FieldCell label="نوع بازه گزارش">
            <SearchableOptionSelect
              options={modeOptions}
              value={state.mode}
              onChange={onModeChange}
              isDarkMode={isDarkMode}
              inputStyle={comboStyle}
            />
          </FieldCell>

          {showSlotSelect && (
            <FieldCell label="بازه ساعتی">
              <SearchableOptionSelect
                options={slotOptions}
                value={String(clampSlotIndex(state.mode, state.slotIndex))}
                onChange={(v) => setState((s) => ({ ...s, slotIndex: parseInt(v, 10) }))}
                isDarkMode={isDarkMode}
                inputStyle={comboStyle}
              />
            </FieldCell>
          )}
        </div>

        <div style={sectionsRowStyle}>
          <PeriodRangeSection
            title="شروع"
            dateNode={startDateNode}
            timeNode={startTimeNode}
            theme={theme}
          />
          <PeriodRangeSection
            title="پایان"
            dateNode={endDateNode}
            timeNode={endTimeNode}
            theme={theme}
          />
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
