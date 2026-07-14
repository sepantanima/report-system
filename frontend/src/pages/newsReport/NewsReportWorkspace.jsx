import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormPageLayout from "../../components/common/FormPageLayout.jsx";
import { getSessionRoles, hasPermission } from "../../utils/userRoles.js";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { getFormPageTheme } from "../../theme/formPageTheme.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import newsReportService from "../../services/newsReportService.js";
import messengerAdminService from "../../services/messengerAdminService.js";
import { MESSENGER_USAGE_KEYS } from "../../constants/messengerUsageKeys.js";
import { buildReportApiBody } from "./newsReportUtils.js";
import NewsReportQueryStep, { createInitialQueryState } from "./NewsReportQueryStep.jsx";
import NewsReportResultsStep from "./NewsReportResultsStep.jsx";
import NewsReportOutputStep from "./NewsReportOutputStep.jsx";
import NewsReportStepNav from "./NewsReportStepNav.jsx";
import NewsReportPackCountBar from "./NewsReportPackCountBar.jsx";

export default function NewsReportWorkspace() {
  const allowed = hasPermission(getSessionRoles(), "news_report");
  const { isDarkMode } = useAppTheme();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [queryState, setQueryState] = useState(createInitialQueryState);
  const [selectedIds, setSelectedIds] = useState([]);
  const [extractedCount, setExtractedCount] = useState(null);
  const [hasVisitedSelection, setHasVisitedSelection] = useState(false);
  const [publishDestinations, setPublishDestinations] = useState([]);
  const [workflowDefaultFilters, setWorkflowDefaultFilters] = useState(null);
  const [packCounts, setPackCounts] = useState(null);
  const [packCountsLoading, setPackCountsLoading] = useState(false);
  const packCountsReqRef = useRef(0);

  const hasExtracted = Boolean(queryState.queryPayload) && extractedCount != null;

  const theme = useMemo(() => ({
    ...getFormPageTheme(isDarkMode),
    isDarkMode,
  }), [isDarkMode]);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    newsReportService.getWorkflowConfig()
      .then((cfg) => setWorkflowDefaultFilters(cfg?.report_default_filters || null))
      .catch(() => setWorkflowDefaultFilters(null));
  }, []);

  useEffect(() => {
    messengerAdminService.listDestinations(MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH)
      .then((rows) => setPublishDestinations(Array.isArray(rows) ? rows : []))
      .catch(() => setPublishDestinations([]));
  }, []);

  const refreshPackCounts = useCallback(async (payloadOverride) => {
    const payload = payloadOverride || queryState.queryPayload;
    if (!payload?.mode) {
      setPackCounts(null);
      return;
    }
    const reqId = ++packCountsReqRef.current;
    setPackCountsLoading(true);
    try {
      const body = buildReportApiBody(payload, {
        selected_ids: selectedIds.length ? selectedIds : undefined,
      });
      const counts = await newsReportService.previewPackCounts(body);
      if (reqId !== packCountsReqRef.current) return;
      setPackCounts(counts);
    } catch {
      if (reqId === packCountsReqRef.current) setPackCounts(null);
    } finally {
      if (reqId === packCountsReqRef.current) setPackCountsLoading(false);
    }
  }, [queryState.queryPayload, selectedIds]);

  useEffect(() => {
    if (!hasExtracted) {
      packCountsReqRef.current += 1;
      setPackCounts(null);
      return;
    }
    if (queryState.queryPayload) refreshPackCounts();
  }, [selectedIds, hasExtracted, queryState.queryPayload, refreshPackCounts]);

  const goToStep = (next) => {
    if (next === 2 && !hasExtracted) return;
    if (next === 3 && (!hasExtracted || !hasVisitedSelection)) return;
    if (next === 2) setHasVisitedSelection(true);
    setStep(next);
    setErr("");
  };

  const handleExtracted = (count, payload) => {
    if (!payload) {
      packCountsReqRef.current += 1;
      setExtractedCount(null);
      setHasVisitedSelection(false);
      setPackCounts(null);
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

  const headerSubRow = (
    <div style={{ width: "100%" }}>
      <NewsReportStepNav
        step={step}
        onStepChange={goToStep}
        canGoToStep2={hasExtracted}
        canGoToStep3={hasExtracted && hasVisitedSelection}
        theme={theme}
        isMobile={isMobile}
      />
      {hasExtracted && (
        <NewsReportPackCountBar counts={packCounts} theme={theme} loading={packCountsLoading} />
      )}
    </div>
  );

  return (
    <FormPageLayout
      title="گزارش و انتشار اخبار"
      documentTitle="گزارش و انتشار اخبار"
      subRow={headerSubRow}
      headerEnd={hasExtracted ? (
        <span style={{ fontSize: "0.79em", color: theme.muted, whiteSpace: "nowrap" }}>
          استخراج: {toPersianDigits(extractedCount)}
          {selectedIds.length > 0 && ` · انتخاب: ${toPersianDigits(selectedIds.length)}`}
        </span>
      ) : null}
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

      {step === 1 && (
        <NewsReportQueryStep
          state={queryState}
          setState={setQueryState}
          onError={setErr}
          onExtracted={handleExtracted}
          extractedCount={extractedCount}
          theme={theme}
          isMobile={isMobile}
          workflowDefaultFilters={workflowDefaultFilters}
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
          packCounts={packCounts}
        />
      )}
    </FormPageLayout>
  );
}
