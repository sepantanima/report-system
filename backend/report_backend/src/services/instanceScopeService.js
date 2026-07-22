import pool from "../db.js";
import { getInstanceMode, getOrgCode, getOrgRole } from "./instanceConfig.js";

/**
 * Instance + channel filters for queries.
 * ONLINE: hide OFFLINE_ONLY report types; field reports origin=online for BOTH.
 * OFFLINE: show all local + imported.
 */

function sqlLiteral(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

/** Inline SQL — org + origin filter for news (no params) */
export function instanceNewsSql(alias = "n") {
  const parts = [`${alias}.org_code = ${sqlLiteral(getOrgCode())}`];
  if (getInstanceMode() === "online") {
    parts.push(`(${alias}.origin_instance = 'online' OR ${alias}.origin_instance IS NULL)`);
  }
  return parts.join(" AND ");
}

/** Param-based news filter for dynamic queries */
export function instanceNewsWhere(alias = "n", startParam = 1) {
  const mode = getInstanceMode();
  const parts = [];
  const params = [];
  let idx = startParam;

  parts.push(`${alias}.org_code = $${idx}`);
  params.push(getOrgCode());
  idx++;

  if (mode === "online") {
    parts.push(`(${alias}.origin_instance = 'online' OR ${alias}.origin_instance IS NULL)`);
  }

  return { sql: parts.length ? `(${parts.join(" AND ")})` : "TRUE", params, nextIndex: idx };
}

/** Append AND (...) instance scope to a WHERE clause; mutates params */
export function appendInstanceNewsFilter(where, params, alias = "n") {
  const { sql, params: scopeParams } = instanceNewsWhere(alias, params.length + 1);
  return { where: `${where} AND ${sql}`, params: [...params, ...scopeParams] };
}

/** org + origin for field reports (no channel_policy — use with join helper when needed) */
export function fieldReportOriginScopeSql(alias = "e") {
  let sql = ` AND ${alias}.org_code = ${sqlLiteral(getOrgCode())}`;
  if (getInstanceMode() === "online") {
    sql += ` AND (${alias}.origin_instance = 'online' OR ${alias}.origin_instance IS NULL)`;
  }
  return sql;
}

export function fieldReportTypeJoinSql(alias = "e", rtAlias = "rt_scope") {
  return `LEFT JOIN tbl_report_types ${rtAlias} ON ${rtAlias}.id = ${alias}.report_type_id`;
}

/** Hide OFFLINE_ONLY types on ONLINE hub */
export function fieldReportChannelPolicySql(alias = "e", rtAlias = "rt_scope") {
  if (getInstanceMode() === "offline") return "";
  return ` AND (COALESCE(${rtAlias}.channel_policy, 'BOTH') != 'OFFLINE_ONLY' OR ${alias}.report_type_id IS NULL)`;
}

/** Full list scope: org + origin + channel policy (requires type join) */
export function fieldReportListScopeSql(alias = "e", rtAlias = "rt_scope") {
  return `${fieldReportOriginScopeSql(alias)}${fieldReportChannelPolicySql(alias, rtAlias)}`;
}

export function fieldReportOriginFilter(alias = "r", mode = getInstanceMode()) {
  if (mode === "offline") return { sql: "TRUE", params: [] };
  return {
    sql: `(${alias}.origin_instance = 'online' OR ${alias}.origin_instance IS NULL)`,
    params: [],
  };
}

export async function getReportTypePolicies(client = pool) {
  const r = await client.query(
    `SELECT id, code, channel_policy FROM tbl_report_types WHERE active = TRUE OR active IS NULL`,
  ).catch(() => ({ rows: [] }));
  return r.rows;
}

export function fieldReportTypeFilter(reportTypes, mode = getInstanceMode()) {
  return reportTypes.filter((rt) => {
    const policy = rt.channel_policy || "BOTH";
    if (mode === "online" && policy === "OFFLINE_ONLY") return false;
    return true;
  });
}

/** SQL WHERE fragment for report_types list API */
export function reportTypesListWhereSql() {
  if (getInstanceMode() === "offline") return "";
  return ` WHERE COALESCE(channel_policy, 'BOTH') != 'OFFLINE_ONLY'`;
}

/** Inline AND-clause suffix (starts with " AND ") */
export function instanceNewsAndSql(alias = "n") {
  return ` AND ${instanceNewsSql(alias)}`;
}

/** Generic entity scope (news, smart analysis packs/analyses) */
export function instanceEntityAndSql(alias) {
  return instanceNewsAndSql(alias);
}

export function fieldEventsScopedFrom(alias = "e", rtAlias = "rt_scope") {
  return `tbl_unit_events ${alias} ${fieldReportTypeJoinSql(alias, rtAlias)}`;
}

export function appendInstanceEntityFilter(where, params, alias) {
  return appendInstanceNewsFilter(where, params, alias);
}

export function hubSyncCapabilities() {
  const mode = getInstanceMode();
  const orgRole = getOrgRole();
  return {
    instance_mode: mode,
    org_code: getOrgCode(),
    org_role: orgRole,
    can_export_pack: mode === "online",
    can_import_pack: mode === "offline",
    can_briefing: mode === "offline",
    can_parent_aggregate: mode === "online" && orgRole === "parent",
    can_child_export: mode === "online" && orgRole === "child",
  };
}
