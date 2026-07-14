import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
import {
  PLATFORMS,
  createMyMessengerAccount,
  createUserMessengerAccount,
  deleteMessengerAccountAdmin,
  deleteMyMessengerAccount,
  fetchMyMessengerAccounts,
  fetchUserMessengerAccounts,
  getPlatformLabel,
  updateMessengerAccountAdmin,
} from "../../services/messengerAccountService.js";

function emptyForm() {
  return {
    platform: "bale",
    external_username: "",
    display_name: "",
    external_id: "",
  };
}

function panelInput(theme) {
  return {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    background: theme.input,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
}

export default function MessengerAccountsPanel({
  theme,
  mode = "self",
  userId = null,
  title = "اکانت‌های پیام‌رسان",
  description = "یوزرنیم یا نام نمایشی که در بله/تلگرام/ایتا با آن خبر می‌فرستید را ثبت کنید تا در گزارش‌ها به نام شما در سامانه شمرده شود.",
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");

  const isAdmin = mode === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = isAdmin
        ? await fetchUserMessengerAccounts(userId)
        : await fetchMyMessengerAccounts();
      setAccounts(rows);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "خطا در بارگذاری اکانت‌ها");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    if (isAdmin && !userId) return;
    load();
  }, [isAdmin, userId, load]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.platform
      && (form.external_username.trim() || form.display_name.trim() || form.external_id.trim()),
    );
  }, [form]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        platform: form.platform,
        external_username: form.external_username.trim() || null,
        display_name: form.display_name.trim() || null,
        external_id: form.external_id.trim() || null,
      };
      if (isAdmin) {
        await createUserMessengerAccount(userId, { ...payload, is_verified: true });
      } else {
        await createMyMessengerAccount(payload);
      }
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "خطا در ثبت اکانت");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("این اکانت حذف شود؟")) return;
    setSaving(true);
    setError("");
    try {
      if (isAdmin) {
        await deleteMessengerAccountAdmin(id);
      } else {
        await deleteMyMessengerAccount(id);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "خطا در حذف");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (account) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await updateMessengerAccountAdmin(account.id, { is_verified: !account.is_verified });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "خطا در به‌روزرسانی");
    } finally {
      setSaving(false);
    }
  };

  if (isAdmin && !userId) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: theme.text }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: theme.text, opacity: 0.75 }}>{description}</p>
      </div>

      {error ? (
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12 }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, alignItems: "end" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, opacity: 0.8 }}>پلتفرم</label>
          <select
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            style={panelInput(theme)}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, opacity: 0.8 }}>نام کاربری (@ali)</label>
          <input
            type="text"
            value={form.external_username}
            onChange={(e) => setForm((f) => ({ ...f, external_username: e.target.value }))}
            placeholder="ali"
            style={panelInput(theme)}
            dir="ltr"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, opacity: 0.8 }}>نام نمایشی</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder="علیییی"
            style={panelInput(theme)}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, opacity: 0.8 }}>شناسه عددی (اختیاری)</label>
          <input
            type="text"
            value={form.external_id}
            onChange={(e) => setForm((f) => ({ ...f, external_id: e.target.value }))}
            placeholder="2124650591"
            style={panelInput(theme)}
            dir="ltr"
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "#0ea5e9",
            color: "#fff",
            cursor: canSubmit && !saving ? "pointer" : "not-allowed",
            opacity: canSubmit && !saving ? 1 : 0.6,
            fontFamily: "inherit",
            height: 42,
          }}
        >
          {saving ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          افزودن
        </button>
      </form>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.7 }}>
          <Loader2 size={16} className="spin" /> در حال بارگذاری...
        </div>
      ) : accounts.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.65, padding: 12, border: `1px dashed ${theme.border}`, borderRadius: 8 }}>
          هنوز اکانتی ثبت نشده است.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{getPlatformLabel(acc.platform)}</div>
                <div style={{ opacity: 0.85 }}>
                  {acc.external_username ? `@${acc.external_username}` : "—"}
                  {acc.display_name ? ` · ${acc.display_name}` : ""}
                  {acc.external_id ? ` · ID: ${acc.external_id}` : ""}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, opacity: 0.75 }}>
                  {acc.is_verified ? (
                    <>
                      <CheckCircle2 size={12} color="#22c55e" /> تأییدشده
                    </>
                  ) : (
                    <>
                      <Clock size={12} color="#f59e0b" /> در انتظار تأیید
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleVerify(acc)}
                    disabled={saving}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: "transparent",
                      color: theme.text,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "inherit",
                    }}
                  >
                    {acc.is_verified ? "لغو تأیید" : "تأیید"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDelete(acc.id)}
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.35)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "inherit",
                  }}
                >
                  <Trash2 size={14} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin ? (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65, lineHeight: 1.6 }}>
          پس از ثبت، اکانت شما توسط مدیر بررسی می‌شود. تا زمان تأیید، نگاشت ممکن است با تأخیر اعمال شود.
        </p>
      ) : null}
    </div>
  );
}
