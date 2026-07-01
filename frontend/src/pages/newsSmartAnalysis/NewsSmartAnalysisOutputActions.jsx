import React, { useState } from "react";
import { Download, Loader2, Printer, Save, Send } from "lucide-react";
import NewsReportDestinationBar from "../newsReport/NewsReportDestinationBar.jsx";
import newsSmartAnalysisService, { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { stripHtml } from "../../components/analysis/RichTextEditor.jsx";

export default function NewsSmartAnalysisOutputActions({
  analysisState,
  setAnalysisState,
  packId,
  onError,
  theme,
  destinations,
  destinationId,
  onDestinationChange,
  onSaved,
  disabled = false,
}) {
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exportBusy, setExportBusy] = useState("");

  const bodyEmpty = !stripHtml(analysisState?.bodyHtml || "").trim();
  const packMismatch = analysisState?.packId != null
    && packId != null
    && analysisState.packId !== packId;

  const handleSave = async () => {
    if (!packId) {
      onError("پک تحلیلی هنوز آماده نشده است.");
      return;
    }
    if (packMismatch) {
      onError("این تحلیل به پک دیگری تعلق دارد. ابتدا پک مربوطه را از بایگانی باز کنید.");
      return;
    }
    if (bodyEmpty && !analysisState?.manualFallback) {
      onError("متن تحلیل خالی است.");
      return;
    }
    if (bodyEmpty && analysisState?.manualFallback) {
      onError("لطفاً ابتدا متن تحلیل را بنویسید.");
      return;
    }
    if (!analysisState?.title?.trim()) {
      onError("عنوان تحلیل الزامی است.");
      return;
    }
    setSaving(true);
    onError("");
    try {
      const row = await newsSmartAnalysisService.savePackAnalysis(
        packId,
        analysisState.analysisType,
        {
          title: analysisState.title.trim(),
          body_html: analysisState.bodyHtml || "",
          body_plain: analysisState.bodyPlain || stripHtml(analysisState.bodyHtml || ""),
          ai_prompt_key: analysisState.aiPromptKey,
        },
      );
      setAnalysisState((s) => ({ ...s, savedId: row.id, packId }));
      onSaved?.(row);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
<title>${analysisState?.title || ""}</title>
<style>body{font-family:Tahoma,Vazirmatn,sans-serif;margin:24px;line-height:1.9;direction:rtl}
h1{color:#7c3aed;font-size:22px}</style></head><body>
<h1>${analysisState?.title || ""}</h1>
${analysisState?.bodyHtml || ""}
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const doExport = async (format) => {
    if (!analysisState?.savedId) {
      onError("ابتدا تحلیل را ذخیره کنید.");
      return;
    }
    setExportBusy(format);
    onError("");
    try {
      await newsSmartAnalysisService.download(
        analysisState.savedId,
        format,
        `${analysisState.title || "analysis"}.${format === "pdf" ? "pdf" : format === "docx" ? "docx" : "txt"}`,
      );
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setExportBusy("");
    }
  };

  const handlePublish = async () => {
    if (!analysisState?.savedId) {
      onError("ابتدا تحلیل را ذخیره کنید.");
      return;
    }
    if (!destinationId) {
      onError("مقصد انتشار را انتخاب کنید.");
      return;
    }
    setPublishing(true);
    onError("");
    try {
      const r = await newsSmartAnalysisService.publish(analysisState.savedId, parseInt(destinationId, 10));
      if (r.truncated) onError("پیام به‌دلیل محدودیت کاراکتر کوتاه شد؛ برای متن کامل PDF/Word را ارسال کنید.");
      onSaved?.();
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setPublishing(false);
    }
  };

  const btn = (busy = false, variant = "ghost") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    cursor: disabled || busy || packMismatch ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    border: variant === "ghost" ? `1px solid ${theme.border}` : "none",
    background: variant === "primary" ? "#7c3aed" : variant === "save" ? "#0ea5e9" : theme.card,
    color: variant === "ghost" ? theme.text : "#fff",
    opacity: disabled || busy || packMismatch ? 0.55 : 1,
  });

  if (!analysisState?.analysisType) return null;

  const typeLabel = ANALYSIS_ACTION_LABELS[analysisState.analysisType] || "—";

  return (
    <div style={{
      marginTop: 14,
      padding: 14,
      borderRadius: 10,
      border: `1px solid ${theme.border}`,
      background: theme.isDarkMode ? "rgba(148,163,184,0.06)" : "rgba(100,116,139,0.04)",
      opacity: disabled ? 0.65 : 1,
      pointerEvents: disabled ? "none" : "auto",
    }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: theme.text }}>
        ذخیره و خروجی — {typeLabel}
      </div>
      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 10, lineHeight: 1.7 }}>
        ذخیره در پک #
        {toPersianDigits(packId || "—")}
        {analysisState.savedId
          ? ` · شناسه تحلیل: ${toPersianDigits(analysisState.savedId)}`
          : " · هنوز ذخیره نشده"}
      </div>

      {packMismatch && (
        <div style={{
          marginBottom: 10,
          padding: 8,
          borderRadius: 8,
          background: "rgba(248,113,113,0.1)",
          color: "#f87171",
          fontSize: 12,
        }}
        >
          این تحلیل به پک #
          {toPersianDigits(analysisState.packId)}
          {" "}
          تعلق دارد؛ با پک فعال (
          {toPersianDigits(packId)}
          ) متفاوت است.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button type="button" style={btn(saving, "save")} disabled={disabled || saving || packMismatch || !packId} onClick={handleSave}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
          ذخیره
        </button>
        <button type="button" style={btn()} disabled={disabled || bodyEmpty} onClick={handlePrint}>
          <Printer size={14} /> چاپ
        </button>
        <button type="button" style={btn(exportBusy === "pdf")} disabled={disabled || !!exportBusy} onClick={() => doExport("pdf")}>
          <Download size={14} /> PDF
        </button>
        <button type="button" style={btn(exportBusy === "docx")} disabled={disabled || !!exportBusy} onClick={() => doExport("docx")}>
          <Download size={14} /> Word
        </button>
        <button type="button" style={btn(exportBusy === "txt")} disabled={disabled || !!exportBusy} onClick={() => doExport("txt")}>
          <Download size={14} /> پیام
        </button>
      </div>

      <NewsReportDestinationBar
        destinations={destinations}
        destinationId={destinationId}
        onDestinationChange={onDestinationChange}
        theme={theme}
      />

      <button
        type="button"
        style={{ ...btn(publishing, "primary"), marginTop: 10 }}
        disabled={disabled || publishing || packMismatch}
        onClick={handlePublish}
      >
        {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
        انتشار
      </button>
    </div>
  );
}
