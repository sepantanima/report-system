import React, { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import fieldReportAdminService from "../../services/fieldReportAdminService.js";
import newsEntryAdminService from "../../services/newsEntryAdminService.js";
import messageAdminService from "../../services/messageAdminService.js";
import { DEFAULT_DAILY_SUBMISSION_LIMIT as FIELD_DEFAULT_LIMIT } from "../../constants/fieldFieldLimits.js";
import { DEFAULT_DAILY_SUBMISSION_LIMIT as NEWS_DEFAULT_LIMIT } from "../../constants/newsFieldLimits.js";
import { DEFAULT_MESSAGE_SETTINGS } from "../../constants/messageFieldLimits.js";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

function panelInput(theme) {
  return {
    width: "100%",
    maxWidth: 220,
    padding: 10,
    borderRadius: 8,
    background: theme.input,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
}

function PanelCard({ theme, title, children }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
      {title ? <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{title}</h4> : null}
      {children}
    </div>
  );
}

function SaveRow({ theme, saving, onSave, onReset, saveLabel = "ذخیره" }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          background: "#0ea5e9",
          color: "#fff",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
        {saveLabel}
      </button>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <RotateCcw size={16} /> بازنشانی به پیش‌فرض
        </button>
      ) : null}
    </div>
  );
}

export function MessagingQuickLinksPanel({ navigate, theme }) {
  const roles = getSessionRoles();
  const canInbox = hasPermission(roles, "messages");
  const canAnnounce = hasPermission(roles, "manage_announcements");

  if (!canInbox && !canAnnounce) return null;

  return (
    <PanelCard theme={theme} title="دسترسی سریع">
      <p style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.8, marginTop: 0 }}>
        صندوق پیام، ابلاغ بنری و رسید مشاهده از این بخش در دسترس است.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {canInbox ? (
          <button
            type="button"
            onClick={() => navigate("/messages")}
            className="submitBtn"
            style={{ height: 44, background: "linear-gradient(45deg, #0ea5e9, #38bdf8)", border: "none", color: "#fff", fontWeight: "bold", borderRadius: 10 }}
          >
            صندوق پیام‌ها
          </button>
        ) : null}
        {canAnnounce ? (
          <button
            type="button"
            onClick={() => navigate("/messages/compose")}
            className="submitBtn"
            style={{ height: 44, background: "linear-gradient(45deg, #f59e0b, #ef4444)", border: "none", color: "#fff", fontWeight: "bold", borderRadius: 10 }}
          >
            صدور ابلاغ
          </button>
        ) : null}
      </div>
    </PanelCard>
  );
}

export function MessageSettingsPanel({ theme }) {
  const allowed = hasPermission(getSessionRoles(), "manage_message_settings");
  const [settings, setSettings] = useState({ ...DEFAULT_MESSAGE_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setSettings(await messageAdminService.getSettings());
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  if (!allowed) return null;

  const inp = panelInput(theme);
  const fields = [
    ["max_direct_per_day", "حداکثر پیام مستقیم در روز (هر کاربر)"],
    ["max_direct_per_hour", "حداکثر پیام مستقیم در ساعت"],
    ["max_announcements_per_day", "حداکثر ابلاغ در روز (هر مدیر)"],
  ];

  const save = async () => {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const s = await messageAdminService.updateSettings(settings);
      setSettings(s);
      setMsg("ذخیره شد.");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelCard theme={theme} title="سقف تعداد پیام و ابلاغ">
      {loading ? <Loader2 className="spin" /> : null}
      {err ? <div style={{ color: "#f87171", marginBottom: 12, fontSize: 13 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#34d399", marginBottom: 12, fontSize: 13 }}>{msg}</div> : null}
      {!loading && (
        <>
          <p style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.8, marginTop: 0 }}>
            طول متن پیام ثابت {toPersianDigits("500")} کاراکتر است. مقدار {toPersianDigits("0")} = بدون محدودیت تعداد.
          </p>
          {fields.map(([key, label]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{label}</label>
              <input
                type="number"
                min={0}
                style={inp}
                value={settings[key] ?? 0}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
          <SaveRow theme={theme} saving={saving} onSave={save} onReset={() => setSettings({ ...DEFAULT_MESSAGE_SETTINGS })} />
        </>
      )}
    </PanelCard>
  );
}

export function FieldReportSettingsPanel({ theme }) {
  const allowed = hasPermission(getSessionRoles(), "manage_field_entry_limits");
  const [limit, setLimit] = useState(FIELD_DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const s = await fieldReportAdminService.getSettings();
      setLimit(s.max_submissions_per_day ?? FIELD_DEFAULT_LIMIT);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  if (!allowed) return null;

  const save = async () => {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const val = parseInt(limit, 10);
      if (!Number.isFinite(val) || val < 0) {
        setErr("مقدار باید عدد صفر یا بزرگ‌تر باشد.");
        return;
      }
      const s = await fieldReportAdminService.updateSettings({ max_submissions_per_day: val });
      setLimit(s.max_submissions_per_day);
      setMsg("تنظیمات ذخیره شد.");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelCard theme={theme} title="سقف ثبت گزارش میدانی">
      {loading ? <Loader2 className="spin" /> : null}
      {err ? <div style={{ color: "#f87171", marginBottom: 12, fontSize: 13 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#34d399", marginBottom: 12, fontSize: 13 }}>{msg}</div> : null}
      {!loading && (
        <>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            حداکثر ثبت گزارش در روز (هر کاربر واحد)
          </label>
          <input type="number" min={0} style={panelInput(theme)} value={limit} onChange={(e) => setLimit(e.target.value)} />
          <p style={{ fontSize: 13, opacity: 0.75, marginTop: 10, lineHeight: 1.8 }}>
            پیش‌فرض: {toPersianDigits(String(FIELD_DEFAULT_LIMIT))} گزارش در روز.
            مقدار {toPersianDigits("0")} یعنی بدون محدودیت. مدیر میدانی و مدیر کل معاف هستند.
          </p>
          <SaveRow theme={theme} saving={saving} onSave={save} onReset={() => setLimit(FIELD_DEFAULT_LIMIT)} />
        </>
      )}
    </PanelCard>
  );
}

export function NewsEntrySettingsPanel({ theme }) {
  const allowed = hasPermission(getSessionRoles(), "manage_news_entry_limits");
  const [limit, setLimit] = useState(NEWS_DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const s = await newsEntryAdminService.getSettings();
      setLimit(s.max_submissions_per_day ?? NEWS_DEFAULT_LIMIT);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  if (!allowed) return null;

  const save = async () => {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const val = parseInt(limit, 10);
      if (!Number.isFinite(val) || val < 0) {
        setErr("مقدار باید عدد صفر یا بزرگ‌تر باشد.");
        return;
      }
      const s = await newsEntryAdminService.updateSettings({ max_submissions_per_day: val });
      setLimit(s.max_submissions_per_day);
      setMsg("تنظیمات ذخیره شد.");
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelCard theme={theme} title="سقف ورود خبر">
      {loading ? <Loader2 className="spin" /> : null}
      {err ? <div style={{ color: "#f87171", marginBottom: 12, fontSize: 13 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#34d399", marginBottom: 12, fontSize: 13 }}>{msg}</div> : null}
      {!loading && (
        <>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            حداکثر ارسال خبر برای بررسی در روز (هر پایشگر)
          </label>
          <input type="number" min={0} style={panelInput(theme)} value={limit} onChange={(e) => setLimit(e.target.value)} />
          <p style={{ fontSize: 13, opacity: 0.75, marginTop: 10, lineHeight: 1.8 }}>
            پیش‌فرض: {toPersianDigits(String(NEWS_DEFAULT_LIMIT))} خبر در روز.
            مقدار {toPersianDigits("0")} یعنی بدون محدودیت. فقط «ارسال برای بررسی» شمرده می‌شود.
          </p>
          <SaveRow theme={theme} saving={saving} onSave={save} onReset={() => setLimit(NEWS_DEFAULT_LIMIT)} />
        </>
      )}
    </PanelCard>
  );
}

export function MessagingTabContent({ theme, navigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <MessagingQuickLinksPanel navigate={navigate} theme={theme} />
      <MessageSettingsPanel theme={theme} />
    </div>
  );
}
