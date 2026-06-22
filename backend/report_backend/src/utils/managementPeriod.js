import moment from "jalali-moment";

/** انواع بازه با محاسبه خودکار تاریخ شروع */
const AUTO_KINDS = new Set(["daily", "weekly", "monthly", "semi_annual", "annual"]);
/** همه انواع بازه شامل بازه دلخواه */
const ALL_KINDS = new Set([...AUTO_KINDS, "custom"]);

const PERIOD_KIND_FA = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  semi_annual: "شش‌ماهه",
  annual: "سالانه",
  custom: "دلخواه",
};

const JALALI_FORMAT = "jYYYY-jMM-jDD";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** پارس تاریخ شمسی YYYY-MM-DD (هم‌راستا با فیلد date در tbl_unit_events) */
export function parseJalaliDate(str) {
  if (!str || !DATE_RE.test(String(str))) return null;
  const m = moment(String(str), JALALI_FORMAT);
  return m.isValid() ? m : null;
}

/** محاسبه تاریخ شروع شمسی بر اساس نوع بازه و تاریخ پایان شمسی */
export function computePeriodStart(periodKind, periodEndStr) {
  if (!AUTO_KINDS.has(periodKind)) {
    throw new Error("نوع بازه نامعتبر است");
  }
  const end = parseJalaliDate(periodEndStr);
  if (!end) {
    throw new Error("تاریخ پایان نامعتبر است");
  }
  let start = end.clone();
  if (periodKind === "daily") start = end.clone();
  else if (periodKind === "weekly") start = end.clone().subtract(6, "days");
  else if (periodKind === "monthly") start = end.clone().subtract(1, "jMonth").add(1, "day");
  else if (periodKind === "semi_annual") start = end.clone().subtract(6, "jMonth").add(1, "day");
  else if (periodKind === "annual") start = end.clone().subtract(1, "jYear").add(1, "day");
  return start.format(JALALI_FORMAT);
}

/**
 * نرمال‌سازی بازه: برای انواع خودکار، شروع از پایان محاسبه می‌شود؛
 * برای بازه دلخواه (custom) هر دو تاریخ از ورودی گرفته می‌شوند.
 */
export function resolvePeriod({ period_kind, period_start, period_end }) {
  const kind = ALL_KINDS.has(period_kind) ? period_kind : null;
  if (!kind) throw new Error("نوع بازه نامعتبر است");

  const end = parseJalaliDate(period_end);
  if (!end) throw new Error("تاریخ پایان نامعتبر است");

  let startStr;
  if (kind === "custom") {
    const start = parseJalaliDate(period_start);
    if (!start) throw new Error("تاریخ شروع نامعتبر است");
    if (start.isAfter(end)) throw new Error("تاریخ شروع نباید بعد از تاریخ پایان باشد");
    startStr = start.format(JALALI_FORMAT);
  } else {
    startStr = computePeriodStart(kind, period_end);
  }

  const endStr = end.format(JALALI_FORMAT);
  const dayCount = end.diff(parseJalaliDate(startStr), "days") + 1;
  return { periodKind: kind, periodStart: startStr, periodEnd: endStr, dayCount };
}

export function periodKindLabelFa(periodKind) {
  return PERIOD_KIND_FA[periodKind] || periodKind;
}

export function normalizePeriodKind(k) {
  return ALL_KINDS.has(k) ? k : null;
}
