import React, { useMemo } from "react";
import ThemedDatePicker from "../../analysis/ThemedDatePicker.jsx";
import { useAppTheme } from "../../../context/ThemeContext.jsx";
import {
  RANGE_PRESETS,
  rangeFromPreset,
  dateObjectsToGregorianRange,
  gregorianRangeToDateObjects,
  persian,
} from "./dashboardDateUtils.js";
import persian_fa from "react-date-object/locales/persian_fa";

const selectStyle = (theme) => ({
  background: theme.card,
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: "inherit",
  fontSize: 12,
  minWidth: 110,
});

export default function CommandFilterBar({
  filters,
  onChange,
  units = [],
  roles = [],
  provinces = [],
  theme,
}) {
  const { isDarkMode } = useAppTheme();
  const set = (patch) => onChange({ ...filters, ...patch });

  const dateRange = useMemo(
    () => gregorianRangeToDateObjects(filters.from, filters.to),
    [filters.from, filters.to],
  );

  const provinceOptions = useMemo(() => {
    if (provinces?.length) return provinces;
    const setP = new Set();
    (units || []).forEach((u) => {
      if (u.province) setP.add(u.province);
    });
    return [...setP].sort().map((p) => ({ id: p, label: p }));
  }, [provinces, units]);

  const filteredUnits = useMemo(() => {
    if (!filters.province) return units;
    return (units || []).filter((u) => u.province === filters.province);
  }, [units, filters.province]);

  const onPreset = (preset) => {
    if (preset === "custom") {
      set({ preset });
      return;
    }
    const r = rangeFromPreset(preset);
    set({ preset, from: r.from, to: r.to });
  };

  const onDateRangeChange = (vals) => {
    const r = dateObjectsToGregorianRange(vals);
    if (!r?.from) return;
    if (r.from === filters.from && r.to === filters.to) return;
    set({ preset: "custom", from: r.from, to: r.to });
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>بازه:</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {RANGE_PRESETS.map((p) => {
          const active = filters.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset(p.id)}
              style={{
                border: `1px solid ${active ? theme.accent : theme.border}`,
                background: active ? `${theme.accent}22` : "transparent",
                color: theme.text,
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: active ? 700 : 500,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ThemedDatePicker
          isDarkMode={isDarkMode}
          value={dateRange}
          onChange={onDateRangeChange}
          range
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-right"
          placeholder="بازه شمسی"
          style={{ width: 200 }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 8 }} />

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        استان
        <select
          value={filters.province || ""}
          onChange={(e) => set({ province: e.target.value, unit_id: "" })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          {provinceOptions.map((p) => (
            <option key={p.id || p} value={p.id || p}>
              {p.label || p}
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        یگان
        <select
          value={filters.unit_id || ""}
          onChange={(e) => set({ unit_id: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.id}
              {u.province ? ` — ${u.province}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        نقش
        <select
          value={filters.role || ""}
          onChange={(e) => set({ role: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          {(roles || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.label || r.id}
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        وضعیت فرآیند
        <select
          value={filters.process_status || ""}
          onChange={(e) => set({ process_status: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          <option value="pending">در انتظار</option>
          <option value="reviewed">در بررسی</option>
          <option value="finalized">نهایی</option>
          <option value="open_analysis">تحلیل باز</option>
        </select>
      </label>

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        نوع محصول
        <select
          value={filters.product_type || ""}
          onChange={(e) => set({ product_type: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          <option value="field">رصد</option>
          <option value="news">خبر</option>
          <option value="analysis">تحلیل</option>
          <option value="strategy">راهبردی</option>
        </select>
      </label>

      <label style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
        اهمیت
        <select
          value={filters.priority || ""}
          onChange={(e) => set({ priority: e.target.value })}
          style={selectStyle(theme)}
        >
          <option value="">همه</option>
          <option value="urgent">فوری</option>
          <option value="important">مهم</option>
          <option value="normal">عادی</option>
        </select>
      </label>
    </div>
  );
}
