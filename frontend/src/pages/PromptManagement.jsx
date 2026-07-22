import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import api from "../api/api";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import { PROMPT_FIELD_LIMITS, validatePromptCreateClient } from "../constants/promptFieldLimits.js";
import { PROMPT_LIST_PREFIX_CHOICES } from "../constants/promptListPrefixes.js";
import { clampText } from "../utils/limitInput.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";

function CharCounter({ value, max }) {
  const n = value != null ? String(value).length : 0;
  return (
    <span style={{ fontSize: 12, opacity: 0.85 }}>
      {n}/{max}
    </span>
  );
}

function getPromptStyles(theme, isDarkMode) {
  const inp = {
    width: "100%",
    padding: 8,
    marginBottom: 12,
    borderRadius: 6,
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const btnGhost = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: isDarkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const btnPrimary = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    cursor: "pointer",
    background: "#0ea5e9",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontFamily: "inherit",
  };

  const panel = {
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 13,
  };

  const code = {
    fontSize: 12,
    background: isDarkMode ? "rgba(0,0,0,0.25)" : "#e2e8f0",
    color: theme.text,
    padding: "2px 6px",
    borderRadius: 4,
  };

  return { inp, btnGhost, btnPrimary, panel, code };
}

const emptyCreateForm = () => ({ prompt_key: "", title_fa: "", body: "" });

export default function PromptManagement() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = getFormPageTheme(isDarkMode);
  const styles = useMemo(() => getPromptStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { inp, btnGhost, btnPrimary, panel, code } = styles;
  const roles = getSessionRoles();
  const allowed = hasRole(roles, "admin");

  const [prefix, setPrefix] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  /** null | 'create' | 'edit' */
  const [modal, setModal] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [form, setForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);

  const [formActions, setFormActions] = useState([]);
  const [metaSelection, setMetaSelection] = useState("");
  const [varMeta, setVarMeta] = useState(null);
  const [varMetaErr, setVarMetaErr] = useState("");
  const [varMetaLoading, setVarMetaLoading] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/prompts", { params: { prefix: prefix || undefined } });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [allowed, prefix]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/admin/prompts/meta/form-actions");
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setFormActions(list);
        if (!metaSelection && list.length) {
          const first = list[0];
          const a0 = first?.actions?.[0];
          if (first?.form_name && a0) setMetaSelection(`${first.form_name}|${a0}`);
        }
      } catch {
        if (!cancelled) setFormActions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed || !metaSelection) {
      setVarMeta(null);
      return;
    }
    const [form_name, action_name] = metaSelection.split("|");
    if (!form_name || !action_name) return;
    let cancelled = false;
    setVarMetaLoading(true);
    setVarMetaErr("");
    api
      .get("/admin/prompts/meta/variables", { params: { form_name, action_name } })
      .then((res) => {
        if (!cancelled) setVarMeta(res.data);
      })
      .catch((e) => {
        if (!cancelled) setVarMetaErr(e.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setVarMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, metaSelection]);

  const metaOptions = useMemo(() => {
    const out = [];
    for (const entry of formActions) {
      const fn = entry?.form_name;
      const actions = Array.isArray(entry?.actions) ? entry.actions : [];
      for (const an of actions) {
        if (fn && an) out.push({ value: `${fn}|${an}`, label: `${fn} — ${an}` });
      }
    }
    return out;
  }, [formActions]);

  const openCreate = () => {
    setErr("");
    setEditKey(null);
    setForm(emptyCreateForm());
    setModal("create");
  };

  const openEdit = async (key) => {
    setErr("");
    try {
      const res = await api.get(`/admin/prompts/${encodeURIComponent(key)}`);
      const p = res.data;
      setForm({
        prompt_key: p.prompt_key || "",
        title_fa: p.title_fa || "",
        body: p.body || "",
      });
      setEditKey(key);
      setModal("edit");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const closeModal = () => {
    setModal(null);
    setEditKey(null);
    setForm(emptyCreateForm());
  };

  const saveCreate = async () => {
    const v = validatePromptCreateClient(form);
    if (v) {
      setErr(v);
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await api.post("/admin/prompts", {
        prompt_key: String(form.prompt_key).trim(),
        title_fa: form.title_fa ?? "",
        description_fa: "",
        body: form.body ?? "",
      });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editKey) return;
    setSaving(true);
    setErr("");
    try {
      await api.put(`/admin/prompts/${encodeURIComponent(editKey)}`, {
        title_fa: form.title_fa ?? "",
        description_fa: "",
        body: form.body ?? "",
      });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>
          بازگشت
        </button>
      </div>
    );
  }

  const L = PROMPT_FIELD_LIMITS;
  return (
    <FormPageLayout
      title="مدیریت پرامپت‌ها"
      documentTitle="مدیریت پرامپت‌ها"
      toolbarExtra={(
        <button type="button" onClick={openCreate} className="v3-add-fab" style={{ padding: "6px 12px", fontSize: "0.86em" }}>
          <Plus size={18} />
          پرامپت جدید
        </button>
      )}
      contentPadding="20px"
    >
      <div className="form-page-filter-row">
        <label className="form-page-filter-field" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ whiteSpace: "nowrap" }}>محدودهٔ لیست:</span>
          <select
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            style={{ ...inp, marginBottom: 0, width: "100%", maxWidth: 320, cursor: "pointer" }}
          >
            {PROMPT_LIST_PREFIX_CHOICES.map((o) => (
              <option key={o.value === "" ? "__all__" : o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-page-filter-actions">
          <button type="button" onClick={load} className="form-page-btn form-page-btn-secondary">
            بروزرسانی لیست
          </button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>متغیرهای مجاز در متن پرامپت (بر اساس اکشن فرم)</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          اکشن:&nbsp;
          <select
            value={metaSelection}
            onChange={(e) => setMetaSelection(e.target.value)}
            style={{ ...inp, marginBottom: 0, minWidth: 320, maxWidth: "100%", cursor: "pointer" }}
          >
            {metaOptions.length === 0 ? (
              <option value="">—</option>
            ) : (
              metaOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            )}
          </select>
        </label>
        {varMetaLoading ? <div style={{ opacity: 0.85 }}>در حال بارگذاری فهرست متغیرها…</div> : null}
        {varMetaErr ? <div style={{ color: "#f87171" }}>{varMetaErr}</div> : null}
        {varMeta && !varMetaLoading ? (
          <div style={{ lineHeight: 1.8 }}>
            {Array.isArray(varMeta.server) && varMeta.server.length ? (
              <ul style={{ margin: "8px 0 0", paddingRight: 20 }}>
                {varMeta.server.map((v) => (
                  <li key={v.name}>
                    <code style={code}>{`{{${v.name}}}`}</code>
                    {" — "}
                    {v.label_fa}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: "8px 0 0", opacity: 0.9 }}>برای این اکشن متغیر سروری ثبت نشده است.</p>
            )}
            {varMeta.form_token_hint_fa ? (
              <p style={{ margin: "10px 0 0", opacity: 0.95, textAlign: "justify" }}>{varMeta.form_token_hint_fa}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {err ? <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div> : null}
      {loading ? <div>در حال بارگذاری…</div> : null}

      <div className="form-page-table-wrap" style={{ border: `1px solid ${theme.border}`, borderRadius: 8 }}>
        <table className="form-page-table">
          <thead>
            <tr style={{ background: isDarkMode ? "#1e293b" : "#f1f5f9", color: theme.text }}>
              <th style={{ padding: 10, textAlign: "right" }}>کلید</th>
              <th style={{ padding: 10, textAlign: "right" }}>عنوان</th>
              <th style={{ padding: 10, textAlign: "right" }}>به‌روزرسانی</th>
              <th style={{ padding: 10 }}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prompt_key} style={{ borderTop: `1px solid ${theme.border}`, color: theme.text }}>
                <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{r.prompt_key}</td>
                <td style={{ padding: 10 }}>{r.title_fa}</td>
                <td style={{ padding: 10 }}>{r.updated_at ? new Date(r.updated_at).toLocaleString("fa-IR") : "—"}</td>
                <td style={{ padding: 10 }}>
                  <button type="button" onClick={() => openEdit(r.prompt_key)} style={{ ...btnGhost, padding: "6px 12px" }}>
                    ویرایش
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 20,
              color: theme.text,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {modal === "create" ? "پرامپت جدید" : `ویرایش: ${editKey}`}
            </h3>

            {modal === "create" ? (
              <>
                <label style={{ display: "block", marginBottom: 8 }}>
                  کلید انگلیسی (ثابت، مثل my.topic.name) <CharCounter value={form.prompt_key} max={255} />
                </label>
                <input
                  value={form.prompt_key}
                  maxLength={255}
                  onChange={(e) => setForm((f) => ({ ...f, prompt_key: e.target.value }))}
                  style={inp}
                />
              </>
            ) : null}

            <label style={{ display: "block", marginBottom: 8 }}>
              عنوان <CharCounter value={form.title_fa} max={L.titleFa} />
            </label>
            <input
              value={form.title_fa}
              maxLength={L.titleFa}
              onChange={(e) => setForm((f) => ({ ...f, title_fa: clampText(e.target.value, L.titleFa) }))}
              style={inp}
            />

            <label style={{ display: "block", marginBottom: 8 }}>
              متن پرامپت <CharCounter value={form.body} max={L.body} />
            </label>
            <p style={{ margin: "0 0 8px", fontSize: 12, opacity: 0.85, color: theme.muted }}>
              در صورت استفاده از توکن‌های <code style={code}>{"{{NAME}}"}</code>، همه باید در زمان اجرا مقدار داشته باشند؛ فهرست متغیرهای هر اکشن در بخش بالای صفحه است.
            </p>
            <textarea
              value={form.body}
              maxLength={L.body}
              onChange={(e) => setForm((f) => ({ ...f, body: clampText(e.target.value, L.body) }))}
              rows={14}
              style={{ ...inp, minHeight: 200, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeModal} style={btnGhost} disabled={saving}>
                انصراف
              </button>
              <button
                type="button"
                onClick={modal === "create" ? saveCreate : saveEdit}
                disabled={saving}
                style={{ ...btnPrimary, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.85 : 1 }}
              >
                <Save size={16} />
                {modal === "create" ? "ایجاد" : "ذخیره"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FormPageLayout>
  );
}
