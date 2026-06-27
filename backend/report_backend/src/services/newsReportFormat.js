import { stripHtml } from "./newsTextUtils.js";
import { getNewsDisplayStatus } from "../utils/newsDisplayStatus.js";
import { mapRowForTemplate } from "./newsReportMeta.js";
import { applyTemplate } from "./newsReportMessengerTemplate.js";
import {
  DEFAULT_HTML_CARD_TEMPLATE,
  DEFAULT_HTML_TABLE_TEMPLATE,
  DEFAULT_TXT_OUTPUT_TEMPLATE,
} from "../constants/newsReportDefaults.js";

export function toFaDigits(v) {
  return String(v ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function toEnDigits(v = "") {
  return String(v)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function statusLabel(row) {
  return getNewsDisplayStatus(row).primaryLabel;
}

function normalizeHM(hm) {
  if (!hm) return "--:--";
  const s = toEnDigits(hm).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return toFaDigits(`${s.slice(0, 2)}:${s.slice(2, 4)}`);
}

function getDisplayTime(r) {
  return normalizeHM(r.source_time_hm ?? r.relay_time_hm ?? r.ref_hm ?? "--");
}

function getDate(r) {
  return r.source_date_jalali ?? r.relay_date_jalali ?? r.ref_date ?? "";
}

function getSource(r) {
  return r.source ? esc(r.source) : "فضای مجازی";
}

function normalizeDateFa(jDate = "") {
  return toFaDigits(toEnDigits(jDate).replace(/\//g, "-"));
}

function getTextPlain(r, maxLen = 970) {
  let txt = String(r.cleaned_text || r.raw_text || "")
    .replace(/\*/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (txt.length > maxLen) txt = `${txt.slice(0, maxLen)} ... خبر ادامه دارد ...`;
  return txt || "—";
}

function getTextHtml(r) {
  const raw = stripHtml(r.cleaned_text || r.raw_text || "");
  return esc(raw).replace(/\*(.+?)\*/g, "<b>$1</b>");
}

function prepareRows(rows) {
  return (rows || []).map(mapRowForTemplate);
}

function buildRangeMetaHtml(displayFrom, displayTo) {
  return displayFrom.split(" ")[0] === displayTo.split(" ")[0]
    ? `<span class="range-single-date">
          ${toFaDigits(displayFrom.split(" ")[0])}
          <span class="time-separator">|</span>
          از ${toFaDigits(displayFrom.split(" ")[1] || "")} تا ${toFaDigits(displayTo.split(" ")[1] || "")}
        </span>`
    : `از ${toFaDigits(displayFrom)} تا ${toFaDigits(displayTo)}`;
}

function buildMetaBlockHtml(slot, newsCount) {
  const reportDateJalali = slot.report_date_jalali || "";
  const displayFrom = slot.display_from || "";
  const displayTo = slot.display_to || "";
  const rangeMeta = buildRangeMetaHtml(displayFrom, displayTo);
  return `
  <div class="meta-item"><span class="label">تاریخ گزارش:</span><span class="value">${toFaDigits(reportDateJalali)}</span></div>
  <div class="meta-item"><span class="label">بازه:</span><span class="value">${rangeMeta}</span></div>
  <div class="meta-item"><span class="label">تعداد:</span><span class="value">${toFaDigits(newsCount)}</span></div>`;
}

function buildPrintPageStyle(printConfig = {}) {
  const paper = printConfig.paper_size === "A5" ? "A5" : "A4";
  const mt = Number(printConfig.margin_top ?? 10);
  const mb = Number(printConfig.margin_bottom ?? 10);
  const ml = Number(printConfig.margin_left ?? 10);
  const mr = Number(printConfig.margin_right ?? 10);
  return `<style id="print-page-settings">
@page { size: ${paper}; margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm; }
@media print {
  .card, .empty, tr { break-inside: avoid; page-break-inside: avoid; }
}
</style>`;
}

function injectBeforeHeadClose(html, snippet) {
  if (html.includes("</head>")) return html.replace("</head>", `${snippet}</head>`);
  return `${snippet}${html}`;
}

function buildCardFragments(rows, color) {
  const prepared = prepareRows(rows);
  const newsCount = prepared.length;
  let cards = "";
  if (newsCount === 0) {
    cards = `<div class="empty">در این بازه خبر مرتبط رصد نشده است</div>`;
  } else {
    prepared.forEach((r, idx) => {
      const txt = getTextHtml(r);
      cards += `
<div class="card">
  <div class="card-header">
    <span class="number">خبر ${toFaDigits(idx + 1)}</span>
    <span class="datetime">${toFaDigits(getDate(r))} | ${getDisplayTime(r)}</span>
    <span class="source">${getSource(r)}</span>
  </div>
  <div class="card-text">${txt}</div>
</div>`;
    });
  }
  return { prepared, newsCount, cards };
}

export function buildNewsReportHtmlCard(rows, slot = {}) {
  const settings = slot.settings || {};
  const color = slot.color || "#c00000";
  const label = slot.label || "گزارش";
  const { newsCount, cards } = buildCardFragments(rows, color);
  const meta = buildMetaBlockHtml(slot, newsCount);
  const tpl = settings.html_card_template || DEFAULT_HTML_CARD_TEMPLATE;
  let html = applyTemplate(tpl, {
    label: esc(label),
    color,
    meta,
    cards,
  });
  if (slot.print_config) {
    html = injectBeforeHeadClose(html, buildPrintPageStyle(slot.print_config));
  }
  return html;
}

export function buildNewsReportHtmlTable(rows, slot = {}) {
  const settings = slot.settings || {};
  const prepared = prepareRows(rows);
  const newsCount = prepared.length;
  const label = slot.label || "گزارش";
  const org = slot.organization_name || "";
  const reportDateJalali = slot.report_date_jalali || "";
  const displayFrom = slot.display_from || "";
  const displayTo = slot.display_to || "";
  const color = slot.color || "#c00000";

  const safe = (s = "") => (String(s).trim() ? esc(String(s)) : "—");

  let bodyRows = "";
  if (newsCount === 0) {
    bodyRows = `<tr><td colspan="5" style="padding:20px;font-weight:bold;color:#555;">در این بازه خبر مرتبط رصد نشده است</td></tr>`;
  } else {
    prepared.forEach((r, idx) => {
      bodyRows += `<tr>
<td>${toFaDigits(idx + 1)}</td>
<td>${getDisplayTime(r)}</td>
<td class="text">${getTextHtml(r)}</td>
<td>${safe(r.source ?? "فضای مجازی")}</td>
<td>${safe(r.status ?? "در حال بررسی")}</td>
</tr>`;
    });
  }

  const meta = `تاریخ گزارش: ${toFaDigits(reportDateJalali)} |
بازه: ${toFaDigits(displayFrom)}-${toFaDigits(displayTo)} |
تعداد: ${toFaDigits(newsCount)}`;
  const orgBlock = org ? `<div class="org">${esc(org)}</div>` : "";
  const tpl = settings.html_table_template || DEFAULT_HTML_TABLE_TEMPLATE;
  let html = applyTemplate(tpl, {
    label: esc(label),
    color,
    meta,
    org_block: orgBlock,
    table_rows: bodyRows,
  });
  if (slot.print_config) {
    html = injectBeforeHeadClose(html, buildPrintPageStyle(slot.print_config));
  }
  return html;
}

export function buildNewsReportTxt(rows, slot = {}) {
  const prepared = prepareRows(rows);
  const newsCount = prepared.length;
  const settings = slot.settings || {};
  const template = settings.txt_output_template || DEFAULT_TXT_OUTPUT_TEMPLATE;
  const reportDate = toEnDigits(slot.report_date_jalali || (prepared[0] ? getDate(prepared[0]) : ""));
  const displayFrom = slot.display_from || "";
  const displayTo = slot.display_to || "";

  let newsList = "";
  if (newsCount === 0) {
    newsList = "در این بازه خبر مرتبط یافت نشد.";
  } else {
    prepared.forEach((r, idx) => {
      newsList +=
        `${toFaDigits(idx + 1)}) ${normalizeDateFa(getDate(r))} ${getDisplayTime(r)}\n` +
        `${getSource(r).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")} : ${getTextPlain(r)}\n` +
        `-----------------------------------------\n\n`;
    });
  }

  const output = applyTemplate(template, {
    label: slot.label || "اخبار",
    report_date: normalizeDateFa(reportDate),
    display_from: toFaDigits(displayFrom),
    display_to: toFaDigits(displayTo),
    news_count: String(newsCount),
    news_count_text: newsCount > 0 ? `${toFaDigits(newsCount)} خبر` : "بدون خبر",
    news_list: newsList.trim(),
  });
  return `\uFEFF${output}`;
}

/** @deprecated use buildNewsReportHtmlTable */
export function buildNewsReportHtml(rows, meta = {}) {
  return buildNewsReportHtmlTable(rows, meta);
}

export function buildAnalyticalReportHtml(analytics, meta = {}) {
  const sections = [];
  sections.push(`<h1>گزارش تحلیلی اخبار</h1>`);
  sections.push(`<div class="meta"><div>بازه: ${esc(meta.periodLabel)}</div><div>کل: ${analytics.total ?? 0}</div></div>`);
  if (analytics.distributions?.category?.length) {
    sections.push("<h2>توزیع دسته‌بندی</h2><table><tr><th>دسته</th><th>تعداد</th></tr>");
    for (const x of analytics.distributions.category) {
      sections.push(`<tr><td>${esc(x.name)}</td><td>${x.value}</td></tr>`);
    }
    sections.push("</table>");
  }
  if (analytics.distributions?.priority?.length) {
    sections.push("<h2>توزیع اهمیت</h2><table><tr><th>اهمیت</th><th>تعداد</th></tr>");
    for (const x of analytics.distributions.priority) {
      sections.push(`<tr><td>${esc(x.name)}</td><td>${x.value}</td></tr>`);
    }
    sections.push("</table>");
  }
  if (analytics.timeline?.length) {
    sections.push("<h2>روند زمانی</h2><table><tr><th>تاریخ</th><th>تعداد</th></tr>");
    for (const x of analytics.timeline) {
      sections.push(`<tr><td>${esc(x.date || x.name)}</td><td>${x.value ?? x.count}</td></tr>`);
    }
    sections.push("</table>");
  }
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"/><style>
    body{font-family:Tahoma,sans-serif;direction:rtl;margin:16px} table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:6px}</style></head><body>${sections.join("")}</body></html>`;
}

export function renderReportContent(format, rows, slot, analytics, reportKind) {
  if (reportKind === "analytical") {
    if (format === "txt") {
      const lines = [
        "گزارش تحلیلی اخبار",
        `بازه: ${slot.display_from} - ${slot.display_to}`,
        `کل: ${analytics?.total ?? 0}`,
        "",
      ];
      for (const x of analytics?.distributions?.category || []) lines.push(`${x.name}: ${x.value}`);
      return lines.join("\n");
    }
    return buildAnalyticalReportHtml(analytics, { periodLabel: `${slot.display_from} - ${slot.display_to}` });
  }
  if (format === "html_card") return buildNewsReportHtmlCard(rows, slot);
  if (format === "html_table" || format === "html") return buildNewsReportHtmlTable(rows, slot);
  if (format === "pdf") {
    return slot.pdf_source === "html_table"
      ? buildNewsReportHtmlTable(rows, slot)
      : buildNewsReportHtmlCard(rows, slot);
  }
  return buildNewsReportTxt(rows, slot);
}
