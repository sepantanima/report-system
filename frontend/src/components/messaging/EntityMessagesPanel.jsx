import React, { useEffect, useState } from "react";
import messageService from "../../services/messageService.js";
import { formatMessageDateTime } from "../../utils/messageDateUtils.js";

export default function EntityMessagesPanel({ entityType, entityId, theme, canCompose, onCompose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const data = await messageService.entityMessages(entityType, entityId);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      for (const m of list) {
        if (!m.read_at) {
          messageService.markRead(m.id).catch(() => {});
        }
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entityType, entityId]);

  const t = theme || { border: "#334155", text: "#e2e8f0", card: "#1e293b" };

  return (
    <div style={{ marginTop: 12, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, background: t.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>پیام‌ها و ابلاغ‌های مرتبط</strong>
        {canCompose && onCompose ? (
          <button type="button" onClick={onCompose} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
            + پیام/ابلاغ
          </button>
        ) : null}
      </div>
      {loading ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>بارگذاری…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>پیامی ثبت نشده</div>
      ) : (
        rows.map((m) => (
          <div key={m.id} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{m.title}</div>
            <div style={{ marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.body}</div>
            <div style={{ marginTop: 4, opacity: 0.65, fontSize: 11 }}>
              {m.sender_name}
              {m.created_at ? ` · ${formatMessageDateTime(m.created_at)}` : ""}
              {m.read_at ? " · خوانده شد" : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
