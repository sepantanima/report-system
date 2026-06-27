import React, { useEffect, useMemo, useState } from "react";
import { Download, HelpCircle, Loader2, Send } from "lucide-react";
import HelpModal from "../../components/common/HelpModal.jsx";
import { NEWS_REPORT_OUTPUT_HELP } from "../../content/newsFormHelp.jsx";
import newsReportService from "../../services/newsReportService.js";
import {
  OUTPUT_FORMAT_CHOICES,
  buildOutputFormatsFromKeys,
  buildReportApiBody,
  formatReportTitleWithCount,
  stripCountFromLabel,
} from "./newsReportUtils.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import NewsReportHistoryTable from "./NewsReportHistoryTable.jsx";
import NewsReportDestinationBar from "./NewsReportDestinationBar.jsx";

const DEFAULT_FORMAT_KEYS = ["html_card", "html_table", "pdf_a5_card"];

export default function NewsReportOutputStep({
  queryPayload, selectedIds, extractedCount, onError, theme,
  destinations = [], destinationId = "", onDestinationChange,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [selectedFormatKeys, setSelectedFormatKeys] = useState(DEFAULT_FORMAT_KEYS);
  const [publish, setPublish] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTxt, setPreviewTxt] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [previewNewsCount, setPreviewNewsCount] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [publishingId, setPublishingId] = useState(null);

  const outputCount = previewNewsCount ?? (selectedIds.length || extractedCount);
  const finalLabel = useMemo(
    () => formatReportTitleWithCount(reportTitle.trim(), outputCount),
    [reportTitle, outputCount],
  );

  useEffect(() => {
    setReportTitle(stripCountFromLabel(queryPayload?.label || ""));
  }, [queryPayload?.label]);

  const buildBody = (previewFormatKey) => {
    const keys = previewFormatKey ? [previewFormatKey] : selectedFormatKeys;
    const outputFormats = buildOutputFormatsFromKeys(keys);
    const base = buildReportApiBody(queryPayload, {
      label: finalLabel,
      selected_ids: selectedIds.length ? selectedIds : undefined,
      report_kind: "list",
      publish: publish && selectedFormatKeys.length === 1,
      destination_id: publish && destinationId && selectedFormatKeys.length === 1
        ? parseInt(destinationId, 10)
        : undefined,
    });
    if (outputFormats.length > 1) {
      base.output_formats = outputFormats;
      delete base.format;
      delete base.pdf_source;
      delete base.pdf_paper_size;
    } else if (outputFormats[0]) {
      base.format = outputFormats[0].format;
      if (outputFormats[0].pdf_source) base.pdf_source = outputFormats[0].pdf_source;
      if (outputFormats[0].pdf_paper_size) base.pdf_paper_size = outputFormats[0].pdf_paper_size;
    }
    return base;
  };

  useEffect(() => {
    if (!queryPayload?.mode) return;
    const countBody = buildReportApiBody(queryPayload, {
      label: finalLabel,
      selected_ids: selectedIds.length ? selectedIds : undefined,
    });
    newsReportService.previewCount(countBody)
      .then((r) => setPreviewNewsCount(r.count ?? null))
      .catch((e) => {
        setPreviewNewsCount(null);
        onError(e.response?.data?.error || e.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryPayload, selectedIds, finalLabel]);

  const toggleFormat = (key) => {
    setSelectedFormatKeys((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length ? next : prev;
      }
      return [...prev, key];
    });
  };

  const loadPreview = async () => {
    const previewKey = selectedFormatKeys[0];
    const spec = OUTPUT_FORMAT_CHOICES.find((c) => c.key === previewKey)?.output;
    if (!spec) return;
    setPreviewLoading(true);
    onError("");
    try {
      const pf = spec.format === "pdf" ? spec.pdf_source : spec.format;
      const r = await newsReportService.previewContent({ ...buildBody(previewKey), format: pf });
      setPreviewNewsCount(r.news_count ?? null);
      if (pf === "txt") {
        setPreviewTxt(r.content || "");
        setPreviewHtml("");
      } else {
        setPreviewHtml(r.content || "");
        setPreviewTxt("");
      }
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onGenerate = async () => {
    if (!selectedFormatKeys.length) {
      onError("حداقل یک فرمت خروجی انتخاب کنید.");
      return;
    }
    if (!reportTitle.trim()) {
      onError("عنوان گزارش را وارد کنید.");
      return;
    }
    setLoading(true);
    setBatchResults([]);
    onError("");
    try {
      const r = await newsReportService.generate(buildBody());
      if (Array.isArray(r.results)) {
        setBatchResults(r.results);
        if (r.errors?.length) onError(`برخی خروجی‌ها ناموفق: ${r.errors.map((x) => x.error).join(" · ")}`);
      } else {
        setBatchResults([r]);
        if (r.publish_error) onError(`گزارش تولید شد اما انتشار ناموفق: ${r.publish_error}`);
      }
      setHistoryRefresh((k) => k + 1);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const onPublishResult = async (r) => {
    if (!destinationId) {
      onError("مقصد انتشار را انتخاب کنید.");
      return;
    }
    setPublishingId(r.id);
    onError("");
    try {
      await newsReportService.publishReport(r.id, { destination_id: parseInt(destinationId, 10) });
      setHistoryRefresh((k) => k + 1);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setPublishingId(null);
    }
  };

  const inp = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    background: theme.card,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 13,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>تولید گزارش</h2>
        <button type="button" onClick={() => setShowHelp(true)} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none",
          border: `1px solid ${theme.border}`, color: theme.text, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
        }}
        >
          <HelpCircle size={16} /> راهنما
        </button>
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        fontSize: 13,
        marginBottom: 12,
      }}
      >
        <span>استخراج‌شده: <strong>{toPersianDigits(extractedCount ?? 0)}</strong></span>
        <span style={{ color: theme.muted }}>|</span>
        <span>
          انتخاب‌شده: <strong>{toPersianDigits(selectedIds.length)}</strong>
          {selectedIds.length === 0 && <span style={{ color: theme.muted }}> (همه)</span>}
        </span>
        <span style={{ color: theme.muted }}>|</span>
        <span>در خروجی: <strong>{toPersianDigits(outputCount ?? 0)}</strong></span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: theme.muted }}>
          عنوان گزارش تولیدی
        </label>
        <input
          style={inp}
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          placeholder="عنوان نهایی گزارش..."
        />
        {finalLabel && (
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
            پیش‌نمایش: {toPersianDigits(finalLabel)}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600 }}>فرمت‌های خروجی (چندانتخابی)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {OUTPUT_FORMAT_CHOICES.map((opt) => (
            <label
              key={opt.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${selectedFormatKeys.includes(opt.key) ? "#0ea5e9" : theme.border}`,
                background: selectedFormatKeys.includes(opt.key)
                  ? (theme.isDarkMode ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)")
                  : theme.card,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                checked={selectedFormatKeys.includes(opt.key)}
                onChange={() => toggleFormat(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {selectedFormatKeys.length > 1 && (
          <p style={{ fontSize: 11, color: theme.muted, marginTop: 8, marginBottom: 0 }}>
            با انتخاب چند فرمت، همه خروجی‌ها یکجا تولید می‌شوند. انتشار پیام‌رسان فقط برای تک‌فرمت فعال است.
          </p>
        )}
      </div>

      <NewsReportDestinationBar
        destinations={destinations}
        destinationId={destinationId}
        onDestinationChange={onDestinationChange}
        theme={theme}
        compact
      />

      {selectedFormatKeys.length === 1 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13 }}>
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          پس از تولید، گزارش را هم به همین مقصد منتشر کن
        </label>
      )}

      {selectedFormatKeys.length > 1 && (
        <p style={{ fontSize: 11, color: theme.muted, marginTop: -8, marginBottom: 12 }}>
          با چند فرمت، انتشار خودکار غیرفعال است — پس از تولید، هر خروجی را جداگانه به پیام‌رسان ارسال کنید.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button type="button" disabled={previewLoading || !selectedFormatKeys.length} onClick={loadPreview} style={actionBtn(theme)}>
          {previewLoading ? <Loader2 size={16} className="spin" /> : "پیش‌نمایش"}
        </button>
        <button type="button" disabled={loading || !selectedFormatKeys.length} onClick={onGenerate} style={{ ...actionBtn(theme), background: "#0ea5e9", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}>
          {loading ? <Loader2 size={16} className="spin" /> : <><Send size={16} /> تولید {selectedFormatKeys.length > 1 ? `(${toPersianDigits(selectedFormatKeys.length)} فرمت)` : ""}</>}
        </button>
      </div>

      {batchResults.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: theme.card, borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>خروجی‌های تولیدشده</div>
          {batchResults.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 200px" }}>#{toPersianDigits(r.id)} — {r.file_name}</span>
              <button
                type="button"
                disabled={publishingId === r.id || !destinationId}
                onClick={() => onPublishResult(r)}
                style={{ ...actionBtn(theme), padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e" }}
              >
                {publishingId === r.id ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                ارسال
              </button>
              <button type="button" onClick={() => newsReportService.download(r.id, r.file_name)} style={{ ...actionBtn(theme), padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Download size={14} /> دانلود
              </button>
            </div>
          ))}
        </div>
      )}

      {(previewHtml || previewTxt) && (
        <div style={{ marginBottom: 16, border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden" }}>
          {previewHtml ? (
            <iframe title="preview" srcDoc={previewHtml} style={{ width: "100%", minHeight: 320, border: "none", background: "#fff" }} />
          ) : (
            <pre style={{ padding: 12, margin: 0, whiteSpace: "pre-wrap", direction: "rtl", fontSize: 13, color: theme.text, maxHeight: 400, overflow: "auto" }}>{previewTxt}</pre>
          )}
        </div>
      )}

      <NewsReportHistoryTable
        theme={theme}
        isDarkMode={theme.isDarkMode}
        refreshKey={historyRefresh}
        onError={onError}
        destinations={destinations}
        destinationId={destinationId}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} title="راهنمای تولید خروجی">
        <NEWS_REPORT_OUTPUT_HELP />
      </HelpModal>
    </div>
  );
}

function actionBtn(theme) {
  return {
    padding: "10px 16px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  };
}
