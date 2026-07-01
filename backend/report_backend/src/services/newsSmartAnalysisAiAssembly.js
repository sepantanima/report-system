import crypto from "crypto";
import { stripHtml } from "./newsTextUtils.js";
import { resolveReportPeriod, periodToQueryFilters } from "./newsReportPeriod.js";
import { fetchNewsReportRows, fetchNewsByIds } from "./newsReportQuery.js";
import pool from "../db.js";
import { analysisTypeLabelFa } from "../constants/newsSmartAnalysisMeta.js";

const MAX_NEWS_ITEMS = 150;
const MAX_DIGEST_CHARS = 80000;
const SNIPPET_LEN = 600;

function toFaDigits(val) {
  return String(val ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function faJalali(ymd) {
  if (!ymd) return "—";
  return toFaDigits(String(ymd).replace(/-/g, "/"));
}

function buildNewsLine(row, index) {
  const date = row.source_date_jalali || row.ref_date || "";
  const time = row.source_time_hm || row.ref_hm || "";
  const source = row.source || "—";
  const text = stripHtml(row.cleaned_text || row.raw_text || row.summary || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SNIPPET_LEN);
  return `${index}) ${faJalali(date)} ${time} | ${source}\n${text}`;
}

export function buildNewsDigest(rows) {
  const lines = [];
  let totalChars = 0;
  const capped = rows.slice(0, MAX_NEWS_ITEMS);
  for (let i = 0; i < capped.length; i += 1) {
    const line = buildNewsLine(capped[i], i + 1);
    if (totalChars + line.length > MAX_DIGEST_CHARS) {
      lines.push(`… (${toFaDigits(rows.length - i)} خبر دیگر حذف شد به‌دلیل محدودیت حجم)`);
      break;
    }
    lines.push(line);
    totalChars += line.length + 1;
  }
  if (!lines.length) return "(خبری در این بازه یافت نشد)";
  if (rows.length > capped.length) {
    lines.push(`… (${toFaDigits(rows.length - capped.length)} خبر دیگر نمایش داده نشد)`);
  }
  return lines.join("\n\n");
}

function buildFilterSummary(filters = {}) {
  const parts = [];
  if (filters.keyword) parts.push(`کلیدواژه: ${filters.keyword}`);
  const statuses = filters.statuses || (filters.status ? [filters.status] : []);
  if (statuses.length) parts.push(`وضعیت: ${statuses.join("، ")}`);
  const sources = filters.source || filters.sources || [];
  if (sources.length) parts.push(`منابع: ${sources.join("، ")}`);
  const cats = filters.category || filters.categories || [];
  if (cats.length) parts.push(`دسته‌ها: ${cats.length} مورد`);
  const imp = filters.importance || [];
  if (imp.length) parts.push(`اولویت: ${imp.join("، ")}`);
  const qual = filters.quality || [];
  if (qual.length) parts.push(`کیفیت: ${qual.join("، ")}`);
  const units = filters.units || (filters.unit != null ? [filters.unit] : []);
  if (units.length) parts.push(`واحد: ${units.join("، ")}`);
  return parts.length ? parts.join(" | ") : "بدون فیلتر اضافی";
}

export function computeQuerySignature(queryPayload = {}) {
  const raw = JSON.stringify(queryPayload);
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function loadPackForAssembly(packId) {
  const r = await pool.query(
    `SELECT * FROM tbl_news_smart_analysis_packs WHERE id = $1`,
    [packId],
  );
  return r.rows[0] || null;
}

/**
 * @param {Record<string, unknown>} formData
 * @param {{ userId?: number|null, role?: string|string[] }} [scope]
 */
export async function resolveNewsSmartAnalysisAssembly(formData, scope = {}) {
  const packId = formData?.pack_id != null ? parseInt(formData.pack_id, 10) : null;

  if (Number.isFinite(packId)) {
    const packRow = await loadPackForAssembly(packId);
    if (!packRow) throw new Error("پک تحلیل یافت نشد");

    const ids = Array.isArray(packRow.news_ids)
      ? packRow.news_ids.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n))
      : [];
    if (!ids.length) throw new Error("پک فاقد اخبار فریزشده است");

    const rows = await fetchNewsByIds(ids, scope);
    const digest = buildNewsDigest(rows);
    const queryPayload = packRow.query_payload || {};
    const period = {
      from_date: packRow.period_from,
      to_date: packRow.period_to,
      report_date: packRow.period_from,
    };
    const filters = queryPayload.filters || {};

    const vars = {
      PERIOD_START: faJalali(packRow.period_from),
      PERIOD_END: faJalali(packRow.period_to || packRow.period_from),
      NEWS_COUNT: String(rows.length),
      FILTER_SUMMARY: buildFilterSummary(filters),
      NEWS_DIGEST: digest,
    };

    return {
      rows,
      digest,
      period,
      periodFrom: packRow.period_from || "",
      periodTo: packRow.period_to || packRow.period_from || "",
      filters,
      selectedIds: packRow.selection_mode === "subset" ? ids : [],
      newsCount: rows.length,
      vars,
      filterSignature: packRow.filter_signature,
      packId,
    };
  }

  const queryPayload = formData?.query_payload || formData?.queryPayload || {};
  if (!queryPayload || typeof queryPayload !== "object") {
    throw new Error("query_payload الزامی است");
  }

  const period = resolveReportPeriod(queryPayload);
  const periodFilters = periodToQueryFilters(period);
  const filters = { ...(queryPayload.filters || {}) };
  const selectedIds = Array.isArray(formData?.selected_ids)
    ? formData.selected_ids.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n))
    : [];

  let rows;
  if (selectedIds.length) {
    rows = await fetchNewsByIds(selectedIds, scope);
  } else {
    rows = await fetchNewsReportRows(periodFilters, filters, scope, { limit: MAX_NEWS_ITEMS });
  }

  const digest = buildNewsDigest(rows);
  const periodFrom = period.from_date || period.report_date || "";
  const periodTo = period.to_date || period.report_date || periodFrom;

  const vars = {
    PERIOD_START: faJalali(periodFrom),
    PERIOD_END: faJalali(periodTo),
    NEWS_COUNT: String(rows.length),
    FILTER_SUMMARY: buildFilterSummary(filters),
    NEWS_DIGEST: digest,
  };

  return {
    rows,
    digest,
    period,
    periodFrom,
    periodTo,
    filters,
    selectedIds,
    newsCount: rows.length,
    vars,
    filterSignature: computeQuerySignature(queryPayload),
  };
}

export function buildAutoAnalysisTitle(analysisType, assembly) {
  const typeFa = analysisTypeLabelFa(analysisType);
  const from = faJalali(assembly.periodFrom);
  const to = faJalali(assembly.periodTo);
  const count = toFaDigits(assembly.newsCount);
  const range = from === to ? from : `از ${from} تا ${to}`;
  return `${typeFa} — ${range} (${count} خبر)`;
}
