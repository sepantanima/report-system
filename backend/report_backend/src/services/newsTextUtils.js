import moment from "jalali-moment";
import { computeNewsHashKey } from "./newsIngest/newsHashKey.js";

const JALALI_FORMAT = "jYYYY-jMM-jDD";

/** @deprecated از buildCleanedFromRaw / cleanNewsPlainText استفاده کنید */
export function cleanNewsText(raw) {
  let text = String(raw ?? "");
  text = text.replace(/https?:\/\/[^\s]+/gi, "");
  text = text.replace(/www\.[^\s]+/gi, "");
  text = text.replace(/#[\u0600-\u06FF\w]+/g, "");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export function computeCharCount(text) {
  return String(text ?? "").length;
}

/** @param {string} text @param {string} [source] */
export function computeHashKey(text, source) {
  const normalized = String(text ?? "").trim();
  if (source !== undefined) {
    return computeNewsHashKey(normalized, source);
  }
  return computeNewsHashKey(normalized, "unknown");
}

export function nowJalaliDate() {
  return moment().locale("fa").format(JALALI_FORMAT);
}

export function nowTimeHm() {
  const m = moment();
  const hh = String(m.hour()).padStart(2, "0");
  const mm = String(m.minute()).padStart(2, "0");
  return `${hh}${mm}`;
}

/** تبدیل ارقام فارسی/عربی به ASCII (۰-۹ → 0-9) */
export function toAsciiDigits(str) {
  return String(str ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

export function normalizeJalaliDate(str) {
  const s = toAsciiDigits(str).trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function normalizeTimeHm(str) {
  const digits = toAsciiDigits(str).replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 4) return null;
  return digits.padStart(4, "0");
}

/** تبدیل تاریخ/ساعت شمسی منبع به timestamp (هم‌راستا با n8n) */
export function sourceJalaliToTimestamps(jalaliDate, timeHm) {
  const now = moment();
  const d = normalizeJalaliDate(jalaliDate);
  const t = normalizeTimeHm(timeHm);
  if (!d || !t) {
    const ts = now.toDate();
    return { source_ts_utc: ts, source_ts_tehran: ts };
  }
  const [y, mo, day] = d.split("-");
  const jm = moment(`${y}-${mo}-${day} ${t.slice(0, 2)}:${t.slice(2, 4)}`, "jYYYY-jMM-jDD HH:mm");
  if (!jm.isValid()) {
    const ts = now.toDate();
    return { source_ts_utc: ts, source_ts_tehran: ts };
  }
  const ts = jm.toDate();
  return { source_ts_utc: ts, source_ts_tehran: ts };
}

export function nowRelayTimestamps() {
  const ts = moment().toDate();
  return { relay_ts_utc: ts, relay_ts_tehran: ts };
}

/** طول متن بدون تگ HTML */
export function stripHtml(html = "") {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** نرمال‌سازی URL لینک خبر اصلی */
export function normalizeSourceUrl(url) {
  let s = String(url ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) {
      throw new Error("فقط http/https مجاز است");
    }
    return u.toString().slice(0, 500);
  } catch {
    throw new Error("آدرس لینک خبر نامعتبر است");
  }
}
