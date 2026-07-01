import React, { useEffect, useState } from "react";
import messageService from "../../services/messageService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { formatMessageDateTime } from "../../utils/messageDateUtils.js";

export default function MessageReadStatusPanel({
  messageId,
  theme,
  data: dataProp,
  defaultOpen = false,
  showUnread = false,
}) {
  const [data, setData] = useState(dataProp || null);
  const [open, setOpen] = useState(defaultOpen);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (dataProp) {
      setData(dataProp);
      return undefined;
    }
    if (!messageId) return undefined;
    messageService.readStatus(messageId)
      .then(setData)
      .catch((e) => setErr(e.response?.data?.error || e.message));
    return undefined;
  }, [messageId, dataProp]);

  if (err) return <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>;
  if (!data) return <div style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری وضعیت مشاهده…</div>;

  const t = theme || { border: "#334155", text: "#e2e8f0" };

  return (
    <div style={{ marginTop: 12, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "none",
          background: "rgba(56,189,248,0.08)",
          color: t.text,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        مشاهده‌شده: {toPersianDigits(String(data.read_count))} از {toPersianDigits(String(data.total_recipients))}
        {open ? " ▲" : " ▼"}
      </button>
      {open ? (
        <div style={{ padding: 10, maxHeight: 260, overflow: "auto", fontSize: 12 }}>
          {data.readers?.length ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>خوانده‌اند:</div>
              <ul style={{ margin: "0 0 10px", paddingRight: 18 }}>
                {data.readers.map((r) => (
                  <li key={r.user_id} style={{ marginBottom: 4 }}>
                    {r.name || r.username} — {r.read_at ? formatMessageDateTime(r.read_at) : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div style={{ opacity: 0.7, marginBottom: 8 }}>هنوز کسی نخوانده است</div>
          )}
          {showUnread && data.unread_users?.length ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "#f59e0b" }}>نخوانده:</div>
              <ul style={{ margin: 0, paddingRight: 18 }}>
                {data.unread_users.map((r) => (
                  <li key={r.user_id} style={{ marginBottom: 4 }}>
                    {r.name || r.username}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
