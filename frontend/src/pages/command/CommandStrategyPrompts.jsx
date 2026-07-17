import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePenLine, Save } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import commandCenterService from "../../services/commandCenterService.js";

export default function CommandStrategyPrompts() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#e11d48",
  }), [isDarkMode]);

  const [items, setItems] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [form, setForm] = useState({ title_fa: "", description_fa: "", body: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    try {
      const data = await commandCenterService.listPrompts();
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      if (!selectedKey && list[0]?.prompt_key) {
        setSelectedKey(list[0].prompt_key);
      }
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (!selectedKey) return;
    commandCenterService.getPrompt(selectedKey)
      .then((row) => setForm({
        title_fa: row.title_fa || "",
        description_fa: row.description_fa || "",
        body: row.body || "",
      }))
      .catch((e) => setError(e?.response?.data?.error || e.message));
  }, [selectedKey]);

  const save = async () => {
    if (!selectedKey) return;
    setBusy(true);
    try {
      await commandCenterService.savePrompt(selectedKey, form);
      await loadList();
      alert("پرامپت ذخیره شد");
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, direction: "rtl" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 14px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => navigate("/command")}
            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}
          >
            <ArrowRight size={16} style={{ verticalAlign: "middle" }} /> مرکز فرماندهی
          </button>
          <FilePenLine size={22} color={theme.accent} />
          <h1 style={{ margin: 0, fontSize: 20 }}>پرامپت‌های راهبردی</h1>
        </div>

        <p style={{ color: theme.muted, fontSize: 13, marginTop: 0 }}>
          فقط پرامپت‌های با پیشوند <code>strategy.</code> — جدا از پرامپت‌های عملیاتی سامانه
        </p>

        {error ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 8 }}>
            {items.map((item) => (
              <button
                key={item.prompt_key}
                type="button"
                onClick={() => setSelectedKey(item.prompt_key)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  background: selectedKey === item.prompt_key ? "rgba(225,29,72,0.1)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 8px",
                  cursor: "pointer",
                  color: theme.text,
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>{item.title_fa || item.prompt_key}</div>
                <div style={{ color: theme.muted, fontSize: 10, marginTop: 2 }}>{item.prompt_key}</div>
              </button>
            ))}
            {!items.length ? <div style={{ color: theme.muted, fontSize: 12, padding: 8 }}>پرامپتی نیست — ابتدا migration را اجرا کنید</div> : null}
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
            {!selectedKey ? (
              <div style={{ color: theme.muted }}>یک پرامپت انتخاب کنید</div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>عنوان</label>
                <input
                  value={form.title_fa}
                  onChange={(e) => setForm((f) => ({ ...f, title_fa: e.target.value }))}
                  style={field(theme)}
                />
                <label style={{ display: "block", fontSize: 12, margin: "10px 0 4px" }}>توضیح</label>
                <input
                  value={form.description_fa}
                  onChange={(e) => setForm((f) => ({ ...f, description_fa: e.target.value }))}
                  style={field(theme)}
                />
                <label style={{ display: "block", fontSize: 12, margin: "10px 0 4px" }}>بدنه پرامپت</label>
                <textarea
                  rows={16}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  style={{ ...field(theme), resize: "vertical", lineHeight: 1.7 }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={save}
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: theme.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    cursor: busy ? "wait" : "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                  }}
                >
                  <Save size={14} /> ذخیره
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const field = (theme) => ({
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  background: theme.bg,
  color: theme.text,
  fontFamily: "inherit",
  boxSizing: "border-box",
});
