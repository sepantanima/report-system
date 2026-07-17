import pool from "../db.js";
import {
  NEWS_REF_KEY_CTE,
  jalaliDateToRefKeyStart,
  jalaliDateToRefKeyEnd,
  logNewsAudit,
  listCategories,
  appendNewsMonitorFilters,
} from "./newsMonitorService.js";
import {
  clampPriority,
  clampQuality,
  clampRelevanceStatus,
  normalizeDbEnum,
} from "../constants/newsMonitorMeta.js";
import { stripHtml, nowJalaliDate } from "./newsTextUtils.js";
import { similarityPercent } from "./textSimilarity.js";
import { sqlNewsIsFlaggedDuplicate } from "./newsDbEnums.js";
import { getNewsEntrySettings } from "./newsEntrySettingsService.js";
import { clampThreshold } from "../utils/duplicateCheckScope.js";
import { findNewsDuplicateParentInScope } from "./duplicateCheckService.js";
import { executeFormAiAction } from "./aiFormRunOrchestrator.js";
import { NEWS_FIELD_LIMITS } from "../constants/newsFieldLimits.js";
import { buildAiRunHttpError } from "../utils/aiErrorDiagnostics.js";

const EDITORIAL_FORM = "news_editorial_batch";
const EDITORIAL_ACTION = "run_editorial";
const MAX_EDITORIAL_NEWS = 500;
const LLM_CHUNK_SIZE = 25;
const SIMILARITY_MIN_DEFAULT = 70;
const EDITORIAL_DUP_FLAG = sqlNewsIsFlaggedDuplicate();

function plainText(row) {
  return stripHtml(row.cleaned_text || row.raw_text || "").replace(/\s+/g, " ").trim();
}

function textLen(row) {
  return plainText(row).length;
}

/** digest با شناسه پایگاه + شماره ترتیبی برای نگاشت id مدل */
function buildEditorialNewsDigest(rows) {
  const SNIPPET = 600;
  return rows.map((r, idx) => {
    const date = String(r.source_date_jalali || r.ref_date || "").replace(/-/g, "/");
    const time = r.source_time_hm || r.ref_hm || "";
    const source = r.source || "—";
    const text = plainText(r).slice(0, SNIPPET);
    return `${idx + 1}) [id=${r.id}] ${date} ${time} | ${source}\n${text}`;
  }).join("\n\n");
}

/** مدل گاهی id پایگاه یا شماره ۱..n در chunk برمی‌گرداند */
function resolveEditorialNewsId(rawId, chunkRows) {
  const n = parseInt(rawId, 10);
  if (!Number.isFinite(n) || !chunkRows?.length) return null;
  const match = chunkRows.find((r) => Number(r.id) === n);
  if (match) return n;
  if (n >= 1 && n <= chunkRows.length) return Number(chunkRows[n - 1].id);
  return null;
}

/** @param {object[]} rows */
export function pickCanonicalNewsRow(rows) {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = a.source_ts_tehran ? new Date(a.source_ts_tehran).getTime() : 0;
    const tb = b.source_ts_tehran ? new Date(b.source_ts_tehran).getTime() : 0;
    if (ta !== tb) return ta - tb;
    const la = textLen(a);
    const lb = textLen(b);
    if (la !== lb) return lb - la;
    const qa = clampQuality(a.quality);
    const qb = clampQuality(b.quality);
    if (qa !== qb) return qb - qa;
    return Number(a.id) - Number(b.id);
  });
  return sorted[0];
}

function parseNewsIds(query = {}) {
  const raw = query.news_ids;
  if (raw == null || raw === "") return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(",");
  return arr.map((x) => parseInt(String(x).trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);
}

async function fetchPendingEditorialRows(query = {}) {
  const newsIds = parseNewsIds(query);

  // وقتی فرانت شناسه‌های لیست نمایش‌داده‌شده را می‌فرستد، همان‌ها مبنا هستند — فیلترهای اضافی اعمال نشود
  if (newsIds.length) {
    const params = [newsIds];
    const where = ` WHERE bk.id = ANY($1::int[])
      AND COALESCE(bk.is_deleted, false) = false
      AND NOT ${EDITORIAL_DUP_FLAG}
      AND COALESCE(bk.duplicate_status, 'none') <> 'confirmed'
      AND (
        COALESCE(bk.editorial_state, 'pending') = 'pending'
        OR (
          COALESCE(bk.editorial_state, 'pending') = 'ai'
          AND COALESCE(bk.relevance_status, 'unset') = 'unset'
        )
      )`;
    const sql = `
      ${NEWS_REF_KEY_CTE}
      SELECT bk.*
      FROM base_key bk
      ${where}
      ORDER BY bk.id ASC
      LIMIT ${MAX_EDITORIAL_NEWS + 1}
    `;
    const r = await pool.query(sql, params);
    return r.rows;
  }

  let params = [];
  let where = ` WHERE (
      COALESCE(bk.editorial_state, 'pending') = 'pending'
      OR (
        COALESCE(bk.editorial_state, 'pending') = 'ai'
        AND COALESCE(bk.relevance_status, 'unset') = 'unset'
      )
    )
    AND NOT ${EDITORIAL_DUP_FLAG}
    AND COALESCE(bk.duplicate_status, 'none') <> 'confirmed'
    AND COALESCE(bk.is_deleted, false) = false`;

  const fromKey = jalaliDateToRefKeyStart(query.start_date);
  const toKey = jalaliDateToRefKeyEnd(query.end_date);
  if (fromKey) {
    params.push(fromKey);
    where += ` AND bk.ref_key >= $${params.length}`;
  }
  if (toKey) {
    params.push(toKey);
    where += ` AND bk.ref_key <= $${params.length}`;
  }

  ({ params, where } = appendNewsMonitorFilters(params, where, query, {
    skipEditorialState: true,
    reviewDefault: "all",
  }));

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT bk.*
    FROM base_key bk
    ${where}
    ORDER BY bk.ref_key ASC, bk.id ASC
    LIMIT ${MAX_EDITORIAL_NEWS + 1}
  `;
  const r = await pool.query(sql, params);
  return r.rows;
}

export async function getEditorialEligibility(query = {}) {
  const rows = await fetchPendingEditorialRows(query);
  const overLimit = rows.length > MAX_EDITORIAL_NEWS;
  const pending = overLimit ? rows.slice(0, MAX_EDITORIAL_NEWS) : rows;

  return {
    unprocessed_count: pending.length,
    filtered_count: pending.length,
    can_run: pending.length > 0 && !overLimit,
    over_limit: overLimit,
    max_per_run: MAX_EDITORIAL_NEWS,
  };
}

async function linkAsDuplicateChild(client, childRow, parentId, userId, runId) {
  const upd = await client.query(
    `UPDATE tbl_news SET
       duplicate_parent_id = $1,
       duplicate_status = 'confirmed',
       is_duplicate = true,
       editorial_state = 'ai',
       editorial_at = CURRENT_TIMESTAMP,
       editorial_by = NULL,
       editorial_run_id = $2,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [parentId, runId, childRow.id],
  );
  await logNewsAudit(client, childRow.id, userId, "editorial_link_duplicate", childRow, upd.rows[0]);
  return upd.rows[0];
}

async function runEditorialScopedDedup(rows, userId, runId, query, settings) {
  const config = {
    enabled: settings.duplicate_check_enabled !== false,
    scope: settings.duplicate_check_scope || "today",
    threshold: clampThreshold(settings.duplicate_similarity_threshold ?? SIMILARITY_MIN_DEFAULT),
  };
  if (!config.enabled) return { dbHashLinked: 0, dbSimLinked: 0 };

  const referenceDate = query.end_date || query.start_date || nowJalaliDate();
  let dbHashLinked = 0;
  let dbSimLinked = 0;
  const linkedIds = new Set();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const rowId = Number(row.id);
      if (linkedIds.has(rowId)) continue;
      if (normalizeDbEnum(row.duplicate_status) === "confirmed") continue;

      const match = await findNewsDuplicateParentInScope(
        row,
        config,
        { referenceDate, excludeIds: [...linkedIds] },
        pickCanonicalNewsRow,
      );
      if (!match) continue;

      const childRes = await client.query(`SELECT * FROM tbl_news WHERE id = $1 FOR UPDATE`, [rowId]);
      const child = childRes.rows[0];
      if (!child || child.is_deleted) continue;
      if (normalizeDbEnum(child.duplicate_status) === "confirmed") continue;

      await linkAsDuplicateChild(client, child, match.parent.id, userId, runId);
      linkedIds.add(rowId);
      if (match.matchType === "hash") dbHashLinked += 1;
      else dbSimLinked += 1;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return { dbHashLinked, dbSimLinked };
}

async function runMechanicalHashDedup(rows, userId, runId) {
  const byHash = new Map();
  for (const row of rows) {
    const hk = String(row.hash_key || "").trim();
    if (!hk) continue;
    if (!byHash.has(hk)) byHash.set(hk, []);
    byHash.get(hk).push(row);
  }

  let linked = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const group of byHash.values()) {
      if (group.length < 2) continue;
      const parent = pickCanonicalNewsRow(group);
      if (!parent) continue;
      for (const child of group) {
        if (child.id === parent.id) continue;
        await linkAsDuplicateChild(client, child, parent.id, userId, runId);
        linked += 1;
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return linked;
}

function clusterBySimilarity(rows, minPercent) {
  const n = rows.length;
  const parent = rows.map((_, i) => i);
  const find = (i) => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const unite = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < n; i += 1) {
    const ti = plainText(rows[i]);
    if (!ti) continue;
    for (let j = i + 1; j < n; j += 1) {
      const tj = plainText(rows[j]);
      if (!tj) continue;
      if (similarityPercent(ti, tj) >= minPercent) unite(i, j);
    }
  }

  const clusters = new Map();
  for (let i = 0; i < n; i += 1) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(rows[i]);
  }
  return [...clusters.values()].filter((g) => g.length >= 2);
}

async function runSimilarityDedup(rows, userId, runId, minPercent) {
  const clusters = clusterBySimilarity(rows, minPercent);
  let linked = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const group of clusters) {
      const parent = pickCanonicalNewsRow(group);
      if (!parent) continue;
      for (const child of group) {
        if (child.id === parent.id) continue;
        await linkAsDuplicateChild(client, child, parent.id, userId, runId);
        linked += 1;
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return linked;
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("خروجی AI شامل JSON معتبر نیست");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function loadCategoryCodeMap() {
  const cats = await listCategories();
  const codeToId = new Map();
  for (const c of cats) codeToId.set(String(c.code).trim(), c.id);
  return codeToId;
}

async function applyEditorialUpdate(client, update, codeToId, userId, runId, summarizeThreshold, chunkRows) {
  const newsId = resolveEditorialNewsId(update?.id, chunkRows);
  if (!Number.isFinite(newsId)) return { ok: false, reason: "invalid_id" };

  const beforeRes = await client.query(`SELECT * FROM tbl_news WHERE id = $1 FOR UPDATE`, [newsId]);
  const before = beforeRes.rows[0];
  if (!before || before.is_deleted) return { ok: false, reason: "not_found" };
  const edState = normalizeDbEnum(before.editorial_state);
  const relState = normalizeDbEnum(before.relevance_status);
  const isPendingEditorial = edState === "pending";
  const needsRelevanceOnly = edState === "ai" && relState === "unset";
  if (!isPendingEditorial && !needsRelevanceOnly) return { ok: false, reason: "already_processed" };
  if (normalizeDbEnum(before.duplicate_status) === "confirmed") return { ok: false, reason: "duplicate" };

  const priority = update.priority != null ? clampPriority(update.priority) : clampPriority(before.priority);
  const quality = update.quality != null ? clampQuality(update.quality) : clampQuality(before.quality);
  let relevance = clampRelevanceStatus(before.relevance_status);
  if (update.relevance_status != null && String(update.relevance_status).trim()) {
    const fromAi = clampRelevanceStatus(update.relevance_status);
    relevance = fromAi === "unset" ? "relevant" : fromAi;
  } else if (relevance === "unset") {
    relevance = "relevant";
  }

  let summary = before.summary;
  if (update.summary != null && String(update.summary).trim()) {
    summary = String(update.summary).trim().slice(0, NEWS_FIELD_LIMITS.summary);
  }

  const upd = await client.query(
    `UPDATE tbl_news SET
       priority = $1,
       quality = $2,
       summary = $3,
       relevance_status = $4,
       editorial_state = 'ai',
       editorial_at = CURRENT_TIMESTAMP,
       editorial_by = NULL,
       editorial_run_id = $5,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6 RETURNING *`,
    [priority, quality, summary, relevance, runId, newsId],
  );

  if (Array.isArray(update.category_codes) && update.category_codes.length) {
    const ids = update.category_codes
      .map((code) => codeToId.get(String(code).trim()))
      .filter((id) => Number.isFinite(id));
    await client.query(`DELETE FROM tbl_news_category_links WHERE news_id = $1`, [newsId]);
    for (const cid of ids) {
      await client.query(
        `INSERT INTO tbl_news_category_links (news_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [newsId, cid],
      );
    }
  }

  await logNewsAudit(client, newsId, userId, "editorial_ai", before, upd.rows[0]);
  return { ok: true };
}

async function runLlmEditorialChunks(rows, userId, runId, query) {
  const settings = await getNewsEntrySettings();
  const summarizeThreshold = settings.summarize_char_threshold ?? 300;

  let applied = 0;
  let skipped = 0;
  const skipReasons = {};
  const codeToId = await loadCategoryCodeMap();

  for (let i = 0; i < rows.length; i += LLM_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + LLM_CHUNK_SIZE);
    const digest = buildEditorialNewsDigest(chunk);

    const aiResult = await executeFormAiAction({
      formName: EDITORIAL_FORM,
      actionName: EDITORIAL_ACTION,
      formData: {
        start_date: query.start_date,
        end_date: query.end_date,
        news_digest: digest,
      },
      userId,
    });

    let parsed;
    try {
      parsed = extractJsonObject(aiResult.result_text || aiResult.draft);
    } catch {
      skipped += chunk.length;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const upd of parsed.updates || []) {
        const result = await applyEditorialUpdate(
          client, upd, codeToId, userId, runId, summarizeThreshold, chunk,
        );
        if (result.ok) applied += 1;
        else {
          skipped += 1;
          const reason = result.reason || "unknown";
          skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        }
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  return { applied, skipped, skipReasons };
}

export async function getEditorialRun(runId) {
  const id = parseInt(runId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه اجرا نامعتبر است");
  const r = await pool.query(`SELECT * FROM tbl_news_editorial_runs WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

function sanitizeEditorialFilterSnapshot(query = {}) {
  const keys = [
    "start_date", "end_date", "workflow_status", "review_state", "duplicate",
    "relevance", "editorial_state", "priority", "quality", "sources", "categories", "q", "news_ids",
  ];
  const out = {};
  for (const k of keys) {
    if (query[k] != null && String(query[k]).trim() !== "") out[k] = query[k];
  }
  return out;
}

export async function startEditorialRun(query = {}, userId = null) {
  const requestedIds = parseNewsIds(query);
  const elig = await getEditorialEligibility(query);
  if (!elig.can_run) {
    if (elig.over_limit) {
      throw new Error(`حداکثر ${MAX_EDITORIAL_NEWS} خبر در هر اجرا — فیلتر را محدودتر کنید`);
    }
    if (requestedIds.length) {
      throw new Error(
        `از ${requestedIds.length} خبر انتخاب‌شده در لیست، هیچ‌کدام برای پالایش واجد شرایط نیست (شاید قبلاً پالایش شده یا تکراری هستند)`,
      );
    }
    throw new Error("خبر پالایش‌نشده‌ای در فیلتر فعلی نیست");
  }

  const ins = await pool.query(
    `INSERT INTO tbl_news_editorial_runs (user_id, date_from, date_to, status, total_count, stats_json)
     VALUES ($1, $2, $3, 'running', $4, $5::jsonb) RETURNING *`,
    [
      userId,
      query.start_date || null,
      query.end_date || null,
      elig.unprocessed_count,
      JSON.stringify({ filter_snapshot: sanitizeEditorialFilterSnapshot(query) }),
    ],
  );
  const run = ins.rows[0];
  const runId = run.id;

  setImmediate(async () => {
    const stats = {
      db_hash_duplicates_linked: 0,
      db_similarity_duplicates_linked: 0,
      hash_duplicates_linked: 0,
      similarity_duplicates_linked: 0,
      llm_applied: 0,
      llm_skipped: 0,
    };
    try {
      let rows = await fetchPendingEditorialRows(query);
      const settings = await getNewsEntrySettings();
      const minSim = clampThreshold(settings.duplicate_similarity_threshold ?? SIMILARITY_MIN_DEFAULT);

      const scoped = await runEditorialScopedDedup(rows, userId, runId, query, settings);
      stats.db_hash_duplicates_linked = scoped.dbHashLinked;
      stats.db_similarity_duplicates_linked = scoped.dbSimLinked;
      rows = await fetchPendingEditorialRows(query);

      stats.hash_duplicates_linked = await runMechanicalHashDedup(rows, userId, runId);
      rows = await fetchPendingEditorialRows(query);
      stats.similarity_duplicates_linked = await runSimilarityDedup(rows, userId, runId, minSim);
      rows = await fetchPendingEditorialRows(query);

      const llm = await runLlmEditorialChunks(rows, userId, runId, query);
      stats.llm_applied = llm.applied;
      stats.llm_skipped = llm.skipped;
      stats.llm_skip_reasons = llm.skipReasons;

      const dupLinked =
        stats.db_hash_duplicates_linked
        + stats.db_similarity_duplicates_linked
        + stats.hash_duplicates_linked
        + stats.similarity_duplicates_linked;

      await pool.query(
        `UPDATE tbl_news_editorial_runs SET
           status = 'done',
           processed_count = $1,
           skipped_count = $2,
           stats_json = $3::jsonb,
           finished_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          llm.applied + dupLinked,
          llm.skipped,
          JSON.stringify(stats),
          runId,
        ],
      );
    } catch (e) {
      const httpErr = buildAiRunHttpError(e);
      const friendly = [
        httpErr.body.error,
        httpErr.body.hint_fa,
      ].filter(Boolean).join(" — ").slice(0, 2000);
      const processed =
        stats.db_hash_duplicates_linked
        + stats.db_similarity_duplicates_linked
        + stats.hash_duplicates_linked
        + stats.similarity_duplicates_linked
        + stats.llm_applied;
      await pool.query(
        `UPDATE tbl_news_editorial_runs SET
           status = 'failed',
           error_message = $1,
           processed_count = $2,
           stats_json = $3::jsonb,
           finished_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [friendly, processed, JSON.stringify({ ...stats, llm_failed: true }), runId],
      );
    }
  });

  return run;
}

export async function restoreRelevanceBulk(newsIds, userId = null) {
  const ids = (Array.isArray(newsIds) ? newsIds : [])
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n));
  if (!ids.length) throw new Error("شناسه خبر نامعتبر است");

  const client = await pool.connect();
  let restored = 0;
  try {
    await client.query("BEGIN");
    for (const newsId of ids) {
      const beforeRes = await client.query(`SELECT * FROM tbl_news WHERE id = $1 FOR UPDATE`, [newsId]);
      const before = beforeRes.rows[0];
      if (!before) continue;
      const upd = await client.query(
        `UPDATE tbl_news SET
           relevance_status = 'relevant',
           editorial_state = 'manual',
           editorial_at = CURRENT_TIMESTAMP,
           editorial_by = $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [userId, newsId],
      );
      await logNewsAudit(client, newsId, userId, "restore_relevance", before, upd.rows[0]);
      restored += 1;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return { restored };
}
