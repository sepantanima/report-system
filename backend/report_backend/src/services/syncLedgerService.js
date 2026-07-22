import crypto from "crypto";
import pool from "../db.js";
import { getOrgCode, getInstanceMode, isSyncUsbOneWay } from "./instanceConfig.js";

export async function createSyncRun({
  packId,
  direction,
  runType,
  status,
  operatorUserId,
  manifest = {},
  counts = {},
  packChecksum = null,
  batchId = null,
  supersedesPackId = null,
}) {
  const r = await pool.query(
    `INSERT INTO tbl_sync_runs (
      pack_id, batch_id, org_code, direction, run_type, status, operator_user_id,
      counts_json, pack_checksum, manifest_json, supersedes_pack_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      packId,
      batchId,
      getOrgCode(),
      direction,
      runType,
      status,
      operatorUserId,
      JSON.stringify(counts),
      packChecksum,
      JSON.stringify(manifest),
      supersedesPackId,
    ],
  );
  return r.rows[0];
}

export async function updateSyncRunStatus(packId, status, counts = null) {
  await pool.query(
    `UPDATE tbl_sync_runs SET status = $2, finished_at = NOW(),
     counts_json = COALESCE($3::jsonb, counts_json) WHERE pack_id = $1`,
    [packId, status, counts ? JSON.stringify(counts) : null],
  );
}

export async function getSyncStatus() {
  const org = getOrgCode();
  const mode = getInstanceMode();

  const inFlight = await pool.query(
    `SELECT pack_id, started_at, manifest_json, counts_json
     FROM tbl_sync_runs
     WHERE org_code = $1 AND run_type = 'export' AND status IN ('exported', 'in_flight')
     ORDER BY started_at DESC LIMIT 20`,
    [org],
  ).catch(() => ({ rows: [] }));

  const unacked = mode === "online"
    ? await pool.query(
        `SELECT pack_id, started_at FROM tbl_sync_runs
         WHERE org_code = $1 AND run_type = 'export' AND ack_status = 'pending'
           AND archived_at IS NULL
         ORDER BY started_at DESC`,
        [org],
      ).catch(() => ({ rows: [] }))
    : { rows: [] };

  const lastApplied = await pool.query(
    `SELECT * FROM tbl_sync_runs WHERE org_code = $1 AND status = 'applied'
     ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
    [org],
  ).catch(() => ({ rows: [] }));

  const pendingEntity = await pool.query(
    `SELECT COUNT(*)::int AS c FROM tbl_sync_entity_state
     WHERE org_code = $1 AND sync_status IN ('pending_outbound', 'in_flight')`,
    [org],
  ).catch(() => ({ rows: [{ c: 0 }] }));

  return {
    instance_mode: mode,
    org_code: org,
    usb_one_way: isSyncUsbOneWay(),
    in_flight_exports: inFlight.rows,
    unacked_exports: unacked.rows,
    last_applied_run: lastApplied.rows[0] || null,
    pending_outbound_count: pendingEntity.rows[0]?.c ?? 0,
  };
}

export async function markEntitiesInFlight(packId, entities) {
  if (!entities?.length) return;
  const org = getOrgCode();
  const chunkSize = 25;
  for (let i = 0; i < entities.length; i += chunkSize) {
    const chunk = entities.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((e) =>
        pool.query(
          `INSERT INTO tbl_sync_entity_state (global_id, entity_type, org_code, last_exported_pack_id, sync_status, local_updated_at)
           VALUES ($1,$2,$3,$4,'in_flight',NOW())
           ON CONFLICT (global_id, entity_type, org_code) DO UPDATE SET
             last_exported_pack_id = EXCLUDED.last_exported_pack_id,
             sync_status = 'in_flight'`,
          [e.global_id, e.entity_type, org, packId],
        ),
      ),
    );
  }
}

export async function markEntitiesApplied(packId, entities) {
  for (const e of entities) {
    await pool.query(
      `INSERT INTO tbl_sync_entity_state (global_id, entity_type, org_code, last_applied_pack_id, last_applied_at, sync_status)
       VALUES ($1,$2,$3,$4,NOW(),'synced')
       ON CONFLICT (global_id, entity_type, org_code) DO UPDATE SET
         last_applied_pack_id = EXCLUDED.last_applied_pack_id,
         last_applied_at = NOW(),
         sync_status = 'synced'`,
      [e.global_id, e.entity_type, getOrgCode(), packId],
    );
  }
}

export function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function findRunByChecksum(checksum) {
  const r = await pool.query(
    `SELECT * FROM tbl_sync_runs WHERE pack_checksum = $1 AND org_code = $2 LIMIT 1`,
    [checksum, getOrgCode()],
  );
  return r.rows[0] || null;
}

export async function listOpenConflicts(limit = 100) {
  const r = await pool.query(
    `SELECT c.*, sr.manifest_json->>'exported_at' AS pack_exported_at
     FROM tbl_sync_conflicts c
     LEFT JOIN tbl_sync_runs sr ON sr.pack_id = c.pack_id AND sr.org_code = $1
     WHERE c.resolution IS NULL
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [getOrgCode(), Math.min(Math.max(limit, 1), 500)],
  ).catch(() => ({ rows: [] }));
  return r.rows;
}

export async function recordSyncConflict(client, { packId, globalId, entityType, localSnapshot, remoteSnapshot }) {
  await client.query(
    `INSERT INTO tbl_sync_conflicts (pack_id, global_id, entity_type, local_snapshot, remote_snapshot)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      packId,
      globalId,
      entityType,
      JSON.stringify(localSnapshot || {}),
      JSON.stringify(remoteSnapshot || {}),
    ],
  );
}

export async function processAckImport(ackPayload, operatorUserId) {
  const packs = ackPayload.packs || (ackPayload.pack_id ? [ackPayload] : []);
  let updated = 0;
  for (const p of packs) {
    const r = await pool.query(
      `UPDATE tbl_sync_runs SET ack_status = 'received', ack_received_at = NOW()
       WHERE pack_id = $1 AND org_code = $2 AND run_type = 'export'`,
      [p.pack_id, getOrgCode()],
    );
    updated += r.rowCount;
    await pool.query(
      `UPDATE tbl_sync_entity_state SET sync_status = 'synced'
       WHERE last_exported_pack_id = $1 AND org_code = $2`,
      [p.pack_id, getOrgCode()],
    );
  }
  await createSyncRun({
    packId: crypto.randomUUID(),
    direction: ackPayload.direction || "online_to_offline",
    runType: "ack",
    status: "applied",
    operatorUserId,
    manifest: ackPayload,
    counts: { ack_packs: updated },
  });
  return { updated };
}

export async function reconcilePacks(packIds, operatorUserId, note = null) {
  let n = 0;
  for (const packId of packIds) {
    const r = await pool.query(
      `UPDATE tbl_sync_runs SET ack_status = 'reconciled_manual', ack_received_at = NOW(),
       reconcile_note = COALESCE($3, reconcile_note)
       WHERE pack_id = $1 AND org_code = $2 AND run_type = 'export'`,
      [packId, getOrgCode(), note],
    );
    n += r.rowCount;
    await pool.query(
      `UPDATE tbl_sync_entity_state SET sync_status = 'synced'
       WHERE last_exported_pack_id = $1 AND org_code = $2`,
      [packId, getOrgCode()],
    );
  }
  return { reconciled: n, operator_user_id: operatorUserId };
}

const DEFAULT_RETENTION_DAYS = 90;

export async function listSyncHistory(options = {}) {
  const {
    limit = 100,
    runType = null,
    ackStatus = null,
    search = null,
    includeArchived = false,
    pendingDeliveryOnly = false,
  } = typeof options === "number" ? { limit: options } : options;

  const org = getOrgCode();
  const conditions = ["org_code = $1"];
  const params = [org];
  let idx = 2;

  if (!includeArchived) {
    conditions.push("archived_at IS NULL");
  }
  if (runType) {
    conditions.push(`run_type = $${idx++}`);
    params.push(runType);
  }
  if (ackStatus) {
    conditions.push(`ack_status = $${idx++}`);
    params.push(ackStatus);
  }
  if (pendingDeliveryOnly) {
    conditions.push("run_type = 'export'");
    conditions.push("ack_status = 'pending'");
  }
  if (search && String(search).trim()) {
    conditions.push(`pack_id::text ILIKE $${idx++}`);
    params.push(`%${String(search).trim()}%`);
  }

  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
  const r = await pool.query(
    `SELECT id, pack_id, batch_id, direction, run_type, status, started_at, finished_at,
            counts_json, pack_checksum, ack_status, archived_at, reconcile_note
     FROM tbl_sync_runs
     WHERE ${conditions.join(" AND ")}
     ORDER BY started_at DESC
     LIMIT $${idx}`,
    params,
  );
  return { items: r.rows, total: r.rowCount };
}

export async function archiveSyncRuns(packIds, operatorUserId) {
  if (!packIds?.length) return { archived: 0 };
  const r = await pool.query(
    `UPDATE tbl_sync_runs SET archived_at = NOW(), archived_by = $3
     WHERE org_code = $1 AND pack_id = ANY($2::uuid[]) AND archived_at IS NULL
       AND NOT (run_type = 'export' AND ack_status = 'pending')`,
    [getOrgCode(), packIds, operatorUserId],
  );
  return { archived: r.rowCount, operator_user_id: operatorUserId };
}

function buildPurgeConditions({ retentionDays, onlyArchived, packIds }) {
  const org = getOrgCode();
  const conditions = ["org_code = $1"];
  const params = [org];
  let idx = 2;

  if (packIds?.length) {
    conditions.push(`pack_id = ANY($${idx++}::uuid[])`);
    params.push(packIds);
  } else {
    conditions.push(`started_at < NOW() - ($${idx++} || ' days')::interval`);
    params.push(String(Math.max(Number(retentionDays) || DEFAULT_RETENTION_DAYS, 1)));
    if (onlyArchived) {
      conditions.push("archived_at IS NOT NULL");
    }
  }

  conditions.push("NOT (run_type = 'export' AND ack_status = 'pending')");
  conditions.push("(run_type != 'export' OR ack_status IN ('received', 'reconciled_manual'))");

  return { conditions, params };
}

export async function previewPurgeSyncRuns({ retentionDays = DEFAULT_RETENTION_DAYS, onlyArchived = true, packIds = null } = {}) {
  const { conditions, params } = buildPurgeConditions({ retentionDays, onlyArchived, packIds });
  const r = await pool.query(
    `SELECT pack_id, run_type, ack_status, started_at, archived_at
     FROM tbl_sync_runs WHERE ${conditions.join(" AND ")}
     ORDER BY started_at ASC`,
    params,
  );
  return {
    eligible_count: r.rowCount,
    eligible: r.rows.slice(0, 50),
    retention_days: retentionDays,
    only_archived: onlyArchived,
  };
}

export async function purgeSyncRuns({
  retentionDays = DEFAULT_RETENTION_DAYS,
  onlyArchived = true,
  packIds = null,
  operatorUserId,
  dryRun = false,
} = {}) {
  const preview = await previewPurgeSyncRuns({ retentionDays, onlyArchived, packIds });
  if (dryRun) {
    return { dry_run: true, ...preview, purged: 0 };
  }
  if (!preview.eligible_count) {
    return { purged: 0, ...preview };
  }

  const { conditions, params } = buildPurgeConditions({ retentionDays, onlyArchived, packIds });
  const del = await pool.query(
    `DELETE FROM tbl_sync_runs WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return {
    purged: del.rowCount,
    operator_user_id: operatorUserId,
    retention_days: retentionDays,
    only_archived: onlyArchived,
  };
}
