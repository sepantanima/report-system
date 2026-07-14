import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";

/**
 * Shared single-select combobox: portal dropdown, positioning, always-on search.
 */
export default function SearchableCombobox({
  options = [],
  value,
  onChange,
  getOptionValue = (o) => o.value,
  getOptionLabel = (o) => o.label,
  filterOptions,
  renderOption,
  placeholder = "انتخاب کنید",
  searchPlaceholder = "جستجو در گزینه‌ها...",
  emptySearchMessage = "نتیجه‌ای یافت نشد",
  emptyListMessage,
  disabled = false,
  inputStyle = {},
  labelStyle = {},
  label,
  required = false,
  isDarkMode: isDarkModeProp,
  allowClear = false,
  clearLabel,
}) {
  const { isDarkMode: appDark } = useAppTheme();
  const isDarkMode = isDarkModeProp ?? appDark;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const boxRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);

  const defaultFilter = useCallback((list, q) => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((o) => String(getOptionLabel(o)).toLowerCase().includes(query));
  }, [getOptionLabel]);

  const filter = filterOptions || defaultFilter;

  const filtered = useMemo(() => filter(options, search), [options, search, filter]);

  const selected = options.find((o) => String(getOptionValue(o)) === String(value));

  const colors = useMemo(() => ({
    bg: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "#334155" : "#cbd5e1",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    dropdownBg: isDarkMode ? "#0f172a" : "#ffffff",
    inputBg: isDarkMode ? "#1e293b" : "#f8fafc",
    activeBg: isDarkMode ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.1)",
    activeText: "#38bdf8",
  }), [isDarkMode]);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferH = 280;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxH = Math.max(140, Math.min(preferH, openUp ? spaceAbove - 4 : spaceBelow - 4));
    const top = openUp ? Math.max(margin, rect.top - maxH - 4) : rect.bottom + 4;
    setMenuStyle({
      position: "fixed",
      top,
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin)),
      width: rect.width,
      maxHeight: maxH,
      zIndex: 5000,
    });
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      setSearch("");
      return undefined;
    }
    updateMenuPosition();
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateMenuPosition]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  const triggerStyle = {
    width: "100%",
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 8,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: selected ? colors.text : colors.muted,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    textAlign: "right",
    fontFamily: "inherit",
    ...inputStyle,
  };

  const defaultRenderOption = (o, active) => (
    <span style={{ fontWeight: active ? 600 : 400 }}>{getOptionLabel(o)}</span>
  );

  const renderItem = renderOption || defaultRenderOption;

  if (options.length === 0 && emptyListMessage) {
    return (
      <div ref={boxRef} style={{ position: "relative" }}>
        {label && (
          <label style={labelStyle}>
            {label}
            {required ? " *" : ""}
          </label>
        )}
        <p style={{ fontSize: 11, color: colors.muted, margin: "6px 0 0", lineHeight: 1.6 }}>{emptyListMessage}</p>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={triggerStyle}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? getOptionLabel(selected) : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            opacity: 0.6,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle,
            background: colors.dropdownBg,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 32px 8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: 4 }}>
            {(allowClear || !required) && (
              <button
                type="button"
                onClick={() => pick("")}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: !value ? colors.activeBg : "transparent",
                  color: !value ? colors.activeText : colors.muted,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                {clearLabel || placeholder}
              </button>
            )}
            {filtered.map((o) => {
              const optValue = getOptionValue(o);
              const active = String(optValue) === String(value);
              return (
                <button
                  key={String(optValue)}
                  type="button"
                  onClick={() => pick(optValue)}
                  style={{
                    width: "100%",
                    textAlign: "right",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 6,
                    background: active ? colors.activeBg : "transparent",
                    color: active ? colors.activeText : colors.text,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 12,
                  }}
                >
                  {renderItem(o, active, colors)}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ fontSize: 11, color: colors.muted, textAlign: "center", padding: 12, margin: 0 }}>
                {emptySearchMessage}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
