import crypto from "crypto";
import { getOrgCode, getInstanceMode } from "./instanceConfig.js";

export const SYNC_ENTITY_TYPES = {
  NEWS: "news",
  FIELD_REPORT: "field_report",
  SMART_ANALYSIS_PACK: "smart_analysis_pack",
  SMART_ANALYSIS: "smart_analysis",
};

/** شناسهٔ پایدار برای merge/dedup در export/import */
export function newSyncIdentity(overrides = {}) {
  return {
    global_id: overrides.global_id || crypto.randomUUID(),
    org_code: overrides.org_code || getOrgCode(),
    origin_instance: overrides.origin_instance || getInstanceMode(),
    sync_version: overrides.sync_version ?? 0,
  };
}

export function syncIdentityInsertColumns() {
  return ["global_id", "org_code", "origin_instance", "sync_version"];
}

export function syncIdentityInsertValues(identity = newSyncIdentity()) {
  const id = identity.global_id ?? newSyncIdentity().global_id;
  return [id, identity.org_code ?? getOrgCode(), identity.origin_instance ?? getInstanceMode(), identity.sync_version ?? 0];
}

/** آیا نسخهٔ ورودی از رکورد محلی جدیدتر است؟ */
export function isIncomingNewer(incoming, local) {
  const inVer = incoming?.sync_version ?? 0;
  const locVer = local?.sync_version ?? 0;
  if (inVer > locVer) return true;
  if (inVer < locVer) return false;
  const inAt = incoming?.updated_at ? new Date(incoming.updated_at).getTime() : 0;
  const locAt = local?.updated_at ? new Date(local.updated_at).getTime() : 0;
  return inAt > locAt;
}

/** پیش‌بینی insert/update/skip/conflict برای dry-run import */
export async function previewRowMergeAction(db, table, row) {
  if (!row?.global_id) return "skip";
  const ex = await db.query(
    `SELECT sync_version, updated_at FROM ${table} WHERE global_id = $1`,
    [row.global_id],
  );
  if (!ex.rows[0]) return "insert";
  if (isIncomingNewer(row, ex.rows[0])) return "update";
  const inVer = row?.sync_version ?? 0;
  const locVer = ex.rows[0]?.sync_version ?? 0;
  if (inVer !== locVer) return "conflict";
  const inAt = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
  const locAt = ex.rows[0]?.updated_at ? new Date(ex.rows[0].updated_at).getTime() : 0;
  if (inAt !== locAt && locAt > inAt) return "conflict";
  return "skip";
}

export async function countMergePreview(db, table, rows) {
  const counts = { insert: 0, update: 0, skip: 0, conflict: 0 };
  for (const row of rows) {
    const action = await previewRowMergeAction(db, table, row);
    if (counts[action] != null) counts[action]++;
    else counts.skip++;
  }
  return counts;
}

/** قبل از export: هر رکورد بدون global_id را backfill می‌کند */
export async function backfillMissingGlobalIds(db, table) {
  await db.query(
    `UPDATE ${table}
     SET global_id = gen_random_uuid(),
         org_code = COALESCE(org_code, $1),
         origin_instance = COALESCE(origin_instance, $2)
     WHERE global_id IS NULL`,
    [getOrgCode(), getInstanceMode()],
  ).catch(() => {});
}
