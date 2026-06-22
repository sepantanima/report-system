export const NEWS_PRIORITIES = {
  1: { label: "خیلی مهم", color: "#dc2626" },
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
  pending: { label: "بررسی", color: "#64748b" },
  approved: { label: "تأیید", color: "#22c55e" },
  rejected: { label: "رد", color: "#ef4444" },
  rumor: { label: "شایعه", color: "#a855f7" },
};

export const NEWS_WORKFLOW_STATES = {
  new: { label: "پیش‌نویس", color: "#38bdf8" },
  pending: { label: "در انتظار", color: "#64748b" },
  reviewed: { label: "بررسی‌شده", color: "#eab308" },
  finalized: { label: "نهایی", color: "#22c55e" },
};

export const DUPLICATE_STATUSES = {
  none: { label: "—", color: "#64748b" },
  suspicious: { label: "مشکوک", color: "#f59e0b" },
  confirmed: { label: "تکراری", color: "#94a3b8" },
};

export const DUPLICATE_FILTER_OPTIONS = [
  { value: "exclude", label: "مخفی (پیش‌فرض)" },
  { value: "suspicious", label: "فقط مشکوک" },
  { value: "only", label: "همه تکراری" },
  { value: "include", label: "همه (شامل تکراری)" },
];
