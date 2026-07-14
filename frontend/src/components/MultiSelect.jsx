import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useAppTheme } from "../context/ThemeContext.jsx";
const DEFAULT_DARK = {
  bg: "#1e293b",
  border: "#334155",
  text: "#e2e8f0",
  dropdownBg: "#0f172a",
  inputBg: "#1e293b",
  chipBg: "rgba(14,165,233,0.18)",
  chipBorder: "rgba(14,165,233,0.45)",
  chipText: "#0284c7",
  activeBg: "rgba(14,165,233,0.12)",
  activeText: "#0284c7",
};

const DEFAULT_LIGHT = {
  bg: "#ffffff",
  border: "#cbd5e1",
  text: "#1e293b",
  dropdownBg: "#ffffff",
  inputBg: "#f8fafc",
  chipBg: "rgba(14,165,233,0.12)",
  chipBorder: "rgba(14,165,233,0.35)",
  chipText: "#0369a1",
  activeBg: "rgba(14,165,233,0.1)",
  activeText: "#0369a1",
};

export default function MultiSelect({
  options = [],
  values = [],
  onChange,
  placeholder = "انتخاب...",
  disabled = false,
  theme,
  onSearchChange,
  remoteSearch = false,
  searchPlaceholder = "جستجو...",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const boxRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const { isDarkMode: appIsDark } = useAppTheme();
  const colors = useMemo(() => {
    const isLight = theme ? theme.isDarkMode === false : !appIsDark;
    if (isLight) {
      if (theme) {
        return {
          bg: theme.card || DEFAULT_LIGHT.bg,
          border: theme.border || DEFAULT_LIGHT.border,
          text: theme.text || DEFAULT_LIGHT.text,
          dropdownBg: theme.card || DEFAULT_LIGHT.dropdownBg,
          inputBg: theme.bg || DEFAULT_LIGHT.inputBg,
          chipBg: DEFAULT_LIGHT.chipBg,
          chipBorder: DEFAULT_LIGHT.chipBorder,
          chipText: DEFAULT_LIGHT.chipText,
          activeBg: DEFAULT_LIGHT.activeBg,
          activeText: DEFAULT_LIGHT.activeText,
        };
      }
      return DEFAULT_LIGHT;
    }
    if (theme) {
      return {
        bg: theme.card || DEFAULT_DARK.bg,
        border: theme.border || DEFAULT_DARK.border,
        text: theme.text || DEFAULT_DARK.text,
        dropdownBg: theme.card || DEFAULT_DARK.dropdownBg,
        inputBg: theme.bg || DEFAULT_DARK.inputBg,
        chipBg: DEFAULT_DARK.chipBg,
        chipBorder: DEFAULT_DARK.chipBorder,
        chipText: "#7dd3fc",
        activeBg: DEFAULT_DARK.activeBg,
        activeText: "#7dd3fc",
      };
    }
    return appIsDark ? DEFAULT_DARK : DEFAULT_LIGHT;
  }, [theme, appIsDark]);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferH = 280;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxH = Math.max(120, Math.min(preferH, openUp ? spaceAbove - 4 : spaceBelow - 4));
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
      return undefined;
    }
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateMenuPosition]);
  const labelByValue = useMemo(() => {
    const m = new Map();
    options.forEach((o) => m.set(String(o.value), o.label));
    return m;
  }, [options]);

  const filtered = useMemo(() => {
    if (remoteSearch) return options;
    const q = search.trim();
    if (!q) return options;
    const ql = q.toLowerCase();
    return options.filter((o) => String(o.label).toLowerCase().includes(ql));
  }, [options, search, remoteSearch]);

  useEffect(() => {
    if (!onSearchChange) return undefined;
    const t = setTimeout(() => onSearchChange(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search, onSearchChange]);

  const toggle = (value) => {
    const v = String(value);
    const set = new Set(values.map(String));
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange([...set]);
  };

  return (
    <div ref={boxRef} className="multiselect-root" style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          color: colors.text,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          textAlign: "right",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
          {values.length ? (
            values.map((v) => (
              <span
                key={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: colors.chipBg,
                  border: `1px solid ${colors.chipBorder}`,
                  color: colors.chipText,
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 12,
                }}
              >
                {labelByValue.get(String(v)) ?? v}
                <X
                  size={12}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                />
              </span>
            ))
          ) : (
            <span style={{ opacity: 0.6, fontSize: 13 }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>

      {open && menuStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle,
            background: colors.dropdownBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              margin: 8,
              padding: "6px 10px",
              borderRadius: 8,
              background: colors.inputBg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          />
          <div style={{ overflowY: "auto", padding: "0 6px 8px", flex: 1, minHeight: 0 }}>
            {filtered.length ? (
              filtered.map((o) => {
                const checked = values.map(String).includes(String(o.value));
                return (
                  <label
                    key={o.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      color: checked ? colors.activeText : colors.text,
                      background: checked ? colors.activeBg : "transparent",
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                    {o.label}
                  </label>
                );
              })
            ) : (
              <div style={{ padding: 10, fontSize: 12, opacity: 0.6, textAlign: "center" }}>موردی یافت نشد</div>
            )}
          </div>
          {values.length ? (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                margin: 8,
                marginTop: 0,
                padding: "5px 8px",
                borderRadius: 8,
                background: "transparent",
                border: `1px solid ${colors.border}`,
                color: "#ef4444",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              پاک‌کردن انتخاب‌ها
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
