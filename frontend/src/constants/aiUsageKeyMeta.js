import { AI_USAGE_KEYS } from "./aiUsageKeys.js";

/** کاربردهای شناخته‌شده — برای نمایش فارسی در مدیریت API */
export const AI_USAGE_KEY_OPTIONS = [
  {
    key: AI_USAGE_KEYS.FIELD_MANAGEMENT_SUMMARY,
    labelFa: "خلاصه مدیریتی — گزارش میدانی",
    where: "گزارشات میدانی → تولید خلاصه برای مدیر",
  },
  {
    key: AI_USAGE_KEYS.NEWS_SUMMARIZE,
    labelFa: "خلاصه‌سازی — متن خبر",
    where: "مدیریت اخبار → دکمه «خلاصه با هوش‌افزار»",
  },
  {
    key: AI_USAGE_KEYS.NEWS_SMART_ANALYSIS,
    labelFa: "تحلیل هوشمند — اخبار",
    where: "ماژول تحلیل هوشمند اخبار",
  },
  {
    key: AI_USAGE_KEYS.NEWS_EDITORIAL,
    labelFa: "پالایش هوشمند — دبیری اخبار",
    where: "مدیریت اخبار → پالایش و دبیری هوشمند",
  },
  {
    key: AI_USAGE_KEYS.STRATEGY_COMMAND_OUTPUTS,
    labelFa: "خروجی‌های راهبردی — مرکز فرماندهی",
    where: "مرکز فرماندهی → تولید پیوست جنگ نرم و خروجی‌ها",
  },
  {
    key: "demo.sample",
    labelFa: "نمونه آزمایشی",
    where: "فقط تست توسعه",
  },
];

const optionByKey = new Map(AI_USAGE_KEY_OPTIONS.map((o) => [o.key, o]));

export function usageKeyLabelFa(key) {
  return optionByKey.get(key)?.labelFa || String(key || "—");
}

export function usageKeyWhereFa(key) {
  return optionByKey.get(key)?.where || "";
}

export function isKnownUsageKey(key) {
  return optionByKey.has(key);
}

export function suggestNextSortOrder(rows, usageKey) {
  const uk = String(usageKey || "").trim();
  if (!uk) return 0;
  const orders = (rows || [])
    .filter((r) => r.usage_key === uk)
    .map((r) => Number(r.sort_order) || 0);
  if (!orders.length) return 0;
  return Math.max(...orders) + 1;
}

export function findSortConflict(rows, usageKey, sortOrder, excludeId = null) {
  const uk = String(usageKey || "").trim();
  const so = Number(sortOrder) || 0;
  return (rows || []).find(
    (r) => r.usage_key === uk && Number(r.sort_order) === so && r.id !== excludeId,
  ) || null;
}

export function groupConfigsByUsage(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const k = r.usage_key || "—";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fa"));
}

export function priorityLabel(indexInGroup) {
  if (indexInGroup === 0) return "۱ — اصلی";
  return `${indexInGroup + 1} — پشتیبان`;
}
