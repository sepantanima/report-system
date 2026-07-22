import React from "react";

/** پنل شخصی‌سازی: نمایش/مخفی ویجت‌ها */
export default function WidgetPersonalizePanel({ widgetDefs, visible, setWidgetVisible, theme, onClose }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>شخصی‌سازی ویجت‌ها</strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text,
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
          }}
        >
          بستن
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {widgetDefs.map((w) => {
          const on = visible[w.id] !== false;
          return (
            <label
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                padding: "6px 8px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setWidgetVisible(w.id, e.target.checked)}
              />
              {w.title}
            </label>
          );
        })}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: theme.muted }}>
        چیدمان در سرور ذخیره می‌شود (پس از اجرای migration 060). جابه‌جایی با دکمه‌های بالا/پایین هر ویجت.
      </p>
    </div>
  );
}
