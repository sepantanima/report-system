import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Save, Loader2 } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import {
  PAGE_WIDE_MAX,
  PAGE_NARROW_MAX,
  PAGE_MEDIUM_MAX,
  PAGE_SETTINGS_SECTION_MAX,
} from "../constants/pageLayoutWidths.js";
import newsReportAdminService from "../services/newsReportAdminService.js";
import { getSessionRoles, hasRole, hasPermission } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { buildTemplatePreview } from "./newsReport/templatePreviewUtils.js";

const PACK_FORMAT_OPTIONS = [
  { key: "html_card", label: "HTML کارتی" },
  { key: "html_table", label: "HTML جدولی" },
  { key: "txt", label: "TXT" },
  { key: "pdf_a5_card", label: "PDF A5 کارتی" },
  { key: "pdf_a5_table", label: "PDF A5 جدولی" },
  { key: "pdf_a4", label: "PDF A4" },
];

const WORKFLOW_STATUS_OPTIONS = [
  { value: "registered", label: "ثبت شده" },
  { value: "in_review", label: "در حال بررسی" },
  { value: "approved", label: "تأیید شده" },
  { value: "published", label: "آماده انتشار" },
  { value: "banked", label: "بانک انتظار" },
  { value: "rejected", label: "برگشت به فرستنده" },
];
const PRINT_FORMATS = [
  { key: "html_card", label: "HTML کارت" },
  { key: "html_table", label: "HTML جدول" },
  { key: "txt", label: "TXT متن" },
  { key: "pdf_a5_card", label: "PDF A5 کارت" },
  { key: "pdf_a5_table", label: "PDF A5 جدول" },
  { key: "pdf_a4", label: "PDF A4" },
];

const TEMPLATE_FIELDS = [
  { key: "document_caption_template", label: "قالب کپشن فایل ارسالی", rows: 10, help: "{{report_type}} {{report_date}} {{display_from}} {{display_to}} {{news_count_text}} {{system_name}} {{pack_label}} {{format_label}}" },
  { key: "messenger_template", label: "قالب پیام گزارش", rows: 10, help: "{{label}} {{report_date}} {{display_from}} {{display_to}} {{news_list}} {{signature}} {{hashtags}}" },
  { key: "news_item_template", label: "قالب هر خبر در پیام", rows: 6, help: "{{index}} {{news_date}} {{news_time}} {{news_source}} {{news_text}}" },
  { key: "brief_submission_messenger_template", label: "قالب انتشار تحلیل کوتاه", rows: 10, help: "{{author_hashtag}} {{composition_date}} {{brief_body}} {{submitter_hashtag}}" },
  { key: "html_card_template", label: "قالب HTML کارت", rows: 16, html: true, help: "{{label}} {{color}} {{meta}} {{cards}}" },
  { key: "html_table_template", label: "قالب HTML جدول", rows: 16, html: true, help: "{{label}} {{color}} {{org_block}} {{meta}} {{table_rows}}" },
  { key: "txt_output_template", label: "قالب TXT خروجی", rows: 10, help: "{{label}} {{report_date}} {{display_from}} {{display_to}} {{news_count_text}} {{news_list}}" },
];

const inp = (theme) => ({
  width: "100%",
  padding: 8,
  marginBottom: 10,
  borderRadius: 8,
  background: theme.input,
  border: `1px solid ${theme.border}`,
  color: theme.text,
  fontFamily: "inherit",
  boxSizing: "border-box",
});

const btnGhost = (theme) => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  background: theme.card,
  color: theme.text,
  cursor: "pointer",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

const templateTextareaStyle = (theme, html = false) => ({
  ...inp(theme),
  direction: html ? "ltr" : "rtl",
  textAlign: html ? "left" : "right",
  unicodeBidi: html ? "plaintext" : "normal",
  fontFamily: html ? "Consolas, Monaco, 'Courier New', monospace" : "Tahoma, Vazirmatn, Arial, sans-serif",
  fontSize: html ? 12 : 13,
  lineHeight: 1.6,
  resize: "vertical",
  minHeight: html ? 220 : 160,
});

function TemplateField({
  fieldKey,
  label,
  rows,
  help,
  html = false,
  value,
  defaultValue,
  settings,
  theme,
  onChange,
  onReset,
}) {
  const [showDefaultSample, setShowDefaultSample] = useState(true);
  const preview = useMemo(
    () => buildTemplatePreview(fieldKey, value, settings),
    [fieldKey, value, settings],
  );
  const defaultPreview = useMemo(
    () => (defaultValue ? buildTemplatePreview(fieldKey, defaultValue, settings) : null),
    [fieldKey, defaultValue, settings],
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <label style={{ fontWeight: 600 }}>{label}</label>
        <button type="button" onClick={onReset} style={btnGhost(theme)}>
          <RotateCcw size={14} /> بازنشانی به پیش‌فرض
        </button>
      </div>
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8, direction: "ltr", textAlign: "left" }}>
        placeholders: {help}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.85 }}>
            {html ? "متن HTML قالب (ویرایش)" : "متن قالب (ویرایش)"}
          </div>
          <textarea
            rows={rows}
            dir={html ? "ltr" : "auto"}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-lt-installed="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={templateTextareaStyle(theme, html)}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultValue ? "قالب فعلی — برای مشاهده نمونه پیش‌فرض بخش پایین را ببینید" : ""}
          />
        </div>

        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden", background: theme.card }}>
          <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, opacity: 0.9 }}>
            پیش‌نمایش خروجی (با داده نمونه)
          </div>
          {preview.type === "html" ? (
            <iframe
              title={`preview-${fieldKey}`}
              srcDoc={preview.content}
              sandbox=""
              style={{ width: "100%", height: html ? 420 : 280, border: "none", display: "block", background: "#fff" }}
            />
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 14,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                lineHeight: 1.75,
                direction: "rtl",
                textAlign: "right",
                fontFamily: "Tahoma, Vazirmatn, Arial, sans-serif",
                maxHeight: html ? 420 : 280,
                overflow: "auto",
                color: theme.text,
              }}
            >
              {preview.content}
            </pre>
          )}
        </div>
      </div>

      {defaultValue ? (
        <div style={{ marginTop: 14, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden", background: theme.card }}>
          <button
            type="button"
            onClick={() => setShowDefaultSample((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              border: "none",
              background: "rgba(14,165,233,0.08)",
              color: theme.text,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>نمونه قالب پیش‌فرض سیستم</span>
            <span style={{ opacity: 0.7 }}>{showDefaultSample ? "▲" : "▼"}</span>
          </button>
          {showDefaultSample ? (
            <div style={{ padding: 12, display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>متن خام پیش‌فرض</div>
                <textarea
                  readOnly
                  rows={Math.min(12, Math.max(6, String(defaultValue).split("\n").length + 1))}
                  dir={html ? "ltr" : "auto"}
                  style={{
                    ...templateTextareaStyle(theme, html),
                    marginBottom: 0,
                    opacity: 0.92,
                    cursor: "default",
                  }}
                  value={defaultValue}
                />
              </div>
              {defaultPreview ? (
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", fontSize: 11, opacity: 0.75, borderBottom: `1px solid ${theme.border}` }}>
                    پیش‌نمایش نمونه پیش‌فرض
                  </div>
                  {defaultPreview.type === "html" ? (
                    <iframe
                      title={`default-preview-${fieldKey}`}
                      srcDoc={defaultPreview.content}
                      sandbox=""
                      style={{ width: "100%", height: 240, border: "none", display: "block", background: "#fff" }}
                    />
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        padding: 12,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontSize: 12,
                        lineHeight: 1.7,
                        direction: "rtl",
                        textAlign: "right",
                        maxHeight: 200,
                        overflow: "auto",
                        color: theme.text,
                      }}
                    >
                      {defaultPreview.content}
                    </pre>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function NewsReportSettingsAdmin() {
  const navigate = useNavigate();
  const allowed = hasPermission(getSessionRoles(), "manage_news_reports");
  const { isDarkMode } = useAppTheme();
  const [tab, setTab] = useState("settings");
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [activeTemplateKey, setActiveTemplateKey] = useState(null);

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    input: isDarkMode ? "#0f172a" : "#f1f5f9",
  }), [isDarkMode]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        newsReportAdminService.getSettings(),
        newsReportAdminService.getDefaults(),
      ]);
      setSettings(s);
      setDefaults(d);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const saveSettings = async () => {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const s = await newsReportAdminService.updateSettings(settings);
      setSettings(s);
      setMsg("ذخیره شد.");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetField = (key) => {
    if (!defaults) return;
    if (key === "print_settings") {
      setSettings({ ...settings, print_settings: { ...defaults.print_settings } });
      return;
    }
    if (key === "custom_prompt_policy") {
      setSettings({ ...settings, custom_prompt_policy: { ...defaults.custom_prompt_policy } });
      return;
    }
    if (key === "pack_defaults") {
      setSettings({ ...settings, pack_defaults: JSON.parse(JSON.stringify(defaults.pack_defaults || {})) });
      return;
    }
    if (key === "report_default_filters") {
      setSettings({ ...settings, report_default_filters: { ...defaults.report_default_filters } });
      return;
    }
    setSettings({ ...settings, [key]: defaults[key] });
  };

  const updatePackType = (index, patch) => {
    const packTypes = [...(settings.pack_defaults?.pack_types || [])];
    packTypes[index] = { ...packTypes[index], ...patch };
    setSettings({ ...settings, pack_defaults: { ...settings.pack_defaults, pack_types: packTypes } });
  };

  const togglePackTypeFormat = (index, formatKey) => {
    const pt = settings.pack_defaults?.pack_types?.[index];
    if (!pt) return;
    const keys = pt.format_keys || [];
    const next = keys.includes(formatKey) ? keys.filter((k) => k !== formatKey) : [...keys, formatKey];
    updatePackType(index, { format_keys: next });
  };

  const updateWorkflowFilter = (field, value) => {
    setSettings({
      ...settings,
      report_default_filters: {
        ...settings.report_default_filters,
        [field]: value,
      },
    });
  };

  const toggleWorkflowStatus = (status) => {
    const current = settings.report_default_filters?.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateWorkflowFilter("statuses", next);
  };

  const toggleWorkflowIntFilter = (field, value) => {
    const current = settings.report_default_filters?.[field] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value].sort((a, b) => a - b);
    updateWorkflowFilter(field, next);
  };

  const updatePolicyField = (field, value) => {
    setSettings({
      ...settings,
      custom_prompt_policy: {
        ...settings.custom_prompt_policy,
        [field]: value,
      },
    });
  };

  const resetPrintFormat = (formatKey) => {
    if (!defaults?.print_settings) return;
    setSettings({
      ...settings,
      print_settings: {
        ...settings.print_settings,
        [formatKey]: { ...defaults.print_settings[formatKey] },
      },
    });
  };

  const updatePrintField = (formatKey, field, value) => {
    setSettings({
      ...settings,
      print_settings: {
        ...settings.print_settings,
        [formatKey]: {
          ...settings.print_settings?.[formatKey],
          [field]: value,
        },
      },
    });
  };

  if (!allowed) {
    return <div style={{ padding: 24, color: theme.text }}>فقط مدیر سیستم یا سردبیر اخبار دسترسی دارد.</div>;
  }

  return (
    <FormPageLayout title="تنظیمات گزارش اخبار" documentTitle="تنظیمات گزارش اخبار">
      {err && <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ color: "#4ade80", marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "settings", label: "تنظیمات سیستم" },
          { id: "print", label: "تنظیمات چاپ" },
          { id: "pack", label: "پک خروجی" },
          { id: "workflow_filters", label: "فیلترهای پیش‌فرض" },
          { id: "templates", label: "قالب‌ها" },
          { id: "custom_prompt", label: "تحلیل شخصی" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${theme.border}`,
              background: tab === t.id ? "#0ea5e9" : theme.card,
              color: tab === t.id ? "#fff" : theme.text,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Loader2 className="spin" /> : null}

      {!loading && tab === "settings" && settings && (
        <div style={{ maxWidth: PAGE_NARROW_MAX }}>
          {[
            ["system_name", "نام سامانه"],
            ["organization_name", "نام سازمان"],
            ["system_link", "لینک سامانه"],
            ["default_label", "عنوان پیش‌فرض گزارش"],
            ["report_color", "رنگ گزارش"],
            ["signature_text", "متن امضا"],
            ["hashtags", "هشتگ‌ها"],
          ].map(([key, label]) => (
            <div key={key}>
              <label>{label}</label>
              {key === "hashtags" || key === "signature_text" ? (
                <textarea
                  rows={3}
                  style={inp(theme)}
                  value={settings[key] || ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              ) : (
                <input
                  style={inp(theme)}
                  value={settings[key] || ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره تنظیمات
          </button>
        </div>
      )}

      {!loading && tab === "print" && settings && (
        <div style={{ maxWidth: PAGE_SETTINGS_SECTION_MAX }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => resetField("print_settings")} style={btnGhost(theme)}>
              <RotateCcw size={14} /> بازنشانی همه فرمت‌ها
            </button>
          </div>
          {PRINT_FORMATS.map(({ key, label }) => {
            const ps = settings.print_settings?.[key] || {};
            return (
              <div key={key} style={{ padding: 14, marginBottom: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.card }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <strong>{label}</strong>
                  <button type="button" onClick={() => resetPrintFormat(key)} style={btnGhost(theme)}>
                    <RotateCcw size={14} /> پیش‌فرض
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12 }}>اندازه کاغذ</label>
                    <select
                      style={inp(theme)}
                      value={ps.paper_size || "A4"}
                      onChange={(e) => updatePrintField(key, "paper_size", e.target.value)}
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                    </select>
                  </div>
                  {[
                    ["margin_top", "مارجین بالا (mm)"],
                    ["margin_bottom", "مارجین پایین (mm)"],
                    ["margin_left", "مارجین چپ (mm)"],
                    ["margin_right", "مارجین راست (mm)"],
                  ].map(([field, flabel]) => (
                    <div key={field}>
                      <label style={{ fontSize: 12 }}>{flabel}</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        style={inp(theme)}
                        value={ps[field] ?? 10}
                        onChange={(e) => updatePrintField(key, field, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره تنظیمات چاپ
          </button>
        </div>
      )}

      {!loading && tab === "pack" && settings && (
        <div style={{ maxWidth: PAGE_SETTINGS_SECTION_MAX }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => resetField("pack_defaults")} style={btnGhost(theme)}>
              <RotateCcw size={14} /> بازنشانی پیش‌فرض پک
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>تحویل پیش‌فرض</label>
            <select
              style={inp(theme)}
              value={settings.pack_defaults?.default_delivery || "zip"}
              onChange={(e) => setSettings({
                ...settings,
                pack_defaults: { ...settings.pack_defaults, default_delivery: e.target.value },
              })}
            >
              <option value="zip">ZIP (یکجا)</option>
              <option value="separate">فایل‌های جداگانه</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>سبک نام فایل</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { value: "full_fa", label: "فارسی کامل (پیش‌فرض)" },
                { value: "full_en", label: "انگلیسی کامل" },
              ].map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="filename_style"
                    checked={(settings.pack_defaults?.filename_style || "full_fa") === opt.value}
                    onChange={() => setSettings({
                      ...settings,
                      pack_defaults: { ...settings.pack_defaults, filename_style: opt.value },
                    })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
              در نام فارسی: ک = کاغذ کوچک (A5)، ب = کاغذ بزرگ (A4)
            </p>
          </div>

          {(settings.pack_defaults?.pack_types || []).map((pt, index) => (
            <div key={pt.key} style={{ padding: 14, marginBottom: 12, border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.card }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12 }}>برچسب</label>
                  <input style={inp(theme)} value={pt.label || ""} onChange={(e) => updatePackType(index, { label: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>slug نام فایل (فارسی)</label>
                  <input style={inp(theme)} value={pt.file_slug || ""} onChange={(e) => updatePackType(index, { file_slug: e.target.value })} />
                </div>
              </div>
              {pt.help != null && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12 }}>راهنما (tooltip)</label>
                  <input style={inp(theme)} value={pt.help || ""} onChange={(e) => updatePackType(index, { help: e.target.value })} />
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={pt.enabled_by_default !== false}
                  onChange={(e) => updatePackType(index, { enabled_by_default: e.target.checked })}
                />
                فعال به‌صورت پیش‌فرض در مرحله تولید
              </label>
              <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>فرمت‌های پیش‌فرض</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PACK_FORMAT_OPTIONS.map((fmt) => (
                  <label key={fmt.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={(pt.format_keys || []).includes(fmt.key)}
                      onChange={() => togglePackTypeFormat(index, fmt.key)}
                    />
                    {fmt.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره تنظیمات پک
          </button>
        </div>
      )}

      {!loading && tab === "workflow_filters" && settings && (
        <div style={{ maxWidth: PAGE_MEDIUM_MAX }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => resetField("report_default_filters")} style={btnGhost(theme)}>
              <RotateCcw size={14} /> بازنشانی فیلترها
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>تکراری‌ها</label>
            <select
              style={inp(theme)}
              value={settings.report_default_filters?.duplicate || "exclude"}
              onChange={(e) => updateWorkflowFilter("duplicate", e.target.value)}
            >
              <option value="exclude">حذف تکراری‌ها</option>
              <option value="only">فقط تکراری‌ها</option>
              <option value="all">همه</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>وضعیت‌های مجاز</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {WORKFLOW_STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(settings.report_default_filters?.statuses || []).includes(opt.value)}
                    onChange={() => toggleWorkflowStatus(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>کیفیت (بدون نامعتبر = ۱)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[2, 3, 4, 5].map((q) => (
                <label key={q} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(settings.report_default_filters?.qualities || []).includes(q)}
                    onChange={() => toggleWorkflowIntFilter("qualities", q)}
                  />
                  {q}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>اهمیت (بدون فاقد اهمیت = ۴)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { v: 1, label: "فوری (۱)" },
                { v: 2, label: "مهم (۲)" },
                { v: 3, label: "معمولی (۳)" },
              ].map((opt) => (
                <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(settings.report_default_filters?.priorities || []).includes(opt.v)}
                    onChange={() => toggleWorkflowIntFilter("priorities", opt.v)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره فیلترهای پیش‌فرض
          </button>
        </div>
      )}

      {!loading && tab === "templates" && settings && defaults && (
        <div style={{ maxWidth: PAGE_WIDE_MAX }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, opacity: 0.85, lineHeight: 1.8 }}>
            قالب را انتخاب کنید؛ متن قابل ویرایش است و پیش‌نمایش خروجی (از جمله HTML) بلافاصله زیر آن نمایش داده می‌شود.
            نمونه قالب پیش‌فرض سیستم نیز در پایین هر قالب قابل مشاهده است.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
              padding: 10,
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: theme.card,
            }}
          >
            {TEMPLATE_FIELDS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTemplateKey(key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  border: `1px solid ${activeTemplateKey === key ? "#0ea5e9" : theme.border}`,
                  background: activeTemplateKey === key ? "rgba(14,165,233,0.15)" : "transparent",
                  color: activeTemplateKey === key ? "#0ea5e9" : theme.text,
                  fontWeight: activeTemplateKey === key ? 700 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {!activeTemplateKey ? (
            <div style={{ padding: 24, textAlign: "center", opacity: 0.65, fontSize: 13, border: `1px dashed ${theme.border}`, borderRadius: 10 }}>
              برای ویرایش، یکی از قالب‌های بالا را انتخاب کنید.
            </div>
          ) : (
            (() => {
              const active = TEMPLATE_FIELDS.find((f) => f.key === activeTemplateKey);
              if (!active) return null;
              return (
                <TemplateField
                  key={active.key}
                  fieldKey={active.key}
                  label={active.label}
                  rows={active.rows}
                  help={active.help}
                  html={active.html}
                  value={settings[active.key]}
                  defaultValue={defaults[active.key]}
                  settings={settings}
                  theme={theme}
                  onChange={(val) => setSettings({ ...settings, [active.key]: val })}
                  onReset={() => resetField(active.key)}
                />
              );
            })()
          )}

          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", marginTop: 8 }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره قالب‌ها
          </button>
        </div>
      )}

      {!loading && tab === "custom_prompt" && settings && (
        <div style={{ maxWidth: PAGE_NARROW_MAX }}>
          <p style={{ fontSize: 13, color: theme.text, lineHeight: 1.8, marginBottom: 14 }}>
            این الزامات به‌صورت خودکار به پرامپت شخصی کاربران اضافه می‌شود تا خروجی کوتاه، مستقیم و مبتنی بر اخبار باشد.
          </p>
          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => resetField("custom_prompt_policy")} style={btnGhost(theme)}>
              <RotateCcw size={14} /> بازنشانی پیش‌فرض
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.custom_prompt_policy?.enabled !== false}
              onChange={(e) => updatePolicyField("enabled", e.target.checked)}
            />
            فعال‌سازی الزامات سیستمی روی پرامپت شخصی
          </label>
          <label>حداکثر کاراکتر خروجی</label>
          <input
            type="number"
            min={50}
            max={2000}
            style={inp(theme)}
            value={settings.custom_prompt_policy?.max_output_chars ?? 300}
            onChange={(e) => updatePolicyField("max_output_chars", Number(e.target.value))}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.custom_prompt_policy?.no_extra_explanation !== false}
              onChange={(e) => updatePolicyField("no_extra_explanation", e.target.checked)}
            />
            فقط خروجی نهایی — بدون توضیح اضافه
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.custom_prompt_policy?.source_only !== false}
              onChange={(e) => updatePolicyField("source_only", e.target.checked)}
            />
            فقط از اطلاعات اخبار موجود — بدون افزودن از خود مدل
          </label>
          <label>قوانین اضافه (اختیاری)</label>
          <textarea
            rows={4}
            style={inp(theme)}
            value={settings.custom_prompt_policy?.extra_rules_fa || ""}
            onChange={(e) => updatePolicyField("extra_rules_fa", e.target.value)}
            placeholder="مثال: از ایموجی استفاده نکن."
          />
          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره سیاست تحلیل شخصی
          </button>
        </div>
      )}
    </FormPageLayout>
  );
}
