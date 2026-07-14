import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import MultiSelect from "../../components/MultiSelect.jsx";

function channelLabel(d) {
  return d.title_fa || d.label || d.name || `کانال ${d.id}`;
}

export default function MessengerChannelSendModal({
  open,
  onClose,
  title = "ارسال به پیام‌رسان",
  description,
  destinations = [],
  onSend,
  sending = false,
  theme,
  confirmLabel = "تأیید و ارسال",
}) {
  const [destIds, setDestIds] = useState([]);

  useEffect(() => {
    if (open) setDestIds([]);
  }, [open]);

  const options = useMemo(
    () => destinations.map((d) => ({ value: String(d.id), label: channelLabel(d) })),
    [destinations],
  );

  const selectedLabels = useMemo(
    () => options.filter((o) => destIds.includes(o.value)).map((o) => o.label),
    [options, destIds],
  );

  if (!open) return null;

  const handleSend = async () => {
    if (!destIds.length) return;
    await onSend(destIds.map((id) => parseInt(id, 10)));
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 500,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
    >
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 20,
        maxWidth: 440,
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 12, color: theme.muted }}>
            {description}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: theme.muted }}>کانال(های) مقصد</div>
          <MultiSelect
            options={options}
            values={destIds}
            onChange={setDestIds}
            placeholder="انتخاب کانال(ها)…"
            theme={theme}
          />
        </div>
        {selectedLabels.length > 0 && (
          <ul style={{ margin: "0 0 16px", paddingRight: 20, fontSize: 13, lineHeight: 1.7 }}>
            {selectedLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={sending} style={modalBtn(theme)}>
            انصراف
          </button>
          <button
            type="button"
            disabled={sending || !destIds.length}
            onClick={handleSend}
            style={{
              ...modalBtn(theme),
              background: "#22c55e",
              color: "#fff",
              border: "none",
              opacity: !destIds.length ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function modalBtn(theme) {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  };
}
