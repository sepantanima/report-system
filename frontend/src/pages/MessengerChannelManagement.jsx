import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, FlaskConical } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import messengerAdminService from "../services/messengerAdminService.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import {
  MESSENGER_USAGE_KEY_OPTIONS,
  DESTINATION_KIND_OPTIONS,
  MESSENGER_USAGE_KEYS,
} from "../constants/messengerUsageKeys.js";

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
  padding: 8,
  marginBottom: 12,
  borderRadius: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

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

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, width: "min(520px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <h2 style={{ marginTop: 0 }}>{modal === "create" ? "مقصد جدید" : "ویرایش مقصد"}</h2>
            <label>عنوان</label>
            <input style={inp} value={form.title_fa} onChange={(e) => setForm((f) => ({ ...f, title_fa: e.target.value }))} />
            <label>پلتفرم</label>
            <select style={inp} value={form.provider_type} onChange={(e) => setForm((f) => ({ ...f, provider_type: e.target.value }))}>
              {templateOptions.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label_fa || t.slug}</option>
              ))}
            </select>
            <label>نوع مقصد</label>
            <select style={inp} value={form.destination_kind} onChange={(e) => setForm((f) => ({ ...f, destination_kind: e.target.value }))}>
              {DESTINATION_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label>chat_id</label>
            <input style={inp} value={form.chat_id} onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))} />
            <label>کاربرد (یک یا چند مورد)</label>
            <div style={{ marginBottom: 12 }}>
              <MultiSelect
                options={MESSENGER_USAGE_KEY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                values={form.usage_keys || []}
                onChange={(v) => setForm((f) => ({ ...f, usage_keys: v }))}
                placeholder="انتخاب کاربرد..."
                theme={{ isDarkMode: true, card: "#1e293b", border: "#334155", text: "#fff" }}
              />
            </div>
            <label>ترتیب (sort_order)</label>
            <input type="number" style={inp} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            <label>نام کاربری ربات</label>
            <input style={inp} value={form.bot_username} onChange={(e) => setForm((f) => ({ ...f, bot_username: e.target.value }))} placeholder="@NezNewsBot" />
            <label>لینک عمومی</label>
            <input style={inp} value={form.bot_public_link} onChange={(e) => setForm((f) => ({ ...f, bot_public_link: e.target.value }))} />
            <label>حالت اعتبار</label>
            <select style={inp} value={form.credential_mode} onChange={(e) => setForm((f) => ({ ...f, credential_mode: e.target.value }))}>
              <option value="env_ref">متغیر محیطی (.env)</option>
              <option value="stored_secret">ذخیره در DB</option>
            </select>
            {form.credential_mode === "env_ref" ? (
              <>
                <label>نام متغیر env</label>
                <input style={inp} value={form.credential_env_name} onChange={(e) => setForm((f) => ({ ...f, credential_env_name: e.target.value }))} />
              </>
            ) : (
              <>
                <label>توکن ربات</label>
                <input type="password" style={inp} value={form.credential_secret_cipher} onChange={(e) => setForm((f) => ({ ...f, credential_secret_cipher: e.target.value }))} />
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} />
              فعال
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: "8px 14px", cursor: "pointer" }}>انصراف</button>
              <button type="button" disabled={saving} onClick={submit} style={{ padding: "8px 14px", background: "#0ea5e9", border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Save size={14} /> ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </FormPageLayout>
  );
}
