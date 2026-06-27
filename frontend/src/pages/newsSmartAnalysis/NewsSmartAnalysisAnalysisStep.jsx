import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import RichTextEditor, { stripHtml } from "../../components/analysis/RichTextEditor.jsx";
import newsSmartAnalysisService, { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { aiMarkdownToHtml } from "../../utils/managementSummaryAiText.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { buildSmartAnalysisTitle } from "./newsSmartAnalysisUtils.js";
import api from "../../api/api.js";

export default function NewsSmartAnalysisAnalysisStep({
  queryState,
  queryPayload,
  selectedIds,
  extractedCount,
  analysisState,
  setAnalysisState,
  onError,
  theme,
}) {
  const [aiActions, setAiActions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [running, setRunning] = useState(null);

  useEffect(() => {
    newsSmartAnalysisService.listAiActions()
      .then(setAiActions)
      .catch(() => setAiActions([]));
    api.get("/news/analytics/filters/meta").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  const newsCount = selectedIds.length || extractedCount || 0;

  const runAnalysis = async (actionName) => {
    setRunning(actionName);
    onError("");
    try {
      const data = await newsSmartAnalysisService.runAi({
        action_name: actionName,
        form_data: {
          query_payload: queryPayload,
          selected_ids: selectedIds.length ? selectedIds : undefined,
        },
      });

      if (data.status === "manual_fallback") {
        const title = data.suggested_title
          || buildSmartAnalysisTitle(queryState, meta, actionName, newsCount);
        setAnalysisState({
          analysisType: actionName,
          title,
          bodyHtml: "",
          bodyPlain: "",
          manualFallback: true,
          manualNotice: data.manual_notice_fa,
          savedId: analysisState?.savedId ?? null,
        });
        return;
      }

      const html = aiMarkdownToHtml(data.draft || data.result_text || "");
      const title = data.suggested_title
        || buildSmartAnalysisTitle(queryState, meta, actionName, newsCount);
      setAnalysisState({
        analysisType: actionName,
        title,
        bodyHtml: html,
        bodyPlain: stripHtml(html),
        manualFallback: false,
        aiPromptKey: data.prompt_key_used,
        aiUsageKey: data.ai_usage_key_used,
        aiConfigId: data.ai_config_id_used,
        savedId: analysisState?.savedId ?? null,
      });
    } catch (e) {
      onError(e.response?.data?.error || e.message);
    } finally {
      setRunning(null);
    }
  };

  const actions = useMemo(() => {
    if (aiActions.length) return aiActions;
    return Object.entries(ANALYSIS_ACTION_LABELS).map(([action_name, label]) => ({
      action_name,
      button_label_fa: label,
    }));
  }, [aiActions]);

  if (!analysisState?.analysisType && !running) {
    return (
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>تحلیل هوشمند</h2>
        <p style={{ fontSize: 13, color: theme.muted, marginBottom: 16 }}>
          یکی از انواع تحلیل را انتخاب کنید. خروجی قابل ویرایش خواهد بود.
        </p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {actions.map((a) => (
            <button
              key={a.action_name}
              type="button"
              disabled={!!running}
              onClick={() => runAnalysis(a.action_name)}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.08)",
                color: theme.text,
                cursor: running ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
              }}
            >
              {running === a.action_name
                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                : <Sparkles size={16} color="#a855f7" />}
              {a.button_label_fa || ANALYSIS_ACTION_LABELS[a.action_name]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>ویرایش تحلیل</h2>

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
          onChange={(e) => setAnalysisState((s) => ({ ...s, title: e.target.value }))}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.input || theme.card,
            color: theme.text,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
          نوع: {ANALYSIS_ACTION_LABELS[analysisState?.analysisType] || "—"} ·
          {" "}{toPersianDigits(newsCount)} خبر
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>متن تحلیل</label>
        <RichTextEditor
          value={analysisState?.bodyHtml || ""}
          onChange={(html) => setAnalysisState((s) => ({
            ...s,
            bodyHtml: html,
            bodyPlain: stripHtml(html),
          }))}
          isDarkMode={theme.isDarkMode}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {actions.map((a) => (
          <button
            key={a.action_name}
            type="button"
            disabled={!!running}
            onClick={() => runAnalysis(a.action_name)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: analysisState?.analysisType === a.action_name ? "#7c3aed" : theme.card,
              color: analysisState?.analysisType === a.action_name ? "#fff" : theme.text,
              cursor: running ? "wait" : "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            {running === a.action_name ? "…" : (a.button_label_fa || ANALYSIS_ACTION_LABELS[a.action_name])}
          </button>
        ))}
      </div>
    </div>
  );
}
