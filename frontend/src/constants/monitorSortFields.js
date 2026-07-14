import { jalaliDateTimeKey } from "../utils/listSort.js";

export const NEWS_MONITOR_SORT_STORAGE_KEY = "news-monitor-sort";
export const FIELD_MONITOR_SORT_STORAGE_KEY = "field-monitor-sort";

export const NEWS_MONITOR_SORT_FIELDS = [
  { key: "date", label: "تاریخ" },
  { key: "id", label: "شناسه" },
  { key: "source", label: "منبع" },
  { key: "sender", label: "فرستنده" },
  { key: "priority", label: "اولویت" },
  { key: "quality", label: "کیفیت" },
  { key: "workflow_status", label: "گردش کار" },
  { key: "review_state", label: "نتیجه بررسی" },
  { key: "duplicate_status", label: "وضعیت تکراری" },
];

export const FIELD_MONITOR_SORT_FIELDS = [
  { key: "date", label: "تاریخ" },
  { key: "title", label: "عنوان" },
  { key: "chat_title", label: "موضوع" },
  { key: "UnitShortName", label: "واحد" },
  { key: "sender_name", label: "فرستنده" },
  { key: "StateName", label: "استان" },
  { key: "priority", label: "اولویت" },
  { key: "quality", label: "کیفیت" },
  { key: "state", label: "وضعیت" },
  { key: "classification", label: "دامنه انتشار" },
];

export function newsSortValue(item, field) {
  switch (field) {
    case "date":
      return jalaliDateTimeKey(
        item.ref_date || item.source_date_jalali,
        item.ref_hm || item.source_time_hm,
      );
    case "id":
      return Number(item.id) || 0;
    case "priority":
    case "quality":
      return Number(item[field]) || 0;
    default:
      return item[field] ?? "";
  }
}

export function fieldReportSortValue(item, field) {
  switch (field) {
    case "date":
      return jalaliDateTimeKey(item.date, item.time);
    case "priority":
    case "quality":
    case "classification":
      return Number(item[field]) || 0;
    default:
      return item[field] ?? "";
  }
}

export const NEWS_DUPLICATES_SORT_STORAGE_KEY = "news-duplicates-sort";

export const NEWS_DUPLICATES_SORT_FIELDS = [
  { key: "date", label: "تاریخ" },
  { key: "id", label: "شناسه" },
  { key: "updated_at", label: "آخرین تغییر" },
  { key: "priority", label: "اهمیت" },
  { key: "review_state", label: "حکم" },
  { key: "workflow_status", label: "گردش کار" },
  { key: "source", label: "منبع" },
];

export function newsDuplicatesSortValue(item, field) {
  switch (field) {
    case "date":
      return jalaliDateTimeKey(
        item.ref_date || item.source_date_jalali,
        item.ref_hm || item.source_time_hm,
      );
    case "id":
    case "priority":
    case "quality":
      return Number(item[field]) || 0;
    case "updated_at":
      return item.updated_at ? new Date(item.updated_at).getTime() : 0;
    default:
      return item[field] ?? "";
  }
}
