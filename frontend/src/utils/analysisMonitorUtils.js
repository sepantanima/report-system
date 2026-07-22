import { DateObject } from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";

export const toPersianDigits = (val) => {
  if (val === undefined || val === null) return "۰";
  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
};

export const toEnDigit = (s) => {
  if (!s) return "";
  return String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
};

export const cleanDateString = (dateStr) => {
  if (!dateStr) return "";
  const str = toEnDigit(String(dateStr));
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return str.replace(/[^0-9-]/g, "");
};

/** Convert Persian picker value or Jalali string to Gregorian YYYY-MM-DD for API/DB. */
export function persianDateToGregorian(input) {
  if (!input) return "";
  if (typeof input === "object" && typeof input.format === "function") {
    return new DateObject(input).convert(gregorian).format("YYYY-MM-DD");
  }
  const cleaned = cleanDateString(input);
  if (!cleaned) return "";
  const year = parseInt(cleaned.split("-")[0], 10);
  if (year >= 1900 && year <= 2100) return cleaned;
  if (year >= 1300 && year <= 1500) {
    return new DateObject({ date: cleaned, format: "YYYY-MM-DD", calendar: persian })
      .convert(gregorian)
      .format("YYYY-MM-DD");
  }
  return cleaned;
}

/** Convert Gregorian YYYY-MM-DD from DB to Persian picker value. */
export function gregorianToPersianPicker(gregorianStr) {
  if (!gregorianStr) return null;
  const cleaned = cleanDateString(gregorianStr);
  if (!cleaned) return null;
  return new DateObject({ date: cleaned, format: "YYYY-MM-DD", calendar: gregorian }).convert(persian);
}

/** Extract YYYY-MM-DD from ISO timestamp or date string for API/DatePicker. */
export function toDbDateString(value) {
  if (!value) return "";
  const s = String(value);
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return cleanDateString(s);
}

export function normalizeDateParams(params = {}) {
  const next = { ...params };
  if (next.startDate) next.startDate = persianDateToGregorian(next.startDate);
  else delete next.startDate;
  if (next.endDate) next.endDate = persianDateToGregorian(next.endDate);
  else delete next.endDate;
  return next;
}

/** Build optional API date range from Persian picker value; empty when no date selected. */
export function getDateRangeParams(dates) {
  if (!dates?.[0]) return {};
  const startDate = persianDateToGregorian(dates[0]);
  const endDate = dates[1] ? persianDateToGregorian(dates[1]) : startDate;
  if (!startDate || !endDate) return {};
  return { startDate, endDate };
}

export function normalizeTopicPayload(data = {}) {
  const next = { ...data };
  if (next.suggested_deadline) {
    next.suggested_deadline = persianDateToGregorian(next.suggested_deadline) || "";
  }
  return next;
}

export function normalizeAssignmentPayload(data = {}) {
  const next = { ...data };
  if (next.deadline) {
    next.deadline = persianDateToGregorian(next.deadline) || "";
  }
  return next;
}

export function formatPersianDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return toPersianDigits(String(dateStr));
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "long", day: "numeric",
    }).format(d);
  } catch {
    return toPersianDigits(String(dateStr));
  }
}

export function formatPersianDateShort(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
  } catch {
    return toPersianDigits(String(dateStr));
  }
}

export const PRIORITY_META = {
  high: { label: "فوری", color: "#ef4444" },
  medium: { label: "متوسط", color: "#f59e0b" },
  low: { label: "عادی", color: "#64748b" },
};

import {
  TOPIC_FIELD_LIMITS,
  MISSION_FIELD_LIMITS,
  ANALYSIS_FIELD_LIMITS,
  BRIEF_FIELD_LIMITS,
  stripHtml,
  plainTextLength,
} from "../constants/analysisFieldLimits.js";
import { ANALYSIS_TERMS } from "../constants/analysisTerminology.js";

export {
  TOPIC_FIELD_LIMITS,
  MISSION_FIELD_LIMITS,
  ANALYSIS_FIELD_LIMITS,
  BRIEF_FIELD_LIMITS,
  stripHtml,
  plainTextLength,
};

export const TOPIC_STATUS_META = {
  Draft: { label: "پیش‌نویس", color: "#64748b" },
  Submitted: { label: "منتظر تصویب", color: "#38bdf8" },
  UnderReview: { label: "برگشت برای اصلاح", color: "#f59e0b" },
  Approved: { label: "محور تصویب‌شده", color: "#22c55e" },
  Rejected: { label: "رد شده", color: "#ef4444" },
  Assigned: { label: "در جریان تحلیل", color: "#8b5cf6" },
  Completed: { label: "تکمیل‌شده", color: "#64748b" },
  Closed: { label: "بایگانی‌شده", color: "#94a3b8" },
};

/** Proposer-facing status labels (clearer than raw DB status). */
export const PROPOSER_TOPIC_STATUS_LABELS = {
  Approved: { label: "محور تصویب‌شده — منتظر ارجاع", color: "#22c55e" },
  Assigned: { label: "در جریان تحلیل", color: "#8b5cf6" },
};

/** Normalized assignment counts aligned with missions API (excludes Cancelled/Archived). */
export function getTopicAssignmentStats(topic) {
  const active = Number(topic?.assignment_active) || 0;
  const done = Number(topic?.assignment_done) || 0;
  const cancelled = Number(topic?.assignment_cancelled) || 0;
  let total = Number(topic?.assignment_total ?? topic?.assignment_count);
  if (!Number.isFinite(total) || total < 0) {
    total = active + done;
  } else if (cancelled > 0 && total === active + done + cancelled) {
    total = active + done;
  }
  return { active, done, cancelled, total };
}

/** Missions not yet FinalApproved — resilient when assignment_active undercounts. */
export function getTopicPendingCount(topic) {
  const { total, done, active } = getTopicAssignmentStats(topic);
  return Math.max(active, total - done);
}

/** Approved topic with no missions yet — ready for first assignment. */
export function isTopicNewForAssignment(topic) {
  if (!topic || topic.status !== "Approved") return false;
  if (isTopicClosedForAssignment(topic)) return false;
  return getTopicAssignmentStats(topic).total === 0;
}

/** Topic that already has at least one mission (or is in Assigned workflow). */
export function isTopicWithMissions(topic) {
  if (!topic) return false;
  const { total } = getTopicAssignmentStats(topic);
  return total > 0 || topic.status === "Assigned";
}

/** Manager missions-tab badge: new vs already referred. */
export function getManagerTopicReferralBadge(topic) {
  if (isTopicNewForAssignment(topic)) {
    return { label: "جدید", color: "#22c55e" };
  }
  if (isTopicWithMissions(topic)) {
    return { label: "دارای مأموریت", color: "#8b5cf6" };
  }
  return null;
}

export function getManagerTopicTabCounts(topics = []) {
  const list = topics || [];
  const newCount = list.filter(isTopicNewForAssignment).length;
  const withMissions = list.filter(isTopicWithMissions).length;
  return { total: list.length, newCount, withMissions };
}

export const PROPOSER_TABS = [
  { id: "active", label: "فعال", statKey: "active", badgeTone: "count" },
  { id: "archive", label: "آرشیو", statKey: "archive", badgeTone: "count" },
];

const PROPOSER_ACTIVE_STATUSES = ["Draft", "Submitted", "UnderReview"];
const PROPOSER_ARCHIVE_STATUSES = ["Rejected", "Closed", "Completed"];

function uniqueTopicsById(items) {
  const map = new Map();
  for (const t of items || []) {
    if (t?.id != null) map.set(t.id, t);
  }
  return [...map.values()];
}

const PROPOSER_TOPIC_SORT = { UnderReview: 0, Submitted: 1, Approved: 2, Assigned: 3, Completed: 4, Draft: 5, Rejected: 6, Closed: 7 };

function topicTimestamp(topic) {
  const raw = topic?.updated_at || topic?.created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function deadlineSortKey(topic) {
  if (!topic?.suggested_deadline) return Number.MAX_SAFE_INTEGER;
  const t = new Date(topic.suggested_deadline).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/** Manager closed topic — no new missions. */
export function isTopicManagerClosed(topic) {
  return topic?.status === "Completed";
}

export function isTopicClosedForAssignment(topic) {
  return isTopicManagerClosed(topic);
}

export function isTopicAssignmentsAllDone(topic) {
  if (!topic || topic.status !== "Assigned") return false;
  const { total, active, done } = getTopicAssignmentStats(topic);
  return total > 0 && active === 0 && done === total;
}

export function isTopicCompleted(topic) {
  return topic?.status === "Completed";
}

const TOPIC_NON_ASSIGNABLE_STATUSES = ["Closed", "Rejected", "Completed"];

/** Whether a manager may create a new mission for this topic. */
export function isTopicAssignableForMission(topic) {
  if (!topic || topic.deleted_at) return false;
  if (TOPIC_NON_ASSIGNABLE_STATUSES.includes(topic.status)) return false;
  if (!["Approved", "Assigned"].includes(topic.status)) return false;
  if (isTopicOverdueForAction(topic)) return false;
  return true;
}

export function isTopicOverdueForAction(topic) {
  if (!topic?.suggested_deadline) return false;
  if (!["Approved", "Assigned"].includes(topic.status)) return false;
  if (isTopicClosedForAssignment(topic)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(topic.suggested_deadline);
  dl.setHours(0, 0, 0, 0);
  return dl < today;
}

export function isTopicInProgress(topic) {
  if (!topic) return false;
  if (topic.status === "Approved") return true;
  if (topic.status === "Assigned") return getTopicPendingCount(topic) > 0;
  return false;
}

export function filterTopicsByProposerTab(topics, tabId, archiveTopics = []) {
  const list = topics || [];
  const archived = archiveTopics || [];
  const archivePool = uniqueTopicsById([
    ...archived,
    ...list.filter((t) => PROPOSER_ARCHIVE_STATUSES.includes(t.status)),
  ]);
  switch (tabId) {
    case "active":
      return list.filter((t) => PROPOSER_ACTIVE_STATUSES.includes(t.status));
    case "archive":
      return archivePool;
    default:
      return list;
  }
}

export function sortProposerTopics(topics) {
  return [...(topics || [])].sort((a, b) => {
    const sa = PROPOSER_TOPIC_SORT[a.status] ?? 99;
    const sb = PROPOSER_TOPIC_SORT[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    if (a.status === "UnderReview") {
      const da = deadlineSortKey(a);
      const db = deadlineSortKey(b);
      if (da !== db) return da - db;
    }
    return topicTimestamp(b) - topicTimestamp(a);
  });
}

export function getProposerTabCounts(activeTopics = [], archiveTopics = []) {
  const list = activeTopics || [];
  const archived = archiveTopics || [];
  const archivePool = uniqueTopicsById([
    ...archived,
    ...list.filter((t) => PROPOSER_ARCHIVE_STATUSES.includes(t.status)),
  ]);
  return {
    active: list.filter((t) => PROPOSER_ACTIVE_STATUSES.includes(t.status)).length,
    archive: archivePool.length,
    pending: list.filter((t) => t.status === "Submitted").length,
    returned: list.filter((t) => t.status === "UnderReview").length,
  };
}

export function getProposerTopicStatusMeta(topic, proposerView = false) {
  if (!topic) {
    return { label: "—", color: "#94a3b8" };
  }
  if (isTopicManagerClosed(topic)) {
    return TOPIC_STATUS_META.Completed;
  }
  if (!proposerView) {
    if (topic.status === "Approved") {
      const { total, cancelled } = getTopicAssignmentStats(topic);
      if (total === 0 && cancelled > 0) {
        return { label: "تصویب شده — ارجاع لغوشده", color: "#22c55e" };
      }
    }
    return TOPIC_STATUS_META[topic.status] || { label: topic.status, color: "#94a3b8" };
  }
  if (topic.status === "Approved" || topic.status === "Assigned") {
    return PROPOSER_TOPIC_STATUS_LABELS[topic.status] || TOPIC_STATUS_META[topic.status];
  }
  return TOPIC_STATUS_META[topic.status] || { label: topic.status, color: "#94a3b8" };
}

/** Subline under status for proposer table/card (assignment counts). */
export function getTopicAssignmentSubline(topic) {
  if (!topic) return null;
  if (isTopicManagerClosed(topic)) {
    const pending = getTopicPendingCount(topic);
    if (pending > 0) return `${toPersianDigits(pending)} ارجاع در جریان — تکمیل‌شده`;
    return "تکمیل‌شده";
  }
  if (topic.status !== "Assigned") return null;
  const { done } = getTopicAssignmentStats(topic);
  const pending = getTopicPendingCount(topic);
  if (pending === 0 && done > 0) {
    return `${toPersianDigits(done)} ارجاع تمام‌شده`;
  }
  if (pending > 0) {
    return `${toPersianDigits(pending)} در جریان${done > 0 ? ` · ${toPersianDigits(done)} تمام` : ""}`;
  }
  return null;
}

/** Default approval queue: submitted + returned for revision. */
export const APPROVAL_DEFAULT_STATUSES = ["Submitted", "UnderReview"];

const PRIORITY_SORT = { high: 0, medium: 1, low: 2 };

export const TOPIC_TABLE_SORT_FIELDS = [
  { key: "topic_code", label: "کد" },
  { key: "title", label: "عنوان" },
  { key: "referral_badge", label: "ارجاع" },
  { key: "status", label: "وضعیت" },
  { key: "priority", label: "اولویت" },
  { key: "assignment_active", label: "فعال" },
  { key: "assignment_total", label: "کل مأموریت" },
  { key: "assignment_done", label: "تمام‌شده" },
  { key: "assignment_cancelled", label: "لغو/بایگانی" },
  { key: "suggested_deadline", label: "مهلت پیشنهادی" },
  { key: "domain", label: "حوزه" },
  { key: "creator_name", label: "ثبت‌کننده" },
  { key: "created_at", label: "تاریخ ثبت" },
  { key: "updated_at", label: "آخرین تغییر" },
];

export const MANAGER_TOPIC_TABLE_COLUMNS = [
  "topic_code", "title", "referral_badge", "status", "priority",
  "assignment_active", "assignment_total", "assignment_done", "assignment_cancelled",
  "suggested_deadline", "creator_name", "updated_at",
];

export const PROPOSER_STAT_FILTER_MAP = {
  submitted: { tabId: "active", statuses: ["Submitted"] },
  returned: { tabId: "active", statuses: ["UnderReview"] },
};

export const APPROVAL_STAT_FILTER_MAP = {
  total: { statuses: ["Submitted", "UnderReview", "Approved", "Assigned", "Draft"] },
  submitted: { statuses: ["Submitted"] },
  returned: { statuses: ["UnderReview"] },
  approved: { statuses: ["Approved", "Assigned"] },
  rejected: { statuses: ["Rejected", "Closed"] },
};

export function filterTopicsByStatuses(topics, statuses) {
  if (!statuses?.length) return topics || [];
  const set = new Set(statuses);
  return (topics || []).filter((t) => set.has(t.status));
}

export function filterTopicsByPriorities(topics, priorities) {
  if (!priorities?.length) return topics || [];
  const set = new Set(priorities);
  return (topics || []).filter((t) => set.has(t.priority));
}

export function applyProposerTopicFilters(topics, { tabId, statuses, priorities, archiveTopics }) {
  let list = filterTopicsByProposerTab(topics, tabId, archiveTopics);
  list = filterTopicsByStatuses(list, statuses);
  list = filterTopicsByPriorities(list, priorities);
  return list;
}

export function applyApprovalTopicFilters(topics, { statuses, priorities, includeInactive }) {
  let list = topics || [];
  if (!includeInactive) {
    list = list.filter((t) => !["Closed", "Rejected"].includes(t.status));
  }
  const statusFilter = statuses?.length ? statuses : APPROVAL_DEFAULT_STATUSES;
  list = filterTopicsByStatuses(list, statusFilter);
  list = filterTopicsByPriorities(list, priorities);
  return list;
}

export function getTopicTableSortValue(topic, field) {
  if (!topic) return null;
  switch (field) {
    case "status":
      return PROPOSER_TOPIC_SORT[topic.status] ?? 99;
    case "priority":
      return PRIORITY_SORT[topic.priority] ?? 99;
    case "suggested_deadline":
      return deadlineSortKey(topic);
    case "created_at": {
      if (!topic?.created_at) return 0;
      const t = new Date(topic.created_at).getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    case "updated_at": {
      if (!topic?.updated_at) return topicTimestamp(topic);
      const t = new Date(topic.updated_at).getTime();
      return Number.isNaN(t) ? topicTimestamp(topic) : t;
    }
    case "assignment_active":
      return getTopicAssignmentStats(topic).active;
    case "assignment_total":
      return getTopicAssignmentStats(topic).total;
    case "assignment_done":
      return getTopicAssignmentStats(topic).done;
    case "assignment_cancelled":
      return getTopicAssignmentStats(topic).cancelled;
    case "referral_badge":
      return isTopicNewForAssignment(topic) ? 0 : isTopicWithMissions(topic) ? 1 : 2;
    default:
      return topic[field] ?? "";
  }
}

export function sortTopicsTable(topics, sortField, direction) {
  if (!sortField) return sortProposerTopics(topics);
  const mult = direction === "asc" ? 1 : -1;
  return [...(topics || [])].sort((a, b) => {
    const aV = getTopicTableSortValue(a, sortField);
    const bV = getTopicTableSortValue(b, sortField);
    if (aV == null && bV == null) return 0;
    if (aV == null || aV === "") return 1;
    if (bV == null || bV === "") return -1;
    if (typeof aV === "number" && typeof bV === "number") return (aV - bV) * mult;
    const aS = String(aV);
    const bS = String(bV);
    if (aS < bS) return -1 * mult;
    if (aS > bS) return 1 * mult;
    return 0;
  });
}

export const MISSION_STATUS_META = {
  Assigned: { label: "ارجاع شده", color: "#38bdf8" },
  InProgress: { label: "در حال انجام", color: "#6366f1" },
  Submitted: { label: "ارسال شده", color: "#0ea5e9" },
  UnderReview: { label: "در بررسی", color: "#f59e0b" },
  NeedsRevision: { label: "نیازمند اصلاح", color: "#ef4444" },
  Revised: { label: "اصلاح شده", color: "#a855f7" },
  FinalApproved: { label: "تایید نهایی", color: "#22c55e" },
  Archived: { label: "بایگانی", color: "#64748b" },
  Cancelled: { label: "لغو شده", color: "#94a3b8" },
};

export const BRIEF_STATUS_META = {
  Submitted: { label: "ارسال شده", color: "#38bdf8" },
  ManagerApproved: { label: "در بانک تحلیل", color: "#10b981" },
  EditorApproved: { label: "تأیید انتشار", color: "#8b5cf6" },
  Published: { label: "منتشر شده", color: "#22c55e" },
  Acknowledged: { label: "دریافت شد (قدیمی)", color: "#0ea5e9" },
  Promoted: { label: "ارتقا یافته", color: "#22c55e" },
  Rejected: { label: "رد شده", color: "#ef4444" },
  Archived: { label: "بایگانی", color: "#94a3b8" },
};

export const BRIEF_ENTRY_MODE_META = {
  self: { label: "تحلیل خودم" },
  external: { label: "تحلیل دیگران" },
  topic_proposal: { label: "پیشنهاد موضوع" },
};

export const BRIEF_QUALITY_META = {
  promising: { label: "امیدوارکننده", color: "#22c55e" },
  useful: { label: "مفید", color: "#38bdf8" },
  archive: { label: "بایگانی", color: "#94a3b8" },
};

export function getDeadlineMeta(deadlineStr) {
  if (!deadlineStr) return { label: "بدون مهلت", color: "#64748b", urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadlineStr);
  dl.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dl - today) / 86400000);
  if (diff < 0) return { label: "مهلت گذشته", color: "#ef4444", urgent: true };
  if (diff === 0) return { label: "امروز", color: "#ef4444", urgent: true };
  if (diff <= 3) return { label: `${toPersianDigits(diff)} روز مانده`, color: "#f59e0b", urgent: true };
  return { label: formatPersianDateShort(deadlineStr), color: "#22c55e", urgent: false };
}

export function canEditTopic(topic, userId, isManagerOrApprover = false) {
  if (!topic) return false;
  if (isManagerOrApprover) return ["Draft", "Submitted", "UnderReview", "Rejected"].includes(topic.status);
  return topic.creator_id === userId && ["Draft", "Submitted", "UnderReview", "Rejected"].includes(topic.status);
}

export function canResubmitTopic(topic, userId) {
  if (!topic || topic.creator_id !== userId) return false;
  return ["Rejected", "UnderReview"].includes(topic.status);
}

export function getTopicArchiveMeta(topic, userId, isManagerOrApprover = false) {
  if (!topic) return { allowed: false };
  if (isManagerOrApprover) {
    const pending = getTopicPendingCount(topic);
    return { allowed: true, requiresCancel: pending > 0, activeCount: pending };
  }
  if (topic.creator_id !== userId) return { allowed: false };

  const { active, total, done } = getTopicAssignmentStats(topic);

  if (["Draft", "Rejected", "Submitted", "UnderReview"].includes(topic.status)) {
    return { allowed: true, requiresCancel: false };
  }
  if (topic.status === "Approved" && total === 0) {
    return { allowed: true, requiresCancel: false };
  }
  if (topic.status === "Assigned") {
    if (isTopicAssignmentsAllDone(topic)) {
      return { allowed: true, requiresCancel: false, completed: true };
    }
    const pending = getTopicPendingCount(topic);
    if (pending > 0) {
      return { allowed: true, requiresCancel: true, activeCount: pending };
    }
  }
  return { allowed: false };
}

export function canArchiveTopic(topic, userId, isManagerOrApprover = false) {
  return getTopicArchiveMeta(topic, userId, isManagerOrApprover).allowed;
}

/** Latest return/reject comment from history or list API fields. */
export function getLatestReviewComment(topic, history = []) {
  const hist = history?.length ? history : topic?.history || [];
  if (topic?.status === "UnderReview") {
    return hist.find((h) => h.new_status === "UnderReview")?.comment || topic?.last_return_comment || null;
  }
  if (topic?.status === "Rejected") {
    return hist.find((h) => h.new_status === "Rejected")?.comment || topic?.last_reject_comment || null;
  }
  return null;
}

export const EMPTY_TOPIC_FORM = {
  title: "", description: "", domain: "", keywords: "",
  priority: "medium", importance_reason: "", suggested_deadline: "",
};

export function validateSuggestedDeadline(value) {
  if (!value) return null;
  const gregorian = persianDateToGregorian(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gregorian)) {
    return ANALYSIS_TERMS.suggestedDeadlineInvalid;
  }
  const dl = new Date(`${gregorian}T12:00:00`);
  if (Number.isNaN(dl.getTime())) {
    return ANALYSIS_TERMS.suggestedDeadlineInvalid;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dl.setHours(0, 0, 0, 0);
  if (dl < today) {
    return ANALYSIS_TERMS.suggestedDeadlinePast;
  }
  return null;
}

export function validateTopicForm(form = {}) {
  const L = TOPIC_FIELD_LIMITS;
  if (!form.title?.trim()) return ANALYSIS_TERMS.axisRequired;
  if ((form.title || "").length > L.title) return ANALYSIS_TERMS.axisMaxLength(L.title);
  const descLen = plainTextLength(form.description);
  if (!descLen) return ANALYSIS_TERMS.descriptionRequired;
  if (descLen > L.description) return ANALYSIS_TERMS.descriptionMaxLength(L.description);
  if ((form.domain || "").length > L.domain) return `حوزه حداکثر ${L.domain} کاراکتر باشد`;
  if ((form.keywords || "").length > L.keywords) return `کلیدواژه‌ها حداکثر ${L.keywords} کاراکتر باشد`;
  if (plainTextLength(form.importance_reason) > L.importance_reason) {
    return `دلیل اهمیت حداکثر ${L.importance_reason} کاراکتر باشد`;
  }
  const deadlineErr = validateSuggestedDeadline(form.suggested_deadline);
  if (deadlineErr) return deadlineErr;
  return null;
}
