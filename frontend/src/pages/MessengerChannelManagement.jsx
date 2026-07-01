import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Save, FlaskConical, X } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import messengerAdminService from "../services/messengerAdminService.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { ANALYSIS_MONITOR_CSS } from "../theme/analysisMonitorStyles.js";
import {
  MESSENGER_USAGE_KEY_OPTIONS,
  DESTINATION_KIND_OPTIONS,
  MESSENGER_USAGE_KEYS,
} from "../constants/messengerUsageKeys.js";

const MESSENGER_MODAL_CSS = `
  .messenger-channel-modal-box {
    width: min(760px, 96vw);
    max-width: 760px;
    max-height: min(90vh, 860px);
  }
  .messenger-channel-modal-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 12px 16px;
    align-items: start;
  }
  .mc-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .mc-field > label {
    font-size: 0.86em;
    opacity: 0.9;
  }
  .mc-col-12 { grid-column: span 12; }
  .mc-col-8 { grid-column: span 8; }
  .mc-col-7 { grid-column: span 7; }
  .mc-col-6 { grid-column: span 6; }
  .mc-col-5 { grid-column: span 5; }
  .mc-col-4 { grid-column: span 4; }
  @media (max-width: 640px) {
    .mc-col-8, .mc-col-7, .mc-col-6, .mc-col-5, .mc-col-4 { grid-column: span 12; }
  }
`;

const usageLabelMap = Object.fromEntries(
  MESSENGER_USAGE_KEY_OPTIONS.map((o) => [o.value, o.label]),
);

function formatUsageKeys(row) {
  const keys = Array.isArray(row.usage_keys) && row.usage_keys.length
    ? row.usage_keys
    : (row.usage_key ? [row.usage_key] : []);
  return keys.map((k) => usageLabelMap[k] || k).join("، ");
}

const inp = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function McField({ label, col = 12, children, className = "" }) {
  return (
    <div className={`mc-field mc-col-${col} ${className}`.trim()}>
      {label ? <label>{label}</label> : null}
      {children}
    </div>
  );
}

function buildEmptyForm(templates) {
  const t = (templates || []).find((x) => x.slug === "bale_bot") || templates?.[0];
  const ex = t?.default_extra_config && typeof t.default_extra_config === "object" ? t.default_extra_config : {};
  return {
    usage_keys: [MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH],
    sort_order: 0,
    title_fa: "",
    provider_type: t?.slug || "bale_bot",
    destination_kind: "channel",
    chat_id: "",
    bot_username: "",
    bot_public_link: "",
    extra_config_json: JSON.stringify(ex, null, 2),
    credential_mode: "env_ref",
    credential_env_name: t?.default_credential_env_name || "BALE_NEZNEWS_BOT_TOKEN",
    credential_secret_cipher: "",
    is_enabled: true,
  };
}

export default function MessengerChannelManagement() {
  const allowed = hasPermission(getSessionRoles(), "manage_messenger");
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(() => buildEmptyForm([]));
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [filterUsage, setFilterUsage] = useState("");

  const fetchAll = async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const [ch, tpl] = await Promise.all([
        messengerAdminService.listChannels(filterUsage ? { usage_key: filterUsage } : {}),
        messengerAdminService.listProviderTemplates(),
      ]);
      setRows(Array.isArray(ch) ? ch : []);
      setTemplates(Array.isArray(tpl) ? tpl : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, filterUsage]);

  const templateOptions = useMemo(
    () => [...templates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [templates],
  );

  const openCreate = () => {
    setForm(buildEmptyForm(templates));
    setModal("create");
    setTestMsg("");
  };

  const openEdit = (row) => {
    const ex = row.extra_config && typeof row.extra_config === "object" ? { ...row.extra_config } : {};
    const usageKeys = Array.isArray(row.usage_keys) && row.usage_keys.length
      ? row.usage_keys
      : (row.usage_key ? [row.usage_key] : []);
    setForm({
      usage_keys: usageKeys,
      sort_order: row.sort_order,
      title_fa: row.title_fa || "",
      provider_type: row.provider_type,
      destination_kind: row.destination_kind || "channel",
      chat_id: ex.chat_id != null ? String(ex.chat_id) : "",
      bot_username: ex.bot_username || "",
      bot_public_link: ex.bot_public_link || "",
      extra_config_json: JSON.stringify(ex, null, 2),
      credential_mode: row.credential_mode,
      credential_env_name: row.credential_env_name || "",
      credential_secret_cipher: "",
      is_enabled: row.is_enabled,
    });
    setModal({ mode: "edit", id: row.id });
    setTestMsg("");
  };

  const submit = async () => {
    setSaving(true);
    setErr("");
    let extra = {};
    try {
      extra = JSON.parse(form.extra_config_json || "{}");
    } catch {
      setErr("JSON تنظیمات اضافی نامعتبر است");
      setSaving(false);
      return;
    }
    if (form.chat_id) extra.chat_id = String(form.chat_id).trim();
    if (form.bot_username) extra.bot_username = form.bot_username.trim();
    if (form.bot_public_link) extra.bot_public_link = form.bot_public_link.trim();

    if (!form.usage_keys?.length) {
      setErr("حداقل یک کاربرد را انتخاب کنید.");
      setSaving(false);
      return;
    }

    const payload = {
      usage_keys: form.usage_keys,
      usage_key: form.usage_keys?.[0],
      sort_order: form.sort_order,
      title_fa: form.title_fa,
      provider_type: form.provider_type,
      destination_kind: form.destination_kind,
      extra_config: extra,
      chat_id: form.chat_id,
      credential_mode: form.credential_mode,
      credential_env_name: form.credential_env_name,
      credential_secret_cipher: form.credential_secret_cipher || undefined,
      is_enabled: form.is_enabled,
    };
    try {
      if (modal === "create") {
        await messengerAdminService.createChannel(payload);
      } else {
        await messengerAdminService.updateChannel(modal.id, payload);
      }
      setModal(null);
      await fetchAll();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const onTest = async (id) => {
    setTestMsg("");
    try {
      const r = await messengerAdminService.testChannel(id);
      setTestMsg(r.ok ? "ارسال آزمایشی موفق بود." : (r.error || "خطا"));
    } catch (e) {
      setTestMsg(e.response?.data?.error || e.message);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, color: "#e2e8f0", fontFamily: "inherit" }}>
        دسترسی به این بخش فقط برای راهبر مجاز است.
      </div>
    );
  }

  return (
    <FormPageLayout
      title="مدیریت کانال‌های پیام‌رسان"
      documentTitle="مدیریت کانال‌های پیام‌رسان"
      toolbarExtra={(
        <button type="button" onClick={openCreate} className="v3-add-fab" style={{ padding: "6px 12px", fontSize: "0.86em" }}>
          <Plus size={16} /> مقصد جدید
        </button>
      )}
    >
      {err && <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div>}

      <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 12, lineHeight: 1.8 }}>
        کانال‌هایی که کاربرد <strong>«هشدار / اطلاع‌رسانی»</strong> ({MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST}) دارند، به‌عنوان مقصد انتشار <strong>ابلاغ درون‌سامانه</strong> در صفحه صدور ابلاغ قابل انتخاب هستند.
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ marginLeft: 8 }}>فیلتر کاربرد:</label>
        <select value={filterUsage} onChange={(e) => setFilterUsage(e.target.value)} style={{ ...inp, width: 280, display: "inline-block" }}>
          <option value="">همه</option>
          {MESSENGER_USAGE_KEY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? <p>در حال بارگذاری…</p> : (
        <div className="form-page-table-wrap">
        <table className="form-page-table">
          <thead>
            <tr style={{ background: "#1e293b" }}>
              {[
                ["عنوان", "col-title"],
                ["پلتفرم", "col-short"],
                ["نوع", "col-short"],
                ["chat_id", "col-mono"],
                ["کاربرد", "col-wide"],
                ["ربات", "col-text"],
                ["فعال", "col-short"],
                ["", "col-actions"],
              ].map(([h, cls]) => (
                <th key={h || "actions"} className={cls} style={{ borderBottom: "1px solid #334155" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="col-title" style={{ borderBottom: "1px solid #1e293b" }}>{row.title_fa}</td>
                <td className="col-short" style={{ borderBottom: "1px solid #1e293b" }}>{row.provider_type}</td>
                <td className="col-short" style={{ borderBottom: "1px solid #1e293b" }}>{row.destination_kind}</td>
                <td className="col-mono" style={{ borderBottom: "1px solid #1e293b" }}>{row.extra_config?.chat_id}</td>
                <td className="col-wide" style={{ borderBottom: "1px solid #1e293b" }}>{formatUsageKeys(row)}</td>
                <td className="col-text" style={{ borderBottom: "1px solid #1e293b" }}>{row.extra_config?.bot_username || "—"}</td>
                <td className="col-short" style={{ borderBottom: "1px solid #1e293b" }}>{row.is_enabled ? "بله" : "خیر"}</td>
                <td className="col-actions" style={{ borderBottom: "1px solid #1e293b" }}>
                  <button type="button" onClick={() => openEdit(row)} style={{ marginLeft: 6, cursor: "pointer" }}>ویرایش</button>
                  <button type="button" onClick={() => onTest(row.id)} style={{ marginLeft: 6, cursor: "pointer" }} title="تست"><FlaskConical size={14} /></button>
                  <button type="button" onClick={async () => { if (window.confirm("حذف؟")) { await messengerAdminService.deleteChannel(row.id); fetchAll(); } }} style={{ marginLeft: 6, cursor: "pointer", color: "#f87171" }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {testMsg && <p style={{ marginTop: 12, color: "#86efac" }}>{testMsg}</p>}

      {modal && typeof document !== "undefined" ? createPortal(
        <>
          <style>{ANALYSIS_MONITOR_CSS}</style>
          <style>{MESSENGER_MODAL_CSS}</style>
          <div className="v3-modal-overlay" onClick={() => setModal(null)}>
            <div
              role="dialog"
              aria-modal="true"
              className="v3-modal-box messenger-channel-modal-box"
              style={{ background: "#1e293b", border: "1px solid #334155" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="v3-modal-header-new">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="v3-icon-btn"
                  style={{ color: "#f87171", border: "none" }}
                  aria-label="بستن"
                >
                  <X size={18} />
                </button>
                <span style={{ fontWeight: 700 }}>{modal === "create" ? "مقصد جدید" : "ویرایش مقصد"}</span>
              </div>
              <div className="v3-modal-body">
                <div className="messenger-channel-modal-grid">
                  <McField label="عنوان" col={12}>
                    <input style={inp} value={form.title_fa} onChange={(e) => setForm((f) => ({ ...f, title_fa: e.target.value }))} />
                  </McField>
                  <McField label="پلتفرم" col={6}>
                    <select style={inp} value={form.provider_type} onChange={(e) => setForm((f) => ({ ...f, provider_type: e.target.value }))}>
                      {templateOptions.map((t) => (
                        <option key={t.slug} value={t.slug}>{t.label_fa || t.slug}</option>
                      ))}
                    </select>
                  </McField>
                  <McField label="نوع مقصد" col={6}>
                    <select style={inp} value={form.destination_kind} onChange={(e) => setForm((f) => ({ ...f, destination_kind: e.target.value }))}>
                      {DESTINATION_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </McField>
                  <McField label="chat_id" col={8}>
                    <input style={{ ...inp, fontFamily: "ui-monospace, monospace" }} value={form.chat_id} onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))} />
                  </McField>
                  <McField label="ترتیب (sort_order)" col={4}>
                    <input type="number" style={inp} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
                  </McField>
                  <McField label="کاربرد (یک یا چند مورد)" col={12}>
                    <MultiSelect
                      options={MESSENGER_USAGE_KEY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      values={form.usage_keys || []}
                      onChange={(v) => setForm((f) => ({ ...f, usage_keys: v }))}
                      placeholder="انتخاب کاربرد..."
                      theme={{ isDarkMode: true, card: "#1e293b", border: "#334155", text: "#fff", bg: "#0f172a" }}
                    />
                  </McField>
                  <McField label="نام کاربری ربات" col={6}>
                    <input style={inp} value={form.bot_username} onChange={(e) => setForm((f) => ({ ...f, bot_username: e.target.value }))} placeholder="@NezNewsBot" dir="ltr" />
                  </McField>
                  <McField label="لینک عمومی" col={6}>
                    <input style={inp} value={form.bot_public_link} onChange={(e) => setForm((f) => ({ ...f, bot_public_link: e.target.value }))} dir="ltr" />
                  </McField>
                  <McField label="حالت اعتبار" col={5}>
                    <select style={inp} value={form.credential_mode} onChange={(e) => setForm((f) => ({ ...f, credential_mode: e.target.value }))}>
                      <option value="env_ref">متغیر محیطی (.env)</option>
                      <option value="stored_secret">ذخیره در DB</option>
                    </select>
                  </McField>
                  {form.credential_mode === "env_ref" ? (
                    <McField label="نام متغیر env" col={7}>
                      <input style={{ ...inp, fontFamily: "ui-monospace, monospace" }} value={form.credential_env_name} onChange={(e) => setForm((f) => ({ ...f, credential_env_name: e.target.value }))} dir="ltr" />
                    </McField>
                  ) : (
                    <McField label="توکن ربات" col={7}>
                      <input type="password" style={inp} value={form.credential_secret_cipher} onChange={(e) => setForm((f) => ({ ...f, credential_secret_cipher: e.target.value }))} dir="ltr" />
                    </McField>
                  )}
                  <McField col={12}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} />
                      فعال
                    </label>
                  </McField>
                </div>
              </div>
              <div className="v3-modal-footer-new">
                <button type="button" onClick={() => setModal(null)} className="v3-btn-footer">انصراف</button>
                <button type="button" disabled={saving} onClick={submit} className="v3-btn-footer v3-primary-solid" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Save size={14} /> ذخیره
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}
    </FormPageLayout>
  );
}
