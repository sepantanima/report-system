export const NEWS_PRIORITIES = {
  1: { label: "فوری", color: "#dc2626" },
  2: { label: "مهم", color: "#f59e0b" },
  3: { label: "عادی", color: "#64748b" },
  4: { label: "فاقد اهمیت", color: "#94a3b8" },
};

export const NEWS_QUALITY = {
  1: { label: "نامعتبر", color: "#ef4444" },
  2: { label: "ضعیف", color: "#f97316" },
  3: { label: "متوسط", color: "#eab308" },
  4: { label: "خوب", color: "#22c55e" },
  5: { label: "عالی", color: "#10b981" },
};

export const NEWS_REVIEW_STATES = {
  pending: { label: "بدون حکم", color: "#64748b" },
  approved: { label: "تأیید", color: "#22c55e" },
  rejected: { label: "برگشت به فرستنده", color: "#ef4444" },
  rumor: { label: "شایعه", color: "#a855f7" },
};

export const NEWS_PUBLISH_STATUSES = {
  none: { label: "—", color: "#64748b" },
  ready: { label: "آماده انتشار", color: "#22c55e" },
  banked: { label: "بانک انتظار", color: "#0ea5e9" },
};

export const PUBLISH_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "ready", label: "آماده انتشار" },
  { value: "banked", label: "بانک انتظار" },
];

export const NEWS_WORKFLOW_STATES = {
  new: { label: "پیش‌نویس", color: "#38bdf8" },
  pending: { label: "صف دبیر", color: "#64748b" },
  reviewed: { label: "ارسال به سردبیر", color: "#eab308" },
  finalized: { label: "آماده انتشار", color: "#22c55e" },
};

export const DUPLICATE_STATUSES = {
  none: { label: "—", color: "#64748b" },
  suspicious: { label: "مشکوک به تکرار", color: "#f59e0b" },
  confirmed: { label: "تکراری تأییدشده", color: "#94a3b8" },
};

export const DUPLICATE_FILTER_OPTIONS = [
  { value: "exclude", label: "مخفی (پیش‌فرض)" },
  { value: "suspicious", label: "فقط مشکوک" },
  { value: "only", label: "همه تکراری" },
  { value: "include", label: "همه (شامل تکراری)" },
];

export const NEWS_RELEVANCE_STATUSES = {
  unset: { label: "نامشخص", color: "#64748b" },
  relevant: { label: "مرتبط", color: "#22c55e" },
  irrelevant: { label: "غیرمرتبط", color: "#94a3b8" },
};

export const NEWS_EDITORIAL_STATES = {
  pending: { label: "پالایش‌نشده", color: "#f59e0b" },
  manual: { label: "پالایش دستی", color: "#38bdf8" },
  ai: { label: "پالایش AI", color: "#a855f7" },
};

export const RELEVANCE_FILTER_OPTIONS = [
  { value: "active", label: "مرتبط (پیش‌فرض — مخفی کردن غیرمرتبط)" },
  { value: "relevant", label: "فقط مرتبط" },
  { value: "irrelevant", label: "فقط غیرمرتبط" },
  { value: "all", label: "همه" },
];

export const EDITORIAL_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "pending", label: "پالایش‌نشده" },
  { value: "manual", label: "پالایش دستی" },
  { value: "ai", label: "پالایش AI" },
];

/** n8n گاهی enum را با کوتیشن اضافی ذخیره می‌کند: 'pending' */
export function normalizeDbEnum(value, fallback = "") {
  let s = String(value ?? "").trim();
  if (!s) return fallback;
  while (
    (s.startsWith("'") && s.endsWith("'"))
    || (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || fallback;
}
