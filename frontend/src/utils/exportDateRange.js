import { DateObject } from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import { cleanDateString } from "./analysisMonitorUtils.js";
import { formatJalaliRangeSlugMd } from "./dashboardTitles.js";

export function gregorianToJalaliCompact(dateStr) {
  if (!dateStr) return "";
  const cleaned = cleanDateString(dateStr);
  if (!cleaned) return "";
  try {
    return new DateObject({ date: cleaned, format: "YYYY-MM-DD", calendar: gregorian })
      .convert(persian)
      .format("YYYYMMDD");
  } catch {
    return "";
  }
}

/** Compact Jalali range for filenames, e.g. 0223-0231 (month-day) */
export function formatDateRangeSlug(dateRange) {
  if (!dateRange?.startDate) return "";
  return formatJalaliRangeSlugMd(
    dateRange.startDate,
    dateRange.endDate || dateRange.startDate,
  );
}

/** @deprecated alias — same as formatDateRangeSlug */
export function formatDateRangeSlugMd(dateRange) {
  return formatDateRangeSlug(dateRange);
}

export function formatDateRangeLabel(dateRange) {
  if (!dateRange?.startDate) return "";
  const start = dateRange.startDate;
  const end = dateRange.endDate || dateRange.startDate;
  const slug = formatJalaliRangeSlugMd(start, end);
  if (!slug) return "";
  if (slug.includes("-")) {
    const [s, e] = slug.split("-");
    return `بازه ${s} تا ${e}`;
  }
  return `تاریخ ${slug}`;
}

export function buildExportFileName(baseName, dateRange, ext = "xlsx") {
  const slug = formatDateRangeSlug(dateRange);
  const safeBase = String(baseName || "export").replace(/[^\w\u0600-\u06FF-]+/g, "-");
  const name = slug ? `${safeBase}-${slug}` : safeBase;
  return name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}
