import { toPersianDigits } from "./analysisMonitorUtils.js";

/** تاریخ و ساعت پیام برای نمایش در UI (fa-IR) */
export function formatMessageDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("fa-IR");
  const time = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  return `${toPersianDigits(date)} ${toPersianDigits(time)}`;
}

/** فقط ساعت (برای فضاهای کوچک مثل بنر) */
export function formatMessageTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return toPersianDigits(d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }));
}
