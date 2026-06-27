import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import api from "../api/api";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import {
  FORM_AI_NAMES,
  REGISTERED_FORM_AI_ACTIONS,
  UNIFIED_AI_ASSEMBLY_HINT_FA,
  getDefaultRegisteredFormAction,
  findRegisteredActionMeta,
  getFormLabelFa,
  getActionLabelFa,
} from "../constants/aiFormNames.js";
import { AI_FORM_ACTIONS_HELP } from "../content/aiFormActionsHelp.jsx";
import { PROMPT_KEY_BY_CLASSIFICATION } from "../constants/promptKeys.js";
import { AI_USAGE_KEYS } from "../constants/aiUsageKeys.js";

const emptyForm = () => {
  const d = getDefaultRegisteredFormAction();
  return {
    form_name: d.form_name,
    action_name: d.action_name,
    button_label_fa: d.button_label_fa,
    is_enabled: true,
    prompt_key: PROMPT_KEY_BY_CLASSIFICATION[1],
    ai_config_id: "",
    usage_key: AI_USAGE_KEYS.FIELD_MANAGEMENT_SUMMARY,
    source_fields_json: "[]",
    assembly_strategy: "unified_v1",
  };
};

export default function AiFormActionsManagement() {
  const navigate = useNavigate();
  const allowed = hasPermission(getSessionRoles(), "manage_ai_api");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filterForm, setFilterForm] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [aiConfigRows, setAiConfigRows] = useState([]);
  const [promptRows, setPromptRows] = useState([]);

  const fetchRows = async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (String(filterForm).trim()) params.form_name = String(filterForm).trim();
      const res = await api.get("/admin/ai/form-actions", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/admin/ai-api-configs");
        if (!cancelled) setAiConfigRows(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setAiConfigRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    if (!modal || !allowed) return;
    let cancelled = false;
    (async () => {
      try {
        const resP = await api.get("/admin/prompts");
        if (!cancelled) setPromptRows(Array.isArray(resP.data) ? resP.data : []);
      } catch {
        if (!cancelled) setPromptRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modal, allowed]);

  const applyRegisteredForm = (formName) => {
    const def = REGISTERED_FORM_AI_ACTIONS.find((x) => x.form_name === formName);
    const first = def?.actions?.[0];
    setForm((f) => ({
      ...f,
      form_name: formName,
      action_name: first?.action_name ?? f.action_name,
      button_label_fa: first?.default_button_label_fa ?? f.button_label_fa,
      prompt_key:
        formName === FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE
          ? f.prompt_key || PROMPT_KEY_BY_CLASSIFICATION[1]
          : "",
    }));
  };

  const applyRegisteredAction = (formName, actionName) => {
    const def = REGISTERED_FORM_AI_ACTIONS.find((x) => x.form_name === formName);
    const act = def?.actions?.find((x) => x.action_name === actionName);
    const isMgmtGen =
      formName === FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE &&
      actionName === FORM_AI_NAMES.ACTION_GENERATE_SUMMARY;
    setForm((f) => ({
      ...f,
      action_name: actionName,
      button_label_fa: act?.default_button_label_fa ?? f.button_label_fa,
      prompt_key: isMgmtGen ? f.prompt_key || PROMPT_KEY_BY_CLASSIFICATION[1] : "",
    }));
  };

  const inp = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    borderRadius: 6,
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#fff",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 14,
  };

  const btnBase = {
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    lineHeight: 1.25,
  };

  const btnGhost = {
    ...btnBase,
    padding: "6px 12px",
    minHeight: 34,
    background: "#1e293b",
    borderColor: "#334155",
    color: "#e2e8f0",
  };

  const btnPrimary = {
    ...btnBase,
    padding: "6px 14px",
    minHeight: 34,
    background: "#0ea5e9",
    borderColor: "#0284c7",
    color: "#fff",
  };

  const btnDanger = {
    ...btnBase,
    padding: "4px 10px",
    minHeight: 32,
    background: "transparent",
    borderColor: "#7f1d1d",
    color: "#f87171",
  };

  const btnTable = {
    ...btnGhost,
    padding: "4px 10px",
    minHeight: 30,
    fontSize: 12,
  };

  const openCreate = () => {
    setErr("");
    setForm(emptyForm());
    setModal("create");
  };

  const openEdit = (row) => {
    setErr("");
    let sf = "[]";
    try {
      sf = JSON.stringify(row.source_fields && typeof row.source_fields === "object" ? row.source_fields : [], null, 2);
    } catch {
      sf = "[]";
    }
    setForm({
      form_name: row.form_name,
      action_name: row.action_name,
      button_label_fa: row.button_label_fa || "",
      is_enabled: !!row.is_enabled,
      prompt_key: row.prompt_key || "",
      ai_config_id: row.ai_config_id != null ? String(row.ai_config_id) : "",
      usage_key: row.usage_key || "",
      source_fields_json: sf,
      assembly_strategy: "unified_v1",
    });
    setModal({ mode: "edit", id: row.id });
  };

  const submit = async () => {
    setSaving(true);
    setErr("");
    if (!findRegisteredActionMeta(form.form_name, form.action_name)) {
      const msg =
        "فرم و اکشن انتخاب‌شده در رجیستری برنامه ثبت نیست. فقط ترکیب‌هایی که در لیست فرم/دکمه می‌آیند مجازند — یک مورد معتبر انتخاب کنید.";
      setErr(msg);
      window.alert(msg);
      setSaving(false);
      return;
    }
    let source_fields = [];
    try {
      const parsed = JSON.parse(form.source_fields_json || "[]");
      source_fields = Array.isArray(parsed) ? parsed : [];
    } catch {
      const msg = "فرمت JSON فیلدهای ورودی نامعتبر است";
      setErr(msg);
      window.alert(msg);
      setSaving(false);
      return;
    }
    if (!String(form.usage_key || "").trim() && (form.ai_config_id === "" || form.ai_config_id == null)) {
      const msg = "کاربرد API را از لیست انتخاب کنید، یا یک ردیف مشخص API.";
      setErr(msg);
      window.alert(msg);
      setSaving(false);
      return;
    }
    if (!String(form.prompt_key || "").trim()) {
      const msg = "برای این دکمه باید یک پرامپت از لیست انتخاب کنید.";
      setErr(msg);
      window.alert(msg);
      setSaving(false);
      return;
    }
    const payload = {
      form_name: form.form_name.trim(),
      action_name: form.action_name.trim(),
      button_label_fa: form.button_label_fa,
      is_enabled: form.is_enabled,
      prompt_key: form.prompt_key.trim(),
      ai_config_id: form.ai_config_id === "" || form.ai_config_id == null ? null : parseInt(form.ai_config_id, 10),
      usage_key: form.usage_key.trim() || null,
      source_fields,
      assembly_strategy: "unified_v1",
    };
    try {
      if (modal === "create") {
        await api.post("/admin/ai/form-actions", payload);
      } else if (modal?.mode === "edit") {
        await api.put(`/admin/ai/form-actions/${modal.id}`, payload);
      }
      setModal(null);
      await fetchRows();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setErr(msg);
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("حذف این اکشن؟")) return;
    try {
      await api.delete(`/admin/ai/form-actions/${id}`);
      await fetchRows();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setErr(msg);
      window.alert(msg);
    }
  };

  const usageKeyOptions = useMemo(() => {
    const s = new Set();
    for (const r of aiConfigRows) {
      const k = r.usage_key != null && String(r.usage_key).trim();
      if (k) s.add(k);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [aiConfigRows]);

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

  const sectionTitle = { fontSize: 13, color: "#38bdf8", margin: "18px 0 8px", fontWeight: 600 };
  const hintBox = {
    fontSize: 12,
    lineHeight: 1.8,
    color: "#94a3b8",
    marginBottom: 12,
    padding: "10px 12px",
    background: "#1e293b",
    borderRadius: 8,
    border: "1px solid #334155",
  };
  const promptKeyInList = promptRows.some((p) => p.prompt_key === form.prompt_key);

  const regFormDef = REGISTERED_FORM_AI_ACTIONS.find((x) => x.form_name === form.form_name);
  const actionsForSelectedForm = regFormDef?.actions ?? [];
  const formInRegistry = !!regFormDef;
  const actionInRegistry = actionsForSelectedForm.some((a) => a.action_name === form.action_name);
  const comboValid = formInRegistry && actionInRegistry;

  return (
    <>
      {err ? (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100000,
            padding: "12px 16px",
            background: "#7f1d1d",
            color: "#fecaca",
            fontSize: 14,
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            lineHeight: 1.5,
          }}
        >
          {err}
          <button
            type="button"
            onClick={() => setErr("")}
            style={{
              marginRight: 12,
              marginLeft: 12,
              padding: "4px 10px",
              cursor: "pointer",
              borderRadius: 6,
              border: "1px solid #fecaca",
              background: "transparent",
              color: "#fecaca",
            }}
          >
            بستن
          </button>
        </div>
      ) : null}
      <FormPageLayout
        title="اکشن‌های AI فرم‌ها"
        documentTitle="اکشن‌های AI فرم‌ها"
        onHelp={() => <AI_FORM_ACTIONS_HELP />}
        helpTitle="راهنمای اکشن‌های AI فرم‌ها"
        contentPadding={err ? "64px 20px 20px" : "20px"}
      >
      <div className="form-page-filter-row">
        <div className="form-page-filter-field">
          <label style={{ fontSize: "0.86em", opacity: 0.85, display: "block", marginBottom: 4 }}>فیلتر فرم</label>
          <select
            style={{ ...inp, marginBottom: 0, width: "100%" }}
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value)}
          >
            <option value="">همهٔ فرم‌ها</option>
            {REGISTERED_FORM_AI_ACTIONS.map((f) => (
              <option key={f.form_name} value={f.form_name}>
                {f.label_fa}
              </option>
            ))}
          </select>
        </div>
        <div className="form-page-filter-actions">
          <button type="button" onClick={() => void fetchRows()} className="form-page-btn form-page-btn-secondary">
            اعمال
          </button>
        </div>
      </div>

      <div className="form-page-actions-row">
        <button type="button" onClick={openCreate} className="form-page-btn form-page-btn-primary">
          <Plus size={17} />
          اکشن جدید
        </button>
        <button type="button" onClick={() => void fetchRows()} className="form-page-btn form-page-btn-secondary">
          بروزرسانی
        </button>
      </div>

      {loading ? <div>در حال بارگذاری…</div> : null}

      <div className="form-page-table-wrap">
        <table className="form-page-table">
          <thead>
            <tr style={{ background: "#1e293b" }}>
              <th className="col-narrow">شناسه</th>
              <th className="col-wide">فرم</th>
              <th className="col-wide">اکشن</th>
              <th className="col-title">متن دکمه</th>
              <th className="col-wide">روش ساخت متن</th>
              <th className="col-wide">کاربرد API / ردیف ویژه</th>
              <th className="col-short">فعال</th>
              <th className="col-actions">—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #334155" }}>
                <td className="col-narrow">{r.id}</td>
                <td className="col-wide">
                  <div>{getFormLabelFa(r.form_name)}</div>
                  <div className="col-mono" style={{ opacity: 0.65, marginTop: 4 }} dir="ltr">
                    {r.form_name}
                  </div>
                </td>
                <td className="col-wide">
                  <div>{getActionLabelFa(r.form_name, r.action_name)}</div>
                  <div className="col-mono" style={{ opacity: 0.65, marginTop: 4 }} dir="ltr">
                    {r.action_name}
                  </div>
                </td>
                <td className="col-title">{r.button_label_fa}</td>
                <td className="col-wide">
                  <div>یکسان — پرامپت + داده</div>
                  <div className="col-mono" style={{ opacity: 0.55, marginTop: 4 }} dir="ltr">
                    {r.assembly_strategy}
                  </div>
                </td>
                <td className="col-wide" dir="ltr">
                  {r.usage_key || "—"}
                  {r.ai_config_id != null ? (
                    <div style={{ opacity: 0.85, marginTop: 4 }}>اولویت ردیف #{r.ai_config_id}</div>
                  ) : null}
                </td>
                <td className="col-short">{r.is_enabled ? "بله" : "خیر"}</td>
                <td className="col-actions">
                  <button type="button" onClick={() => openEdit(r)} style={btnTable}>
                    ویرایش
                  </button>
                  <button type="button" onClick={() => remove(r.id)} style={{ ...btnDanger, marginRight: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              padding: 20,
              maxHeight: "92vh",
              overflow: "auto",
            }}
          >
            {err ? (
              <div
                role="alert"
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#450a0a",
                  border: "1px solid #991b1b",
                  color: "#fecaca",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {err}
              </div>
            ) : null}
            <h3 style={{ marginTop: 0 }}>{modal === "create" ? "اتصال: فرم + دکمه + پرامپت + API" : `ویرایش اکشن #${modal.id}`}</h3>
            <div style={{ ...hintBox, marginTop: 0, color: "#e2e8f0" }}>
              <b>فرم و دکمه</b> از لیست برنامه، <b>پرامپت</b> از لیست «مدیریت پرامپت‌ها» (در صورت نیاز)، <b>کاربرد API</b> از همان چیزی که در «مدیریت API» ثبت کرده‌اید، و در صورت تمایل <b>اولویت یک ردیف API</b>.
            </div>

            <p style={sectionTitle}>۱) فرم و دکمه (فقط موارد ثبت‌شده در برنامه)</p>
            {(!formInRegistry || !actionInRegistry) && (form.form_name || form.action_name) ? (
              <div style={{ ...hintBox, color: "#fbbf24", borderColor: "#854d0e", marginBottom: 10 }}>
                این ردیف در دیتابیس با فرم/اکشنی است که در <b>رجیستری فعلی</b> نیست (مثلاً دادهٔ قدیمی). از لیست زیر یک فرم و دکمهٔ <b>معتبر</b> انتخاب کنید تا ذخیره شود؛ فقط همان ترکیب‌هایی که توسعه‌دهنده در کد ثبت کرده اینجا هستند.
              </div>
            ) : null}
            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>فرم</label>
            <select style={inp} value={form.form_name} onChange={(e) => applyRegisteredForm(e.target.value)}>
              {!formInRegistry && form.form_name ? (
                <option value={form.form_name}>
                  (نامعتبر — عوض کنید) {form.form_name}
                </option>
              ) : null}
              {REGISTERED_FORM_AI_ACTIONS.map((f) => (
                <option key={f.form_name} value={f.form_name}>
                  {f.label_fa}
                </option>
              ))}
            </select>
            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>دکمه (نقش در برنامه)</label>
            <select style={inp} value={form.action_name} onChange={(e) => applyRegisteredAction(form.form_name, e.target.value)}>
              {!actionInRegistry && form.action_name ? (
                <option value={form.action_name}>
                  (نامعتبر — عوض کنید) {form.action_name}
                </option>
              ) : null}
              {actionsForSelectedForm.map((a) => (
                <option key={a.action_name} value={a.action_name}>
                  {a.label_fa}
                </option>
              ))}
            </select>
            <div style={{ ...hintBox, fontSize: 11, marginTop: 4 }}>
              نام‌های فنی ذخیره‌شده: <span dir="ltr">{form.form_name}</span> / <span dir="ltr">{form.action_name}</span>
              {comboValid ? null : (
                <span> — پس از انتخاب معتبر، ذخیره مجاز است.</span>
              )}
            </div>

            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>متنی که کاربر روی دکمه می‌بیند (قابل ویرایش)</label>
            <input style={inp} value={form.button_label_fa} onChange={(e) => setForm((f) => ({ ...f, button_label_fa: e.target.value }))} />

            <p style={sectionTitle}>۲) چطور به مدل داده می‌رسد؟</p>
            <div style={{ ...hintBox, marginTop: 0 }}>{UNIFIED_AI_ASSEMBLY_HINT_FA}</div>

            <p style={sectionTitle}>۳) پرامپت از رجیستری</p>
            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>انتخاب پرامپت (از «مدیریت پرامپت‌ها»)</label>
            <select style={inp} value={form.prompt_key} onChange={(e) => setForm((f) => ({ ...f, prompt_key: e.target.value }))}>
              <option value="">— یک پرامپت انتخاب کنید —</option>
              {!promptKeyInList && form.prompt_key ? (
                <option value={form.prompt_key}>ثبت‌شده: {form.prompt_key} (در لیست فعلی دیده نمی‌شود)</option>
              ) : null}
              {promptRows.map((p) => (
                <option key={p.prompt_key} value={p.prompt_key}>
                  {(p.title_fa || "").trim() || p.prompt_key} — {p.prompt_key}
                </option>
              ))}
            </select>
            <div style={{ ...hintBox, fontSize: 11, marginTop: 4 }}>
              متن اصلی ارسال به مدل از همین پرامپت خوانده می‌شود. برای اکشن خلاصه میدانی می‌توانید در پرامپت از{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>{"{{PERIOD_START}}"}</code>،{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>{"{{PERIOD_END}}"}</code>،{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>{"{{PERIOD_KIND_FA}}"}</code>،{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>{"{{REPORTS_DIGEST}}"}</code> استفاده کنید؛ سرور آن‌ها را پر می‌کند. فیلدهای JSON زیر برای چسباندن مقادیر فرم به صورت بلوک (و توکن‌های{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>FORM_</code>) در مسیرهای دیگر است؛ برای همین اکشن معمولاً{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>[]</code> کافی است.
            </div>

            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>
              فیلدهای فرم برای چسباندن زیر پرامپت (JSON آرایهٔ نام فیلد به انگلیسی)
            </label>
            <textarea style={{ ...inp, minHeight: 88, fontFamily: "monospace", fontSize: 12 }} value={form.source_fields_json} onChange={(e) => setForm((f) => ({ ...f, source_fields_json: e.target.value }))} dir="ltr" />
            <div style={{ ...hintBox, fontSize: 11, marginTop: 4 }}>
              مثال: <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>[&quot;period_start&quot;,&quot;classification&quot;]</code> — هر کدام یک خط{" "}
              <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4 }}>نام: مقدار</code> زیر پرامپت می‌آید (در مسیر unified). برای «تولید پیش‌نویس خلاصه میدانی» معمولاً آرایه خالی کافی است.
            </div>

            <p style={sectionTitle}>۴) کدام API زده شود؟</p>
            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>کاربرد API (همان usage_key در «مدیریت API»)</label>
            <select style={inp} value={form.usage_key} onChange={(e) => setForm((f) => ({ ...f, usage_key: e.target.value }))}>
              {usageKeyOptions.length === 0 ? (
                <option value={form.usage_key || ""}>
                  {form.usage_key ? `ذخیره‌شده: ${form.usage_key}` : "ابتدا در «مدیریت API» حداقل یک ردیف ثبت کنید"}
                </option>
              ) : (
                <>
                  {form.usage_key && !usageKeyOptions.includes(form.usage_key) ? (
                    <option value={form.usage_key}>ذخیره‌شده: {form.usage_key}</option>
                  ) : null}
                  {usageKeyOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </>
              )}
            </select>
            <div style={{ ...hintBox, fontSize: 11, marginTop: 4 }}>
              فقط همان کاربردهایی که در صفحهٔ <b>مدیریت API هوش</b> برای ردیف‌ها نوشته‌اید اینجا دیده می‌شوند؛ یکی را انتخاب کنید تا زنجیرهٔ تماس (با پشتیبان) مشخص شود.
            </div>

            <label style={{ fontSize: 12, opacity: 0.88, display: "block", marginBottom: 4 }}>اولویت با یک ردیف مشخص از همان APIها (اختیاری)</label>
            <select style={inp} value={form.ai_config_id} onChange={(e) => setForm((f) => ({ ...f, ai_config_id: e.target.value }))}>
              <option value="">خودکار — فقط طبق کاربرد و ترتیب ردیف‌ها</option>
              {aiConfigRows.map((cfg) => (
                <option key={cfg.id} value={String(cfg.id)}>
                  #{cfg.id} — {cfg.title_fa || "بدون عنوان"} — {cfg.model_id} (کاربرد: {cfg.usage_key})
                </option>
              ))}
            </select>
            <div style={{ ...hintBox, fontSize: 11, marginTop: 4 }}>
              اگر یک ردیف را انتخاب کنید، سرور <b>اول همان ردیف</b> را از جدول پیکربندی API امتحان می‌کند؛ اگر خطا بدهد، بقیهٔ ردیف‌های همان <b>کاربرد API</b> به ترتیب امتحان می‌شوند. اگر خالی بگذارید، همان زنجیرهٔ عادی فقط بر اساس کاربرد اجرا می‌شود.
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} /> فعال باشد
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" onClick={() => { setErr(""); setModal(null); }} style={btnGhost}>
                انصراف
              </button>
              <button type="button" onClick={submit} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.85 : 1, cursor: saving ? "wait" : "pointer" }}>
                <Save size={16} />
                ذخیره
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </FormPageLayout>
    </>
  );
}
