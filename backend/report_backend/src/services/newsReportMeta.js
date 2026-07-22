import moment from "jalali-moment";
import { NEWS_WORKFLOW_STATES, NEWS_REVIEW_STATES } from "../constants/newsMonitorMeta.js";
import {
  DEFAULT_MESSENGER_TEMPLATE,
  DEFAULT_DOCUMENT_CAPTION_TEMPLATE,
  DEFAULT_NEWS_ITEM_TEMPLATE,
  DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE,
  DEFAULT_HTML_CARD_TEMPLATE,
  DEFAULT_HTML_TABLE_TEMPLATE,
  DEFAULT_TXT_OUTPUT_TEMPLATE,
  DEFAULT_PACK_DEFAULTS,
  DEFAULT_REPORT_WORKFLOW_FILTERS,
  mergePrintSettings,
  mergePackDefaults,
  mergeReportWorkflowFilterDefaults,
  PACK_FORMAT_LABELS,
} from "../constants/newsReportDefaults.js";
import { applyTemplate } from "./newsReportMessengerTemplate.js";
import { DEFAULT_CUSTOM_PROMPT_POLICY, mergeCustomPromptPolicy } from "../constants/newsSmartCustomPromptPolicy.js";

const DEFAULT_SETTINGS = {
  system_name: "سامانه پایش و تحلیل اخبار",
  organization_name: "",
  system_link: "",
  signature_text: "سامانه پایش و تحلیل اخبار",
  hashtags: "#پایش_خبر\n#رصد_رسانه",
  pdf_paper_size: "A4",
  report_color: "#c00000",
  default_label: "گزارش اخبار",
  messenger_template: DEFAULT_MESSENGER_TEMPLATE,
  document_caption_template: DEFAULT_DOCUMENT_CAPTION_TEMPLATE,
  news_item_template: DEFAULT_NEWS_ITEM_TEMPLATE,
  brief_submission_messenger_template: DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE,
  html_card_template: DEFAULT_HTML_CARD_TEMPLATE,
  html_table_template: DEFAULT_HTML_TABLE_TEMPLATE,
  txt_output_template: DEFAULT_TXT_OUTPUT_TEMPLATE,
  print_settings: mergePrintSettings(null),
  custom_prompt_policy: { ...DEFAULT_CUSTOM_PROMPT_POLICY },
};

export function getDefaultReportSettings() {
  return {
    ...DEFAULT_SETTINGS,
    print_settings: mergePrintSettings(null),
    pack_defaults: mergePackDefaults(DEFAULT_PACK_DEFAULTS),
    report_default_filters: mergeReportWorkflowFilterDefaults(DEFAULT_REPORT_WORKFLOW_FILTERS),
  };
}

function parseJsonField(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === "string") {
    try { return JSON.parse(raw || "{}"); } catch { return fallback; }
  }
  return raw;
}

export function mergeReportSettings(row) {
  if (!row) return getDefaultReportSettings();
  const ps = parseJsonField(row.print_settings, {});
  const cpp = parseJsonField(row.custom_prompt_policy, {});
  const packDefaults = parseJsonField(row.pack_defaults, null);
  const workflowFilters = parseJsonField(row.report_default_filters, null);
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    messenger_template: row.messenger_template?.trim() || DEFAULT_MESSENGER_TEMPLATE,
    document_caption_template: row.document_caption_template?.trim() || DEFAULT_DOCUMENT_CAPTION_TEMPLATE,
    news_item_template: row.news_item_template?.trim() || DEFAULT_NEWS_ITEM_TEMPLATE,
    brief_submission_messenger_template: row.brief_submission_messenger_template?.trim()
      || DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE,
    html_card_template: row.html_card_template?.trim() || DEFAULT_HTML_CARD_TEMPLATE,
    html_table_template: row.html_table_template?.trim() || DEFAULT_HTML_TABLE_TEMPLATE,
    txt_output_template: row.txt_output_template?.trim() || DEFAULT_TXT_OUTPUT_TEMPLATE,
    print_settings: mergePrintSettings(ps),
    custom_prompt_policy: mergeCustomPromptPolicy(cpp),
    pack_defaults: mergePackDefaults(packDefaults),
    report_default_filters: mergeReportWorkflowFilterDefaults(workflowFilters),
  };
}

function rowStatusLabel(row) {
  const ws = row.workflow_status || "pending";
  const rs = row.review_state || "pending";
  if (ws === "finalized") return "منتشرشده";
  return NEWS_WORKFLOW_STATES[ws]?.label || NEWS_REVIEW_STATES[rs]?.label || ws;
}

export function mapRowForTemplate(row) {
  const refDate = row.ref_date || row.source_date_jalali || "";
  const refHm = row.ref_hm || row.source_time_hm || "";
  return {
    ...row,
    source_date_jalali: row.source_date_jalali || refDate,
    source_time_hm: row.source_time_hm || refHm,
    relay_date_jalali: refDate,
    relay_time_hm: refHm,
    status: rowStatusLabel(row),
  };
}

function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export function periodKindLabel(mode) {
  if (mode?.startsWith("preset_")) {
    const h = mode.replace("preset_", "").replace(/h$/i, "");
    return `اخبار ${toFaDigits(h)} ساعته`;
  }
  if (mode === "same_day") return "اخبار بازه دلخواه";
  if (mode === "manual") return "اخبار دستی";
  return "اخبار";
}

export function shortJalaliYYMM(reportDate) {
  const d = String(reportDate || "").replace(/\D/g, "");
  if (d.length >= 6) return toFaDigits(d.slice(2, 6));
  return toFaDigits(d.slice(0, 4));
}

export function formatTimeRangeCompact(period) {
  const from = (period.display_from || "").split(" ")[1] || "00:00";
  const to = (period.display_to || "").split(" ")[1] || "24:00";
  const compact = (t) => toFaDigits(t === "24:00" ? "00" : t.replace(":", ""));
  return `${toFaDigits(from.replace(":", ""))}تا${compact(to)}`;
}

const PACK_TYPE_SLUGS_FA = {
  very_important: "فوری",
  important: "مهم",
  valuable: "ارزشمند",
  all: "کل",
  pack: "پک",
};
const PACK_TYPE_SLUGS_EN = {
  very_important: "urgent",
  important: "important",
  valuable: "valuable",
  all: "all",
  pack: "pack",
};
const FORMAT_SLUGS_FA = {
  txt: "متن",
  html_card: "کارتی",
  html_table: "جدول",
  pdf_a5_card: "کارتی‌ک",
  pdf_a5_table: "جدول‌ک",
  pdf_a4: "کارتی‌ب",
};
const FORMAT_SLUGS_EN = {
  txt: "txt",
  html_card: "card",
  html_table: "table",
  pdf_a5_card: "card_a5",
  pdf_a5_table: "table_a5",
  pdf_a4: "card_a4",
};

function resolveFormatKey(format, pdfPaperSize, pdfSource) {
  if (format === "txt") return "txt";
  if (format === "html_card") return "html_card";
  if (format === "html_table" || format === "html") return "html_table";
  if (format === "pdf") {
    if (pdfPaperSize === "A5") return pdfSource === "html_table" ? "pdf_a5_table" : "pdf_a5_card";
    return "pdf_a4";
  }
  return "txt";
}

function extForFormatKey(formatKey) {
  if (formatKey === "txt") return "txt";
  if (formatKey === "pdf_a5_card" || formatKey === "pdf_a5_table" || formatKey === "pdf_a4") return "pdf";
  return "html";
}

function dateYYMMDD(period, style) {
  const d = String(period.report_date || period.from_date || "").replace(/\D/g, "");
  const yymmdd = d.length >= 8 ? d.slice(2, 8) : d.slice(0, 6);
  return style === "full_fa" ? toFaDigits(yymmdd) : yymmdd;
}

function timeRangeForFile(period, style) {
  const from = (period.display_from || "").split(" ")[1] || "00:00";
  const to = (period.display_to || "").split(" ")[1] || "24:00";
  const fmt = (t) => (t === "24:00" ? "2400" : t.replace(":", ""));
  const range = `${fmt(from)}-${fmt(to)}`;
  return style === "full_fa" ? toFaDigits(range) : range;
}

export function buildPackFileName(period, options = {}) {
  const {
    packKey = "all",
    formatKey = "html_card",
    newsCount = 0,
    filenameStyle = "full_fa",
    isZip = false,
  } = options;
  const style = filenameStyle === "full_en" ? "full_en" : "full_fa";
  const prefix = style === "full_en" ? "news" : "اخبار";
  const typeSlugs = style === "full_en" ? PACK_TYPE_SLUGS_EN : PACK_TYPE_SLUGS_FA;
  const formatSlugs = style === "full_en" ? FORMAT_SLUGS_EN : FORMAT_SLUGS_FA;
  const typeSlug = typeSlugs[isZip ? "pack" : packKey] || typeSlugs.all;
  const formatSlug = isZip ? null : (formatSlugs[formatKey] || formatKey);
  const datePart = dateYYMMDD(period, style);
  const timePart = timeRangeForFile(period, style);
  const countStr = style === "full_fa" ? toFaDigits(newsCount) : String(newsCount);
  const ext = isZip ? "zip" : extForFormatKey(formatKey);
  const parts = [prefix, typeSlug];
  if (formatSlug) parts.push(formatSlug);
  parts.push(datePart, `${timePart}(${countStr})`);
  return `${parts.join("_")}.${ext}`;
}

export function formatFileNameStem(period, format, pdfPaperSize, pdfSource, filenameStyle = "full_fa") {
  const formatKey = resolveFormatKey(format, pdfPaperSize, pdfSource);
  return buildPackFileName(period, {
    packKey: "all",
    formatKey,
    newsCount: 0,
    filenameStyle,
  }).replace(/(\([\d۰-۹]+\)|\(0\))\.[^.]+$/, "");
}

export function buildReportFileName(period, newsCount, format, pdfPaperSize, pdfSource, filenameStyle = "full_fa") {
  const formatKey = resolveFormatKey(format, pdfPaperSize, pdfSource);
  return buildPackFileName(period, {
    packKey: "all",
    formatKey,
    newsCount,
    filenameStyle,
  });
}

export function buildPackReportLabel(baseLabel, packTypeLabel, formatLabel) {
  const parts = [baseLabel, packTypeLabel, formatLabel].filter(Boolean);
  return parts.join(" · ");
}

export function buildSlotEngineMeta(period, settings = {}, options = {}) {
  const s = mergeReportSettings(settings);
  const reportDate = period.report_date || period.from_date || moment().utcOffset(210).format("jYYYY-MM-DD");
  const label = options.label || s.default_label || "گزارش اخبار";

  const rangeFrom = (period.display_from || "").split(" ")[1]?.replace(":", "") || "0000";
  const rangeTo = (period.display_to || "").split(" ")[1]?.replace(":", "") || "2359";

  return {
    label,
    file_name: formatFileNameStem(period, "html_card"),
    report_date_jalali: reportDate,
    display_from: period.display_from || `${reportDate} 00:00`,
    display_to: period.display_to || `${reportDate} 24:00`,
    color: s.report_color || "#c00000",
    organization_name: s.organization_name || "",
    system_name: s.system_name || DEFAULT_SETTINGS.system_name,
    system_link: s.system_link || "",
    signature_text: s.signature_text || "",
    hashtags: s.hashtags || "",
    window: `${rangeFrom}-${rangeTo}`,
    settings: s,
  };
}

export function buildReportCaption(slot, newsCount, formatLabelOrKey, options = {}) {
  return buildDocumentCaptionFromTemplate({
    settings: slot?.settings || options.settings,
    slot,
    period: options.period,
    newsCount,
    formatKey: options.formatKey || formatLabelOrKey,
    packLabel: options.packLabel,
    row: options.row,
    isZip: options.isZip,
  });
}

function parseRowFilters(raw) {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw || "{}"); } catch { return {}; }
  }
  return raw;
}

function jalaliSlash(dateStr) {
  const raw = String(dateStr || "").trim();
  const d = raw.replace(/\D/g, "");
  if (d.length >= 8) {
    return toFaDigits(`${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}`);
  }
  if (raw.includes("-")) return toFaDigits(raw.replace(/-/g, "/"));
  return toFaDigits(raw);
}

function captionDateTime(displayStr) {
  const s = String(displayStr || "").trim();
  if (!s) return "";
  const [datePart, ...rest] = s.split(" ");
  const timePart = rest.join(" ").trim();
  const date = jalaliSlash(datePart);
  return timePart ? `${date} - ${toFaDigits(timePart)}` : date;
}

export function buildDocumentCaptionFromTemplate({
  settings = {},
  slot = {},
  period = null,
  newsCount = 0,
  formatKey = "",
  packLabel = "",
  row = null,
  isZip = false,
} = {}) {
  const s = mergeReportSettings(settings);
  const tpl = s.document_caption_template || DEFAULT_DOCUMENT_CAPTION_TEMPLATE;

  const filters = parseRowFilters(row?.filters);
  const meta = filters._pack_meta || {};

  let mode = period?.mode || row?.mode || "";
  let displayFrom = slot.display_from || period?.display_from || "";
  let displayTo = slot.display_to || period?.display_to || "";
  let reportDate = slot.report_date_jalali || period?.report_date || period?.from_date || "";

  if (row?.from_ref_key) {
    const ref = refKeysToDisplayPeriod(row.from_ref_key, row.to_ref_key);
    displayFrom = ref.display_from || displayFrom;
    displayTo = ref.display_to || displayTo;
    reportDate = ref.report_date_jalali || reportDate;
  }

  const formatLabel = meta.format_label
    || PACK_FORMAT_LABELS[formatKey]
    || PACK_FORMAT_LABELS[resolveFormatKey(formatKey)]
    || formatKey
    || row?.format
    || "";
  const packTypeLabel = packLabel || meta.pack_label || "";
  const periodLabel = mode ? periodKindLabel(mode) : "";
  const report_type = [periodLabel, formatLabel].filter(Boolean).join(" ")
    || slot.label
    || packTypeLabel
    || s.default_label
    || "گزارش اخبار";

  const zipLike = isZip || row?.format === "zip" || formatKey === "zip";
  const news_count_text = zipLike
    ? `${toFaDigits(newsCount)} فایل`
    : (newsCount > 0 ? `${toFaDigits(newsCount)} خبر` : "بدون خبر");

  return applyTemplate(tpl, {
    report_type,
    label: slot.label || s.default_label || "گزارش اخبار",
    report_date: jalaliSlash(reportDate),
    display_from: captionDateTime(displayFrom),
    display_to: captionDateTime(displayTo),
    news_count: toFaDigits(newsCount),
    news_count_text,
    system_name: s.system_name || DEFAULT_SETTINGS.system_name,
    pack_label: packTypeLabel,
    format_label: formatLabel,
  });
}

/** @deprecated use buildDocumentCaptionFromTemplate — kept for callers passing row */
export function buildPublishDocumentCaption(row, settings = {}) {
  const filters = parseRowFilters(row?.filters);
  const meta = filters._pack_meta || {};
  return buildDocumentCaptionFromTemplate({
    settings,
    slot: {},
    newsCount: row?.news_count ?? 0,
    formatKey: meta.format_key || row?.format,
    packLabel: meta.pack_label,
    row,
    isZip: row?.format === "zip",
  });
}

function refKeyToJalaliDateTime(refKey) {
  const s = String(refKey || "");
  if (s.length < 12) return { date: "", time: "" };
  const date = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const time = `${s.slice(8, 10)}:${s.slice(10, 12)}`;
  return { date, time };
}

export function refKeysToDisplayPeriod(fromRefKey, toRefKey) {
  const from = refKeyToJalaliDateTime(fromRefKey);
  const to = refKeyToJalaliDateTime(toRefKey);
  return {
    display_from: from.date ? `${from.date} ${from.time}` : "",
    display_to: to.date ? `${to.date} ${to.time}` : "",
    report_date_jalali: from.date || to.date || "",
  };
}

