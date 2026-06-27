import React, { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Printer, Save, Send, Trash2 } from "lucide-react";
import NewsReportDestinationBar from "../newsReport/NewsReportDestinationBar.jsx";
import newsSmartAnalysisService, { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { stripHtml } from "../../components/analysis/RichTextEditor.jsx";
import { jalaliStr } from "../newsReport/newsReportUtils.js";
import NewsSmartAnalysisHistoryTable from "./NewsSmartAnalysisHistoryTable.jsx";

export default function NewsSmartAnalysisOutputStep({
  queryState,
  queryPayload,
  selectedIds,
  extractedCount,
  analysisState,
  setAnalysisState,
  onError,
  theme,
  destinations,
  destinationId,
  onDestinationChange,
}) {
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exportBusy, setExportBusy] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [msgPreview, setMsgPreview] = useState("");

  const newsCount = selectedIds.length || extractedCount || 0;

  const buildSaveBody = useCallback(() => ({
    id: analysisState?.savedId || undefined,
    title: (analysisState?.title || "").trim(),
    analysis_type: analysisState?.analysisType,
    body_html: analysisState?.bodyHtml || "",
    body_plain: analysisState?.bodyPlain || stripHtml(analysisState?.bodyHtml || ""),
    query_payload: queryPayload,
    selected_ids: selectedIds,
    news_count: newsCount,
    period_from: jalaliStr(queryState.fromDate),
    period_to: jalaliStr(queryState.toDate),
    ai_prompt_key: analysisState?.aiPromptKey,
  }), [analysisState, queryPayload, selectedIds, newsCount, queryState]);

  const handleSave = async () => {
    if (bodyEmpty && !analysisState?.manualFallback) {
      onError("متن تحلیل خالی است.");
      return;
    }
    if (bodyEmpty && analysisState?.manualFallback) {
      onError("لطفاً ابتدا متن تحلیل را در مرحله قبل بنویسید.");
      return;
    }
    if (!analysisState?.title?.trim()) {
      onError("عنوان تحلیل الزامی است.");
      return;
    }
    setSaving(true);
    onError("");
    try {
      const row = await newsSmartAnalysisService.save(buildSaveBody());
      setAnalysisState((s) => ({ ...s, savedId: row.id }));
      setHistoryRefresh((k) => k + 1);
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
      setHistoryRefresh((k) => k + 1);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    const plain = analysisState?.bodyPlain || stripHtml(analysisState?.bodyHtml || "");
    setMsgPreview(plain.slice(0, 500));
  }, [analysisState]);

  if (!analysisState?.analysisType) {
    return (
      <div style={{ color: theme.muted, fontSize: 14 }}>
        ابتدا در مرحلهٔ تحلیل، یک نوع تحلیل را اجرا کنید.
      </div>
    );
  }

  const bodyEmpty = !stripHtml(analysisState.bodyHtml || "").trim();

  const btn = (label, icon, onClick, busy = false, variant = "ghost") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    cursor: busy ? "wait" : "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    border: variant === "ghost" ? `1px solid ${theme.border}` : "none",
    background: variant === "primary" ? "#7c3aed" : variant === "save" ? "#0ea5e9" : theme.card,
    color: variant === "ghost" ? theme.text : "#fff",
    opacity: busy ? 0.7 : 1,
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>ذخیره و خروجی</h2>

      <div style={{
        padding: 12,
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        marginBottom: 14,
        background: theme.card,
      }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{analysisState.title}</div>
        <div style={{ fontSize: 12, color: theme.muted }}>
          {ANALYSIS_ACTION_LABELS[analysisState.analysisType]} · {toPersianDigits(newsCount)} خبر
          {analysisState.savedId ? ` · شناسه ${toPersianDigits(analysisState.savedId)}` : " · ذخیره نشده"}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button type="button" style={btn("ذخیره", null, handleSave, saving, "save")} disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
          ذخیره
        </button>
        <button type="button" style={btn("چاپ", null, handlePrint)} onClick={handlePrint}>
          <Printer size={14} /> چاپ
        </button>
        <button type="button" style={btn("PDF", null, () => doExport("pdf"), exportBusy === "pdf")} disabled={!!exportBusy} onClick={() => doExport("pdf")}>
          <Download size={14} /> PDF
        </button>
        <button type="button" style={btn("Word", null, () => doExport("docx"), exportBusy === "docx")} disabled={!!exportBusy} onClick={() => doExport("docx")}>
          <Download size={14} /> Word
        </button>
        <button type="button" style={btn("پیام", null, () => doExport("txt"), exportBusy === "txt")} disabled={!!exportBusy} onClick={() => doExport("txt")}>
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
        style={{ ...btn("انتشار", null, handlePublish, publishing, "primary"), marginTop: 10 }}
        disabled={publishing}
        onClick={handlePublish}
      >
        {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
        انتشار
      </button>

      <div style={{ marginTop: 16, fontSize: 12, color: theme.muted }}>
        پیش‌نمایش متن پیام (بدون امضا/هشتگ): {toPersianDigits(msgPreview.length)} کاراکتر
      </div>

      <NewsSmartAnalysisHistoryTable
        theme={theme}
        refreshKey={historyRefresh}
        onError={onError}
        destinations={destinations}
        destinationId={destinationId}
        onLoadIntoEditor={(row) => setAnalysisState({
          savedId: row.id,
          title: row.title,
          analysisType: row.analysis_type,
          bodyHtml: row.body_html,
          bodyPlain: row.body_plain,
          aiPromptKey: row.ai_prompt_key,
        })}
      />
    </div>
  );
}
