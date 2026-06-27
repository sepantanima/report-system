import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, Plus, Trash2, Save, FlaskConical, Wallet } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import api from "../api/api";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import { AI_API_FIELD_LIMITS } from "../constants/promptFieldLimits.js";
import { AI_USAGE_KEYS } from "../constants/aiUsageKeys.js";
import { clampText } from "../utils/limitInput.js";
import { AI_API_FORM_HELP } from "../content/aiApiFormHelp.jsx";
import {
  EMPTY_CREDIT_FORM,
  creditFieldsFromExtra,
  creditFieldsFromTemplate,
  extraWithoutCreditCheck,
  mergeCreditIntoExtra,
  rowHasCreditCheck,
  buildTemplateCreditMap,
} from "../utils/aiCreditCheckConfig.js";

function CharCounter({ value, max }) {
  const n = value != null ? String(value).length : 0;
  return (
    <span style={{ fontSize: 12, opacity: 0.85 }}>
      {n}/{max}
    </span>
  );
}

function pickDefaultTemplate(templates) {
  const list = Array.isArray(templates) ? templates : [];
  const enabled = list.filter((t) => t.is_enabled).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return enabled[0] || list[0] || null;
}

function buildEmptyForm(templates) {
  const t = pickDefaultTemplate(templates);
  const ex = t?.default_extra_config && typeof t.default_extra_config === "object" ? t.default_extra_config : {};
  return {
    usage_key: AI_USAGE_KEYS.FIELD_MANAGEMENT_SUMMARY,
    sort_order: 0,
    title_fa: "",
    provider_type: t?.slug || "google_gemini",
    model_id: t?.default_model_id || "gemini-1.5-flash",
    extra_config_json: Object.keys(ex).length ? JSON.stringify(ex, null, 2) : "{}",
    credential_mode: "env_ref",
    credential_env_name: t?.default_credential_env_name || "GEMINI_API_KEY",
    credential_secret_cipher: "",
    is_enabled: true,
    ...EMPTY_CREDIT_FORM,
  };
}

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

export default function AiApiManagement() {
  const navigate = useNavigate();
  const allowed = hasRole(getSessionRoles(), "admin");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(() => buildEmptyForm([]));
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [creditBusyId, setCreditBusyId] = useState(null);
  const [creditById, setCreditById] = useState({});
  const [providerTemplates, setProviderTemplates] = useState([]);

  const L = AI_API_FIELD_LIMITS;

  const [filterUsageKey, setFilterUsageKey] = useState("");
  const [filterProviderType, setFilterProviderType] = useState("");

  const fetchConfigs = async (explicit) => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const params = {};
      const uk = explicit?.usage_key !== undefined ? explicit.usage_key : filterUsageKey;
      const pt = explicit?.provider_type !== undefined ? explicit.provider_type : filterProviderType;
      if (String(uk).trim()) params.usage_key = String(uk).trim();
      if (String(pt).trim()) params.provider_type = String(pt).trim();
      const res = await api.get("/admin/ai-api-configs", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderTemplates = async () => {
    try {
      const res = await api.get("/admin/ai-provider-templates", { params: { include_disabled: "1" } });
      setProviderTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setProviderTemplates([]);
      setErr(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void fetchConfigs();
    void fetchProviderTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const openCreate = () => {
    setForm(buildEmptyForm(providerTemplates));
    setModal("create");
    setTestMsg("");
  };

  const openEdit = (row) => {
    const extra = row.extra_config && typeof row.extra_config === "object" ? row.extra_config : {};
    const creditFields = creditFieldsFromExtra(extra);
    let extraJson = "{}";
    try {
      extraJson = JSON.stringify(extraWithoutCreditCheck(extra), null, 2);
    } catch {
      extraJson = "{}";
    }
    setForm({
      usage_key: row.usage_key,
      sort_order: row.sort_order,
      title_fa: row.title_fa || "",
      provider_type: row.provider_type,
      model_id: row.model_id,
      extra_config_json: extraJson,
      credential_mode: row.credential_mode,
      credential_env_name: row.credential_env_name || "",
      credential_secret_cipher: "",
      is_enabled: row.is_enabled,
      ...creditFields,
    });
    setModal({ mode: "edit", id: row.id });
    setTestMsg("");
  };

  const onProviderTypeChange = (slug) => {
    const t = providerTemplates.find((x) => x.slug === slug);
    setForm((f) => {
      const next = { ...f, provider_type: slug };
      if (t) {
        if (t.default_model_id != null && String(t.default_model_id).trim()) {
          next.model_id = String(t.default_model_id).trim();
        }
        if (t.default_credential_env_name != null && String(t.default_credential_env_name).trim()) {
          next.credential_env_name = String(t.default_credential_env_name).trim();
        }
        const ex = t.default_extra_config && typeof t.default_extra_config === "object" ? t.default_extra_config : {};
        next.extra_config_json = JSON.stringify(extraWithoutCreditCheck(ex), null, 2);
        const tplCredit = creditFieldsFromTemplate(t);
        if (tplCredit.credit_enabled) {
          Object.assign(next, tplCredit);
        } else {
          Object.assign(next, EMPTY_CREDIT_FORM);
        }
      }
      return next;
    });
  };

  const sortedTemplates = useMemo(
    () => [...providerTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [providerTemplates],
  );

  const templateSelectOptions = useMemo(() => {
    const slugs = new Set(sortedTemplates.map((t) => t.slug));
    const out = [...sortedTemplates];
    if (form.provider_type && !slugs.has(form.provider_type)) {
      out.unshift({
        slug: form.provider_type,
        label_fa: `${form.provider_type} (فقط در این ردیف؛ در قالب‌ها نیست)`,
        is_enabled: true,
        engine: "",
      });
    }
    return out;
  }, [sortedTemplates, form.provider_type]);

  const submit = async () => {
    setSaving(true);
    setErr("");
    let extra_config = {};
    try {
      extra_config = JSON.parse(form.extra_config_json || "{}");
      if (typeof extra_config !== "object" || extra_config === null) extra_config = {};
      extra_config = mergeCreditIntoExtra(extra_config, form);
    } catch {
      setErr("فرمت JSON تنظیمات اضافی نامعتبر است");
      setSaving(false);
      return;
    }
    try {
      const payload = { ...form, extra_config };
      delete payload.extra_config_json;
      delete payload.credit_enabled;
      delete payload.credit_url;
      delete payload.credit_balance_path;
      delete payload.credit_balance_path_secondary;
      delete payload.credit_currency_label;
      if (payload.credential_mode === "env_ref") {
        payload.credential_secret_cipher = null;
      } else if (modal?.mode === "edit" && (!payload.credential_secret_cipher || !String(payload.credential_secret_cipher).trim())) {
        delete payload.credential_secret_cipher;
      }
      if (modal === "create") {
        await api.post("/admin/ai-api-configs", payload);
      } else if (modal?.mode === "edit") {
        await api.put(`/admin/ai-api-configs/${modal.id}`, payload);
      }
      setModal(null);
      await fetchConfigs();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("حذف این ردیف؟")) return;
    try {
      await api.delete(`/admin/ai-api-configs/${id}`);
      await fetchConfigs();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const testRow = async (id) => {
    setTestMsg("");
    try {
      const res = await api.post(`/admin/ai-api-configs/${id}/test`);
      setTestMsg(res.data?.sample || "موفق");
    } catch (e) {
      setTestMsg(e.response?.data?.error || e.message);
    }
  };

  const checkCredit = async (id) => {
    setCreditBusyId(id);
    setErr("");
    try {
      const res = await api.get(`/admin/ai-api-configs/${id}/credit`);
      setCreditById((prev) => ({
        ...prev,
        [id]: {
          balance: res.data?.balance_display ?? String(res.data?.balance ?? "—"),
          currency: "",
          checked_at: res.data?.checked_at,
          error: null,
        },
      }));
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setCreditById((prev) => ({
        ...prev,
        [id]: { balance: null, currency: "", error: msg },
      }));
    } finally {
      setCreditBusyId(null);
    }
  };

  const templateCreditMap = useMemo(
    () => buildTemplateCreditMap(providerTemplates),
    [providerTemplates],
  );

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

  return (
    <FormPageLayout
      title="مدیریت API هوش مصنوعی"
      documentTitle="مدیریت API هوش مصنوعی"
      onHelp={() => <AI_API_FORM_HELP />}
      helpTitle="راهنمای مدیریت API هوش مصنوعی"
      contentPadding="20px"
    >
      <div className="form-page-filter-row">
        <div className="form-page-filter-field">
          <label style={{ display: "block", fontSize: "0.86em", opacity: 0.85, marginBottom: 4 }}>فیلتر کاربرد (usage_key)</label>
          <input
            style={{ ...inp, marginBottom: 0, width: "100%" }}
            value={filterUsageKey}
            onChange={(e) => setFilterUsageKey(e.target.value)}
            placeholder="مثلاً field.management_summary"
            dir="ltr"
          />
        </div>
        <div className="form-page-filter-field">
          <label style={{ display: "block", fontSize: "0.86em", opacity: 0.85, marginBottom: 4 }}>فیلتر نوع ارائه‌دهنده</label>
          <input
            style={{ ...inp, marginBottom: 0, width: "100%" }}
            value={filterProviderType}
            onChange={(e) => setFilterProviderType(e.target.value)}
            placeholder="مثلاً google_gemini یا avalai"
            dir="ltr"
          />
        </div>
        <div className="form-page-filter-actions">
          <button type="button" onClick={() => void fetchConfigs()} className="form-page-btn form-page-btn-secondary">
            اعمال فیلتر
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterUsageKey("");
              setFilterProviderType("");
              void fetchConfigs({ usage_key: "", provider_type: "" });
            }}
            className="form-page-btn form-page-btn-secondary"
          >
            پاک کردن فیلتر
          </button>
        </div>
      </div>

      <div className="form-page-actions-row">
        <button type="button" onClick={openCreate} className="form-page-btn form-page-btn-primary">
          <Plus size={18} />
          ردیف جدید
        </button>
        <button
          type="button"
          onClick={() => void fetchConfigs()}
          title="دوباره خواندن لیست ردیف‌ها از سرور (بدون تغییر فیلترها)"
          className="form-page-btn form-page-btn-secondary"
        >
          بروزرسانی لیست از سرور
        </button>
      </div>

      {err ? <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div> : null}
      {testMsg ? <div style={{ marginBottom: 12, color: "#94a3b8" }}>نتیجه تست: {testMsg}</div> : null}
      {loading ? <div>در حال بارگذاری…</div> : null}

      <div className="form-page-table-wrap">
        <table className="form-page-table">
          <thead>
            <tr style={{ background: "#1e293b" }}>
              <th className="col-narrow">id</th>
              <th className="col-wide">کاربرد</th>
              <th className="col-short">ترتیب</th>
              <th className="col-title">عنوان</th>
              <th className="col-text">نوع</th>
              <th className="col-text">مدل</th>
              <th className="col-short">فعال</th>
              <th className="col-text">اعتبارنامه</th>
              <th className="col-short">مانده</th>
              <th className="col-actions">—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #334155" }}>
                <td className="col-narrow">{r.id}</td>
                <td className="col-wide col-mono" dir="ltr">
                  {r.usage_key}
                </td>
                <td className="col-short">{r.sort_order}</td>
                <td className="col-title">{r.title_fa}</td>
                <td className="col-text col-mono" dir="ltr">
                  {r.provider_type}
                </td>
                <td className="col-text">{r.model_id}</td>
                <td className="col-short">{r.is_enabled ? "بله" : "خیر"}</td>
                <td className="col-text">
                  {r.credential_mode === "env_ref" ? (
                    <span className="col-mono" dir="ltr">
                      env: {r.credential_env_name || "—"}
                    </span>
                  ) : (
                    <span>
                      DB
                      {r.has_stored_secret && r.stored_secret_hint ? (
                        <span style={{ opacity: 0.85 }}> ({r.stored_secret_hint})</span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="col-short" style={{ fontSize: 12 }}>
                  {creditById[r.id]?.error ? (
                    <span style={{ color: "#f87171" }} title={creditById[r.id].error}>خطا</span>
                  ) : creditById[r.id]?.balance != null ? (
                    <span title={creditById[r.id].checked_at || ""}>
                      {creditById[r.id].balance}
                      {creditById[r.id].currency ? ` ${creditById[r.id].currency}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="col-actions">
                  <button type="button" onClick={() => openEdit(r)} style={{ cursor: "pointer", marginLeft: 6 }}>
                    ویرایش
                  </button>
                  <button type="button" onClick={() => testRow(r.id)} style={{ cursor: "pointer", marginLeft: 6 }} title="یک درخواست آزمایشی کوتاه به این ردیف">
                    <FlaskConical size={14} style={{ verticalAlign: "middle" }} />
                  </button>
                  {rowHasCreditCheck(r, templateCreditMap) ? (
                    <button
                      type="button"
                      onClick={() => checkCredit(r.id)}
                      disabled={creditBusyId === r.id}
                      style={{ cursor: creditBusyId === r.id ? "wait" : "pointer", marginLeft: 6, opacity: creditBusyId === r.id ? 0.5 : 1 }}
                      title="مانده اعتبار حساب"
                    >
                      <Wallet size={14} style={{ verticalAlign: "middle" }} />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => remove(r.id)} style={{ cursor: "pointer", marginLeft: 6, color: "#f87171" }}>
                    <Trash2 size={14} />
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
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 20,
            }}
          >
            <h3 style={{ marginTop: 0 }}>{modal === "create" ? "ردیف جدید" : `ویرایش #${modal.id}`}</h3>
            <label style={{ display: "block", marginBottom: 8 }}>
              کاربرد (usage_key) <CharCounter value={form.usage_key} max={L.usageKey} />
            </label>
            <input
              style={inp}
              value={form.usage_key}
              maxLength={L.usageKey}
              onChange={(e) => setForm((f) => ({ ...f, usage_key: clampText(e.target.value, L.usageKey) }))}
              dir="ltr"
            />
            <label style={{ display: "block", marginBottom: 8 }}>ترتیب در زنجیره پشتیبان (عدد کوچکتر = اولویت بیشتر)</label>
            <input style={inp} type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
            <label style={{ display: "block", marginBottom: 8 }}>
              عنوان فارسی <CharCounter value={form.title_fa} max={L.titleFa} />
            </label>
            <input
              style={inp}
              value={form.title_fa}
              maxLength={L.titleFa}
              onChange={(e) => setForm((f) => ({ ...f, title_fa: clampText(e.target.value, L.titleFa) }))}
            />
            <label style={{ display: "block", marginBottom: 8 }}>نوع ارائه‌دهنده (slug — از جدول قالب‌ها در دیتابیس)</label>
            {templateSelectOptions.length === 0 ? (
              <div style={{ ...inp, color: "#fbbf24", fontSize: 13 }}>
                هنوز قالبی بارگذاری نشد. اگر جدول خالی است، مهاجرت <code style={{ fontSize: 12 }}>005_ai_provider_templates.sql</code> را روی دیتابیس اجرا کنید؛ برای نوع جدید یک ردیف در همان جدول (یا API ادمین) اضافه کنید.
              </div>
            ) : (
              <select style={inp} value={form.provider_type} onChange={(e) => onProviderTypeChange(e.target.value)}>
                {templateSelectOptions.map((t) => (
                  <option key={t.slug} value={t.slug} disabled={!t.is_enabled && t.slug !== form.provider_type}>
                    {t.label_fa} ({t.slug}){t.engine ? ` — ${t.engine}` : ""}
                    {!t.is_enabled ? " [غیرفعال]" : ""}
                  </option>
                ))}
              </select>
            )}
            <label style={{ display: "block", marginBottom: 8 }}>
              شناسه مدل <CharCounter value={form.model_id} max={L.modelId} />
            </label>
            <input style={inp} value={form.model_id} maxLength={L.modelId} onChange={(e) => setForm((f) => ({ ...f, model_id: clampText(e.target.value, L.modelId) }))} dir="ltr" />
            <label style={{ display: "block", marginBottom: 8 }}>تنظیمات اضافی (JSON) — مثلاً temperature، برای OpenAI: base_url</label>
            <textarea
              style={{ ...inp, minHeight: 100, fontFamily: "monospace", fontSize: 12 }}
              value={form.extra_config_json}
              onChange={(e) => setForm((f) => ({ ...f, extra_config_json: e.target.value }))}
              dir="ltr"
            />

            <div style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 8,
              border: "1px solid #334155",
              background: "rgba(15,23,42,0.6)",
            }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={!!form.credit_enabled}
                  onChange={(e) => setForm((f) => ({ ...f, credit_enabled: e.target.checked }))}
                />
                مانده اعتبار حساب (دکمه کیف پول در جدول)
              </label>
              <p style={{ fontSize: 12, opacity: 0.8, margin: "0 0 12px", lineHeight: 1.7 }}>
                اگر سرویس هوش API مانده دارد، آدرس را از مستندات همان سرویس وارد کنید. با همان کلید API این ردیف خوانده می‌شود.
                برای AvalAI: {`https://api.avalai.ir/user/v1/credit`} — فیلد مانده: remaining_unit
              </p>
              {form.credit_enabled ? (
                <>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12 }}>آدرس API مانده (URL کامل)</label>
                  <input
                    style={inp}
                    value={form.credit_url}
                    onChange={(e) => setForm((f) => ({ ...f, credit_url: e.target.value }))}
                    placeholder="https://api.example.com/user/v1/credit"
                    dir="ltr"
                  />
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12 }}>نام فیلد مانده در پاسخ JSON (balance_json_path)</label>
                  <input
                    style={inp}
                    value={form.credit_balance_path}
                    onChange={(e) => setForm((f) => ({ ...f, credit_balance_path: e.target.value }))}
                    placeholder="remaining_unit"
                    dir="ltr"
                  />
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12 }}>فیلد ثانویه اختیاری (مثلاً remaining_irt)</label>
                  <input
                    style={inp}
                    value={form.credit_balance_path_secondary}
                    onChange={(e) => setForm((f) => ({ ...f, credit_balance_path_secondary: e.target.value }))}
                    placeholder="remaining_irt"
                    dir="ltr"
                  />
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12 }}>برچسب واحد (currency_label)</label>
                  <input
                    style={inp}
                    value={form.credit_currency_label}
                    onChange={(e) => setForm((f) => ({ ...f, credit_currency_label: e.target.value }))}
                    placeholder="UNIT"
                    dir="ltr"
                  />
                </>
              ) : null}
            </div>

            <label style={{ display: "block", marginBottom: 8 }}>نوع اعتبارنامه</label>
            <select style={inp} value={form.credential_mode} onChange={(e) => setForm((f) => ({ ...f, credential_mode: e.target.value }))}>
              <option value="env_ref">متغیر محیطی روی سرور (env_ref)</option>
              <option value="stored_secret">ذخیره در دیتابیس (stored_secret)</option>
            </select>
            {form.credential_mode === "env_ref" ? (
              <>
                <label style={{ display: "block", marginBottom: 8 }}>
                  نام متغیر محیطی (مقدار کلید را در .env سرور بگذارید) <CharCounter value={form.credential_env_name} max={L.credentialEnvName} />
                </label>
                <input
                  style={inp}
                  value={form.credential_env_name}
                  maxLength={L.credentialEnvName}
                  onChange={(e) => setForm((f) => ({ ...f, credential_env_name: clampText(e.target.value, L.credentialEnvName) }))}
                  dir="ltr"
                />
              </>
            ) : (
              <>
                <label style={{ display: "block", marginBottom: 8 }}>کلید API — در ویرایش برای حفظ قبلی خالی بگذارید</label>
                <input
                  style={inp}
                  type="password"
                  autoComplete="new-password"
                  value={form.credential_secret_cipher}
                  onChange={(e) => setForm((f) => ({ ...f, credential_secret_cipher: e.target.value }))}
                  dir="ltr"
                />
              </>
            )}
            <label style={{ display: "block", marginBottom: 16 }}>
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} /> فعال
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "8px 16px", cursor: "pointer", borderRadius: 8 }}>
                انصراف
              </button>
              <button type="button" onClick={submit} disabled={saving} style={{ ...btnPrimary, cursor: saving ? "wait" : "pointer" }}>
                <Save size={16} />
                ذخیره
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FormPageLayout>
  );
}
