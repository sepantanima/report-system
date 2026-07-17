/** ضرایب امتیازدهی داشبورد تحلیلی اخبار */

import { NEWS_PRIORITIES, NEWS_QUALITY } from "./newsMonitorMeta.js";

export const PRIORITY_WEIGHT = { 1: 4, 2: 3, 3: 2, 4: 1 };
export const QUALITY_WEIGHT = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 };

export const COEFF = {
  count: 1,
  priority: 2,
  quality: 2,
  speed: 1,
};

export function priorityWeight(p) {
  return PRIORITY_WEIGHT[Number(p)] ?? 2;
}

export function qualityWeight(q) {
  return QUALITY_WEIGHT[Number(q)] ?? 2;
}

/** score = count×1 + avgPriorityWeight×2 + avgQualityWeight×2 */
export function computeMonitorScore({ newsCount = 0, avgPriorityWeight = 0, avgQualityWeight = 0 }) {
  return (
    newsCount * COEFF.count
    + Number(avgPriorityWeight) * COEFF.priority
    + Number(avgQualityWeight) * COEFF.quality
  );
}

/** score = reviewed×1 + avgApprovedPriority×2 + avgApprovedQuality×2 + speedBonus×1 */
export function computeEditorScore({
  reviewedCount = 0,
  avgApprovedPriorityWeight = 0,
  avgApprovedQualityWeight = 0,
  speedBonus = 0,
}) {
  return (
    reviewedCount * COEFF.count
    + Number(avgApprovedPriorityWeight) * COEFF.priority
    + Number(avgApprovedQualityWeight) * COEFF.quality
    + Number(speedBonus) * COEFF.speed
  );
}

/** score = published×1 + avgPriority×2 + avgQuality×2 + speedBonus×1 */
export function computeChiefScore({
  publishedCount = 0,
  avgPriorityWeight = 0,
  avgQualityWeight = 0,
  speedBonus = 0,
}) {
  return (
    publishedCount * COEFF.count
    + Number(avgPriorityWeight) * COEFF.priority
    + Number(avgQualityWeight) * COEFF.quality
    + Number(speedBonus) * COEFF.speed
  );
}

/** نرمال‌سازی سرعت: هرچه سریع‌تر، bonus نزدیک ۱ (سقف ۴۸ ساعت) */
export function speedBonusFromHours(avgHours) {
  if (avgHours == null || !Number.isFinite(avgHours) || avgHours < 0) return 0;
  const capped = Math.min(avgHours, 48);
  return Math.max(0, 1 - capped / 48);
}

export const PRIORITY_LABELS = Object.fromEntries(
  Object.entries(NEWS_PRIORITIES).map(([k, v]) => [k, v.label]),
);

export const QUALITY_LABELS = Object.fromEntries(
  Object.entries(NEWS_QUALITY).map(([k, v]) => [k, v.label]),
);

export const STATUS_LABELS = {
  registered: "ثبت شده",
  in_review: "در حال بررسی",
  approved: "تأیید شده",
  rejected: "برگشت به فرستنده",
  published: "آماده انتشار",
  banked: "بانک انتظار",
};
