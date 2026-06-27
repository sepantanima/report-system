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
