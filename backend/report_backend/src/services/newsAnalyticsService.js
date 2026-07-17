import crypto from "crypto";
import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  NEWS_REF_KEY_CTE,
  jalaliDateToRefKeyStart,
  jalaliDateToRefKeyEnd,
} from "./newsMonitorService.js";
import {
  computeMonitorScore,
  computeEditorScore,
  computeChiefScore,
  speedBonusFromHours,
  PRIORITY_LABELS,
  QUALITY_LABELS,
  STATUS_LABELS,
} from "../constants/newsAnalyticsScoring.js";
import { sqlNewsDuplicateStatus, sqlNewsReviewState, sqlNewsWorkflow, sqlNewsPublishStatus } from "./newsDbEnums.js";
import {
  buildSenderResolveJoinsForAnalytics,
  RESOLVED_USER_ID_SQL,
  SENDER_RESOLVE_JOINS,
  NEWS_SENDER_SOURCE_MARKER_NOT_EXISTS_SQL,
} from "../utils/senderResolveSql.js";

const WS = sqlNewsWorkflow();
const RS = sqlNewsReviewState();
const DS = sqlNewsDuplicateStatus();
const PS = sqlNewsPublishStatus();

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ROWS = 500;
const cache = new Map();

function normalizeStringArray(v) {
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normalizeIntArray(v) {
  return normalizeStringArray(v).map((x) => parseInt(x, 10)).filter(Number.isFinite);
}

export function resolveAnalyticsScope(user = {}) {
  const roles = parseUserRoles(user.role);
  const userId = user.id ?? user.userId ?? null;
  if (roles.includes("admin")) return { level: "admin", userId, roles };
  if (roles.includes("news_chief")) return { level: "chief", userId, roles };
  if (roles.includes("news_editor")) return { level: "editor", userId, roles };
  if (roles.includes("news_monitor")) return { level: "monitor", userId, roles };
  return { level: "none", userId, roles };
}

function statusSql(status) {
  const s = String(status || "").trim();
  switch (s) {
    case "registered":
      return `${WS} = 'new'`;
    case "in_review":
      return `${WS} IN ('pending', 'reviewed') AND ${RS} = 'pending'`;
    case "approved":
      return `${RS} = 'approved'`;
    case "rejected":
      return `${RS} = 'rejected'`;
    case "published":
      return `${WS} = 'finalized' AND COALESCE(bk.is_approved, 0) = 1 AND ${PS} = 'ready' AND ${DS} = 'none'`;
    case "banked":
      return `${WS} = 'finalized' AND COALESCE(bk.is_approved, 0) = 1 AND ${PS} = 'banked' AND ${DS} = 'none'`;
    default:
      return null;
  }
}

export function buildAnalyticsWhere(filters = {}, scope = {}) {
  const params = [];
  let where = ` WHERE 1=1`;
  const joins = buildSenderResolveJoinsForAnalytics();

  const fromKey = filters.from_ref_key || jalaliDateToRefKeyStart(filters.start_date);
  const toKey = filters.to_ref_key || jalaliDateToRefKeyEnd(filters.end_date);
  if (fromKey) {
    params.push(fromKey);
    where += ` AND bk.ref_key >= $${params.length}`;
  }
  if (toKey) {
    params.push(toKey);
    where += ` AND bk.ref_key <= $${params.length}`;
  }

  const duplicateMode = String(filters.duplicate || "exclude").toLowerCase();
  if (duplicateMode === "exclude") {
    where += ` AND ${DS} = 'none'`;
  } else if (duplicateMode === "only") {
    where += ` AND ${DS} <> 'none'`;
  }

  const statusCond = statusSql(filters.status);
  if (statusCond) where += ` AND (${statusCond})`;

  const priority = parseInt(filters.priority, 10);
  if (priority >= 1 && priority <= 4) {
    params.push(priority);
    where += ` AND bk.priority = $${params.length}`;
  }

  const quality = parseInt(filters.quality, 10);
  if (quality >= 1 && quality <= 5) {
    params.push(quality);
    where += ` AND bk.quality = $${params.length}`;
  }

  const sources = normalizeStringArray(filters.sources);
  if (sources.length) {
    params.push(sources);
    where += ` AND bk.source = ANY($${params.length}::text[])`;
  }

  const categoryIds = normalizeIntArray(filters.categories);
  if (categoryIds.length) {
    params.push(categoryIds);
    where += ` AND EXISTS (
      SELECT 1 FROM tbl_news_category_links cl
      WHERE cl.news_id = bk.id AND cl.category_id = ANY($${params.length}::int[])
    )`;
  }

  const unitCd = filters.unit_cd ?? filters.unit;
  if (unitCd != null && String(unitCd).trim() !== "") {
    params.push(parseInt(unitCd, 10));
    where += ` AND obs.unit_cd = $${params.length}`;
  }

  const userId = parseInt(filters.user_id, 10);
  if (Number.isFinite(userId)) {
    if (scope.level === "monitor" || scope.level === "editor") {
      if (scope.userId && userId !== scope.userId && scope.level !== "admin" && scope.level !== "chief") {
        params.push(scope.userId);
        where += ` AND ${RESOLVED_USER_ID_SQL} = $${params.length}`;
      } else {
        params.push(userId);
        where += ` AND ${RESOLVED_USER_ID_SQL} = $${params.length}`;
      }
    } else {
      params.push(userId);
      where += ` AND ${RESOLVED_USER_ID_SQL} = $${params.length}`;
    }
  }

  return { where, params, joins };
}

function cacheKey(name, filters, scope) {
  const raw = JSON.stringify({ name, filters, scope: { level: scope.level, userId: scope.userId } });
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function withCache(name, filters, scope, fn) {
  const key = cacheKey(name, filters, scope);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function addRank(rows) {
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getAnalyticsFiltersMeta() {
  const [categories, sources, units, monitors, editors, chiefs] = await Promise.all([
    pool.query(`SELECT id, code, title_fa FROM tbl_news_categories WHERE is_active = true ORDER BY sort_order`),
    pool.query(`SELECT DISTINCT source FROM tbl_news WHERE source IS NOT NULL AND trim(source) <> '' ORDER BY source LIMIT 200`),
    pool.query(`SELECT "UnitCode" AS unit_cd, "UnitShortName" AS unit_name FROM tbl_units ORDER BY "UnitShortName" LIMIT 500`),
    pool.query(`
      SELECT DISTINCT u.id, u.name, u.username
      FROM tbl_users u
      WHERE u.active IS DISTINCT FROM false
        AND (u.role::text ILIKE '%news_monitor%' OR u.role::text ILIKE '%admin%')
      ORDER BY u.name LIMIT 300
    `),
    pool.query(`
      SELECT DISTINCT u.id, u.name, u.username
      FROM tbl_users u
      WHERE u.active IS DISTINCT FROM false
        AND (u.role::text ILIKE '%news_editor%' OR u.role::text ILIKE '%news_chief%' OR u.role::text ILIKE '%admin%')
      ORDER BY u.name LIMIT 300
    `),
    pool.query(`
      SELECT DISTINCT u.id, u.name, u.username
      FROM tbl_users u
      WHERE u.active IS DISTINCT FROM false
        AND (u.role::text ILIKE '%news_chief%' OR u.role::text ILIKE '%admin%')
      ORDER BY u.name LIMIT 100
    `),
  ]);
  return {
    categories: categories.rows,
    sources: sources.rows.map((r) => r.source),
    units: units.rows,
    usersByRole: {
      monitor: monitors.rows,
      editor: editors.rows,
      chief: chiefs.rows,
    },
    statusOptions: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    priorityOptions: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value: Number(value), label })),
    qualityOptions: Object.entries(QUALITY_LABELS).map(([value, label]) => ({ value: Number(value), label })),
  };
}

export async function getAnalyticsOverview(filters, scope) {
  return withCache("overview", filters, scope, async () => {
    const { where, params, joins } = buildAnalyticsWhere(filters, scope);
    const sql = `
      ${NEWS_REF_KEY_CTE}
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(bk.workflow_status, 'new') = 'new')::int AS registered,
        COUNT(*) FILTER (
          WHERE COALESCE(bk.workflow_status, 'new') IN ('pending', 'reviewed')
            AND COALESCE(bk.review_state, 'pending') = 'pending'
        )::int AS in_review,
        COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'rejected')::int AS rejected,
        COUNT(*) FILTER (
          WHERE COALESCE(bk.workflow_status, 'new') = 'finalized'
            AND COALESCE(bk.is_approved, 0) = 1
            AND trim(both '''' from trim(COALESCE(bk.publish_status, 'none'))) = 'ready'
            AND COALESCE(bk.duplicate_status, 'none') = 'none'
        )::int AS published,
        COUNT(*) FILTER (
          WHERE COALESCE(bk.workflow_status, 'new') = 'finalized'
            AND COALESCE(bk.is_approved, 0) = 1
            AND trim(both '''' from trim(COALESCE(bk.publish_status, 'none'))) = 'banked'
            AND COALESCE(bk.duplicate_status, 'none') = 'none'
        )::int AS banked,
        COUNT(*) FILTER (
          WHERE NULLIF(trim(bk.sender), '') IS NOT NULL
            AND ${RESOLVED_USER_ID_SQL} IS NULL
            AND ${NEWS_SENDER_SOURCE_MARKER_NOT_EXISTS_SQL}
        )::int AS unmapped_sender
      FROM base_key bk
      ${joins}
      ${where}
    `;
    const r = await pool.query(sql, params);
    const row = r.rows[0] || {};
    const total = row.total || 0;
    const pie = [
      { name: STATUS_LABELS.registered, value: row.registered || 0, key: "registered" },
      { name: STATUS_LABELS.in_review, value: row.in_review || 0, key: "in_review" },
      { name: STATUS_LABELS.approved, value: row.approved || 0, key: "approved" },
      { name: STATUS_LABELS.rejected, value: row.rejected || 0, key: "rejected" },
      { name: STATUS_LABELS.published, value: row.published || 0, key: "published" },
      { name: STATUS_LABELS.banked, value: row.banked || 0, key: "banked" },
    ].map((x) => ({ ...x, percent: pct(x.value, total) }));
    return { summary: row, pie, total };
  });
}

export async function getAnalyticsDistribution(filters, scope, dimension = "category") {
  return withCache(`distribution:${dimension}`, filters, scope, async () => {
    const { where, params, joins } = buildAnalyticsWhere(filters, scope);
    let sql;
    if (dimension === "category") {
      sql = `
        ${NEWS_REF_KEY_CTE}
        SELECT COALESCE(c.title_fa, 'بدون دسته') AS name, COUNT(*)::int AS value, c.id AS key_id
        FROM base_key bk
        ${joins}
        LEFT JOIN tbl_news_category_links cl ON cl.news_id = bk.id
        LEFT JOIN tbl_news_categories c ON c.id = cl.category_id
        ${where}
        GROUP BY c.id, c.title_fa
        ORDER BY value DESC
        LIMIT ${MAX_ROWS}
      `;
    } else if (dimension === "priority") {
      sql = `
        ${NEWS_REF_KEY_CTE}
        SELECT bk.priority AS key_id,
               CASE bk.priority
                 WHEN 1 THEN '${PRIORITY_LABELS[1]}'
                 WHEN 2 THEN '${PRIORITY_LABELS[2]}'
                 WHEN 3 THEN '${PRIORITY_LABELS[3]}'
                 WHEN 4 THEN '${PRIORITY_LABELS[4]}'
                 ELSE 'نامشخص'
               END AS name,
               COUNT(*)::int AS value
        FROM base_key bk
        ${joins}
        ${where}
        GROUP BY bk.priority
        ORDER BY bk.priority
      `;
    } else if (dimension === "quality") {
      sql = `
        ${NEWS_REF_KEY_CTE}
        SELECT bk.quality AS key_id,
               CASE bk.quality
                 WHEN 1 THEN '${QUALITY_LABELS[1]}'
                 WHEN 2 THEN '${QUALITY_LABELS[2]}'
                 WHEN 3 THEN '${QUALITY_LABELS[3]}'
                 WHEN 4 THEN '${QUALITY_LABELS[4]}'
                 WHEN 5 THEN '${QUALITY_LABELS[5]}'
                 ELSE 'نامشخص'
               END AS name,
               COUNT(*)::int AS value
        FROM base_key bk
        ${joins}
        ${where}
        GROUP BY bk.quality
        ORDER BY bk.quality
      `;
    } else {
      sql = `
        ${NEWS_REF_KEY_CTE}
        SELECT COALESCE(NULLIF(trim(bk.source), ''), 'نامشخص') AS name,
               COUNT(*)::int AS value
        FROM base_key bk
        ${joins}
        ${where}
        GROUP BY bk.source
        ORDER BY value DESC
        LIMIT ${MAX_ROWS}
      `;
    }
    const r = await pool.query(sql, params);
    const total = r.rows.reduce((s, x) => s + (x.value || 0), 0);
    const rows = r.rows.map((x) => ({ ...x, percent: pct(x.value, total) }));
    return { rows, total, dimension };
  });
}

export async function getAnalyticsTimeline(filters, scope, granularity = "day") {
  const g = ["day", "week", "month"].includes(granularity) ? granularity : "day";
  return withCache(`timeline:${g}`, filters, scope, async () => {
    const { where, params, joins } = buildAnalyticsWhere(filters, scope);
    const sql = `
      ${NEWS_REF_KEY_CTE}
      SELECT bk.ref_date AS period_label,
             COUNT(*)::int AS value
      FROM base_key bk
      ${joins}
      ${where}
      GROUP BY bk.ref_date
      ORDER BY bk.ref_date
      LIMIT 366
    `;
    const r = await pool.query(sql, params);
    const series = r.rows.map((x) => ({
      name: x.period_label,
      value: x.value,
      label: x.period_label,
    }));
    return { series, granularity: g };
  });
}

export async function getUnitParticipation(filters, scope) {
  return withCache("units/participation", filters, scope, async () => {
    const { where, params, joins } = buildAnalyticsWhere(filters, scope);
    const sql = `
      ${NEWS_REF_KEY_CTE}
      SELECT un."UnitCode" AS unit_cd,
             un."UnitShortName" AS unit_name,
             COUNT(DISTINCT bk.id)::int AS news_count,
             COUNT(DISTINCT obs.id) FILTER (
               WHERE obs.role::text ILIKE '%news_monitor%'
             )::int AS monitor_count,
             COUNT(DISTINCT ed.id) FILTER (
               WHERE ed.role::text ILIKE '%news_editor%'
             )::int AS editor_count,
             COUNT(DISTINCT ch.id) FILTER (
               WHERE ch.role::text ILIKE '%news_chief%'
             )::int AS chief_count
      FROM base_key bk
      ${joins}
      LEFT JOIN tbl_units un ON un."UnitCode" = obs.unit_cd
      LEFT JOIN tbl_users ed ON ed.unit_cd = un."UnitCode" AND ed.role::text ILIKE '%news_editor%'
      LEFT JOIN tbl_users ch ON ch.unit_cd = un."UnitCode" AND ch.role::text ILIKE '%news_chief%'
      ${where}
      GROUP BY un."UnitCode", un."UnitShortName"
      HAVING COUNT(DISTINCT bk.id) > 0
      ORDER BY news_count DESC
      LIMIT ${MAX_ROWS}
    `;
    const r = await pool.query(sql, params);
    const totalNews = r.rows.reduce((s, x) => s + x.news_count, 0);
    const rows = r.rows.map((x) => ({
      ...x,
      share_percent: pct(x.news_count, totalNews),
    }));
    return { rows: addRank(rows), top10: rows.slice(0, 10), totalNews };
  });
}

export async function getMonitorRankings(filters, scope) {
  return withCache("rankings/monitors", filters, scope, async () => {
    const { where, params, joins } = buildAnalyticsWhere(filters, scope);
    const sql = `
      ${NEWS_REF_KEY_CTE}
      SELECT obs.id AS user_id,
             COALESCE(obs.name, obs.username) AS name,
             un."UnitShortName" AS unit_name,
             COUNT(*)::int AS news_count,
             ROUND(AVG(
               CASE bk.priority WHEN 1 THEN 4 WHEN 2 THEN 3 WHEN 3 THEN 2 WHEN 4 THEN 1 ELSE 2 END
             )::numeric, 2) AS avg_priority_weight,
             ROUND(AVG(
               CASE bk.quality WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 2 END
             )::numeric, 2) AS avg_quality_weight
      FROM base_key bk
      ${joins}
      LEFT JOIN tbl_units un ON un."UnitCode" = obs.unit_cd
      ${where}
        AND ${RESOLVED_USER_ID_SQL} IS NOT NULL
      GROUP BY obs.id, obs.name, obs.username, un."UnitShortName"
      HAVING COUNT(*) > 0
      ORDER BY news_count DESC
      LIMIT ${MAX_ROWS}
    `;
    const r = await pool.query(sql, params);
    const rows = r.rows.map((row) => {
      const score = computeMonitorScore({
        newsCount: row.news_count,
        avgPriorityWeight: row.avg_priority_weight,
        avgQualityWeight: row.avg_quality_weight,
      });
      return { ...row, score: Math.round(score * 100) / 100 };
    }).sort((a, b) => b.score - a.score);
    const ranked = addRank(rows);
    const myRank = scope.userId ? ranked.find((x) => x.user_id === scope.userId) : null;
    return { rows: ranked, top10: ranked.slice(0, 10), myRank };
  });
}

export async function getEditorRankings(filters, scope) {
  return withCache("rankings/editors", filters, scope, async () => {
    const fromKey = filters.from_ref_key || jalaliDateToRefKeyStart(filters.start_date);
    const toKey = filters.to_ref_key || jalaliDateToRefKeyEnd(filters.end_date);
    const dateParams = [];
    let dateClause = "";
    if (fromKey) {
      dateParams.push(fromKey);
      dateClause += ` AND bk.ref_key >= $${dateParams.length}`;
    }
    if (toKey) {
      dateParams.push(toKey);
      dateClause += ` AND bk.ref_key <= $${dateParams.length}`;
    }

    const sql = `
      ${NEWS_REF_KEY_CTE}
      , reviews AS (
        SELECT DISTINCT ON (a.news_id, a.user_id)
          a.news_id,
          a.user_id,
          a.created_at AS review_at,
          bk.priority,
          bk.quality,
          bk.review_state
        FROM tbl_news_audit_log a
        JOIN base_key bk ON bk.id = a.news_id
        WHERE a.action = 'update'
          AND (a.changes->'review_state'->>'before' = 'pending' OR a.changes->'review_state'->>'before' IS NULL)
          AND a.changes->'review_state'->>'after' IS NOT NULL
          AND a.changes->'review_state'->>'after' <> 'pending'
          ${dateClause}
        ORDER BY a.news_id, a.user_id, a.created_at ASC
      ),
      submit_times AS (
        SELECT DISTINCT ON (a.news_id)
          a.news_id,
          a.created_at AS submit_at
        FROM tbl_news_audit_log a
        WHERE a.action = 'submit'
        ORDER BY a.news_id, a.created_at ASC
      ),
      agg AS (
        SELECT r.user_id,
               COUNT(*)::int AS reviewed_count,
               COUNT(*) FILTER (WHERE r.review_state = 'approved')::int AS approved_count,
               ROUND(AVG(CASE r.priority WHEN 1 THEN 4 WHEN 2 THEN 3 WHEN 3 THEN 2 WHEN 4 THEN 1 ELSE 2 END)
                 FILTER (WHERE r.review_state = 'approved')::numeric, 2) AS avg_approved_priority_weight,
               ROUND(AVG(CASE r.quality WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 2 END)
                 FILTER (WHERE r.review_state = 'approved')::numeric, 2) AS avg_approved_quality_weight,
               ROUND(AVG(EXTRACT(EPOCH FROM (r.review_at - s.submit_at)) / 3600.0)::numeric, 2) AS avg_review_hours
        FROM reviews r
        LEFT JOIN submit_times s ON s.news_id = r.news_id
        GROUP BY r.user_id
      )
      SELECT a.user_id,
             COALESCE(u.name, u.username) AS name,
             un."UnitShortName" AS unit_name,
             a.reviewed_count,
             a.approved_count,
             COALESCE(a.avg_approved_priority_weight, 0) AS avg_approved_priority_weight,
             COALESCE(a.avg_approved_quality_weight, 0) AS avg_approved_quality_weight,
             a.avg_review_hours
      FROM agg a
      JOIN tbl_users u ON u.id = a.user_id
      LEFT JOIN tbl_units un ON un."UnitCode" = u.unit_cd
      ORDER BY a.reviewed_count DESC
      LIMIT ${MAX_ROWS}
    `;
    const r = await pool.query(sql, dateParams);
    const rows = r.rows.map((row) => {
      const speedBonus = speedBonusFromHours(Number(row.avg_review_hours));
      const score = computeEditorScore({
        reviewedCount: row.reviewed_count,
        avgApprovedPriorityWeight: row.avg_approved_priority_weight,
        avgApprovedQualityWeight: row.avg_approved_quality_weight,
        speedBonus,
      });
      return {
        ...row,
        speed_bonus: Math.round(speedBonus * 100) / 100,
        score: Math.round(score * 100) / 100,
      };
    }).sort((a, b) => b.score - a.score);
    const ranked = addRank(rows);
    const myRank = scope.userId ? ranked.find((x) => x.user_id === scope.userId) : null;
    return { rows: ranked, top10: ranked.slice(0, 10), myRank };
  });
}

export async function getChiefRankings(filters, scope) {
  return withCache("rankings/chiefs", filters, scope, async () => {
    const fromKey = filters.from_ref_key || jalaliDateToRefKeyStart(filters.start_date);
    const toKey = filters.to_ref_key || jalaliDateToRefKeyEnd(filters.end_date);
    const dateParams = [];
    let dateClause = "";
    if (fromKey) {
      dateParams.push(fromKey);
      dateClause += ` AND f.ref_key >= $${dateParams.length}`;
    }
    if (toKey) {
      dateParams.push(toKey);
      dateClause += ` AND f.ref_key <= $${dateParams.length}`;
    }

    const sql = `
      ${NEWS_REF_KEY_CTE}
      , finalized AS (
        SELECT a.user_id,
               a.news_id,
               a.created_at AS finalize_at,
               bk.priority,
               bk.quality,
               bk.ref_key
        FROM tbl_news_audit_log a
        JOIN base_key bk ON bk.id = a.news_id
        WHERE a.action = 'finalize'
      ),
      filtered AS (
        SELECT f.* FROM finalized f
        WHERE 1=1 ${dateClause}
      ),
      review_times AS (
        SELECT DISTINCT ON (a.news_id)
          a.news_id,
          a.created_at AS review_at
        FROM tbl_news_audit_log a
        WHERE a.action = 'update'
          AND a.changes->'workflow_status'->>'after' = 'reviewed'
        ORDER BY a.news_id, a.created_at DESC
      ),
      agg AS (
        SELECT f.user_id,
               COUNT(*)::int AS published_count,
               ROUND(AVG(CASE f.priority WHEN 1 THEN 4 WHEN 2 THEN 3 WHEN 3 THEN 2 WHEN 4 THEN 1 ELSE 2 END)::numeric, 2) AS avg_priority_weight,
               ROUND(AVG(CASE f.quality WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 2 END)::numeric, 2) AS avg_quality_weight,
               ROUND(AVG(EXTRACT(EPOCH FROM (f.finalize_at - rt.review_at)) / 3600.0)::numeric, 2) AS avg_finalize_hours
        FROM filtered f
        LEFT JOIN review_times rt ON rt.news_id = f.news_id
        GROUP BY f.user_id
      )
      SELECT a.user_id,
             COALESCE(u.name, u.username) AS name,
             un."UnitShortName" AS unit_name,
             a.published_count,
             COALESCE(a.avg_priority_weight, 0) AS avg_priority_weight,
             COALESCE(a.avg_quality_weight, 0) AS avg_quality_weight,
             a.avg_finalize_hours
      FROM agg a
      JOIN tbl_users u ON u.id = a.user_id
      LEFT JOIN tbl_units un ON un."UnitCode" = u.unit_cd
      ORDER BY a.published_count DESC
      LIMIT ${MAX_ROWS}
    `;
    const r = await pool.query(sql, dateParams);
    const rows = r.rows.map((row) => {
      const speedBonus = speedBonusFromHours(Number(row.avg_finalize_hours));
      const score = computeChiefScore({
        publishedCount: row.published_count,
        avgPriorityWeight: row.avg_priority_weight,
        avgQualityWeight: row.avg_quality_weight,
        speedBonus,
      });
      return {
        ...row,
        speed_bonus: Math.round(speedBonus * 100) / 100,
        score: Math.round(score * 100) / 100,
      };
    }).sort((a, b) => b.score - a.score);
    const ranked = addRank(rows);
    const myRank = scope.userId ? ranked.find((x) => x.user_id === scope.userId) : null;
    return { rows: ranked, top10: ranked.slice(0, 10), myRank };
  });
}

export async function getUnitRankings(filters, scope) {
  const [monitors, editors, chiefs] = await Promise.all([
    getMonitorRankings(filters, scope),
    getEditorRankings(filters, scope),
    getChiefRankings(filters, scope),
  ]);

  const unitMap = new Map();

  const bump = (rows, roleKey) => {
    for (const row of rows.rows || []) {
      const key = row.unit_name || "نامشخص";
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          unit_name: key,
          monitor_count: 0,
          editor_count: 0,
          chief_count: 0,
          news_count: 0,
          score: 0,
        });
      }
      const u = unitMap.get(key);
      u.score += row.score || 0;
      if (roleKey === "monitor") {
        u.news_count += row.news_count || 0;
        u.monitor_count += 1;
      } else if (roleKey === "editor") {
        u.editor_count += 1;
      } else {
        u.chief_count += 1;
      }
    }
  };

  bump(monitors, "monitor");
  bump(editors, "editor");
  bump(chiefs, "chief");

  const rows = [...unitMap.values()]
    .map((rest) => ({
      ...rest,
      score: Math.round(rest.score * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score);

  const ranked = addRank(rows);
  return { rows: ranked, top10: ranked.slice(0, 10) };
}

export async function getWidgetData(widgetId, filters, scope) {
  switch (widgetId) {
    case "overview": return getAnalyticsOverview(filters, scope);
    case "distribution-bar": return getAnalyticsDistribution(filters, scope, "category");
    case "category-distribution": return getAnalyticsDistribution(filters, scope, "category");
    case "priority-distribution": return getAnalyticsDistribution(filters, scope, "priority");
    case "quality-distribution": return getAnalyticsDistribution(filters, scope, "quality");
    case "source-analysis": return getAnalyticsDistribution(filters, scope, "source");
    case "timeline": return getAnalyticsTimeline(filters, scope, filters.granularity || "day");
    case "units-participation": return getUnitParticipation(filters, scope);
    case "rankings-monitors": return getMonitorRankings(filters, scope);
    case "rankings-editors": return getEditorRankings(filters, scope);
    case "rankings-chiefs": return getChiefRankings(filters, scope);
    case "rankings-units": return getUnitRankings(filters, scope);
    default:
      throw new Error("ویجت نامعتبر است");
  }
}

export function assertAnalyticsAccess(scope) {
  if (!scope || scope.level === "none") {
    throw new Error("دسترسی به داشبورد تحلیلی مجاز نیست");
  }
}
