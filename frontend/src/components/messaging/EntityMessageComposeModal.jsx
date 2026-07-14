import React, { useEffect, useState } from "react";
import messageService from "../../services/messageService.js";
import { MESSAGE_BODY_MAX, MESSAGE_TITLE_MAX, validateMessagePayload } from "../../constants/messageFieldLimits.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const ENTITY_AUDIENCE_TEXT = {
  field_report: "این پیام فقط برای ثبت‌کننده‌ی این گزارش (کاربر یگان مربوطه) قابل مشاهده است و در کارتابل پیام‌های او نمایش داده می‌شود.",
  news: "این پیام فقط برای ثبت‌کننده‌ی این خبر (پایشگر مربوطه) قابل مشاهده است و در کارتابل پیام‌های او نمایش داده می‌شود.",
};

export default function EntityMessageComposeModal({
  open,
  onClose,
  entityType,
  entityId,
  theme,
  onSent,
  showChannels = false,
}) {
  const [form, setForm] = useState({ title: "", body: "", priority: "order", channel_config_ids: [] });
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ title: "", body: "", priority: "order", channel_config_ids: [] });
    setErr("");
    if (showChannels) {
      messageService.alertDestinations().then(setChannels).catch(() => setChannels([]));
    } else {
      setChannels([]);
    }
  }, [open, showChannels]);

  if (!open) return null;

  const t = theme || { card: "#1e293b", border: "#334155", text: "#f1f5f9", input: "#0f172a" };
  const audienceText = ENTITY_AUDIENCE_TEXT[entityType] || "این پیام فقط برای ثبت‌کننده‌ی این مورد قابل مشاهده است.";

  const submit = async () => {
    const vErr = validateMessagePayload(form, { requireTitle: true });
    if (vErr) return setErr(vErr);
    setSaving(true);
    setErr("");
    try {
      await messageService.sendEntity({
        entity_type: entityType,
        entity_id: String(entityId),
        title: form.title,
        body: form.body,
        priority: form.priority,
        show_as_banner: false,
        channel_config_ids: form.channel_config_ids,
      });
      onSent?.();
      onClose?.();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (id) => {
    setForm((f) => ({
      ...f,
      channel_config_ids: f.channel_config_ids.includes(id)
        ? f.channel_config_ids.filter((x) => x !== id)
        : [...f.channel_config_ids, id],
    }));
  };

  return (
    <div className="v3-modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div className="v3-modal-box shadow-lg" style={{ background: t.card, border: `1px solid ${t.border}`, maxWidth: 480, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <div className="v3-modal-header-new">
          <span className="v3-modal-title">پیام / ابلاغ مرتبط</span>
        </div>
        <div className="v3-modal-body" style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.7, color: "#38bdf8", background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
            <span aria-hidden="true">👁️</span>
            <span>{audienceText}</span>
          </div>
          {err ? <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{err}</div> : null}
          <input
            placeholder="عنوان"
            maxLength={MESSAGE_TITLE_MAX}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <textarea
            placeholder="متن پیام"
            maxLength={MESSAGE_BODY_MAX}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            style={{ width: "100%", minHeight: 100, padding: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{toPersianDigits(String(form.body.length))} / {toPersianDigits(String(MESSAGE_BODY_MAX))}</div>
          {showChannels && channels.map((c) => (
            <label key={c.id} style={{ display: "flex", gap: 8, fontSize: 12, marginTop: 8 }}>
              <input type="checkbox" checked={form.channel_config_ids.includes(c.id)} onChange={() => toggleChannel(c.id)} />
              پیام‌رسان: {c.title_fa}
            </label>
          ))}
        </div>
        <div className="v3-modal-footer-new" style={{ gap: 8 }}>
          <button type="button" className="v3-btn-footer" onClick={onClose}>انصراف</button>
          <button type="button" className="v3-btn-footer v3-primary-solid" disabled={saving} onClick={submit}>ارسال</button>
        </div>
      </div>
    </div>
  );
}
