import React from "react";
import ThemedDatePicker from "../../analysis/ThemedDatePicker.jsx";
import MultiSelect from "../../MultiSelect.jsx";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const RotateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export default function AnalyticsFilterBar({
  dateRange,
  onDateRangeChange,
  filters,
  setFilter,
  meta,
  theme,
  isDarkMode,
  showAdvanced,
  onToggleAdvanced,
  onApply,
  onReset,
  filterSummary,
}) {
  const categoryOptions = (meta?.categories || []).map((c) => ({ value: String(c.id), label: c.title_fa }));
  const sourceOptions = (meta?.sources || []).map((s) => ({ value: s, label: s }));
  const unitOptions = (meta?.units || []).map((u) => ({ value: String(u.unit_cd), label: u.unit_name }));

  const roleUsers = filters.role === "editor"
    ? meta?.usersByRole?.editor
    : filters.role === "chief"
      ? meta?.usersByRole?.chief
      : meta?.usersByRole?.monitor;

  const sel = {
    padding: "6px",
    borderRadius: "6px",
    border: `1px solid ${theme.border}`,
    width: "160px",
    fontSize: "11px",
    outline: "none",
    fontFamily: "inherit",
    background: theme.input || theme.card,
    color: theme.text,
  };

  return (
    <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${theme.border}`, marginBottom: 12, backgroundColor: theme.card }}>
      <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", background: "rgba(59, 130, 246, 0.08)", padding: "4px 10px", borderRadius: 8 }}>
          <CalendarIcon />
          <ThemedDatePicker
            isDarkMode={isDarkMode}
            value={dateRange}
            onChange={onDateRangeChange}
            range
            calendar={persian}
            locale={persian_fa}
            format="YYYY/MM/DD"
            calendarPosition="bottom-right"
            placeholder="انتخاب بازه زمانی"
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onToggleAdvanced}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
              color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              background: showAdvanced ? "#ef4444" : "#3b82f6",
            }}
          >
            <FilterIcon /> {showAdvanced ? "بستن فیلتر" : "فیلتر پیشرفته"}
          </button>

          <button
            type="button"
            onClick={onReset}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
              background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid #ef4444",
              cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            }}
          >
            <RotateIcon /> ریست فیلتر
          </button>

          <button
            type="button"
            onClick={onApply}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
              background: "#0ea5e9", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            }}
          >
            اعمال فیلتر
          </button>
        </div>
      </div>

      {showAdvanced ? (
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, padding: 12,
          background: "rgba(128,128,128,0.05)", borderRadius: 8,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>وضعیت خبر</label>
            <select value={filters.status || ""} onChange={(e) => setFilter("status", e.target.value)} style={sel}>
              <option value="">همه</option>
              {(meta?.statusOptions || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>اولویت / اهمیت</label>
            <select value={filters.priority || ""} onChange={(e) => setFilter("priority", e.target.value)} style={sel}>
              <option value="">همه</option>
              {(meta?.priorityOptions || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>کیفیت</label>
            <select value={filters.quality || ""} onChange={(e) => setFilter("quality", e.target.value)} style={sel}>
              <option value="">همه</option>
              {(meta?.qualityOptions || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>دسته‌بندی</label>
            <MultiSelect options={categoryOptions} values={filters.categories || []} onChange={(v) => setFilter("categories", v)} theme={theme} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>منبع</label>
            <MultiSelect options={sourceOptions} values={filters.sources || []} onChange={(v) => setFilter("sources", v)} theme={theme} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>واحد</label>
            <select value={filters.unit_cd || ""} onChange={(e) => setFilter("unit_cd", e.target.value)} style={sel}>
              <option value="">همه</option>
              {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>نقش کاربر</label>
            <select value={filters.role || ""} onChange={(e) => { setFilter("role", e.target.value); setFilter("user_id", ""); }} style={sel}>
              <option value="">همه</option>
              <option value="monitor">پایشگر</option>
              <option value="editor">دبیر</option>
              <option value="chief">سردبیر</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500 }}>نام کاربر</label>
            <select value={filters.user_id || ""} onChange={(e) => setFilter("user_id", e.target.value)} style={sel}>
              <option value="">همه</option>
              {(roleUsers || []).map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.username}</option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {filterSummary ? (
        <div style={{ marginTop: 12, textAlign: "center", fontWeight: "bold", color: "#3b82f6", fontSize: 12 }}>
          {filterSummary}
        </div>
      ) : null}
    </div>
  );
}
