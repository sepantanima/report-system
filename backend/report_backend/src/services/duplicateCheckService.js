import pool from "../db.js";
import { buildCleanedFromRaw } from "./newsIngest/newsIngestPipeline.js";
import { stripHtml } from "./newsTextUtils.js";
import { fieldReportCompareText, similarityPercent } from "./textSimilarity.js";
import { DuplicateCheckError } from "../utils/duplicateCheckErrors.js";
import { getScopeDateRange, clampThreshold } from "../utils/duplicateCheckScope.js";
import { getNewsEntrySettings } from "./newsEntrySettingsService.js";
import { getFieldReportSettings } from "./fieldReportSettingsService.js";
import {
  appendInstanceNewsFilter,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";

const MAX_SIMILAR_RESULTS = 5;
const MAX_CANDIDATES = 150;

function mapMatchRow(row, similarity_percent, extra = {}) {
  const preview = String(row.preview ?? "").slice(0, 120);
  return {
    id: row.id ?? null,
    hash_key: row.hash_key ?? null,
    source: row.source ?? null,
    preview,
    observer_username: row.observer_username ?? row.sender_name ?? null,
    observer_first_name: row.observer_first_name ?? null,
    relay_date_jalali: row.relay_date_jalali ?? row.date ?? null,
    date: row.date ?? row.relay_date_jalali ?? null,
    sender_name: row.sender_name ?? null,
    title: row.title ?? null,
    similarity_percent,
    ...extra,
  };
}

function plainFromNewsRow(row) {
  return stripHtml(row.cleaned_text || row.raw_text || "");
}

/**
 * @param {{ enabled: boolean, scope: string, threshold: number }} config
 * @param {{ hash_key: string, plain: string, source: string, exclude_id?: number|null, reference_date?: string }} opts
 */
export async function checkNewsSimilarity(config, opts) {
  if (!config?.enabled) {
    return { exact_matches: [], similar_matches: [] };
  }

  const hashKey = opts.hash_key;
  const plain = opts.plain;
  const source = String(opts.source ?? "").trim();
  const excludeId = opts.exclude_id ?? null;
  const { start, end } = getScopeDateRange(config.scope, opts.reference_date);

  const exactParams = [hashKey, start, end];
  let excludeClause = "";
  if (excludeId != null) {
    exactParams.push(excludeId);
    excludeClause = ` AND id <> $${exactParams.length}`;
  }

  let exactWhere = ` WHERE hash_key = $1
       AND COALESCE(is_deleted, false) = false
       AND relay_date_jalali >= $2 AND relay_date_jalali <= $3
       ${excludeClause}`;
  ({ where: exactWhere, params: exactParams } = appendInstanceNewsFilter(exactWhere, exactParams, "tbl_news"));

  const exactRes = await pool.query(
    `SELECT id, source, relay_date_jalali, observer_username, observer_first_name,
            left(COALESCE(cleaned_text, raw_text, ''), 120) AS preview, hash_key
     FROM tbl_news
     ${exactWhere}`,
    exactParams,
  );

  const exact_matches = exactRes.rows.map((r) => mapMatchRow(r, 100));

  if (exact_matches.length || !plain || plain.length < 10) {
    return { exact_matches, similar_matches: [] };
  }

  const candParams = [start, end, hashKey];
  let candExclude = "";
  if (excludeId != null) {
    candParams.push(excludeId);
    candExclude = ` AND id <> $${candParams.length}`;
  }

  let candWhere = ` WHERE COALESCE(is_deleted, false) = false
       AND relay_date_jalali >= $1 AND relay_date_jalali <= $2
       AND (hash_key IS NULL OR hash_key <> $3)
       AND COALESCE(duplicate_status, 'none') <> 'confirmed'
       ${candExclude}`;
  ({ where: candWhere, params: candParams } = appendInstanceNewsFilter(candWhere, candParams, "tbl_news"));

  const candRes = await pool.query(
    `SELECT id, source, relay_date_jalali, observer_username, observer_first_name,
            raw_text, cleaned_text, hash_key,
            left(COALESCE(cleaned_text, raw_text, ''), 120) AS preview
     FROM tbl_news
     ${candWhere}
     ORDER BY created_at DESC
     LIMIT ${MAX_CANDIDATES}`,
    candParams,
  );

  const threshold = clampThreshold(config.threshold);
  const similar_matches = [];
  for (const row of candRes.rows) {
    const pct = similarityPercent(plain, plainFromNewsRow(row));
    if (pct >= threshold) {
      similar_matches.push(mapMatchRow(row, pct));
    }
  }
  similar_matches.sort((a, b) => b.similarity_percent - a.similarity_percent);
  return { exact_matches, similar_matches: similar_matches.slice(0, MAX_SIMILAR_RESULTS) };
}

/**
 * @param {{ enabled: boolean, scope: string, threshold: number }} config
 * @param {{ title: string, text: string, date: string, exclude_hash_key?: string|null }} opts
 */
export async function checkFieldReportSimilarity(config, opts) {
  if (!config?.enabled) {
    return { exact_matches: [], similar_matches: [] };
  }

  const compareText = fieldReportCompareText(opts.title, opts.text);
  if (!compareText || compareText.length < 10) {
    return { exact_matches: [], similar_matches: [] };
  }

  const { start, end } = getScopeDateRange(config.scope, opts.date);
  const excludeHash = opts.exclude_hash_key ?? null;

  const params = [start, end];
  let excludeClause = "";
  if (excludeHash) {
    params.push(excludeHash);
    excludeClause = ` AND hash_key <> $${params.length}`;
  }

  const candRes = await pool.query(
    `SELECT hash_key, title, raw_text, date, sender_name,
            left(COALESCE(title, '') || ' — ' || COALESCE(raw_text, ''), 120) AS preview
     FROM tbl_unit_events
     ${fieldReportTypeJoinSql("tbl_unit_events")}
     WHERE (is_deleted = false OR is_deleted IS NULL)
       AND date >= $1 AND date <= $2
       ${excludeClause}
       ${fieldReportListScopeSql("tbl_unit_events", "rt_scope")}
     ORDER BY "createdAt" DESC
     LIMIT ${MAX_CANDIDATES}`,
    params,
  );

  const threshold = clampThreshold(config.threshold);
  const exact_matches = [];
  const similar_matches = [];

  for (const row of candRes.rows) {
    const other = fieldReportCompareText(row.title, row.raw_text);
    const pct = similarityPercent(compareText, other);
    if (pct >= 100) {
      exact_matches.push(mapMatchRow(row, 100));
    } else if (pct >= threshold) {
      similar_matches.push(mapMatchRow(row, pct));
    }
  }

  similar_matches.sort((a, b) => b.similarity_percent - a.similarity_percent);
  return {
    exact_matches,
    similar_matches: similar_matches.slice(0, MAX_SIMILAR_RESULTS),
  };
}

function throwIfDuplicates(result) {
  if (result.exact_matches?.length) {
    throw new DuplicateCheckError("duplicate_exact", result.exact_matches);
  }
  if (result.similar_matches?.length) {
    throw new DuplicateCheckError("duplicate_similar", result.similar_matches);
  }
}

export async function getNewsDuplicateCheckConfig() {
  const s = await getNewsEntrySettings();
  return {
    enabled: s.duplicate_check_enabled !== false,
    scope: s.duplicate_check_scope || "today",
    threshold: clampThreshold(s.duplicate_similarity_threshold ?? 70),
  };
}

export async function getFieldDuplicateCheckConfig() {
  const s = await getFieldReportSettings();
  return {
    enabled: s.duplicate_check_enabled !== false,
    scope: s.duplicate_check_scope || "today",
    threshold: clampThreshold(s.duplicate_similarity_threshold ?? 70),
  };
}

export function getPublicDuplicateSettings(settings) {
  return {
    duplicate_check_enabled: settings.duplicate_check_enabled !== false,
    duplicate_check_scope: settings.duplicate_check_scope || "today",
    duplicate_similarity_threshold: clampThreshold(settings.duplicate_similarity_threshold ?? 70),
  };
}

/**
 * @param {object} body
 * @param {{ exclude_id?: number, reference_date?: string, raw_text?: string, source?: string, hash_key?: string, plain?: string }} ctx
 */
export async function assertNewsDuplicateAllowed(body, ctx = {}) {
  if (body?.force_duplicate === true) return;

  const config = await getNewsDuplicateCheckConfig();
  if (!config.enabled) return;

  let hashKey = ctx.hash_key;
  let plain = ctx.plain;
  const source = ctx.source ?? body?.source;

  if (!hashKey || !plain) {
    const rawText = ctx.raw_text ?? body?.raw_text ?? "";
    const ingested = await buildCleanedFromRaw({
      rawText: String(rawText).trim(),
      source: String(source ?? "").trim(),
      sourcePlatform: "manual",
    });
    hashKey = ingested.hash_key;
    plain = ingested.cleaned_plain;
  }

  const result = await checkNewsSimilarity(config, {
    hash_key: hashKey,
    plain,
    source,
    exclude_id: ctx.exclude_id ?? null,
    reference_date: ctx.reference_date,
  });
  throwIfDuplicates(result);
}

/**
 * @param {object} body
 * @param {{ title: string, text: string, date: string, exclude_hash_key?: string }} ctx
 */
export async function assertFieldReportDuplicateAllowed(body, ctx) {
  if (body?.force_duplicate === true) return;

  const config = await getFieldDuplicateCheckConfig();
  if (!config.enabled) return;

  const result = await checkFieldReportSimilarity(config, {
    title: ctx.title,
    text: ctx.text,
    date: ctx.date,
    exclude_hash_key: ctx.exclude_hash_key ?? null,
  });
  throwIfDuplicates(result);
}

function normalizeExcludeIds(excludeIds, selfId) {
  const out = new Set();
  for (const raw of excludeIds || []) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  const self = Number(selfId);
  if (Number.isFinite(self) && self > 0) out.add(self);
  return [...out];
}

/**
 * جستجوی تکراری در بازهٔ تنظیمات (برای پالایش هوشمند) — ردیف کامل tbl_news.
 * @param {object} row
 * @param {{ enabled: boolean, scope: string, threshold: number }} config
 * @param {{ referenceDate?: string, excludeIds?: number[] }} opts
 */
export async function findEditorialDuplicateMatches(row, config, opts = {}) {
  if (!config?.enabled) return { exactRows: [], similarRows: [] };

  const hashKey = String(row.hash_key || "").trim();
  const plain = plainFromNewsRow(row);
  const referenceDate = opts.referenceDate || row.relay_date_jalali;
  const excludeArr = normalizeExcludeIds(opts.excludeIds, row.id);
  const { start, end } = getScopeDateRange(config.scope, referenceDate);

  const exactParams = [hashKey, start, end, excludeArr];
  let exactWhere = ` WHERE hash_key = $1
       AND COALESCE(is_deleted, false) = false
       AND relay_date_jalali >= $2 AND relay_date_jalali <= $3
       AND id <> ALL($4::int[])
       AND COALESCE(duplicate_status, 'none') <> 'confirmed'`;
  ({ where: exactWhere, params: exactParams } = appendInstanceNewsFilter(exactWhere, exactParams, "tbl_news"));

  const exactRes = await pool.query(
    `SELECT *
     FROM tbl_news
     ${exactWhere}`,
    exactParams,
  );

  if (exactRes.rows.length) {
    return { exactRows: exactRes.rows, similarRows: [] };
  }

  if (!plain || plain.length < 10) {
    return { exactRows: [], similarRows: [] };
  }

  const candParams = [start, end, hashKey, excludeArr];
  let candWhere = ` WHERE COALESCE(is_deleted, false) = false
       AND relay_date_jalali >= $1 AND relay_date_jalali <= $2
       AND (hash_key IS NULL OR hash_key <> $3)
       AND COALESCE(duplicate_status, 'none') <> 'confirmed'
       AND id <> ALL($4::int[])`;
  ({ where: candWhere, params: candParams } = appendInstanceNewsFilter(candWhere, candParams, "tbl_news"));

  const candRes = await pool.query(
    `SELECT *
     FROM tbl_news
     ${candWhere}
     ORDER BY created_at DESC
     LIMIT ${MAX_CANDIDATES}`,
    candParams,
  );

  const threshold = clampThreshold(config.threshold);
  const similarRows = [];
  for (const cand of candRes.rows) {
    const pct = similarityPercent(plain, plainFromNewsRow(cand));
    if (pct >= threshold) similarRows.push(cand);
  }
  similarRows.sort((a, b) => {
    const pa = similarityPercent(plain, plainFromNewsRow(a));
    const pb = similarityPercent(plain, plainFromNewsRow(b));
    return pb - pa;
  });

  return { exactRows: [], similarRows: similarRows.slice(0, MAX_SIMILAR_RESULTS) };
}

/**
 * والد کاننیکال تکراری در بازه — null اگر خود row والد باشد.
 * @param {object} row
 * @param {{ enabled: boolean, scope: string, threshold: number }} config
 * @param {{ referenceDate?: string, excludeIds?: number[] }} opts
 * @param {(rows: object[]) => object|null} pickCanonicalFn
 */
export async function findNewsDuplicateParentInScope(row, config, opts, pickCanonicalFn) {
  const { exactRows, similarRows } = await findEditorialDuplicateMatches(row, config, opts);
  if (!exactRows.length && !similarRows.length) return null;

  const byId = new Map();
  byId.set(Number(row.id), row);
  for (const match of [...exactRows, ...similarRows]) {
    byId.set(Number(match.id), match);
  }

  const parent = pickCanonicalFn([...byId.values()]);
  if (!parent || Number(parent.id) === Number(row.id)) return null;

  return {
    parent,
    matchType: exactRows.length ? "hash" : "similarity",
  };
}
