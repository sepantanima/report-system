import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import RichTextEditor, { stripHtml } from "../analysis/RichTextEditor.jsx";
import CharCounter from "./CharCounter.jsx";
import NewsSummarizeCompareModal from "./NewsSummarizeCompareModal.jsx";
import {
  DEFAULT_SUMMARIZE_CHAR_THRESHOLD,
  NEWS_FIELD_LIMITS,
  needsNewsSummaryAttention,
  isNewsSummaryPlaceholder,
} from "../../constants/newsFieldLimits.js";
import { FORM_AI_NAMES } from "../../constants/aiFormNames.js";
import { plainTextLength } from "../../constants/analysisFieldLimits.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import { getNewsRoleLevel, hasPermission } from "../../utils/userRoles.js";
import { newsTextToEditorHtml } from "../../utils/newsTextToEditorHtml.js";
import { useNewsEditorForm } from "./NewsEditorFormContext.jsx";
import newsMonitorService from "../../services/newsMonitorService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const labelStyle = { fontSize: pxToEm(12), opacity: 0.9, display: "block", marginBottom: 8, fontWeight: 600 };

export default function NewsSummarySection({ form, set, theme, readOnly = false, compact = false }) {
  const { item, roles } = useNewsEditorForm();
  const [aiActions, setAiActions] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [summarizeThreshold, setSummarizeThreshold] = useState(DEFAULT_SUMMARIZE_CHAR_THRESHOLD);

  const roleLevel = getNewsRoleLevel(roles);
  const canAi = hasPermission(roles, "ai_process") && ["editor", "chief", "admin"].includes(roleLevel);

  const plainCleaned = useMemo(
    () => stripHtml(form?.cleaned_text || "").trim(),
    [form?.cleaned_text],
  );

  const plainSummary = useMemo(
    () => stripHtml(form?.summary || "").trim(),
    [form?.summary],
  );

  const summaryPlainLen = useMemo(
    () => plainTextLength(form?.summary || ""),
    [form?.summary],
  );

  const needsSummarize = needsNewsSummaryAttention(plainCleaned, plainSummary, summarizeThreshold);
  const isVeryImportant = Number(form?.priority) === 1;
  const requiresSummary = isVeryImportant && needsSummarize;
  const hasSummary = !isNewsSummaryPlaceholder(plainSummary);
  const aiAction = aiActions[0];
  const aiAvailable = canAi && !!aiAction;
  const aiButtonLabel = aiAction?.button_label_fa || "خلاصه‌سازی با هوش‌افزار";

  useEffect(() => {
    let cancelled = false;
    newsMonitorService
      .entrySettings()
      .then((s) => {
        if (cancelled) return;
        const n = Number(s?.summarize_char_threshold);
        if (Number.isFinite(n) && n >= 50) setSummarizeThreshold(n);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!canAi || !needsSummarize) {
      setAiActions([]);
      return;
    }
    let cancelled = false;
    newsMonitorService
      .listAiActions(FORM_AI_NAMES.NEWS_MONITOR_MANAGE)
      .then((rows) => {
        if (!cancelled) setAiActions(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setAiActions([]);
      });
    return () => { cancelled = true; };
  }, [canAi, needsSummarize, item?.id]);

  const plainToEditorHtml = (text) => newsTextToEditorHtml(text, item?.source_platform);

  const runSummarize = async () => {
    if (!item || !aiAction) return;
    setAiBusy(true);
    setAiError("");
    try {
      const data = await newsMonitorService.runAiAction({
        form_name: FORM_AI_NAMES.NEWS_MONITOR_MANAGE,
        action_name: aiAction.action_name || FORM_AI_NAMES.ACTION_SUMMARIZE_TEXT,
        form_data: {
          cleaned_text: plainCleaned,
          raw_text: stripHtml(form?.cleaned_text || item.raw_text || ""),
          source: item.source || "",
          sender: item.sender || "",
          source_date_jalali: item.source_date_jalali || "",
          news_id: item.id,
        },
      });
      const draft = String(data.draft || data.result_text || "").trim();
      if (!draft) throw new Error("پاسخی از هوش‌افزار دریافت نشد");
      setAiDraft(draft.slice(0, NEWS_FIELD_LIMITS.summary));
      setCompareOpen(true);
    } catch (e) {
      const status = e.response?.status;
      const data = e.response?.data || {};
      if (status === 504 || e.code === "ECONNABORTED") {
        setAiError("زمان پاسخ‌گویی سرور تمام شد. لطفاً خودتان خلاصه را در جعبه «خلاصه خبر» بنویسید.");
      } else {
        const parts = [data.error, data.hint_fa].filter(Boolean);
        setAiError(
          (parts.join(" — ") || e.message || "خطا در خلاصه‌سازی")
          + " — در صورت نیاز، خلاصه را دستی در جعبه زیر بنویسید.",
        );
      }
    } finally {
      setAiBusy(false);
    }
  };

  const acceptSummaryOnly = () => {
    set("summary", plainToEditorHtml(aiDraft));
    setCompareOpen(false);
    setAiDraft("");
  };

  const replaceMainWithSummary = () => {
    set("cleaned_text", plainToEditorHtml(aiDraft));
    set("summary", plainToEditorHtml(aiDraft));
    setCompareOpen(false);
    setAiDraft("");
  };

  const aiBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 8,
    border: "none",
    cursor: aiBusy || readOnly ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: pxToEm(12),
    fontWeight: 600,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    opacity: aiBusy || readOnly ? 0.6 : 1,
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>خلاصه خبر</label>
        <CharCounter current={summaryPlainLen} max={NEWS_FIELD_LIMITS.summary} />
      </div>

      {needsSummarize ? (
        <div
          style={{
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 8,
            border: requiresSummary && !hasSummary
              ? "1px solid rgba(220,38,38,0.55)"
              : "1px solid rgba(245,158,11,0.4)",
            background: requiresSummary && !hasSummary
              ? "rgba(220,38,38,0.12)"
              : "rgba(245,158,11,0.1)",
            color: requiresSummary && !hasSummary ? "#fecaca" : "#fcd34d",
            fontSize: pxToEm(12),
            lineHeight: 1.7,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            {requiresSummary ? (
              <>
                <strong>خبر فوری و بلند است ({toPersianDigits(plainCleaned.length)} کاراکتر).</strong>
                {" "}خلاصه‌سازی الزامی است. آستانه: {toPersianDigits(summarizeThreshold)} کاراکتر.
                {aiAvailable
                  ? " می‌توانید از دکمه هوش‌افزار استفاده کنید یا خلاصه را دستی در جعبه زیر بنویسید."
                  : " هوش‌افزار در دسترس نیست — لطفاً خودتان خلاصه را در جعبه «خلاصه خبر» بنویسید."}
                {!hasSummary ? (
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    تا وقتی خلاصه وارد نشود، ثبت خبر فوری ممکن نیست.
                  </div>
                ) : null}
              </>
            ) : (
              <>
                متن خبر از {toPersianDigits(summarizeThreshold)} کاراکتر بیشتر است
                ({toPersianDigits(plainCleaned.length)}). خلاصه‌سازی پیشنهاد می‌شود
                {aiAvailable ? " — از دکمه هوش‌افزار استفاده کنید یا دستی بنویسید." : " — لطفاً دستی در جعبه زیر بنویسید."}
              </>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ minHeight: compact ? 88 : 110 }}>
        <RichTextEditor
          value={form.summary || ""}
          onChange={(html) => set("summary", html)}
          readOnly={readOnly}
          isDarkMode={theme.isDarkMode !== false}
          minHeight={compact ? 64 : 88}
          maxLength={NEWS_FIELD_LIMITS.summary}
          placeholder={
            requiresSummary
              ? "خلاصهٔ خبر فوری را اینجا بنویسید (الزامی)"
              : "خلاصهٔ کوتاه خبر برای انتشار یا آرشیو"
          }
          allowFullscreen
          allowSourceView
          resizable={false}
        />
      </div>

      {needsSummarize && aiAvailable ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            style={aiBtnStyle}
            disabled={aiBusy || readOnly}
            onClick={runSummarize}
          >
            {aiBusy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
            {aiButtonLabel}
          </button>
          <span style={{ fontSize: pxToEm(11), opacity: 0.7 }}>
            متن: {toPersianDigits(plainCleaned.length)} / آستانه خلاصه: {toPersianDigits(summarizeThreshold)}
          </span>
        </div>
      ) : null}

      {needsSummarize && canAi && !aiAction && !aiBusy ? (
        <div style={{ marginTop: 6, fontSize: pxToEm(11), color: "#fbbf24" }}>
          اکشن «خلاصه‌سازی متن خبر» در مدیریت AI فرم‌ها پیکربندی نشده است. لطفاً خلاصه را دستی بنویسید.
        </div>
      ) : null}

      {aiError ? (
        <div style={{ marginTop: 6, fontSize: pxToEm(11), color: "#f87171" }}>{aiError}</div>
      ) : null}

      <NewsSummarizeCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        originalText={plainCleaned}
        draftText={aiDraft}
        onAcceptSummaryOnly={acceptSummaryOnly}
        onReplaceMainText={replaceMainWithSummary}
        theme={theme}
        busy={aiBusy}
      />
    </div>
  );
}
