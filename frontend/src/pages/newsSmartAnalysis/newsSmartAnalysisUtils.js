import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { buildNewsFilterLabels, formatJalaliRangeLabel } from "../../utils/dashboardTitles.js";
import { cleanDateString, toEnDigit, toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import {
  DEFAULT_CONTENT_FILTERS,
  buildReportFilters,
  buildReportApiBody,
  sanitizeNewsReportPayload,
  jalaliStr,
} from "../newsReport/newsReportUtils.js";
import { ANALYSIS_ACTION_LABELS } from "../../services/newsSmartAnalysisService.js";
import { MESSENGER_TEXT_MAX } from "../../constants/messengerUsageKeys.js";

export { DEFAULT_CONTENT_FILTERS as SMART_ANALYSIS_DEFAULT_FILTERS };

export const toEnDigits = toEnDigit;

export function todayJalaliDate() {
  return new DateObject({ calendar: persian });
}

export function buildSmartAnalysisPeriodPayload(state) {
  return sanitizeNewsReportPayload({
    mode: "manual",
    from_date: jalaliStr(state.fromDate),
    to_date: jalaliStr(state.toDate),
    from_time: "00:00",
    to_time: "24:00",
    filters: buildReportFilters(state.filters),
  });
}

export function buildSmartAnalysisTitle(state, meta, analysisType, newsCount) {
  const fromLabel = formatJalaliRangeLabel(state.fromDate);
  const toLabel = formatJalaliRangeLabel(state.toDate);
  const typeFa = ANALYSIS_ACTION_LABELS[analysisType] || "تحلیل";
  const range = fromLabel === toLabel ? fromLabel : `از ${fromLabel} تا ${toLabel}`;
  const count = toPersianDigits(newsCount ?? 0);

  const filtersForLabels = { ...state.filters };
  if (!filtersForLabels.statuses?.length) delete filtersForLabels.statuses;
  if (!filtersForLabels.status) delete filtersForLabels.status;
  const filterLabels = buildNewsFilterLabels(filtersForLabels, meta);
  if (state.filters.keyword?.trim()) {
    filterLabels.unshift(`شامل کلیدواژه «${state.filters.keyword.trim()}»`);
  }

  let title = `${typeFa} — ${range} (${count} خبر)`;
  if (filterLabels.length) {
    title += ` · ${filterLabels.slice(0, 3).join(" · ")}`;
  }
  return title;
}

export function buildSmartAnalysisApiBody(queryPayload, extra = {}) {
  return buildReportApiBody(queryPayload, extra);
}

export function estimateMessengerLength(title, bodyPlain, signature = "", hashtags = "") {
  const header = `📌 ${title}\n\n`;
  const footer = [signature, hashtags].filter(Boolean).join("\n\n");
  const reserved = header.length + (footer ? footer.length + 2 : 0);
  return {
    maxBody: Math.max(200, MESSENGER_TEXT_MAX - reserved - 20),
    reserved,
    maxTotal: MESSENGER_TEXT_MAX,
  };
}

export function createInitialSmartAnalysisState() {
  const today = todayJalaliDate();
  return {
    fromDate: today,
    toDate: today,
    filters: { ...DEFAULT_CONTENT_FILTERS },
    queryPayload: null,
    pageSize: 20,
  };
}

export function validateSmartAnalysisDates(state) {
  if (!jalaliStr(state.fromDate) || !jalaliStr(state.toDate)) {
    return "تاریخ شروع و پایان را انتخاب کنید.";
  }
  const from = cleanDateString(jalaliStr(state.fromDate));
  const to = cleanDateString(jalaliStr(state.toDate));
  if (from > to) return "تاریخ شروع نباید بعد از تاریخ پایان باشد.";
  return null;
}

export function hasAnalysisContent(state) {
  if (!state) return false;
  const plain = String(state.bodyPlain ?? "").trim();
  const title = String(state.title ?? "").trim();
  return Boolean(plain || title);
}

export function smartAnalysisStateFromRow(row) {
  if (!row) return null;
  return {
    savedId: row.id,
    packId: row.pack_id ?? null,
    title: row.title || "",
    analysisType: row.analysis_type,
    bodyHtml: row.body_html || "",
    bodyPlain: row.body_plain || "",
    aiPromptKey: row.ai_prompt_key,
    manualFallback: false,
  };
}

function parseJalaliDateStr(str) {
  if (!str) return todayJalaliDate();
  const parts = String(str).replace(/\//g, "-").split("-").map((x) => parseInt(x, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return todayJalaliDate();
  return new DateObject({ year: parts[0], month: parts[1], day: parts[2], calendar: persian });
}

export function filtersFromQueryPayload(apiFilters = {}) {
  const statuses = apiFilters.status || apiFilters.statuses || [];
  return {
    ...DEFAULT_CONTENT_FILTERS,
    keyword: apiFilters.keyword || "",
    statuses: Array.isArray(statuses) ? statuses : [statuses].filter(Boolean),
    priorities: apiFilters.importance || apiFilters.priorities || [],
    qualities: apiFilters.quality || apiFilters.qualities || [],
    categories: (apiFilters.category || apiFilters.categories || []).map(String),
    sources: apiFilters.source || apiFilters.sources || [],
    units: apiFilters.units || (apiFilters.unit != null ? [apiFilters.unit] : []),
    user_id: apiFilters.user_id != null ? String(apiFilters.user_id) : "",
  };
}

export function analysisStateFromPackAnalysis(analysis, packId) {
  if (!analysis) return null;
  return {
    savedId: analysis.id,
    packId: analysis.pack_id ?? packId ?? null,
    title: analysis.title || "",
    analysisType: analysis.analysis_type,
    bodyHtml: analysis.body_html || "",
    bodyPlain: analysis.body_plain || "",
    aiPromptKey: analysis.ai_prompt_key,
    manualFallback: false,
  };
}

export function draftsFromPack(pack) {
  const drafts = {};
  const analyses = pack?.analyses || {};
  for (const type of Object.keys(analyses)) {
    const state = analysisStateFromPackAnalysis(analyses[type], pack?.id);
    if (state && hasAnalysisContent(state)) drafts[type] = state;
  }
  return drafts;
}

export function workspaceFromPack(pack) {
  if (!pack) return null;
  const qp = pack.query_payload || {};
  const fromDate = parseJalaliDateStr(pack.period_from || qp.from_date);
  const toDate = parseJalaliDateStr(pack.period_to || qp.to_date || pack.period_from);
  const selectedIds = pack.selection_mode === "subset" ? (pack.news_ids || []) : [];
  const drafts = draftsFromPack(pack);
  const firstType = Object.keys(drafts)[0] || pack.analysis_types_done?.[0] || null;

  return {
    queryState: {
      fromDate,
      toDate,
      filters: filtersFromQueryPayload(qp.filters),
      queryPayload: qp,
      pageSize: 20,
    },
    selectedIds,
    extractedCount: pack.news_count ?? selectedIds.length,
    packId: pack.id,
    packMeta: pack,
    analysisDrafts: drafts,
    analysisState: firstType ? drafts[firstType] : null,
  };
}

export function formatPackBannerLabel(pack) {
  if (!pack) return "";
  const from = pack.period_from || "";
  const to = pack.period_to || from;
  const range = from === to ? from : `${from} — ${to}`;
  return `پک #${pack.id} · ${range} · ${toPersianDigits(pack.news_count ?? 0)} خبر فریزشده`;
}
