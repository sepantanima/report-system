import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clampText } from "../../utils/limitInput.js";
import { pxToEm } from "../../utils/pageFontSize.js";

export default function SearchableSourceSelect({
  value = "",
  onChange,
  options = [],
  theme,
  placeholder = "جستجو یا تایپ منبع...",
  disabled = false,
  maxLength = 80,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const boxRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const colors = useMemo(() => ({
    bg: theme?.inputBg || theme?.card || "#1e293b",
    border: theme?.border || "#334155",
    text: theme?.text || "#e2e8f0",
    dropdownBg: theme?.card || "#0f172a",
    activeBg: "rgba(56,189,248,0.12)",
    activeText: "#38bdf8",
  }), [theme]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const normalizedOptions = useMemo(() => {
    const list = options.map((o) => (typeof o === "string" ? o : o.label || o.value || "")).filter(Boolean);
    return [...new Set(list)];
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions.slice(0, 40);
    return normalizedOptions.filter((s) => s.toLowerCase().includes(q)).slice(0, 40);
  }, [normalizedOptions, query]);

  const commit = (next) => {
    const v = clampText(String(next ?? "").trim(), maxLength);
    setQuery(v);
    onChange?.(v);
  };

  const showCreateHint = query.trim() && !normalizedOptions.some(
    (s) => s.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: 8,
          border: `1px solid ${open ? "#38bdf8" : colors.border}`,
          background: colors.bg,
          overflow: "hidden",
        }}
      >
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(query);
              setOpen(false);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!boxRef.current?.contains(document.activeElement)) {
                commit(query);
                setOpen(false);
              }
            }, 120);
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: colors.text,
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: pxToEm(13),
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          style={{
            border: "none",
            background: "transparent",
            color: colors.text,
            padding: "0 10px",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            opacity: 0.7,
          }}
          tabIndex={-1}
        >
          <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>

      {open && !disabled ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            left: 0,
            zIndex: 120,
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.dropdownBg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {showCreateHint ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { commit(query); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "right",
                padding: "10px 12px",
                border: "none",
                borderBottom: `1px solid ${colors.border}`,
                background: "rgba(34,197,94,0.08)",
                color: "#22c55e",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: pxToEm(12),
              }}
            >
              + افزودن منبع جدید: «{query.trim()}»
            </button>
          ) : null}
          {filtered.length === 0 && !showCreateHint ? (
            <div style={{ padding: "12px", opacity: 0.6, fontSize: pxToEm(12) }}>منبعی یافت نشد — متن را تایپ کنید</div>
          ) : (
            filtered.map((src) => {
              const active = src === value;
              return (
                <button
                  key={src}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { commit(src); setOpen(false); }}
                  style={{
                    width: "100%",
                    textAlign: "right",
                    padding: "9px 12px",
                    border: "none",
                    borderBottom: `1px solid ${colors.border}`,
                    background: active ? colors.activeBg : "transparent",
                    color: active ? colors.activeText : colors.text,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: pxToEm(12),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{src}</span>
                  {active ? <Check size={14} /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
