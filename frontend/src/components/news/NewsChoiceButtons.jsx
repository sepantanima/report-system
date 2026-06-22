import { pxToEm } from "../../utils/pageFontSize.js";

export default function NewsChoiceButtons({
  options,
  value,
  onChange,
  theme,
  disabled = false,
  columns = 2,
}) {
  const entries = Array.isArray(options)
    ? options
    : Object.entries(options).map(([k, v]) => [k, v]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 6,
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
              padding: "10px 8px",
              borderRadius: 10,
              border: active ? `2px solid ${color}` : `1px solid ${theme.border}`,
              background: active ? `${color}20` : theme.card,
              color: active ? color : theme.text,
              fontWeight: active ? 700 : 500,
              fontSize: pxToEm(12),
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              minHeight: "2.6em",
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
