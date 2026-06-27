import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export const NEWS_REPORT_TABLE_COLUMNS = [
  { key: "ref_date", title: "تاریخ", width: 90, visible: true },
  { key: "ref_hm", title: "ساعت", width: 70, visible: true },
  { key: "source", title: "منبع", width: 100, visible: true },
  { key: "short_text", title: "خلاصه", width: 160, visible: true },
  { key: "full_text", title: "متن کامل", width: 240, visible: true },
  { key: "status_label", title: "وضعیت", width: 90, visible: true },
  { key: "view", title: "نمایش", width: 56, visible: true },
  { key: "categories", title: "دسته‌ها", width: 120, visible: false },
];

export function stripNewsHtml(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getNewsRowCellValue(row, key) {
  switch (key) {
    case "view":
    case "actions":
      return "";
    case "ref_date":
      return row.ref_date || row.source_date_jalali || "—";
    case "ref_hm": {
      const hm = row.ref_hm || row.source_time_hm || "";
      if (!hm) return "—";
      const s = String(hm).padStart(4, "0");
      return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
    }
    case "full_text":
      return stripNewsHtml(row.cleaned_text || row.raw_text || row.summary || row.short_text || "");
    case "categories":
      return (row.categories || []).join("، ") || "—";
    default:
      return row[key] ?? "—";
  }
}

export function mapNewsRowsForExport(rows) {
  return (rows || []).map((row, i) => ({
    ردیف: i + 1,
    تاریخ: toPersianDigits(getNewsRowCellValue(row, "ref_date")),
    ساعت: toPersianDigits(getNewsRowCellValue(row, "ref_hm")),
    منبع: getNewsRowCellValue(row, "source"),
    خلاصه: row.short_text || "—",
    "متن کامل": getNewsRowCellValue(row, "full_text"),
    وضعیت: row.status_label || "—",
    دسته‌ها: getNewsRowCellValue(row, "categories"),
  }));
}
