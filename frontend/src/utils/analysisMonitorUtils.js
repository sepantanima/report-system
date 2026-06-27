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

export {
  TOPIC_FIELD_LIMITS,
  MISSION_FIELD_LIMITS,
  ANALYSIS_FIELD_LIMITS,
  stripHtml,
  plainTextLength,
} from "../constants/analysisFieldLimits.js";

export const TOPIC_STATUS_META = {
  Draft: { label: "پیش‌نویس", color: "#64748b" },
  Submitted: { label: "ثبت‌شده", color: "#38bdf8" },
  UnderReview: { label: "برگشت برای اصلاح", color: "#f59e0b" },
  Approved: { label: "تایید شده", color: "#22c55e" },
  Rejected: { label: "رد شده", color: "#ef4444" },
  Assigned: { label: "ارجاع شده", color: "#8b5cf6" },
  Closed: { label: "بسته", color: "#94a3b8" },
};

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

export function canArchiveTopic(topic, userId, isManagerOrApprover = false) {
  if (!topic) return false;
  if (isManagerOrApprover) return true;
  return topic.creator_id === userId && ["Draft", "Rejected", "Submitted"].includes(topic.status);
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

export function validateTopicForm(form = {}) {
  const L = TOPIC_FIELD_LIMITS;
  if (!form.title?.trim()) return "عنوان موضوع الزامی است";
  if ((form.title || "").length > L.title) return `عنوان حداکثر ${L.title} کاراکتر باشد`;
  if (!form.description?.trim()) return "شرح موضوع الزامی است";
  if ((form.description || "").length > L.description) return `شرح موضوع حداکثر ${L.description} کاراکتر باشد`;
  if ((form.domain || "").length > L.domain) return `حوزه حداکثر ${L.domain} کاراکتر باشد`;
  if ((form.keywords || "").length > L.keywords) return `کلیدواژه‌ها حداکثر ${L.keywords} کاراکتر باشد`;
  if ((form.importance_reason || "").length > L.importance_reason) return `دلیل اهمیت حداکثر ${L.importance_reason} کاراکتر باشد`;
  if (form.suggested_deadline) {
    const dl = new Date(String(form.suggested_deadline).slice(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dl.setHours(0, 0, 0, 0);
    if (Number.isNaN(dl.getTime())) return "تاریخ مهلت نامعتبر است";
    if (dl < today) return "مهلت پیشنهادی نمی‌تواند قبل از امروز باشد";
  }
  return null;
}
