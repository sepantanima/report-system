import { getOrgCode } from "./instanceConfig.js";
import { isIncomingNewer, SYNC_ENTITY_TYPES } from "./syncIdentityService.js";

const NEWS_MERGE_COLUMNS = [
  "raw_text", "cleaned_text", "summary", "char_count", "hash_key",
  "source", "sender", "observer_id", "observer_username", "observer_first_name",
  "source_ts_utc", "source_ts_tehran", "source_date_jalali", "source_time_hm",
  "relay_ts_utc", "relay_ts_tehran", "relay_date_jalali", "relay_time_hm",
  "delay_seconds", "status", "status_note", "is_approved", "priority", "quality",
  "review_state", "is_duplicate", "reviewed_by", "reviewed_at", "workflow_status",
  "duplicate_status", "duplicate_parent_id", "is_deleted", "deleted_at", "deleted_by",
  "source_platform", "source_url", "sender_external_id", "sender_platform",
  "relevance_status", "editorial_state", "editorial_at", "editorial_by", "editorial_run_id",
  "publish_status", "report_ref_date_jalali", "report_ref_time_hm", "monitor_note",
  "created_at", "updated_at",
];

const FIELD_MERGE_COLUMNS = [
  "hash_key", "unitcd", "report_type_id", "state", "created_at", "updated_at",
  "is_deleted", "chat_title", "raw_text", "title", "date", "time", "news_ts",
  "sender_id", "sender_name", "province", "priority", "source", "message_type",
  "classification", "workflow_logs", "sender_platform", "createdAt", "updatedAt",
];

const SMART_PACK_MERGE_COLUMNS = [
  "title", "query_payload", "filter_signature", "period_from", "period_to",
  "selection_mode", "news_ids", "news_count", "digest_hash", "status",
  "created_by", "created_at", "updated_at",
];

const SMART_ANALYSIS_MERGE_COLUMNS = [
  "pack_id", "title", "analysis_type", "body_html", "body_plain", "query_payload",
  "selected_ids", "news_count", "period_from", "period_to", "filter_signature",
  "ai_prompt_key", "ai_run_log_id", "custom_prompt", "custom_prompt_title",
  "created_by", "created_at", "updated_at", "publish_status", "channel_config_id",
  "published_at", "error_message",
];

function pickColumns(row, columns) {
  const out = {};
  for (const col of columns) {
    if (row[col] !== undefined) out[col] = row[col];
  }
  return out;
}

async function mergeSyncRow(client, {
  table,
  row,
  mergeColumns,
  entityType,
  orgCode = getOrgCode(),
  preserveOnUpdate = ["global_id"],
  prepareRow = null,
}) {
  if (!row?.global_id) return { action: "skip", reason: "missing_global_id" };

  let workRow = row;
  if (prepareRow) workRow = await prepareRow(row, client, orgCode);

  const ex = await client.query(
    `SELECT sync_version, updated_at FROM ${table} WHERE global_id = $1`,
    [row.global_id],
  );

  const base = pickColumns(workRow, mergeColumns);
  base.global_id = row.global_id;
  base.org_code = row.org_code || orgCode;
  base.origin_instance = row.origin_instance || "online";
  base.sync_version = (row.sync_version ?? 0) + 1;

  if (!ex.rows[0]) {
    const cols = Object.keys(base);
    if (entityType === SYNC_ENTITY_TYPES.FIELD_REPORT && !base.hash_key) {
      return { action: "skip", reason: "missing_hash_key" };
    }
    await client.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      cols.map((c) => base[c]),
    );
    return { action: "insert", global_id: row.global_id, entity_type: entityType };
  }

  if (!isIncomingNewer(row, ex.rows[0])) {
    const inVer = row?.sync_version ?? 0;
    const locVer = ex.rows[0]?.sync_version ?? 0;
    const inAt = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
    const locAt = ex.rows[0]?.updated_at ? new Date(ex.rows[0].updated_at).getTime() : 0;
    if (inVer !== locVer || (inAt !== locAt && locAt > inAt)) {
      return {
        action: "conflict",
        global_id: row.global_id,
        entity_type: entityType,
        local: ex.rows[0],
        remote: row,
      };
    }
    return { action: "skip", global_id: row.global_id, entity_type: entityType };
  }

  const updateCols = Object.keys(base).filter((c) => !preserveOnUpdate.includes(c));
  const sets = updateCols.map((c, i) => `${c} = $${i + 2}`);
  await client.query(
    `UPDATE ${table} SET ${sets.join(", ")} WHERE global_id = $1`,
    [row.global_id, ...updateCols.map((c) => base[c])],
  );
  return { action: "update", global_id: row.global_id, entity_type: entityType };
}

async function resolveSmartAnalysisRow(row, client) {
  const resolved = { ...row };
  if (row.pack_global_id) {
    const pr = await client.query(
      `SELECT id FROM tbl_news_smart_analysis_packs WHERE global_id = $1`,
      [row.pack_global_id],
    );
    resolved.pack_id = pr.rows[0]?.id ?? null;
  }
  delete resolved.pack_global_id;
  return resolved;
}

export async function mergeNewsRow(client, row, orgCode = getOrgCode()) {
  return mergeSyncRow(client, {
    table: "tbl_news",
    row,
    mergeColumns: NEWS_MERGE_COLUMNS,
    entityType: SYNC_ENTITY_TYPES.NEWS,
    orgCode,
    preserveOnUpdate: ["global_id"],
  });
}

export async function mergeFieldReportRow(client, row, orgCode = getOrgCode()) {
  return mergeSyncRow(client, {
    table: "tbl_unit_events",
    row,
    mergeColumns: FIELD_MERGE_COLUMNS,
    entityType: SYNC_ENTITY_TYPES.FIELD_REPORT,
    orgCode,
    preserveOnUpdate: ["global_id", "hash_key"],
  });
}

export async function mergeSmartAnalysisPackRow(client, row, orgCode = getOrgCode()) {
  return mergeSyncRow(client, {
    table: "tbl_news_smart_analysis_packs",
    row,
    mergeColumns: SMART_PACK_MERGE_COLUMNS,
    entityType: SYNC_ENTITY_TYPES.SMART_ANALYSIS_PACK,
    orgCode,
  });
}

export async function mergeSmartAnalysisRow(client, row, orgCode = getOrgCode()) {
  return mergeSyncRow(client, {
    table: "tbl_news_smart_analyses",
    row,
    mergeColumns: SMART_ANALYSIS_MERGE_COLUMNS,
    entityType: SYNC_ENTITY_TYPES.SMART_ANALYSIS,
    orgCode,
    prepareRow: resolveSmartAnalysisRow,
  });
}

export async function mergeReportTypes(client, rows) {
  const results = [];
  for (const rt of rows) {
    if (!rt.id && !rt.code) continue;
    const ex = rt.id
      ? await client.query(`SELECT id FROM tbl_report_types WHERE id = $1`, [rt.id])
      : await client.query(`SELECT id FROM tbl_report_types WHERE code = $1`, [rt.code]);
    if (ex.rows[0]) {
      await client.query(
        `UPDATE tbl_report_types SET title_fa = COALESCE($2, title_fa),
         channel_policy = COALESCE($3, channel_policy) WHERE id = $1`,
        [ex.rows[0].id, rt.title_fa, rt.channel_policy],
      );
      results.push({ action: "update", id: ex.rows[0].id });
    } else if (rt.code) {
      await client.query(
        `INSERT INTO tbl_report_types (code, title_fa, channel_policy) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET title_fa = EXCLUDED.title_fa, channel_policy = EXCLUDED.channel_policy`,
        [rt.code, rt.title_fa || rt.code, rt.channel_policy || "BOTH"],
      ).catch(async () => {
        if (rt.id) {
          await client.query(
            `INSERT INTO tbl_report_types (id, code, title_fa, channel_policy) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET channel_policy = EXCLUDED.channel_policy`,
            [rt.id, rt.code, rt.title_fa || rt.code, rt.channel_policy || "BOTH"],
          );
        }
      });
      results.push({ action: "insert", code: rt.code });
    }
  }
  return results;
}

export async function applyRbacSnapshot(client, snapshot) {
  if (!snapshot?.roles?.length) return { roles: 0, assignments: 0 };

  let roleUpdates = 0;
  let assignmentUpdates = 0;

  for (const role of snapshot.roles) {
    const rt = await client.query(`SELECT id FROM tbl_role_templates WHERE code = $1`, [role.code]);
    if (!rt.rows[0]) continue;
    const roleId = rt.rows[0].id;
    const permCodes = (role.permissions || []).filter(Boolean);
    if (permCodes.length) {
      await client.query(
        `DELETE FROM tbl_role_template_permissions WHERE role_template_id = $1`,
        [roleId],
      );
      for (const code of permCodes) {
        const p = await client.query(`SELECT id, is_system FROM tbl_permissions WHERE code = $1`, [code]);
        if (!p.rows[0]) continue;
        await client.query(
          `INSERT INTO tbl_role_template_permissions (role_template_id, permission_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, p.rows[0].id],
        );
      }
      roleUpdates++;
    }
  }

  for (const a of snapshot.assignments || []) {
    const u = await client.query(`SELECT id FROM tbl_users WHERE username = $1`, [a.username]);
    if (!u.rows[0]) continue;
    const rt = await client.query(`SELECT id FROM tbl_role_templates WHERE code = $1`, [a.role_code]);
    if (!rt.rows[0]) continue;
    await client.query(
      `INSERT INTO tbl_user_role_assignments (user_id, role_template_id, active)
       VALUES ($1, $2, TRUE) ON CONFLICT (user_id, role_template_id) DO UPDATE SET active = TRUE`,
      [u.rows[0].id, rt.rows[0].id],
    );
    assignmentUpdates++;
  }

  return { roles: roleUpdates, assignments: assignmentUpdates };
}

export { isIncomingNewer };
