import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import RichTextEditor, { stripHtml } from "../../components/analysis/RichTextEditor.jsx";
import newsSmartAnalysisService, { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { aiMarkdownToHtml } from "../../utils/managementSummaryAiText.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { buildSmartAnalysisTitle, hasAnalysisContent } from "./newsSmartAnalysisUtils.js";
import NewsSmartAnalysisHistoryTable from "./NewsSmartAnalysisHistoryTable.jsx";
import NewsSmartAnalysisOutputActions from "./NewsSmartAnalysisOutputActions.jsx";
import NewsSmartAnalysisPackBanner from "./NewsSmartAnalysisPackBanner.jsx";
import NewsSmartAnalysisPackAuditPanel from "./NewsSmartAnalysisPackAuditPanel.jsx";
import api from "../../api/api.js";

/** ارتفاع جعبهٔ متن: حدود ۲۵–۳۰ خط با اسکرول عمودی */
const EDITOR_MIN_HEIGHT = 630;
const EDITOR_MAX_HEIGHT = 756;

function buildStateFromAiResponse(data, actionName, queryState, meta, newsCount, savedId = null, packId = null) {
  const title = data.suggested_title
    || buildSmartAnalysisTitle(queryState, meta, actionName, newsCount);

  if (data.status === "manual_fallback") {
    return {
      analysisType: actionName,
      title,
      bodyHtml: "",
      bodyPlain: "",
      manualFallback: true,
      manualNotice: data.manual_notice_fa,
      savedId,
      packId,
    };
  }

  const html = aiMarkdownToHtml(data.draft || data.result_text || "");
  return {
    analysisType: actionName,
    title,
    bodyHtml: html,
    bodyPlain: stripHtml(html),
    manualFallback: false,
    aiPromptKey: data.prompt_key_used,
    aiUsageKey: data.ai_usage_key_used,
    aiConfigId: data.ai_config_id_used,
    savedId,
    packId,
  };
}

function AnalysisTypeToolbar({
  actions,
  analysisState,
  draftReadyTypes,
  running,
  onSelect,
  onRerun,
  theme,
  disabled = false,
}) {
  const actionButtonStyle = (actionName) => {
    const isActive = analysisState?.analysisType === actionName;
    const hasDraft = draftReadyTypes.includes(actionName);
    return {
      padding: "8px 12px",
      borderRadius: 8,
      border: `1px solid ${isActive ? "#7c3aed" : theme.border}`,
      background: isActive ? "#7c3aed" : theme.card,
      color: isActive ? "#fff" : theme.text,
      cursor: running ? "wait" : "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      opacity: running && running !== actionName ? 0.55 : 1,
    };
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>
        نوع تحلیل — تب فعال همان تحلیلی است که ویرایش، ذخیره و خروجی می‌گیرید
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {actions.map((a) => {
          const hasDraft = draftReadyTypes.includes(a.action_name);
          const isActive = analysisState?.analysisType === a.action_name;
          const isRunning = running === a.action_name;
          return (
            <button
              key={a.action_name}
              type="button"
              disabled={!!running || disabled}
              onClick={() => onSelect(a.action_name)}
              style={actionButtonStyle(a.action_name)}
            >
              {isRunning
                ? <Loader2 size={14} style={{ animation: "smartAnalysisSpin 1s linear infinite" }} />
                : !isActive && hasDraft
                  ? <CheckCircle2 size={12} color={isActive ? "#fff" : "#22c55e"} />
                  : <Sparkles size={12} color={isActive ? "#fff" : "#a855f7"} />}
              {a.button_label_fa || ANALYSIS_ACTION_LABELS[a.action_name]}
            </button>
          );
        })}
        {analysisState?.analysisType && (
          <button
            type="button"
            disabled={!!running || disabled}
            onClick={onRerun}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
              cursor: running ? "wait" : "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            <RefreshCw size={14} />
            اجرای مجدد
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewsSmartAnalysisAnalysisStep({
  queryState,
  queryPayload,
  selectedIds,
  extractedCount,
  analysisState,
  setAnalysisState,
  analysisDrafts,
  setAnalysisDrafts,
  packId,
  packMeta,
  onPackReady,
  onRunningChange,
  onOpenPack,
  onError,
  theme,
  destinations,
  destinationId,
  onDestinationChange,
  historyRefresh = 0,
  onHistoryRefresh,
}) {
  const [aiActions, setAiActions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [running, setRunning] = useState(null);
  const [packCreating, setPackCreating] = useState(false);
  const packCreateStarted = useRef(false);

  useEffect(() => {
    packCreateStarted.current = false;
  }, [queryPayload, selectedIds]);

  useEffect(() => {
    if (packId || packCreateStarted.current) return undefined;
    packCreateStarted.current = true;
    let cancelled = false;
    (async () => {
      setPackCreating(true);
      onError("");
      try {
        const pack = await newsSmartAnalysisService.createPack({
          query_payload: queryPayload,
          selected_ids: selectedIds.length ? selectedIds : undefined,
        });
        if (!cancelled) onPackReady?.(pack);
      } catch (e) {
        if (!cancelled) {
          packCreateStarted.current = false;
          onError(e.response?.data?.error || e.message);
        }
      } finally {
        if (!cancelled) setPackCreating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [packId, queryPayload, selectedIds, onPackReady, onError]);

  useEffect(() => {
    newsSmartAnalysisService.listAiActions()
      .then(setAiActions)
      .catch(() => setAiActions([]));
    api.get("/news/analytics/filters/meta").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    onRunningChange?.(running);
  }, [running, onRunningChange]);

  const newsCount = packMeta?.news_count ?? (selectedIds.length || extractedCount || 0);

  const persistCurrentDraft = (state = analysisState) => {
    if (!state?.analysisType || !hasAnalysisContent(state)) return;
    setAnalysisDrafts((prev) => ({ ...prev, [state.analysisType]: { ...state, packId } }));
  };

  const applyAnalysisState = (nextStateOrFn) => {
    setAnalysisState((prev) => {
      const nextState = typeof nextStateOrFn === "function" ? nextStateOrFn(prev) : nextStateOrFn;
      if (nextState?.analysisType) {
        const withPack = { ...nextState, packId: packId ?? nextState.packId };
        setAnalysisDrafts((drafts) => ({ ...drafts, [withPack.analysisType]: withPack }));
        return withPack;
      }
      return nextState;
    });
  };

  const runAnalysis = async (actionName, { force = false } = {}) => {
    if (running) return;
    if (!packId) {
      onError("پک تحلیلی در حال آماده‌سازی است؛ لطفاً چند لحظه صبر کنید.");
      return;
    }

    const existingDraft = analysisDrafts[actionName];
    if (!force && existingDraft && hasAnalysisContent(existingDraft)) {
      applyAnalysisState(existingDraft);
      return;
    }

    if (force && existingDraft && hasAnalysisContent(existingDraft)) {
      const label = ANALYSIS_ACTION_LABELS[actionName] || actionName;
      if (!window.confirm(`تحلیل «${label}» بازنویسی و دوباره با هوش مصنوعی تولید شود؟`)) {
        return;
      }
    }

    persistCurrentDraft();

    setRunning(actionName);
    onError("");
    try {
      const data = await newsSmartAnalysisService.runAi({
        action_name: actionName,
        form_data: {
          pack_id: packId,
        },
      });

      const savedId = analysisDrafts[actionName]?.savedId ?? null;
      const nextState = buildStateFromAiResponse(
        data, actionName, queryState, meta, newsCount, savedId, packId,
      );
      applyAnalysisState(nextState);
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setRunning(null);
    }
  };

  const switchAnalysisType = (actionName) => {
    if (running) return;
    if (actionName === analysisState?.analysisType) return;

    persistCurrentDraft();

    const cached = analysisDrafts[actionName];
    if (cached && hasAnalysisContent(cached)) {
      applyAnalysisState(cached);
      return;
    }

    runAnalysis(actionName);
  };

  const handleTypeSelect = (actionName) => {
    if (analysisState?.analysisType === actionName) return;
    if (analysisState?.analysisType) {
      switchAnalysisType(actionName);
    } else {
      runAnalysis(actionName);
    }
  };

  const actions = useMemo(() => {
    if (aiActions.length) return aiActions;
    return Object.entries(ANALYSIS_ACTION_LABELS).map(([action_name, label]) => ({
      action_name,
      button_label_fa: label,
    }));
  }, [aiActions]);

  const draftReadyTypes = useMemo(
    () => Object.keys(analysisDrafts).filter((k) => hasAnalysisContent(analysisDrafts[k])),
    [analysisDrafts],
  );

  const showEditor = Boolean(analysisState?.analysisType);

  return (
    <div>
      <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>تحلیل و خروجی</h2>
      <p style={{ fontSize: 13, color: theme.muted, marginBottom: 14, lineHeight: 1.8 }}>
        هر چهار نوع تحلیل روی یک پک (بازهٔ ثابت با اخبار فریزشده) انجام می‌شود.
        با تعویض تب، متن هر نوع حفظ می‌شود.
      </p>

      <NewsSmartAnalysisPackBanner pack={packMeta} theme={theme} loading={packCreating} />

      <AnalysisTypeToolbar
        actions={actions}
        analysisState={analysisState}
        draftReadyTypes={draftReadyTypes}
        running={running}
        onSelect={handleTypeSelect}
        onRerun={() => analysisState?.analysisType && runAnalysis(analysisState.analysisType, { force: true })}
        theme={theme}
        disabled={packCreating || !packId}
      />

      {!showEditor ? (
        <div style={{
          padding: 20,
          borderRadius: 10,
          border: `1px dashed ${theme.border}`,
          textAlign: "center",
          color: theme.muted,
          fontSize: 13,
          lineHeight: 1.8,
        }}
        >
          یکی از انواع تحلیل بالا را انتخاب کنید تا تولید هوشمند آغاز شود.
          {draftReadyTypes.length > 0 && " تب‌های دارای علامت سبز پیش‌نویس از قبل آماده دارند."}
        </div>
      ) : (
        <>
          {analysisState?.manualFallback && (
            <div style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.4)",
              color: theme.isDarkMode ? "#fcd34d" : "#b45309",
              fontSize: 13,
              lineHeight: 1.7,
            }}
            >
              {analysisState.manualNotice
                || "تولید خودکار تحلیل ممکن نبود. لطفاً متن تحلیل را خودتان بنویسید."}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>عنوان تحلیل</label>
            <input
              value={analysisState?.title || ""}
              onChange={(e) => {
                applyAnalysisState((s) => ({ ...s, title: e.target.value }));
              }}
              disabled={!!running}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.input || theme.card,
                color: theme.text,
                fontFamily: "inherit",
                boxSizing: "border-box",
                opacity: running ? 0.7 : 1,
              }}
            />
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
              {ANALYSIS_ACTION_LABELS[analysisState?.analysisType] || "—"}
              {" "}
              ·
              {" "}
              {toPersianDigits(newsCount)}
              {" "}
              خبر
              {analysisState?.savedId
                ? ` · ذخیره‌شده (شناسه ${toPersianDigits(analysisState.savedId)})`
                : " · هنوز ذخیره نشده"}
            </div>
          </div>

          <div style={{
            marginBottom: 4,
            opacity: running ? 0.7 : 1,
            pointerEvents: running ? "none" : "auto",
          }}
          >
            <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>متن تحلیل</label>
            <RichTextEditor
              value={analysisState?.bodyHtml || ""}
              onChange={(html) => {
                applyAnalysisState((s) => ({
                  ...s,
                  bodyHtml: html,
                  bodyPlain: stripHtml(html),
                }));
              }}
              isDarkMode={theme.isDarkMode}
              minHeight={EDITOR_MIN_HEIGHT}
              maxHeight={EDITOR_MAX_HEIGHT}
            />
          </div>

          <NewsSmartAnalysisOutputActions
            analysisState={analysisState}
            setAnalysisState={setAnalysisState}
            packId={packId}
            onError={onError}
            theme={theme}
            destinations={destinations}
            destinationId={destinationId}
            onDestinationChange={onDestinationChange}
            onSaved={async () => {
              onHistoryRefresh?.();
              if (packId) {
                try {
                  const fresh = await newsSmartAnalysisService.getPack(packId);
                  onPackReady?.(fresh);
                } catch {
                  /* ignore refresh failure */
                }
              }
            }}
            disabled={!!running || packCreating || !packId}
          />
        </>
      )}

      <NewsSmartAnalysisPackAuditPanel packId={packId} theme={theme} />

      <NewsSmartAnalysisHistoryTable
        theme={theme}
        refreshKey={historyRefresh}
        onError={onError}
        activePackId={packId}
        onOpenPack={onOpenPack}
      />

      <style>{`
        @keyframes smartAnalysisSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
