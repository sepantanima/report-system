import pool from "../db.js";
import {
  instanceNewsAndSql,
  instanceNewsSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";
import { userRoleTextExpr, userRoleTextSelect } from "../utils/userRoleSql.js";

const ACTIVE_USER = `u.active IS DISTINCT FROM false`;

export async function resolveUserIdsFromTargets(targets = []) {
  const ids = new Set();
  for (const t of targets) {
    const type = String(t.target_type || t.type || "").trim();
    const value = t.target_value != null ? String(t.target_value).trim() : "";
    const rows = await resolveSingleTarget(type, value);
    rows.forEach((id) => ids.add(id));
  }
  return [...ids];
}

async function resolveSingleTarget(targetType, targetValue) {
  switch (targetType) {
    case "all": {
      const r = await pool.query(`SELECT id FROM tbl_users u WHERE ${ACTIVE_USER}`);
      return r.rows.map((x) => x.id);
    }
    case "role": {
      const r = await pool.query(
        `SELECT id FROM tbl_users u WHERE ${ACTIVE_USER} AND ${userRoleTextExpr("u")} ILIKE $1`,
        [`%${targetValue}%`],
      );
      return r.rows.map((x) => x.id);
    }
    case "unit": {
      const unitCd = parseInt(targetValue, 10);
      if (!Number.isFinite(unitCd)) return [];
      const r = await pool.query(
        `SELECT id FROM tbl_users u WHERE ${ACTIVE_USER} AND u.unit_cd = $1`,
        [unitCd],
      );
      return r.rows.map((x) => x.id);
    }
    case "user": {
      const uid = parseInt(targetValue, 10);
      if (!Number.isFinite(uid)) return [];
      const r = await pool.query(
        `SELECT id FROM tbl_users u WHERE ${ACTIVE_USER} AND u.id = $1`,
        [uid],
      );
      return r.rows.map((x) => x.id);
    }
    case "news_category": {
      const catId = parseInt(targetValue, 10);
      if (!Number.isFinite(catId)) return [];
      const r = await pool.query(
        `SELECT DISTINCT u.id FROM tbl_users u
         WHERE ${ACTIVE_USER}
           AND (
             ${userRoleTextExpr("u")} ILIKE '%news_monitor%'
             OR ${userRoleTextExpr("u")} ILIKE '%news_editor%'
             OR ${userRoleTextExpr("u")} ILIKE '%news_chief%'
             OR EXISTS (
               SELECT 1 FROM tbl_news n
               JOIN tbl_news_category_links cl ON cl.news_id = n.id
               WHERE n.observer_id = u.id AND cl.category_id = $1
                 AND COALESCE(n.is_deleted, false) = false
                 AND ${instanceNewsSql("n")}
             )
           )`,
        [catId],
      );
      return r.rows.map((x) => x.id);
    }
    case "report_type": {
      const r = await pool.query(
        `SELECT DISTINCT u.id FROM tbl_users u
         WHERE ${ACTIVE_USER}
           AND (
             ${userRoleTextExpr("u")} ILIKE '%user%'
             OR ${userRoleTextExpr("u")} ILIKE '%Field_admin%'
           )
           AND EXISTS (
             SELECT 1 FROM tbl_unit_events e
             ${fieldReportTypeJoinSql("e")}
             WHERE e.sender_id = u.id::text
               AND (e.is_deleted = false OR e.is_deleted IS NULL)
               AND (e.chat_title = $1 OR e.message_type = $1)
               AND e.date >= to_char(CURRENT_DATE - INTERVAL '30 days', 'YYYY-MM-DD')
               ${fieldReportListScopeSql("e", "rt_scope")}
           )`,
        [targetValue],
      );
      return r.rows.map((x) => x.id);
    }
    default:
      return [];
  }
}

export async function resolveEntityOwnerUserIds(entityType, entityId) {
  if (entityType === "news") {
    const newsId = parseInt(entityId, 10);
    if (!Number.isFinite(newsId)) return [];
    const r = await pool.query(
      `SELECT observer_id AS id FROM tbl_news WHERE id = $1 AND COALESCE(is_deleted, false) = false${instanceNewsAndSql("tbl_news")}`,
      [newsId],
    );
    const oid = r.rows[0]?.id;
    return oid ? [oid] : [];
  }
  if (entityType === "field_report") {
    const r = await pool.query(
      `SELECT sender_id FROM tbl_unit_events e
       ${fieldReportTypeJoinSql("e")}
       WHERE e.hash_key = $1 AND (e.is_deleted = false OR e.is_deleted IS NULL)
         ${fieldReportListScopeSql("e", "rt_scope")}`,
      [String(entityId)],
    );
    const sid = r.rows[0]?.sender_id;
    if (!sid) return [];
    const uid = parseInt(sid, 10);
    return Number.isFinite(uid) ? [uid] : [];
  }
  return [];
}

export async function estimateAudienceCount(targets = []) {
  const ids = await resolveUserIdsFromTargets(targets);
  return ids.length;
}
