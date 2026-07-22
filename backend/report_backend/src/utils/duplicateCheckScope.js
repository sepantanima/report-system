import moment from "jalali-moment";

export const VALID_DUPLICATE_SCOPES = new Set(["today", "3days", "7days"]);

const JALALI_FMT = "jYYYY-jMM-jDD";

/**
 * @param {string} scope
 * @param {string} [referenceJalali] تاریخ مرجع jYYYY-jMM-jDD
 */
export function getScopeDateRange(scope, referenceJalali = null) {
  const normalized = VALID_DUPLICATE_SCOPES.has(scope) ? scope : "today";
  const ref = referenceJalali
    ? moment(referenceJalali, JALALI_FMT).locale("fa")
    : moment().locale("fa");
  if (!ref.isValid()) {
    const now = moment().locale("fa");
    return { start: now.format(JALALI_FMT), end: now.format(JALALI_FMT) };
  }
  const end = ref.format(JALALI_FMT);
  let subtractDays = 0;
  if (normalized === "3days") subtractDays = 2;
  else if (normalized === "7days") subtractDays = 6;
  const start = ref.clone().subtract(subtractDays, "days").format(JALALI_FMT);
  return { start, end };
}

/**
 * @param {number} raw
 * @param {number} [min]
 * @param {number} [max]
 */
export function clampThreshold(raw, min = 50, max = 95) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 70;
  return Math.min(max, Math.max(min, n));
}
