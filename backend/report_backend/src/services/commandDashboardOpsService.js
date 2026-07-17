/**
 * فاز ۲ داشبورد مرکز فرماندهی: نقش‌ها، Heat Map یگان، هشدارها، Health Score
 */
import pool from "../db.js";

async function safeCount(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return Number(r.rows[0]?.c ?? 0);
  } catch (e) {
    console.warn("[command-ops]", e.message);
    return null;
  }
}

async function safeRows(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.warn("[command-ops]", e.message);
    return [];
  }
}

const TRACKED_ROLES = [
  { id: "news_monitor", label: "پایشگر اخبار" },
  { id: "news_editor", label: "دبیر اخبار" },
  { id: "news_chief", label: "سردبیر اخبار" },
  { id: "analyst", label: "تحلیل‌گر" },
  { id: "mentor", label: "راهنما / داور" },
  { id: "analysis_manager", label: "مدیر تحلیل" },
  { id: "Field_admin", label: "مدیر میدانی" },
  { id: "user", label: "کاربر واحد" },
  { id: "strategy_viewer", label: "ناظر راهبردی" },
  { id: "strategy_commander", label: "فرمانده راهبردی" },
];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function healthStatus(score) {
  if (score == null) return "gray";
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  if (score > 0) return "red";
  return "gray";
}

function rolePerfStatus({ activity, overdue, users }) {
  if (!users) return "gray";
  if (activity === 0) return "gray";
  if (overdue > 5 || (users > 0 && activity / users < 0.2)) return "red";
  if (overdue > 0 || (users > 0 && activity / users < 1)) return "yellow";
  return "green";
}

/** آمار عملکرد نقش‌ها در بازه */
export async function buildRolesPerformance(range) {
  const { from, to, role: roleFilter } = range;
  const roles = roleFilter
    ? TRACKED_ROLES.filter((r) => r.id === roleFilter)
    : TRACKED_ROLES;

  const rows = [];
  for (const role of roles) {
    const [users, active, activity, overdue] = await Promise.all([
      safeCount(
        `SELECT COUNT(*)::int AS c FROM tbl_users
         WHERE active IS NOT FALSE AND role::text ILIKE '%' || $1 || '%'`,
        [role.id],
      ),
      safeCount(
        `
        SELECT COUNT(DISTINCT uid)::int AS c FROM (
          SELECT a.user_id AS uid
          FROM tbl_news_audit_log a
          JOIN tbl_users u ON u.id = a.user_id
          WHERE a.created_at::date >= $1::date AND a.created_at::date <= $2::date
            AND u.role::text ILIKE '%' || $3 || '%'
          UNION
          SELECT NULLIF(e.sender_id, '')::int AS uid
          FROM tbl_unit_events e
          JOIN tbl_users u ON u.id::text = e.sender_id
          WHERE e."createdAt"::date >= $1::date AND e."createdAt"::date <= $2::date
            AND (e.is_deleted = false OR e.is_deleted IS NULL)
            AND e.sender_id ~ '^[0-9]+$'
            AND u.role::text ILIKE '%' || $3 || '%'
        ) x WHERE uid IS NOT NULL
        `,
        [from, to, role.id],
      ),
      safeCount(
        `
        SELECT (
          (SELECT COUNT(*)::int FROM tbl_news_audit_log a
           JOIN tbl_users u ON u.id = a.user_id
           WHERE a.created_at::date >= $1::date AND a.created_at::date <= $2::date
             AND u.role::text ILIKE '%' || $3 || '%')
          +
          (SELECT COUNT(*)::int FROM tbl_unit_events e
           JOIN tbl_users u ON u.id::text = e.sender_id
           WHERE e."createdAt"::date >= $1::date AND e."createdAt"::date <= $2::date
             AND (e.is_deleted = false OR e.is_deleted IS NULL)
             AND u.role::text ILIKE '%' || $3 || '%')
        )::int AS c
        `,
        [from, to, role.id],
      ),
      role.id === "news_editor" || role.id === "news_monitor"
        ? safeCount(
            `SELECT COUNT(*)::int AS c FROM tbl_news
             WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')='pending'`,
          )
        : role.id === "news_chief"
          ? safeCount(
              `SELECT COUNT(*)::int AS c FROM tbl_news
               WHERE COALESCE(is_deleted,false)=false AND COALESCE(workflow_status,'')='reviewed'`,
            )
          : role.id === "analyst" || role.id === "mentor" || role.id === "analysis_manager"
            ? safeCount(
                `SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments
                 WHERE status IN ('Assigned','InProgress','NeedsRevision','UnderReview')`,
              )
            : Promise.resolve(0),
    ]);

    const userCount = users ?? 0;
    const activeCount = active ?? 0;
    const activityVol = activity ?? 0;
    const overdueCount = overdue ?? 0;
    const doneApprox = Math.max(0, activityVol - overdueCount);

    rows.push({
      id: role.id,
      label: role.label,
      users: userCount,
      active: activeCount,
      inactive: Math.max(0, userCount - activeCount),
      activity: activityVol,
      tasks_done: doneApprox,
      tasks_overdue: overdueCount,
      avg_response_hours: null,
      status: rolePerfStatus({
        activity: activityVol,
        overdue: overdueCount,
        users: userCount,
      }),
      drilldown: "/users",
    });
  }

  return rows;
}

function unitHealthScore({ activity, users, overdueShare }) {
  if (!users && activity === 0) return null;
  if (activity === 0) return 0;
  let score = 55;
  score += clamp(activity * 3, 0, 35);
  if (users > 0) {
    const perUser = activity / users;
    score += clamp(perUser * 8, 0, 20);
  }
  score -= clamp((overdueShare || 0) * 40, 0, 40);
  return Math.round(clamp(score, 0, 100));
}

/** Heat map یگان‌ها */
export async function buildUnitsHeatMap(range) {
  const { from, to, unit_id } = range;
  const params = [from, to];
  let unitFilter = "";
  if (unit_id) {
    params.push(unit_id);
    unitFilter += ` AND un."UnitCode" = $${params.length}`;
  }
  if (range.province) {
    params.push(range.province);
    unitFilter += ` AND un."StateName" = $${params.length}`;
  }

  const rows = await safeRows(
    `
    SELECT
      un."UnitCode" AS id,
      un."UnitShortName" AS name,
      un."StateName" AS province,
      (SELECT COUNT(*)::int FROM tbl_users u
        WHERE u.unit_cd = un."UnitCode" AND u.active IS NOT FALSE) AS users,
      (SELECT COUNT(*)::int FROM tbl_unit_events e
        WHERE e.unitcd = un."UnitCode"
          AND e."createdAt"::date >= $1::date AND e."createdAt"::date <= $2::date
          AND (e.is_deleted = false OR e.is_deleted IS NULL)) AS reports,
      (SELECT COUNT(*)::int FROM tbl_news_audit_log a
        JOIN tbl_users u ON u.id = a.user_id
        WHERE u.unit_cd = un."UnitCode"
          AND a.created_at::date >= $1::date AND a.created_at::date <= $2::date) AS news_actions,
      (SELECT COUNT(*)::int FROM tbl_analysis_assignments aa
        JOIN tbl_users u ON u.id = aa.analyst_id
        WHERE u.unit_cd = un."UnitCode"
          AND aa.status IN ('FinalApproved','Archived')
          AND COALESCE(aa.updated_at, aa.created_at)::date >= $1::date
          AND COALESCE(aa.updated_at, aa.created_at)::date <= $2::date) AS analyses,
      (SELECT COUNT(*)::int FROM tbl_unit_events e
        WHERE e.unitcd = un."UnitCode"
          AND COALESCE(e.state,'') = 'pending'
          AND (e.is_deleted = false OR e.is_deleted IS NULL)) AS pending_field
    FROM tbl_units un
    WHERE un."UnitCode" IS NOT NULL
    ${unitFilter}
    ORDER BY un."UnitShortName"
    LIMIT 200
    `,
    params,
  );

  return rows.map((r) => {
    const users = Number(r.users) || 0;
    const reports = Number(r.reports) || 0;
    const newsActions = Number(r.news_actions) || 0;
    const analyses = Number(r.analyses) || 0;
    const pending = Number(r.pending_field) || 0;
    const activity = reports + newsActions + analyses;
    const overdueShare = activity > 0 ? pending / (activity + pending) : pending > 0 ? 1 : 0;
    const score = unitHealthScore({ activity, users, overdueShare });
    let status = healthStatus(score);
    if (activity === 0) status = "gray";

    return {
      id: String(r.id),
      name: r.name || String(r.id),
      province: r.province || null,
      users,
      activity,
      reports,
      news: newsActions,
      analyses,
      products: 0,
      quality_avg: null,
      avg_response_hours: null,
      health_score: score,
      status,
      drilldown: "/field-monitor",
    };
  });
}

/** امتیاز سلامت کل سامانه */
export async function buildHealthScore(range, unitsHeat, kpiBar) {
  const units = unitsHeat || [];
  const withScore = units.filter((u) => u.health_score != null);
  const avgUnit =
    withScore.length > 0
      ? Math.round(withScore.reduce((s, u) => s + u.health_score, 0) / withScore.length)
      : null;

  const overdueItem = (kpiBar || []).find((k) => k.id === "overdue_processes");
  const overdue = overdueItem?.value;
  let system = avgUnit != null ? avgUnit : 60;
  if (overdue != null) {
    system -= clamp(overdue * 1.5, 0, 35);
  }
  const activeUnits = units.filter((u) => u.activity > 0).length;
  const idleUnits = units.filter((u) => u.users > 0 && u.activity === 0).length;
  if (units.length > 0) {
    system += clamp((activeUnits / units.length) * 15, 0, 15);
    system -= clamp((idleUnits / units.length) * 25, 0, 25);
  }
  system = Math.round(clamp(system, 0, 100));

  return {
    system_score: system,
    system_status: healthStatus(system),
    units_avg: avgUnit,
    active_units: activeUnits,
    idle_units: idleUnits,
    factors: {
      activity: activeUnits,
      overdue: overdue ?? null,
      participation: units.length ? Math.round((activeUnits / units.length) * 100) : null,
    },
  };
}

/** هشدارهای مدیریتی مبتنی بر قاعده */
export async function buildManagementAlerts(range, { unitsHeat, kpiBar, health }) {
  const now = new Date().toISOString();
  const alerts = [];
  const units = unitsHeat || [];

  const idle = units.filter((u) => u.users > 0 && u.activity === 0).slice(0, 8);
  for (const u of idle) {
    alerts.push({
      id: `unit_idle_${u.id}`,
      type: "unit_idle",
      priority: "medium",
      title: `یگان بدون فعالیت: ${u.name}`,
      message: `یگان «${u.name}» در بازه انتخابی فعالیتی ثبت نکرده است.`,
      time: now,
      owner: "مدیر میدانی",
      status: "open",
      drilldown: "/field-monitor",
    });
  }

  const overdue = (kpiBar || []).find((k) => k.id === "overdue_processes");
  if (overdue?.value != null && overdue.value > 15) {
    alerts.push({
      id: "queue_high",
      type: "queue_high",
      priority: overdue.value > 40 ? "high" : "medium",
      title: "افزایش فرآیندهای معوق",
      message: `${overdue.value} مورد در صف‌های اخبار و تحلیل باز است.`,
      time: now,
      owner: "مدیر اخبار / مدیر تحلیل",
      status: "open",
      drilldown: "/news-manager",
    });
  }

  const newsPending = (kpiBar || []).find((k) => k.id === "news_received");
  // use processes-like: check delta on field/news
  for (const k of kpiBar || []) {
    if (["field_reports", "news_received", "analyses"].includes(k.id) && k.delta_pct != null && k.delta_pct <= -30) {
      alerts.push({
        id: `drop_${k.id}`,
        type: "performance_drop",
        priority: k.delta_pct <= -50 ? "high" : "medium",
        title: `کاهش ${k.label}`,
        message: `نسبت به دوره قبل ${k.delta_pct}٪ کاهش یافته است.`,
        time: now,
        owner: "مدیرکل",
        status: "open",
        drilldown: k.drilldown,
      });
    }
  }

  const analysisOpen = await safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_analysis_assignments
     WHERE status IN ('Assigned','InProgress','NeedsRevision','UnderReview')`,
  );
  if (analysisOpen != null && analysisOpen > 10) {
    alerts.push({
      id: "analysis_overdue",
      type: "analysis_overdue",
      priority: analysisOpen > 25 ? "high" : "medium",
      title: "تحلیل‌های معوق",
      message: `${analysisOpen} مأموریت تحلیل در وضعیت باز است.`,
      time: now,
      owner: "مدیر تحلیل",
      status: "open",
      drilldown: "/analysis/missions",
    });
  }

  const criticalNews = await safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_news
     WHERE COALESCE(is_deleted,false)=false
       AND created_at::date >= $1::date AND created_at::date <= $2::date
       AND (COALESCE(priority,'') ILIKE '%urgent%' OR COALESCE(priority,'') ILIKE '%فوری%'
            OR COALESCE(priority,'') = '1')`,
    [range.from, range.to],
  );
  if (criticalNews != null && criticalNews >= 5) {
    alerts.push({
      id: "critical_news",
      type: "critical_news",
      priority: "high",
      title: "افزایش اخبار بحرانی / فوری",
      message: `${criticalNews} خبر با اولویت فوری در بازه ثبت شده است.`,
      time: now,
      owner: "سردبیر اخبار",
      status: "open",
      drilldown: "/command/live-news",
    });
  }

  if (health?.system_score != null && health.system_score < 40) {
    alerts.push({
      id: "health_low",
      type: "health_low",
      priority: "high",
      title: "افت شاخص سلامت سامانه",
      message: `امتیاز سلامت کلی به ${health.system_score} رسیده است.`,
      time: now,
      owner: "مدیرکل",
      status: "open",
      drilldown: "/command",
    });
  }

  const aiFails = await safeCount(
    `SELECT COUNT(*)::int AS c FROM tbl_ai_run_logs
     WHERE created_at::date >= $1::date AND created_at::date <= $2::date
       AND COALESCE(status,'') ILIKE '%fail%'`,
    [range.from, range.to],
  );
  if (aiFails != null && aiFails >= 3) {
    alerts.push({
      id: "ai_fail",
      type: "ai_disruption",
      priority: "medium",
      title: "اختلال سرویس AI",
      message: `${aiFails} اجرای ناموفق AI در بازه ثبت شده است.`,
      time: now,
      owner: "مدیر فنی",
      status: "open",
      drilldown: null,
    });
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9));

  // silence unused
  void newsPending;

  return alerts.slice(0, 30);
}

export async function buildPhase2DashboardBundle(range, kpiBar) {
  const roles = await buildRolesPerformance(range);
  const units_heatmap = await buildUnitsHeatMap(range);
  const health = await buildHealthScore(range, units_heatmap, kpiBar);
  const alerts = await buildManagementAlerts(range, {
    unitsHeat: units_heatmap,
    kpiBar,
    health,
  });
  return { roles, units_heatmap, health, alerts };
}
