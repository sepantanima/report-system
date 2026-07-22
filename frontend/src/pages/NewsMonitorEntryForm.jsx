import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Save, Send, ClipboardPaste, FileText, PlusCircle, Trash2, Inbox } from "lucide-react";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import { PAGE_MEDIUM_PX } from "../constants/pageLayoutWidths.js";
import ThemedDatePicker from "../components/analysis/ThemedDatePicker.jsx";
import RichTextEditor, { stripHtml } from "../components/analysis/RichTextEditor.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import NewsChoiceButtons from "../components/news/NewsChoiceButtons.jsx";
import SearchableSourceSelect from "../components/news/SearchableSourceSelect.jsx";
import CharCounter from "../components/news/CharCounter.jsx";
import NewsSourceUrlField from "../components/news/NewsSourceUrlField.jsx";
import newsMonitorService from "../services/newsMonitorService.js";
import { decodeToken, getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { plainTextLength } from "../constants/analysisFieldLimits.js";
import { NEWS_PRIORITIES, NEWS_WORKFLOW_STATES, NEWS_REVIEW_STATES, DUPLICATE_STATUSES } from "../constants/newsMonitorMeta.js";
import { NEWS_FIELD_LIMITS, validateNewsEntryPayload } from "../constants/newsFieldLimits.js";
import { NEWS_ENTRY_HELP } from "../content/newsFormHelp.jsx";
import DailyQuotaBanner, { isQuotaExhausted } from "../components/common/DailyQuotaBanner.jsx";
import EntityMessagesPanel from "../components/messaging/EntityMessagesPanel.jsx";
import { clampText } from "../utils/limitInput.js";
import { toPersianDigits, toEnDigit } from "../utils/analysisMonitorUtils.js";
import DuplicateWarningModal from "../components/common/DuplicateWarningModal.jsx";
import { parseDuplicateCheckError } from "../utils/duplicateCheckUtils.js";
import { NEWS_EDITOR_BODY_HEIGHT, NEWS_EDITOR_BOX_HEIGHT } from "../constants/newsEditorLayout.js";
import useAnalysisToast from "../hooks/useAnalysisToast.jsx";

function submissionStatusLabel(item) {
  const dup = item.duplicate_status && item.duplicate_status !== "none"
    ? DUPLICATE_STATUSES[item.duplicate_status]?.label
    : null;
  if (dup) return dup;
  const ws = NEWS_WORKFLOW_STATES[item.workflow_status]?.label || item.workflow_status || "—";
  const rs = item.review_state && item.review_state !== "pending"
    ? NEWS_REVIEW_STATES[item.review_state]?.label
    : null;
  return rs ? `${ws} — ${rs}` : ws;
}

function submissionStatusColor(item) {
  if (item.duplicate_status && item.duplicate_status !== "none") {
    return DUPLICATE_STATUSES[item.duplicate_status]?.color || "#f59e0b";
  }
  if (item.review_state === "rejected") {
    return NEWS_REVIEW_STATES.rejected.color;
  }
  return NEWS_WORKFLOW_STATES[item.workflow_status]?.color || undefined;
}

function isSubmissionReadOnly(item) {
  if (!item) return true;
  if (item.duplicate_status && item.duplicate_status !== "none") return true;
  if (item.review_state === "rejected") return true;
  return item.workflow_status !== "pending";
}

const emptyForm = (sender = "") => ({
  raw_text: "",
  source: "",
  source_url: "",
  sender,
  priority: 3,
  category_ids: [],
  monitor_note: "",
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
  const [submissions, setSubmissions] = useState([]);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [viewingSubmissionId, setViewingSubmissionId] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  /** 'new' = پیش‌نویس، 'pending' = خبر ارسال‌شده قابل ویرایش */
  const [editingWorkflow, setEditingWorkflow] = useState(null);

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
  const { showToast, Toast } = useAnalysisToast();
  const [form, setForm] = useState(() => emptyForm(defaultSender));
  const [dailyQuota, setDailyQuota] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const loadSubmissions = useCallback(async () => {
    try {
      const rows = await newsMonitorService.mySubmissions({ duplicate: "include" });
      setSubmissions(rows || []);
      return rows || [];
    } catch {
      setSubmissions([]);
      return [];
    }
  }, []);

  const loadDailyQuota = useCallback(async () => {
    try {
      const data = await newsMonitorService.dailyQuota();
      setDailyQuota(data);
    } catch {
      setDailyQuota(null);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      loadMeta();
      loadDrafts();
      loadSubmissions();
      loadDailyQuota();
    }
  }, [allowed, loadMeta, loadDrafts, loadSubmissions, loadDailyQuota]);

  const entryFieldError = useMemo(
    () => validateNewsEntryPayload({
      raw_text: form.raw_text,
      source: form.source,
      source_url: form.source_url,
      monitor_note: form.monitor_note,
    }),
    [form.raw_text, form.source, form.source_url, form.monitor_note],
  );

  const rawTextLen = plainTextLength(form.raw_text);

  const buildPayload = (submit = false, forceDuplicate = false) => {
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
      monitor_note: (form.monitor_note || "").trim() || undefined,
      submit,
      ...(forceDuplicate ? { force_duplicate: true } : {}),
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
    setEditingWorkflow(null);
    setViewingSubmissionId(null);
    setForm(emptyForm(defaultSender));
  };

  const performSave = async (submit, forceDuplicate = false) => {
    const isDraft = editingWorkflow === "new";
    const isPendingEdit = editingWorkflow === "pending";
    if (editingDraftId) {
      const payload = buildPayload(false, forceDuplicate);
      const updated = await newsMonitorService.update(editingDraftId, payload);
      if (submit && isDraft) {
        await newsMonitorService.submit(
          editingDraftId,
          forceDuplicate ? { force_duplicate: true } : {},
        );
        showToast("ارسال شد برای بررسی");
        resetForm();
      } else if (submit && isPendingEdit) {
        showToast("این خبر قبلاً ارسال شده — فقط «ذخیره تغییرات» کافی است");
      } else {
        showToast(isPendingEdit ? "تغییرات ذخیره شد" : "پیش‌نویس به‌روز شد");
        if (isPendingEdit) {
          setViewingSubmissionId(editingDraftId);
        }
      }
      if (updated?.id) {
        if (isPendingEdit) {
          setSubmissions((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
        }
        if (isDraft) {
          setDrafts((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
        }
      }
    } else {
      await newsMonitorService.create(buildPayload(submit, forceDuplicate));
      showToast(submit ? "ارسال شد برای بررسی" : "پیش‌نویس ذخیره شد");
      resetForm();
    }
    loadDrafts();
    await loadSubmissions();
    if (submit) loadDailyQuota();
  };

  const handleSave = async (submit = false, forceDuplicate = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await performSave(submit, forceDuplicate);
      setDuplicateModal(null);
    } catch (e) {
      const dup = parseDuplicateCheckError(e);
      if (dup?.can_force && !forceDuplicate) {
        setDuplicateModal({
          code: dup.code,
          matches: dup.matches,
          pendingSubmit: submit,
        });
        return;
      }
      showToast(e.response?.data?.error || (e.response?.status === 401 ? "نشست منقضی شده — دوباره وارد شوید" : "خطا در ثبت"));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateModal) return;
    setSaving(true);
    try {
      await performSave(duplicateModal.pendingSubmit, true);
      setDuplicateModal(null);
    } catch (e) {
      showToast(e.response?.data?.error || (e.response?.status === 401 ? "نشست منقضی شده — دوباره وارد شوید" : "خطا در ثبت"));
    } finally {
      setSaving(false);
    }
  };

  const openDraft = (item) => {
    setViewingSubmissionId(null);
    setEditingDraftId(item.id);
    setEditingWorkflow("new");
    setForm({
      raw_text: item.raw_text || "",
      source: item.source || "",
      source_url: item.source_url || "",
      sender: defaultSender,
      priority: Number(item.priority || 3),
      category_ids: (item.category_ids || []).map(String),
      monitor_note: item.monitor_note || "",
      source_date: jalaliToDateObject(item.source_date_jalali),
      source_time_hm: item.source_time_hm || nowTimeHm(),
    });
    showToast(`پیش‌نویس #${item.id} بارگذاری شد`);
  };

  const openSubmission = (item) => {
    setViewingSubmissionId(item.id);
    // برگشتی و تکراری فقط مشاهده — بدون ویرایش
    if (!isSubmissionReadOnly(item) && item.workflow_status === "pending") {
      setEditingDraftId(item.id);
      setEditingWorkflow("pending");
      setForm({
        raw_text: item.raw_text || "",
        source: item.source || "",
        source_url: item.source_url || "",
        sender: defaultSender,
        priority: Number(item.priority || 3),
        category_ids: (item.category_ids || []).map(String),
        monitor_note: item.monitor_note || "",
        source_date: jalaliToDateObject(item.source_date_jalali),
        source_time_hm: item.source_time_hm || nowTimeHm(),
      });
      showToast(`خبر #${item.id} برای ویرایش بارگذاری شد`);
    } else {
      setEditingDraftId(null);
      setEditingWorkflow(null);
      if (item.review_state === "rejected") {
        showToast("این خبر برگشت خورده — فقط قابل مشاهده است");
      } else if (item.duplicate_status && item.duplicate_status !== "none") {
        showToast("این خبر تکراری علامت خورده — فقط قابل مشاهده است");
      }
    }
  };

  useEffect(() => {
    setForm((f) => ({ ...f, sender: defaultSender }));
  }, [defaultSender]);

  const handleDeleteDraft = async (draftId, e) => {
    e?.stopPropagation?.();
    if (editingWorkflow !== "new") {
      showToast("فقط پیش‌نویس‌ها قابل حذف هستند — اخبار ارسال‌شده را نمی‌توان از اینجا حذف کرد");
      return;
    }
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
    <>
    <FormPageLayout
      title="ورود خبر (پایشگر)"
      documentTitle="ورود خبر (پایشگر)"
      backTo="/main"
      onHelp={() => <NEWS_ENTRY_HELP />}
      helpTitle="راهنمای ثبت خبر"
      contentPadding="16px 16px 80px"
      maxWidth={PAGE_MEDIUM_PX}
    >
      {Toast}

      <DailyQuotaBanner quota={dailyQuota} itemLabel="خبر" isDarkMode={theme.isDarkMode} />

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
                  {editingWorkflow === "pending"
                    ? `در حال ویرایش خبر ارسالی #${toPersianDigits(editingDraftId)}`
                    : `در حال ویرایش پیش‌نویس #${toPersianDigits(editingDraftId)}`}
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {editingWorkflow === "new" ? (
                    <button type="button" onClick={() => handleDeleteDraft(editingDraftId)} disabled={saving} style={{ ...btnStyle(false), minHeight: "2.2em", padding: "0.4em 0.75em", fontSize: "0.85em", color: "#f87171", borderColor: "rgba(239,68,68,0.4)" }}>
                      <Trash2 size={14} /> حذف پیش‌نویس
                    </button>
                  ) : null}
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
                    <CharCounter
                      current={rawTextLen}
                      max={NEWS_FIELD_LIMITS.rawText}
                      style={{ fontSize: "0.85em", color: rawTextLen > NEWS_FIELD_LIMITS.rawText ? "#ef4444" : undefined }}
                    />
                    {" کاراکتر"}
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
                <CharCounter current={form.source.length} max={NEWS_FIELD_LIMITS.source} style={{ fontSize: "0.75em" }} />
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: "0.85em", opacity: 0.8 }}>
                  علت اهمیت و ارتباط با سازمان (اختیاری)
                </label>
                <CharCounter current={(form.monitor_note || "").length} max={NEWS_FIELD_LIMITS.monitorNote} style={{ fontSize: "0.75em" }} />
              </div>
              <input
                type="text"
                value={form.monitor_note || ""}
                onChange={(e) => set("monitor_note", clampText(e.target.value, NEWS_FIELD_LIMITS.monitorNote))}
                maxLength={NEWS_FIELD_LIMITS.monitorNote}
                placeholder="مثلاً: ارتباط مستقیم با امنیت داخلی واحد"
                style={inputStyle}
              />
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
                <Save size={16} /> {editingWorkflow === "pending" ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}
              </button>
              {editingWorkflow !== "pending" ? (
                <button
                  type="button"
                  disabled={saving || !!entryFieldError || isQuotaExhausted(dailyQuota)}
                  onClick={() => handleSave(true)}
                  style={{ ...btnStyle(true), opacity: saving || entryFieldError || isQuotaExhausted(dailyQuota) ? 0.55 : 1, cursor: entryFieldError || isQuotaExhausted(dailyQuota) ? "not-allowed" : "pointer" }}
                >
                  <Send size={16} /> {saving ? "در حال ارسال..." : "ارسال برای بررسی"}
                </button>
              ) : null}
            </div>
          </div>

          {editingDraftId ? (
            <EntityMessagesPanel
              entityType="news"
              entityId={editingDraftId}
              theme={theme}
            />
          ) : null}

          {submissions.length > 0 ? (
            <div style={{ marginTop: 14, marginBottom: 14, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setSubmissionsOpen((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "none",
                  background: "rgba(34,197,94,0.06)",
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.92em",
                  fontWeight: 700,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Inbox size={16} /> اخبار ارسالی من ({toPersianDigits(submissions.length)})
                  {(() => {
                    const rejectedN = submissions.filter((x) => x.review_state === "rejected").length;
                    const dupN = submissions.filter((x) => x.duplicate_status && x.duplicate_status !== "none").length;
                    if (!rejectedN && !dupN) return null;
                    return (
                      <span style={{ fontSize: "0.82em", fontWeight: 600, opacity: 0.9 }}>
                        {rejectedN ? (
                          <span style={{ color: "#ef4444", marginLeft: 6 }}>
                            برگشتی: {toPersianDigits(rejectedN)}
                          </span>
                        ) : null}
                        {dupN ? (
                          <span style={{ color: "#f59e0b", marginLeft: 6 }}>
                            تکراری: {toPersianDigits(dupN)}
                          </span>
                        ) : null}
                      </span>
                    );
                  })()}
                </span>
                <span style={{ opacity: 0.6 }}>{submissionsOpen ? "▲" : "▼"}</span>
              </button>
              {submissionsOpen ? (
                <div style={{ maxHeight: 280, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.78em", opacity: 0.7, lineHeight: 1.7 }}>
                    اخبار برگشت‌خورده و تکراری فقط برای اطلاع شماست و قابل ویرایش نیستند.
                  </p>
                  {submissions.map((s) => {
                    const preview = stripHtml(s.raw_text || s.cleaned_text || "").slice(0, 70);
                    const active = viewingSubmissionId === s.id;
                    const statusColor = submissionStatusColor(s) || theme.text;
                    const readOnly = isSubmissionReadOnly(s);
                    const isRejected = s.review_state === "rejected";
                    const isDup = s.duplicate_status && s.duplicate_status !== "none";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openSubmission(s)}
                        style={{
                          width: "100%",
                          textAlign: "right",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: active
                            ? `1px solid ${isRejected ? "#ef4444" : isDup ? "#f59e0b" : "#22c55e"}`
                            : `1px solid ${theme.border}`,
                          background: active
                            ? (isRejected ? "rgba(239,68,68,0.08)" : isDup ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)")
                            : theme.inputBg,
                          color: theme.text,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "0.88em",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, color: theme.accent }}>
                            #{toPersianDigits(s.id)} · {s.source || "بدون منبع"}
                          </span>
                          <span style={{
                            fontSize: "0.82em",
                            fontWeight: 600,
                            color: statusColor,
                            opacity: 0.95,
                          }}
                          >
                            {submissionStatusLabel(s)}
                          </span>
                        </div>
                        <div style={{ opacity: 0.85, textAlign: "justify" }}>{preview}{preview.length >= 70 ? "…" : ""}</div>
                        {!readOnly ? (
                          <div style={{ fontSize: "0.78em", color: "#38bdf8", marginTop: 4 }}>قابل ویرایش</div>
                        ) : isRejected ? (
                          <div style={{ fontSize: "0.78em", color: "#ef4444", marginTop: 4 }}>
                            برگشت به فرستنده — فقط مشاهده
                            {s.status_note ? ` · ${String(s.status_note).slice(0, 60)}${String(s.status_note).length > 60 ? "…" : ""}` : ""}
                          </div>
                        ) : isDup ? (
                          <div style={{ fontSize: "0.78em", color: "#f59e0b", marginTop: 4 }}>تکراری — فقط مشاهده</div>
                        ) : (
                          <div style={{ fontSize: "0.78em", opacity: 0.65, marginTop: 4 }}>فقط مشاهده</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {viewingSubmissionId && editingDraftId !== viewingSubmissionId ? (
            <div style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 10,
              background: theme.card,
              border: `1px solid ${theme.border}`,
              fontSize: "0.88em",
              lineHeight: 1.7,
            }}
            >
              {(() => {
                const s = submissions.find((x) => x.id === viewingSubmissionId);
                if (!s) return null;
                const isRejected = s.review_state === "rejected";
                const isDup = s.duplicate_status && s.duplicate_status !== "none";
                return (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>جزئیات خبر #{toPersianDigits(s.id)}</div>
                    <div style={{ opacity: 0.85 }}>وضعیت: {submissionStatusLabel(s)}</div>
                    {isRejected || isDup ? (
                      <div style={{
                        marginTop: 8, padding: "8px 10px", borderRadius: 8,
                        background: isRejected ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                        border: `1px solid ${isRejected ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)"}`,
                        fontSize: "0.92em",
                      }}
                      >
                        {isRejected ? "این خبر به شما برگشت خورده و قابل ویرایش یا ارسال مجدد از اینجا نیست." : null}
                        {isDup ? "این خبر به‌عنوان تکراری ثبت شده و از جریان انتشار خارج است." : null}
                        {s.status_note ? (
                          <div style={{ marginTop: 6 }}>
                            <b>یادداشت مدیر:</b>
                            {" "}
                            {s.status_note}
                          </div>
                        ) : null}
                        {s.monitor_note ? (
                          <div style={{ marginTop: 6 }}>
                            <b>یادداشت پایشگر:</b>
                            {" "}
                            {s.monitor_note}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8, textAlign: "justify", opacity: 0.9 }}>
                      {stripHtml(s.raw_text || s.cleaned_text || "")}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
    </FormPageLayout>

      <DuplicateWarningModal
        open={!!duplicateModal}
        code={duplicateModal?.code}
        matches={duplicateModal?.matches || []}
        theme={theme}
        saving={saving}
        onCancel={() => setDuplicateModal(null)}
        onConfirm={handleDuplicateConfirm}
      />
    </>
  );
}
