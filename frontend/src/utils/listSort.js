/** Shared client-side list sorting with localStorage persistence. */

export function toEnDigit(s) {
  if (!s) return "";
  return String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

export function normalizeDigits(val) {
  return toEnDigit(String(val ?? "")).replace(/\D/g, "");
}

/** Jalali date + HHMM → sortable numeric string (YYYYMMDD + HHMM). */
export function jalaliDateTimeKey(dateStr, timeStr) {
  const d = normalizeDigits(dateStr);
  const t = normalizeDigits(timeStr).padStart(4, "0");
  if (!d && !t) return "";
  return d + t;
}

export function loadSortPref(storageKey, defaultConfig, validKeys) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...defaultConfig };
    const parsed = JSON.parse(raw);
    const field = String(parsed?.field ?? "");
    const direction = parsed?.direction;
    if (validKeys.has(field) && (direction === "asc" || direction === "desc")) {
      return { field, direction };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { ...defaultConfig };
}

export function saveSortPref(storageKey, config) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch {
    /* ignore quota / private mode */
  }
}

export function compareSortValues(aV, bV, direction) {
  const mult = direction === "asc" ? 1 : -1;
  if (aV == null && bV == null) return 0;
  if (aV == null || aV === "") return 1;
  if (bV == null || bV === "") return -1;
  if (typeof aV === "number" && typeof bV === "number" && !Number.isNaN(aV) && !Number.isNaN(bV)) {
    return (aV - bV) * mult;
  }
  const aS = String(aV);
  const bS = String(bV);
  if (aS < bS) return -1 * mult;
  if (aS > bS) return 1 * mult;
  return 0;
}

export function sortItems(items, config, getValue) {
  if (!Array.isArray(items) || !items.length) return items || [];
  const { field, direction } = config || {};
  if (!field) return [...items];
  return [...items].sort((a, b) => compareSortValues(getValue(a, field), getValue(b, field), direction));
}
