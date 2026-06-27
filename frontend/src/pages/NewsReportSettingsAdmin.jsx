import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import newsReportAdminService from "../services/newsReportAdminService.js";
import { getSessionRoles, hasRole } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { buildTemplatePreview } from "./newsReport/templatePreviewUtils.js";

const PRINT_FORMATS = [
  { key: "html_card", label: "HTML کارت" },
  { key: "html_table", label: "HTML جدول" },
  { key: "txt", label: "TXT متن" },
  { key: "pdf_a5_card", label: "PDF A5 کارت" },
  { key: "pdf_a5_table", label: "PDF A5 جدول" },
  { key: "pdf_a4", label: "PDF A4" },
];

const TEMPLATE_FIELDS = [
  { key: "messenger_template", label: "قالب پیام گزارش", rows: 8, help: "{{label}} {{report_date}} {{display_from}} {{display_to}} {{news_list}} {{signature}} {{hashtags}}" },
  { key: "news_item_template", label: "قالب هر خبر در پیام", rows: 5, help: "{{index}} {{news_date}} {{news_time}} {{news_source}} {{news_text}}" },
  { key: "html_card_template", label: "قالب HTML کارت", rows: 14, help: "{{label}} {{color}} {{meta}} {{cards}}" },
  { key: "html_table_template", label: "قالب HTML جدول", rows: 14, help: "{{label}} {{color}} {{org_block}} {{meta}} {{table_rows}}" },
  { key: "txt_output_template", label: "قالب TXT خروجی", rows: 8, help: "{{label}} {{report_date}} {{display_from}} {{display_to}} {{news_count_text}} {{news_list}}" },
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

const templateTextareaStyle = (theme) => ({
  ...inp(theme),
  direction: "ltr",
  textAlign: "left",
  unicodeBidi: "plaintext",
  fontFamily: "Consolas, Monaco, 'Courier New', monospace",
  fontSize: 12,
  lineHeight: 1.5,
});

function TemplateField({ fieldKey, label, rows, help, value, settings, theme, onChange, onReset }) {
  const [showPreview, setShowPreview] = useState(true);
  const preview = useMemo(
    () => buildTemplatePreview(fieldKey, value, settings),
    [fieldKey, value, settings],
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <label style={{ fontWeight: 600 }}>{label}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowPreview((v) => !v)} style={btnGhost(theme)}>
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? "پنهان کردن پیش‌نمایش" : "پیش‌نمایش"}
          </button>
          <button type="button" onClick={onReset} style={btnGhost(theme)}>
            <RotateCcw size={14} /> بازنشانی
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6, direction: "ltr", textAlign: "left" }}>
        placeholders: {help}
      </div>
      <textarea
        rows={rows}
        dir="ltr"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        data-lt-installed="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={templateTextareaStyle(theme)}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {showPreview && (
        <div style={{ marginTop: 10, border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden", background: theme.card }}>
          <div style={{ padding: "6px 10px", fontSize: 11, opacity: 0.7, borderBottom: `1px solid ${theme.border}` }}>
            پیش‌نمایش (داده نمونه)
          </div>
          {preview.type === "html" ? (
            <iframe
              title={`preview-${fieldKey}`}
              srcDoc={preview.content}
              sandbox=""
              style={{ width: "100%", height: 320, border: "none", display: "block", background: "#fff" }}
            />
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                lineHeight: 1.6,
                direction: "rtl",
                textAlign: "right",
                fontFamily: "Tahoma, Vazirmatn, Arial, sans-serif",
                maxHeight: 280,
                overflow: "auto",
                color: theme.text,
              }}
            >
              {preview.content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsReportSettingsAdmin() {
  const navigate = useNavigate();
  const allowed = hasRole(getSessionRoles(), "admin");
  const { isDarkMode } = useAppTheme();
  const [tab, setTab] = useState("settings");
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

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
    setSettings({ ...settings, [key]: defaults[key] });
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
    return <div style={{ padding: 24, color: theme.text }}>فقط مدیر سیستم دسترسی دارد.</div>;
  }

  return (
    <FormPageLayout title="تنظیمات گزارش اخبار" documentTitle="تنظیمات گزارش اخبار">
      {err && <div style={{ color: "#f87171", marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ color: "#4ade80", marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "settings", label: "تنظیمات سیستم" },
          { id: "print", label: "تنظیمات چاپ" },
          { id: "templates", label: "قالب‌ها" },
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
        <div style={{ maxWidth: 640 }}>
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
        <div style={{ maxWidth: 900 }}>
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

      {!loading && tab === "templates" && settings && (
        <div style={{ maxWidth: 960 }}>
          {TEMPLATE_FIELDS.map(({ key, label, rows, help }) => (
            <TemplateField
              key={key}
              fieldKey={key}
              label={label}
              rows={rows}
              help={help}
              value={settings[key]}
              settings={settings}
              theme={theme}
              onChange={(val) => setSettings({ ...settings, [key]: val })}
              onReset={() => resetField(key)}
            />
          ))}
          <button type="button" disabled={saving} onClick={saveSettings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer" }}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            ذخیره قالب‌ها
          </button>
        </div>
      )}
    </FormPageLayout>
  );
}
