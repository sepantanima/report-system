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

export const NEWS_WORKFLOW_STATES = {
  new: { label: "پیش‌نویس", color: "#38bdf8" },
  pending: { label: "صف دبیر", color: "#64748b" },
  reviewed: { label: "ارسال به سردبیر", color: "#eab308" },
  finalized: { label: "آماده انتشار", color: "#22c55e" },
};

export const NEWS_PUBLISH_STATUSES = {
  none: { label: "—", color: "#64748b" },
  ready: { label: "آماده انتشار", color: "#22c55e" },
  banked: { label: "بانک انتظار", color: "#0ea5e9" },
};

export const DUPLICATE_STATUSES = {
  none: { label: "—", color: "#64748b" },
  suspicious: { label: "مشکوک به تکرار", color: "#f59e0b" },
  confirmed: { label: "تکراری تأییدشده", color: "#94a3b8" },
};

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

export const VALID_REVIEW_STATES = new Set(Object.keys(NEWS_REVIEW_STATES));
export const VALID_WORKFLOW_STATES = new Set(Object.keys(NEWS_WORKFLOW_STATES));
export const VALID_PUBLISH_STATUSES = new Set(Object.keys(NEWS_PUBLISH_STATUSES));
export const VALID_DUPLICATE_STATUSES = new Set(Object.keys(DUPLICATE_STATUSES));
export const VALID_RELEVANCE_STATUSES = new Set(Object.keys(NEWS_RELEVANCE_STATUSES));
export const VALID_EDITORIAL_STATES = new Set(Object.keys(NEWS_EDITORIAL_STATES));

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

/** sync review_state → is_approved + status (برای n8n) — فقط پس از finalized */
export function syncLegacyApprovalFields(reviewState, workflowStatus) {
  if (normalizeDbEnum(workflowStatus) !== "finalized") {
    return { is_approved: 0, status: 0 };
  }
  const rs = normalizeDbEnum(reviewState, "pending");
  if (rs === "approved") return { is_approved: 1, status: 1 };
  if (rs === "rejected") return { is_approved: 2, status: 0 };
  if (rs === "rumor") return { is_approved: 1, status: 2 };
  return { is_approved: 0, status: 0 };
}

export function inferReviewState(isApproved, status) {
  const ia = parseInt(isApproved, 10) || 0;
  const st = parseInt(status, 10) || 0;
  if (ia === 2) return "rejected";
  if (ia === 1 && st === 2) return "rumor";
  if (ia === 1) return "approved";
  return "pending";
}

export function inferWorkflowStatus(row) {
  const ws = normalizeDbEnum(row.workflow_status);
  if (ws && VALID_WORKFLOW_STATES.has(ws)) {
    return ws;
  }
  const rs = normalizeDbEnum(row.review_state) || inferReviewState(row.is_approved, row.status);
  if (rs === "approved" && parseInt(row.is_approved, 10) === 1) return "finalized";
  if (rs !== "pending") return "reviewed";
  return "pending";
}

export function resolveDuplicateStatus(row) {
  const raw = normalizeDbEnum(row?.duplicate_status);
  if (raw && VALID_DUPLICATE_STATUSES.has(raw) && raw !== "none") return raw;
  if (row?.is_duplicate) return "suspicious";
  if (raw && VALID_DUPLICATE_STATUSES.has(raw)) return raw;
  return "none";
}

export function clampPriority(v) {
  const n = parseInt(v, 10);
  return n >= 1 && n <= 4 ? n : 3;
}

export function clampQuality(v) {
  const n = parseInt(v, 10);
  return n >= 1 && n <= 5 ? n : 3;
}

export function duplicateStatusToLegacyFlag(status) {
  return status != null && status !== "none";
}

export function clampRelevanceStatus(v, fallback = "unset") {
  const s = normalizeDbEnum(v, fallback);
  return VALID_RELEVANCE_STATUSES.has(s) ? s : fallback;
}

export function clampEditorialState(v, fallback = "pending") {
  const s = normalizeDbEnum(v, fallback);
  return VALID_EDITORIAL_STATES.has(s) ? s : fallback;
}
