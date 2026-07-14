import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import RichTextEditor, { stripHtml } from "../../components/analysis/RichTextEditor.jsx";
import { getCurrentUser } from "../../utils/analysisAuth.js";
import newsSmartAnalysisService, {
  ANALYSIS_ACTION_LABELS,
  CUSTOM_PROMPT_ACTION,
  analysisTypeLabel,
  customPromptLabel,
  isCustomPromptType,
} from "../../services/newsSmartAnalysisService.js";
import { aiMarkdownToHtml } from "../../utils/managementSummaryAiText.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import {
  buildSmartAnalysisTitle,
  hasAnalysisContent,
  listUsedCustomSlots,
  nextCustomSlot,
  canDeleteCustomAnalysis,
} from "./newsSmartAnalysisUtils.js";
import NewsSmartAnalysisCustomPromptModal from "./NewsSmartAnalysisCustomPromptModal.jsx";
import NewsSmartAnalysisOutputActions from "./NewsSmartAnalysisOutputActions.jsx";
import NewsSmartAnalysisPackBanner from "./NewsSmartAnalysisPackBanner.jsx";
import NewsSmartAnalysisPackAuditPanel from "./NewsSmartAnalysisPackAuditPanel.jsx";
import api from "../../api/api.js";

/** ارتفاع جعبهٔ متن: حدود ۲۵–۳۰ خط با اسکرول عمودی */
const EDITOR_MIN_HEIGHT = 630;
const EDITOR_MAX_HEIGHT = 756;

function buildStateFromAiResponse(data, actionName, queryState, meta, newsCount, savedId = null, packId = null, customPrompt = "", customPromptTitle = "", createdBy = null) {
  const resolvedType = data.analysis_type || actionName;
  const prompt = data.custom_prompt || customPrompt || "";
  const promptTitle = data.custom_prompt_title || customPromptTitle || "";
  const title = data.suggested_title
    || buildSmartAnalysisTitle(queryState, meta, resolvedType, newsCount, prompt, promptTitle);

  if (data.status === "manual_fallback") {
    return {
      analysisType: resolvedType,
      title,
      bodyHtml: "",
      bodyPlain: "",
      manualFallback: true,
      manualNotice: data.manual_notice_fa,
      savedId,
      packId,
      customPrompt: prompt,
      customPromptTitle: promptTitle,
      createdBy,
    };
  }

  const html = aiMarkdownToHtml(data.draft || data.result_text || "");
  return {
    analysisType: resolvedType,
    title,
    bodyHtml: html,
    bodyPlain: stripHtml(html),
    manualFallback: false,
    aiPromptKey: data.prompt_key_used,
    aiUsageKey: data.ai_usage_key_used,
    aiConfigId: data.ai_config_id_used,
    savedId,
    packId,
    customPrompt: prompt,
    customPromptTitle: promptTitle,
    createdBy,
  };
}

function actionButtonStyle(theme, { isActive, disabled, running, isRunning }) {
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
    opacity: running && !isRunning ? 0.55 : disabled ? 0.5 : 1,
  };
}

function AnalysisTypeToolbar({
  actions,
  customSlots,
  analysisState,
  draftReadyTypes,
  running,
  onSelect,
  onSelectCustom,
  onAddCustom,
  onRerun,
  onDeleteCustom,
  canDeleteCustom,
  activeCustomAnalysis = null,
  theme,
  disabled = false,
  canAddCustom = false,
}) {
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
              style={actionButtonStyle(theme, { isActive, disabled, running, isRunning })}
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
        {analysisState?.analysisType && !isCustomPromptType(analysisState.analysisType) && (
          <button
            type="button"
            disabled={!!running || disabled}
            onClick={onRerun}
            style={actionButtonStyle(theme, { isActive: false, disabled, running, isRunning: false })}
          >
            <RefreshCw size={14} />
            اجرای مجدد
          </button>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>
          تحلیل‌های شخصی (پرامپت دلخواه)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {customSlots.map((slot) => {
            const draft = slot.draft;
            const hasDraft = draftReadyTypes.includes(slot.type);
            const isActive = analysisState?.analysisType === slot.type;
            const isRunning = running === slot.type;
            const label = customPromptLabel(slot.type, draft?.customPrompt || slot.savedPrompt, draft?.customPromptTitle || slot.savedPromptTitle);
            const showDelete = canDeleteCustom?.(slot) && (hasDraft || slot.savedId);
            return (
              <div key={slot.type} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  disabled={!!running || disabled}
                  onClick={() => onSelectCustom(slot)}
                  title={draft?.customPrompt || slot.savedPrompt || label}
                  style={{
                    ...actionButtonStyle(theme, { isActive, disabled, running, isRunning }),
                    maxWidth: 220,
                  }}
                >
                  {isRunning
                    ? <Loader2 size={14} style={{ animation: "smartAnalysisSpin 1s linear infinite" }} />
                    : !isActive && hasDraft
                      ? <CheckCircle2 size={12} color={isActive ? "#fff" : "#22c55e"} />
                      : <Sparkles size={12} color={isActive ? "#fff" : "#a855f7"} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </button>
                {showDelete && (
                  <button
                    type="button"
                    title="حذف تحلیل شخصی"
                    disabled={!!running || disabled}
                    onClick={() => onDeleteCustom?.(slot)}
                    style={{
                      ...actionButtonStyle(theme, { isActive: false, disabled, running, isRunning: false }),
                      padding: "6px 8px",
                      color: "#ef4444",
                      borderColor: "rgba(239,68,68,0.4)",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {canAddCustom && (
            <button
              type="button"
              disabled={!!running || disabled}
              onClick={onAddCustom}
              style={{
                ...actionButtonStyle(theme, { isActive: false, disabled, running, isRunning: false }),
                border: "1px dashed #7c3aed",
                color: "#7c3aed",
              }}
            >
              <Plus size={14} />
              تحلیل شخصی جدید
            </button>
          )}
          {activeCustomAnalysis?.analysisType && isCustomPromptType(activeCustomAnalysis.analysisType) && (
            <>
              <button
                type="button"
                disabled={!!running || disabled}
                onClick={onRerun}
                style={actionButtonStyle(theme, { isActive: false, disabled, running, isRunning: false })}
              >
                <RefreshCw size={14} />
                اجرای مجدد
              </button>
              {canDeleteCustom?.(activeCustomAnalysis) && (
                <button
                  type="button"
                  disabled={!!running || disabled}
                  onClick={() => onDeleteCustom?.({
                    type: activeCustomAnalysis.analysisType,
                    draft: activeCustomAnalysis,
                    savedId: activeCustomAnalysis.savedId,
                    createdBy: activeCustomAnalysis.createdBy,
                  })}
                  style={{
                    ...actionButtonStyle(theme, { isActive: false, disabled, running, isRunning: false }),
                    color: "#ef4444",
                    borderColor: "rgba(239,68,68,0.4)",
                  }}
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              )}
            </>
          )}
        </div>
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
  onBackToList,
  onError,
  theme,
  destinations,
  destinationId,
  onDestinationChange,
  onHistoryRefresh,
  backDisabled = false,
}) {
  const [aiActions, setAiActions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [running, setRunning] = useState(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customModalSlot, setCustomModalSlot] = useState(null);
  const [customModalPrompt, setCustomModalPrompt] = useState("");
  const [customModalTitle, setCustomModalTitle] = useState("");
  const [customPromptPolicyHint, setCustomPromptPolicyHint] = useState("");
  const [deletingCustom, setDeletingCustom] = useState(null);
  const user = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    newsSmartAnalysisService.listAiActions()
      .then(setAiActions)
      .catch(() => setAiActions([]));
    api.get("/news/analytics/filters/meta").then((r) => setMeta(r.data)).catch(() => {});
    newsSmartAnalysisService.getCustomPromptPolicy()
      .then((p) => setCustomPromptPolicyHint(p?.hint_fa || ""))
      .catch(() => {});
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

  const runAnalysis = async (actionName, { force = false, customPrompt = "", customPromptTitle = "" } = {}) => {
    if (running) return;
    if (!packId) {
      onError("پک تحلیلی در حال آماده‌سازی است؛ لطفاً چند لحظه صبر کنید.");
      return;
    }

    const isCustom = isCustomPromptType(actionName) || actionName === CUSTOM_PROMPT_ACTION;
    const resolvedType = isCustomPromptType(actionName) ? actionName : null;
    const existingDraft = resolvedType ? analysisDrafts[resolvedType] : analysisDrafts[actionName];
    const effectiveType = resolvedType || actionName;

    if (!force && existingDraft && hasAnalysisContent(existingDraft)) {
      applyAnalysisState(existingDraft);
      return;
    }

    if (force && existingDraft && hasAnalysisContent(existingDraft)) {
      const label = analysisTypeLabel(effectiveType, existingDraft.customPrompt, existingDraft.customPromptTitle);
      if (!window.confirm(`تحلیل «${label}» بازنویسی و دوباره با هوش مصنوعی تولید شود؟`)) {
        return;
      }
    }

    const promptToUse = customPrompt || existingDraft?.customPrompt || "";
    const promptTitleToUse = customPromptTitle || existingDraft?.customPromptTitle || "";
    if (isCustom && !promptToUse.trim()) {
      onError("پرامپت شخصی الزامی است.");
      return;
    }
    if (isCustom && !promptTitleToUse.trim()) {
      onError("عنوان پرامپت شخصی الزامی است.");
      return;
    }

    persistCurrentDraft();

    const runKey = resolvedType || actionName;
    setRunning(runKey);
    onError("");
    try {
      const formData = { pack_id: packId };
      let apiAction = actionName;
      if (isCustom) {
        apiAction = CUSTOM_PROMPT_ACTION;
        formData.custom_prompt = promptToUse.trim();
        formData.custom_prompt_title = promptTitleToUse.trim();
        if (resolvedType) formData.analysis_type = resolvedType;
      }

      const data = await newsSmartAnalysisService.runAi({
        action_name: apiAction,
        form_data: formData,
      });

      const resultType = data.analysis_type || effectiveType;
      const savedId = analysisDrafts[resultType]?.savedId ?? null;
      const createdBy = analysisDrafts[resultType]?.createdBy ?? user?.id ?? null;
      const nextState = buildStateFromAiResponse(
        data, resultType, queryState, meta, newsCount, savedId, packId,
        promptToUse.trim(), promptTitleToUse.trim(), createdBy,
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

  const usedCustomSlots = useMemo(
    () => listUsedCustomSlots(packMeta, analysisDrafts),
    [packMeta, analysisDrafts],
  );

  const customSlots = useMemo(() => usedCustomSlots.map((type) => {
    const saved = packMeta?.analyses?.[type];
    const draft = analysisDrafts[type];
    return {
      type,
      draft,
      savedPrompt: saved?.custom_prompt || "",
      savedPromptTitle: saved?.custom_prompt_title || "",
      savedId: saved?.id ?? draft?.savedId ?? null,
      createdBy: saved?.created_by ?? draft?.createdBy ?? null,
    };
  }), [usedCustomSlots, analysisDrafts, packMeta]);

  const canDeleteCustomSlot = (slot) => canDeleteCustomAnalysis({
    savedId: slot?.savedId ?? slot?.draft?.savedId,
    createdBy: slot?.createdBy ?? slot?.draft?.createdBy,
  }, user?.id);

  const handleDeleteCustom = async (slot) => {
    const type = slot?.type;
    if (!type || !isCustomPromptType(type)) return;
    if (!canDeleteCustomSlot(slot)) {
      onError("فقط مدیر کل یا ایجادکنندهٔ تحلیل می‌تواند حذف کند.");
      return;
    }

    const label = customPromptLabel(
      type,
      slot.draft?.customPrompt || slot.savedPrompt,
      slot.draft?.customPromptTitle || slot.savedPromptTitle,
    );
    if (!window.confirm(`تحلیل شخصی «${label}» حذف شود؟`)) return;

    setDeletingCustom(type);
    onError("");
    try {
      if (slot.savedId && packId) {
        await newsSmartAnalysisService.deletePackCustomAnalysis(packId, type);
      }

      setAnalysisDrafts((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });

      if (analysisState?.analysisType === type) {
        const remainingType = Object.keys(analysisDrafts).find(
          (k) => k !== type && hasAnalysisContent(analysisDrafts[k]),
        );
        setAnalysisState(remainingType ? analysisDrafts[remainingType] : null);
      }

      onHistoryRefresh?.();
      if (packId) {
        try {
          const fresh = await newsSmartAnalysisService.getPack(packId);
          onPackReady?.(fresh);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setDeletingCustom(null);
    }
  };

  const openCustomModal = ({ slot = null, prompt = "", title = "" } = {}) => {
    setCustomModalSlot(slot || nextCustomSlot(packMeta, analysisDrafts));
    setCustomModalPrompt(prompt);
    setCustomModalTitle(title);
    setCustomModalOpen(true);
  };

  const handleSelectCustom = (slot) => {
    const cached = analysisDrafts[slot.type];
    if (cached && hasAnalysisContent(cached)) {
      applyAnalysisState(cached);
      return;
    }
    if (slot.savedPrompt) {
      runAnalysis(slot.type, {
        customPrompt: slot.savedPrompt,
        customPromptTitle: slot.savedPromptTitle,
      });
      return;
    }
    openCustomModal({
      slot: slot.type,
      prompt: slot.draft?.customPrompt || "",
      title: slot.draft?.customPromptTitle || slot.savedPromptTitle || "",
    });
  };

  const handleCustomSubmit = async ({ title, prompt }) => {
    const slot = customModalSlot || nextCustomSlot(packMeta, analysisDrafts);
    if (!slot) {
      onError("حداکثر ۳ تحلیل شخصی برای هر بسته مجاز است.");
      setCustomModalOpen(false);
      return;
    }
    setCustomModalOpen(false);
    await runAnalysis(slot, { customPrompt: prompt, customPromptTitle: title });
  };

  const actions = useMemo(() => {
    const standard = (aiActions.length ? aiActions : Object.entries(ANALYSIS_ACTION_LABELS)
      .filter(([k]) => !isCustomPromptType(k) && k !== CUSTOM_PROMPT_ACTION)
      .map(([action_name, label]) => ({ action_name, button_label_fa: label })));
    return standard.filter((a) => !isCustomPromptType(a.action_name) && a.action_name !== CUSTOM_PROMPT_ACTION);
  }, [aiActions]);

  const draftReadyTypes = useMemo(
    () => Object.keys(analysisDrafts).filter((k) => hasAnalysisContent(analysisDrafts[k])),
    [analysisDrafts],
  );

  const showEditor = Boolean(analysisState?.analysisType);
  const activeTypeLabel = analysisTypeLabel(
    analysisState?.analysisType,
    analysisState?.customPrompt,
    analysisState?.customPromptTitle,
  );

  return (
    <div>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
      >
        <button
          type="button"
          disabled={backDisabled || !!running}
          onClick={onBackToList}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: backDisabled || running ? "not-allowed" : "pointer",
            opacity: backDisabled || running ? 0.5 : 1,
            fontFamily: "inherit",
            fontSize: 12,
          }}
        >
          <ArrowRight size={14} />
          بازگشت به لیست بسته‌ها
        </button>
      </div>

      <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>تحلیل و خروجی</h2>
      <p style={{ fontSize: 13, color: theme.muted, marginBottom: 14, lineHeight: 1.8 }}>
        چهار نوع تحلیل استاندارد و تا سه تحلیل شخصی با پرامپت دلخواه روی یک بسته (اخبار فریزشده) انجام می‌شود.
      </p>

      <NewsSmartAnalysisPackBanner pack={packMeta} theme={theme} loading={!packId} />

      <AnalysisTypeToolbar
        actions={actions}
        customSlots={customSlots}
        analysisState={analysisState}
        draftReadyTypes={draftReadyTypes}
        running={running}
        onSelect={handleTypeSelect}
        onSelectCustom={handleSelectCustom}
        onAddCustom={() => openCustomModal()}
        onRerun={() => analysisState?.analysisType && runAnalysis(
          analysisState.analysisType,
          {
            force: true,
            customPrompt: analysisState.customPrompt,
            customPromptTitle: analysisState.customPromptTitle,
          },
        )}
        onDeleteCustom={handleDeleteCustom}
        canDeleteCustom={canDeleteCustomSlot}
        activeCustomAnalysis={
          analysisState?.analysisType && isCustomPromptType(analysisState.analysisType)
            ? analysisState
            : null
        }
        theme={theme}
        disabled={!packId || !!deletingCustom}
        canAddCustom={usedCustomSlots.length < 3}
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
          یکی از انواع تحلیل بالا را انتخاب کنید یا «تحلیل شخصی جدید» بسازید.
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

          {isCustomPromptType(analysisState?.analysisType) && analysisState?.customPrompt && (
            <div style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: theme.isDarkMode ? "rgba(168,85,247,0.08)" : "rgba(124,58,237,0.05)",
              border: `1px solid ${theme.border}`,
              fontSize: 12,
              lineHeight: 1.7,
              color: theme.muted,
            }}
            >
              <strong style={{ color: theme.text }}>
                {analysisState.customPromptTitle || "پرامپت شخصی"}
                :
              </strong>
              {" "}
              {analysisState.customPrompt}
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
              {activeTypeLabel}
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
            disabled={!!running || !packId}
          />
        </>
      )}

      <NewsSmartAnalysisPackAuditPanel packId={packId} theme={theme} />

      <NewsSmartAnalysisCustomPromptModal
        open={customModalOpen}
        theme={theme}
        slotLabel={customModalSlot ? customPromptLabel(customModalSlot) : ""}
        initialTitle={customModalTitle}
        initialPrompt={customModalPrompt}
        policyHint={customPromptPolicyHint}
        loading={!!running}
        onSubmit={handleCustomSubmit}
        onDismiss={() => !running && setCustomModalOpen(false)}
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
