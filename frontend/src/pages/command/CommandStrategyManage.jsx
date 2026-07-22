import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, Plus, Save, Send, Sparkles } from "lucide-react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import RichTextEditor from "../../components/analysis/RichTextEditor.jsx";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import {
  RANGE_PRESETS,
  rangeFromPreset,
  dateObjectsToGregorianRange,
  gregorianRangeToDateObjects,
  formatGregorianAsJalali,
  persian,
} from "../../components/command/dashboard/dashboardDateUtils.js";
import persian_fa from "react-date-object/locales/persian_fa";
import commandCenterService from "../../services/commandCenterService.js";
import messengerAdminService from "../../services/messengerAdminService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { strategyContentToDisplayHtml, STRATEGY_HTML_BODY_CSS } from "../../utils/strategyContentFormat.js";

const CONTENT_MAX_LENGTH = 200000;
const STATUS_LABEL = {
  draft: "پیش‌نویس",
  approved: "تأییدشده",
  published: "منتشرشده",
  archived: "بایگانی",
};
const DEFAULT_SOURCES = {
  news_finalized: true,
  field_verified: true,
  analyses: true,
  prior_strategy: true,
};
const SOURCE_LABELS = {
  news_finalized: "اخبار نهایی‌شده",
  field_verified: "رصد میدانی تأییدشده",
  analyses: "تحلیل‌ها",
  prior_strategy: "خروجی‌های راهبردی قبلی",
};

const textToHtml = (value = "") => strategyContentToDisplayHtml(value);

export default function CommandStrategyManage() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const roles = getSessionRoles();
  const canManage = hasPermission(roles, "command_outputs_manage");
  const week = useMemo(() => rangeFromPreset("week"), []);
  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#fff",
    border: isDarkMode ? "rgba(255,255,255,.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#0f172a",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#e11d48",
  }), [isDarkMode]);
  const [types, setTypes] = useState({});
  const [items, setItems] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState({ title: "", content_html: "", content_text: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [createForm, setCreateForm] = useState({
    output_type: "soft_war_annex", title: "", content_html: "", content_text: "",
  });
  const [genForm, setGenForm] = useState({
    prompt_key: "", title: "", extra_notes: "", content_text: "", previous_output_id: "",
    sources: { ...DEFAULT_SOURCES }, from: week.from, to: week.to, preset: "week",
  });
  const [dateRange, setDateRange] = useState(() => gregorianRangeToDateObjects(week.from, week.to));
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const selectOutput = useCallback((row) => {
    setSelected(row);
    const html = strategyContentToDisplayHtml(row?.content_html || row?.content_text || "");
    setEditor({
      title: row?.title || "",
      content_html: html,
      content_text: row?.content_text || "",
    });
  }, []);

  const reload = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [meta, list, promptData] = await Promise.all([
        commandCenterService.outputMeta(),
        commandCenterService.listOutputs(),
        commandCenterService.listPrompts().catch(() => ({ items: [] })),
      ]);
      setTypes(meta?.types || {});
      setItems(Array.isArray(list?.items) ? list.items : []);
      const nextPrompts = Array.isArray(promptData?.items) ? promptData.items : [];
      setPrompts(nextPrompts);
      setGenForm((form) => ({ ...form, prompt_key: form.prompt_key || nextPrompts[0]?.prompt_key || "" }));
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!canManage) return;
    messengerAdminService.listDestinations(MESSENGER_USAGE_KEYS.STRATEGY_OUTPUT_PUBLISH)
      .then((data) => {
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setDestinations(list);
        setSelectedChannels((prev) => (prev.length ? prev : list.slice(0, 1).map((d) => d.id)));
      })
      .catch(() => setDestinations([]));
  }, [canManage]);

  const openDetail = async (id) => {
    try {
      selectOutput(await commandCenterService.getOutput(id));
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    }
  };

  const runPreview = useCallback(async (form) => {
    if (!form.from || !form.to) return;
    setPreviewBusy(true);
    try {
      setPreview(await commandCenterService.previewOutputSources({
        from: form.from, to: form.to, sources: form.sources,
      }));
    } catch (err) {
      setPreview({ error: err?.response?.data?.error || err.message });
    } finally {
      setPreviewBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!showGenerate) return undefined;
    const timer = setTimeout(() => runPreview(genForm), 280);
    return () => clearTimeout(timer);
  }, [showGenerate, genForm.from, genForm.to, genForm.sources, runPreview]);

  const createManual = async () => {
    setBusy(true);
    try {
      const payload = {
        ...createForm,
        content_html: strategyContentToDisplayHtml(createForm.content_html || createForm.content_text || ""),
      };
      const row = await commandCenterService.createOutput(payload);
      setShowCreate(false);
      setCreateForm({ output_type: "soft_war_annex", title: "", content_html: "", content_text: "" });
      await reload();
      selectOutput(row);
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveSelected = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const rawHtml = editor.content_html || editor.content_text || "";
      const content_html = strategyContentToDisplayHtml(rawHtml);
      // #region agent log
      {
        const probe = (s) => ({
          len: String(s || "").length,
          hasSpan: /<span[\s>]/i.test(s || ""),
          hasFont: /<font[\s>]/i.test(s || ""),
          hasStyleAttr: /\sstyle\s*=/i.test(s || ""),
          hasColor: /color\s*[:=]/i.test(s || ""),
          hasFontSize: /font-size|size\s*=/i.test(s || ""),
          hasH2: /<h2[\s>]/i.test(s || ""),
          snippet: String(s || "").slice(0, 280),
        });
        fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
          body: JSON.stringify({
            sessionId: "6de48a",
            runId: "pre-fix",
            hypothesisId: "G",
            location: "CommandStrategyManage.jsx:saveSelected",
            message: "html before/after client sanitize",
            data: { before: probe(rawHtml), after: probe(content_html), id: selected.id },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      const payload = {
        ...editor,
        content_html,
      };
      const row = await commandCenterService.updateOutput(selected.id, payload);
      // #region agent log
      {
        const returned = row?.output?.content_html || row?.content_html || "";
        fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
          body: JSON.stringify({
            sessionId: "6de48a",
            runId: "pre-fix",
            hypothesisId: "H",
            location: "CommandStrategyManage.jsx:saveSelected:response",
            message: "html returned from API after save",
            data: {
              id: selected.id,
              hasSpan: /<span[\s>]/i.test(returned),
              hasFont: /<font[\s>]/i.test(returned),
              hasStyleAttr: /\sstyle\s*=/i.test(returned),
              hasColor: /color\s*[:=]/i.test(returned),
              snippet: String(returned).slice(0, 280),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      selectOutput(row?.output || row);
      await reload();
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await commandCenterService.approveOutput(selected.id);
      selectOutput(data?.output || data);
      await reload();
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    if (!selectedChannels.length) {
      const ok = window.confirm("کانالی انتخاب نشده. فقط وضعیت به «منتشرشده» تغییر کند؟");
      if (!ok) return;
    }
    setBusy(true);
    try {
      const data = await commandCenterService.publishOutput(selected.id, selectedChannels);
      const failed = (data?.messenger_results || []).filter((x) => !x.ok);
      if (failed.length) {
        alert(failed.map((x) => x.error || "خطای ارسال").join("\n"));
      } else if (selectedChannels.length) {
        const parts = data?.messenger_results?.[0]?.parts;
        alert(parts > 1 ? `انتشار در ${toPersianDigits(parts)} بخش انجام شد.` : "انتشار انجام شد.");
      }
      selectOutput(data?.output || data);
      await reload();
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const generateAi = async () => {
    if (!genForm.prompt_key) return alert("یک پرامپت راهبردی انتخاب کنید");
    setBusy(true);
    setAiBusy(true);
    try {
      const data = await commandCenterService.generateOutput({
        prompt_key: genForm.prompt_key,
        title: genForm.title || undefined,
        extra_notes: [genForm.extra_notes, genForm.content_text].filter(Boolean).join("\n\n"),
        previous_output_id: genForm.previous_output_id || undefined,
        from: genForm.from, to: genForm.to, sources: genForm.sources,
      });
      setShowGenerate(false);
      await reload();
      const output = data?.output || data;
      if (output?.id) await openDetail(output.id);
      else selectOutput(output);
      if (data?.assembly?.warnings?.length) alert(data.assembly.warnings.join("\n"));
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setAiBusy(false);
      setBusy(false);
    }
  };

  const createManualFromComposer = async () => {
    if (!genForm.title.trim() && !genForm.content_text.trim()) return alert("عنوان یا متن دستی لازم است");
    setBusy(true);
    try {
      const prompt = prompts.find((item) => item.prompt_key === genForm.prompt_key);
      const outputType = genForm.prompt_key === "strategy.soft_war_annex" ? "soft_war_annex" : "strategy_prompt";
      const text = genForm.content_text || genForm.extra_notes;
      const row = await commandCenterService.createOutput({
        output_type: types[outputType] ? outputType : "soft_war_annex",
        title: genForm.title.trim() || `${prompt?.title_fa || "خروجی راهبردی"} — دستی`,
        content_html: textToHtml(text),
        content_text: text,
        period_start: genForm.from, period_end: genForm.to,
        prompt_key: genForm.prompt_key || undefined,
        source_refs: preview?.counts ? { counts: preview.counts } : {},
      });
      setShowGenerate(false);
      await reload();
      selectOutput(row);
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (presetId) => {
    if (presetId === "custom") return setGenForm((form) => ({ ...form, preset: "custom" }));
    const range = rangeFromPreset(presetId);
    if (!range) return;
    setGenForm((form) => ({ ...form, preset: presetId, from: range.from, to: range.to }));
    setDateRange(gregorianRangeToDateObjects(range.from, range.to));
  };
  const onDateChange = (values) => {
    setDateRange(values);
    const range = dateObjectsToGregorianRange(values);
    if (range) setGenForm((form) => ({ ...form, preset: "custom", from: range.from, to: range.to }));
  };

  const showList = !isMobile || !selected;
  const showEditor = !!selected;
  const layoutCols = !selected || isMobile
    ? "1fr"
    : "minmax(240px, 0.85fr) minmax(0, 1.4fr)";


  if (!canManage) {
    return <div style={{ minHeight: "100vh", padding: 32, background: theme.bg, color: theme.text, direction: "rtl" }}>دسترسی لازم برای مدیریت تحلیل راهبردی را ندارید.</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, direction: "rtl" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 12px 48px", boxSizing: "border-box", width: "100%" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 180px" }}>
            <button type="button" onClick={() => navigate("/command")} style={btn(theme)}><ArrowRight size={16} /> مرکز فرماندهی</button>
            <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>مدیریت تحلیل راهبردی</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setShowCreate(true)} style={btn(theme)}><Plus size={14} /> پیش‌نویس ساده</button>
            <button type="button" onClick={() => { setShowGenerate(true); runPreview(genForm); }} style={{ ...btn(theme), background: theme.accent, borderColor: theme.accent, color: "#fff" }}><Sparkles size={14} /> تولید با پرامپت</button>
          </div>
        </header>
        {error ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div> : null}
        {loading ? <div style={{ color: theme.muted }}>در حال بارگذاری…</div> : null}
        <div
          data-csm-layout
          style={{
            display: "grid",
            gridTemplateColumns: layoutCols,
            gap: 14,
            alignItems: "start",
            width: "100%",
            minWidth: 0,
          }}
        >
          {showList ? (
            <div data-csm-list style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetail(item.id)}
                  style={{
                    ...btn(theme),
                    display: "block",
                    width: "100%",
                    textAlign: "right",
                    padding: 12,
                    background: selected?.id === item.id ? "rgba(225,29,72,.08)" : theme.card,
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{item.title}</div>
                  <div
                    className="strategy-card-preview"
                    style={{ color: theme.muted, fontSize: 12, marginTop: 6, maxHeight: 64, overflow: "hidden" }}
                    dangerouslySetInnerHTML={{
                      __html: strategyContentToDisplayHtml(item.preview_html || item.content_html || item.content_text || "") || "",
                    }}
                  />
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
                    {types[item.output_type] || item.output_type} · {STATUS_LABEL[item.status] || item.status} · {item.created_at ? toPersianDigits(new Date(item.created_at).toLocaleDateString("fa-IR")) : ""}
                  </div>
                </button>
              ))}
              {!loading && !items.length ? <div style={{ color: theme.muted, padding: 20 }}>خروجی‌ای ثبت نشده است</div> : null}
            </div>
          ) : null}
          {showEditor ? (
            <section
              data-csm-editor
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: isMobile ? 12 : 16,
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: "1 1 140px" }}>
                  {isMobile ? (
                    <button type="button" onClick={() => setSelected(null)} style={btn(theme)}>
                      <ArrowRight size={14} /> بازگشت به فهرست
                    </button>
                  ) : null}
                  <div style={{ color: theme.muted, fontSize: 12, wordBreak: "break-word" }}>
                    {types[selected.output_type] || selected.output_type} · {STATUS_LABEL[selected.status] || selected.status}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" disabled={busy} onClick={saveSelected} style={btn(theme)}><Save size={14} /> ذخیره</button>
                  {selected.status === "draft" ? (
                    <button type="button" disabled={busy} onClick={approve} style={{ ...btn(theme), background: "#0ea5e9", color: "#fff", borderColor: "#0ea5e9" }}><Check size={14} /> تأیید</button>
                  ) : null}
                  {selected.status === "approved" || selected.status === "published" ? (
                    <button type="button" disabled={busy} onClick={publish} style={{ ...btn(theme), background: "#22c55e", color: "#fff", borderColor: "#22c55e" }}><Send size={14} /> انتشار در بله</button>
                  ) : null}
                </div>
              </div>
              {(selected.status === "approved" || selected.status === "published") && destinations.length ? (
                <div style={{ marginBottom: 12, padding: 10, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>کانال‌های بله برای انتشار</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {destinations.map((d) => {
                      const checked = selectedChannels.includes(d.id);
                      return (
                        <label key={d.id} style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSelectedChannels((prev) => (
                              checked ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                            ))}
                          />
                          {d.title_fa || d.title || `کانال ${d.id}`}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <label style={labelStyle}>عنوان</label>
              <input value={editor.title} onChange={(event) => setEditor((state) => ({ ...state, title: event.target.value }))} style={inputStyle(theme)} />
              <label style={labelStyle}>متن تحلیل</label>
              <div style={{ minWidth: 0, width: "100%", overflow: "hidden" }} className="strategy-html-body">
                <RichTextEditor value={editor.content_html} onChange={(content_html) => setEditor((state) => ({ ...state, content_html }))} onPlainTextChange={(content_text) => setEditor((state) => ({ ...state, content_text }))} maxLength={CONTENT_MAX_LENGTH} minHeight={isMobile ? 240 : 360} isDarkMode={isDarkMode} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <style>{STRATEGY_HTML_BODY_CSS}</style>
      {showCreate ? <Modal title="پیش‌نویس خروجی راهبردی" theme={theme} onClose={() => setShowCreate(false)}>
        <label style={labelStyle}>نوع</label><select value={createForm.output_type} onChange={(event) => setCreateForm((state) => ({ ...state, output_type: event.target.value }))} style={inputStyle(theme)}>{Object.entries(types).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
        <label style={labelStyle}>عنوان</label><input value={createForm.title} onChange={(event) => setCreateForm((state) => ({ ...state, title: event.target.value }))} style={inputStyle(theme)} />
        <label style={labelStyle}>متن</label><RichTextEditor value={createForm.content_html} onChange={(content_html) => setCreateForm((state) => ({ ...state, content_html }))} onPlainTextChange={(content_text) => setCreateForm((state) => ({ ...state, content_text }))} maxLength={CONTENT_MAX_LENGTH} minHeight={240} isDarkMode={isDarkMode} />
        <button type="button" disabled={busy} onClick={createManual} style={{ ...btn(theme), marginTop: 12, background: theme.accent, borderColor: theme.accent, color: "#fff" }}><Save size={14} /> ذخیره پیش‌نویس</button>
      </Modal> : null}
      {showGenerate ? <GenerateModal theme={theme} isDarkMode={isDarkMode} form={genForm} setForm={setGenForm} prompts={prompts} dateRange={dateRange} onDateChange={onDateChange} applyPreset={applyPreset} preview={preview} previewBusy={previewBusy} busy={busy} aiBusy={aiBusy} onGenerate={generateAi} onManual={createManualFromComposer} onClose={() => !busy && !aiBusy && setShowGenerate(false)} /> : null}
      {aiBusy ? <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,.65)", display: "grid", placeItems: "center", color: "#fff", direction: "rtl" }}><div style={{ textAlign: "center" }}><Loader2 size={38} style={{ animation: "spin 1s linear infinite" }} /><p>در حال تولید با هوش‌افزار…</p></div><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div> : null}
    </div>
  );
}

function GenerateModal({ theme, isDarkMode, form, setForm, prompts, dateRange, onDateChange, applyPreset, preview, previewBusy, busy, aiBusy, onGenerate, onManual, onClose }) {
  return <Modal title="نگارش / تولید خروجی راهبردی" theme={theme} onClose={onClose} wide closable={!busy && !aiBusy}>
    <fieldset disabled={aiBusy} style={{ border: 0, padding: 0, margin: 0 }}>
      <label style={labelStyle}>پرامپت راهبردی</label><select value={form.prompt_key} onChange={(event) => setForm((state) => ({ ...state, prompt_key: event.target.value }))} style={inputStyle(theme)}>{prompts.map((prompt) => <option key={prompt.prompt_key} value={prompt.prompt_key}>{prompt.title_fa || prompt.prompt_key}</option>)}</select>
      <label style={labelStyle}>بازه زمانی</label><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{RANGE_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)} style={{ ...btn(theme), background: form.preset === preset.id ? theme.accent : "transparent", color: form.preset === preset.id ? "#fff" : theme.text }}>{preset.label}</button>)}</div>
      <ThemedDatePicker isDarkMode={isDarkMode} value={dateRange} onChange={onDateChange} range calendar={persian} locale={persian_fa} calendarPosition="bottom-right" placeholder="بازه شمسی" style={{ width: "100%" }} />
      <div style={{ fontSize: 11, color: theme.muted, margin: "6px 0 10px" }}>{formatGregorianAsJalali(form.from)}{form.to && form.to !== form.from ? ` تا ${formatGregorianAsJalali(form.to)}` : ""}</div>
      <label style={labelStyle}>منابع ورودی</label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{Object.entries(SOURCE_LABELS).map(([key, label]) => <label key={key} style={{ fontSize: 12 }}><input type="checkbox" checked={!!form.sources[key]} onChange={() => setForm((state) => ({ ...state, sources: { ...state.sources, [key]: !state.sources[key] } }))} /> {label}</label>)}</div>
      <div style={{ margin: "10px 0", padding: 10, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}>{previewBusy ? "در حال شمارش محتوا…" : preview?.error || (preview?.counts ? `خبر: ${toPersianDigits(preview.counts.news_finalized)} · رصد: ${toPersianDigits(preview.counts.field_verified)} · تحلیل: ${toPersianDigits(preview.counts.analyses)} · جمع: ${toPersianDigits(preview.counts.total)}` : "—")}</div>
      <label style={labelStyle}>عنوان</label><input value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} style={inputStyle(theme)} placeholder="اختیاری" />
      <label style={labelStyle}>متن دستی / یادداشت برای هوش</label><textarea rows={5} value={form.content_text} onChange={(event) => setForm((state) => ({ ...state, content_text: event.target.value }))} style={inputStyle(theme)} />
      <label style={labelStyle}>یادداشت اضافی</label><textarea rows={2} value={form.extra_notes} onChange={(event) => setForm((state) => ({ ...state, extra_notes: event.target.value }))} style={inputStyle(theme)} />
      <label style={labelStyle}>شناسه خروجی قبلی (اختیاری)</label><input value={form.previous_output_id} onChange={(event) => setForm((state) => ({ ...state, previous_output_id: event.target.value }))} style={inputStyle(theme)} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" disabled={busy || !form.prompt_key} onClick={onGenerate} style={{ ...btn(theme), background: theme.accent, color: "#fff", borderColor: theme.accent }}><Sparkles size={14} /> تولید با هوش</button><button type="button" disabled={busy} onClick={onManual} style={btn(theme)}>ذخیره دستی</button></div>
    </fieldset>
  </Modal>;
}

function Modal({ title, theme, onClose, children, wide, closable = true }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 50, padding: 16, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", direction: "rtl" }}><div style={{ width: wide ? "min(720px, 100%)" : "min(560px, 100%)", maxHeight: "92vh", overflow: "auto", padding: 16, borderRadius: 12, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><strong>{title}</strong>{closable ? <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: theme.muted, fontSize: 18, cursor: "pointer" }}>×</button> : <span>در حال اجرا…</span>}</div>{children}</div></div>;
}

const labelStyle = { display: "block", fontSize: 12, margin: "10px 0 4px" };
const inputStyle = (theme) => ({ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontFamily: "inherit" });
const btn = (theme) => ({ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 });
