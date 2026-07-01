import crypto from "crypto";
import pool from "../db.js";
import {
  resolveNewsSmartAnalysisAssembly,
  buildAutoAnalysisTitle,
  buildNewsDigest,
  computeQuerySignature,
} from "./newsSmartAnalysisAiAssembly.js";
import { fetchNewsByIds } from "./newsReportQuery.js";
import { stripHtml } from "./newsTextUtils.js";

const ANALYSIS_TYPES = ["analyze_overview", "analyze_thematic", "analyze_trends", "analyze_risk"];

function parseNewsIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
}

function mapPackRow(row, analyses = []) {
  if (!row) return null;
  const newsIds = parseNewsIds(row.news_ids);
  const analysisMap = {};
  for (const a of analyses) {
    analysisMap[a.analysis_type] = mapAnalysisRow(a);
  }
  return {
    id: row.id,
    title: row.title,
    query_payload: row.query_payload,
    filter_signature: row.filter_signature,
    period_from: row.period_from,
    period_to: row.period_to,
    selection_mode: row.selection_mode,
    news_ids: newsIds,
    news_count: row.news_count,
    digest_hash: row.digest_hash,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    creator_name: row.creator_name,
    analyses: analysisMap,
    analysis_types_done: analyses.map((a) => a.analysis_type),
  };
}

function mapAnalysisRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    pack_id: row.pack_id,
    title: row.title,
    analysis_type: row.analysis_type,
    body_html: row.body_html,
    body_plain: row.body_plain,
    ai_prompt_key: row.ai_prompt_key,
    publish_status: row.publish_status,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildPackTitle(assembly) {
  const from = assembly.periodFrom || "";
  const to = assembly.periodTo || from;
  const count = assembly.newsCount ?? 0;
  const range = from === to ? from : `${from} — ${to}`;
  return `پک تحلیلی — ${range} (${count} خبر)`;
}

function computeDigestHash(digest) {
  return crypto.createHash("sha256").update(String(digest || ""), "utf8").digest("hex").slice(0, 64);
}

async function loadPackAnalyses(packId) {
  const r = await pool.query(
    `SELECT * FROM tbl_news_smart_analyses WHERE pack_id = $1 ORDER BY id`,
    [packId],
  );
  return r.rows;
}

export async function getPackById(id) {
  const packId = parseInt(id, 10);
  if (!Number.isFinite(packId)) throw new Error("شناسهٔ پک نامعتبر است");

  const r = await pool.query(
    `SELECT p.*, u.name AS creator_name
     FROM tbl_news_smart_analysis_packs p
     LEFT JOIN tbl_users u ON u.id = p.created_by
     WHERE p.id = $1`,
    [packId],
  );
  if (!r.rows.length) return null;
  const analyses = await loadPackAnalyses(packId);
  return mapPackRow(r.rows[0], analyses);
}

export async function listPacks(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.page_size, 10) || 10));
  const offset = (page - 1) * pageSize;
  const params = [];
  let where = " WHERE 1=1";

  const q = String(query.q || "").trim();
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (p.title ILIKE $${params.length} OR p.id::text LIKE $${params.length})`;
  }

  const countR = await pool.query(
    `SELECT COUNT(*)::int AS n FROM tbl_news_smart_analysis_packs p ${where}`,
    params,
  );
  const total = countR.rows[0]?.n ?? 0;

  params.push(pageSize, offset);
  const r = await pool.query(
    `SELECT p.*, u.name AS creator_name,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'analysis_type', a.analysis_type,
                'id', a.id,
                'title', a.title,
                'updated_at', a.updated_at
              ) ORDER BY a.analysis_type)
               FROM tbl_news_smart_analyses a WHERE a.pack_id = p.id),
              '[]'::json
            ) AS analyses_summary
     FROM tbl_news_smart_analysis_packs p
     LEFT JOIN tbl_users u ON u.id = p.created_by
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const rows = r.rows.map((row) => {
    const summary = Array.isArray(row.analyses_summary) ? row.analyses_summary : [];
    const doneTypes = summary.map((s) => s.analysis_type);
    return {
      ...mapPackRow(row, []),
      analyses_summary: summary,
      types_done: doneTypes,
      types_total: ANALYSIS_TYPES.length,
      types_complete: ANALYSIS_TYPES.every((t) => doneTypes.includes(t)),
    };
  });

  return { rows, total, page, page_size: pageSize };
}

/**
 * ایجاد پک جدید با فریز news_ids
 */
export async function createAnalysisPack({ queryPayload, selectedIds = [], title, userId, userRole }) {
  const scope = { userId, role: userRole };
  const formData = {
    query_payload: queryPayload,
    selected_ids: selectedIds,
  };
  const assembly = await resolveNewsSmartAnalysisAssembly(formData, scope);
  const newsIds = assembly.rows.map((row) => row.id);
  const selectionMode = selectedIds?.length ? "subset" : "all_filtered";
  const digest = buildNewsDigest(assembly.rows);
  const digestHash = computeDigestHash(digest);
  const packTitle = String(title || "").trim() || buildPackTitle(assembly);
  const filterSignature = assembly.filterSignature || computeQuerySignature(queryPayload);

  const ins = await pool.query(
    `INSERT INTO tbl_news_smart_analysis_packs (
       title, query_payload, filter_signature, period_from, period_to,
       selection_mode, news_ids, news_count, digest_hash, status, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10)
     RETURNING *`,
    [
      packTitle.slice(0, 500),
      JSON.stringify(queryPayload),
      filterSignature,
      assembly.periodFrom,
      assembly.periodTo,
      selectionMode,
      JSON.stringify(newsIds),
      newsIds.length,
      digestHash,
      userId ?? null,
    ],
  );

  return mapPackRow(ins.rows[0], []);
}

export async function upsertPackAnalysis(packId, analysisType, body = {}, userId) {
  const pid = parseInt(packId, 10);
  if (!Number.isFinite(pid)) throw new Error("شناسهٔ پک نامعتبر است");

  const type = String(analysisType || "").trim();
  if (!ANALYSIS_TYPES.includes(type)) throw new Error("نوع تحلیل نامعتبر است");

  const pack = await getPackById(pid);
  if (!pack) throw new Error("پک یافت نشد");

  const title = String(body.title || "").trim().slice(0, 500);
  const bodyHtml = String(body.body_html ?? body.body ?? "");
  const bodyPlain = String(body.body_plain ?? stripHtml(bodyHtml));
  if (!title) throw new Error("عنوان الزامی است");

  const existing = pack.analyses?.[type];
  const queryPayload = pack.query_payload || {};
  const selectedIds = pack.selection_mode === "subset" ? pack.news_ids : [];
  const filterSignature = pack.filter_signature || computeQuerySignature(queryPayload);

  if (existing?.id) {
    const r = await pool.query(
      `UPDATE tbl_news_smart_analyses SET
         title = $1, body_html = $2, body_plain = $3,
         ai_prompt_key = COALESCE($4, ai_prompt_key),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND pack_id = $6
       RETURNING *`,
      [title, bodyHtml, bodyPlain, body.ai_prompt_key || null, existing.id, pid],
    );
    if (!r.rows.length) throw new Error("تحلیل یافت نشد");
    return mapAnalysisRow(r.rows[0]);
  }

  const ins = await pool.query(
    `INSERT INTO tbl_news_smart_analyses (
       pack_id, title, analysis_type, body_html, body_plain,
       query_payload, selected_ids, news_count, period_from, period_to,
       filter_signature, ai_prompt_key, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      pid, title, type, bodyHtml, bodyPlain,
      JSON.stringify(queryPayload), JSON.stringify(selectedIds),
      pack.news_count, pack.period_from, pack.period_to,
      filterSignature, body.ai_prompt_key || null, userId ?? null,
    ],
  );
  return mapAnalysisRow(ins.rows[0]);
}

export async function getPackFrozenNews(packId, userScope = {}) {
  const pack = await getPackById(packId);
  if (!pack) throw new Error("پک یافت نشد");

  const ids = pack.news_ids || [];
  if (!ids.length) {
    return { pack, rows: [], missing_ids: [], changed_hints: [] };
  }

  const rows = await fetchNewsByIds(ids, userScope);
  const foundIds = new Set(rows.map((r) => r.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  return {
    pack,
    rows,
    missing_ids: missingIds,
    ordered_ids: ids,
  };
}

export async function resolveAssemblyForPack(packId, userScope = {}) {
  const pack = await getPackById(packId);
  if (!pack) throw new Error("پک یافت نشد");

  const ids = pack.news_ids || [];
  if (!ids.length) throw new Error("پک فاقد اخبار فریزشده است");

  const rows = await fetchNewsByIds(ids, userScope);
  const digest = buildNewsDigest(rows);
  const queryPayload = pack.query_payload || {};

  return {
    pack,
    rows,
    digest,
    periodFrom: pack.period_from,
    periodTo: pack.period_to,
    filters: queryPayload.filters || {},
    selectedIds: pack.selection_mode === "subset" ? ids : [],
    newsCount: ids.length,
    filterSignature: pack.filter_signature,
    vars: {
      PERIOD_START: pack.period_from || "",
      PERIOD_END: pack.period_to || pack.period_from || "",
      NEWS_COUNT: String(rows.length),
      FILTER_SUMMARY: "",
      NEWS_DIGEST: digest,
    },
  };
}

export async function deletePack(packId) {
  const pid = parseInt(packId, 10);
  const r = await pool.query(
    `DELETE FROM tbl_news_smart_analysis_packs WHERE id = $1 RETURNING id`,
    [pid],
  );
  if (!r.rows.length) throw new Error("پک یافت نشد");
  return { ok: true, id: pid };
}

export { ANALYSIS_TYPES, mapAnalysisRow, buildPackTitle };
