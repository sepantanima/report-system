import { getOrgCode, getOrgRole } from "./instanceConfig.js";

export function currentOrgCode() {
  return getOrgCode();
}

/** Stamp org_code on insert payloads */
export function stampOrgCode(row = {}) {
  return { ...row, org_code: row.org_code || currentOrgCode() };
}

/** SQL fragment + params for org filter in standalone/child mode */
export function orgScopeClause(alias = "", paramIndex = 1) {
  const col = alias ? `${alias}.org_code` : "org_code";
  const role = getOrgRole();
  if (role === "parent") {
    return { sql: "", params: [], nextIndex: paramIndex };
  }
  return {
    sql: ` AND ${col} = $${paramIndex}`,
    params: [currentOrgCode()],
    nextIndex: paramIndex + 1,
  };
}

export function orgFilterSql(tableAlias, paramIndex = 1) {
  return orgScopeClause(tableAlias, paramIndex);
}
