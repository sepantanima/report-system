import React from "react";
import { X, History } from "lucide-react";
import { TOPIC_STATUS_META, formatPersianDateShort } from "../../utils/analysisMonitorUtils.js";

export default function TopicHistoryModal({ open, onClose, topic, history = [], theme, isDarkMode }) {
  if (!open || !topic) return null;

  const panelBg = isDarkMode ? "rgba(0,0,0,0.25)" : "#f8fafc";

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <div className="v3-modal-box" style={{ background: theme.card, border: `1px solid ${theme.border}`, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="v3-modal-header-new">
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={18} /></button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><History size={16} /> تاریخچه موضوع</span>
        </div>
        <div className="v3-modal-body">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: theme.accent || "#38bdf8", marginBottom: 4 }}>{topic.topic_code}</div>
            <strong style={{ fontSize: 13 }}>{topic.title}</strong>
          </div>

          {history.length === 0 && (
            <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", padding: "20px 0" }}>تاریخچه‌ای ثبت نشده</p>
          )}

          {history.map((h) => {
            const newMeta = TOPIC_STATUS_META[h.new_status] || { label: h.new_status, color: "#94a3b8" };
            const oldLabel = h.old_status ? (TOPIC_STATUS_META[h.old_status]?.label || h.old_status) : "—";
            return (
              <div
                key={h.id}
                style={{
                  fontSize: 11,
                  padding: "10px 12px",
                  marginBottom: 8,
                  borderRadius: 10,
                  background: panelBg,
                  border: `1px solid ${theme.border}`,
                  lineHeight: 1.7,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span>{oldLabel} → <span style={{ color: newMeta.color, fontWeight: 600 }}>{newMeta.label}</span></span>
                  <span style={{ opacity: 0.65, fontSize: 10 }}>{formatPersianDateShort(h.created_at)}</span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>توسط: {h.changed_by_name || "—"}</div>
                {h.comment && (
                  <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: isDarkMode ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b", fontSize: 11 }}>
                    {h.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="v3-modal-footer-new">
          <button type="button" className="v3-btn-footer v3-primary-solid" onClick={onClose}>بستن</button>
        </div>
      </div>
    </div>
  );
}
