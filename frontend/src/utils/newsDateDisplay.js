import { toPersianDigits } from "./analysisMonitorUtils.js";

export function formatNewsRefDateTime(item) {
  const dateRaw = item?.ref_date || item?.source_date_jalali || "";
  const date = String(dateRaw).replace(/-/g, "/");
  const hmRaw = String(item?.ref_hm || item?.source_time_hm || "").replace(/\D/g, "");
  const time = hmRaw.length >= 4 ? `${hmRaw.slice(0, 2)}:${hmRaw.slice(2, 4)}` : "";
  if (!date && !time) return "—";
  const parts = [];
  if (date) parts.push(toPersianDigits(date));
  if (time) parts.push(toPersianDigits(time));
  return parts.join(" · ");
}
