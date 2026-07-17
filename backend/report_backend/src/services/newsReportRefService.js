import pool from "../db.js";
import {
  computeReportRefFields,
  normalizeJalaliDate,
  reconcileSourceDateWithRelay,
  sourceJalaliToTimestamps,
  subtractJalaliDays,
} from "./newsTextUtils.js";

function refKeyToCompactDate(refKey) {
  return String(refKey || "").slice(0, 8);
}

function compactDatesForPeriod(fromRefKey, toRefKey) {
  const fromCompact = refKeyToCompactDate(fromRefKey);
  const toCompact = refKeyToCompactDate(toRefKey);
  if (!fromCompact || !toCompact) return [];
  const set = new Set([fromCompact, toCompact]);
  const fromJalali = normalizeJalaliDate(
    `${fromCompact.slice(0, 4)}-${fromCompact.slice(4, 6)}-${fromCompact.slice(6, 8)}`,
  );
  if (fromJalali) {
    const prev = subtractJalaliDays(fromJalali, 1);
    if (prev) set.add(prev.replace(/-/g, ""));
  }
  return [...set];
}

function normalizeStoredRef(row) {
  const storedDate = normalizeJalaliDate(row.report_ref_date_jalali);
  const storedHm = row.report_ref_time_hm
    ? String(row.report_ref_time_hm).replace(/\D/g, "").padStart(4, "0")
    : null;
  if (!storedDate || !storedHm) return null;
  return { ref_date: storedDate, ref_hm: storedHm, ref_key: `${storedDate.replace(/-/g, "")}${storedHm}` };
}

/** ref_key / تاریخ/ساعت مرجع گزارش — همیشه با ingest clamp محاسبه می‌شود */
export function resolveRowReportRef(row) {
  return computeReportRefFields(
    row.source_date_jalali,
    row.source_time_hm,
    row.relay_date_jalali,
    row.relay_time_hm,
    row.created_at,
  );
}

async function persistReportRef(row, ref_date, ref_hm) {
  const { sourceDate, sourceTime } = reconcileSourceDateWithRelay(
    row.source_date_jalali,
    row.source_time_hm,
    row.relay_date_jalali,
    row.relay_time_hm,
  );
  const prevDate = normalizeJalaliDate(row.source_date_jalali);
  const fixSource = sourceDate && prevDate !== sourceDate;
  const { source_ts_utc, source_ts_tehran } = sourceJalaliToTimestamps(
    fixSource ? sourceDate : ref_date,
    fixSource ? sourceTime : ref_hm,
  );

  await pool.query(
    `UPDATE tbl_news
     SET report_ref_date_jalali = $1,
         report_ref_time_hm = $2,
         source_date_jalali = CASE WHEN $3 THEN $4 ELSE source_date_jalali END,
         source_time_hm = CASE WHEN $3 THEN $5 ELSE source_time_hm END,
         source_ts_utc = $6,
         source_ts_tehran = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [ref_date, ref_hm, fixSource, sourceDate, sourceTime, source_ts_utc, source_ts_tehran, row.id],
  );
}

/**
 * پر کردن/اصلاح report_ref قبل از فیلتر بازه.
 * n8n گاهی source_time را از تلگرام (آینده نسبت به relay) می‌گذارد؛
 * report_ref قدیمی بدون ingest clamp باعث افتادن خبر در بازهٔ اشتباه می‌شود.
 */
export async function ensureReportRefForPeriod(fromRefKey, toRefKey) {
  const compactDates = compactDatesForPeriod(fromRefKey, toRefKey);
  if (!compactDates.length) return 0;

  const r = await pool.query(
    `SELECT id, source_date_jalali, source_time_hm, relay_date_jalali, relay_time_hm,
            report_ref_date_jalali, report_ref_time_hm, created_at
     FROM tbl_news
     WHERE COALESCE(is_deleted, false) = false
       AND (
         regexp_replace(COALESCE(source_date_jalali, ''), '[^0-9]', '', 'g') = ANY($1::text[])
         OR regexp_replace(COALESCE(relay_date_jalali, ''), '[^0-9]', '', 'g') = ANY($1::text[])
         OR regexp_replace(COALESCE(report_ref_date_jalali, ''), '[^0-9]', '', 'g') = ANY($1::text[])
       )
     LIMIT 3000`,
    [compactDates],
  );

  let updated = 0;
  for (const row of r.rows) {
    const { ref_date, ref_hm } = computeReportRefFields(
      row.source_date_jalali,
      row.source_time_hm,
      row.relay_date_jalali,
      row.relay_time_hm,
      row.created_at,
    );
    if (!ref_date || !ref_hm) continue;

    const stored = normalizeStoredRef(row);
    const needsUpdate = !stored || stored.ref_key !== `${ref_date.replace(/-/g, "")}${ref_hm}`;
    if (!needsUpdate) continue;

    await persistReportRef(row, ref_date, ref_hm);
    updated += 1;
  }

  return updated;
}
