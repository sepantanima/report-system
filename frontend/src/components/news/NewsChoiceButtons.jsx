import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsChoiceButtons({
  options,
  value,
  onChange,
  theme,
  disabled = false,
  columns = 2,
  compact = false,
}) {
  const entries = Array.isArray(options)
    ? options
    : Object.entries(options).map(([k, v]) => [k, v]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: compact ? 5 : 6,
      }}
    >
      {entries.map(([k, meta]) => {
        const active = String(value) === String(k);
        const color = meta.color || theme.accent;
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(typeof value === "number" ? parseInt(k, 10) : k)}
            style={{
              padding: compact ? "9px 6px" : "10px 8px",
              borderRadius: 10,
              border: active
                ? `2px solid ${color}`
                : (theme.isDarkMode !== false
                  ? "1px solid rgba(148,163,184,0.45)"
                  : "1px solid rgba(100,116,139,0.4)"),
              background: active
                ? `${color}20`
                : (theme.isDarkMode !== false ? "rgba(30,41,59,0.85)" : "#fff"),
              color: active ? color : theme.text,
              fontWeight: active ? 700 : 500,
              fontSize: pxToEm(compact ? 11 : 12),
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              minHeight: compact ? "2.5em" : "2.6em",
              opacity: disabled ? 0.55 : 1,
              boxShadow: active ? `0 0 0 1px ${color}33` : "none",
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
