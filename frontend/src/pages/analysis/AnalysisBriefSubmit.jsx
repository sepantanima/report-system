import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Send, List, Eraser } from "lucide-react";
import { stripHtml } from "../../components/analysis/RichTextEditor.jsx";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisPageShell from "../../components/analysis/AnalysisPageShell.jsx";
import RichTextEditor from "../../components/analysis/RichTextEditor.jsx";
import ThemedDatePicker from "../../components/analysis/ThemedDatePicker.jsx";
import { BRIEF_TERMS } from "../../constants/analysisTerminology.js";
import { BRIEF_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { BRIEF_SUBMIT_HELP } from "../../content/analysisFormHelp.jsx";
import analysisService from "../../services/analysisService";
import useAnalysisToast from "../../hooks/useAnalysisToast.jsx";
import { getCurrentUser } from "../../utils/analysisAuth.js";
import {
  BRIEF_STATUS_META,
  BRIEF_ENTRY_MODE_META,
  formatPersianDateShort,
  persianDateToGregorian,
  plainTextLength,
  toPersianDigits,
} from "../../utils/analysisMonitorUtils.js";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { clampText } from "../../utils/limitInput.js";

export default function AnalysisBriefSubmit() {
  const { isDarkMode } = useAppTheme();
  const { showToast, Toast } = useAnalysisToast();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [entryMode, setEntryMode] = useState("self");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importanceReason, setImportanceReason] = useState("");
  const [tags, setTags] = useState("");
  const [attributionText, setAttributionText] = useState("");
  const [compositionDate, setCompositionDate] = useState(null);
  const [contextType, setContextType] = useState("general");
  const [contextId, setContextId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [showList, setShowList] = useState(false);

  const isTopicProposal = entryMode === "topic_proposal";

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#10b981",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
  }), [isDarkMode]);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const rows = await analysisService.getMyBriefSubmissions();
      setMine(rows || []);
    } catch {
      setMine([]);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  const handleCleanContent = async () => {
    if (!content.trim()) return showToast("متنی برای پاکسازی وجود ندارد");
    setCleaning(true);
    try {
      const result = await analysisService.cleanBriefContent(content);
      const cleaned = isTopicProposal
        ? stripHtml(result.content).trim()
        : result.content;
      if (!cleaned.trim()) return showToast("متن پس از پاکسازی خالی شد");
      setContent(cleaned);
      showToast("متن پاکسازی شد");
    } catch (err) {
      showToast(err.response?.data?.error || "خطا در پاکسازی متن");
    } finally {
      setCleaning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isTopicProposal) {
      if (!title.trim()) return showToast("موضوع پیشنهادی الزامی است");
      if (!content.trim()) return showToast("توضیح موضوع الزامی است");
      if (plainTextLength(content) > BRIEF_FIELD_LIMITS.topicProposalDescription) {
        return showToast(`توضیح موضوع حداکثر ${toPersianDigits(BRIEF_FIELD_LIMITS.topicProposalDescription)} کاراکتر باشد`);
      }
      if (importanceReason.trim() && plainTextLength(importanceReason) > BRIEF_FIELD_LIMITS.importance_reason) {
        return showToast(`دلیل اهمیت حداکثر ${toPersianDigits(BRIEF_FIELD_LIMITS.importance_reason)} کاراکتر باشد`);
      }
    } else {
      if (!title.trim()) return showToast("عنوان الزامی است");
      if (!content.trim()) return showToast("متن تحلیل الزامی است");
      if (plainTextLength(content) > BRIEF_FIELD_LIMITS.content) {
        return showToast(`متن حداکثر ${toPersianDigits(BRIEF_FIELD_LIMITS.content)} کاراکتر باشد`);
      }
      if (entryMode === "external" && !attributionText.trim()) {
        return showToast("منبع/نویسنده الزامی است");
      }
    }

    setSubmitting(true);
    try {
      if (isTopicProposal) {
        await analysisService.createBriefSubmission({
          title: title.trim(),
          content: content.trim(),
          entry_mode: "topic_proposal",
          importance_reason: importanceReason.trim() || undefined,
        });
        showToast("پیشنهاد موضوع ثبت شد");
      } else {
        await analysisService.createBriefSubmission({
          title: title.trim(),
          content,
          tags: tags.trim() || null,
          entry_mode: entryMode,
          attribution_text: entryMode === "external" ? attributionText.trim() : undefined,
          composition_date: compositionDate ? persianDateToGregorian(compositionDate) : undefined,
          context_type: contextType,
          context_id: contextId ? parseInt(contextId, 10) : null,
        });
        showToast("تحلیل ثبت شد");
      }
      setTitle("");
      setContent("");
      setImportanceReason("");
      setTags("");
      setAttributionText("");
      setCompositionDate(null);
      setContextId("");
      loadMine();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا در ارسال");
    } finally {
      setSubmitting(false);
    }
  };

  const lbl = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.text };
  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontFamily: "inherit",
  };
  const cleanBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: cleaning ? "wait" : "pointer",
    fontFamily: "inherit",
    opacity: cleaning ? 0.7 : 1,
  };

  const contentLabelRow = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <label style={{ ...lbl, marginBottom: 0 }}>
        {isTopicProposal ? BRIEF_TERMS.topicProposalDescription : "متن تحلیل"}
      </label>
      <button
        type="button"
        onClick={handleCleanContent}
        disabled={cleaning || !content.trim()}
        style={cleanBtnStyle}
        title="اعمال الگوهای پاکسازی خبر روی متن"
      >
        <Eraser size={14} />
        {cleaning ? "در حال پاکسازی..." : "پاکسازی متن"}
      </button>
    </div>
  );

  const modeBtn = (mode) => ({
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${entryMode === mode ? theme.accent : theme.border}`,
    background: entryMode === mode ? `${theme.accent}22` : theme.card,
    color: entryMode === mode ? theme.accent : theme.text,
    fontWeight: entryMode === mode ? 700 : 500,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  });

  const titleLimit = isTopicProposal ? BRIEF_FIELD_LIMITS.topicProposalTitle : BRIEF_FIELD_LIMITS.title;
  const contentLimit = isTopicProposal ? BRIEF_FIELD_LIMITS.topicProposalDescription : BRIEF_FIELD_LIMITS.content;
  const contentLen = plainTextLength(content);

  return (
    <AnalysisPageShell
      title={BRIEF_TERMS.pageTitle}
      subtitle="ثبت تحلیل کوتاه، بارگذاری تحلیل دیگران، یا پیشنهاد موضوع جدید — همه در یک فرم"
      onHelp={() => BRIEF_SUBMIT_HELP()}
      helpTitle="راهنمای ثبت تحلیل"
    >
      {Toast}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={lbl}>نوع ثبت</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={modeBtn("self")} onClick={() => setEntryMode("self")}>
              {BRIEF_TERMS.entryModeSelf}
            </button>
            <button type="button" style={modeBtn("external")} onClick={() => setEntryMode("external")}>
              {BRIEF_TERMS.entryModeExternal}
            </button>
            <button type="button" style={modeBtn("topic_proposal")} onClick={() => setEntryMode("topic_proposal")}>
              {BRIEF_TERMS.entryModeTopicProposal}
            </button>
          </div>
        </div>

        {isTopicProposal ? (
          <>
            <div style={{ fontSize: 12, color: theme.muted }}>
              پیشنهاددهنده: <b>{currentUser.name || currentUser.username || "—"}</b>
            </div>
            <div>
              <label style={lbl}>{BRIEF_TERMS.topicProposalTitle}</label>
              <input
                value={title}
                onChange={(e) => setTitle(clampText(e.target.value, titleLimit))}
                maxLength={titleLimit}
                style={inputStyle}
                placeholder="عنوان کوتاه موضوع پیشنهادی"
              />
            </div>
            <div>
              {contentLabelRow}
              <textarea
                value={content}
                onChange={(e) => setContent(clampText(e.target.value, contentLimit))}
                maxLength={contentLimit}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
                placeholder={BRIEF_TERMS.topicProposalDescriptionHint}
              />
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, textAlign: "left" }}>
                {toPersianDigits(contentLen)} / {toPersianDigits(contentLimit)}
              </div>
            </div>
            <div>
              <label style={lbl}>{BRIEF_TERMS.importanceReasonLabel}</label>
              <textarea
                value={importanceReason}
                onChange={(e) => setImportanceReason(clampText(e.target.value, BRIEF_FIELD_LIMITS.importance_reason))}
                maxLength={BRIEF_FIELD_LIMITS.importance_reason}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
                placeholder={BRIEF_TERMS.importanceReasonHint}
              />
            </div>
          </>
        ) : (
          <>
            {entryMode === "self" ? (
              <div style={{ fontSize: 12, color: theme.muted }}>
                نویسنده: <b>{currentUser.name || currentUser.username || "—"}</b>
              </div>
            ) : (
              <div>
                <label style={lbl}>{BRIEF_TERMS.attributionLabel}</label>
                <input
                  value={attributionText}
                  onChange={(e) => setAttributionText(clampText(e.target.value, BRIEF_FIELD_LIMITS.attribution))}
                  maxLength={BRIEF_FIELD_LIMITS.attribution}
                  style={inputStyle}
                  placeholder={BRIEF_TERMS.attributionHint}
                />
              </div>
            )}

            <div>
              <label style={lbl}>{BRIEF_TERMS.compositionDateLabel} (شمسی)</label>
              <ThemedDatePicker
                isDarkMode={isDarkMode}
                value={compositionDate}
                onChange={setCompositionDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                calendarPosition="bottom-right"
                placeholder={BRIEF_TERMS.compositionDateHint}
              />
            </div>

            <div>
              <label style={lbl}>عنوان</label>
              <input
                value={title}
                onChange={(e) => setTitle(clampText(e.target.value, titleLimit))}
                maxLength={titleLimit}
                style={inputStyle}
                placeholder="عنوان تحلیل"
              />
            </div>
            <div>
              {contentLabelRow}
              <RichTextEditor
                value={content}
                onChange={setContent}
                maxLength={BRIEF_FIELD_LIMITS.content}
                placeholder="متن تحلیل را بنویسید یا بارگذاری کنید..."
                isDarkMode={isDarkMode}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <label style={lbl}>حوزه / برچسب</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(clampText(e.target.value, BRIEF_FIELD_LIMITS.tags))}
                  style={inputStyle}
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <label style={lbl}>مرجع (اختیاری)</label>
                <select
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="general">عمومی</option>
                  <option value="news">خبر</option>
                  <option value="report">گزارش</option>
                </select>
              </div>
              {contextType !== "general" && (
                <div>
                  <label style={lbl}>شناسه {contextType === "news" ? "خبر" : "گزارش"}</label>
                  <input
                    value={contextId}
                    onChange={(e) => setContextId(e.target.value.replace(/\D/g, ""))}
                    style={inputStyle}
                    placeholder="اختیاری"
                  />
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: theme.accent,
            color: "#fff",
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            fontFamily: "inherit",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <Send size={16} /> {submitting ? "در حال ارسال..." : (isTopicProposal ? BRIEF_TERMS.submitTopicBtn : BRIEF_TERMS.submitBtn)}
        </button>
      </form>

      <div style={{ marginTop: 24, borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: theme.accent,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 12,
          }}
        >
          <List size={16} /> {BRIEF_TERMS.mySubmissions} ({toPersianDigits(mine.length)})
        </button>
        {showList && (
          loadingMine ? (
            <p style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری...</p>
          ) : mine.length === 0 ? (
            <p style={{ fontSize: 12, opacity: 0.6 }}>هنوز ثبتی ندارید.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mine.map((row) => {
                const st = BRIEF_STATUS_META[row.status] || { label: row.status, color: "#64748b" };
                const em = BRIEF_ENTRY_MODE_META[row.entry_mode] || {};
                return (
                  <div
                    key={row.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: theme.card,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{row.title}</span>
                      <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                      {row.submission_code} — {em.label}
                      {row.entry_mode === "topic_proposal"
                        ? ` — ${formatPersianDateShort(row.created_at)}`
                        : ` — ${row.attribution_text || row.author_name}${row.composition_date
                          ? ` — نگارش: ${formatPersianDateShort(row.composition_date)}`
                          : ` — ${formatPersianDateShort(row.created_at)}`}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AnalysisPageShell>
  );
}
