import React, { useEffect, useMemo, useState } from "react";
import { Download, HelpCircle, Loader2, Settings2 } from "lucide-react";
import HelpModal from "../../components/common/HelpModal.jsx";
import { NEWS_REPORT_OUTPUT_HELP } from "../../content/newsFormHelp.jsx";
import newsReportService from "../../services/newsReportService.js";
import {
  OUTPUT_FORMAT_CHOICES,
  buildPackGenerateBody,
  buildPackSummaryText,
  buildReportApiBody,
  formatReportTitleWithCount,
  initPackStateFromDefaults,
  applyPackCountsToPackState,
  stripCountFromLabel,
} from "./newsReportUtils.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import NewsReportHistoryTable from "./NewsReportHistoryTable.jsx";
import NewsReportCollapsible from "./NewsReportCollapsible.jsx";
import ReportFilePublishActions from "./ReportFilePublishActions.jsx";

export default function NewsReportOutputStep({
  queryPayload, selectedIds, extractedCount, onError, theme,
  destinations = [],
  packCounts = null,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showPackSettings, setShowPackSettings] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [packState, setPackState] = useState(() => initPackStateFromDefaults(null));
  const [configLoading, setConfigLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [packWarnings, setPackWarnings] = useState([]);
  const [previewNewsCount, setPreviewNewsCount] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const outputCount = previewNewsCount ?? (selectedIds.length || extractedCount);
  const effectivePackState = useMemo(
    () => applyPackCountsToPackState(packState, packCounts),
    [packState, packCounts],
  );
  const finalLabel = useMemo(
    () => formatReportTitleWithCount(reportTitle.trim(), outputCount),
    [reportTitle, outputCount],
  );
  const packSummary = useMemo(() => buildPackSummaryText(effectivePackState), [effectivePackState]);

  useEffect(() => {
    if (!packCounts) return;
    setPackState((prev) => applyPackCountsToPackState(prev, packCounts));
  }, [packCounts]);

  useEffect(() => {
    setReportTitle(stripCountFromLabel(queryPayload?.label || ""));
  }, [queryPayload?.label]);

  useEffect(() => {
    setConfigLoading(true);
    newsReportService.getWorkflowConfig()
      .then((cfg) => setPackState(initPackStateFromDefaults(cfg?.pack_defaults)))
      .catch(() => setPackState(initPackStateFromDefaults(null)))
      .finally(() => setConfigLoading(false));
  }, []);

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

  const togglePackType = (key) => {
    setPackState((prev) => ({
      ...prev,
      enabledTypes: { ...prev.enabledTypes, [key]: !prev.enabledTypes[key] },
    }));
  };

  const togglePackFormat = (packKey, formatKey) => {
    setPackState((prev) => {
      const current = prev.formats[packKey] || [];
      const next = current.includes(formatKey)
        ? current.filter((k) => k !== formatKey)
        : [...current, formatKey];
      return { ...prev, formats: { ...prev.formats, [packKey]: next } };
    });
  };

  const onGenerate = async () => {
    if (!reportTitle.trim()) {
      onError("عنوان گزارش را وارد کنید.");
      return;
    }
    const enabledCount = Object.values(effectivePackState.enabledTypes).filter(Boolean).length;
    if (!enabledCount) {
      onError("هیچ نوع خروجی با خبر موجود نیست.");
      return;
    }
    const hasFormats = (effectivePackState.packTypes || []).some(
      (t) => effectivePackState.enabledTypes[t.key] && (effectivePackState.formats[t.key] || []).length,
    );
    if (!hasFormats) {
      onError("برای هر نوع پک انتخاب‌شده، حداقل یک فرمت مشخص کنید.");
      return;
    }
    setLoading(true);
    setBatchResults([]);
    setPackWarnings([]);
    onError("");
    try {
      const body = buildPackGenerateBody(queryPayload, {
        label: finalLabel,
        selectedIds,
        packState: effectivePackState,
      });
      const r = await newsReportService.generatePack(body);
      setBatchResults(r.results || []);
      setPackWarnings(r.warnings || []);
      if (r.warnings?.length) {
        onError(`هشدار: ${r.warnings.map((w) => w.message || w.error).filter(Boolean).join(" · ")}`);
      }
      setHistoryRefresh((k) => k + 1);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
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

  const formatLabelMap = Object.fromEntries(OUTPUT_FORMAT_CHOICES.map((c) => [c.key, c.label]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>تولید پک گزارش</h2>
        <button type="button" onClick={() => setShowHelp(true)} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none",
          border: `1px solid ${theme.border}`, color: theme.text, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
        }}
        >
          <HelpCircle size={16} /> راهنما
        </button>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 12px", borderRadius: 10,
        border: `1px solid ${theme.border}`, background: theme.card, fontSize: 13, marginBottom: 12,
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
          عنوان پایه گزارش
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

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>خلاصه خروجی</div>
        <div style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          background: theme.isDarkMode ? "rgba(56,189,248,0.06)" : "rgba(14,165,233,0.04)",
          fontSize: 13,
          lineHeight: 1.7,
        }}
        >
          {configLoading ? "…" : (packSummary || "نوع و فرمت پک را تنظیم کنید.")}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowPackSettings((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          <Settings2 size={16} />
          {showPackSettings ? "بستن تنظیمات نوع و فرمت" : "تنظیم نوع و فرمت خروجی"}
        </button>
      </div>

      {showPackSettings && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600 }}>نحوه تحویل</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { value: "zip", label: "فایل ZIP (یکجا)" },
                { value: "separate", label: "فایل‌های جداگانه" },
              ].map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="pack_delivery"
                    checked={packState.delivery === opt.value}
                    onChange={() => setPackState((prev) => ({ ...prev, delivery: opt.value }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {configLoading ? (
            <Loader2 className="spin" size={20} />
          ) : (
            <NewsReportCollapsible title="انواع پک و فرمت‌ها" defaultOpen theme={theme}>
              {(effectivePackState.packTypes || []).length === 0 ? (
                <div style={{ fontSize: 13, color: theme.muted, padding: 8 }}>
                  هیچ نوع خروجی با خبر موجود نیست.
                </div>
              ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(effectivePackState.packTypes || []).map((pt) => (
                  <div
                    key={pt.key}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${effectivePackState.enabledTypes[pt.key] ? "#0ea5e9" : theme.border}`,
                      background: theme.card,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: pt.help ? 4 : 8 }}>
                      <input
                        type="checkbox"
                        checked={!!effectivePackState.enabledTypes[pt.key]}
                        onChange={() => togglePackType(pt.key)}
                      />
                      {pt.label}
                      {packCounts && (
                        <span style={{ fontWeight: 400, fontSize: 11, color: theme.muted }}>
                          ({toPersianDigits(packCounts[pt.key] ?? 0)} خبر)
                        </span>
                      )}
                    </label>
                    {pt.help && (
                      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, paddingRight: 24 }}>
                        {pt.help}
                      </div>
                    )}
                    {effectivePackState.enabledTypes[pt.key] && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingRight: 24 }}>
                        {OUTPUT_FORMAT_CHOICES.map((fmt) => (
                          <label
                            key={fmt.key}
                            style={{
                              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                              padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                              border: `1px solid ${(effectivePackState.formats[pt.key] || []).includes(fmt.key) ? "#0ea5e9" : theme.border}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(effectivePackState.formats[pt.key] || []).includes(fmt.key)}
                              onChange={() => togglePackFormat(pt.key, fmt.key)}
                            />
                            {fmt.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </NewsReportCollapsible>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          disabled={loading || configLoading}
          onClick={onGenerate}
          style={{
            ...actionBtn(theme),
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : "تولید پک"}
        </button>
      </div>

      {packWarnings.length > 0 && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "rgba(245,158,11,0.1)", fontSize: 12 }}>
          {packWarnings.map((w, i) => (
            <div key={i}>{w.message || w.error || JSON.stringify(w)}</div>
          ))}
        </div>
      )}

      {batchResults.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: theme.card, borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>خروجی‌های تولیدشده</div>
          {batchResults.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 200px" }}>#{toPersianDigits(r.id)} — {r.file_name}</span>
              {r.format_key && (
                <span style={{ fontSize: 11, color: theme.muted }}>
                  {formatLabelMap[r.format_key] || r.format_key}
                </span>
              )}
              <button
                type="button"
                onClick={() => newsReportService.download(r.id, r.file_name)}
                style={{ ...actionBtn(theme), padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Download size={14} /> دانلود
              </button>
              <ReportFilePublishActions
                reportId={r.id}
                fileName={r.file_name}
                status="ready"
                destinations={destinations}
                theme={theme}
                onError={onError}
                onPublished={() => setHistoryRefresh((k) => k + 1)}
                compact
              />
            </div>
          ))}
        </div>
      )}

      <NewsReportHistoryTable
        theme={theme}
        isDarkMode={theme.isDarkMode}
        refreshKey={historyRefresh}
        onError={onError}
        destinations={destinations}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} title="راهنمای تولید پک خروجی">
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
