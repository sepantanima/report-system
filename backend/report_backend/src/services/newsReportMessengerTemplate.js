import { stripHtml } from "./newsTextUtils.js";
import { toFaDigits } from "./newsReportFormat.js";
import { getAllReportDefaults } from "../constants/newsReportDefaults.js";
import { mapRowForTemplate } from "./newsReportMeta.js";

export function applyTemplate(template, vars) {
  let out = String(template || "");
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val ?? ""));
  }
  return out.trim();
}

function normalizeHM(hm) {
  if (!hm) return "--:--";
  const s = String(hm).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return toFaDigits(`${s.slice(0, 2)}:${s.slice(2, 4)}`);
}

export function buildNewsItemText(row, index, itemTemplate) {
  const r = mapRowForTemplate(row);
  const date = r.source_date_jalali || r.relay_date_jalali || "";
  const time = normalizeHM(r.source_time_hm || r.relay_time_hm);
  const text = stripHtml(r.cleaned_text || r.raw_text || "").replace(/\*/g, "").trim();
  return applyTemplate(itemTemplate, {
    index: toFaDigits(index),
    news_number: toFaDigits(index),
    news_date: toFaDigits(date),
    news_time: time,
    news_source: r.source || "فضای مجازی",
    news_text: text,
    news_status: r.status || "",
  });
}

export function buildMessengerReportBody(settings, slot, rows) {
  const itemTpl = settings.news_item_template
    || getAllReportDefaults().news_item_template;
  const newsList = rows.map((row, i) => buildNewsItemText(row, i + 1, itemTpl)).join("\n\n");

  const tpl = settings.messenger_template || getAllReportDefaults().messenger_template;

  return applyTemplate(tpl, {
    label: slot.label || settings.default_label || "گزارش",
    report_date: toFaDigits(slot.report_date_jalali || ""),
    display_from: toFaDigits(slot.display_from || ""),
    display_to: toFaDigits(slot.display_to || ""),
    news_count: String(rows.length),
    news_list: newsList,
    signature: settings.signature_text || "",
    hashtags: settings.hashtags || "",
    system_name: settings.system_name || "",
    system_link: settings.system_link || "",
  });
}

export function buildSingleNewsMessage(settings, row, index = 1) {
  const itemTpl = settings.news_item_template
    || getAllReportDefaults().news_item_template;
  const body = buildNewsItemText(row, index, itemTpl);
  const parts = [body];
  if (settings.signature_text) parts.push(settings.signature_text);
  if (settings.hashtags) parts.push(settings.hashtags);
  return parts.join("\n\n");
}
