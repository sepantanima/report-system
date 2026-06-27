import moment from "jalali-moment";
import { NEWS_WORKFLOW_STATES, NEWS_REVIEW_STATES } from "../constants/newsMonitorMeta.js";
import {
  DEFAULT_MESSENGER_TEMPLATE,
  DEFAULT_NEWS_ITEM_TEMPLATE,
  DEFAULT_HTML_CARD_TEMPLATE,
  DEFAULT_HTML_TABLE_TEMPLATE,
  DEFAULT_TXT_OUTPUT_TEMPLATE,
  mergePrintSettings,
} from "../constants/newsReportDefaults.js";

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
  news_item_template: DEFAULT_NEWS_ITEM_TEMPLATE,
  html_card_template: DEFAULT_HTML_CARD_TEMPLATE,
  html_table_template: DEFAULT_HTML_TABLE_TEMPLATE,
  txt_output_template: DEFAULT_TXT_OUTPUT_TEMPLATE,
  print_settings: mergePrintSettings(null),
};

export function getDefaultReportSettings() {
  return {
    ...DEFAULT_SETTINGS,
    print_settings: mergePrintSettings(null),
  };
}

export function mergeReportSettings(row) {
  if (!row) return getDefaultReportSettings();
  const ps = typeof row.print_settings === "string"
    ? JSON.parse(row.print_settings || "{}")
    : (row.print_settings || {});
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    messenger_template: row.messenger_template?.trim() || DEFAULT_MESSENGER_TEMPLATE,
    news_item_template: row.news_item_template?.trim() || DEFAULT_NEWS_ITEM_TEMPLATE,
    html_card_template: row.html_card_template?.trim() || DEFAULT_HTML_CARD_TEMPLATE,
    html_table_template: row.html_table_template?.trim() || DEFAULT_HTML_TABLE_TEMPLATE,
    txt_output_template: row.txt_output_template?.trim() || DEFAULT_TXT_OUTPUT_TEMPLATE,
    print_settings: mergePrintSettings(ps),
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
    const h = mode.replace("preset_", "");
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

export function formatFileNameStem(period, format, pdfPaperSize, pdfSource) {
  let prefix = "گزارش";
  if (format === "html_card") prefix = "کارت";
  else if (format === "html_table") prefix = "جدول";
  else if (format === "txt") prefix = "متن";
  else if (format === "pdf") {
    if (pdfPaperSize === "A5") prefix = pdfSource === "html_table" ? "جدولA5" : "کارتA5";
  }
  const reportDate = period.report_date || period.from_date || "";
  return [
    prefix,
    periodKindLabel(period.mode),
    shortJalaliYYMM(reportDate),
    formatTimeRangeCompact(period),
  ].join("_");
}

export function buildReportFileName(period, newsCount, format, pdfPaperSize, pdfSource) {
  const extMap = { txt: "txt", html: "html", html_card: "html", html_table: "html", pdf: "pdf" };
  const ext = extMap[format] || "txt";
  const stem = formatFileNameStem(period, format, pdfPaperSize, pdfSource);
  if (newsCount > 0) return `${stem}(${toFaDigits(newsCount)}).${ext}`;
  return `${stem}(بدون‌خبر).${ext}`;
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

export function buildReportCaption(slot, newsCount, formatLabel) {
  const toFa = (v) => String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  return `📌 ${slot.label} (${formatLabel})

تاریخ گزارش: ${toFa(slot.report_date_jalali)}
بازه زمانی: ${toFa(slot.display_from)} تا ${toFa(slot.display_to)}
تعداد اخبار: ${newsCount > 0 ? `${toFa(newsCount)} خبر` : "بدون خبر"}`.trim();
}
