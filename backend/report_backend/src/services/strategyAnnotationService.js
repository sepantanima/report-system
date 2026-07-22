import pool from "../db.js";
import { notifyUserSafe } from "./analysisNotificationService.js";
import { nowJalaliDate, subtractJalaliDays } from "./newsTextUtils.js";
import {
  instanceNewsAndSql,
  instanceNewsSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";

export const ANNOTATION_TYPES = {
  confirm: "تأیید",
  deny: "تکذیب",
  investigate: "بررسی بیشتر",
  note: "یادداشت",
};

const VALID_TYPES = new Set(Object.keys(ANNOTATION_TYPES));
const VALID_KINDS = new Set(["news", "field"]);

/** تبدیل اولویت میدانی (۱ عادی / ۳ مهم / ۵ فوری) به مقیاس خبر (۱ فوری … ۳ عادی) */
function fieldPriorityToNewsScaleSql(col = "e.priority") {
  return `CASE
    WHEN COALESCE(${col}, 1) >= 5 THEN 1
    WHEN COALESCE(${col}, 1) >= 3 THEN 2
    ELSE 3
  END`;
}

function fieldTimeHmSql(col = "e.time") {
  return `CASE
    WHEN ${col} IS NULL THEN NULL
    ELSE substring(lpad(regexp_replace((${col})::text, '\\D', '', 'g'), 4, '0') from 1 for 2)
      || ':'
      || substring(lpad(regexp_replace((${col})::text, '\\D', '', 'g'), 4, '0') from 3 for 2)
  END`;
}

/** زمان خبر در DB اغلب «1335» است — یکسان‌سازی با فرمت HH:MM */
function newsTimeHmSql(col) {
  return `CASE
    WHEN ${col} IS NULL OR trim(${col}::text) = '' THEN NULL
    ELSE substring(lpad(regexp_replace(${col}::text, '\\D', '', 'g'), 4, '0') from 1 for 2)
      || ':'
      || substring(lpad(regexp_replace(${col}::text, '\\D', '', 'g'), 4, '0') from 3 for 2)
  END`;
}

function newsEventHmDigitsSql() {
  return `COALESCE(
    NULLIF(lpad(regexp_replace(COALESCE(n.source_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
    NULLIF(lpad(regexp_replace(COALESCE(n.relay_time_hm, '')::text, '\\D', '', 'g'), 4, '0'), '0000'),
    '0000'
  )`;
}

function fieldEventHmDigitsSql(col = "e.time") {
  return `lpad(regexp_replace(COALESCE((${col})::text, ''), '\\D', '', 'g'), 4, '0')`;
}

/** یکسان‌سازی تاریخ جلالی برای مرتب‌سازی زمانی (حذف / و -) */
function jalaliDateDigitsSql(expr) {
  return `regexp_replace(COALESCE((${expr})::text, ''), '\\D', '', 'g')`;
}

function normalizeKind(kind) {
  const k = String(kind || "news").toLowerCase();
  if (!VALID_KINDS.has(k)) throw new Error("نوع آیتم نامعتبر است");
  return k;
}

/**
 * تالار زنده ترکیبی: اخبار + گزارش‌های میدانی verified
 * @param {{ limit?: number, days?: number|string, kind?: string }} opts
 * kind: all | news | field
 */
export async function listLiveNewsFeed({ limit = 100, days = 1, kind = "all" } = {}) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
  const dayCount = [1, 2, 3].includes(Number(days)) ? Number(days) : 1;
  const today = nowJalaliDate();
  const fromJalali = dayCount <= 1 ? today : subtractJalaliDays(today, dayCount - 1);
  const kindFilter = String(kind || "all").toLowerCase();
  const includeNews = kindFilter === "all" || kindFilter === "news";
  const includeField = kindFilter === "all" || kindFilter === "field";

  const parts = [];
  const params = [fromJalali];
  const fromIdx = 1;

  if (includeNews) {
    const dateExpr = `COALESCE(NULLIF(trim(n.source_date_jalali), ''), NULLIF(trim(n.relay_date_jalali), ''))`;
    const newsHmDigits = newsEventHmDigitsSql();
    parts.push(`
      SELECT
        'news'::text AS kind,
        n.id AS item_id,
        (${dateExpr}) AS event_date_jalali,
        (${newsHmDigits}) AS event_hm_digits,
        ('news:' || n.id::text) AS feed_key,
        COALESCE(NULLIF(trim(n.summary), ''), LEFT(regexp_replace(COALESCE(n.cleaned_text, n.raw_text, ''), E'\\s+', ' ', 'g'), 120)) AS title,
        n.summary,
        n.cleaned_text,
        n.raw_text,
        COALESCE(n.priority, 3)::int AS priority,
        n.quality::smallint AS quality,
        NULL::int AS classification,
        n.workflow_status,
        n.review_state,
        n.publish_status,
        n.source_date_jalali,
        ${newsTimeHmSql("n.source_time_hm")}::text AS source_time_hm,
        n.relay_date_jalali,
        ${newsTimeHmSql("n.relay_time_hm")}::text AS relay_time_hm,
        n.sender,
        n.source,
        NULL::text AS unit_name,
        NULL::text AS province,
        NULL::text AS topic,
        NULL::text AS hash_key,
        n.created_at,
        n.updated_at,
        COALESCE(ann.cnt, 0)::int AS annotation_count,
        ann.latest_type AS latest_annotation_type,
        CASE WHEN COALESCE(n.priority, 3) = 1 THEN 0 ELSE 1 END AS sort_urgent,
        (${jalaliDateDigitsSql(dateExpr)} || ${newsHmDigits}) AS event_sort_key,
        COALESCE(n.updated_at, n.created_at) AS sort_ts
      FROM tbl_news n
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt,
               (ARRAY_AGG(a.annotation_type ORDER BY a.created_at DESC))[1] AS latest_type
        FROM tbl_strategy_news_annotations a
        WHERE a.news_id = n.id
      ) ann ON true
      WHERE COALESCE(n.is_deleted, false) = false
        AND COALESCE(n.workflow_status, '') IN ('finalized', 'reviewed', 'pending')
        AND ${dateExpr} IS NOT NULL
        AND ${dateExpr} >= $${fromIdx}${instanceNewsAndSql("n")}
    `);
  }

  if (includeField) {
    const prioSql = fieldPriorityToNewsScaleSql("e.priority");
    const timeSql = fieldTimeHmSql("e.time");
    const fieldHmDigits = fieldEventHmDigitsSql("e.time");
    parts.push(`
      SELECT
        'field'::text AS kind,
        e.id AS item_id,
        NULLIF(trim(e.date), '') AS event_date_jalali,
        (${fieldHmDigits}) AS event_hm_digits,
        ('field:' || e.id::text) AS feed_key,
        COALESCE(
          NULLIF(trim(e.title), ''),
          NULLIF(trim(e.chat_title), ''),
          LEFT(regexp_replace(COALESCE(e.cleaned_text, e.raw_text, ''), E'\\s+', ' ', 'g'), 120)
        ) AS title,
        NULL::text AS summary,
        e.cleaned_text,
        e.raw_text,
        (${prioSql})::int AS priority,
        e.quality::smallint AS quality,
        COALESCE(e.classification, 1)::int AS classification,
        'verified'::text AS workflow_status,
        'approved'::text AS review_state,
        NULL::text AS publish_status,
        NULLIF(trim(e.date), '') AS source_date_jalali,
        (${timeSql})::text AS source_time_hm,
        NULL::text AS relay_date_jalali,
        NULL::text AS relay_time_hm,
        e.sender_name AS sender,
        COALESCE(NULLIF(trim(u."UnitShortName"), ''), e.sender_name, 'رصد میدانی') AS source,
        u."UnitShortName" AS unit_name,
        COALESCE(u."StateName", e.province)::text AS province,
        e.chat_title AS topic,
        e.hash_key::text AS hash_key,
        NULLIF(trim(e."createdAt"), '')::timestamptz AS created_at,
        NULLIF(trim(e."updatedAt"), '')::timestamptz AS updated_at,
        COALESCE(ann.cnt, 0)::int AS annotation_count,
        ann.latest_type AS latest_annotation_type,
        CASE WHEN (${prioSql}) = 1 THEN 0 ELSE 1 END AS sort_urgent,
        (${jalaliDateDigitsSql("NULLIF(trim(e.date), '')")} || ${fieldHmDigits}) AS event_sort_key,
        COALESCE(
          NULLIF(trim(e."updatedAt"), '')::timestamptz,
          NULLIF(trim(e."createdAt"), '')::timestamptz
        ) AS sort_ts
      FROM tbl_unit_events e
      ${fieldReportTypeJoinSql("e")}
      LEFT JOIN tbl_units u ON e.unitcd = u."UnitCode"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt,
               (ARRAY_AGG(a.annotation_type ORDER BY a.created_at DESC))[1] AS latest_type
        FROM tbl_strategy_field_annotations a
        WHERE a.event_id = e.id
      ) ann ON true
      WHERE COALESCE(e.is_deleted, false) = false
        AND COALESCE(e.state, '') = 'verified'
        AND COALESCE(e.classification, 1) <> 4
        AND NULLIF(trim(e.date), '') IS NOT NULL
        AND NULLIF(trim(e.date), '') >= $${fromIdx}
        ${fieldReportListScopeSql("e", "rt_scope")}
    `);
  }

  if (!parts.length) {
    return {
      items: [],
      server_time: new Date().toISOString(),
      days: dayCount,
      from_date_jalali: fromJalali,
      to_date_jalali: today,
      kind: kindFilter,
    };
  }

  // یک UNION سراسری + مرتب‌سازی با کلید زمانی رویداد
  // (سقف جدا برای هر نوع باعث بلوک «همه خبر سپس همه میدانی» می‌شود اگر بازه‌ها هم‌پوشان نباشند)
  const orderLimitSql = (selectSql, limitParamIdx) => `
    SELECT * FROM (${selectSql}) src
    ORDER BY event_sort_key DESC NULLS LAST, item_id DESC
    LIMIT $${limitParamIdx}
  `;

  let rows = [];
  if (includeNews && includeField) {
    const unionSql = `${parts[0]}\nUNION ALL\n${parts[1]}`;
    // سقف بالاتر تا میدانی در میان اخبار هم‌زمان دیده شود
    const feedCap = Math.min(Math.max(lim * 2, lim), 400);
    params.push(feedCap);
    const r = await pool.query(orderLimitSql(unionSql, params.length), params);
    rows = r.rows;
  } else {
    params.push(lim);
    const r = await pool.query(orderLimitSql(parts[0], params.length), params);
    rows = r.rows;
  }

  // #region agent log
  try {
    const byRs = {};
    let rejected = 0;
    for (const row of rows) {
      const rs = String(row?.review_state || "").toLowerCase() || "(empty)";
      byRs[rs] = (byRs[rs] || 0) + 1;
      if (rs === "rejected") rejected += 1;
    }
    fetch("http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6de48a" },
      body: JSON.stringify({
        sessionId: "6de48a",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "strategyAnnotationService.js:listLiveNewsFeed",
        message: "backend live feed review_state breakdown",
        data: {
          total: rows.length,
          rejected,
          byReviewState: byRs,
          kindFilter,
          dayCount,
          sqlExcludesRejected: false,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (_) {
    /* ignore debug errors */
  }
  // #endregion

  const items = rows.map((row) => {
    const {
      sort_urgent: _su,
      sort_ts: _st,
      event_hm_digits: _ehd,
      event_date_jalali: _edj,
      item_id,
      event_sort_key,
      ...rest
    } = row;
    return {
      ...rest,
      id: item_id,
      item_id,
      event_sort_key: event_sort_key || null,
      sort_ts: _st || null,
    };
  });

  return {
    items,
    server_time: new Date().toISOString(),
    days: dayCount,
    from_date_jalali: fromJalali,
    to_date_jalali: today,
    kind: kindFilter,
  };
}

export async function listAnnotationsForNews(newsId) {
  const id = parseInt(newsId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه خبر نامعتبر است");
  const exists = await pool.query(
    `SELECT id FROM tbl_news WHERE id = $1 AND COALESCE(is_deleted, false) = false${instanceNewsAndSql("tbl_news")}`,
    [id],
  );
  if (!exists.rows[0]) throw new Error("خبر یافت نشد");
  const r = await pool.query(
    `SELECT a.*, u.name AS author_name, u.username AS author_username
     FROM tbl_strategy_news_annotations a
     LEFT JOIN tbl_users u ON u.id = a.author_user_id
     WHERE a.news_id = $1
     ORDER BY a.created_at DESC`,
    [id],
  );
  return r.rows;
}

export async function listAnnotationsForField(eventId) {
  const id = parseInt(eventId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه گزارش میدانی نامعتبر است");
  const allowed = await pool.query(
    `SELECT 1 FROM tbl_unit_events e
     ${fieldReportTypeJoinSql("e")}
     WHERE e.id = $1
       AND COALESCE(e.is_deleted, false) = false
       AND COALESCE(e.state, '') = 'verified'
       AND COALESCE(e.classification, 1) <> 4
       ${fieldReportListScopeSql("e", "rt_scope")}`,
    [id],
  );
  if (!allowed.rows[0]) throw new Error("گزارش میدانی قابل‌نمایش یافت نشد");
  const r = await pool.query(
    `SELECT a.*, u.name AS author_name, u.username AS author_username
     FROM tbl_strategy_field_annotations a
     LEFT JOIN tbl_users u ON u.id = a.author_user_id
     WHERE a.event_id = $1
     ORDER BY a.created_at DESC`,
    [id],
  );
  return r.rows;
}

export async function listAnnotationsForItem(kind, id) {
  const k = normalizeKind(kind);
  return k === "field" ? listAnnotationsForField(id) : listAnnotationsForNews(id);
}

async function resolveNotifyUserIds(notifyRoles = [], notifyUserIds = []) {
  const ids = new Set(
    (notifyUserIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite),
  );
  const roles = (notifyRoles || []).map((r) => String(r).trim()).filter(Boolean);
  if (roles.length) {
    const codes = [...new Set(
      roles.flatMap((r) => (r === "admin" ? ["admin", "system_admin"] : [r])),
    )];
    const users = await pool.query(
      `SELECT DISTINCT u.id
       FROM tbl_users u
       JOIN tbl_user_role_assignments ura ON ura.user_id = u.id AND ura.active = TRUE
       JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
       WHERE u.active IS NOT FALSE
         AND rt.code = ANY($1::text[])`,
      [codes],
    );
    for (const row of users.rows) {
      ids.add(row.id);
    }
  }
  return [...ids];
}

function parseAnnotationBody(body) {
  const annotationType = String(body?.annotation_type || "").trim();
  if (!VALID_TYPES.has(annotationType)) {
    throw new Error("نوع حاشیه نامعتبر است");
  }
  const text = String(body?.body || "").trim().slice(0, 2000);
  if (!text && annotationType === "note") {
    throw new Error("متن یادداشت الزامی است");
  }
  const notifyRoles = Array.isArray(body?.notify_roles)
    ? body.notify_roles.map((r) => String(r).trim()).filter(Boolean).slice(0, 10)
    : [];
  const notifyUserIds = Array.isArray(body?.notify_user_ids)
    ? body.notify_user_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite).slice(0, 50)
    : [];
  return { annotationType, text, notifyRoles, notifyUserIds, shouldNotify: body?.notify === true || notifyRoles.length > 0 || notifyUserIds.length > 0 };
}

export async function createAnnotation(newsId, body, user) {
  const id = parseInt(newsId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه خبر نامعتبر است");
  if (!user?.id) throw new Error("کاربر نامعتبر است");

  const { annotationType, text, notifyRoles, notifyUserIds, shouldNotify } = parseAnnotationBody(body);

  const news = await pool.query(
    `SELECT id,
            COALESCE(NULLIF(trim(summary), ''), LEFT(regexp_replace(COALESCE(cleaned_text, raw_text, ''), E'\\s+', ' ', 'g'), 80)) AS title
     FROM tbl_news WHERE id = $1 AND COALESCE(is_deleted, false) = false${instanceNewsAndSql("tbl_news")}`,
    [id],
  );
  if (!news.rows[0]) throw new Error("خبر یافت نشد");

  const ins = await pool.query(
    `INSERT INTO tbl_strategy_news_annotations
       (news_id, author_user_id, annotation_type, body, notify_roles, notify_user_ids)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, user.id, annotationType, text, notifyRoles, notifyUserIds],
  );
  const row = ins.rows[0];

  if (shouldNotify) {
    const recipients = await resolveNotifyUserIds(
      notifyRoles.length ? notifyRoles : ["news_chief", "news_editor"],
      notifyUserIds,
    );
    const typeLabel = ANNOTATION_TYPES[annotationType] || annotationType;
    const title = `دستور راهبردی: ${typeLabel}`;
    const newsTitle = String(news.rows[0].title || `خبر #${id}`).slice(0, 80);
    const msgBody = `خبر «${newsTitle}» — ${typeLabel}${text ? `: ${text.slice(0, 300)}` : ""}`;
    for (const rid of recipients) {
      notifyUserSafe(user, rid, title, msgBody);
    }
  }

  return row;
}

export async function createFieldAnnotation(eventId, body, user) {
  const id = parseInt(eventId, 10);
  if (!Number.isFinite(id)) throw new Error("شناسه گزارش میدانی نامعتبر است");
  if (!user?.id) throw new Error("کاربر نامعتبر است");

  const { annotationType, text, notifyRoles, notifyUserIds, shouldNotify } = parseAnnotationBody(body);

  const ev = await pool.query(
    `SELECT e.id,
            COALESCE(
              NULLIF(trim(e.title), ''),
              NULLIF(trim(e.chat_title), ''),
              LEFT(regexp_replace(COALESCE(e.cleaned_text, e.raw_text, ''), E'\\s+', ' ', 'g'), 80)
            ) AS title
     FROM tbl_unit_events e
     ${fieldReportTypeJoinSql("e")}
     WHERE e.id = $1
       AND COALESCE(e.is_deleted, false) = false
       AND COALESCE(e.state, '') = 'verified'
       AND COALESCE(e.classification, 1) <> 4
       ${fieldReportListScopeSql("e", "rt_scope")}`,
    [id],
  );
  if (!ev.rows[0]) throw new Error("گزارش میدانی قابل‌نمایش یافت نشد");

  const ins = await pool.query(
    `INSERT INTO tbl_strategy_field_annotations
       (event_id, author_user_id, annotation_type, body, notify_roles, notify_user_ids)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, user.id, annotationType, text, notifyRoles, notifyUserIds],
  );
  const row = ins.rows[0];

  if (shouldNotify) {
    const recipients = await resolveNotifyUserIds(
      notifyRoles.length ? notifyRoles : ["Field_admin"],
      notifyUserIds,
    );
    const typeLabel = ANNOTATION_TYPES[annotationType] || annotationType;
    const title = `دستور راهبردی (میدانی): ${typeLabel}`;
    const evTitle = String(ev.rows[0].title || `گزارش #${id}`).slice(0, 80);
    const msgBody = `رصد میدانی «${evTitle}» — ${typeLabel}${text ? `: ${text.slice(0, 300)}` : ""}`;
    for (const rid of recipients) {
      notifyUserSafe(user, rid, title, msgBody);
    }
  }

  return row;
}

export async function createAnnotationForItem(kind, id, body, user) {
  const k = normalizeKind(kind);
  return k === "field" ? createFieldAnnotation(id, body, user) : createAnnotation(id, body, user);
}
