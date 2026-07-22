import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import {
  PROMPT_FIELD_LIMITS,
  STRATEGY_PROMPT_LIMITS,
  STRATEGY_SYSTEM_PROMPT_KEYS,
} from "../../constants/promptFieldLimits.js";
import commandCenterService from "../../services/commandCenterService.js";

function emptyRefs() {
  return Array.from({ length: STRATEGY_PROMPT_LIMITS.referenceSlotMax }, () => ({
    title: "",
    body: "",
  }));
}

function refsTotalChars(slots) {
  return (slots || []).reduce(
    (sum, s) => sum + String(s?.title || "").length + String(s?.body || "").length,
    0,
  );
}

function suggestSlug(title) {
  const base = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "_")
    .replace(/[\u0600-\u06FF]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || `custom_${Date.now().toString(36)}`;
}

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
  const [maxCount, setMaxCount] = useState(STRATEGY_PROMPT_LIMITS.maxCount);
  const [selectedKey, setSelectedKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState({
    title_fa: "",
    description_fa: "",
    body: "",
    reference_slots: emptyRefs(),
  });
  const [isSystem, setIsSystem] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refChars = refsTotalChars(form.reference_slots);
  const canAdd = items.length < maxCount;

  const loadList = async (preferKey) => {
    try {
      const data = await commandCenterService.listPrompts();
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      if (data?.max_count) setMaxCount(data.max_count);
      const nextKey = preferKey || selectedKey || list[0]?.prompt_key || "";
      if (nextKey && list.some((x) => x.prompt_key === nextKey)) {
        setSelectedKey(nextKey);
      } else if (list[0]?.prompt_key) {
        setSelectedKey(list[0].prompt_key);
      } else {
        setSelectedKey("");
      }
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (creating || !selectedKey) return;
    commandCenterService.getPrompt(selectedKey)
      .then((row) => {
        const slots = Array.isArray(row.reference_slots) ? row.reference_slots : [];
        const padded = emptyRefs().map((empty, i) => ({
          title: slots[i]?.title || "",
          body: slots[i]?.body || "",
        }));
        setForm({
          title_fa: row.title_fa || "",
          description_fa: row.description_fa || "",
          body: row.body || "",
          reference_slots: padded,
        });
        setIsSystem(!!row.is_system || STRATEGY_SYSTEM_PROMPT_KEYS.includes(selectedKey));
        setError("");
      })
      .catch((e) => setError(e?.response?.data?.error || e.message));
  }, [selectedKey, creating]);

  const startCreate = () => {
    if (!canAdd) return;
    setCreating(true);
    setSelectedKey("");
    setIsSystem(false);
    setSlug("");
    setForm({
      title_fa: "",
      description_fa: "",
      body: "",
      reference_slots: emptyRefs(),
    });
  };

  const cancelCreate = () => {
    setCreating(false);
    if (items[0]?.prompt_key) setSelectedKey(items[0].prompt_key);
  };

  const updateSlot = (idx, patch) => {
    setForm((f) => {
      const next = [...f.reference_slots];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, reference_slots: next };
    });
  };

  const save = async () => {
    if (refChars > STRATEGY_PROMPT_LIMITS.referenceTotalChars) {
      alert(`مجموع مراجع حداکثر ${STRATEGY_PROMPT_LIMITS.referenceTotalChars.toLocaleString("fa-IR")} کاراکتر است`);
      return;
    }
    if (!String(form.body || "").trim()) {
      alert("متن پرامپت الزامی است");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title_fa: form.title_fa,
        description_fa: form.description_fa,
        body: form.body,
        reference_slots: form.reference_slots.filter((s) => s.title || s.body),
      };
      if (creating) {
        const keySlug = slug.trim() || suggestSlug(form.title_fa);
        const row = await commandCenterService.createPrompt({
          ...payload,
          prompt_key: keySlug.startsWith("strategy.") ? keySlug : `strategy.${keySlug}`,
          slug: keySlug,
        });
        setCreating(false);
        await loadList(row.prompt_key);
        alert("پرامپت ساخته شد");
      } else {
        if (!selectedKey) return;
        await commandCenterService.savePrompt(selectedKey, payload);
        await loadList(selectedKey);
        alert("پرامپت ذخیره شد");
      }
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedKey || isSystem) return;
    if (!window.confirm(`پرامپت «${selectedKey}» حذف شود؟`)) return;
    setBusy(true);
    try {
      await commandCenterService.deletePrompt(selectedKey);
      setCreating(false);
      await loadList("");
      alert("حذف شد");
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

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
            <FilePenLine size={22} color={theme.accent} />
            <h1 style={{ margin: 0, fontSize: 20 }}>پرامپت‌های راهبردی</h1>
          </div>
          <button
            type="button"
            disabled={!canAdd}
            onClick={startCreate}
            title={!canAdd ? `حداکثر ${maxCount} پرامپت` : "افزودن پرامپت"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: canAdd ? theme.accent : theme.border,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: canAdd ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <Plus size={14} /> افزودن پرامپت ({toPersianDigits(items.length)}/{toPersianDigits(maxCount)})
          </button>
        </div>

        <p style={{ color: theme.muted, fontSize: 13, marginTop: 0 }}>
          تا {toPersianDigits(maxCount)} پرامپت با پیشوند <code>strategy.</code> —
          برای هر پرامپت تا {toPersianDigits(STRATEGY_PROMPT_LIMITS.referenceSlotMax)} محتوای مرجع متنی
          (مجموع حداکثر {toPersianDigits(STRATEGY_PROMPT_LIMITS.referenceTotalChars.toLocaleString("en-US"))} کاراکتر).
          آپلود فایل پشتیبانی نمی‌شود؛ متن مرجع را اینجا بچسبانید.
        </p>

        {error ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,240px) 1fr", gap: 14 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 8 }}>
            {creating ? (
              <div style={{ padding: 8, marginBottom: 6, borderRadius: 8, background: "rgba(225,29,72,0.1)", fontSize: 12, fontWeight: 700 }}>
                پرامپت جدید…
              </div>
            ) : null}
            {items.map((item) => (
              <button
                key={item.prompt_key}
                type="button"
                onClick={() => { setCreating(false); setSelectedKey(item.prompt_key); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "right",
                  background: !creating && selectedKey === item.prompt_key ? "rgba(225,29,72,0.1)" : "transparent",
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
            {!items.length && !creating ? (
              <div style={{ color: theme.muted, fontSize: 12, padding: 8 }}>پرامپتی نیست — یکی اضافه کنید یا migration را اجرا کنید</div>
            ) : null}
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
            {!creating && !selectedKey ? (
              <div style={{ color: theme.muted }}>یک پرامپت انتخاب کنید یا جدید بسازید</div>
            ) : (
              <>
                {creating ? (
                  <>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>کلید (انگلیسی، بعد از strategy.)</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: theme.muted, fontSize: 12 }}>strategy.</span>
                      <input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9._]/gi, "_").toLowerCase())}
                        placeholder={suggestSlug(form.title_fa)}
                        style={field(theme)}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: theme.muted, marginBottom: 10 }}>
                    کلید: <code>{selectedKey}</code>
                    {isSystem ? " · سیستمی (غیرقابل حذف)" : ""}
                  </div>
                )}

                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>عنوان</label>
                <input
                  value={form.title_fa}
                  maxLength={PROMPT_FIELD_LIMITS.titleFa}
                  onChange={(e) => setForm((f) => ({ ...f, title_fa: e.target.value }))}
                  style={field(theme)}
                />
                <label style={{ display: "block", fontSize: 12, margin: "10px 0 4px" }}>توضیح</label>
                <input
                  value={form.description_fa}
                  maxLength={PROMPT_FIELD_LIMITS.descriptionFa}
                  onChange={(e) => setForm((f) => ({ ...f, description_fa: e.target.value }))}
                  style={field(theme)}
                />
                <label style={{ display: "block", fontSize: 12, margin: "10px 0 4px" }}>
                  بدنه پرامپت
                  <span style={{ color: theme.muted, fontWeight: 400 }}>
                    {" "}({toPersianDigits(form.body.length)}/{toPersianDigits(PROMPT_FIELD_LIMITS.body)})
                  </span>
                </label>
                <textarea
                  rows={12}
                  value={form.body}
                  maxLength={PROMPT_FIELD_LIMITS.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  style={{ ...field(theme), resize: "vertical", lineHeight: 1.7 }}
                />

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>محتوای مرجع (حداکثر ۳)</strong>
                    <span style={{
                      fontSize: 11,
                      color: refChars > STRATEGY_PROMPT_LIMITS.referenceTotalChars ? "#ef4444" : theme.muted,
                    }}>
                      {toPersianDigits(refChars.toLocaleString("en-US"))}
                      {" / "}
                      {toPersianDigits(STRATEGY_PROMPT_LIMITS.referenceTotalChars.toLocaleString("en-US"))}
                      {" کاراکتر"}
                    </span>
                  </div>
                  {form.reference_slots.map((slot, idx) => (
                    <div key={idx} style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                      <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>مرجع {toPersianDigits(idx + 1)} — عنوان</label>
                      <input
                        value={slot.title}
                        maxLength={STRATEGY_PROMPT_LIMITS.referenceTitleMax}
                        onChange={(e) => updateSlot(idx, { title: e.target.value })}
                        style={field(theme)}
                        placeholder="مثلاً سند دکترین / چارچوب سیاستی"
                      />
                      <label style={{ display: "block", fontSize: 12, margin: "8px 0 4px" }}>متن مرجع</label>
                      <textarea
                        rows={5}
                        value={slot.body}
                        onChange={(e) => updateSlot(idx, { body: e.target.value })}
                        style={{ ...field(theme), resize: "vertical", lineHeight: 1.7 }}
                        placeholder="متن فایل مرجع را اینجا بچسبانید…"
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={save}
                    style={{
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
                    <Save size={14} /> {creating ? "ایجاد" : "ذخیره"}
                  </button>
                  {creating ? (
                    <button type="button" onClick={cancelCreate} style={ghostBtn(theme)}>انصراف</button>
                  ) : null}
                  {!creating && selectedKey && !isSystem ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={remove}
                      style={{ ...ghostBtn(theme), color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}
                    >
                      <Trash2 size={14} /> حذف
                    </button>
                  ) : null}
                </div>
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

const ghostBtn = (theme) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: `1px solid ${theme.border}`,
  color: theme.text,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
});
