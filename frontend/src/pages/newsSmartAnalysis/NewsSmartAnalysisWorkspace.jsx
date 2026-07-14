import React, { useCallback, useEffect, useMemo, useState } from "react";
import FormPageLayout from "../../components/common/FormPageLayout.jsx";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import messengerAdminService from "../../services/messengerAdminService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import newsSmartAnalysisService from "../../services/newsSmartAnalysisService.js";
import NewsSmartAnalysisStepNav from "./NewsSmartAnalysisStepNav.jsx";
import NewsSmartAnalysisQueryStep from "./NewsSmartAnalysisQueryStep.jsx";
import NewsSmartAnalysisSelectStep from "./NewsSmartAnalysisSelectStep.jsx";
import NewsSmartAnalysisAnalysisStep from "./NewsSmartAnalysisAnalysisStep.jsx";
import NewsSmartAnalysisHistoryTable from "./NewsSmartAnalysisHistoryTable.jsx";
import NewsSmartAnalysisEmptyPackModal from "./NewsSmartAnalysisEmptyPackModal.jsx";
import {
  createInitialSmartAnalysisState,
  hasAnalysisContent,
  isPackEffectivelyEmpty,
  workspaceFromPack,
} from "./newsSmartAnalysisUtils.js";
import NewsSmartAnalysisProgressOverlay from "./NewsSmartAnalysisProgressOverlay.jsx";

export default function NewsSmartAnalysisWorkspace() {
  const allowed = hasPermission(getSessionRoles(), "ai_process");
  const { isDarkMode } = useAppTheme();
  const [view, setView] = useState("home");
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [queryState, setQueryState] = useState(createInitialSmartAnalysisState);
  const [selectedIds, setSelectedIds] = useState([]);
  const [extractedCount, setExtractedCount] = useState(null);
  const [analysisState, setAnalysisState] = useState(null);
  const [analysisDrafts, setAnalysisDrafts] = useState({});
  const [packId, setPackId] = useState(null);
  const [packMeta, setPackMeta] = useState(null);
  const [aiRunning, setAiRunning] = useState(null);
  const [publishDestinations, setPublishDestinations] = useState([]);
  const [publishDestinationId, setPublishDestinationId] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [emptyPackModalOpen, setEmptyPackModalOpen] = useState(false);
  const [emptyPackDeleting, setEmptyPackDeleting] = useState(false);

  const hasExtracted = Boolean(queryState.queryPayload) && extractedCount != null;

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#a855f7",
    accentPurple: "#a855f7",
    input: isDarkMode ? "#0f172a" : "#f1f5f9",
    isDarkMode,
  }), [isDarkMode]);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    messengerAdminService.listDestinations(MESSENGER_USAGE_KEYS.NEWS_SMART_ANALYSIS_PUBLISH)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setPublishDestinations(list);
        if (list[0]?.id) setPublishDestinationId(String(list[0].id));
      })
      .catch(() => setPublishDestinations([]));
  }, []);

  useEffect(() => {
    if (!analysisState?.analysisType || !hasAnalysisContent(analysisState)) return;
    setAnalysisDrafts((prev) => ({
      ...prev,
      [analysisState.analysisType]: { ...analysisState, packId },
    }));
  }, [analysisState, packId]);

  const resetWizardState = useCallback(() => {
    setQueryState(createInitialSmartAnalysisState());
    setSelectedIds([]);
    setExtractedCount(null);
    setStep(1);
    setErr("");
  }, []);

  const resetAnalysisSession = useCallback(() => {
    setAnalysisState(null);
    setAnalysisDrafts({});
    setPackId(null);
    setPackMeta(null);
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    setStep(1);
    resetWizardState();
    resetAnalysisSession();
    setErr("");
  }, [resetWizardState, resetAnalysisSession]);

  const applyPackToWorkspace = useCallback((pack) => {
    const ws = workspaceFromPack(pack);
    if (!ws) return;
    setQueryState(ws.queryState);
    setSelectedIds(ws.selectedIds);
    setExtractedCount(ws.extractedCount);
    setPackId(ws.packId);
    setPackMeta(ws.packMeta);
    setAnalysisDrafts(ws.analysisDrafts);
    setAnalysisState(ws.analysisState);
    setView("work");
    setStep(3);
    setErr("");
  }, []);

  const loadPack = async (id) => {
    try {
      const pack = await newsSmartAnalysisService.getPack(id);
      if (!pack) {
        setErr("پک یافت نشد.");
        return;
      }
      applyPackToWorkspace(pack);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const handlePackReady = (pack) => {
    setPackId(pack.id);
    setPackMeta(pack);
  };

  const startNewPack = () => {
    resetWizardState();
    resetAnalysisSession();
    setView("create");
  };

  const handlePackCreated = (pack) => {
    handlePackReady(pack);
    setHistoryRefresh((k) => k + 1);
    setView("work");
    setStep(3);
  };

  const goToStep = (next) => {
    if (aiRunning) return;
    if (view !== "create") return;
    if (next === 2 && !hasExtracted) return;
    setStep(next);
    setErr("");
  };

  const handleExtracted = (count, payload) => {
    if (!payload) {
      setExtractedCount(null);
      resetAnalysisSession();
      return;
    }
    setExtractedCount(count);
    setQueryState((s) => ({ ...s, queryPayload: payload }));
    setSelectedIds([]);
    resetAnalysisSession();
  };

  const handleBackToList = () => {
    if (aiRunning) return;
    if (packId && isPackEffectivelyEmpty(packMeta, analysisDrafts)) {
      setEmptyPackModalOpen(true);
      return;
    }
    goHome();
    setHistoryRefresh((k) => k + 1);
  };

  const handleEmptyPackContinueLater = () => {
    setEmptyPackModalOpen(false);
    goHome();
    setHistoryRefresh((k) => k + 1);
  };

  const handleEmptyPackDelete = async () => {
    if (!packId) {
      handleEmptyPackContinueLater();
      return;
    }
    setEmptyPackDeleting(true);
    try {
      await newsSmartAnalysisService.deletePack(packId);
      setEmptyPackModalOpen(false);
      goHome();
      setHistoryRefresh((k) => k + 1);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setEmptyPackDeleting(false);
    }
  };

  const handleCreateBack = () => {
    if (aiRunning) return;
    if (step <= 1) {
      goHome();
      return;
    }
    goToStep(step - 1);
  };

  useEffect(() => {
    if (view !== "work" || !packId) return undefined;
    const onBeforeUnload = (e) => {
      if (isPackEffectivelyEmpty(packMeta, analysisDrafts)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [view, packId, packMeta, analysisDrafts]);

  if (!allowed) {
    return <div style={{ padding: 24 }}>دسترسی به پردازش هوشمند اخبار مجاز نیست.</div>;
  }

  const headerEnd = view === "work" && hasExtracted ? (
    <span style={{ fontSize: "0.79em", color: theme.muted }}>
      یافت‌شده: {toPersianDigits(extractedCount)}
      {selectedIds.length > 0 && ` · انتخاب: ${toPersianDigits(selectedIds.length)}`}
      {packId ? ` · پک: ${toPersianDigits(packId)}` : ""}
    </span>
  ) : null;

  return (
    <FormPageLayout
      title="پردازش هوشمند اخبار"
      documentTitle="پردازش هوشمند اخبار"
      headerEnd={headerEnd}
    >
      {err && (
        <div style={{
          color: "#f87171",
          marginBottom: 12,
          padding: 10,
          background: "rgba(248,113,113,0.1)",
          borderRadius: 8,
        }}
        >
          {err}
        </div>
      )}

      {view === "create" && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button
              type="button"
              disabled={!!aiRunning}
              onClick={handleCreateBack}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: aiRunning ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                opacity: aiRunning ? 0.5 : 1,
              }}
            >
              {step <= 1 ? "بازگشت به لیست بسته‌ها" : "مرحلهٔ قبل"}
            </button>
          </div>
          <NewsSmartAnalysisStepNav
            step={step}
            onStepChange={goToStep}
            canGoToStep2={hasExtracted}
            theme={theme}
            isMobile={isMobile}
            blocked={!!aiRunning}
          />
        </>
      )}

      {aiRunning && (
        <NewsSmartAnalysisProgressOverlay actionName={aiRunning} theme={theme} />
      )}

      {view === "home" && (
        <NewsSmartAnalysisHistoryTable
          theme={theme}
          refreshKey={historyRefresh}
          onError={setErr}
          onOpenPack={loadPack}
          onCreateNew={startNewPack}
          isLanding
        />
      )}

      {view === "create" && step === 1 && (
        <NewsSmartAnalysisQueryStep
          state={queryState}
          setState={setQueryState}
          onError={setErr}
          onExtracted={handleExtracted}
          extractedCount={extractedCount}
          theme={theme}
        />
      )}

      {view === "create" && step === 2 && queryState.queryPayload && (
        <NewsSmartAnalysisSelectStep
          queryPayload={queryState.queryPayload}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          extractedCount={extractedCount}
          onError={setErr}
          theme={theme}
          onPackCreated={handlePackCreated}
        />
      )}

      {view === "work" && queryState.queryPayload && packId && (
        <NewsSmartAnalysisAnalysisStep
          queryState={queryState}
          queryPayload={queryState.queryPayload}
          selectedIds={selectedIds}
          extractedCount={extractedCount}
          analysisState={analysisState}
          setAnalysisState={setAnalysisState}
          analysisDrafts={analysisDrafts}
          setAnalysisDrafts={setAnalysisDrafts}
          packId={packId}
          packMeta={packMeta}
          onPackReady={handlePackReady}
          onRunningChange={setAiRunning}
          onBackToList={handleBackToList}
          onError={setErr}
          theme={theme}
          destinations={publishDestinations}
          destinationId={publishDestinationId}
          onDestinationChange={setPublishDestinationId}
          onHistoryRefresh={() => setHistoryRefresh((k) => k + 1)}
          backDisabled={!!aiRunning}
        />
      )}

      <NewsSmartAnalysisEmptyPackModal
        open={emptyPackModalOpen}
        packId={packId}
        packTitle={packMeta?.title}
        theme={theme}
        loading={emptyPackDeleting}
        onDelete={handleEmptyPackDelete}
        onContinueLater={handleEmptyPackContinueLater}
        onDismiss={() => !emptyPackDeleting && setEmptyPackModalOpen(false)}
      />
    </FormPageLayout>
  );
}
