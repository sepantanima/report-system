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

/** مقایسهٔ متن برای تشخیص تغییر واقعی (بدون حساسیت به مارک‌داون/فاصلهٔ اضافه) */
export function normalizePlainForCompare(htmlOrText) {
  return String(stripHtml(htmlOrText) ?? "")
    .replace(/[*_~`]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  return moment().utcOffset(210).format(JALALI_FORMAT);
}

export function nowTimeHm() {
  const m = moment().utcOffset(210);
  const hh = String(m.hour()).padStart(2, "0");
  const mm = String(m.minute()).padStart(2, "0");
  return `${hh}${mm}`;
}

function jalaliMomentFromParts(dateStr, timeHm) {
  const d = normalizeJalaliDate(dateStr);
  const t = normalizeTimeHm(timeHm);
  if (!d || !t) return null;
  const [y, mo, day] = d.split("-");
  const m = moment(`${y}-${mo}-${day} ${t.slice(0, 2)}:${t.slice(2, 4)}`, "jYYYY-jMM-jDD HH:mm");
  return m.isValid() ? m.utcOffset(210, true) : null;
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

/** یک روز از تاریخ شمسی کم می‌کند */
export function subtractJalaliDays(dateStr, days = 1) {
  const d = normalizeJalaliDate(dateStr);
  if (!d) return null;
  return moment(d, JALALI_FORMAT).subtract(days, "days").format(JALALI_FORMAT);
}

/**
 * n8n گاهی source_date را تاریخ relay (بعد از نیمه‌شب) می‌گذارد
 * ولی source_time را از ساعت واقعی پیام شب قبل — ref_key اشتباه می‌شود.
 */
export function reconcileSourceDateWithRelay(sourceDate, sourceTime, relayDate, relayTime) {
  let sd = normalizeJalaliDate(sourceDate);
  const st = normalizeTimeHm(sourceTime);
  const rd = normalizeJalaliDate(relayDate);
  const rt = normalizeTimeHm(relayTime);
  if (!sd || !st || !rd || !rt) return { sourceDate: sd, sourceTime: st };
  if (sd === rd && st > rt) {
    sd = subtractJalaliDays(sd, 1);
  }
  return { sourceDate: sd, sourceTime: st };
}

/**
 * تاریخ/ساعت مرجع گزارش و فیلتر بازه.
 * ingestAt: زمان واقعی درج (created_at) — اگر ساعت منبع از زمان درج جلوتر باشد، به ingest برمی‌گردد.
 */
export function computeReportRefFields(sourceDate, sourceTime, relayDate, relayTime, ingestAt = null) {
  const { sourceDate: refDate, sourceTime: refHm } = reconcileSourceDateWithRelay(
    sourceDate,
    sourceTime,
    relayDate,
    relayTime,
  );
  let rd = refDate || normalizeJalaliDate(relayDate);
  let rh = refHm || normalizeTimeHm(relayTime);
  if (!rd || !rh) return { ref_date: rd, ref_hm: rh, ref_key: "" };

  const ingestM = ingestAt ? moment(ingestAt).utcOffset(210) : null;
  if (ingestM?.isValid()) {
    const refM = jalaliMomentFromParts(rd, rh);
    if (refM?.isAfter(ingestM.clone().add(2, "minutes"))) {
      rd = ingestM.format(JALALI_FORMAT);
      rh = ingestM.format("HHmm");
    }
  }

  return {
    ref_date: rd,
    ref_hm: rh,
    ref_key: `${rd.replace(/-/g, "")}${rh}`,
  };
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

/** decode common HTML entities (plain text may contain &nbsp; before ingest) */
export function decodeHtmlEntities(text = "") {
  return String(text ?? "")
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;lt;/gi, "<")
    .replace(/&amp;gt;/gi, ">")
    .replace(/&amp;quot;/gi, '"')
    .replace(/&amp;#39;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** طول متن بدون تگ HTML */
export function stripHtml(html = "") {
  if (!html) return "";
  return decodeHtmlEntities(
    String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
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
