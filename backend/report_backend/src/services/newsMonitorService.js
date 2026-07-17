import pool from "../db.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import {
  VALID_REVIEW_STATES,
  VALID_WORKFLOW_STATES,
  VALID_PUBLISH_STATUSES,
  VALID_DUPLICATE_STATUSES,
  syncLegacyApprovalFields,
  inferReviewState,
  inferWorkflowStatus,
  resolveDuplicateStatus,
  normalizeDbEnum,
  clampPriority,
  clampQuality,
  duplicateStatusToLegacyFlag,
  clampRelevanceStatus,
  clampEditorialState,
  VALID_RELEVANCE_STATUSES,
  VALID_EDITORIAL_STATES,
} from "../constants/newsMonitorMeta.js";
import {
  computeCharCount,
  computeHashKey,
  normalizePlainForCompare,
  nowJalaliDate,
  nowTimeHm,
  normalizeJalaliDate,
  normalizeTimeHm,
  stripHtml,
  sourceJalaliToTimestamps,
  nowRelayTimestamps,
  normalizeSourceUrl,
  reconcileSourceDateWithRelay,
  computeReportRefFields,
} from "./newsTextUtils.js";
import { buildCleanedFromRaw } from "./newsIngest/newsIngestPipeline.js";
import { assertNewsSubmissionAllowed, getNewsEntrySettings } from "./newsEntrySettingsService.js";
import { assertNewsDuplicateAllowed } from "./duplicateCheckService.js";
import {
  RESOLVED_SENDER_NAME_SQL,
  RESOLVED_USER_ID_SQL,
  SENDER_RESOLVE_JOINS,
} from "../utils/senderResolveSql.js";
import {
  exportCleanedText,
  resolveDisplayHtml,
  ensureStoredCleanedHtml,
  normalizeFormat,
  normalizeSourcePlatform,
} from "./newsFormat/index.js";
import { validateNewsEntryPayload, validateNewsManagePayload, validateHighPrioritySummaryRequired } from "../constants/newsFieldLimits.js";
import { pgUniqueViolationMessage } from "../utils/pgErrors.js";
import {
  sqlNewsDuplicateStatus,
  sqlNewsWorkflow,
  sqlEffectiveNewsWorkflow,
  sqlNewsReviewState,
  sqlNewsIsFlaggedDuplicate,
  sqlNewsPublishStatus,
} from "./newsDbEnums.js";
import moment from "jalali-moment";
import { similarityPercent } from "./textSimilarity.js";
import { clampThreshold } from "../utils/duplicateCheckScope.js";

const WS = sqlNewsWorkflow();
const EWS = sqlEffectiveNewsWorkflow();
const DS = sqlNewsDuplicateStatus();
const RS = sqlNewsReviewState();
const PS = sqlNewsPublishStatus();
const DUP_FLAG = sqlNewsIsFlaggedDuplicate();

/** CTE هم‌راستا با query واکشی n8n — ref_key با اصلاح نیمه‌شب (source_time > relay_time) */
export const NEWS_REF_KEY_CTE = `
  WITH base AS (
    SELECT
      n.*,
      CASE
        WHEN n.report_ref_date_jalali IS NOT NULL AND trim(n.report_ref_date_jalali) <> ''
             AND n.report_ref_time_hm IS NOT NULL AND trim(n.report_ref_time_hm) <> ''
          THEN trim(n.report_ref_date_jalali)
        WHEN n.source_date_jalali IS NOT NULL
             AND trim(n.source_date_jalali) <> ''
             AND n.source_time_hm IS NOT NULL
             AND trim(n.source_time_hm) <> ''
          THEN trim(n.source_date_jalali)
        ELSE trim(n.relay_date_jalali)
      END AS raw_ref_date,
      lpad(
        regexp_replace(
          CASE
            WHEN n.report_ref_date_jalali IS NOT NULL AND trim(n.report_ref_date_jalali) <> ''
                 AND n.report_ref_time_hm IS NOT NULL AND trim(n.report_ref_time_hm) <> ''
              THEN n.report_ref_time_hm
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
      ) AS raw_ref_hm,
      trim(n.relay_date_jalali) AS relay_ref_date,
      lpad(regexp_replace(n.relay_time_hm, '\\D','','g'), 4, '0') AS relay_ref_hm
    FROM tbl_news n
    WHERE COALESCE(NULLIF(trim(n.cleaned_text), ''), NULLIF(trim(n.raw_text), '')) IS NOT NULL
      AND COALESCE(n.is_deleted, false) = false
  ),
  adjusted AS (
    SELECT
      *,
      CASE
        WHEN report_ref_date_jalali IS NOT NULL AND trim(report_ref_date_jalali) <> ''
          THEN trim(report_ref_date_jalali)
        ELSE raw_ref_date
      END AS ref_date,
      CASE
        WHEN report_ref_date_jalali IS NOT NULL AND trim(report_ref_date_jalali) <> ''
          THEN lpad(regexp_replace(report_ref_time_hm, '\\D', '', 'g'), 4, '0')
        ELSE raw_ref_hm
      END AS ref_hm
    FROM base
  ),
  base_key AS (
    SELECT *, (regexp_replace(ref_date, '[^0-9]', '', 'g') || ref_hm) AS ref_key FROM adjusted
  )
`;

const AUDIT_FIELDS = [
  "raw_text", "cleaned_text", "source", "sender", "priority", "quality",
  "review_state", "workflow_status", "publish_status", "duplicate_status", "duplicate_parent_id",
  "status_note", "monitor_note", "is_duplicate", "is_approved", "status",
  "relevance_status", "editorial_state", "editorial_at", "editorial_by", "editorial_run_id",
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

function normalizeMonitorNote(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > 100 ? s.slice(0, 100) : s;
}

/** فیلترهای مشترک لیست مانیتور — برای پالایش هوشمند روی همان نمای فیلترشده */
export function appendNewsMonitorFilters(params, where, query = {}, options = {}) {
  const {
    skipEditorialState = false,
    skipWorkflow = false,
    skipReview = false,
    reviewDefault = "all",
  } = options;

  const duplicateMode = String(query.duplicate || "exclude").toLowerCase();
  if (duplicateMode === "exclude") {
    where += ` AND NOT ${DUP_FLAG}`;
  } else if (duplicateMode === "only") {
    where += ` AND ${DUP_FLAG}`;
  } else if (duplicateMode === "suspicious") {
    where += ` AND (${DS} = 'suspicious' OR (COALESCE(bk.is_duplicate, false) = true AND ${DS} = 'none'))`;
  }

  const relevanceMode = String(query.relevance || "active").toLowerCase();
  if (relevanceMode === "active") {
    where += ` AND COALESCE(bk.relevance_status, 'unset') <> 'irrelevant'`;
  } else if (relevanceMode === "relevant") {
    where += ` AND COALESCE(bk.relevance_status, 'unset') = 'relevant'`;
  } else if (relevanceMode === "irrelevant") {
    where += ` AND COALESCE(bk.relevance_status, 'unset') = 'irrelevant'`;
  }

  if (!skipEditorialState) {
    const editorialState = String(query.editorial_state || "").trim();
    if (editorialState && VALID_EDITORIAL_STATES.has(editorialState)) {
      params.push(editorialState);
      where += ` AND COALESCE(bk.editorial_state, 'pending') = $${params.length}`;
    }
  }

  if (!skipWorkflow) {
    const workflowStatus = String(query.workflow_status || "").trim();
    if (workflowStatus && workflowStatus !== "all" && VALID_WORKFLOW_STATES.has(workflowStatus)) {
      params.push(workflowStatus);
      where += ` AND ${EWS} = $${params.length}`;
    }
  }

  if (!skipReview) {
    const reviewState = String(query.review_state ?? reviewDefault).trim();
    if (reviewState && reviewState !== "all" && VALID_REVIEW_STATES.has(reviewState)) {
      params.push(reviewState);
      where += ` AND ${RS} = $${params.length}`;
    }
  }

  const publishStatus = String(query.publish_status || "").trim();
  if (publishStatus && publishStatus !== "all" && VALID_PUBLISH_STATUSES.has(publishStatus)) {
    params.push(publishStatus);
    where += ` AND ${PS} = $${params.length}`;
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

  return { params, where };
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
  const pub = normalizeDbEnum(row.publish_status, "none");
  return {
    ...row,
    review_state: rs,
    workflow_status: ws,
    publish_status: VALID_PUBLISH_STATUSES.has(pub) ? pub : "none",
    duplicate_status: dup,
    relevance_status: clampRelevanceStatus(row.relevance_status),
    editorial_state: clampEditorialState(row.editorial_state),
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
  let params = [];
  let where = ` WHERE 1=1`;

  const myDrafts = query.my_drafts === "1" || query.my_drafts === "true";
  const mySubmissions = query.my_submissions === "1" || query.my_submissions === "true";

  if (mySubmissions) {
    const uid = parseInt(userId ?? query.observer_id, 10);
    if (!Number.isFinite(uid)) throw new Error("کاربر نامعتبر است");
    params.push(uid);
    where += ` AND bk.observer_id = $${params.length}`;
    where += ` AND ${WS} IN ('pending', 'reviewed', 'finalized')`;
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
  } else if (myDrafts) {
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

  ({ params, where } = appendNewsMonitorFilters(params, where, query, { reviewDefault: "pending" }));

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT bk.*,
           COUNT(*) OVER()::int AS __filter_total,
           ${RESOLVED_USER_ID_SQL} AS resolved_user_id,
           ${RESOLVED_SENDER_NAME_SQL} AS resolved_sender_name,
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
    ${SENDER_RESOLVE_JOINS}
    ${where}
    ORDER BY bk.ref_key DESC, bk.id DESC
    LIMIT ${mySubmissions ? 100 : 20000}
  `;

  const r = await pool.query(sql, params);
  const total = r.rows[0]?.__filter_total ?? 0;
  const items = r.rows.map((row) => {
    const { __filter_total: _t, ...rest } = row;
    return mapRow(rest);
  });
  return { items, total };
}

export async function getSummaryStats(query = {}) {
  let params = [];
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

  // همان فیلترهای لیست مانیتور — آمار باید با نمای فرم هم‌خوان باشد
  ({ params, where } = appendNewsMonitorFilters(params, where, query, { reviewDefault: "pending" }));

  // پالایش‌نشده = همان معیار isEditorialCandidate در فرانت
  const editorialCandidate = `(
    COALESCE(${DS}, 'none') = 'none'
    AND (
      COALESCE(bk.editorial_state, 'pending') = 'pending'
      OR (
        COALESCE(bk.editorial_state, 'pending') = 'ai'
        AND COALESCE(bk.relevance_status, 'unset') = 'unset'
      )
    )
  )`;

  const sql = `
    ${NEWS_REF_KEY_CTE}
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ${EWS} = 'new')::int AS wf_new,
      COUNT(*) FILTER (WHERE ${EWS} = 'pending')::int AS wf_pending,
      COUNT(*) FILTER (WHERE ${EWS} = 'reviewed')::int AS wf_reviewed,
      COUNT(*) FILTER (
        WHERE ${EWS} = 'finalized'
          AND COALESCE(bk.review_state, 'pending') <> 'rejected'
          AND ${PS} = 'ready'
      )::int AS wf_finalized,
      COUNT(*) FILTER (
        WHERE ${EWS} = 'finalized'
          AND COALESCE(bk.review_state, 'pending') <> 'rejected'
          AND ${PS} = 'banked'
      )::int AS wf_banked,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE COALESCE(bk.review_state, 'pending') = 'rumor')::int AS rumor,
      COUNT(*) FILTER (WHERE ${DUP_FLAG})::int AS duplicate,
      COUNT(*) FILTER (WHERE bk.priority = 1)::int AS priority_instant,
      COUNT(*) FILTER (WHERE bk.priority = 2)::int AS priority_urgent,
      COUNT(*) FILTER (
        WHERE COALESCE(bk.relevance_status, 'unset') IN ('relevant', 'unset') AND NOT ${DUP_FLAG}
      )::int AS relevant,
      COUNT(*) FILTER (
        WHERE COALESCE(bk.relevance_status, 'unset') = 'unset' AND NOT ${DUP_FLAG}
      )::int AS relevance_unset,
      COUNT(*) FILTER (
        WHERE COALESCE(bk.relevance_status, 'unset') = 'relevant' AND NOT ${DUP_FLAG}
      )::int AS relevance_confirmed,
      COUNT(*) FILTER (WHERE COALESCE(bk.relevance_status, 'unset') = 'irrelevant')::int AS irrelevant,
      COUNT(*) FILTER (WHERE ${editorialCandidate})::int AS unprocessed
    FROM base_key bk
    ${where}
  `;

  const r = await pool.query(sql, params);
  const row = r.rows[0] || {
    total: 0, wf_new: 0, wf_pending: 0, wf_reviewed: 0, wf_finalized: 0, wf_banked: 0,
    pending: 0, approved: 0, rejected: 0, rumor: 0, duplicate: 0,
    priority_instant: 0, priority_urgent: 0, relevant: 0, relevance_unset: 0,
    relevance_confirmed: 0, irrelevant: 0, unprocessed: 0,
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

export async function createNewsByMonitor(body = {}, user = null) {
  const userId = user?.id ?? null;
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

  await assertNewsDuplicateAllowed(body, {
    raw_text: rawText,
    source,
    hash_key: ingested.hash_key,
    plain: ingested.cleaned_plain,
    reference_date: relayDate,
  });
  const relayTime = nowTimeHm();
  let sourceDate = normalizeJalaliDate(body.source_date_jalali) || relayDate;
  let sourceTime = normalizeTimeHm(body.source_time_hm) || relayTime;
  ({ sourceDate, sourceTime } = reconcileSourceDateWithRelay(sourceDate, sourceTime, relayDate, relayTime));
  const { ref_date: reportRefDate, ref_hm: reportRefHm } = computeReportRefFields(
    sourceDate, sourceTime, relayDate, relayTime, new Date(),
  );
  const { source_ts_utc, source_ts_tehran } = sourceJalaliToTimestamps(sourceDate, sourceTime);
  const { relay_ts_utc, relay_ts_tehran } = nowRelayTimestamps();
  const observer = await getUserObserverFields(userId);
  const submitNow = !!body.submit;
  if (submitNow && user) {
    await assertNewsSubmissionAllowed(user, relayDate);
  }
  const monitorNote = normalizeMonitorNote(body.monitor_note);
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
         report_ref_date_jalali, report_ref_time_hm,
         observer_id, observer_username, observer_first_name,
         monitor_note,
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
         $19, $20,
         $21, $22, $23,
         $24,
         $25, 'pending', 0, 0,
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
        reportRefDate,
        reportRefHm,
        observer.observer_id,
        observer.observer_username,
        observer.observer_first_name,
        monitorNote,
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

export async function submitNewsForReview(id, user = null, body = {}) {
  const userId = user?.id ?? null;
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  if (before.workflow_status !== "new") {
    throw new Error("فقط اخبار جدید قابل ارسال برای بررسی هستند");
  }

  const relayDate = before.relay_date_jalali || nowJalaliDate();

  await assertNewsDuplicateAllowed(body, {
    raw_text: before.raw_text,
    source: before.source,
    exclude_id: newsId,
    reference_date: relayDate,
  });

  if (user) {
    await assertNewsSubmissionAllowed(user, relayDate);
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

const CHIEF_POSITIVE_VERDICTS = new Set(["approved", "rumor"]);

async function assertChiefQueueRow(newsId) {
  const before = await fetchNewsRow(newsId);
  if (!before) return null;
  const ws = normalizeDbEnum(before.workflow_status);
  if (ws !== "reviewed") {
    throw new Error("فقط اخبار ارسال‌شده به سردبیر قابل پردازش هستند");
  }
  return before;
}

function resolveReviewState(row) {
  return normalizeDbEnum(row.review_state) || inferReviewState(row.is_approved, row.status);
}

function appendChiefNote(existingNote, chiefNote) {
  const note = String(chiefNote ?? "").trim();
  if (!note) throw new Error("یادداشت الزامی است");
  const prefix = "[برگشت سردبیر]";
  const existing = String(existingNote ?? "").trim();
  return existing ? `${existing}\n${prefix} ${note}` : `${prefix} ${note}`;
}

async function applyChiefFinalize(newsId, userId, before, publishStatus, auditAction) {
  const reviewState = resolveReviewState(before);
  const legacy = syncLegacyApprovalFields(reviewState, "finalized");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         workflow_status = 'finalized',
         publish_status = $1,
         is_approved = $2,
         status = $3,
         reviewed_by = $4,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [publishStatus, legacy.is_approved, legacy.status, userId, newsId],
    );
    await logNewsAudit(client, newsId, userId, auditAction, before, upd.rows[0]);
    await client.query("COMMIT");
    return enrichRow(upd.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** تأیید برگشت دبیر — فقط review_state = rejected */
export async function finalizeNews(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await assertChiefQueueRow(newsId);
  if (!before) return null;

  const reviewState = resolveReviewState(before);
  if (reviewState !== "rejected") {
    throw new Error("برای تأیید انتشار از «تأیید و انتشار» یا «بانک انتظار» استفاده کنید");
  }

  const legacy = syncLegacyApprovalFields(reviewState, "finalized");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         workflow_status = 'finalized',
         publish_status = 'none',
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

export async function finalizeNewsPublish(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await assertChiefQueueRow(newsId);
  if (!before) return null;

  const reviewState = resolveReviewState(before);
  if (!CHIEF_POSITIVE_VERDICTS.has(reviewState)) {
    throw new Error("فقط اخبار تأیید یا شایعه قابل تأیید انتشار هستند");
  }

  return applyChiefFinalize(newsId, userId, before, "ready", "chief_publish");
}

export async function finalizeNewsBank(id, userId = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await assertChiefQueueRow(newsId);
  if (!before) return null;

  const reviewState = resolveReviewState(before);
  if (!CHIEF_POSITIVE_VERDICTS.has(reviewState)) {
    throw new Error("فقط اخبار تأیید یا شایعه قابل ثبت در بانک انتظار هستند");
  }

  return applyChiefFinalize(newsId, userId, before, "banked", "chief_bank");
}

export async function chiefRejectNews(id, userId = null, chiefNote = "") {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const before = await assertChiefQueueRow(newsId);
  if (!before) return null;

  const reviewState = resolveReviewState(before);
  if (!CHIEF_POSITIVE_VERDICTS.has(reviewState)) {
    throw new Error("فقط اخبار تأیید یا شایعه قابل برگشت به دبیر هستند");
  }

  const statusNote = appendChiefNote(before.status_note, chiefNote);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE tbl_news SET
         workflow_status = 'pending',
         review_state = 'pending',
         publish_status = 'none',
         is_approved = 0,
         status = 0,
         status_note = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [statusNote, userId, newsId],
    );
    await logNewsAudit(client, newsId, userId, "chief_reject", before, upd.rows[0]);
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
  const status = String(query.status || "suspicious").toLowerCase();
  const confirmedDaysRaw = query.confirmed_days;
  const confirmedDays = confirmedDaysRaw === "0" || confirmedDaysRaw === 0
    ? 0
    : (Number.isFinite(parseInt(confirmedDaysRaw, 10))
      ? Math.max(0, parseInt(confirmedDaysRaw, 10))
      : 30);

  let where = ` WHERE 1=1`;

  if (status === "confirmed") {
    where += ` AND COALESCE(bk.duplicate_status, 'none') = 'confirmed'`;
    if (confirmedDays > 0) {
      params.push(confirmedDays);
      where += ` AND bk.updated_at >= (CURRENT_TIMESTAMP - ($${params.length}::int * INTERVAL '1 day'))`;
    }
  } else if (status === "all") {
    where += ` AND COALESCE(bk.duplicate_status, 'none') IN ('suspicious', 'confirmed')`;
    if (confirmedDays > 0) {
      params.push(confirmedDays);
      where += ` AND (
        COALESCE(bk.duplicate_status, 'none') = 'suspicious'
        OR bk.updated_at >= (CURRENT_TIMESTAMP - ($${params.length}::int * INTERVAL '1 day'))
      )`;
    }
  } else {
    // پیش‌فرض: فقط مشکوک‌های تعیین‌تکلیف‌نشده
    where += ` AND COALESCE(bk.duplicate_status, 'none') = 'suspicious'`;
  }

  // اخبار برگشت‌به‌فرستنده مثل حذف منطقی از پنل تکراری‌ها خارج می‌شوند
  where += ` AND ${RS} <> 'rejected' AND COALESCE(bk.is_approved, 0)::int <> 2`;

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

/** آمار پنل تکراری‌ها (بدون محدودیت تاریخ برای شمارش کل؛ بدون برگشتی‌ها) */
export async function getDuplicatesPanelStats() {
  const r = await pool.query(
    `${NEWS_REF_KEY_CTE}
     SELECT
       COUNT(*) FILTER (
         WHERE COALESCE(bk.duplicate_status, 'none') = 'suspicious'
           AND ${RS} <> 'rejected'
           AND COALESCE(bk.is_approved, 0)::int <> 2
       )::int AS suspicious,
       COUNT(*) FILTER (
         WHERE COALESCE(bk.duplicate_status, 'none') = 'confirmed'
           AND ${RS} <> 'rejected'
           AND COALESCE(bk.is_approved, 0)::int <> 2
       )::int AS confirmed,
       COUNT(*) FILTER (
         WHERE COALESCE(bk.duplicate_status, 'none') = 'confirmed'
           AND ${RS} <> 'rejected'
           AND COALESCE(bk.is_approved, 0)::int <> 2
           AND bk.updated_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
       )::int AS confirmed_30d
     FROM base_key bk`,
  );
  const row = r.rows[0] || {};
  return {
    suspicious: row.suspicious || 0,
    confirmed: row.confirmed || 0,
    confirmed_30d: row.confirmed_30d || 0,
  };
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
  const parentReview = normalizeDbEnum(parent.review_state) || inferReviewState(parent.is_approved, parent.status);
  if (parentReview === "rejected" || Number(parent.is_approved) === 2) {
    throw new Error("خبر برگشت‌خورده نمی‌تواند مرجع باشد");
  }
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
       AND ${RS} <> 'rejected'
       AND COALESCE(bk.is_approved, 0)::int <> 2
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

const SIMILARITY_RANGE_KEYS = new Set(["today", "2days", "week"]);
const MAX_SIMILAR_CANDIDATES = 250;
const MAX_SIMILAR_RESULTS = 50;
const DEFAULT_SIMILAR_MIN_PERCENT = 76; // بالای ۷۵٪

/**
 * بازه نسبت به تاریخ خودِ خبر مشکوک (نه روز جاری سیستم)
 * today = همان روز · 2days = ±۱ روز · week = ±۷ روز
 * @param {string} range
 * @param {string|null} referenceJalali
 */
function getDuplicatesSimilarityRange(range, referenceJalali = null) {
  const key = SIMILARITY_RANGE_KEYS.has(range) ? range : "today";
  const fmt = "jYYYY-jMM-jDD";
  const cleaned = String(referenceJalali || "").trim().replace(/\//g, "-");
  let ref = cleaned
    ? moment(cleaned, fmt).locale("fa")
    : moment().locale("fa");
  if (!ref.isValid()) ref = moment().locale("fa");

  let startM = ref.clone();
  let endM = ref.clone();
  if (key === "2days") {
    startM = ref.clone().subtract(1, "days");
    endM = ref.clone().add(1, "days");
  } else if (key === "week") {
    startM = ref.clone().subtract(7, "days");
    endM = ref.clone().add(7, "days");
  }

  return {
    key,
    start: startM.format(fmt),
    end: endM.format(fmt),
    anchor_date: ref.format(fmt),
  };
}

/**
 * یافتن اخبار مشابه در بازهٔ تاریخ نسبت به تاریخ خود خبر
 * اخبار «برگشت به فرستنده» از نتایج حذف می‌شوند.
 * @param {number|string} id
 * @param {{ range?: string, min_percent?: number }} opts
 */
export async function findSimilarNewsForDuplicate(id, opts = {}) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const anchorRes = await pool.query(
    `${NEWS_REF_KEY_CTE}
     SELECT bk.* FROM base_key bk WHERE bk.id = $1`,
    [newsId],
  );
  const anchor = anchorRes.rows[0];
  if (!anchor) throw new Error("خبر یافت نشد");

  const rangeInfo = getDuplicatesSimilarityRange(opts.range, anchor.ref_date);
  const minPercent = clampThreshold(
    opts.min_percent ?? DEFAULT_SIMILAR_MIN_PERCENT,
    76,
    95,
  );
  const fromKey = jalaliDateToRefKeyStart(rangeInfo.start);
  const toKey = jalaliDateToRefKeyEnd(rangeInfo.end);

  const anchorPlain = stripHtml(anchor.cleaned_text || anchor.raw_text || "");
  if (!anchorPlain.trim()) {
    return { range: rangeInfo, min_percent: minPercent, items: [] };
  }

  const candRes = await pool.query(
    `${NEWS_REF_KEY_CTE}
     SELECT bk.id, bk.source, bk.ref_key, bk.ref_date, bk.ref_hm,
            bk.source_date_jalali, bk.source_time_hm,
            bk.relay_date_jalali, bk.relay_time_hm,
            bk.review_state, bk.workflow_status, bk.priority, bk.quality,
            bk.duplicate_status, bk.duplicate_parent_id, bk.is_duplicate,
            bk.source_platform, bk.cleaned_text, bk.raw_text, bk.updated_at,
            left(COALESCE(bk.cleaned_text, bk.raw_text, ''), 160) AS preview
     FROM base_key bk
     WHERE bk.id <> $1
       AND bk.ref_key >= $2
       AND bk.ref_key <= $3
       AND ${RS} <> 'rejected'
       AND COALESCE(bk.is_approved, 0)::int <> 2
     ORDER BY bk.ref_key DESC
     LIMIT ${MAX_SIMILAR_CANDIDATES}`,
    [newsId, fromKey, toKey],
  );

  const scored = [];
  for (const row of candRes.rows) {
    const plain = stripHtml(row.cleaned_text || row.raw_text || "");
    const pct = similarityPercent(anchorPlain, plain);
    if (pct < minPercent) continue;
    scored.push({
      ...mapRow(row),
      similarity_percent: pct,
      preview: row.preview,
      display_html: resolveDisplayHtml(row),
      full_text: row.cleaned_text || row.raw_text || "",
    });
  }

  scored.sort((a, b) => {
    if (b.similarity_percent !== a.similarity_percent) {
      return b.similarity_percent - a.similarity_percent;
    }
    return String(b.ref_key || "").localeCompare(String(a.ref_key || ""));
  });

  return {
    range: rangeInfo,
    min_percent: minPercent,
    items: scored.slice(0, MAX_SIMILAR_RESULTS),
  };
}

/**
 * خوشه‌بندی: قدیمی‌ترین خبر = مرجع؛ بقیه تأیید تکراری و پیوند به آن.
 * مرجع با بهترین اهمیت/کیفیت، تأیید (اگر عضوی تأیید باشد) و اتحاد موضوعات غنی می‌شود.
 * @param {Array<number|string>} newsIds
 * @param {number|null} userId
 */
export async function clusterLinkDuplicates(newsIds, userId = null) {
  const ids = [...new Set(
    (Array.isArray(newsIds) ? newsIds : [])
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n)),
  )];
  if (ids.length < 2) throw new Error("حداقل دو خبر برای خوشه‌بندی لازم است");

  const fetched = await pool.query(
    `${NEWS_REF_KEY_CTE}
     SELECT bk.* FROM base_key bk WHERE bk.id = ANY($1::int[])`,
    [ids],
  );
  const usable = fetched.rows.filter((row) => {
    const rs = normalizeDbEnum(row.review_state) || inferReviewState(row.is_approved, row.status);
    return rs !== "rejected" && Number(row.is_approved) !== 2;
  });
  if (usable.length < 2) {
    throw new Error("اخبار کافی برای خوشه‌بندی یافت نشد (اخبار برگشت‌خورده قابل خوشه نیستند)");
  }

  const sorted = [...usable].sort((a, b) => {
    const ka = String(a.ref_key || "");
    const kb = String(b.ref_key || "");
    if (ka !== kb) return ka < kb ? -1 : 1;
    return Number(a.id) - Number(b.id);
  });
  const parentRow = sorted[0];
  const children = sorted.slice(1);
  const cluster = [parentRow, ...children];

  // اهمیت: ۱ = فوری → کمترین عدد = قوی‌ترین اهمیت
  let bestPriority = clampPriority(parentRow.priority);
  // کیفیت: ۵ = عالی → بیشترین عدد
  let bestQuality = clampQuality(parentRow.quality);
  let anyApproved = false;
  for (const row of cluster) {
    const p = clampPriority(row.priority);
    if (p < bestPriority) bestPriority = p;
    const q = clampQuality(row.quality);
    if (q > bestQuality) bestQuality = q;
    const rs = normalizeDbEnum(row.review_state) || inferReviewState(row.is_approved, row.status);
    if (rs === "approved") anyApproved = true;
  }

  const parentReview = normalizeDbEnum(parentRow.review_state)
    || inferReviewState(parentRow.is_approved, parentRow.status);
  const nextReview = anyApproved ? "approved" : parentReview;
  const parentWorkflow = normalizeDbEnum(parentRow.workflow_status)
    || inferWorkflowStatus(parentRow);
  // اگر عضوی تأیید شده و مرجع هنوز در صف اولیه است، به «بررسی‌شده» برود تا حکم تأیید دیده شود
  let nextWorkflow = parentWorkflow;
  if (anyApproved && (parentWorkflow === "new" || parentWorkflow === "pending")) {
    nextWorkflow = "reviewed";
  }
  const legacy = syncLegacyApprovalFields(nextReview, nextWorkflow);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const parentDup = resolveDuplicateStatus(parentRow);
    if (parentDup !== "none") {
      const cleared = await client.query(
        `UPDATE tbl_news SET
           duplicate_status = 'none',
           duplicate_parent_id = NULL,
           is_duplicate = false,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [parentRow.id],
      );
      await logNewsAudit(client, parentRow.id, userId, "clear_duplicate", parentRow, cleared.rows[0]);
    }

    const catRes = await client.query(
      `SELECT DISTINCT category_id
       FROM tbl_news_category_links
       WHERE news_id = ANY($1::int[])`,
      [cluster.map((r) => r.id)],
    );
    const mergedCategoryIds = catRes.rows.map((r) => r.category_id);

    const enriched = await client.query(
      `UPDATE tbl_news SET
         priority = $1,
         quality = $2,
         review_state = $3,
         workflow_status = $4,
         is_approved = $5,
         status = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [
        bestPriority,
        bestQuality,
        nextReview,
        nextWorkflow,
        legacy.is_approved,
        legacy.status,
        parentRow.id,
      ],
    );
    await setNewsCategories(client, parentRow.id, mergedCategoryIds);
    await logNewsAudit(
      client,
      parentRow.id,
      userId,
      "cluster_enrich_parent",
      parentRow,
      { ...enriched.rows[0], category_ids: mergedCategoryIds },
    );

    const linked = [];
    for (const child of children) {
      const upd = await client.query(
        `UPDATE tbl_news SET
           duplicate_parent_id = $1,
           duplicate_status = 'confirmed',
           is_duplicate = true,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [parentRow.id, child.id],
      );
      await logNewsAudit(client, child.id, userId, "link_duplicate", child, upd.rows[0]);
      linked.push(upd.rows[0].id);
    }

    await client.query("COMMIT");
    return {
      parent_id: parentRow.id,
      linked_ids: linked,
      count: linked.length,
      enriched: {
        priority: bestPriority,
        quality: bestQuality,
        review_state: nextReview,
        workflow_status: nextWorkflow,
        category_ids: mergedCategoryIds,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateNewsItem(id, body = {}, userId = null, userRole = null) {
  const newsId = parseInt(id, 10);
  if (!Number.isFinite(newsId)) throw new Error("شناسه خبر نامعتبر است");

  const existing = await fetchNewsRow(newsId);
  if (!existing) return null;
  if (existing.is_deleted) throw new Error("این خبر حذف شده است");
  const roleLevel = resolveNewsRoleLevel(userRole);
  const existingWorkflow = existing.workflow_status || inferWorkflowStatus(existing);
  const isOwnEntryEdit = Number(existing.observer_id) === Number(userId)
    && ["new", "pending"].includes(existingWorkflow);
  const isEntryFormUpdate = roleLevel === "monitor" || isOwnEntryEdit;

  if (isEntryFormUpdate) {
    const fieldErr = validateNewsEntryPayload({
      raw_text: body.raw_text !== undefined ? body.raw_text : existing.raw_text,
      source: body.source !== undefined ? body.source : existing.source,
      source_url: body.source_url !== undefined ? body.source_url : existing.source_url,
      monitor_note: body.monitor_note !== undefined ? body.monitor_note : existing.monitor_note,
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

  let relevanceStatus = body.relevance_status != null
    ? clampRelevanceStatus(body.relevance_status)
    : clampRelevanceStatus(existing.relevance_status);
  let editorialState = clampEditorialState(existing.editorial_state);
  let editorialAt = existing.editorial_at ?? null;
  let editorialBy = existing.editorial_by ?? null;
  const skipEditorialManual = body._editorial_ai_apply === true;

  const editorialFieldTouched = !skipEditorialManual && !isOwnEntryEdit && (roleLevel === "editor" || roleLevel === "chief" || roleLevel === "admin") && (
    (body.priority != null && clampPriority(body.priority) !== clampPriority(existing.priority))
    || (body.quality != null && clampQuality(body.quality) !== clampQuality(existing.quality))
    || (body.summary !== undefined && String(body.summary ?? "") !== String(existing.summary ?? ""))
    || (body.relevance_status != null && clampRelevanceStatus(body.relevance_status) !== clampRelevanceStatus(existing.relevance_status))
    || body.category_ids !== undefined
  );
  if (editorialFieldTouched) {
    editorialState = "manual";
    editorialAt = new Date();
    editorialBy = userId ?? null;
  } else if (body.editorial_state != null && skipEditorialManual) {
    editorialState = clampEditorialState(body.editorial_state);
    editorialAt = body.editorial_at != null ? body.editorial_at : editorialAt;
    editorialBy = body.editorial_by !== undefined ? body.editorial_by : editorialBy;
  } else if (body.editorial_state != null && (roleLevel === "editor" || roleLevel === "chief" || roleLevel === "admin")) {
    editorialState = clampEditorialState(body.editorial_state);
  }

  let rawText = existing.raw_text;
  let cleanedText = body.cleaned_text !== undefined ? body.cleaned_text : existing.cleaned_text;
  let summary = body.summary !== undefined ? body.summary : existing.summary;

  const sourcePlatform = body.source_platform !== undefined
    ? (normalizeSourcePlatform(body.source_platform) || existing.source_platform)
    : existing.source_platform;

  const source = body.source !== undefined ? body.source : existing.source;

  if (isEntryFormUpdate && body.raw_text !== undefined) {
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

  const entrySettings = await getNewsEntrySettings();
  const highPriorityErr = validateHighPrioritySummaryRequired(
    { cleaned_text: cleanedText, summary, priority },
    entrySettings.summarize_char_threshold,
  );
  if (highPriorityErr) throw new Error(highPriorityErr);

  let sourceUrl = existing.source_url;
  if (body.source_url !== undefined) {
    const rawUrl = String(body.source_url ?? "").trim();
    sourceUrl = rawUrl ? normalizeSourceUrl(rawUrl) : null;
  }
  const statusNote = body.status_note !== undefined ? body.status_note : existing.status_note;
  let monitorNote = existing.monitor_note ?? null;
  if (body.monitor_note !== undefined && isEntryFormUpdate) {
    monitorNote = normalizeMonitorNote(body.monitor_note);
  }
  let sender = existing.sender;
  if (isEntryFormUpdate) {
    const observer = await getUserObserverFields(userId);
    sender = String(observer.observer_first_name ?? observer.observer_username ?? "").trim();
  } else if (body.sender !== undefined) {
    sender = body.sender;
  }
  let sourceDate = body.source_date_jalali !== undefined
    ? (normalizeJalaliDate(body.source_date_jalali) || existing.source_date_jalali)
    : existing.source_date_jalali;
  let sourceTime = body.source_time_hm !== undefined
    ? (normalizeTimeHm(body.source_time_hm) || existing.source_time_hm)
    : existing.source_time_hm;
  const relayDate = existing.relay_date_jalali || nowJalaliDate();
  const relayTime = existing.relay_time_hm || nowTimeHm();
  ({ sourceDate, sourceTime } = reconcileSourceDateWithRelay(sourceDate, sourceTime, relayDate, relayTime));
  const { ref_date: reportRefDate, ref_hm: reportRefHm } = computeReportRefFields(
    sourceDate, sourceTime, relayDate, relayTime, existing.created_at,
  );
  const duplicateParentId = body.duplicate_parent_id !== undefined
    ? body.duplicate_parent_id
    : existing.duplicate_parent_id;

  if (isEntryFormUpdate) {
    if (Number(existing.observer_id) !== Number(userId)) {
      throw new Error("فقط پیش‌نویس‌ها و اخبار ثبت‌شده توسط خودتان قابل ویرایش است");
    }
    if (!["new", "pending"].includes(existingWorkflow)) {
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
  const existingPlainNorm = normalizePlainForCompare(existing.cleaned_text || existing.raw_text || "");
  const cleanedPlainNorm = normalizePlainForCompare(cleanedText);
  const cleanedPlain = cleanedPlainNorm;
  const charCount = computeCharCount(cleanedPlain);
  const sourceForHash = String(source ?? "").trim();
  const existingSource = String(existing.source ?? "").trim();
  const hashContentChanged = (
    body.raw_text !== undefined
    || (body.source !== undefined && sourceForHash !== existingSource)
    || (body.cleaned_text !== undefined && cleanedPlainNorm !== existingPlainNorm)
  );

  let hashKey = existing.hash_key;
  if (hashContentChanged) {
    const newHash = computeHashKey(cleanedPlain, source);
    if (newHash && newHash !== existing.hash_key) {
      const conflictRes = await pool.query(
        `SELECT id FROM tbl_news WHERE hash_key = $1 AND id <> $2 LIMIT 1`,
        [newHash, newsId],
      );
      if (conflictRes.rows[0]) {
        throw new Error(
          `محتوای این خبر با خبر #${conflictRes.rows[0].id} یکسان است — آن را تکراری علامت بزنید یا متن را تغییر دهید`,
        );
      }
      hashKey = newHash;
    }
  }

  if (isEntryFormUpdate && hashContentChanged) {
    await assertNewsDuplicateAllowed(body, {
      raw_text: rawText,
      source,
      hash_key: hashKey,
      plain: cleanedPlain,
      exclude_id: newsId,
      reference_date: existing.relay_date_jalali || nowJalaliDate(),
    });
  }

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
         report_ref_date_jalali = $9,
         report_ref_time_hm = $10,
         summary = $11,
         status_note = $12,
         monitor_note = $13,
         is_approved = $14,
         status = $15,
         priority = $16,
         quality = $17,
         review_state = $18,
         workflow_status = $19,
         duplicate_status = $20,
         duplicate_parent_id = $21,
         is_duplicate = $22,
         source_platform = $23,
         source_url = $24,
         relevance_status = $25,
         editorial_state = $26,
         editorial_at = $27,
         editorial_by = $28,
         reviewed_by = CASE WHEN $30 THEN $29 ELSE reviewed_by END,
         reviewed_at = CASE WHEN $30 THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $31
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
        reportRefDate,
        reportRefHm,
        summary,
        statusNote,
        monitorNote,
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
        relevanceStatus,
        editorialState,
        editorialAt,
        editorialBy,
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
    const pgMsg = pgUniqueViolationMessage(e);
    if (pgMsg) throw new Error(pgMsg);
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
  const { items: rows } = await listNewsMonitor(query, userId);
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
