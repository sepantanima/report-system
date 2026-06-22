import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Save, Trash2, FlaskConical } from "lucide-react";
import api from "../api/api";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";

const inp = {
  width: "100%",
  padding: 8,
  marginBottom: 12,
  borderRadius: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnGhost = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#e2e8f0",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnPrimary = {
  ...btnGhost,
  background: "#0ea5e9",
  border: "none",
  color: "#fff",
};

const emptyForm = () => ({
  title_fa: "",
  phrase: "",
  match_kind: "auto",
  remove_mode: "phrase",
  is_regex: false,
});

const REMOVE_MODE_LABELS = {
  phrase: "فقط عبارت",
  line: "کل خط",
};

export default function NewsCleanPatternManagement() {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const allowed = hasRole(roles, "admin");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/news-clean-patterns");
      setRows(res.data || []);
    } catch (e) {
      setErr(e.response?.data?.error || "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setModal("form");
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      title_fa: row.title_fa || "",
      phrase: row.phrase || "",
      match_kind: row.match_kind || "auto",
      remove_mode: row.remove_mode || "phrase",
      is_regex: !!row.is_regex,
    });
    setModal("form");
  };

  const saveForm = async () => {
    if (!form.phrase.trim()) {
      setErr("عبارت الزامی است");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      if (editId) {
        await api.put(`/admin/news-clean-patterns/${editId}`, form);
      } else {
        await api.post("/admin/news-clean-patterns", form);
      }
      setModal(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row) => {
    try {
      await api.put(`/admin/news-clean-patterns/${row.id}`, { is_enabled: !row.is_enabled });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "خطا در به‌روزرسانی");
    }
  };

  const removeRow = async (row) => {
    if (row.is_builtin) {
      setErr("الگوهای پیش‌فرض قابل حذف نیستند");
      return;
    }
    if (!window.confirm(`حذف «${row.phrase}»؟`)) return;
    try {
      await api.delete(`/admin/news-clean-patterns/${row.id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "خطا در حذف");
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post("/admin/news-clean-patterns/test", { text: testText });
      setTestResult(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || "خطا در آزمایش");
    } finally {
      setTesting(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, color: "#f87171" }}>
        دسترسی ندارید.
        <button type="button" style={{ ...btnGhost, marginTop: 12 }} onClick={() => navigate(-1)}>
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: "0 auto", color: "#e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button type="button" style={btnGhost} onClick={() => navigate(-1)}>
          <ArrowRight size={18} />
          بازگشت
        </button>
        <h1 style={{ margin: 0, fontSize: 20 }}>الگوهای پاکسازی خبر</h1>
        <button type="button" style={{ ...btnPrimary, marginRight: "auto" }} onClick={openCreate}>
          <Plus size={16} />
          افزودن عبارت
        </button>
      </div>

      {err && <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div>}

      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <FlaskConical size={18} />
          آزمایش پاکسازی
        </h2>
        <textarea
          style={{ ...inp, minHeight: 100, resize: "vertical" }}
          placeholder="متن نمونه خبر را اینجا بچسبانید..."
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
        />
        <button type="button" style={btnPrimary} onClick={runTest} disabled={testing}>
          {testing ? "در حال پردازش..." : "اجرای پاکسازی"}
        </button>
        {testResult && (
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}>
            <div><strong>بعد از پاکسازی:</strong></div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#1e293b", padding: 12, borderRadius: 8 }}>
              {testResult.after || "(خالی)"}
            </pre>
            {testResult.summary && (
              <div style={{ opacity: 0.85 }}>خلاصه: {testResult.summary}</div>
            )}
            {testResult.matched_patterns?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                الگوهای DB اعمال‌شده:{" "}
                {testResult.matched_patterns.map((p) => p.phrase).join("، ")}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155", textAlign: "right" }}>
              <th style={{ padding: 8 }}>عبارت</th>
              <th style={{ padding: 8 }}>عنوان</th>
              <th style={{ padding: 8 }}>حذف</th>
              <th style={{ padding: 8 }}>Regex</th>
              <th style={{ padding: 8 }}>فعال</th>
              <th style={{ padding: 8 }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 8 }}>{row.phrase}</td>
                <td style={{ padding: 8, opacity: 0.85 }}>{row.title_fa || "—"}</td>
                <td style={{ padding: 8, opacity: 0.75 }}>{REMOVE_MODE_LABELS[row.remove_mode] || REMOVE_MODE_LABELS.phrase}</td>
                <td style={{ padding: 8 }}>{row.is_regex ? "بله" : "—"}</td>
                <td style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!row.is_enabled}
                    onChange={() => toggleEnabled(row)}
                  />
                </td>
                <td style={{ padding: 8, display: "flex", gap: 8 }}>
                  <button type="button" style={btnGhost} onClick={() => openEdit(row)}>ویرایش</button>
                  {!row.is_builtin && (
                    <button type="button" style={{ ...btnGhost, color: "#f87171" }} onClick={() => removeRow(row)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal === "form" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 20, width: 460, maxWidth: "92vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px" }}>{editId ? "ویرایش عبارت" : "افزودن عبارت"}</h3>
            <label style={{ fontSize: 12, opacity: 0.8 }}>عنوان (اختیاری)</label>
            <input
              style={inp}
              value={form.title_fa}
              onChange={(e) => setForm((f) => ({ ...f, title_fa: e.target.value }))}
            />
            <label style={{ fontSize: 12, opacity: 0.8 }}>کلمه / جمله / دامنه / @کانال / Regex</label>
            <input
              style={inp}
              value={form.phrase}
              onChange={(e) => setForm((f) => ({ ...f, phrase: e.target.value }))}
              placeholder={form.is_regex ? "مثلاً قدس\\s*نیوز|@KhabarFuri" : "مثلاً قدس نیوز یا @KhabarFuri"}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!form.is_regex}
                onChange={(e) => setForm((f) => ({ ...f, is_regex: e.target.checked }))}
              />
              الگوی عبارت منظم (Regex) — متن را دقیقاً همان‌طور که وارد می‌کنید استفاده می‌شود
            </label>
            {!form.is_regex ? (
              <p style={{ fontSize: 11, opacity: 0.65, margin: "0 0 12px" }}>
                سامانه خودکار نوع تطبیق (عبارت، دامنه، هشتگ، ...) را تشخیص می‌دهد.
              </p>
            ) : null}
            <fieldset style={{ border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", margin: "0 0 12px" }}>
              <legend style={{ fontSize: 12, padding: "0 6px" }}>نحوهٔ حذف</legend>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="remove_mode"
                  checked={form.remove_mode === "phrase"}
                  onChange={() => setForm((f) => ({ ...f, remove_mode: "phrase" }))}
                />
                فقط خود عبارت / الگو پاک شود
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="remove_mode"
                  checked={form.remove_mode === "line"}
                  onChange={() => setForm((f) => ({ ...f, remove_mode: "line" }))}
                />
                کل خطی که این عبارت در آن باشد پاک شود
              </label>
            </fieldset>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnGhost} onClick={() => setModal(null)}>انصراف</button>
              <button type="button" style={btnPrimary} onClick={saveForm} disabled={saving}>
                <Save size={14} />
                {saving ? "ذخیره..." : "ذخیره"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
