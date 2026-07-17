import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ScrollText, Plus, Sparkles, Send } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import commandCenterService from "../../services/commandCenterService.js";

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" };

export default function CommandStrategicOutputs() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const roles = getSessionRoles();
  const canManage = hasPermission(roles, "command_outputs_manage");

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#e11d48",
  }), [isDarkMode]);

  const [types, setTypes] = useState({});
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [createForm, setCreateForm] = useState({
    output_type: "soft_war_annex",
    title: "",
    content_text: "",
  });
  const [genForm, setGenForm] = useState({
    title: "",
    period_label: "",
    source_summary: "",
    extra_notes: "",
    previous_output_id: "",
  });

  const reload = async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        commandCenterService.outputMeta(),
        commandCenterService.listOutputs(),
      ]);
      setTypes(meta?.types || {});
      setItems(Array.isArray(list?.items) ? list.items : []);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const openDetail = async (id) => {
    try {
      const row = await commandCenterService.getOutput(id);
      setSelected(row);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const createManual = async () => {
    setBusy(true);
    try {
      const row = await commandCenterService.createOutput(createForm);
      setShowCreate(false);
      setCreateForm({ output_type: "soft_war_annex", title: "", content_text: "" });
      await reload();
      setSelected(row);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const generateAi = async () => {
    setBusy(true);
    try {
      const data = await commandCenterService.generateSoftWarAnnex({
        ...genForm,
        previous_output_id: genForm.previous_output_id || undefined,
      });
      setShowGenerate(false);
      await reload();
      setSelected(data.output);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await commandCenterService.publishOutput(selected.id, []);
      setSelected(data.output);
      await reload();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const cj = selected?.content_json || {};

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, direction: "rtl" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate("/command")}
              style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}
            >
              <ArrowRight size={16} style={{ verticalAlign: "middle" }} /> مرکز فرماندهی
            </button>
            <ScrollText size={22} color={theme.accent} />
            <h1 style={{ margin: 0, fontSize: 20 }}>خروجی‌های راهبردی</h1>
          </div>
          {canManage ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowCreate(true)} style={btn(theme)}>
                <Plus size={14} /> پیش‌نویس دستی
              </button>
              <button type="button" onClick={() => setShowGenerate(true)} style={{ ...btn(theme), background: theme.accent, color: "#fff", borderColor: theme.accent }}>
                <Sparkles size={14} /> تولید پیوست جنگ نرم
              </button>
            </div>
          ) : null}
        </div>

        {error ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div> : null}
        {loading ? <div style={{ color: theme.muted }}>در حال بارگذاری…</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.1fr" : "1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDetail(item.id)}
                style={{
                  textAlign: "right",
                  background: selected?.id === item.id ? "rgba(225,29,72,0.08)" : theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: 12,
                  cursor: "pointer",
                  color: theme.text,
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
                  {types[item.output_type] || item.output_type}
                  {" · "}
                  {STATUS_LABEL[item.status] || item.status}
                  {" · "}
                  {item.created_at ? toPersianDigits(new Date(item.created_at).toLocaleDateString("fa-IR")) : ""}
                </div>
              </button>
            ))}
            {!loading && !items.length ? (
              <div style={{ color: theme.muted, padding: 20 }}>خروجی‌ای ثبت نشده است</div>
            ) : null}
          </div>

          {selected ? (
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>{selected.title}</h2>
                  <div style={{ fontSize: 12, color: theme.muted }}>
                    {types[selected.output_type] || selected.output_type} · {STATUS_LABEL[selected.status] || selected.status}
                  </div>
                </div>
                {canManage && selected.status === "draft" ? (
                  <button type="button" disabled={busy} onClick={publish} style={{ ...btn(theme), background: "#22c55e", color: "#fff", borderColor: "#22c55e" }}>
                    <Send size={14} /> انتشار
                  </button>
                ) : null}
              </div>

              {selected.output_type === "soft_war_annex" ? (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  <Section title="سیاست‌ها" body={cj.policies || ""} theme={theme} />
                  <Section title="راهکارهای اجرایی" body={cj.executive_solutions || ""} theme={theme} />
                  <Section title="اقدامات لازم" body={cj.required_actions || ""} theme={theme} />
                  {!cj.policies && selected.content_text ? (
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.8, fontFamily: "inherit" }}>{selected.content_text}</pre>
                  ) : null}
                </div>
              ) : (
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.8, fontFamily: "inherit", marginTop: 14 }}>
                  {selected.content_text || "—"}
                </pre>
              )}
            </div>
          ) : null}
        </div>

        {showCreate ? (
          <Modal title="پیش‌نویس خروجی" onClose={() => setShowCreate(false)} theme={theme}>
            <label style={labelStyle}>نوع</label>
            <select
              value={createForm.output_type}
              onChange={(e) => setCreateForm((f) => ({ ...f, output_type: e.target.value }))}
              style={inputStyle(theme)}
            >
              {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label style={labelStyle}>عنوان</label>
            <input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle(theme)} />
            <label style={labelStyle}>متن</label>
            <textarea rows={8} value={createForm.content_text} onChange={(e) => setCreateForm((f) => ({ ...f, content_text: e.target.value }))} style={inputStyle(theme)} />
            <button type="button" disabled={busy} onClick={createManual} style={{ ...btn(theme), marginTop: 10, background: theme.accent, color: "#fff", borderColor: theme.accent }}>
              ذخیره
            </button>
          </Modal>
        ) : null}

        {showGenerate ? (
          <Modal title="تولید پیوست جنگ نرم با هوش‌افزار" onClose={() => setShowGenerate(false)} theme={theme}>
            <label style={labelStyle}>عنوان</label>
            <input value={genForm.title} onChange={(e) => setGenForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle(theme)} placeholder="اختیاری" />
            <label style={labelStyle}>برچسب دوره</label>
            <input value={genForm.period_label} onChange={(e) => setGenForm((f) => ({ ...f, period_label: e.target.value }))} style={inputStyle(theme)} placeholder="مثلاً هفته اول تیر ۱۴۰۵" />
            <label style={labelStyle}>خلاصه منابع / ورودی</label>
            <textarea rows={5} value={genForm.source_summary} onChange={(e) => setGenForm((f) => ({ ...f, source_summary: e.target.value }))} style={inputStyle(theme)} />
            <label style={labelStyle}>یادداشت اضافی</label>
            <textarea rows={3} value={genForm.extra_notes} onChange={(e) => setGenForm((f) => ({ ...f, extra_notes: e.target.value }))} style={inputStyle(theme)} />
            <label style={labelStyle}>نسخه قبلی برای غنی‌سازی (شناسه)</label>
            <input value={genForm.previous_output_id} onChange={(e) => setGenForm((f) => ({ ...f, previous_output_id: e.target.value }))} style={inputStyle(theme)} placeholder="اختیاری" />
            <button type="button" disabled={busy} onClick={generateAi} style={{ ...btn(theme), marginTop: 10, background: theme.accent, color: "#fff", borderColor: theme.accent }}>
              {busy ? "در حال تولید…" : "تولید"}
            </button>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, body, theme }) {
  if (!body) return null;
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: theme.accent, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{body}</div>
    </div>
  );
}

function Modal({ title, onClose, theme, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: theme.card, color: theme.text, borderRadius: 12, border: `1px solid ${theme.border}`, width: "min(520px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>{title}</strong>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, margin: "8px 0 4px" };
const inputStyle = (theme) => ({
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  background: theme.bg,
  color: theme.text,
  fontFamily: "inherit",
  boxSizing: "border-box",
});
const btn = (theme) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: `1px solid ${theme.border}`,
  color: theme.text,
  borderRadius: 8,
  padding: "7px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
});
