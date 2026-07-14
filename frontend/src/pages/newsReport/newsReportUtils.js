import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { buildNewsFilterLabels, formatJalaliRangeLabel } from "../../utils/dashboardTitles.js";
import { cleanDateString, toEnDigit, toPersianDigits } from "../../utils/analysisMonitorUtils.js";

/** ارقام فارسی/عربی → ASCII */
export const toEnDigits = toEnDigit;

export const jalaliStr = (d) => {
  if (!d) return "";
  if (typeof d === "object" && typeof d.format === "function") {
    return cleanDateString(d.format("YYYY-MM-DD"));
  }
  const raw = toEnDigits(String(d)).replace(/\//g, "-");
  return cleanDateString(raw) || raw.replace(/[^0-9-]/g, "");
};

export function normalizeApiTime(time) {
  const raw = toEnDigits(String(time ?? "00:00")).trim();
  if (raw === "24:00" || raw === "24") return "24:00";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 3) {
    const h = digits.slice(0, 2).padStart(2, "0");
    const m = digits.slice(2, 4).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  return "00:00";
}

function normalizePeriodFields(period) {
  return {
    ...period,
    reportDate: jalaliStr(period.reportDate),
    fromDate: jalaliStr(period.fromDate),
    toDate: jalaliStr(period.toDate),
    fromTime: normalizeApiTime(period.fromTime),
    toTime: normalizeApiTime(period.toTime),
  };
}

export const todayJalaliDate = () => new DateObject({ calendar: persian });

const toFa = (s) => String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

export const PRESET_SLOT_MODES = {
  preset_1h: { hours: 1, label: "۱ ساعته" },
  preset_3h: { hours: 3, label: "۳ ساعته" },
  preset_6h: { hours: 6, label: "۶ ساعته" },
  preset_12h: { hours: 12, label: "۱۲ ساعته" },
  preset_24h: { hours: 24, label: "۲۴ ساعته" },
};

export function buildTimeSlots(hourSpan) {
  const span = Math.min(24, Math.max(1, hourSpan));
  const slots = [];
  for (let start = 0; start < 24; start += span) {
    const end = start + span;
    const fromH = String(start).padStart(2, "0");
    const to = end >= 24 ? "24:00" : `${String(end).padStart(2, "0")}:00`;
    const fmtHm = (hm) => {
      const [h, m] = hm.split(":");
      return `${toFa(h)}:${toFa(m || "00")}`;
    };
    slots.push({
      from: `${fromH}:00`,
      to,
      label: `از ${fmtHm(`${fromH}:00`)} تا ${to === "24:00" ? "۲۴:۰۰" : fmtHm(to)}`,
    });
  }
  return slots;
}

export function getSlotsForMode(mode) {
  const cfg = PRESET_SLOT_MODES[mode];
  if (!cfg) return [];
  return buildTimeSlots(cfg.hours);
}

export function clampSlotIndex(mode, slotIndex) {
  const slots = getSlotsForMode(mode);
  if (!slots.length) return 0;
  const idx = Number.isFinite(slotIndex) ? slotIndex : 0;
  return Math.min(Math.max(0, idx), slots.length - 1);
}

/** بازهٔ ۶/۳/۱۲ ساعتهٔ جاری بر اساس ساعت محلی مرورگر */
export function getCurrentPresetSlotIndex(mode, date = new Date()) {
  const slots = getSlotsForMode(mode);
  if (!slots.length) return 0;
  const hm = date.getHours() * 100 + date.getMinutes();
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const from = parseInt(slots[i].from.replace(":", ""), 10);
    if (hm >= from) return i;
  }
  return 0;
}

export function resolveActivePeriod(state) {
  const {
    mode, reportDate, fromDate, toDate, fromTime, toTime, slotIndex,
  } = state;

  if (PRESET_SLOT_MODES[mode]) {
    const slots = getSlotsForMode(mode);
    const idx = clampSlotIndex(mode, slotIndex);
    const slot = slots[idx] || slots[0];
    const date = jalaliStr(reportDate);
    return normalizePeriodFields({
      mode,
      reportDate: date,
      fromDate: date,
      toDate: date,
      fromTime: slot.from,
      toTime: slot.to,
      slotIndex: idx,
    });
  }

  if (mode === "same_day") {
    const date = jalaliStr(reportDate);
    return normalizePeriodFields({
      mode,
      reportDate: date,
      fromDate: date,
      toDate: date,
      fromTime: fromTime || "00:00",
      toTime: toTime || "24:00",
      slotIndex: 0,
    });
  }

  return normalizePeriodFields({
    mode: "manual",
    reportDate: jalaliStr(fromDate),
    fromDate: jalaliStr(fromDate),
    toDate: jalaliStr(toDate),
    fromTime: fromTime || "00:00",
    toTime: toTime || "23:59",
    slotIndex: 0,
  });
}

export function formatReportTitleWithCount(label, count) {
  const base = String(label || "").trim();
  if (!base) return "";
  if (count == null || !Number.isFinite(count)) return base;
  if (/\([\d۰-۹]+\)\s*$/.test(base)) return base;
  return `${base} (${toPersianDigits(count)})`;
}

export function stripCountFromLabel(label) {
  return String(label || "").replace(/\s*\([\d۰-۹]+\)\s*$/, "").trim();
}

function normalizeFilterIntArray(val) {
  if (Array.isArray(val)) return val.map((x) => parseInt(x, 10)).filter(Number.isFinite);
  if (val !== "" && val != null) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? [n] : [];
  }
  return [];
}

export function buildReportFilters(filters) {
  const f = {};
  if (filters.keyword?.trim()) f.keyword = filters.keyword.trim();
  if (filters.duplicate) f.duplicate = filters.duplicate;
  if (filters.is_deleted != null) f.is_deleted = filters.is_deleted;
  const statuses = filters.statuses?.length ? filters.statuses : (filters.status ? [filters.status] : []);
  if (statuses.length === 1) f.status = statuses[0];
  else if (statuses.length > 1) f.statuses = statuses;
  const importance = normalizeFilterIntArray(filters.priorities ?? filters.priority);
  if (importance.length) f.importance = importance;
  const quality = normalizeFilterIntArray(filters.qualities ?? filters.quality);
  if (quality.length) f.quality = quality;
  if (filters.categories?.length) f.category = filters.categories.map((x) => parseInt(x, 10));
  if (filters.sources?.length) f.source = filters.sources;
  const units = filters.units?.length ? filters.units : (filters.unit_cd ? [filters.unit_cd] : []);
  if (units.length === 1) f.unit = units[0];
  else if (units.length > 1) f.units = units.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
  if (filters.user_id) f.user_id = parseInt(filters.user_id, 10);
  return f;
}

export function buildPeriodPayload(state) {
  const period = resolveActivePeriod(state);
  const base = { mode: state.mode };

  if (PRESET_SLOT_MODES[state.mode] || state.mode === "same_day") {
    base.report_date = jalaliStr(period.reportDate);
    base.from_time = normalizeApiTime(period.fromTime);
    base.to_time = normalizeApiTime(period.toTime);
    if (PRESET_SLOT_MODES[state.mode]) base.slot_index = period.slotIndex;
  }

  if (state.mode === "manual") {
    base.from_date = jalaliStr(period.fromDate);
    base.to_date = jalaliStr(period.toDate);
    base.from_time = normalizeApiTime(period.fromTime);
    base.to_time = normalizeApiTime(period.toTime);
  }

  return base;
}

/** نرمال‌سازی ارقام ASCII در payload ذخیره‌شده یا ارسالی */
export function sanitizeNewsReportPayload(body = {}) {
  const p = { ...body };
  if (p.report_date != null) p.report_date = jalaliStr(p.report_date);
  if (p.from_date != null) p.from_date = jalaliStr(p.from_date);
  if (p.to_date != null) p.to_date = jalaliStr(p.to_date);
  if (p.from_time != null) p.from_time = normalizeApiTime(p.from_time);
  if (p.to_time != null) p.to_time = normalizeApiTime(p.to_time);
  return p;
}

/** بدنهٔ تمیز API گزارش — بدون page/sort و فیلدهای تولید خروجی */
export function buildReportApiBody(queryPayload = {}, extra = {}) {
  const merged = sanitizeNewsReportPayload({
    ...queryPayload,
    filters: queryPayload?.filters || {},
    ...extra,
  });
  const {
    page: _page,
    page_size: _pageSize,
    sort: _sort,
    ...apiBody
  } = merged;

  if (!apiBody.filters || typeof apiBody.filters !== "object") {
    apiBody.filters = {};
  }
  if (Array.isArray(apiBody.selected_ids) && !apiBody.selected_ids.length) {
    delete apiBody.selected_ids;
  }
  return apiBody;
}

export function reportPayloadDateRange(payload = {}) {
  if (payload.from_date) {
    return { startDate: payload.from_date, endDate: payload.to_date || payload.from_date };
  }
  if (payload.report_date) {
    return { startDate: payload.report_date, endDate: payload.report_date };
  }
  return {};
}

export const PERIOD_MODES = [
  { value: "preset_1h", label: "۱ ساعته" },
  { value: "preset_3h", label: "۳ ساعته" },
  { value: "preset_6h", label: "۶ ساعته" },
  { value: "preset_12h", label: "۱۲ ساعته" },
  { value: "preset_24h", label: "۲۴ ساعته (کل روز)" },
  { value: "same_day", label: "بازه ساعتی دلخواه در یک روز" },
  { value: "manual", label: "بازه کامل از تاریخ و ساعت تا تاریخ و ساعت" },
];

export const OUTPUT_FORMATS = [
  { value: "html_card", label: "HTML کارتی" },
  { value: "html_table", label: "HTML جدولی" },
  { value: "txt", label: "TXT متن ساده" },
  { value: "pdf", label: "PDF" },
];

/** گزینه‌های قابل ترکیب برای تولید همزمان چند خروجی */
export const OUTPUT_FORMAT_CHOICES = [
  { key: "html_card", label: "HTML کارتی", output: { format: "html_card" } },
  { key: "html_table", label: "HTML جدولی", output: { format: "html_table" } },
  { key: "txt", label: "TXT متن ساده", output: { format: "txt" } },
  { key: "pdf_a5_card", label: "PDF A5 کارتی", output: { format: "pdf", pdf_source: "html_card", pdf_paper_size: "A5" } },
  { key: "pdf_a5_table", label: "PDF A5 جدولی", output: { format: "pdf", pdf_source: "html_table", pdf_paper_size: "A5" } },
  { key: "pdf_a4", label: "PDF A4 (کارتی)", output: { format: "pdf", pdf_source: "html_card", pdf_paper_size: "A4" } },
];

export function buildOutputFormatsFromKeys(keys = []) {
  return OUTPUT_FORMAT_CHOICES
    .filter((c) => keys.includes(c.key))
    .map((c) => ({ ...c.output }));
}

export const FALLBACK_REPORT_WORKFLOW_FILTERS = {
  duplicate: "exclude",
  is_deleted: false,
  statuses: ["published"],
  qualities: [3, 4, 5],
  priorities: [1, 2, 3],
};

export function buildContentFiltersFromWorkflow(workflowDefaults) {
  const defs = workflowDefaults || FALLBACK_REPORT_WORKFLOW_FILTERS;
  return {
    keyword: "",
    status: "",
    statuses: [...(defs.statuses || FALLBACK_REPORT_WORKFLOW_FILTERS.statuses)],
    priorities: [...(defs.priorities || FALLBACK_REPORT_WORKFLOW_FILTERS.priorities)],
    qualities: [...(defs.qualities || FALLBACK_REPORT_WORKFLOW_FILTERS.qualities)],
    duplicate: defs.duplicate ?? "exclude",
    is_deleted: defs.is_deleted ?? false,
    categories: [],
    sources: [],
    unit_cd: "",
    units: [],
    role: "",
    user_id: "",
  };
}

export const DEFAULT_CONTENT_FILTERS = buildContentFiltersFromWorkflow(null);

export function applyPackCountsToPackState(packState, packCounts) {
  if (!packCounts || !packState?.packTypes?.length) return packState;
  const packTypes = packState.packTypes.filter((t) => (packCounts[t.key] ?? 0) > 0);
  const enabledTypes = {};
  const formats = {};
  for (const t of packTypes) {
    enabledTypes[t.key] = !!packState.enabledTypes[t.key];
    formats[t.key] = [...(packState.formats[t.key] || [])];
  }
  return { ...packState, packTypes, enabledTypes, formats };
}

export function initPackStateFromDefaults(packDefaults) {
  const defs = packDefaults?.pack_types || [];
  const enabledTypes = {};
  const formats = {};
  for (const t of defs) {
    enabledTypes[t.key] = t.enabled_by_default !== false;
    formats[t.key] = [...(t.format_keys || [])];
  }
  return {
    packTypes: defs,
    enabledTypes,
    formats,
    delivery: packDefaults?.default_delivery === "separate" ? "separate" : "zip",
  };
}

export function buildPackItemsFromState(packState) {
  const { enabledTypes, formats } = packState;
  return Object.keys(enabledTypes)
    .filter((key) => enabledTypes[key])
    .map((packKey) => ({
      pack_key: packKey,
      format_keys: (formats[packKey] || []).filter(Boolean),
    }))
    .filter((item) => item.format_keys.length);
}

export function buildPackGenerateBody(queryPayload, { label, selectedIds, packState }) {
  const packItems = buildPackItemsFromState(packState);
  return buildReportApiBody(queryPayload, {
    label,
    selected_ids: selectedIds?.length ? selectedIds : undefined,
    report_kind: "list",
    pack_items: packItems,
    delivery: packState.delivery || "zip",
  });
}

function formatTimeFa(time) {
  if (time === "24:00") return "۲۴:۰۰";
  const [h, m] = String(time || "00:00").split(":");
  return `${toFa(h)}:${toFa(m || "00")}`;
}

function buildPeriodTitlePart(state) {
  const period = resolveActivePeriod(state);
  const fromDateLabel = formatJalaliRangeLabel(period.fromDate);
  const toDateLabel = formatJalaliRangeLabel(period.toDate);
  const fromT = formatTimeFa(period.fromTime);
  const toT = formatTimeFa(period.toTime);
  const isFullDay = period.fromTime === "00:00"
    && (period.toTime === "24:00" || period.toTime === "23:59");

  if (period.fromDate === period.toDate) {
    if (isFullDay) return `کل روز ${fromDateLabel}`;
    return `از ${fromDateLabel} ساعت ${fromT} تا ${toT}`;
  }
  return `از ${fromDateLabel} ساعت ${fromT} تا ${toDateLabel} ساعت ${toT}`;
}

export function buildNewsReportTitle(state) {
  const periodPart = buildPeriodTitlePart(state);
  return `گزارش اخبار ${periodPart}`;
}

/** خلاصهٔ فیلترهای فعال — نمایش جدا از عنوان */
export function buildNewsReportFilterSummary(state, meta) {
  const labels = buildNewsFilterLabels(state.filters, meta);
  if (state.filters.keyword?.trim()) {
    labels.unshift(`شامل کلیدواژه «${state.filters.keyword.trim()}»`);
  }
  if (!labels.length) return "";
  return labels.join(" · ");
}

export function buildPackSummaryText(packState) {
  const enabledTypes = (packState.packTypes || []).filter((t) => packState.enabledTypes[t.key]);
  if (!enabledTypes.length) return "";
  const typeLabels = enabledTypes.map((t) => t.label);
  const formatKeySet = new Set();
  enabledTypes.forEach((t) => (packState.formats[t.key] || []).forEach((k) => formatKeySet.add(k)));
  const formatLabels = OUTPUT_FORMAT_CHOICES
    .filter((c) => formatKeySet.has(c.key))
    .map((c) => c.label);
  let typesPart = typeLabels[0];
  if (typeLabels.length === 2) typesPart = `${typeLabels[0]} و ${typeLabels[1]}`;
  else if (typeLabels.length > 2) typesPart = `${typeLabels.slice(0, -1).join("، ")} و ${typeLabels.at(-1)}`;
  if (!formatLabels.length) return `گزارش ${typesPart}`;
  const formatsPart = formatLabels.length > 1
    ? `${formatLabels.slice(0, -1).join("، ")} و ${formatLabels.at(-1)}`
    : formatLabels[0];
  return `گزارش ${typesPart} در فرمت‌های ${formatsPart}`;
}

function hmFromTime(time) {
  const t = normalizeApiTime(time);
  if (t === "24:00") return "2359";
  const [h, m] = t.split(":");
  return `${h.padStart(2, "0")}${(m || "00").padStart(2, "0")}`;
}

/** خلاصهٔ فیلترهایی که به API و کوئری دیتابیس ارسال می‌شود */
export function buildQueryDebugInfo(state) {
  const period = resolveActivePeriod(state);
  const filters = buildReportFilters(state.filters);
  const fromRefKey = period.fromDate.replace(/-/g, "") + hmFromTime(period.fromTime);
  const toRefKey = period.toDate.replace(/-/g, "") + hmFromTime(period.toTime);

  return {
    apiBody: {
      mode: state.mode,
      ...(PRESET_SLOT_MODES[state.mode] || state.mode === "same_day"
        ? { report_date: period.reportDate, from_time: period.fromTime, to_time: period.toTime }
        : {
          from_date: period.fromDate,
          to_date: period.toDate,
          from_time: period.fromTime,
          to_time: period.toTime,
        }),
      filters,
    },
    dbQuery: {
      from_ref_key: fromRefKey,
      to_ref_key: toRefKey,
      sql: `ref_key >= '${fromRefKey}' AND ref_key <= '${toRefKey}'`,
      defaultStatus: filters.status || "(همه وضعیت‌ها)",
      duplicate: "exclude",
    },
  };
}

/** @deprecated use PRESET_SLOT_MODES + getSlotsForMode */
export const PRESET_WINDOWS = Object.fromEntries(
  Object.entries(PRESET_SLOT_MODES).map(([key, cfg]) => {
    const slot = buildTimeSlots(cfg.hours).at(-1);
    return [key, { from: slot?.from || "00:00", to: slot?.to || "24:00", label: cfg.label }];
  }),
);
