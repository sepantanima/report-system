import React, { useEffect, useMemo, useState } from "react";
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
import {
  createInitialSmartAnalysisState,
  hasAnalysisContent,
  workspaceFromPack,
} from "./newsSmartAnalysisUtils.js";
import NewsSmartAnalysisProgressOverlay from "./NewsSmartAnalysisProgressOverlay.jsx";

export default function NewsSmartAnalysisWorkspace() {
  const allowed = hasPermission(getSessionRoles(), "ai_process");
  const { isDarkMode } = useAppTheme();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [queryState, setQueryState] = useState(createInitialSmartAnalysisState);
  const [selectedIds, setSelectedIds] = useState([]);
  const [extractedCount, setExtractedCount] = useState(null);
  const [hasVisitedSelect, setHasVisitedSelect] = useState(false);
  const [analysisState, setAnalysisState] = useState(null);
  const [analysisDrafts, setAnalysisDrafts] = useState({});
  const [packId, setPackId] = useState(null);
  const [packMeta, setPackMeta] = useState(null);
  const [aiRunning, setAiRunning] = useState(null);
  const [publishDestinations, setPublishDestinations] = useState([]);
  const [publishDestinationId, setPublishDestinationId] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);

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

  const resetAnalysisSession = () => {
    setAnalysisState(null);
    setAnalysisDrafts({});
    setPackId(null);
    setPackMeta(null);
  };

  const applyPackToWorkspace = (pack) => {
    const ws = workspaceFromPack(pack);
    if (!ws) return;
    setQueryState(ws.queryState);
    setSelectedIds(ws.selectedIds);
    setExtractedCount(ws.extractedCount);
    setPackId(ws.packId);
    setPackMeta(ws.packMeta);
    setAnalysisDrafts(ws.analysisDrafts);
    setAnalysisState(ws.analysisState);
    setHasVisitedSelect(true);
    setStep(3);
    setErr("");
  };

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

  const goToStep = (next) => {
    if (aiRunning) return;
    if (next === 2 && !hasExtracted) return;
    if (next === 3 && (!hasExtracted || !hasVisitedSelect)) return;
    if (next === 2) setHasVisitedSelect(true);
    setStep(next);
    setErr("");
  };

  const handleExtracted = (count, payload) => {
    if (!payload) {
      setExtractedCount(null);
      setHasVisitedSelect(false);
      resetAnalysisSession();
      return;
    }
    setExtractedCount(count);
    setQueryState((s) => ({ ...s, queryPayload: payload }));
    setSelectedIds([]);
    setHasVisitedSelect(false);
    resetAnalysisSession();
  };

  if (!allowed) {
    return <div style={{ padding: 24 }}>دسترسی به پردازش هوشمند اخبار مجاز نیست.</div>;
  }

  return (
    <FormPageLayout
      title="پردازش هوشمند اخبار"
      documentTitle="پردازش هوشمند اخبار"
      headerEnd={hasExtracted ? (
        <span style={{ fontSize: "0.79em", color: theme.muted }}>
          یافت‌شده: {toPersianDigits(extractedCount)}
          {selectedIds.length > 0 && ` · انتخاب: ${toPersianDigits(selectedIds.length)}`}
          {packId ? ` · پک: ${toPersianDigits(packId)}` : ""}
        </span>
      ) : null}
      maxWidth="1100px"
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

      <NewsSmartAnalysisStepNav
        step={step}
        onStepChange={goToStep}
        canGoToStep2={hasExtracted}
        canGoToStep3={hasExtracted && hasVisitedSelect}
        theme={theme}
        isMobile={isMobile}
        blocked={!!aiRunning}
      />

      {aiRunning && (
        <NewsSmartAnalysisProgressOverlay actionName={aiRunning} theme={theme} />
      )}

      {step === 1 && (
        <NewsSmartAnalysisQueryStep
          state={queryState}
          setState={setQueryState}
          onError={setErr}
          onExtracted={handleExtracted}
          extractedCount={extractedCount}
          theme={theme}
        />
      )}

      {step === 2 && queryState.queryPayload && (
        <NewsSmartAnalysisSelectStep
          queryPayload={queryState.queryPayload}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          extractedCount={extractedCount}
          onError={setErr}
          theme={theme}
        />
      )}

      {step === 3 && queryState.queryPayload && hasVisitedSelect && (
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
          onOpenPack={loadPack}
          onError={setErr}
          theme={theme}
          destinations={publishDestinations}
          destinationId={publishDestinationId}
          onDestinationChange={setPublishDestinationId}
          historyRefresh={historyRefresh}
          onHistoryRefresh={() => setHistoryRefresh((k) => k + 1)}
        />
      )}
    </FormPageLayout>
  );
}
