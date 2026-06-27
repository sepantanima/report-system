import React from "react";
import { Loader2, Send } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const KIND_LABELS = { channel: "کانال", group: "گروه", chat: "چت" };

export function formatDestinationLabel(d) {
  if (!d) return "";
  const kind = KIND_LABELS[d.destination_kind] || d.destination_kind || "";
  const provider = d.provider_type ? ` · ${d.provider_type}` : "";
  return `${d.title_fa}${provider}${kind ? ` (${kind})` : ""}`;
}

export default function NewsReportDestinationBar({
  destinations,
  destinationId,
  onDestinationChange,
  theme,
  showBulkSend = false,
  bulkCount = 0,
  bulkSending = false,
  onBulkSend,
  compact = false,
}) {
  const inp = {
    width: "100%",
    padding: compact ? 8 : 10,
    borderRadius: 8,
    background: theme.card,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 13,
  };

  return (
    <div style={{
      padding: compact ? "10px 12px" : "12px 14px",
      borderRadius: 10,
      border: `1px solid ${theme.border}`,
      background: theme.isDarkMode ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.05)",
      marginBottom: 12,
    }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
        مقصد انتشار در پیام‌رسان
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <label style={{ display: "block", fontSize: 11, color: theme.muted, marginBottom: 4 }}>
            کانال / گروه
          </label>
          <select
            style={inp}
            value={destinationId}
            onChange={(e) => onDestinationChange(e.target.value)}
          >
            {destinations.length === 0 && (
              <option value="">مقصدی تعریف نشده — از مدیریت پیام‌رسان تنظیم کنید</option>
            )}
            {destinations.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {formatDestinationLabel(d)}
              </option>
            ))}
          </select>
        </div>
        {showBulkSend && (
          <button
            type="button"
            disabled={!destinationId || bulkCount === 0 || bulkSending}
            onClick={onBulkSend}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: !destinationId || bulkCount === 0 ? theme.border : "#22c55e",
              color: !destinationId || bulkCount === 0 ? theme.muted : "#fff",
              cursor: !destinationId || bulkCount === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            {bulkSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            ارسال انتخاب‌شده‌ها ({toPersianDigits(bulkCount)})
          </button>
        )}
      </div>
    </div>
  );
}
