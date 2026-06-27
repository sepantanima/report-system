import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  VALID_REVIEW_STATES,
  VALID_WORKFLOW_STATES,
  VALID_DUPLICATE_STATUSES,
  syncLegacyApprovalFields,
  inferReviewState,
  inferWorkflowStatus,
  resolveDuplicateStatus,
  normalizeDbEnum,
  clampPriority,
  clampQuality,
  duplicateStatusToLegacyFlag,
} from "../constants/newsMonitorMeta.js";
import {
  computeCharCount,
  computeHashKey,
  nowJalaliDate,
  nowTimeHm,
  normalizeJalaliDate,
  normalizeTimeHm,
  stripHtml,
  sourceJalaliToTimestamps,
  nowRelayTimestamps,
  normalizeSourceUrl,
} from "./newsTextUtils.js";
import { buildCleanedFromRaw } from "./newsIngest/newsIngestPipeline.js";
import {
  exportCleanedText,
  resolveDisplayHtml,
  ensureStoredCleanedHtml,
  normalizeFormat,
  normalizeSourcePlatform,
} from "./newsFormat/index.js";
import { validateNewsEntryPayload, validateNewsManagePayload } from "../constants/newsFieldLimits.js";
import {
  sqlNewsDuplicateStatus,
  sqlNewsWorkflow,
  sqlEffectiveNewsWorkflow,
  sqlNewsReviewState,
  sqlNewsIsFlaggedDuplicate,
} from "./newsDbEnums.js";

const WS = sqlNewsWorkflow();
const EWS = sqlEffectiveNewsWorkflow();
const DS = sqlNewsDuplicateStatus();
const RS = sqlNewsReviewState();
const DUP_FLAG = sqlNewsIsFlaggedDuplicate();

/** CTE هم‌راستا با query واکشی n8n */
export const NEWS_REF_KEY_CTE = `
  WITH base AS (
    SELECT
      n.*,
      CASE
        WHEN n.source_date_jalali IS NOT NULL
             AND trim(n.source_date_jalali) <> ''
             AND n.source_time_hm IS NOT NULL
             AND trim(n.source_time_hm) <> ''
          THEN trim(n.source_date_jalali)
        ELSE trim(n.relay_date_jalali)
      END AS ref_date,
      lpad(
        regexp_replace(
          CASE
            WHEN n.source_date_jalali IS NOT NULL
                 AND trim(n.source_date_jalali) <> ''
                 AND n.source_time_hm IS NOT NULL
                 AND trim(n.source_time_hm) <> ''
              THEN n.source_time_hm
            ELSE n.relay_time_hm
          END,
          '\\D','','g'
        ),
        4,
        '0'
      ) AS ref_hm
    FROM tbl_news n
    WHERE COALESCE(NULLIF(trim(n.cleaned_text), ''), NULLIF(trim(n.raw_text), '')) IS NOT NULL
      AND COALESCE(n.is_deleted, false) = false
  ),
  base_key AS (
    SELECT *, (regexp_replace(ref_date, '[^0-9]', '', 'g') || ref_hm) AS ref_key FROM base
  )
`;

const AUDIT_FIELDS = [
  "raw_text", "cleaned_text", "source", "sender", "priority", "quality",
  "review_state", "workflow_status", "duplicate_status", "duplicate_parent_id",
  "status_note", "is_duplicate", "is_approved", "status",
];

function normalizeStringArray(v) {
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  }
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normalizeIntArray(v) {
  return normalizeStringArray(v).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
}

export function jalaliDateToRefKeyStart(dateStr) {
  const d = String(dateStr || "").trim().replace(/\//g, "-");
  if (!d) return null;
  return d.replace(/-/g, "") + "0000";
}

export function jalaliDateToRefKeyEnd(dateStr) {
  const d = String(dateStr || "").trim().replace(/\//g, "-");
  if (!d) return null;
  return d.replace(/-/g, "") + "9999";
}

export function resolveNewsRoleLevel(userRole) {
  const roles = parseUserRoles(userRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("news_chief")) return "chief";
  if (roles.includes("news_editor")) return "editor";
  if (roles.includes("news_monitor")) return "monitor";
  return null;
}

function mapRow(row) {
  const rs = normalizeDbEnum(row.review_state) || inferReviewState(row.is_approved, row.status);
  const ws = inferWorkflowStatus({ ...row, review_state: rs });
  const dup = resolveDuplicateStatus(row);
  return {
    ...row,
    review_state: rs,
    workflow_status: ws,
    duplicate_status: dup,
    category_ids: row.category_ids || [],
    categories: row.categories || [],
    display_html: resolveDisplayHtml(row),
  };
}

function diffChanges(before, after) {
  const changes = {};
  for (const key of AUDIT_FIELDS) {
    const b = before?.[key];
    const a = after?.[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes[key] = { from: b ?? null, to: a ?? null };
    }
  }
  return changes;
}

export async function logNewsAudit(client, newsId, userId, action, before, after) {
  const changes = diffChanges(before, after);
  if (!Object.keys(changes).length && action === "update") return;
  await client.query(
    `INSERT INTO tbl_news_audit_log (news_id, user_id, action, changes)
     VALUES ($1, $2, $3, $4)`,
    [newsId, userId ?? null, action, JSON.stringify(changes)],
  );
}

async function fetchNewsRow(newsId, client = pool) {
  const r = await client.query(`SELECT * FROM tbl_news WHERE id = $1`, [newsId]);
  return r.rows[0] || null;
}

async function enrichRow(row) {
  if (!row) return null;
  const cats = await pool.query(
    `SELECT c.id, c.code, c.title_fa
     FROM tbl_news_category_links cl
     JOIN tbl_news_categories c ON c.id = cl.category_id
     WHERE cl.news_id = $1
     ORDER BY c.sort_order`,
    [row.id],
  );
  return mapRow({
    ...row,
    category_ids: cats.rows.map((c) => c.id),
    categories: cats.rows,
  });
}

export async function listCategories() {
  const r = await pool.query(
    `SELECT id, code, title_fa, sort_order
     FROM tbl_news_categories
     WHERE is_active = true
     ORDER BY sort_order, id`,
  );
  return r.rows;
}

export async function listNewsMonitor(query = {}, userId = null) {
  const params = [];
  let where = ` WHERE 1=1`;

  const myDrafts = query.my_drafts === "1" || query.my_drafts === "true";

  if (myDrafts) {
    const uid = parseInt(userId ?? query.observer_id, 10);
    if (!Number.isFinite(uid)) throw new Error("کاربر نامعتبر است");
    params.push(uid);
    where += ` AND bk.observer_id = $${params.length}`;
    where += ` AND ${WS} = 'new'`;
  } else {
    const fromKey = query.from_ref_key || jalaliDateToRefKeyStart(query.start_date);
    const toKey = query.to_ref_key || jalaliDateToRefKeyEnd(query.end_date);
    if (fromKey) {
      params.push(fromKey);
      where += ` AND bk.ref_key >= $${params.length}`;
    }
    if (toKey) {
      params.push(toKey);
      where += ` AND bk.ref_key <= $${params.length}`;
    }
  }

  const duplicateMode = String(query.duplicate || "exclude").toLowerCase();
  if (duplicateMode === "exclude") {
    where += ` AND NOT ${DUP_FLAG}`;
  } else if (duplicateMode === "only") {
    where += ` AND ${DUP_FLAG}`;
  } else if (duplicateMode === "suspicious") {
    where += ` AND (${DS} = 'suspicious' OR (COALESCE(bk.is_duplicate, false) = true AND ${DS} = 'none'))`;
  }

  const workflowStatus = String(query.workflow_status || "").trim();
  if (!myDrafts && workflowStatus && workflowStatus !== "all" && VALID_WORKFLOW_STATES.has(workflowStatus)) {
    params.push(workflowStatus);
    where += ` AND ${EWS} = $${params.length}`;
  }

  const reviewState = String(query.review_state ?? (myDrafts ? "all" : "pending")).trim();
  if (reviewState && reviewState !== "all") {
    if (VALID_REVIEW_STATES.has(reviewState)) {
      params.push(reviewState);
      where += ` AND ${RS} = $${params.length}`;
    }
  }

  const priority = parseInt(query.priority, 10);
  if (priority >= 1 && priority <= 4) {
    params.push(priority);
    where += ` AND bk.priority = $${params.length}`;
  }

  const quality = parseInt(query.quality, 10);
  if (quality >= 1 && quality <= 5) {
    params.push(quality);
    where += ` AND bk.quality = $${params.length}`;
  }

  const sources = normalizeStringArray(query.sources);
  if (sources.length) {
    params.push(sources);
    where += ` AND bk.source = ANY($${params.length}::text[])`;
  }

  const categoryIds = normalizeIntArray(query.categories);
  if (categoryIds.length) {
    params.push(categoryIds);
    where += ` AND EXISTS (
      SELECT 1 FROM tbl_news_category_links cl
      WHERE cl.news_id = bk.id AND cl.category_id = ANY($${params.length}::int[])
    )`;
  }

  const q = String(query.q || "").trim();
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    where += ` AND (
      bk.cleaned_text ILIKE $${idx}
      OR bk.raw_text ILIKE $${idx}
      OR bk.sender ILIKE $${idx}
      OR bk.source ILIKE $${idx}
      OR bk.summary ILIKE $${idx}
      OR bk.observer_username ILIKE $${idx}
      OR bk.observer_first_name ILIKE $${idx}
      OR COALESCE(bk.status_note, '') ILIKE $${idx}
    )`;
  }

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT bk.*,
           COALESCE(
             (SELECT json_agg(c.id ORDER BY c.sort_order)
              FROM tbl_news_category_links cl
              JOIN tbl_news_categories c ON c.id = cl.category_id
              WHERE cl.news_id = bk.id),
             '[]'::json
           ) AS category_ids,
           COALESCE(
             (SELECT json_agg(json_build_object('id', c.id, 'code', c.code, 'title_fa', c.title_fa) ORDER BY c.sort_order)
              FROM tbl_news_category_links cl
              JOIN tbl_news_categories c ON c.id = cl.category_id
              WHERE cl.news_id = bk.id),
             '[]'::json
           ) AS categories
    FROM base_key bk
    ${where}
    ORDER BY bk.ref_key DESC, bk.id DESC
    LIMIT 500
  `;

  const r = await pool.query(sql, params);
  return r.rows.map(mapRow);
}

export async function getSummaryStats(query = {}) {
  const params = [];
  let where = ` WHERE 1=1`;

  const fromKey = query.from_ref_key || jalaliDateToRefKeyStart(query.start_date);
  const toKey = query.to_ref_key || jalaliDateToRefKeyEnd(query.end_date);
  if (fromKey) {
    params.push(fromKey);
    where += ` AND bk.ref_key >= $${params.length}`;
  }
  if (toKey) {
    params.push(toKey);
    where += ` AND bk.ref_key <= $${params.length}`;
  }

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ${EWS} = 'new')::int AS wf_new,
      COUNT(*) FILTER (WHERE ${EWS} = 'pending')::int AS wf_pending,
      COUNT(*) FILTER (WHERE ${EWS} = 'reviewed')::int AS wf_reviewed,
      COUNT(*) FILTER (WHERE ${EWS} = 'finalized')::int AS wf_finalized,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'rumor')::int AS rumor,
      COUNT(*) FILTER (WHERE ${DUP_FLAG})::int AS duplicate,
      COUNT(*) FILTER (WHERE bk.priority = 1)::int AS priority_instant,
      COUNT(*) FILTER (WHERE bk.priority = 2)::int AS priority_urgent
    FROM base_key bk
    ${where}
  `;

  const r = await pool.query(sql, params);
  const row = r.rows[0] || {
    total: 0, wf_new: 0, wf_pending: 0, wf_reviewed: 0, wf_finalized: 0,
    pending: 0, approved: 0, rejected: 0, rumor: 0, duplicate: 0,
    priority_instant: 0, priority_urgent: 0,
  };
  return row;
}

async function setNewsCategories(client, newsId, categoryIds) {
  await client.query(`DELETE FROM tbl_news_category_links WHERE news_id = $1`, [newsId]);
  const ids = normalizeIntArray(categoryIds);
  for (const cid of ids) {
    await client.query(
      `INSERT INTO tbl_news_category_links (news_id, category_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [newsId, cid],
    );
  }
}

async function getUserObserverFields(userId) {
  const r = await pool.query(
    `SELECT id, username, name FROM tbl_users WHERE id = $1`,
    [userId],
  );
  const u = r.rows[0];
  if (!u) return { observer_id: userId, observer_username: null, observer_first_name: null };
  return {
    observer_id: u.id,
    observer_username: u.username,
    observer_first_name: u.name,
  };
}

export async function createNewsByMonitor(body = {}, userId = null) {
  const fieldErr = validateNewsEntryPayload(body);
  if (fieldErr) throw new Error(fieldErr);

  const rawText = String(body.raw_text ?? "").trim();
  const plain = stripHtml(rawText);
  if (!plain) throw new Error("متن خبر الزامی است");

  const source = String(body.source ?? "").trim();
  if (!source) throw new Error("منبع الزامی است");

  const sourcePlatform = normalizeSourcePlatform(body.source_platform) || "manual";

  const ingested = await buildCleanedFromRaw({ rawText, source, sourcePlatform });
  const cleaned = ingested.cleaned_text;
  const summary = ingested.summary;
  const relayDate = nowJalaliDate();
  const relayTime = nowTimeHm();
  const sourceDate = normalizeJalaliDate(body.source_date_jalali) || relayDate;
  const sourceTime = normalizeTimeHm(body.source_time_hm) || relayTime;
  const { source_ts_utc, source_ts_tehran } = sourceJalaliToTimestamps(sourceDate, sourceTime);
  const { relay_ts_utc, relay_ts_tehran } = nowRelayTimestamps();
  const observer = await getUserObserverFields(userId);
  const submitNow = !!body.submit;
  let sourceUrl = null;
  if (body.source_url != null && String(body.source_url).trim()) {
    sourceUrl = normalizeSourceUrl(body.source_url);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO tbl_news (
         raw_text, cleaned_text, char_count, hash_key, summary,
         source, sender, priority, source_platform, source_url,
         source_date_jalali, source_time_hm,
         source_ts_utc, source_ts_tehran,
         relay_date_jalali, relay_time_hm,
         relay_ts_utc, relay_ts_tehran,
         observer_id, observer_username, observer_first_name,
         workflow_status, review_state, is_approved, status,
         duplicate_status, is_duplicate,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12,
         $13, $14,
         $15, $16,
         $17, $18,
         $19, $20, $21,
         $22, 'pending', 0, 0,
         'none', false,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       ) RETURNING *`,
      [
        ingested.raw_text,
        cleaned,
        ingested.char_count,
        ingested.hash_key,
        summary,
        source,
        String(observer.observer_first_name ?? observer.observer_username ?? "").trim(),
        clampPriority(body.priority),
        sourcePlatform === "auto" ? null : sourcePlatform,
        sourceUrl,
        sourceDate,
        sourceTime,
        source_ts_utc,
        source_ts_tehran,
        relayDate,
        relayTime,
        relay_ts_utc,
        relay_ts_tehran,
        observer.observer_id,
        observer.observer_username,
        observer.observer_first_name,
        submitNow ? "pending" : "new",
      ],
    );
    const row = ins.rows[0];
    if (body.category_ids !== undefined) {
      await setNewsCategories(client, row.id, body.category_ids);
    }
    await logNewsAudit(client, row.id, userId, "create", {}, row);
    await client.query("COMMIT");
    return enrichRow(row);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function submitNewsForReview(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  if (before.workflow_status !== "new") {
    throw new Error("فقط اخبار جدید قابل ارسال برای بررسی هستند");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET workflow_status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [newsId],
    );
    await logNewsAudit(client, newsId, userId, "submit", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function finalizeNews(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  if (before.workflow_status !== "reviewed") {
    throw new Error("فقط اخبار بررسی‌شده قابل تأیید نهایی هستند");
  }

  const reviewState = before.review_state || inferReviewState(before.is_approved, before.status);
  const legacy = syncLegacyApprovalFields(reviewState, "finalized");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         workflow_status = 'finalized',
         is_approved = $1,
         status = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [legacy.is_approved, legacy.status, userId, newsId],
    );
    await logNewsAudit(client, newsId, userId, "finalize", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function flagDuplicate(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         duplicate_status = 'suspicious',
         is_duplicate = true,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [newsId],
    );
    await logNewsAudit(client, newsId, userId, "flag_duplicate", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function unflagDuplicate(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  if (before.duplicate_status !== "suspicious") {
    throw new Error("فقط اخبار «مشکوک به تکرار» قابل برداشتن علامت هستند");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         duplicate_status = 'none',
         is_duplicate = false,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [newsId],
    );
    await logNewsAudit(client, newsId, userId, "unflag_duplicate", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listDuplicatesPanel(query = {}) {
  const params = [];
  let where = ` WHERE COALESCE(bk.duplicate_status, 'none') IN ('suspicious', 'confirmed')`;

  const q = String(query.q || "").trim();
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    where += ` AND (
      bk.cleaned_text ILIKE $${idx}
      OR bk.raw_text ILIKE $${idx}
      OR bk.source ILIKE $${idx}
    )`;
  }

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT bk.*,
           parent.id AS parent_id,
           parent.source AS parent_source,
           left(COALESCE(parent.cleaned_text, parent.raw_text, ''), 120) AS parent_preview
    FROM base_key bk
    LEFT JOIN tbl_news parent ON parent.id = bk.duplicate_parent_id
    ${where}
    ORDER BY bk.updated_at DESC NULLS LAST, bk.id DESC
    LIMIT 200
  `;
  const r = await pool.query(sql, params);
  return r.rows.map(mapRow);
}

export async function linkDuplicateToParent(id, parentId, userId = null) {
  const newsId = parseInt(id, 10);
  const parentNewsId = parseInt(parentId, 10);
  if (!Number.isFinite(newsId) || !Number.isFinite(parentNewsId)) {
    throw new Error("شناسه نامعتبر است");
  }
  if (newsId === parentNewsId) throw new Error("خبر نمی‌تواند والد خودش باشد");

  const before = await fetchNewsRow(newsId);
  const parent = await fetchNewsRow(parentNewsId);
  if (!before || !parent) throw new Error("خبر یافت نشد");
  const parentDup = parent.duplicate_status || (parent.is_duplicate ? "suspicious" : "none");
  if (parentDup !== "none") {
    throw new Error("خبر مرجع نباید خودش «مشکوک» یا «تکراری تأییدشده» باشد");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         duplicate_parent_id = $1,
         duplicate_status = 'confirmed',
         is_duplicate = true,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [parentNewsId, newsId],
    );
    await logNewsAudit(client, newsId, userId, "link_duplicate", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getNewsAuditLog(newsId) {
  const id = parseInt(newsId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه خبر نامعتبر است");
  const r = await pool.query(
    `SELECT a.*, u.username, u.name AS user_name
     FROM tbl_news_audit_log a
     LEFT JOIN tbl_users u ON u.id = a.user_id
     WHERE a.news_id = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [id],
  );
  return r.rows;
}

export async function clearDuplicateStatus(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  const dup = before.duplicate_status || (before.is_duplicate ? "suspicious" : "none");
  if (dup === "none") throw new Error("این خبر در وضعیت تکراری نیست");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         duplicate_status = 'none',
         duplicate_parent_id = NULL,
         is_duplicate = false,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [newsId],
    );
    await logNewsAudit(client, newsId, userId, "clear_duplicate", before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function searchNewsForParent(q = "") {
  const term = String(q || "").trim();
  if (!term) return [];
  const params = [`%${term}%`];
  const r = await pool.query(
    `${NEWS_REF_KEY_CTE}
     SELECT bk.id, bk.source, bk.ref_key, bk.ref_date, bk.ref_hm,
            bk.source_date_jalali, bk.source_time_hm,
            bk.review_state, bk.workflow_status,
            bk.source_platform, bk.cleaned_text, bk.raw_text,
            COALESCE(bk.cleaned_text, bk.raw_text, '') AS full_text,
            left(COALESCE(bk.cleaned_text, bk.raw_text, ''), 120) AS preview
     FROM base_key bk
     WHERE COALESCE(bk.duplicate_status, 'none') = 'none'
       AND (bk.cleaned_text ILIKE $1 OR bk.raw_text ILIKE $1 OR bk.source ILIKE $1 OR bk.ref_key ILIKE $1)
     ORDER BY bk.ref_key DESC
     LIMIT 20`,
    params,
  );
  return r.rows.map((row) => ({
    ...row,
    display_html: resolveDisplayHtml(row),
  }));
}

export async function updateNewsItem(id, body = {}, userId = null, userRole = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const existing = await fetchNewsRow(newsId);
  if (!existing) return null;
  if (existing.is_deleted) throw new Error("این خبر حذف شده است");
  const roleLevel = resolveNewsRoleLevel(userRole);

  if (roleLevel === "monitor") {
    const fieldErr = validateNewsEntryPayload({
      raw_text: body.raw_text !== undefined ? body.raw_text : existing.raw_text,
      source: body.source !== undefined ? body.source : existing.source,
      source_url: body.source_url !== undefined ? body.source_url : existing.source_url,
    });
    if (fieldErr) throw new Error(fieldErr);
  } else if (
    body.cleaned_text !== undefined
    || body.summary !== undefined
    || body.status_note !== undefined
    || body.source !== undefined
    || body.source_url !== undefined
  ) {
    const fieldErr = validateNewsManagePayload(body);
    if (fieldErr) throw new Error(fieldErr);
  }

  let reviewState = body.review_state != null
    ? String(body.review_state).trim()
    : (existing.review_state || inferReviewState(existing.is_approved, existing.status));
  if (!VALID_REVIEW_STATES.has(reviewState)) reviewState = "pending";

  let workflowStatus = body.workflow_status != null
    ? String(body.workflow_status).trim()
    : inferWorkflowStatus(existing);
  if (!VALID_WORKFLOW_STATES.has(workflowStatus)) workflowStatus = inferWorkflowStatus(existing);

  let duplicateStatus = body.duplicate_status != null
    ? String(body.duplicate_status).trim()
    : (existing.duplicate_status || (existing.is_duplicate ? "suspicious" : "none"));
  if (!VALID_DUPLICATE_STATUSES.has(duplicateStatus)) duplicateStatus = "none";

  if (body.is_duplicate != null && body.duplicate_status == null) {
    duplicateStatus = body.is_duplicate ? "suspicious" : "none";
  }

  const priority = body.priority != null ? clampPriority(body.priority) : clampPriority(existing.priority);
  const quality = body.quality != null ? clampQuality(body.quality) : clampQuality(existing.quality);
  const isDuplicate = duplicateStatusToLegacyFlag(duplicateStatus);

  let rawText = existing.raw_text;
  let cleanedText = body.cleaned_text !== undefined ? body.cleaned_text : existing.cleaned_text;
  let summary = body.summary !== undefined ? body.summary : existing.summary;

  const sourcePlatform = body.source_platform !== undefined
    ? (normalizeSourcePlatform(body.source_platform) || existing.source_platform)
    : existing.source_platform;

  const source = body.source !== undefined ? body.source : existing.source;

  if (roleLevel === "monitor" && body.raw_text !== undefined) {
    rawText = body.raw_text;
    const ingested = await buildCleanedFromRaw({
      rawText: String(rawText ?? "").trim(),
      source: String(source ?? "").trim(),
      sourcePlatform: sourcePlatform || "manual",
    });
    cleanedText = ingested.cleaned_text;
    if (body.summary === undefined) summary = ingested.summary;
  } else if (body.cleaned_text !== undefined) {
    cleanedText = ensureStoredCleanedHtml(cleanedText, null, sourcePlatform);
  }

  if (body.raw_text === undefined && body.cleaned_text === undefined) {
    cleanedText = ensureStoredCleanedHtml(cleanedText, null, sourcePlatform);
  }

  let sourceUrl = existing.source_url;
  if (body.source_url !== undefined) {
    const rawUrl = String(body.source_url ?? "").trim();
    sourceUrl = rawUrl ? normalizeSourceUrl(rawUrl) : null;
  }
  const statusNote = body.status_note !== undefined ? body.status_note : existing.status_note;
  let sender = existing.sender;
  if (roleLevel === "monitor") {
    const observer = await getUserObserverFields(userId);
    sender = String(observer.observer_first_name ?? observer.observer_username ?? "").trim();
  } else if (body.sender !== undefined) {
    sender = body.sender;
  }
  const sourceDate = body.source_date_jalali !== undefined
    ? (normalizeJalaliDate(body.source_date_jalali) || existing.source_date_jalali)
    : existing.source_date_jalali;
  const sourceTime = body.source_time_hm !== undefined
    ? (normalizeTimeHm(body.source_time_hm) || existing.source_time_hm)
    : existing.source_time_hm;
  const duplicateParentId = body.duplicate_parent_id !== undefined
    ? body.duplicate_parent_id
    : existing.duplicate_parent_id;

  if (roleLevel === "monitor") {
    if (existing.observer_id !== userId) {
      throw new Error("فقط پیش‌نویس‌ها و اخبار ثبت‌شده توسط خودتان قابل ویرایش است");
    }
    if (!["new", "pending"].includes(existing.workflow_status || inferWorkflowStatus(existing))) {
      throw new Error("پایشگر فقط اخبار جدید یا در انتظار را ویرایش می‌کند");
    }
  }

  const VERDICT_STATES = new Set(["approved", "rejected", "rumor"]);
  const verdictGiven = body.review_state != null && VERDICT_STATES.has(reviewState);

  if (roleLevel === "editor" || roleLevel === "chief" || roleLevel === "admin") {
    if (verdictGiven && workflowStatus === "pending") {
      workflowStatus = "reviewed";
    }
  }

  const legacy = syncLegacyApprovalFields(reviewState, workflowStatus);
  const cleanedPlain = stripHtml(cleanedText);
  const charCount = computeCharCount(cleanedPlain);
  const hashKey = computeHashKey(cleanedPlain, source);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         raw_text = $1,
         cleaned_text = $2,
         char_count = $3,
         hash_key = $4,
         source = $5,
         sender = $6,
         source_date_jalali = $7,
         source_time_hm = $8,
         summary = $9,
         status_note = $10,
         is_approved = $11,
         status = $12,
         priority = $13,
         quality = $14,
         review_state = $15,
         workflow_status = $16,
         duplicate_status = $17,
         duplicate_parent_id = $18,
         is_duplicate = $19,
         source_platform = $20,
         source_url = $21,
         reviewed_by = CASE WHEN $23 THEN $22 ELSE reviewed_by END,
         reviewed_at = CASE WHEN $23 THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $24
       RETURNING *`,
      [
        rawText,
        cleanedText,
        charCount,
        hashKey,
        source,
        sender,
        sourceDate,
        sourceTime,
        summary,
        statusNote,
        legacy.is_approved,
        legacy.status,
        priority,
        quality,
        reviewState,
        workflowStatus,
        duplicateStatus,
        duplicateParentId,
        isDuplicate,
        sourcePlatform,
        sourceUrl,
        userId ?? null,
        verdictGiven,
        newsId,
      ],
    );

    if (body.category_ids !== undefined) {
      await setNewsCategories(client, newsId, body.category_ids);
    }

    await logNewsAudit(client, newsId, userId, "update", existing, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateNewsLegacy(id, body = {}, userId = null) {
  const patch = { ...body };
  if (body.is_approved != null || body.status != null) {
    const ia = body.is_approved != null ? parseInt(body.is_approved, 10) : undefined;
    const st = body.status != null ? parseInt(body.status, 10) : undefined;
    const row = (await pool.query(`SELECT is_approved, status FROM tbl_news WHERE id = $1`, [id])).rows[0];
    if (row) {
      patch.review_state = inferReviewState(
        ia != null ? ia : row.is_approved,
        st != null ? st : row.status,
      );
    }
  }
  return updateNewsItem(id, patch, userId, "admin");
}

export async function listDistinctSources() {
  const r = await pool.query(
    `SELECT DISTINCT source FROM tbl_news
     WHERE source IS NOT NULL AND trim(source) <> ''
       AND COALESCE(is_deleted, false) = false
     ORDER BY source`,
  );
  return r.rows.map((row) => row.source);
}

/** حذف فیزیکی پیش‌نویس (workflow_status = new) از پایگاه */
export async function deleteDraftPermanently(id, userId = null, userRole = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;

  const ws = before.workflow_status || inferWorkflowStatus(before);
  if (ws !== "new") throw new Error("فقط پیش‌نویس‌ها قابل حذف قطعی هستند");

  const roleLevel = resolveNewsRoleLevel(userRole);
  if (roleLevel === "monitor") {
    if (before.observer_id !== userId) {
      throw new Error("فقط پیش‌نویس‌های خودتان قابل حذف است");
    }
  } else if (roleLevel !== "admin") {
    throw new Error("دسترسی حذف پیش‌نویس مجاز نیست");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM tbl_news_category_links WHERE news_id = $1`, [newsId]);
    await client.query(`DELETE FROM tbl_news_audit_log WHERE news_id = $1`, [newsId]);
    const del = await client.query(
      `DELETE FROM tbl_news WHERE id = $1 AND workflow_status = 'new' RETURNING id`,
      [newsId],
    );
    if (!del.rows[0]) throw new Error("پیش‌نویس یافت نشد");
    await client.query("COMMIT");
    return { id: newsId, deleted: true, permanent: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function buildExportPayload(row, format) {
  const fmt = normalizeFormat(format);
  if (!fmt) throw new Error("format نامعتبر است (bale|telegram|html|plain)");
  const source = row.cleaned_text || row.raw_text || "";
  const text = exportCleanedText(source, fmt);
  const plain = exportCleanedText(source, "plain");
  return {
    id: row.id,
    format: fmt,
    text,
    plain,
    source: row.source,
    source_platform: row.source_platform ?? null,
    source_url: row.source_url ?? null,
    ref_key: row.ref_key ?? null,
  };
}

export async function getNewsExportText(id, format) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");
  const row = await fetchNewsRow(newsId);
  if (!row) return null;
  return buildExportPayload(row, format);
}

export async function bulkExportNewsText(query = {}, format, userId = null) {
  const fmt = normalizeFormat(format);
  if (!fmt) throw new Error("format نامعتبر است (bale|telegram|html|plain)");
  const rows = await listNewsMonitor(query, userId);
  return rows.map((row) => buildExportPayload(row, fmt));
}

export async function softDeleteNews(id, userId = null, userRole = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  if (before.is_deleted) throw new Error("این خبر قبلاً حذف شده است");

  const roleLevel = resolveNewsRoleLevel(userRole);
  const ws = before.workflow_status || inferWorkflowStatus(before);

  if (roleLevel === "monitor") {
    if (ws !== "new" || before.observer_id !== userId) {
      throw new Error("فقط پیش‌نویس‌های خودتان قابل حذف است");
    }
  } else if (!["editor", "chief", "admin"].includes(roleLevel)) {
    throw new Error("دسترسی حذف مجاز نیست");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         is_deleted = true,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND COALESCE(is_deleted, false) = false
       RETURNING *`,
      [newsId, userId ?? null],
    );
    if (!upd.rows[0]) throw new Error("خبر یافت نشد");
    await logNewsAudit(client, newsId, userId, "soft_delete", before, upd.rows[0]);
    await client.query("COMMIT");
    return { id: newsId, deleted: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
