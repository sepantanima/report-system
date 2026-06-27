import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormPageLayout from "../../components/common/FormPageLayout.jsx";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import messengerAdminService from "../../services/messengerAdminService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import NewsReportQueryStep, { createInitialQueryState } from "./NewsReportQueryStep.jsx";
import NewsReportResultsStep from "./NewsReportResultsStep.jsx";
import NewsReportOutputStep from "./NewsReportOutputStep.jsx";
import NewsReportStepNav from "./NewsReportStepNav.jsx";

export default function NewsReportWorkspace() {
  const navigate = useNavigate();
  const allowed = hasPermission(getSessionRoles(), "news_report");
  const { isDarkMode } = useAppTheme();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [queryState, setQueryState] = useState(createInitialQueryState);
  const [selectedIds, setSelectedIds] = useState([]);
  const [extractedCount, setExtractedCount] = useState(null);
  const [hasVisitedSelection, setHasVisitedSelection] = useState(false);
  const [publishDestinations, setPublishDestinations] = useState([]);
  const [publishDestinationId, setPublishDestinationId] = useState("");

  const hasExtracted = Boolean(queryState.queryPayload) && extractedCount != null;

  const theme = useMemo(() => ({
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    accent: "#38bdf8",
    isDarkMode,
  }), [isDarkMode]);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    messengerAdminService.listDestinations(MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setPublishDestinations(list);
        if (list[0]?.id) setPublishDestinationId(String(list[0].id));
      })
      .catch(() => setPublishDestinations([]));
  }, []);

  const goToStep = (next) => {
    if (next === 2 && !hasExtracted) return;
    if (next === 3 && (!hasExtracted || !hasVisitedSelection)) return;
    if (next === 2) setHasVisitedSelection(true);
    setStep(next);
    setErr("");
  };

  const handleExtracted = (count, payload) => {
    if (!payload) {
      setExtractedCount(null);
      setHasVisitedSelection(false);
      return;
    }
    setExtractedCount(count);
    setQueryState((s) => ({ ...s, queryPayload: payload }));
    setSelectedIds([]);
    setHasVisitedSelection(false);
  };

  if (!allowed) {
    return <div style={{ padding: 24, color: theme.text }}>دسترسی به تولید گزارش اخبار مجاز نیست.</div>;
  }

  const stepNav = (
    <NewsReportStepNav
      step={step}
      onStepChange={goToStep}
      canGoToStep2={hasExtracted}
      canGoToStep3={hasExtracted && hasVisitedSelection}
      theme={theme}
      isMobile={isMobile}
    />
  );

  return (
    <FormPageLayout
      title="گزارش و انتشار اخبار"
      documentTitle="گزارش و انتشار اخبار"
      headerEnd={hasExtracted ? (
        <span style={{ fontSize: "0.79em", color: theme.muted, whiteSpace: "nowrap" }}>
          استخراج: {toPersianDigits(extractedCount)}
          {selectedIds.length > 0 && ` · انتخاب: ${toPersianDigits(selectedIds.length)}`}
        </span>
      ) : null}
      maxWidth="1100px"
      contentPadding={isMobile ? "12px 16px 32px" : "16px 24px 32px"}
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

        {stepNav}

        {step === 1 && (
          <NewsReportQueryStep
            state={queryState}
            setState={setQueryState}
            onError={setErr}
            onExtracted={handleExtracted}
            extractedCount={extractedCount}
            theme={theme}
            isMobile={isMobile}
          />
        )}
        {step === 2 && queryState.queryPayload && (
          <NewsReportResultsStep
            queryPayload={queryState.queryPayload}
            pageSize={queryState.pageSize || 20}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            extractedCount={extractedCount}
            onExtractedCount={setExtractedCount}
            onError={setErr}
            theme={theme}
            destinations={publishDestinations}
            destinationId={publishDestinationId}
            onDestinationChange={setPublishDestinationId}
          />
        )}
        {step === 3 && queryState.queryPayload && hasVisitedSelection && (
          <NewsReportOutputStep
            queryPayload={queryState.queryPayload}
            selectedIds={selectedIds}
            extractedCount={extractedCount}
            onError={setErr}
            theme={theme}
            destinations={publishDestinations}
            destinationId={publishDestinationId}
            onDestinationChange={setPublishDestinationId}
          />
        )}
    </FormPageLayout>
  );
}
