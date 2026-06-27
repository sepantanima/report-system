import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { cleanDateString } from "./analysisMonitorUtils.js";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const toFa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

/** MMDD از تاریخ شمسی YYYY-MM-DD — مثلاً 0223 */
export function jalaliYmdToMd(ymd) {
  const parts = cleanDateString(String(ymd || "")).split("-");
  if (parts.length < 3) return "";
  const m = String(parseInt(parts[1], 10)).padStart(2, "0");
  const d = String(parseInt(parts[2], 10)).padStart(2, "0");
  return `${m}${d}`;
}

/** بازه فشرده MMDD-MMDD — مثلاً 0223-0231 */
export function formatJalaliRangeSlugMd(startYmd, endYmd) {
  const start = jalaliYmdToMd(startYmd);
  if (!start) return "";
  const end = endYmd ? jalaliYmdToMd(endYmd) : start;
  return end && end !== start ? `${start}-${end}` : start;
}

export function formatJalaliRangeLabel(startYmd, endYmd) {
  const fmt = (ymd) => {
    const parts = cleanDateString(String(ymd || "")).split("-");
    if (parts.length < 3) return ymd || "";
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const monthName = JALALI_MONTHS[m - 1] || "";
    return `${toFa(d)} ${monthName} ${toFa(y)}`;
  };
  const s = fmt(startYmd);
  const e = endYmd && endYmd !== startYmd ? fmt(endYmd) : null;
  return e ? `${s} تا ${e}` : s;
}

export function formatPersianDateObjectsRangeLabel(dateObjects) {
  if (!dateObjects?.[0]) return "";
  const start = cleanDateString(new DateObject(dateObjects[0]).format("YYYY-MM-DD"));
  const end = dateObjects[1]
    ? cleanDateString(new DateObject(dateObjects[1]).format("YYYY-MM-DD"))
    : start;
  return formatJalaliRangeLabel(start, end);
}

export function buildChartTitle(baseTitle, dateLabel, filterLabels = []) {
  const parts = [baseTitle];
  if (dateLabel) parts.push(dateLabel);
  const filters = filterLabels.filter(Boolean);
  if (filters.length) parts.push(filters.join(" · "));
  return parts.join(" — ");
}

export function buildNewsFilterLabels(filters, meta) {
  const labels = [];
  const pick = (opts, val) => (opts || []).find((o) => String(o.value) === String(val))?.label;

  const statusList = filters.statuses?.length
    ? filters.statuses
    : (filters.status ? [filters.status] : []);
  if (statusList.length) {
    const names = statusList.map((v) => pick(meta?.statusOptions, v) || v);
    labels.push(`وضعیت: ${names.join("، ")}`);
  }
  const priorities = filters.priorities?.length
    ? filters.priorities
    : (filters.priority ? [filters.priority] : []);
  if (priorities.length) {
    const names = priorities.map((v) => pick(meta?.priorityOptions, v) || v);
    labels.push(`اولویت: ${names.join("، ")}`);
  }
  const qualities = filters.qualities?.length
    ? filters.qualities
    : (filters.quality ? [filters.quality] : []);
  if (qualities.length) {
    const names = qualities.map((v) => pick(meta?.qualityOptions, v) || v);
    labels.push(`کیفیت: ${names.join("، ")}`);
  }
  const unitList = filters.units?.length
    ? filters.units
    : (filters.unit_cd ? [filters.unit_cd] : []);
  if (unitList.length) {
    const names = unitList.map((id) => {
      const u = (meta?.units || []).find((x) => String(x.unit_cd) === String(id));
      return u?.unit_name || id;
    });
    labels.push(`واحد: ${names.join("، ")}`);
  }
  if (filters.categories?.length) {
    const names = filters.categories.map((id) => {
      const c = (meta?.categories || []).find((x) => String(x.id) === String(id));
      return c?.title_fa || id;
    });
    labels.push(`دسته: ${names.join("، ")}`);
  }
  if (filters.sources?.length) labels.push(`منبع: ${filters.sources.join("، ")}`);
  if (filters.user_id) {
    const allUsers = [
      ...(meta?.usersByRole?.monitor || []),
      ...(meta?.usersByRole?.editor || []),
      ...(meta?.usersByRole?.chief || []),
    ];
    const u = allUsers.find((x) => String(x.id) === String(filters.user_id));
    labels.push(`کاربر: ${u?.name || u?.username || filters.user_id}`);
  }
  return labels;
}

export function buildFieldFilterLabels({
  targetTopics = [],
  targetTopic,
  targetPriorities = [],
  targetPriority,
  targetStatuses = [],
  targetStatus,
  targetQualities = [],
  targetQuality,
  targetClassifications = [],
  targetClassification,
  targetProvinces = [],
  targetProvince,
  targetUnitCds = [],
  targetUnitCd,
  units,
}) {
  const labels = [];
  const topics = targetTopics?.length ? targetTopics : (targetTopic ? [targetTopic] : []);
  if (topics.length) labels.push(`موضوع: ${topics.join("، ")}`);

  const provinces = targetProvinces?.length ? targetProvinces : (targetProvince ? [targetProvince] : []);
  if (provinces.length) labels.push(`استان: ${provinces.join("، ")}`);

  const unitCds = targetUnitCds?.length ? targetUnitCds : (targetUnitCd ? [targetUnitCd] : []);
  if (unitCds.length) {
    const names = unitCds.map((cd) => {
      const u = (units || []).find((x) => (x?.UnitCode || x?.id) == cd);
      return u?.UnitShortName || u?.name || cd;
    });
    labels.push(`واحد: ${names.join("، ")}`);
  }

  const statuses = targetStatuses?.length ? targetStatuses : (targetStatus ? [targetStatus] : []);
  if (statuses.length) {
    const map = { pending: "بررسی نشده", verified: "تأیید شده", rejected: "برگشت خورده" };
    labels.push(`وضعیت: ${statuses.map((s) => map[s] || s).join("، ")}`);
  }

  const priorities = targetPriorities?.length ? targetPriorities : (targetPriority ? [targetPriority] : []);
  if (priorities.length) {
    const map = { 5: "فوری", 3: "مهم", 1: "عادی", "5": "فوری", "3": "مهم", "1": "عادی" };
    labels.push(`اولویت: ${priorities.map((p) => map[p] || p).join("، ")}`);
  }

  const qualities = targetQualities?.length ? targetQualities : (targetQuality ? [targetQuality] : []);
  if (qualities.length) labels.push(`کیفیت: ${qualities.map((q) => `${q} ستاره`).join("، ")}`);

  const classifications = targetClassifications?.length
    ? targetClassifications
    : (targetClassification ? [targetClassification] : []);
  if (classifications.length) {
    const map = { 1: "عمومی", 2: "استانی", 3: "واحد", 4: "خاص", "1": "عمومی", "2": "استانی", "3": "واحد", "4": "خاص" };
    labels.push(`دامنه: ${classifications.map((c) => map[c] || c).join("، ")}`);
  }

  return labels;
}
