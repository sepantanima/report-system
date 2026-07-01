export const DEFAULT_DAILY_SUBMISSION_LIMIT = 10;

export function buildDailyQuota({ limit, used }) {
  const lim = Number(limit) || 0;
  const u = Number(used) || 0;
  if (lim === 0) {
    return { limit: 0, used: u, remaining: null, unlimited: true };
  }
  const remaining = Math.max(0, lim - u);
  return { limit: lim, used: u, remaining, unlimited: false };
}

export function quotaExceeded(quota) {
  if (!quota || quota.unlimited) return false;
  return quota.used >= quota.limit;
}

export function formatQuotaErrorMessage(limit) {
  return `سقف ثبت روزانه (${limit} مورد) تکمیل شده است. فردا دوباره تلاش کنید.`;
}
