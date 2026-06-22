import React, { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import MultiSelect from "../MultiSelect.jsx";
import {
  NEWS_PRIORITIES, NEWS_QUALITY, NEWS_REVIEW_STATES,
} from "../../constants/newsMonitorMeta.js";

export default function NewsEditModal({
  item,
  categoryOptions,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState({
    cleaned_text: "",
    review_state: "pending",
    priority: 3,
    quality: 3,
    status_note: "",
    is_duplicate: false,
    category_ids: [],
  });

  useEffect(() => {
    if (!item) return;
    setForm({
      cleaned_text: item.cleaned_text || item.raw_text || "",
      review_state: item.review_state || "pending",
      priority: Number(item.priority || 3),
      quality: Number(item.quality || 3),
      status_note: item.status_note || "",
      is_duplicate: !!item.is_duplicate,
      category_ids: (item.category_ids || item.categories?.map((c) => String(c.id)) || []).map(String),
    });
  }, [item]);

  if (!item) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 14,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 18,
          color: "#e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong>ویرایش خبر #{item.id}</strong>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, opacity: 0.75 }}>وضعیت</label>
            <select
              value={form.review_state}
              onChange={(e) => set("review_state", e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit" }}
            >
              {Object.entries(NEWS_REVIEW_STATES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, opacity: 0.75 }}>اولویت</label>
            <select value={form.priority} onChange={(e) => set("priority", parseInt(e.target.value, 10))} style={{ width: "100%", padding: 8, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit" }}>
              {Object.entries(NEWS_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, opacity: 0.75 }}>کیفیت</label>
            <select value={form.quality} onChange={(e) => set("quality", parseInt(e.target.value, 10))} style={{ width: "100%", padding: 8, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit" }}>
              {Object.entries(NEWS_QUALITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, opacity: 0.75 }}>دسته‌بندی</label>
          <MultiSelect
            options={categoryOptions}
            values={form.category_ids}
            onChange={(v) => set("category_ids", v)}
            placeholder="بدون دسته"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, opacity: 0.75 }}>یادداشت / دلیل (status_note)</label>
          <input
            value={form.status_note}
            onChange={(e) => set("status_note", e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_duplicate} onChange={(e) => set("is_duplicate", e.target.checked)} />
          خبر تکراری (خارج از چرخه پیش‌فرض)
        </label>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, opacity: 0.75 }}>متن پاک‌شده</label>
          <textarea
            value={form.cleaned_text}
            onChange={(e) => set("cleaned_text", e.target.value)}
            rows={10}
            style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", cursor: "pointer", fontFamily: "inherit" }}>
            انصراف
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave({
              ...form,
              category_ids: form.category_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite),
            })}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            <Save size={16} />
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </div>
      </div>
    </div>
  );
}
