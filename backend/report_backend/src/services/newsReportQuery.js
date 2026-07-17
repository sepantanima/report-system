import pool from "../db.js";
import { mergeReportWorkflowFilterDefaults } from "../constants/newsReportDefaults.js";
import { stripHtml } from "./newsTextUtils.js";
import { resolveRowReportRef } from "./newsReportRefService.js";
import { NEWS_REF_KEY_CTE } from "./newsMonitorService.js";
import { buildAnalyticsWhere } from "./newsAnalyticsService.js";
import { sqlNewsDuplicateStatus, sqlNewsReviewState, sqlNewsWorkflow, sqlNewsPublishStatus } from "./newsDbEnums.js";
import { statusLabel } from "./newsReportFormat.js";

const WS = sqlNewsWorkflow();
const RS = sqlNewsReviewState();
const DS = sqlNewsDuplicateStatus();
const PS = sqlNewsPublishStatus();

const MAX_ROWS = 2000;
const DEFAULT_PAGE_SIZE = 20;

const SORT_COLUMNS = {
  ref_date: "bk.ref_date",
  ref_hm: "bk.ref_hm",
  ref_key: "bk.ref_key",
  source: "bk.source",
  id: "bk.id",
};

function normalizeIntArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
}

function normalizeStringArray(v) {
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  }
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

export function mergeReportWorkflowFilters(filters = {}, workflowDefaults = null) {
  const merged = mergeDefaultFilters(filters);
  const defs = mergeReportWorkflowFilterDefaults(workflowDefaults);

  if (merged.duplicate == null && defs.duplicate) merged.duplicate = defs.duplicate;
  if (merged.is_deleted == null && defs.is_deleted != null) merged.is_deleted = defs.is_deleted;

  const hasStatuses = Boolean(merged.status) || (Array.isArray(merged.statuses) && merged.statuses.length);
  if (!hasStatuses && defs.statuses?.length) merged.statuses = [...defs.statuses];

  const importance = normalizeIntArray(merged.importance ?? merged.priorities);
  if (importance.length) {
    merged.importance = importance;
    delete merged.priorities;
  } else if (defs.priorities?.length) {
    merged.importance = [...defs.priorities];
  }

  const quality = normalizeIntArray(merged.quality ?? merged.qualities ?? merged.priority);
  if (!quality.length && defs.qualities?.length) merged.quality = [...defs.qualities];

  return merged;
}

export function mergeDefaultFilters(filters = {}) {
  const merged = { ...filters };
  if (merged.status === "" || merged.status === "all") delete merged.status;
  if (!merged.duplicate) merged.duplicate = "exclude";
  return merged;
}

export function apiFiltersToQuery(filters = {}) {
  const f = mergeDefaultFilters(filters);
  const q = {
    duplicate: f.duplicate || "exclude",
  };
  const importance = normalizeIntArray(f.importance);
  if (importance.length === 1) q.priority = importance[0];
  const quality = normalizeIntArray(f.quality ?? f.priority);
  if (quality.length === 1) q.quality = quality[0];
  const sources = normalizeStringArray(f.source ?? f.sources);
  if (sources.length) q.sources = sources.join(",");
  const categories = normalizeIntArray(f.category ?? f.categories);
  if (categories.length) q.categories = categories.join(",");
  const status = normalizeStringArray(f.status ?? f.statuses);
  if (status.length === 1) q.status = status[0];
  const units = normalizeIntArray(f.units ?? (f.unit != null ? [f.unit] : []));
  if (units.length === 1) q.unit_cd = units[0];
  if (f.user_id != null) q.user_id = f.user_id;
  if (f.keyword && String(f.keyword).trim()) q.q = String(f.keyword).trim();
  return q;
}

function extendWhereForArrays(base, filters = {}) {
  let { where, params, joins } = base;
  const importance = normalizeIntArray(filters.importance);
  if (importance.length > 1) {
    params.push(importance);
    where += ` AND bk.priority = ANY($${params.length}::int[])`;
  }
  const quality = normalizeIntArray(filters.quality ?? filters.priority);
  if (quality.length > 1) {
    params.push(quality);
    where += ` AND bk.quality = ANY($${params.length}::int[])`;
  }
  const sources = normalizeStringArray(filters.source ?? filters.sources);
  if (sources.length > 1) {
    params.push(sources);
    where += ` AND bk.source = ANY($${params.length}::text[])`;
  }
  const categories = normalizeIntArray(filters.category ?? filters.categories);
  if (categories.length > 1) {
    params.push(categories);
    where += ` AND EXISTS (
      SELECT 1 FROM tbl_news_category_links cl
      WHERE cl.news_id = bk.id AND cl.category_id = ANY($${params.length}::int[])
    )`;
  }
  const statuses = normalizeStringArray(filters.status ?? filters.statuses);
  if (statuses.length > 1) {
    const parts = statuses.map((s) => {
      if (s === "published") {
        return `${WS} = 'finalized' AND COALESCE(bk.is_approved, 0) = 1 AND ${PS} = 'ready' AND ${DS} = 'none'`;
      }
      if (s === "banked") {
        return `${WS} = 'finalized' AND COALESCE(bk.is_approved, 0) = 1 AND ${PS} = 'banked' AND ${DS} = 'none'`;
      }
      if (s === "approved") return `${RS} = 'approved'`;
      if (s === "rejected") return `${RS} = 'rejected'`;
      return null;
    }).filter(Boolean);
    if (parts.length) where += ` AND (${parts.join(" OR ")})`;
  }
  const units = normalizeIntArray(filters.units ?? (filters.unit != null ? [filters.unit] : []));
  if (units.length > 1) {
    params.push(units);
    where += ` AND obs.unit_cd = ANY($${params.length}::int[])`;
  }
  const keyword = filters.keyword && String(filters.keyword).trim();
  if (keyword) {
    params.push(`%${keyword}%`);
    where += ` AND (
      bk.cleaned_text ILIKE $${params.length}
      OR bk.raw_text ILIKE $${params.length}
      OR bk.source ILIKE $${params.length}
      OR bk.summary ILIKE $${params.length}
    )`;
  }
  if (filters.selected_ids?.length) {
    const ids = normalizeIntArray(filters.selected_ids);
    if (ids.length) {
      params.push(ids);
      where += ` AND bk.id = ANY($${params.length}::int[])`;
    }
  }
  if (filters.is_deleted === true) {
    // base_key CTE excludes deleted rows; explicit include requires direct tbl_news access (not supported in v1)
  } else if (filters.is_deleted === false) {
    where += ` AND COALESCE(bk.is_deleted, false) = false`;
  }
  return { where, params, joins };
}

function buildBaseQuery(periodFilters, apiFilters, scope) {
  const merged = { ...periodFilters, ...apiFiltersToQuery(apiFilters) };
  const base = buildAnalyticsWhere(merged, scope);
  return extendWhereForArrays(base, apiFilters);
}

async function attachCategories(rows) {
  const ids = rows.map((row) => row.id);
  const catMap = new Map();
  if (ids.length) {
    const cats = await pool.query(
      `SELECT cl.news_id, c.title_fa
       FROM tbl_news_category_links cl
       JOIN tbl_news_categories c ON c.id = cl.category_id
       WHERE cl.news_id = ANY($1::int[])
       ORDER BY c.sort_order`,
      [ids],
    );
    for (const c of cats.rows) {
      if (!catMap.has(c.news_id)) catMap.set(c.news_id, []);
      catMap.get(c.news_id).push(c.title_fa);
    }
  }
  return rows.map((row, i) => {
    const ref = resolveRowReportRef(row);
    return {
      ...row,
      ref_date: ref.ref_date || row.ref_date,
      ref_hm: ref.ref_hm || row.ref_hm,
      ref_key: ref.ref_key || row.ref_key,
      row_num: i + 1,
      categories: catMap.get(row.id) || [],
      status_label: statusLabel(row),
      short_text: stripHtml(row.cleaned_text || row.raw_text || row.summary || "").slice(0, 120),
    };
  });
}

const SELECT_COLS = `
  bk.id, bk.ref_date, bk.ref_hm, bk.ref_key, bk.source, bk.sender,
  bk.priority, bk.quality, bk.review_state, bk.workflow_status, bk.publish_status,
  bk.summary, bk.cleaned_text, bk.raw_text, bk.source_date_jalali, bk.source_time_hm,
  bk.relay_date_jalali, bk.relay_time_hm, bk.report_ref_date_jalali, bk.report_ref_time_hm,
  bk.created_at,
  obs.name AS observer_name, un."UnitShortName" AS unit_name
`;

function resolveOrder(sort = {}) {
  const key = SORT_COLUMNS[sort.key] ? sort.key : "ref_key";
  const dir = String(sort.direction || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${SORT_COLUMNS[key]} ${dir}, bk.id DESC`;
}

export async function fetchNewsReportRows(periodFilters, apiFilters = {}, scope = {}, options = {}) {
  const { where, params, joins } = buildBaseQuery(periodFilters, apiFilters, scope);
  const limit = options.limit ?? MAX_ROWS;
  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT ${SELECT_COLS}
    FROM base_key bk
    ${joins}
    LEFT JOIN tbl_units un ON un."UnitCode" = obs.unit_cd
    ${where}
    ${resolveOrder(options.sort)}
    LIMIT ${limit}
  `;
  const r = await pool.query(sql, params);
  return attachCategories(r.rows);
}

export async function fetchNewsReportRowsPaginated(periodFilters, apiFilters = {}, scope = {}, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.page_size, 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const { where, params, joins } = buildBaseQuery(periodFilters, apiFilters, scope);

  const countSql = `
    ${NEWS_REF_KEY_CTE}
    SELECT COUNT(*)::int AS n FROM base_key bk ${joins} ${where}
  `;
  const countR = await pool.query(countSql, params);
  const total = countR.rows[0]?.n ?? 0;

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT ${SELECT_COLS}
    FROM base_key bk
    ${joins}
    LEFT JOIN tbl_units un ON un."UnitCode" = obs.unit_cd
    ${where}
    ${resolveOrder(options.sort)}
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const r = await pool.query(sql, params);
  const rows = await attachCategories(r.rows.map((row, i) => ({ ...row, row_num: offset + i + 1 })));
  return { rows, total, page, page_size: pageSize };
}

export async function countNewsReportRows(periodFilters, apiFilters = {}, scope = {}) {
  const { where, params, joins } = buildBaseQuery(periodFilters, apiFilters, scope);
  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT COUNT(*)::int AS n
    FROM base_key bk
    ${joins}
    ${where}
  `;
  const r = await pool.query(sql, params);
  return r.rows[0]?.n ?? 0;
}

export async function fetchNewsByIds(ids, scope = {}) {
  const normalized = normalizeIntArray(ids);
  if (!normalized.length) return [];
  const params = [normalized];
  let where = ` WHERE bk.id = ANY($1::int[])`;
  const joins = ` LEFT JOIN tbl_users obs ON obs.id = bk.observer_id `;
  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT ${SELECT_COLS}
    FROM base_key bk
    ${joins}
    LEFT JOIN tbl_units un ON un."UnitCode" = obs.unit_cd
    ${where}
    ORDER BY bk.ref_key DESC, bk.id DESC
  `;
  const r = await pool.query(sql, params);
  return attachCategories(r.rows);
}
