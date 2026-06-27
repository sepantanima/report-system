import moment from "jalali-moment";
import { normalizeJalaliDate, normalizeTimeHm } from "./newsTextUtils.js";

const PRESET_SLOT_HOURS = {
  preset_1h: 1,
  preset_3h: 3,
  preset_6h: 6,
  preset_12h: 12,
  preset_24h: 24,
};

function buildTimeSlots(hourSpan) {
  const span = Math.min(24, Math.max(1, hourSpan));
  const slots = [];
  for (let start = 0; start < 24; start += span) {
    const end = start + span;
    const fromH = String(start).padStart(2, "0");
    const to = end >= 24 ? "24:00" : `${String(end).padStart(2, "0")}:00`;
    slots.push({ from: `${fromH}:00`, to });
  }
  return slots;
}

function resolvePresetSlot(mode, body = {}) {
  const slots = buildTimeSlots(PRESET_SLOT_HOURS[mode] || 24);
  if (body.from_time && body.to_time) {
    const match = slots.find((s) => s.from === body.from_time && s.to === body.to_time);
    if (match) return match;
    return { from: body.from_time, to: body.to_time };
  }
  const idx = Math.min(
    Math.max(0, parseInt(body.slot_index, 10) || 0),
    slots.length - 1,
  );
  return slots[idx] || slots[0];
}

function todayJalali() {
  return moment().utcOffset(210).format("jYYYY-MM-DD");
}

function timeToHm(timeStr) {
  const hm = normalizeTimeHm(timeStr || "00:00") || "0000";
  return hm;
}

function displayTime(timeStr) {
  if (timeStr === "24:00") return "24:00";
  const hm = timeToHm(timeStr);
  return `${hm.slice(0, 2)}:${hm.slice(2, 4)}`;
}

function buildPeriodFromDay(reportDate, fromTime, toTime, mode) {
  const date = normalizeJalaliDate(reportDate);
  if (!date) throw new Error("تاریخ گزارش الزامی است");

  const fromHm = timeToHm(fromTime);
  let toHm = toTime === "24:00" ? "2359" : timeToHm(toTime);
  if (fromHm >= toHm && toTime !== "24:00") {
    throw new Error("بازه زمانی نامعتبر است (شروع باید قبل از پایان باشد)");
  }

  const fromKey = date.replace(/-/g, "") + fromHm;
  const toKey = toTime === "24:00"
    ? date.replace(/-/g, "") + "2359"
    : date.replace(/-/g, "") + toHm;

  const fromDisp = displayTime(fromTime);
  const toDisp = toTime === "24:00" ? "24:00" : displayTime(toTime);

  return {
    mode,
    report_date: date,
    from_ref_key: fromKey,
    to_ref_key: toKey,
    from_date: date,
    to_date: date,
    from_time: fromDisp,
    to_time: toDisp,
    display_from: `${date} ${fromDisp}`,
    display_to: `${date} ${toDisp}`,
    periodLabel: `${date} | از ${fromDisp} تا ${toDisp}`,
  };
}

export function resolveReportPeriod(body = {}) {
  const mode = String(body.mode || "manual").trim();

  if (PRESET_SLOT_HOURS[mode]) {
    const slot = resolvePresetSlot(mode, body);
    const reportDate = normalizeJalaliDate(body.report_date) || todayJalali();
    return buildPeriodFromDay(reportDate, slot.from, slot.to, mode);
  }

  if (mode === "same_day") {
    const reportDate = normalizeJalaliDate(body.report_date);
    if (!reportDate) throw new Error("تاریخ گزارش الزامی است");
    return buildPeriodFromDay(
      reportDate,
      body.from_time || "00:00",
      body.to_time || "24:00",
      "same_day",
    );
  }

  const fromDate = normalizeJalaliDate(body.from_date);
  const toDate = normalizeJalaliDate(body.to_date);
  const fromTime = normalizeTimeHm(body.from_time || "00:00") || "0000";
  const toTime = normalizeTimeHm(body.to_time || "23:59") || "2359";
  if (!fromDate || !toDate) throw new Error("تاریخ شروع و پایان الزامی است");

  const fromKey = fromDate.replace(/-/g, "") + fromTime;
  const toKey = toDate.replace(/-/g, "") + toTime;
  if (fromKey >= toKey) throw new Error("بازه زمانی نامعتبر است (شروع باید قبل از پایان باشد)");

  const fromDisp = displayTime(body.from_time || "00:00");
  const toDisp = displayTime(body.to_time || "23:59");

  return {
    mode: "manual",
    report_date: fromDate,
    from_ref_key: fromKey,
    to_ref_key: toKey,
    from_date: fromDate,
    to_date: toDate,
    from_time: fromDisp,
    to_time: toDisp,
    display_from: `${fromDate} ${fromDisp}`,
    display_to: `${toDate} ${toDisp}`,
    periodLabel: `از ${fromDate} ${fromDisp} تا ${toDate} ${toDisp}`,
  };
}

export function periodToQueryFilters(period) {
  return {
    from_ref_key: period.from_ref_key,
    to_ref_key: period.to_ref_key,
    start_date: period.from_date,
    end_date: period.to_date,
  };
}

export const PRESET_WINDOWS = Object.fromEntries(
  Object.entries(PRESET_SLOT_HOURS).map(([key, hours]) => {
    const slot = buildTimeSlots(hours).at(-1);
    return [key, { from: slot.from, to: slot.to }];
  }),
);
