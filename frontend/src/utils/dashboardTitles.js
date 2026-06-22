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

  if (filters.status) labels.push(`وضعیت: ${pick(meta?.statusOptions, filters.status) || filters.status}`);
  if (filters.priority) labels.push(`اولویت: ${pick(meta?.priorityOptions, filters.priority) || filters.priority}`);
  if (filters.quality) labels.push(`کیفیت: ${pick(meta?.qualityOptions, filters.quality) || filters.quality}`);
  if (filters.unit_cd) {
    const u = (meta?.units || []).find((x) => String(x.unit_cd) === String(filters.unit_cd));
    labels.push(`واحد: ${u?.unit_name || filters.unit_cd}`);
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
  targetTopic, targetPriority, targetStatus, targetQuality,
  targetClassification, targetProvince, targetUnitCd, units,
}) {
  const labels = [];
  if (targetTopic) labels.push(`موضوع: ${targetTopic}`);
  if (targetProvince) labels.push(`استان: ${targetProvince}`);
  if (targetUnitCd) {
    const u = (units || []).find((x) => (x?.UnitCode || x?.id) == targetUnitCd);
    labels.push(`واحد: ${u?.UnitShortName || u?.name || targetUnitCd}`);
  }
  if (targetStatus === "pending") labels.push("وضعیت: بررسی نشده");
  else if (targetStatus === "verified") labels.push("وضعیت: تأیید شده");
  else if (targetStatus === "rejected") labels.push("وضعیت: برگشت خورده");
  if (targetPriority === "5") labels.push("اولویت: فوری");
  else if (targetPriority === "3") labels.push("اولویت: مهم");
  else if (targetPriority === "1") labels.push("اولویت: عادی");
  if (targetQuality) labels.push(`کیفیت: ${targetQuality} ستاره`);
  if (targetClassification === "1") labels.push("دامنه: عمومی");
  else if (targetClassification === "2") labels.push("دامنه: استانی");
  else if (targetClassification === "3") labels.push("دامنه: واحد");
  else if (targetClassification === "4") labels.push("دامنه: خاص");
  return labels;
}
