/**
 * فاز ۳: فعالیت کاربران، عملکرد AI، Drill Down
 */
import pool from "../db.js";
import {
  instanceNewsSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";

async function safeCount(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return Number(r.rows[0]?.c ?? 0);
  } catch (e) {
    console.warn("[command-phase3]", e.message);
    return null;
  }
}

async function safeRows(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.warn("[command-phase3]", e.message);
    return [];
  }
}

export async function buildUsersLeaderboard(range) {
  const { from, to, unit_id } = range;
  const params = [from, to];
  let unitSql = "";
  if (unit_id) {
    params.push(unit_id);
    unitSql = ` AND u.unit_cd = $${params.length}`;
  }

  const rows = await safeRows(
    `
    SELECT
      u.id,
      u.name,
      u.username,
      u.role,
      un."UnitShortName" AS unit_name,
      un."UnitCode" AS unit_id,
      u.last_activity,
      COALESCE(na.cnt, 0)::int AS news_actions,
      COALESCE(fe.cnt, 0)::int AS field_reports,
      COALESCE(an.cnt, 0)::int AS analyses_done,
      COALESCE(ao.cnt, 0)::int AS analyses_open,
      (COALESCE(na.cnt, 0) + COALESCE(fe.cnt, 0) + COALESCE(an.cnt, 0))::int AS activity
    FROM tbl_users u
    LEFT JOIN tbl_units un ON un."UnitCode" = u.unit_cd
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM tbl_news_audit_log a
      JOIN tbl_news n ON n.id = a.news_id
      WHERE a.user_id = u.id
        AND a.created_at::date >= $1::date AND a.created_at::date <= $2::date
        AND ${instanceNewsSql("n")}
    ) na ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM tbl_unit_events e
      ${fieldReportTypeJoinSql("e")}
      WHERE e.sender_id = u.id::text
        AND e."createdAt"::date >= $1::date AND e."createdAt"::date <= $2::date
        AND (e.is_deleted = false OR e.is_deleted IS NULL)
        ${fieldReportListScopeSql("e", "rt_scope")}
    ) fe ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM tbl_analysis_assignments aa
      WHERE aa.analyst_id = u.id
        AND aa.status IN ('FinalApproved','Archived')
        AND COALESCE(aa.updated_at, aa.created_at)::date >= $1::date
        AND COALESCE(aa.updated_at, aa.created_at)::date <= $2::date
    ) an ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM tbl_analysis_assignments aa
      WHERE aa.analyst_id = u.id
        AND aa.status IN ('Assigned','InProgress','NeedsRevision','UnderReview')
    ) ao ON true
    WHERE u.active IS NOT FALSE
    ${unitSql}
    ORDER BY activity DESC, u.id
    LIMIT 80
    `,
    params,
  );

  const mapped = rows.map((r) => ({
    id: r.id,
    name: r.name || r.username,
    username: r.username,
    role: r.role,
    unit_name: r.unit_name,
    unit_id: r.unit_id != null ? String(r.unit_id) : null,
    news_actions: Number(r.news_actions) || 0,
    field_reports: Number(r.field_reports) || 0,
    analyses_done: Number(r.analyses_done) || 0,
    analyses_open: Number(r.analyses_open) || 0,
    activity: Number(r.activity) || 0,
    delay_score: Number(r.analyses_open) || 0,
    last_activity: r.last_activity || null,
    online: false,
    drilldown: `/users`,
  }));

  try {
    const { listOnlineUserIds } = await import("./userPresenceService.js");
    const onlineIds = await listOnlineUserIds(15);
    mapped.forEach((u) => {
      u.online = onlineIds.has(Number(u.id));
    });
  } catch {
    /* optional */
  }

  const byActivity = [...mapped].sort((a, b) => b.activity - a.activity);
  const leastActive = [...mapped].filter((u) => u.activity >= 0).sort((a, b) => a.activity - b.activity).slice(0, 15);
  const mostDelay = [...mapped].sort((a, b) => b.delay_score - a.delay_score || b.activity - a.activity).slice(0, 15);
  const mostAnalysis = [...mapped].sort((a, b) => b.analyses_done - a.analyses_done).slice(0, 15);
  const online = mapped.filter((u) => u.online).sort((a, b) => b.activity - a.activity).slice(0, 30);

  return {
    most_active: byActivity.slice(0, 15),
    least_active: leastActive,
    most_delay: mostDelay,
    most_analysis: mostAnalysis,
    online,
    online_count: online.length,
  };
}

export async function buildAiPerformance(range) {
  const { from, to } = range;

  const [total, ok, fail, byUsage, byStatus] = await Promise.all([
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
      [from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
         AND (COALESCE(status,'') ILIKE '%ok%' OR COALESCE(status,'') ILIKE '%success%'
              OR COALESCE(status,'') = 'done' OR COALESCE(status,'') = 'completed')`,
      [from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
         AND (COALESCE(status,'') ILIKE '%fail%' OR COALESCE(status,'') ILIKE '%error%')`,
      [from, to],
    ),
    safeRows(
      `SELECT COALESCE(usage_key_used, prompt_key, form_name, '—') AS key, COUNT(*)::int AS c
       FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
       GROUP BY 1 ORDER BY c DESC LIMIT 10`,
      [from, to],
    ),
    safeRows(
      `SELECT COALESCE(status,'unknown') AS status, COUNT(*)::int AS c
       FROM tbl_ai_run_logs
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date
       GROUP BY 1 ORDER BY c DESC LIMIT 12`,
      [from, to],
    ),
  ]);

  const successRate =
    total != null && total > 0 && ok != null
      ? Math.round((ok / total) * 1000) / 10
      : null;

  return {
    total_requests: total,
    success_count: ok,
    fail_count: fail,
    success_rate: successRate,
    avg_response_ms: null,
    top_usage_keys: byUsage.map((r) => ({ key: r.key, count: Number(r.c) })),
    by_status: byStatus.map((r) => ({ status: r.status, count: Number(r.c) })),
    drilldown: null,
  };
}

export async function getUnitDrilldown(unitId, range) {
  const { from, to } = range;
  const uid = String(unitId);

  const unit = (
    await safeRows(
      `SELECT "UnitCode" AS id, "UnitShortName" AS name, "StateName" AS province
       FROM tbl_units WHERE "UnitCode"::text = $1 LIMIT 1`,
      [uid],
    )
  )[0];

  const [users, reports, newsActions, openAnalysis] = await Promise.all([
    safeRows(
      `SELECT id, name, username, role FROM tbl_users
       WHERE unit_cd::text = $1 AND active IS NOT FALSE
       ORDER BY name NULLS LAST LIMIT 40`,
      [uid],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_unit_events e
       ${fieldReportTypeJoinSql("e")}
       WHERE e.unitcd::text = $1
         AND e."createdAt"::date >= $2::date AND e."createdAt"::date <= $3::date
         AND (e.is_deleted = false OR e.is_deleted IS NULL)
         ${fieldReportListScopeSql("e", "rt_scope")}`,
      [uid, from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_news_audit_log a
       JOIN tbl_users u ON u.id = a.user_id
       JOIN tbl_news n ON n.id = a.news_id
       WHERE u.unit_cd::text = $1
         AND a.created_at::date >= $2::date AND a.created_at::date <= $3::date
         AND ${instanceNewsSql("n")}`,
      [uid, from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments aa
       JOIN tbl_users u ON u.id = aa.analyst_id
       WHERE u.unit_cd::text = $1
         AND aa.status IN ('Assigned','InProgress','NeedsRevision','UnderReview')`,
      [uid],
    ),
  ]);

  return {
    unit: unit
      ? { id: String(unit.id), name: unit.name, province: unit.province }
      : { id: uid, name: uid, province: null },
    stats: {
      reports,
      news_actions: newsActions,
      open_analysis: openAnalysis,
      users: users.length,
    },
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.username,
      username: u.username,
      role: u.role,
    })),
    links: [
      { label: "مانیتور میدانی", path: "/field-monitor" },
      { label: "مدیریت کاربران", path: "/users" },
      { label: "مأموریت‌های تحلیل", path: "/analysis/missions" },
    ],
  };
}

export async function getUserDrilldown(userId, range) {
  const { from, to } = range;
  const id = Number(userId);
  if (!Number.isFinite(id)) {
    const err = new Error("شناسه کاربر نامعتبر");
    err.status = 400;
    throw err;
  }

  const user = (
    await safeRows(
      `SELECT u.id, u.name, u.username, u.role, un."UnitShortName" AS unit_name, un."UnitCode" AS unit_id
       FROM tbl_users u
       LEFT JOIN tbl_units un ON un."UnitCode" = u.unit_cd
       WHERE u.id = $1`,
      [id],
    )
  )[0];

  if (!user) {
    const err = new Error("کاربر یافت نشد");
    err.status = 404;
    throw err;
  }

  const [newsActions, fieldReports, analyses, recent] = await Promise.all([
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_news_audit_log a
       JOIN tbl_news n ON n.id = a.news_id
       WHERE a.user_id = $1 AND a.created_at::date >= $2::date AND a.created_at::date <= $3::date
         AND ${instanceNewsSql("n")}`,
      [id, from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_unit_events e
       ${fieldReportTypeJoinSql("e")}
       WHERE e.sender_id = $1::text
         AND e."createdAt"::date >= $2::date AND e."createdAt"::date <= $3::date
         AND (e.is_deleted = false OR e.is_deleted IS NULL)
         ${fieldReportListScopeSql("e", "rt_scope")}`,
      [id, from, to],
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments
       WHERE analyst_id = $1
         AND COALESCE(updated_at, created_at)::date >= $2::date
         AND COALESCE(updated_at, created_at)::date <= $3::date`,
      [id, from, to],
    ),
    safeRows(
      `SELECT 'news_audit' AS kind, a.created_at, a.action AS detail
       FROM tbl_news_audit_log a
       JOIN tbl_news n ON n.id = a.news_id
       WHERE a.user_id = $1 AND a.created_at::date >= $2::date AND a.created_at::date <= $3::date
         AND ${instanceNewsSql("n")}
       ORDER BY a.created_at DESC LIMIT 15`,
      [id, from, to],
    ),
  ]);

  return {
    user: {
      id: user.id,
      name: user.name || user.username,
      username: user.username,
      role: user.role,
      unit_name: user.unit_name,
      unit_id: user.unit_id != null ? String(user.unit_id) : null,
    },
    stats: {
      news_actions: newsActions,
      field_reports: fieldReports,
      analyses,
    },
    recent_activity: recent.map((r) => ({
      kind: r.kind,
      at: r.created_at,
      detail: r.detail,
    })),
    links: [
      { label: "کاربران", path: "/users" },
      { label: "مانیتور میدانی", path: "/field-monitor" },
      { label: "اخبار", path: "/news-manager" },
    ],
  };
}

export async function buildProvincesHeat(unitsHeat) {
  const map = new Map();
  for (const u of unitsHeat || []) {
    const p = u.province || "نامشخص";
    if (!map.has(p)) {
      map.set(p, {
        id: p,
        name: p,
        units: 0,
        activity: 0,
        users: 0,
        scores: [],
      });
    }
    const row = map.get(p);
    row.units += 1;
    row.activity += u.activity || 0;
    row.users += u.users || 0;
    if (u.health_score != null) row.scores.push(u.health_score);
  }
  return [...map.values()].map((r) => {
    const health_score =
      r.scores.length > 0
        ? Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length)
        : r.activity === 0
          ? 0
          : null;
    let status = "gray";
    if (health_score == null && r.activity === 0) status = "gray";
    else if (health_score >= 70) status = "green";
    else if (health_score >= 40) status = "yellow";
    else if (health_score != null) status = "red";
    return {
      id: r.id,
      name: r.name,
      units: r.units,
      users: r.users,
      activity: r.activity,
      health_score,
      status,
    };
  }).sort((a, b) => (b.health_score ?? -1) - (a.health_score ?? -1));
}

export async function buildPhase3DashboardBundle(range, unitsHeat) {
  const [users_leaderboard, ai_performance, provinces] = await Promise.all([
    buildUsersLeaderboard(range),
    buildAiPerformance(range),
    buildProvincesHeat(unitsHeat),
  ]);
  return { users_leaderboard, ai_performance, provinces };
}
