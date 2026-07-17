import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import {
  gregorianToPersianPicker,
  persianDateToGregorian,
  toPersianDigits,
} from "../../../utils/analysisMonitorUtils.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Gregorian YYYY-MM-DD (API / local wall calendar) */
export function toYmd(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function addDays(ymd, delta) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toYmd(d);
}

export const RANGE_PRESETS = [
  { id: "today", label: "امروز" },
  { id: "yesterday", label: "دیروز" },
  { id: "week", label: "هفته" },
  { id: "month", label: "ماه" },
  { id: "quarter", label: "فصل" },
  { id: "year", label: "سال" },
  { id: "custom", label: "بازه دلخواه" },
];

export function rangeFromPreset(presetId) {
  const today = toYmd(new Date());
  switch (presetId) {
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: addDays(today, -29), to: today };
    case "quarter":
      return { from: addDays(today, -89), to: today };
    case "year":
      return { from: addDays(today, -364), to: today };
    case "custom":
      return null;
    case "today":
    default:
      return { from: today, to: today };
  }
}

export function defaultDashboardFilters() {
  const r = rangeFromPreset("today");
  return {
    preset: "today",
    from: r.from,
    to: r.to,
    unit_id: "",
    role: "",
    province: "",
    process_status: "",
    product_type: "",
    priority: "",
  };
}

export function filtersToApiParams(filters) {
  const params = { from: filters.from, to: filters.to };
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.role) params.role = filters.role;
  if (filters.province) params.province = filters.province;
  if (filters.process_status) params.process_status = filters.process_status;
  if (filters.product_type) params.product_type = filters.product_type;
  if (filters.priority) params.priority = filters.priority;
  return params;
}

/** DateObject[] persian range → gregorian from/to */
export function dateObjectsToGregorianRange(dateRange) {
  if (!dateRange?.[0]) return null;
  const from = persianDateToGregorian(dateRange[0]);
  const to = dateRange[1] ? persianDateToGregorian(dateRange[1]) : from;
  return { from, to };
}

export function gregorianRangeToDateObjects(from, to) {
  const a = gregorianToPersianPicker(from);
  const b = gregorianToPersianPicker(to || from);
  if (!a) return [];
  return b ? [a, b] : [a];
}

/** Gregorian YYYY-MM-DD → نمایش شمسی با ارقام فارسی */
export function formatGregorianAsJalali(ymd) {
  if (!ymd) return "";
  const p = gregorianToPersianPicker(ymd);
  if (!p) return toPersianDigits(ymd);
  return toPersianDigits(p.format("YYYY/MM/DD"));
}

export function todayPersianDateObject() {
  return new DateObject({ calendar: persian });
}

export { persian, gregorian, DateObject };
