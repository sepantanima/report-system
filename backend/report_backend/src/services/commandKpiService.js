import pool from "../db.js";
import { buildPhase2DashboardBundle } from "./commandDashboardOpsService.js";
import { buildPhase3DashboardBundle } from "./commandDashboardPhase3Service.js";
import {
  instanceNewsAndSql,
  instanceNewsSql,
  fieldEventsScopedFrom,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";
import { userRoleTextExpr, userRoleTextSelect } from "../utils/userRoleSql.js";
export {
  getUnitDrilldown,
  getUserDrilldown,
} from "./commandDashboardPhase3Service.js";

/** اجرای دسته‌ای برای جلوگیری از اشباع connection pool */
async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function safeCount(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return Number(r.rows[0]?.c ?? 0);
  } catch (e) {
    console.warn("[command-kpi]", e.message);
    return 0;
  }
}

/** صف تک‌نخی برای overview — جلوگیری از چند buildKpiBar هم‌زمان روی یک process */
let overviewTail = Promise.resolve();
function enqueueOverview(fn) {
  const run = overviewTail.then(fn, fn);
  overviewTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function safeRows(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.warn("[command-kpi]", e.message);
    return [];
  }
}

function toDateOnly(d) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return x.toISOString().slice(0, 10);
}

/** Parse from/to query; default = today (UTC date). */
export function resolveDashboardRange(query = {}) {
  const today = toDateOnly(new Date());
  let from = toDateOnly(query.from) || today;
  let to = toDateOnly(query.to) || today;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const days = Math.max(1, Math.round((toDate - fromDate) / 86400000) + 1);
  const prevToDate = new Date(fromDate);
  prevToDate.setUTCDate(prevToDate.getUTCDate() - 1);
  const prevFromDate = new Date(prevToDate);
  prevFromDate.setUTCDate(prevFromDate.getUTCDate() - (days - 1));
  return {
    from,
    to,
    days,
    prev_from: toDateOnly(prevFromDate),
    prev_to: toDateOnly(prevToDate),
    unit_id: query.unit_id ? String(query.unit_id).trim() : null,
    role: query.role ? String(query.role).trim() : null,
    province: query.province ? String(query.province).trim() : null,
    process_status: query.process_status ? String(query.process_status).trim() : null,
    product_type: query.product_type ? String(query.product_type).trim() : null,
    priority: query.priority ? String(query.priority).trim() : null,
  };
}

function deltaPct(curr, prev) {
  if (curr == null || prev == null) return null;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function statusForDelta(delta, { invert = false } = {}) {
  if (delta == null) return "gray";
  const d = invert ? -delta : delta;
  if (d >= 5) return "green";
  if (d >= -10) return "yellow";
  return "red";
}

function statusForOverdue(value) {
  if (value == null) return "gray";
  if (value === 0) return "green";
  if (value <= 10) return "yellow";
  return "red";
}

function kpiItem({ id, label, value, prev_value, status, drilldown, note }) {
  return {
    id,
    label,
    value,
    prev_value,
    delta_pct: deltaPct(value, prev_value),
    status: status || statusForDelta(deltaPct(value, prev_value)),
    drilldown: drilldown || null,
    note: note || null,
  };
}

function newsDateFilter(alias, from, to, paramOffset = 0) {
  const a = alias ? `${alias}.` : "";
  const scopeAlias = alias || "tbl_news";
  return {
    sql: `${instanceNewsSql(scopeAlias)} AND ${a}created_at::date >= $${paramOffset + 1}::date AND ${a}created_at::date <= $${paramOffset + 2}::date AND COALESCE(${a}is_deleted,false)=false`,
    params: [from, to],
  };
}

function fieldDateFilter(from, to, paramOffset = 0) {
  return {
    sql: `e."createdAt"::date >= $${paramOffset + 1}::date AND e."createdAt"::date <= $${paramOffset + 2}::date AND (e.is_deleted = false OR e.is_deleted IS NULL)`,
    params: [from, to],
  };
}

function fieldUnitClause(unitId, startIdx) {
  if (!unitId) return { sql: "", params: [] };
  return { sql: ` AND e.unitcd = $${startIdx}`, params: [unitId] };
}

const NEWS_SCOPE = instanceNewsAndSql("tbl_news");
const FIELD_SCOPE = fieldReportListScopeSql("e", "rt_scope");
const FIELD_FROM = fieldEventsScopedFrom("e", "rt_scope");

function unitClause(column, unitId, startIdx) {
  if (!unitId) return { sql: "", params: [] };
  return { sql: ` AND ${column} = $${startIdx}`, params: [unitId] };
}

/** آمار تجمیعی بین‌ماژولی برای داشبورد مرکز فرماندهی (ویجت‌های قدیمی) */
export async function getCommandKpiOverview() {
  const [
    newsPending,
    newsReviewed,
    newsFinalized,
    newsToday,
    fieldToday,
    analysisOpen,
    analysisDone,
    briefSubmitted,
    strategyDraft,
    strategyPublished,
    annotationsToday,
  ] = await Promise.all([
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')='pending'${NEWS_SCOPE}`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')='reviewed'${NEWS_SCOPE}`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')='finalized'${NEWS_SCOPE}`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted,false)=false AND created_at::date = CURRENT_DATE${NEWS_SCOPE}`),
    safeCount(`SELECT COUNT(*)::int AS c FROM ${FIELD_FROM} WHERE e."createdAt"::date = CURRENT_DATE${FIELD_SCOPE}`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('Assigned','InProgress','NeedsRevision','UnderReview')`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('FinalApproved','Archived')`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_brief_submissions WHERE created_at::date = CURRENT_DATE`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_strategy_outputs WHERE status = 'draft'`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_strategy_outputs WHERE status = 'published'`),
    safeCount(`SELECT COUNT(*)::int AS c FROM tbl_strategy_news_annotations WHERE created_at::date = CURRENT_DATE`),
  ]);

  const roleActivity = await safeRows(`
    SELECT u.id, u.name, u.username, ${userRoleTextSelect("u")},
           COALESCE(n.cnt, 0)::int AS news_actions_today
    FROM tbl_users u
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM tbl_news_audit_log a
      JOIN tbl_news n ON n.id = a.news_id
      WHERE a.user_id = u.id AND a.created_at::date = CURRENT_DATE
        AND ${instanceNewsSql("n")}
    ) n ON true
    WHERE u.active IS NOT FALSE
    ORDER BY news_actions_today DESC, u.id
    LIMIT 15
  `);

  return {
    generated_at: new Date().toISOString(),
    widgets: {
      news_queue: {
        title: "صف اخبار",
        pending: newsPending,
        reviewed: newsReviewed,
        finalized: newsFinalized,
        today: newsToday,
        drilldown: "/news-manager",
      },
      field_today: {
        title: "گزارشات میدانی امروز",
        count: fieldToday,
        drilldown: "/field-monitor",
      },
      analysis_missions: {
        title: "مأموریت‌های تحلیل",
        open: analysisOpen,
        done: analysisDone,
        brief_today: briefSubmitted,
        drilldown: "/analysis/missions",
      },
      strategy_outputs: {
        title: "خروجی‌های راهبردی",
        draft: strategyDraft,
        published: strategyPublished,
        annotations_today: annotationsToday,
        drilldown: "/command/outputs",
      },
      staff_activity: {
        title: "فعالیت کارکنان (امروز)",
        rows: roleActivity,
        drilldown: "/users",
      },
    },
  };
}

export async function getCommandKpiWidget(widgetId) {
  const overview = await getCommandKpiOverview();
  const w = overview.widgets?.[widgetId];
  if (!w) {
    const err = new Error("ویجت یافت نشد");
    err.status = 404;
    throw err;
  }
  return { id: widgetId, generated_at: overview.generated_at, ...w };
}

async function countNewsInRange(from, to, extraSql = "", extraParams = []) {
  const f = newsDateFilter("", from, to, 0);
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_news WHERE ${f.sql}${NEWS_SCOPE}${extraSql}`,
    [...f.params, ...extraParams],
  );
}

async function countFieldInRange(from, to, unitId, extraSql = "", extraParams = []) {
  const f = fieldDateFilter(from, to, 0);
  const u = fieldUnitClause(unitId, f.params.length + 1);
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM ${FIELD_FROM} WHERE ${f.sql}${FIELD_SCOPE}${u.sql}${extraSql}`,
    [...f.params, ...u.params, ...extraParams],
  );
}

/** اهمیت فیلتر UI → شرط SQL اخبار (۱=فوری …) */
function newsPriorityExtra(priority, startIdx) {
  const map = { urgent: 1, important: 2, normal: 3 };
  const p = map[String(priority || "")];
  if (!p) return { sql: "", params: [] };
  return { sql: ` AND COALESCE(priority, 3)::int = $${startIdx}`, params: [p] };
}

function fieldPriorityExtra(priority) {
  const key = String(priority || "");
  if (!key) return { sql: "", params: [] };
  if (key === "urgent") {
    return {
      sql: ` AND (COALESCE(priority::text,'') ILIKE '%urgent%' OR COALESCE(priority::text,'') ILIKE '%فوری%' OR COALESCE(priority::text,'') IN ('1','urgent'))`,
      params: [],
    };
  }
  if (key === "important") {
    return {
      sql: ` AND (COALESCE(priority::text,'') ILIKE '%important%' OR COALESCE(priority::text,'') ILIKE '%مهم%' OR COALESCE(priority::text,'') IN ('2','important'))`,
      params: [],
    };
  }
  if (key === "normal") {
    return {
      sql: ` AND (COALESCE(priority::text,'') ILIKE '%normal%' OR COALESCE(priority::text,'') ILIKE '%عادی%' OR COALESCE(priority::text,'') IN ('3','4','normal') OR COALESCE(priority::text,'') = '')`,
      params: [],
    };
  }
  return { sql: "", params: [] };
}

async function countNewsByWorkflow(workflowStatus, priority) {
  const params = [workflowStatus];
  let sql = `SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')=$1${NEWS_SCOPE}`;
  const np = newsPriorityExtra(priority, 2);
  sql += np.sql;
  params.push(...np.params);
  return safeCount(sql, params);
}

async function countActiveUsers(from, to, role) {
  const params = [from, to];
  let roleSql = "";
  if (role) {
    params.push(role);
    roleSql = ` AND ${userRoleTextExpr("u")} ILIKE '%' || $${params.length} || '%'`;
  }
  return safeCount(
    `
    SELECT COUNT(DISTINCT uid)::int AS c FROM (
      SELECT a.user_id AS uid
      FROM tbl_news_audit_log a
      JOIN tbl_users u ON u.id = a.user_id
      JOIN tbl_news n ON n.id = a.news_id
      WHERE a.created_at::date >= $1::date AND a.created_at::date <= $2::date
        AND ${instanceNewsSql("n")}
      ${roleSql}
      UNION
      SELECT NULLIF(e.sender_id, '')::int AS uid
      FROM tbl_unit_events e
      ${fieldReportTypeJoinSql("e")}
      LEFT JOIN tbl_users u ON u.id::text = e.sender_id
      WHERE e."createdAt"::date >= $1::date AND e."createdAt"::date <= $2::date
        AND (e.is_deleted = false OR e.is_deleted IS NULL)
        AND e.sender_id ~ '^[0-9]+$'
        ${fieldReportListScopeSql("e", "rt_scope")}
      ${role ? `AND ${userRoleTextExpr("u")} ILIKE '%' || $3 || '%'` : ""}
    ) x
    WHERE uid IS NOT NULL
    `,
    params,
  );
}

async function countAiRuns(from, to) {
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_ai_run_logs
     WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
    [from, to],
  );
}

async function countBriefInRange(from, to) {
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_analysis_brief_submissions
     WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
    [from, to],
  );
}

async function countAnalysisDoneInRange(from, to) {
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments
     WHERE status IN ('FinalApproved','Archived')
       AND COALESCE(updated_at, created_at)::date >= $1::date
       AND COALESCE(updated_at, created_at)::date <= $2::date`,
    [from, to],
  );
}

async function countStrategyPublished(from, to) {
  return safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_strategy_outputs
     WHERE status = 'published'
       AND COALESCE(published_at, created_at)::date >= $1::date
       AND COALESCE(published_at, created_at)::date <= $2::date`,
    [from, to],
  );
}

async function buildKpiBar(range) {
  const { from, to, prev_from, prev_to, unit_id, role, priority } = range;
  const np = newsPriorityExtra(priority, 3);
  const fp = fieldPriorityExtra(priority);

  // حداکثر ۳ کوئری هم‌زمان — Promise.all کامل (~۱۹) pool را می‌بلعد و همه value=null می‌شود
  const [
    activeCurr, activePrev,
    fieldCurr, fieldPrev,
    newsCurr, newsPrev,
    newsFinCurr, newsFinPrev,
    briefCurr, briefPrev,
    analysisDoneCurr, analysisDonePrev,
    strategyCurr, strategyPrev,
    aiCurr, aiPrev,
    newsPending, newsReviewed, analysisOpen,
  ] = await mapPool(
    [
      () => countActiveUsers(from, to, role),
      () => countActiveUsers(prev_from, prev_to, role),
      () => countFieldInRange(from, to, unit_id, fp.sql, fp.params),
      () => countFieldInRange(prev_from, prev_to, unit_id, fp.sql, fp.params),
      () => countNewsInRange(from, to, np.sql, np.params),
      () => countNewsInRange(prev_from, prev_to, np.sql, np.params),
      () => countNewsInRange(from, to, ` AND COALESCE(workflow_status,'')='finalized'${np.sql}`, np.params),
      () => countNewsInRange(prev_from, prev_to, ` AND COALESCE(workflow_status,'')='finalized'${np.sql}`, np.params),
      () => countBriefInRange(from, to),
      () => countBriefInRange(prev_from, prev_to),
      () => countAnalysisDoneInRange(from, to),
      () => countAnalysisDoneInRange(prev_from, prev_to),
      () => countStrategyPublished(from, to),
      () => countStrategyPublished(prev_from, prev_to),
      () => countAiRuns(from, to),
      () => countAiRuns(prev_from, prev_to),
      () => countNewsByWorkflow("pending", priority),
      () => countNewsByWorkflow("reviewed", priority),
      () => safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('Assigned','InProgress','NeedsRevision','UnderReview')`),
    ],
    3,
    (fn) => fn(),
  );

  const analysesCurr = (briefCurr ?? 0) + (analysisDoneCurr ?? 0);
  const analysesPrev = (briefPrev ?? 0) + (analysisDonePrev ?? 0);
  const overdue = (newsPending ?? 0) + (newsReviewed ?? 0) + (analysisOpen ?? 0);

  const bar = [
    kpiItem({
      id: "active_users",
      label: "کاربران فعال",
      value: activeCurr,
      prev_value: activePrev,
      drilldown: "/users",
      note: "فعال در بازه (اقدام خبری یا ثبت رصد)",
    }),
    kpiItem({
      id: "field_reports",
      label: "رصدهای ثبت‌شده",
      value: fieldCurr,
      prev_value: fieldPrev,
      drilldown: "/field-monitor",
    }),
    kpiItem({
      id: "news_received",
      label: "اخبار دریافت‌شده",
      value: newsCurr,
      prev_value: newsPrev,
      drilldown: "/news-manager",
    }),
    kpiItem({
      id: "news_finalized",
      label: "اخبار تأییدشده",
      value: newsFinCurr,
      prev_value: newsFinPrev,
      drilldown: "/news-manager",
    }),
    kpiItem({
      id: "analyses",
      label: "تحلیل‌های تولیدشده",
      value: analysesCurr,
      prev_value: analysesPrev,
      drilldown: "/analysis/missions",
    }),
    kpiItem({
      id: "strategy_products",
      label: "محصولات راهبردی",
      value: strategyCurr,
      prev_value: strategyPrev,
      drilldown: "/command/outputs",
    }),
    kpiItem({
      id: "ai_requests",
      label: "درخواست‌های AI",
      value: aiCurr,
      prev_value: aiPrev,
      drilldown: null,
    }),
    kpiItem({
      id: "overdue_processes",
      label: "فرآیندهای معوق",
      value: overdue,
      prev_value: null,
      status: statusForOverdue(overdue),
      drilldown: "/news-manager",
      note: "صف جاری اخبار + مأموریت‌های باز",
    }),
  ];

  return bar;
}

async function buildProcesses(range) {
  const unitId = range?.unit_id || null;
  const processStatus = range?.process_status || null;
  const u = unitClause("e.unitcd", unitId, 1);
  const [
    fieldPending, fieldVerified, fieldRejected, newsPending, newsReviewed, newsFinalized, aAssigned, aReview, aDone,
  ] = await mapPool(
    [
      () =>
        safeCount(
          `SELECT COUNT(*)::int AS c FROM ${fieldEventsScopedFrom("e")} WHERE COALESCE(e.state,'')='pending' AND (e.is_deleted = false OR e.is_deleted IS NULL)${fieldReportListScopeSql("e", "rt_scope")}${u.sql}`,
          u.params,
        ),
      () =>
        safeCount(
          `SELECT COUNT(*)::int AS c FROM ${fieldEventsScopedFrom("e")} WHERE COALESCE(e.state,'')='verified' AND (e.is_deleted = false OR e.is_deleted IS NULL)${fieldReportListScopeSql("e", "rt_scope")}${u.sql}`,
          u.params,
        ),
      () =>
        safeCount(
          `SELECT COUNT(*)::int AS c FROM ${fieldEventsScopedFrom("e")} WHERE COALESCE(e.state,'')='rejected' AND (e.is_deleted = false OR e.is_deleted IS NULL)${fieldReportListScopeSql("e", "rt_scope")}${u.sql}`,
          u.params,
        ),
      () => countNewsByWorkflow("pending", range?.priority),
      () => countNewsByWorkflow("reviewed", range?.priority),
      () => countNewsByWorkflow("finalized", range?.priority),
      () => safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('Assigned','InProgress')`),
      () => safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('UnderReview','NeedsRevision')`),
      () => safeCount(`SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments WHERE status IN ('FinalApproved','Archived')`),
    ],
    3,
    (fn) => fn(),
  );

  const all = [
    {
      id: "field",
      title: "رصد",
      drilldown: "/field-monitor",
      stages: [
        { id: "pending", label: "ثبت / در انتظار", count: fieldPending },
        { id: "verified", label: "تأیید", count: fieldVerified },
        { id: "rejected", label: "برگشت", count: fieldRejected },
      ],
    },
    {
      id: "news",
      title: "اخبار",
      drilldown: "/news-manager",
      stages: [
        { id: "pending", label: "ورود / دبیر", count: newsPending },
        { id: "reviewed", label: "سردبیر", count: newsReviewed },
        { id: "finalized", label: "انتشار", count: newsFinalized },
      ],
    },
    {
      id: "analysis",
      title: "تحلیل",
      drilldown: "/analysis/missions",
      stages: [
        { id: "assigned", label: "تعریف / ثبت", count: aAssigned },
        { id: "review", label: "داوری", count: aReview },
        { id: "done", label: "تأیید / بانک", count: aDone },
      ],
    },
  ];

  if (!processStatus) return all;
  if (processStatus === "open_analysis") return all.filter((p) => p.id === "analysis");
  if (processStatus === "pending") {
    return all.map((p) => ({
      ...p,
      stages: p.stages.filter((s) => ["pending", "assigned"].includes(s.id)),
    })).filter((p) => p.stages.length);
  }
  if (processStatus === "reviewed") {
    return all
      .map((p) => ({
        ...p,
        stages: p.stages.filter((s) => ["reviewed", "review", "verified"].includes(s.id)),
      }))
      .filter((p) => p.stages.length);
  }
  if (processStatus === "finalized") {
    return all
      .map((p) => ({
        ...p,
        stages: p.stages.filter((s) => ["finalized", "done", "verified"].includes(s.id)),
      }))
      .filter((p) => p.stages.length);
  }
  return all;
}

async function buildProducts(range) {
  const { from, to, unit_id, product_type, priority } = range;
  const np = newsPriorityExtra(priority, 3);
  const fp = fieldPriorityExtra(priority);
  const [field, news, brief, analysisDone, strategy, strategyByType] = await Promise.all([
    countFieldInRange(from, to, unit_id, fp.sql, fp.params),
    countNewsInRange(from, to, np.sql, np.params),
    countBriefInRange(from, to),
    countAnalysisDoneInRange(from, to),
    countStrategyPublished(from, to),
    safeRows(
      `SELECT output_type, COUNT(*)::int AS c
       FROM tbl_strategy_outputs
       WHERE status = 'published'
         AND COALESCE(published_at, created_at)::date >= $1::date
         AND COALESCE(published_at, created_at)::date <= $2::date
       GROUP BY output_type
       ORDER BY c DESC`,
      [from, to],
    ),
  ]);

  let items = [
    { id: "field_report", label: "گزارش رصد", value: field, drilldown: "/field-monitor", product_type: "field" },
    { id: "news", label: "خبر", value: news, drilldown: "/news-manager", product_type: "news" },
    { id: "analysis_brief", label: "تحلیل کوتاه", value: brief, drilldown: "/analysis/missions", product_type: "analysis" },
    { id: "analysis", label: "تحلیل", value: analysisDone, drilldown: "/analysis/missions", product_type: "analysis" },
    { id: "strategy", label: "گزارش راهبردی", value: strategy, drilldown: "/command/outputs", product_type: "strategy" },
  ];

  const typeLabels = {
    soft_war_annex: "پیوست جنگ نرم",
    macro_cognitive: "تحلیل کلان شناختی",
    psyops_strategic: "عملیات روانی راهبردی",
    macro_trends: "روندهای کلان",
  };
  for (const row of strategyByType) {
    items.push({
      id: `strategy_${row.output_type}`,
      label: typeLabels[row.output_type] || row.output_type,
      value: Number(row.c),
      drilldown: "/command/outputs",
      product_type: "strategy",
    });
  }

  if (product_type) {
    items = items.filter((x) => x.product_type === product_type);
  }

  return {
    items: items.filter((x) => x.value != null),
    chart: items
      .filter((x) => !String(x.id).startsWith("strategy_") || x.id === "strategy")
      .slice(0, 5)
      .map((x) => ({ name: x.label, value: x.value ?? 0 })),
  };
}

async function dailySeries(metric, from, to, unitId) {
  return timeSeries(metric, from, to, unitId, "day");
}

async function timeSeries(metric, from, to, unitId, granularity = "day") {
  const hourly = granularity === "hour";
  const bucketExpr = (col) =>
    hourly
      ? `to_char(date_trunc('hour', ${col}), 'YYYY-MM-DD"T"HH24:00')`
      : `${col}::date::text`;

  if (metric === "field") {
    const u = unitClause("e.unitcd", unitId, 3);
    const col = `"createdAt"`;
    return safeRows(
      `SELECT ${bucketExpr(`e.${col}`)} AS day, COUNT(*)::int AS value
       FROM ${fieldEventsScopedFrom("e")}
       WHERE e.${col}::date >= $1::date AND e.${col}::date <= $2::date
         AND (e.is_deleted = false OR e.is_deleted IS NULL)${fieldReportListScopeSql("e", "rt_scope")}${u.sql}
       GROUP BY 1 ORDER BY 1`,
      [from, to, ...u.params],
    );
  }
  if (metric === "news") {
    return safeRows(
      `SELECT ${bucketExpr("created_at")} AS day, COUNT(*)::int AS value
       FROM tbl_news
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
         AND COALESCE(is_deleted,false)=false
         ${instanceNewsAndSql("tbl_news")}
       GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
  }
  if (metric === "news_finalized") {
    return safeRows(
      `SELECT ${bucketExpr("created_at")} AS day, COUNT(*)::int AS value
       FROM tbl_news
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
         AND COALESCE(is_deleted,false)=false
         AND COALESCE(workflow_status,'')='finalized'
         ${instanceNewsAndSql("tbl_news")}
       GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
  }
  if (metric === "analysis") {
    if (hourly) {
      return safeRows(
        `SELECT bucket AS day, SUM(c)::int AS value FROM (
           SELECT ${bucketExpr("created_at")} AS bucket, COUNT(*)::int AS c
           FROM tbl_analysis_brief_submissions
           WHERE created_at::date >= $1::date AND created_at::date <= $2::date
           GROUP BY 1
           UNION ALL
           SELECT ${bucketExpr("COALESCE(updated_at, created_at)")} AS bucket, COUNT(*)::int AS c
           FROM tbl_analysis_assignments
           WHERE status IN ('FinalApproved','Archived')
             AND COALESCE(updated_at, created_at)::date >= $1::date
             AND COALESCE(updated_at, created_at)::date <= $2::date
           GROUP BY 1
         ) x
         GROUP BY 1 ORDER BY 1`,
        [from, to],
      );
    }
    return safeRows(
      `SELECT d::text AS day, SUM(c)::int AS value FROM (
         SELECT created_at::date AS d, COUNT(*)::int AS c
         FROM tbl_analysis_brief_submissions
         WHERE created_at::date >= $1::date AND created_at::date <= $2::date
         GROUP BY 1
         UNION ALL
         SELECT COALESCE(updated_at, created_at)::date AS d, COUNT(*)::int AS c
         FROM tbl_analysis_assignments
         WHERE status IN ('FinalApproved','Archived')
           AND COALESCE(updated_at, created_at)::date >= $1::date
           AND COALESCE(updated_at, created_at)::date <= $2::date
         GROUP BY 1
       ) x
       GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
  }
  if (metric === "ai") {
    return safeRows(
      `SELECT ${bucketExpr("created_at")} AS day, COUNT(*)::int AS value
       FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
       GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
  }
  if (metric === "strategy") {
    const col = "COALESCE(published_at, created_at)";
    return safeRows(
      `SELECT ${bucketExpr(col)} AS day, COUNT(*)::int AS value
       FROM tbl_strategy_outputs
       WHERE status = 'published'
         AND ${col}::date >= $1::date
         AND ${col}::date <= $2::date
       GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
  }
  return [];
}

function normalizeHourKey(raw) {
  const s = String(raw || "");
  const m = s.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2})/);
  if (m) return `${m[1]}T${m[2]}:00`;
  return s.slice(0, 16);
}

function fillHourlySeries(rows, from, to) {
  const map = new Map((rows || []).map((r) => [normalizeHourKey(r.day), Number(r.value) || 0]));
  const out = [];
  const y0 = Number(from.slice(0, 4));
  const m0 = Number(from.slice(5, 7)) - 1;
  const d0 = Number(from.slice(8, 10));
  const y1 = Number(to.slice(0, 4));
  const m1 = Number(to.slice(5, 7)) - 1;
  const d1 = Number(to.slice(8, 10));
  const cur = new Date(Date.UTC(y0, m0, d0, 0));
  const endMs = Date.UTC(y1, m1, d1, 23);
  const single = from === to;
  while (cur.getTime() <= endMs) {
    const y = cur.getUTCFullYear();
    const mo = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    const h = String(cur.getUTCHours()).padStart(2, "0");
    const key = `${y}-${mo}-${d}T${h}:00`;
    out.push({
      name: key,
      value: map.get(key) || 0,
      label: single ? `${h}:00` : `${d}/${mo} ${h}:00`,
    });
    cur.setUTCHours(cur.getUTCHours() + 1);
  }
  return out;
}

function fillSeries(rows, from, to) {
  const map = new Map((rows || []).map((r) => [String(r.day).slice(0, 10), Number(r.value)]));
  const out = [];
  const cur = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    out.push({ name: key, value: map.get(key) || 0, label: key });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function seriesStats(series) {
  const values = (series || []).map((x) => Number(x.value) || 0);
  if (!values.length) {
    return { avg: 0, max: 0, min: 0, total: 0, growth_pct: null };
  }
  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.round((total / values.length) * 10) / 10;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0);
  const growth_pct = mid === 0 ? null : deltaPct(secondHalf, firstHalf || 0);
  return { avg, max, min, total, growth_pct };
}

/** بسته واحد داشبورد اجرایی — sections: core|ops|deep|all */
export async function getCommandDashboardOverview(query = {}) {
  return enqueueOverview(() => buildCommandDashboardOverview(query));
}

async function buildCommandDashboardOverview(query = {}) {
  const range = resolveDashboardRange(query);
  const sectionRaw = String(query.sections || query.section || "all").toLowerCase();
  const wantAll = sectionRaw === "all" || !sectionRaw;
  const wantCore = wantAll || sectionRaw.includes("core");
  const wantOps = wantAll || sectionRaw.includes("ops");
  const wantDeep = wantAll || sectionRaw.includes("deep");

  const units = await safeRows(
    `SELECT "UnitCode" AS id, "UnitShortName" AS name, "StateName" AS province
     FROM tbl_units
     WHERE "UnitCode" IS NOT NULL
     ORDER BY "UnitShortName"
     LIMIT 500`,
  );
  const provinces = [...new Set(units.map((u) => u.province).filter(Boolean))]
    .sort()
    .map((p) => ({ id: p, label: p }));

  const base = {
    generated_at: new Date().toISOString(),
    section: sectionRaw,
    range: {
      from: range.from,
      to: range.to,
      prev_from: range.prev_from,
      prev_to: range.prev_to,
      days: range.days,
      unit_id: range.unit_id,
      role: range.role,
      province: range.province,
      process_status: range.process_status,
      product_type: range.product_type,
      priority: range.priority,
    },
    filter_options: {
      units,
      provinces,
      roles: [
        { id: "news_monitor", label: "رصدگر اخبار" },
        { id: "news_editor", label: "دبیر اخبار" },
        { id: "news_chief", label: "سردبیر" },
        { id: "analyst", label: "تحلیل‌گر" },
        { id: "Field_admin", label: "مدیر میدانی" },
        { id: "user", label: "کاربر واحد" },
        { id: "strategy_viewer", label: "ناظر راهبردی" },
        { id: "strategy_commander", label: "فرمانده راهبردی" },
        { id: "strategy_analysis_manager", label: "مدیر تحلیل راهبردی" },
      ],
    },
  };

  let kpi_bar = null;
  let processes = null;
  let products = null;
  let trends_summary = null;

  if (wantCore) {
    // سریالی‌تر از Promise.all پنج‌تایی تا با buildKpiBar (۶ اتصال) از سقف pool رد نشویم
    kpi_bar = await buildKpiBar(range);
    processes = await buildProcesses(range);
    products = await buildProducts(range);
    const [fieldSeries, newsSeries] = await Promise.all([
      dailySeries("field", range.from, range.to, range.unit_id),
      dailySeries("news", range.from, range.to, range.unit_id),
    ]);
    trends_summary = {
      field: seriesStats(fillSeries(fieldSeries, range.from, range.to)),
      news: seriesStats(fillSeries(newsSeries, range.from, range.to)),
    };
  }

  let roles = null;
  let units_heatmap = null;
  let health = null;
  let alerts = null;

  const skipKpi = String(query.skip_kpi || "") === "1" || String(query.skip_kpi || "").toLowerCase() === "true";

  if (wantOps) {
    let kpiForOps = kpi_bar;
    if (!kpiForOps && !skipKpi) {
      kpiForOps = await buildKpiBar(range);
      kpi_bar = kpiForOps;
    }
    const phase2 = await buildPhase2DashboardBundle(range, kpiForOps || []);
    units_heatmap = range.province
      ? phase2.units_heatmap.filter((u) => u.province === range.province)
      : phase2.units_heatmap;
    roles = phase2.roles;
    health = phase2.health;
    alerts = phase2.alerts;
  }

  let users_leaderboard = null;
  let ai_performance = null;
  let provinces_heat = null;

  if (wantDeep) {
    let heat = units_heatmap;
    if (!heat) {
      let kpiForDeep = kpi_bar;
      if (!kpiForDeep && !skipKpi) {
        kpiForDeep = await buildKpiBar(range);
        kpi_bar = kpiForDeep;
      }
      const phase2 = await buildPhase2DashboardBundle(range, kpiForDeep || []);
      heat = range.province
        ? phase2.units_heatmap.filter((u) => u.province === range.province)
        : phase2.units_heatmap;
      if (!units_heatmap) units_heatmap = heat;
      if (!health) health = phase2.health;
      if (!alerts) alerts = phase2.alerts;
      if (!roles) roles = phase2.roles;
    }
    const phase3 = await buildPhase3DashboardBundle(range, heat);
    users_leaderboard = phase3.users_leaderboard;
    ai_performance = phase3.ai_performance;
    provinces_heat = phase3.provinces;
  }

  return {
    ...base,
    kpi_bar,
    processes,
    products,
    trends_summary,
    roles,
    units_heatmap,
    health,
    alerts,
    users_leaderboard,
    ai_performance,
    provinces_heat,
    online_users: users_leaderboard?.online_count ?? null,
  };
}

/** پالس سبک برای به‌روزرسانی زنده (هشدار + KPI + آنلاین) */
export async function getCommandDashboardLivePulse(query = {}) {
  const range = resolveDashboardRange(query);
  const kpi_bar = await buildKpiBar(range);
  const phase2 = await buildPhase2DashboardBundle(range, kpi_bar);
  const { countOnlineUsers } = await import("./userPresenceService.js");
  const online_users = await countOnlineUsers(15);
  return {
    generated_at: new Date().toISOString(),
    kpi_bar,
    alerts: phase2.alerts,
    health: phase2.health,
    online_users,
  };
}

export async function getCommandDashboardTrends(query = {}) {
  const range = resolveDashboardRange(query);
  const metric = String(query.metric || "news").trim();
  const allowed = new Set(["field", "news", "news_finalized", "analysis", "ai", "strategy"]);
  const m = allowed.has(metric) ? metric : "news";
  let granularity = String(query.granularity || query.grain || "").toLowerCase();
  if (granularity !== "hour" && granularity !== "day") {
    granularity = range.from === range.to ? "hour" : "day";
  }
  // بیش از ۷ روز ساعتی خیلی شلوغ می‌شود
  if (granularity === "hour" && range.days > 7) {
    granularity = "day";
  }
  const rows = await timeSeries(m, range.from, range.to, range.unit_id, granularity);
  const series =
    granularity === "hour"
      ? fillHourlySeries(rows, range.from, range.to)
      : fillSeries(rows, range.from, range.to);
  return {
    generated_at: new Date().toISOString(),
    metric: m,
    granularity,
    range: { from: range.from, to: range.to, days: range.days },
    series,
    stats: seriesStats(series),
  };
}
