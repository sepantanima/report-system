import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Save, Send, ClipboardPaste, FileText, PlusCircle, Trash2 } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import RichTextEditor, { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import NewsChoiceButtons from "../components/news/NewsChoiceButtons.jsx";
import SearchableSourceSelect from "../components/news/SearchableSourceSelect.jsx";
import NewsSourceUrlField from "../components/news/NewsSourceUrlField.jsx";
import newsMonitorService from "../services/newsMonitorService.js";
import { decodeToken, getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { plainTextLength } from "../constants/analysisFieldLimits.js";
import { NEWS_PRIORITIES } from "../constants/newsMonitorMeta.js";
import { NEWS_FIELD_LIMITS, validateNewsEntryPayload } from "../constants/newsFieldLimits.js";
import { NEWS_ENTRY_HELP } from "../content/newsFormHelp.jsx";
import { clampText } from "../utils/limitInput.js";
import { toPersianDigits, toEnDigit } from "../utils/analysisMonitorUtils.js";
import { NEWS_EDITOR_BODY_HEIGHT, NEWS_EDITOR_BOX_HEIGHT } from "../constants/newsEditorLayout.js";

const emptyForm = (sender = "") => ({
  raw_text: "",
  source: "",
  source_url: "",
  sender,
  priority: 3,
  category_ids: [],
  source_date: new DateObject({ calendar: persian }),
  source_time_hm: nowTimeHm(),
});

function nowTimeHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseTimeInput(val) {
  return String(val || "").replace(/\D/g, "").slice(0, 4);
}

function jalaliToDateObject(str) {
  const s = toEnDigit(String(str || "").trim()).replace(/\//g, "-");
  if (!s) return new DateObject({ calendar: persian });
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new DateObject({ calendar: persian });
  return new DateObject({ year: y, month: m, day: d, calendar: persian });
}

export default function NewsMonitorEntryForm() {
  const navigate = useNavigate();
  const roles = getSessionRoles();
  const allowed = hasPermission(roles, "news_entry");
  const { isDarkMode } = useAppTheme();
  const [drafts, setDrafts] = useState([]);
  const [draftsOpen, setDraftsOpen] = useState(true);
  const [editingDraftId, setEditingDraftId] = useState(null);

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    inputBg: isDarkMode ? "rgba(0,0,0,0.2)" : "#fff",
    accent: "#38bdf8",
    isDarkMode,
  }), [isDarkMode]);

  const defaultSender = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token) return "";
    const d = decodeToken(token);
    return d.name || d.username || "";
  }, []);

  const [sourceOptions, setSourceOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState(() => emptyForm(defaultSender));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadMeta = useCallback(async () => {
    try {
      const [sources, cats] = await Promise.all([
        newsMonitorService.sources(),
        newsMonitorService.categories(),
      ]);
      setSourceOptions(sources || []);
      setCategoryOptions((cats || []).map((c) => ({ value: String(c.id), label: c.title_fa })));
    } catch {
      /* optional */
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      const rows = await newsMonitorService.myDrafts();
      setDrafts(rows || []);
    } catch {
      setDrafts([]);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      loadMeta();
      loadDrafts();
    }
  }, [allowed, loadMeta, loadDrafts]);

  const entryFieldError = useMemo(
    () => validateNewsEntryPayload({
      raw_text: form.raw_text,
      source: form.source,
      source_url: form.source_url,
    }),
    [form.raw_text, form.source, form.source_url],
  );

  const rawTextLen = plainTextLength(form.raw_text);

  const buildPayload = (submit = false) => {
    const dateObj = form.source_date;
    const jalali = dateObj
      ? toEnDigit(new DateObject(dateObj).format("YYYY-MM-DD")).replace(/[^0-9-]/g, "")
      : "";
    const html = form.raw_text.trim();
    return {
      raw_text: html,
      source: form.source.trim(),
      source_url: form.source_url.trim() || undefined,
      sender: defaultSender.trim(),
      priority: form.priority,
      category_ids: form.category_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite),
      source_date_jalali: jalali,
      source_time_hm: toEnDigit(parseTimeInput(form.source_time_hm)),
      submit,
    };
  };

  const validate = () => {
    const err = validateNewsEntryPayload({
      raw_text: form.raw_text,
      source: form.source,
      source_url: form.source_url,
    });
    if (err) {
      showToast(err);
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setEditingDraftId(null);
    setForm(emptyForm(defaultSender));
  };

  useEffect(() => {
    setForm((f) => ({ ...f, sender: defaultSender }));
  }, [defaultSender]);

  const handleSave = async (submit = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingDraftId) {
        await newsMonitorService.update(editingDraftId, buildPayload(false));
        if (submit) {
          await newsMonitorService.submit(editingDraftId);
          showToast("ارسال شد برای بررسی");
          resetForm();
        } else {
          showToast("پیش‌نویس به‌روز شد");
        }
      } else {
        await newsMonitorService.create(buildPayload(submit));
        showToast(submit ? "ارسال شد برای بررسی" : "پیش‌نویس ذخیره شد");
        resetForm();
      }
      loadDrafts();
    } catch (e) {
      showToast(e.response?.data?.error || "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  const openDraft = (item) => {
    setEditingDraftId(item.id);
    setForm({
      raw_text: item.raw_text || "",
      source: item.source || "",
      source_url: item.source_url || "",
      sender: defaultSender,
      priority: Number(item.priority || 3),
      category_ids: (item.category_ids || []).map(String),
      source_date: jalaliToDateObject(item.source_date_jalali),
      source_time_hm: item.source_time_hm || nowTimeHm(),
    });
    showToast(`پیش‌نویس #${item.id} بارگذاری شد`);
  };

  const handleDeleteDraft = async (draftId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm("این پیش‌نویس حذف شود؟")) return;
    setSaving(true);
    try {
      await newsMonitorService.deleteDraft(draftId);
      if (editingDraftId === draftId) resetForm();
      showToast("پیش‌نویس حذف شد");
      loadDrafts();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا در حذف پیش‌نویس");
    } finally {
      setSaving(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        showToast("کلیپ‌بورد خالی است");
        return;
      }
      const current = stripHtml(form.raw_text);
      const merged = current ? `${current}\n${text}` : text;
      const clipped = merged.slice(0, NEWS_FIELD_LIMITS.rawText);
      set("raw_text", `<p>${clipped.replace(/\n/g, "<br>")}</p>`);
    } catch {
      showToast("دسترسی به کلیپ‌بورد ممکن نیست");
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "0.65em 0.75em",
    borderRadius: 8,
    background: theme.inputBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "1em",
    boxSizing: "border-box",
  };

  const btnStyle = (primary = false) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4em",
    padding: "0.65em 1em",
    borderRadius: 8,
    border: primary ? "none" : `1px solid ${theme.border}`,
    background: primary ? "#0ea5e9" : theme.bg,
    color: primary ? "#fff" : theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "1em",
    minHeight: "2.75em",
  });

  return (
    <FormPageLayout
      title="ورود خبر (پایشگر)"
      documentTitle="ورود خبر (پایشگر)"
      backTo="/main"
      onHelp={() => <NEWS_ENTRY_HELP />}
      helpTitle="راهنمای ثبت خبر"
      contentPadding="16px 16px 80px"
      maxWidth="720px"
    >
      {toast ? (
        <div style={{ marginBottom: 12, padding: "0.5em 0.75em", borderRadius: 8, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.35)", fontSize: "0.9em" }}>
          {toast}
        </div>
      ) : null}

      <div>
          {drafts.length > 0 ? (
            <div style={{ marginBottom: 14, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setDraftsOpen((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "none",
                  background: "rgba(56,189,248,0.06)",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.92em",
                  fontWeight: 700,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <FileText size={16} /> پیش‌نویس‌های من ({toPersianDigits(drafts.length)})
                </span>
                <span style={{ opacity: 0.6 }}>{draftsOpen ? "▲" : "▼"}</span>
              </button>
              {draftsOpen ? (
                <div style={{ maxHeight: 180, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {drafts.map((d) => {
                    const preview = stripHtml(d.raw_text || d.cleaned_text || "").slice(0, 70);
                    const active = editingDraftId === d.id;
                    return (
                      <div
                        key={d.id}
                        style={{ display: "flex", gap: 6, alignItems: "stretch" }}
                      >
                        <button
                          type="button"
                          onClick={() => openDraft(d)}
                          style={{
                            flex: 1,
                            textAlign: "right",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: active ? "1px solid #38bdf8" : `1px solid ${theme.border}`,
                            background: active ? "rgba(56,189,248,0.1)" : theme.inputBg,
                            color: theme.text,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "0.88em",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: theme.accent, marginBottom: 2 }}>
                            #{toPersianDigits(d.id)} · {d.source || "بدون منبع"}
                          </div>
                          <div style={{ opacity: 0.85, textAlign: "justify" }}>{preview}{preview.length >= 70 ? "…" : ""}</div>
                        </button>
                        <button
                          type="button"
                          title="حذف پیش‌نویس"
                          disabled={saving}
                          onClick={(e) => handleDeleteDraft(d.id, e)}
                          style={{
                            flexShrink: 0,
                            width: 36,
                            borderRadius: 8,
                            border: "1px solid rgba(239,68,68,0.4)",
                            background: "rgba(239,68,68,0.08)",
                            color: "#f87171",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 18 }}>
            {editingDraftId ? (
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.88em", color: theme.accent, fontWeight: 700 }}>
                  در حال ویرایش پیش‌نویس #{toPersianDigits(editingDraftId)}
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => handleDeleteDraft(editingDraftId)} disabled={saving} style={{ ...btnStyle(false), minHeight: "2.2em", padding: "0.4em 0.75em", fontSize: "0.85em", color: "#f87171", borderColor: "rgba(239,68,68,0.4)" }}>
                    <Trash2 size={14} /> حذف پیش‌نویس
                  </button>
                  <button type="button" onClick={resetForm} style={{ ...btnStyle(false), minHeight: "2.2em", padding: "0.4em 0.75em", fontSize: "0.85em" }}>
                    <PlusCircle size={14} /> خبر جدید
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <label style={{ fontSize: "0.85em", opacity: 0.8, display: "block" }}>متن کامل خبر *</label>
                  <div style={{ fontSize: "0.8em", opacity: 0.75, marginTop: 4 }}>
                    فرستنده (از سیستم): <b style={{ color: theme.accent }}>{defaultSender || "—"}</b>
                    {" · "}
                    <span style={{ color: rawTextLen > NEWS_FIELD_LIMITS.rawText ? "#ef4444" : undefined }}>
                      {toPersianDigits(rawTextLen)} / {toPersianDigits(NEWS_FIELD_LIMITS.rawText)} کاراکتر
                    </span>
                  </div>
                </div>
                <button type="button" onClick={pasteFromClipboard} style={{ ...btnStyle(false), minHeight: "2.2em", padding: "0.4em 0.75em", fontSize: "0.85em", color: theme.accent }}>
                  <ClipboardPaste size={14} /> چسباندن از کلیپ‌بورد
                </button>
              </div>
              <div style={{ height: NEWS_EDITOR_BOX_HEIGHT, maxHeight: NEWS_EDITOR_BOX_HEIGHT, overflow: "hidden" }}>
                <RichTextEditor
                  value={form.raw_text}
                  onChange={(html) => set("raw_text", html)}
                  isDarkMode={isDarkMode}
                  minHeight={NEWS_EDITOR_BODY_HEIGHT}
                  maxHeight={NEWS_EDITOR_BODY_HEIGHT}
                  maxLength={NEWS_FIELD_LIMITS.rawText}
                  placeholder="متن خام خبر..."
                  allowFullscreen
                  allowSourceView
                  resizable={false}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: "0.85em", opacity: 0.8 }}>منبع *</label>
                <span style={{ fontSize: "0.75em", color: form.source.length > NEWS_FIELD_LIMITS.source ? "#ef4444" : "#64748b" }}>
                  {toPersianDigits(form.source.length)} / {toPersianDigits(NEWS_FIELD_LIMITS.source)}
                </span>
              </div>
              <SearchableSourceSelect
                value={form.source}
                onChange={(v) => set("source", v)}
                options={sourceOptions}
                theme={theme}
                maxLength={NEWS_FIELD_LIMITS.source}
              />
            </div>

            <NewsSourceUrlField form={form} set={set} theme={theme} />

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.85em", opacity: 0.8, display: "block", marginBottom: 8 }}>درجه اهمیت</label>
              <NewsChoiceButtons options={NEWS_PRIORITIES} value={form.priority} onChange={(v) => set("priority", v)} theme={theme} columns={2} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.85em", opacity: 0.8, display: "block", marginBottom: 8 }}>تاریخ و ساعت انتشار</label>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
                padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.inputBg,
              }}
              >
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <ThemedDatePicker
                    isDarkMode={isDarkMode}
                    value={form.source_date}
                    onChange={(v) => set("source_date", v)}
                    calendar={persian}
                    locale={persian_fa}
                    calendarPosition="bottom-right"
                    format="YYYY/MM/DD"
                    placeholder="1405/02/23"
                  />
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <input
                    value={form.source_time_hm}
                    onChange={(e) => set("source_time_hm", parseTimeInput(e.target.value))}
                    style={{ ...inputStyle, marginBottom: 0, textAlign: "center", letterSpacing: 2 }}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1030"
                  />
                  <span style={{ fontSize: "0.72em", opacity: 0.55, marginTop: 4, display: "block", textAlign: "center" }}>ساعت</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.85em", opacity: 0.8, display: "block", marginBottom: 6 }}>دسته‌بندی (چندانتخابی)</label>
              <MultiSelect
                options={categoryOptions}
                values={form.category_ids}
                onChange={(v) => set("category_ids", v)}
                placeholder="انتخاب دسته"
                theme={theme}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={saving || !!entryFieldError}
                onClick={() => handleSave(false)}
                style={{ ...btnStyle(false), opacity: saving || entryFieldError ? 0.55 : 1, cursor: entryFieldError ? "not-allowed" : "pointer" }}
              >
                <Save size={16} /> {editingDraftId ? "ذخیره پیش‌نویس" : "ذخیره پیش‌نویس"}
              </button>
              <button
                type="button"
                disabled={saving || !!entryFieldError}
                onClick={() => handleSave(true)}
                style={{ ...btnStyle(true), opacity: saving || entryFieldError ? 0.55 : 1, cursor: entryFieldError ? "not-allowed" : "pointer" }}
              >
                <Send size={16} /> {saving ? "در حال ارسال..." : "ارسال برای بررسی"}
              </button>
            </div>
          </div>
        </div>
    </FormPageLayout>
  );
}
