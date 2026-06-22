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
  new: { label: "جدید", color: "#38bdf8" },
  pending: { label: "در انتظار", color: "#64748b" },
  reviewed: { label: "بررسی‌شده", color: "#eab308" },
  finalized: { label: "نهایی", color: "#22c55e" },
};

export const DUPLICATE_STATUSES = {
  none: { label: "—", color: "#64748b" },
  suspicious: { label: "مشکوک", color: "#f59e0b" },
  confirmed: { label: "تکراری", color: "#94a3b8" },
};

export const VALID_REVIEW_STATES = new Set(Object.keys(NEWS_REVIEW_STATES));
export const VALID_WORKFLOW_STATES = new Set(Object.keys(NEWS_WORKFLOW_STATES));
export const VALID_DUPLICATE_STATUSES = new Set(Object.keys(DUPLICATE_STATUSES));

/** sync review_state → is_approved + status (برای n8n) — فقط پس از finalized */
export function syncLegacyApprovalFields(reviewState, workflowStatus) {
  if (workflowStatus !== "finalized") {
    return { is_approved: 0, status: 0 };
  }
  const rs = String(reviewState || "pending").trim();
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
  if (row.workflow_status && VALID_WORKFLOW_STATES.has(row.workflow_status)) {
    return row.workflow_status;
  }
  const rs = row.review_state || inferReviewState(row.is_approved, row.status);
  if (rs === "approved" && parseInt(row.is_approved, 10) === 1) return "finalized";
  if (rs !== "pending") return "reviewed";
  return "pending";
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
