import crypto from "crypto";
import { getOrgCode, getOrgRole, getInstanceMode } from "./instanceConfig.js";
import pool from "../db.js";
import {
  createSyncRun,
  sha256,
  markEntitiesInFlight,
  markEntitiesApplied,
  findRunByChecksum,
  updateSyncRunStatus,
  recordSyncConflict,
  getSyncStatus,
} from "./syncLedgerService.js";
import {
  mergeNewsRow,
  mergeFieldReportRow,
  mergeSmartAnalysisPackRow,
  mergeSmartAnalysisRow,
  mergeReportTypes,
  applyRbacSnapshot,
} from "./syncEntityMerge.js";
import {
  backfillMissingGlobalIds,
  countMergePreview,
  SYNC_ENTITY_TYPES,
} from "./syncIdentityService.js";

const PACK_VERSION = 1;
const previewTokens = new Map();

function sqlLiteral(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

/** Delta export: رکوردهای جدید، in_flight، یا تغییر یافته از آخرین apply */
function deltaEntitySql(alias, entityType, updatedAtExpr) {
  const org = sqlLiteral(getOrgCode());
  return ` AND (
    NOT EXISTS (
      SELECT 1 FROM tbl_sync_entity_state es
      WHERE es.global_id = ${alias}.global_id
        AND es.entity_type = '${entityType}'
        AND es.org_code = ${org}
    )
    OR EXISTS (
      SELECT 1 FROM tbl_sync_entity_state es
      WHERE es.global_id = ${alias}.global_id
        AND es.entity_type = '${entityType}'
        AND es.org_code = ${org}
        AND (
          es.sync_status IN ('pending_outbound', 'in_flight')
          OR ${updatedAtExpr} > COALESCE(es.last_applied_at, '1970-01-01'::timestamptz)
        )
    )
  )`;
}

function safeStringify(obj) {
  return JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

export function buildManifest({ direction, entityCounts, packId }) {
  return {
    pack_version: PACK_VERSION,
    org_code: getOrgCode(),
    org_role: getOrgRole(),
    direction,
    source_instance: getInstanceMode(),
    exported_at: new Date().toISOString(),
    pack_id: packId,
    entity_counts: entityCounts,
  };
}

async function fetchExportNews(exportMode = "delta") {
  const org = getOrgCode();
  let deltaSql = "";
  if (exportMode === "delta") {
    deltaSql = deltaEntitySql("tbl_news", SYNC_ENTITY_TYPES.NEWS, "COALESCE(tbl_news.updated_at, tbl_news.created_at)");
  }
  const r = await pool.query(
    `SELECT * FROM tbl_news
     WHERE org_code = $1 AND (origin_instance = 'online' OR origin_instance IS NULL)
       ${deltaSql}
     ORDER BY id DESC LIMIT 500`,
    [org],
  ).catch(async () => {
    return pool.query(
      `SELECT * FROM tbl_news ORDER BY id DESC LIMIT 500`,
    );
  });
  return r.rows;
}

async function fetchExportFieldReports(exportMode = "delta") {
  const org = getOrgCode();
  let deltaSql = "";
  if (exportMode === "delta") {
    deltaSql = deltaEntitySql(
      "e",
      SYNC_ENTITY_TYPES.FIELD_REPORT,
      `COALESCE(e."updatedAt", e.updated_at, e."createdAt", e.created_at)`,
    );
  }
  const r = await pool.query(
    `SELECT e.*
     FROM tbl_unit_events e
     JOIN tbl_report_types rt ON rt.id = e.report_type_id
     WHERE e.org_code = $1 AND (e.origin_instance = 'online' OR e.origin_instance IS NULL)
       AND COALESCE(rt.channel_policy, 'BOTH') != 'OFFLINE_ONLY'
       AND (e.is_deleted = false OR e.is_deleted IS NULL)
       ${deltaSql}
     ORDER BY e.created_at DESC LIMIT 500`,
    [org],
  ).catch(() => ({ rows: [] }));
  return r.rows;
}

async function fetchExportSmartAnalysisPacks(exportMode = "delta") {
  const org = getOrgCode();
  let deltaSql = "";
  if (exportMode === "delta") {
    deltaSql = deltaEntitySql(
      "tbl_news_smart_analysis_packs",
      SYNC_ENTITY_TYPES.SMART_ANALYSIS_PACK,
      "COALESCE(tbl_news_smart_analysis_packs.updated_at, tbl_news_smart_analysis_packs.created_at)",
    );
  }
  const r = await pool.query(
    `SELECT * FROM tbl_news_smart_analysis_packs
     WHERE org_code = $1 AND (origin_instance = 'online' OR origin_instance IS NULL)
       ${deltaSql}
     ORDER BY created_at DESC LIMIT 200`,
    [org],
  ).catch(() => ({ rows: [] }));
  return r.rows;
}

async function fetchExportSmartAnalyses(packGlobalByLocalId, exportMode = "delta") {
  const org = getOrgCode();
  let deltaSql = "";
  if (exportMode === "delta") {
    deltaSql = deltaEntitySql(
      "tbl_news_smart_analyses",
      SYNC_ENTITY_TYPES.SMART_ANALYSIS,
      "COALESCE(tbl_news_smart_analyses.updated_at, tbl_news_smart_analyses.created_at)",
    );
  }

  const r = await pool.query(
    `SELECT * FROM tbl_news_smart_analyses
     WHERE org_code = $1 AND (origin_instance = 'online' OR origin_instance IS NULL)
       ${deltaSql}
     ORDER BY created_at DESC LIMIT 500`,
    [org],
  ).catch(() => ({ rows: [] }));

  return r.rows.map((row) => {
    const exported = { ...row };
    if (row.pack_id != null) {
      exported.pack_global_id = packGlobalByLocalId.get(row.pack_id) || null;
    }
    delete exported.pack_id;
    return exported;
  });
}

async function prepareExportEntities(exportMode = "delta") {
  await backfillMissingGlobalIds(pool, "tbl_news");
  await backfillMissingGlobalIds(pool, "tbl_unit_events");
  await backfillMissingGlobalIds(pool, "tbl_news_smart_analysis_packs");
  await backfillMissingGlobalIds(pool, "tbl_news_smart_analyses");

  const news = await fetchExportNews(exportMode);
  const field = await fetchExportFieldReports(exportMode);
  const smartPacks = await fetchExportSmartAnalysisPacks(exportMode);
  const packGlobalByLocalId = new Map(
    smartPacks.filter((p) => p.global_id).map((p) => [p.id, p.global_id]),
  );
  const smartAnalyses = await fetchExportSmartAnalyses(packGlobalByLocalId, exportMode);
  const rbac = await fetchRbacSnapshot();
  const reportTypes = await pool.query(
    `SELECT id, code, title_fa, channel_policy FROM tbl_report_types`,
  ).catch(() => ({ rows: [] }));

  return { news, field, smartPacks, smartAnalyses, rbac, reportTypes: reportTypes.rows };
}

function collectInFlightEntities({ news, field, smartPacks, smartAnalyses }) {
  return [
    ...news.filter((n) => n.global_id).map((n) => ({ global_id: n.global_id, entity_type: SYNC_ENTITY_TYPES.NEWS })),
    ...field.filter((f) => f.global_id).map((f) => ({ global_id: f.global_id, entity_type: SYNC_ENTITY_TYPES.FIELD_REPORT })),
    ...smartPacks.filter((p) => p.global_id).map((p) => ({ global_id: p.global_id, entity_type: SYNC_ENTITY_TYPES.SMART_ANALYSIS_PACK })),
    ...smartAnalyses.filter((a) => a.global_id).map((a) => ({ global_id: a.global_id, entity_type: SYNC_ENTITY_TYPES.SMART_ANALYSIS })),
  ];
}

async function countEntityMergePreview(entities) {
  const newsCounts = await countMergePreview(pool, "tbl_news", entities.news || []);
  const fieldCounts = await countMergePreview(pool, "tbl_unit_events", entities.field_reports || []);
  const packCounts = await countMergePreview(pool, "tbl_news_smart_analysis_packs", entities.smart_analysis_packs || []);
  const analysisCounts = await countMergePreview(pool, "tbl_news_smart_analyses", entities.smart_analyses || []);

  return {
    insert: newsCounts.insert + fieldCounts.insert + packCounts.insert + analysisCounts.insert,
    update: newsCounts.update + fieldCounts.update + packCounts.update + analysisCounts.update,
    skip: newsCounts.skip + fieldCounts.skip + packCounts.skip + analysisCounts.skip,
    conflict: newsCounts.conflict + fieldCounts.conflict + packCounts.conflict + analysisCounts.conflict,
  };
}
async function fetchRbacSnapshot() {
  const roles = await pool.query(
    `SELECT rt.code, rt.label_fa, array_agg(p.code ORDER BY p.code) AS permissions
     FROM tbl_role_templates rt
     LEFT JOIN tbl_role_template_permissions rtp ON rtp.role_template_id = rt.id
     LEFT JOIN tbl_permissions p ON p.id = rtp.permission_id
     GROUP BY rt.id, rt.code, rt.label_fa`,
  ).catch(() => ({ rows: [] }));

  const assignments = await pool.query(
    `SELECT u.username, rt.code AS role_code
     FROM tbl_user_role_assignments ura
     JOIN tbl_users u ON u.id = ura.user_id
     JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
     WHERE ura.active = TRUE`,
  ).catch(() => ({ rows: [] }));

  return { roles: roles.rows, assignments: assignments.rows };
}

export async function previewExport(options = {}) {
  const exportMode = options.mode === "full" ? "full" : "delta";
  const { news, field, smartPacks, smartAnalyses, rbac } = await prepareExportEntities(exportMode);
  const status = await getSyncStatus().catch(() => null);

  return {
    direction: "online_to_offline",
    org_code: getOrgCode(),
    export_mode: exportMode,
    unacked_export_count: status?.unacked_exports?.length ?? 0,
    counts: {
      news: news.length,
      field_reports: field.length,
      smart_analysis_packs: smartPacks.length,
      smart_analyses: smartAnalyses.length,
      rbac_roles: rbac.roles.length,
    },
    samples: {
      news: news.slice(0, 5).map((n) => ({ id: n.id, global_id: n.global_id, summary: n.summary })),
      field_reports: field.slice(0, 5).map((f) => ({ hash_key: f.hash_key, global_id: f.global_id })),
      smart_analysis_packs: smartPacks.slice(0, 3).map((p) => ({ id: p.id, global_id: p.global_id, title: p.title })),
    },
  };
}

export async function buildExportPack(operatorUserId, options = {}) {
  if (getInstanceMode() !== "online") {
    throw new Error("Export pack فقط روی hub آنلاین مجاز است");
  }

  const exportMode = options.mode === "full" ? "full" : "delta";
  const packId = crypto.randomUUID();
  const { news, field, smartPacks, smartAnalyses, rbac, reportTypes } = await prepareExportEntities(exportMode);

  const entityCounts = {
    news: news.length,
    field_reports: field.length,
    smart_analysis_packs: smartPacks.length,
    smart_analyses: smartAnalyses.length,
    rbac_roles: rbac.roles.length,
    report_types: reportTypes.length,
  };

  const manifest = buildManifest({
    direction: "online_to_offline",
    entityCounts,
    packId,
  });
  manifest.export_mode = exportMode;

  const packBody = {
    manifest,
    entities: {
      news,
      field_reports: field,
      smart_analysis_packs: smartPacks,
      smart_analyses: smartAnalyses,
      users_rbac_snapshot: rbac,
      report_types: reportTypes,
    },
  };

  const checksum = sha256(safeStringify(packBody));
  manifest.checksum_sha256 = checksum;

  await createSyncRun({
    packId,
    direction: "online_to_offline",
    runType: "export",
    status: "exported",
    operatorUserId,
    manifest,
    counts: entityCounts,
    packChecksum: checksum,
  });

  await markEntitiesInFlight(packId, collectInFlightEntities({ news, field, smartPacks, smartAnalyses }));

  return { packId, manifest, packBody, checksum };
}

export async function dryRunImport(packBody) {
  const manifest = packBody.manifest || {};
  if (manifest.direction && manifest.direction !== "online_to_offline") {
    throw new Error("فقط pack با جهت online_to_offline پذیرفته می‌شود");
  }
  if (manifest.org_code && manifest.org_code !== getOrgCode() && getOrgRole() !== "parent") {
    throw new Error(`org_code pack (${manifest.org_code}) با hub (${getOrgCode()}) هم‌خوان نیست`);
  }

  const checksum = manifest.checksum_sha256 || sha256(JSON.stringify(packBody));
  const existing = await findRunByChecksum(checksum);
  if (existing?.status === "applied") {
    return {
      duplicate: true,
      preview_token: null,
      counts: { insert: 0, update: 0, skip: 0, conflict: 0 },
      message: "این pack قبلاً apply شده است",
    };
  }

  const counts = await countEntityMergePreview(packBody.entities || {});

  const previewToken = crypto.randomUUID();
  previewTokens.set(previewToken, {
    expires: Date.now() + 30 * 60 * 1000,
    packBody,
    checksum,
    counts,
  });

  return {
    duplicate: false,
    preview_token: previewToken,
    counts,
    manifest,
  };
}

export async function applyImport(previewToken, operatorUserId) {
  const entry = previewTokens.get(previewToken);
  if (!entry || entry.expires < Date.now()) {
    throw new Error("preview_token نامعتبر یا منقضی شده");
  }
  previewTokens.delete(previewToken);

  const { packBody, checksum } = entry;
  const manifest = packBody.manifest || {};
  const packId = manifest.pack_id || crypto.randomUUID();
  const orgCode = manifest.org_code || getOrgCode();

  const appliedEntities = [];
  const applyCounts = { insert: 0, update: 0, skip: 0, conflict: 0 };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const n of packBody.entities?.news || []) {
      const result = await mergeNewsRow(client, n, orgCode);
      if (result.action === "insert") applyCounts.insert++;
      else if (result.action === "update") applyCounts.update++;
      else if (result.action === "conflict") {
        applyCounts.conflict++;
        await recordSyncConflict(client, {
          packId,
          globalId: result.global_id,
          entityType: result.entity_type,
          localSnapshot: result.local,
          remoteSnapshot: result.remote,
        });
      } else applyCounts.skip++;
      if (result.global_id && result.action !== "conflict") {
        appliedEntities.push({ global_id: result.global_id, entity_type: SYNC_ENTITY_TYPES.NEWS });
      }
    }

    for (const f of packBody.entities?.field_reports || []) {
      const result = await mergeFieldReportRow(client, f, orgCode);
      if (result.action === "insert") applyCounts.insert++;
      else if (result.action === "update") applyCounts.update++;
      else if (result.action === "conflict") {
        applyCounts.conflict++;
        await recordSyncConflict(client, {
          packId,
          globalId: result.global_id,
          entityType: result.entity_type,
          localSnapshot: result.local,
          remoteSnapshot: result.remote,
        });
      } else applyCounts.skip++;
      if (result.global_id && result.action !== "conflict") {
        appliedEntities.push({ global_id: result.global_id, entity_type: SYNC_ENTITY_TYPES.FIELD_REPORT });
      }
    }

    for (const p of packBody.entities?.smart_analysis_packs || []) {
      const result = await mergeSmartAnalysisPackRow(client, p, orgCode);
      if (result.action === "insert") applyCounts.insert++;
      else if (result.action === "update") applyCounts.update++;
      else if (result.action === "conflict") {
        applyCounts.conflict++;
        await recordSyncConflict(client, {
          packId,
          globalId: result.global_id,
          entityType: result.entity_type,
          localSnapshot: result.local,
          remoteSnapshot: result.remote,
        });
      } else applyCounts.skip++;
      if (result.global_id && result.action !== "conflict") {
        appliedEntities.push({ global_id: result.global_id, entity_type: SYNC_ENTITY_TYPES.SMART_ANALYSIS_PACK });
      }
    }

    for (const a of packBody.entities?.smart_analyses || []) {
      const result = await mergeSmartAnalysisRow(client, a, orgCode);
      if (result.action === "insert") applyCounts.insert++;
      else if (result.action === "update") applyCounts.update++;
      else if (result.action === "conflict") {
        applyCounts.conflict++;
        await recordSyncConflict(client, {
          packId,
          globalId: result.global_id,
          entityType: result.entity_type,
          localSnapshot: result.local,
          remoteSnapshot: result.remote,
        });
      } else applyCounts.skip++;
      if (result.global_id && result.action !== "conflict") {
        appliedEntities.push({ global_id: result.global_id, entity_type: SYNC_ENTITY_TYPES.SMART_ANALYSIS });
      }
    }

    await mergeReportTypes(client, packBody.entities?.report_types || []);

    const rbac = packBody.entities?.users_rbac_snapshot;
    if (rbac) await applyRbacSnapshot(client, rbac);

    await createSyncRun({
      packId,
      direction: "online_to_offline",
      runType: "import",
      status: "applied",
      operatorUserId,
      manifest,
      counts: applyCounts,
      packChecksum: checksum,
    });

    await client.query("COMMIT");
    await markEntitiesApplied(packId, appliedEntities);
    return { pack_id: packId, counts: applyCounts, status: "applied" };
  } catch (e) {
    await client.query("ROLLBACK");
    await updateSyncRunStatus(packId, "failed");
    throw e;
  } finally {
    client.release();
  }
}

/** Parent hub: import child org aggregate pack (phase 9) */
export async function applyChildAggregatePack(packBody, operatorUserId) {
  if (getOrgRole() !== "parent") {
    throw new Error("فقط hub با ORG_ROLE=parent می‌تواند pack فرزند import کند");
  }
  const preview = await dryRunImport(packBody);
  if (preview.duplicate || !preview.preview_token) return preview;
  return applyImport(preview.preview_token, operatorUserId);
}

export function buildAckJson(appliedPacks) {
  return {
    ack_version: 1,
    destination_instance: getInstanceMode(),
    org_code: getOrgCode(),
    batch_applied_at: new Date().toISOString(),
    packs: appliedPacks.map((p) => ({
      pack_id: p.pack_id,
      pack_checksum: p.pack_checksum,
      status: "applied",
    })),
  };
}

export function buildBatchAckFromPackIds(packRows) {
  return buildAckJson(packRows);
}

/** اعمال چند pack با ترتیب exported_at صعودی */
export async function applyBatchImport(previewTokensList, operatorUserId) {
  const tokens = (previewTokensList || []).filter(Boolean);
  if (!tokens.length) throw new Error("preview_token خالی است");

  const batchId = crypto.randomUUID();
  const applied = [];
  for (const token of tokens) {
    const result = await applyImport(token, operatorUserId);
    applied.push(result);
  }

  return {
    batch_id: batchId,
    applied_count: applied.length,
    packs: applied,
    ack: buildAckJson(applied.map((p) => ({ pack_id: p.pack_id, pack_checksum: null }))),
  };
}
