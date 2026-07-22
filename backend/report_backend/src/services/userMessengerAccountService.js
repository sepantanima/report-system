import pool from "../db.js";
import {
  MESSENGER_PLATFORMS,
  normalizeExternalId,
  normalizeMessengerDisplayName,
  normalizeMessengerUsername,
  SENDER_RESOLVE_JOINS,
  RESOLVED_USER_ID_SQL,
  FIELD_SENDER_RESOLVE_JOINS,
  FIELD_RESOLVED_USER_ID_SQL,
  NEWS_SENDER_SOURCE_MARKER_NOT_EXISTS_SQL,
} from "../utils/senderResolveSql.js";
import {
  instanceNewsAndSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";
import {
  instanceNewsAndSql,
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "./instanceScopeService.js";

function mapAccountRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    platform: row.platform,
    external_id: row.external_id,
    external_username: row.external_username,
    display_name: row.display_name,
    is_verified: row.is_verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_name: row.user_name ?? null,
    user_username: row.user_username ?? null,
  };
}

function validateAccountPayload(body, { partial = false } = {}) {
  const platform = body.platform != null ? String(body.platform).trim().toLowerCase() : null;
  const externalId = body.external_id != null ? normalizeExternalId(body.external_id) : null;
  const externalUsername = body.external_username != null
    ? normalizeMessengerUsername(body.external_username)
    : null;
  const displayName = body.display_name != null
    ? normalizeMessengerDisplayName(body.display_name)
    : null;

  if (!partial && !platform) {
    throw new Error("انتخاب پلتفرم الزامی است.");
  }
  if (platform && !MESSENGER_PLATFORMS.includes(platform)) {
    throw new Error("پلتفرم نامعتبر است.");
  }
  if (!partial && !externalId && !externalUsername && !displayName) {
    throw new Error("حداقل یکی از شناسه، نام کاربری یا نام نمایشی باید وارد شود.");
  }

  return { platform, externalId, externalUsername, displayName };
}

export async function listAccountsForUser(userId) {
  const r = await pool.query(
    `SELECT uma.*, u.name AS user_name, u.username AS user_username
     FROM tbl_user_messenger_accounts uma
     JOIN tbl_users u ON u.id = uma.user_id
     WHERE uma.user_id = $1
     ORDER BY uma.platform, uma.external_username NULLS LAST, uma.display_name NULLS LAST`,
    [userId],
  );
  return r.rows.map(mapAccountRow);
}

export async function createAccountForUser(userId, body, { verified = false } = {}) {
  const { platform, externalId, externalUsername, displayName } = validateAccountPayload(body);
  const isVerified = body.is_verified === true || verified;

  const r = await pool.query(
    `INSERT INTO tbl_user_messenger_accounts (
       user_id, platform, external_id, external_username, display_name, is_verified, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, platform, externalId, externalUsername, displayName, isVerified],
  );
  return mapAccountRow(r.rows[0]);
}

export async function updateAccount(accountId, body, { admin = false } = {}) {
  const existing = await pool.query(
    `SELECT * FROM tbl_user_messenger_accounts WHERE id = $1`,
    [accountId],
  );
  if (!existing.rows[0]) throw new Error("اکانت یافت نشد.");

  const row = existing.rows[0];
  const parsed = validateAccountPayload({
    platform: body.platform ?? row.platform,
    external_id: body.external_id !== undefined ? body.external_id : row.external_id,
    external_username: body.external_username !== undefined ? body.external_username : row.external_username,
    display_name: body.display_name !== undefined ? body.display_name : row.display_name,
  });

  const isVerified = admin && body.is_verified !== undefined
    ? Boolean(body.is_verified)
    : row.is_verified;

  const r = await pool.query(
    `UPDATE tbl_user_messenger_accounts
     SET platform = $2,
         external_id = $3,
         external_username = $4,
         display_name = $5,
         is_verified = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [accountId, parsed.platform, parsed.externalId, parsed.externalUsername, parsed.displayName, isVerified],
  );
  return mapAccountRow(r.rows[0]);
}

export async function deleteAccount(accountId, userId = null) {
  const params = [accountId];
  let sql = `DELETE FROM tbl_user_messenger_accounts WHERE id = $1`;
  if (userId != null) {
    params.push(userId);
    sql += ` AND user_id = $2`;
  }
  const r = await pool.query(sql, params);
  if (r.rowCount === 0) throw new Error("اکانت یافت نشد.");
  return { success: true };
}

/**
 * Link a raw sender string to a system user (admin unmapped-senders UI).
 */
export async function linkSenderToUser({
  sender,
  platform = "bale",
  userId,
  externalUsername = null,
  displayName = null,
  externalId = null,
  verified = true,
}) {
  const senderText = normalizeMessengerDisplayName(sender);
  if (!senderText) throw new Error("فرستنده نامعتبر است.");
  if (!userId) throw new Error("کاربر مقصد الزامی است.");

  const plat = String(platform || "bale").trim().toLowerCase();
  if (!MESSENGER_PLATFORMS.includes(plat)) throw new Error("پلتفرم نامعتبر است.");

  const fromAt = normalizeMessengerUsername(senderText);
  const username = externalUsername != null ? normalizeMessengerUsername(externalUsername) : fromAt;
  const name = displayName != null ? normalizeMessengerDisplayName(displayName) : (
    fromAt ? null : senderText
  );

  return createAccountForUser(userId, {
    platform: plat,
    external_id: externalId,
    external_username: username,
    display_name: name,
    is_verified: verified,
  }, { verified });
}

export async function getUnmappedSenders({ limit = 200 } = {}) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);

  const newsSql = `
    SELECT DISTINCT trim(bk.sender) AS sender,
           COALESCE(NULLIF(trim(bk.sender_platform), ''), 'bale') AS platform,
           COUNT(*)::int AS news_count
    FROM tbl_news bk
    ${SENDER_RESOLVE_JOINS}
    WHERE NULLIF(trim(bk.sender), '') IS NOT NULL
      AND (bk.is_deleted IS NOT TRUE OR bk.is_deleted IS NULL)
      AND ${RESOLVED_USER_ID_SQL} IS NULL
      AND ${NEWS_SENDER_SOURCE_MARKER_NOT_EXISTS_SQL}${instanceNewsAndSql("bk")}
    GROUP BY trim(bk.sender), COALESCE(NULLIF(trim(bk.sender_platform), ''), 'bale')
    ORDER BY news_count DESC, sender
    LIMIT $1
  `;

  const fieldSql = `
    SELECT DISTINCT trim(ev.sender_name) AS sender,
           COALESCE(NULLIF(trim(ev.sender_platform), ''), 'bale') AS platform,
           COUNT(*)::int AS report_count
    FROM tbl_unit_events ev
    ${fieldReportTypeJoinSql("ev")}
    ${FIELD_SENDER_RESOLVE_JOINS}
    WHERE NULLIF(trim(ev.sender_name), '') IS NOT NULL
      AND (ev.is_deleted IS NOT TRUE OR ev.is_deleted IS NULL)
      AND ${FIELD_RESOLVED_USER_ID_SQL} IS NULL
      ${fieldReportListScopeSql("ev", "rt_scope")}
    GROUP BY trim(ev.sender_name), COALESCE(NULLIF(trim(ev.sender_platform), ''), 'bale')
    ORDER BY report_count DESC, sender
    LIMIT $1
  `;

  const [news, field] = await Promise.all([
    pool.query(newsSql, [cap]),
    pool.query(fieldSql, [cap]).catch(() => ({ rows: [] })),
  ]);

  return {
    news: news.rows,
    field: field.rows,
  };
}

export async function resolveSenderPreview(sender, platform = "bale") {
  const r = await pool.query(
    `SELECT bk.id, bk.sender, ${RESOLVED_USER_ID_SQL} AS resolved_user_id,
            COALESCE(u_direct.name, u_mapped.name) AS resolved_name
     FROM tbl_news bk
     ${SENDER_RESOLVE_JOINS}
     WHERE lower(trim(bk.sender)) = lower(trim($1))
       AND COALESCE(NULLIF(trim(bk.sender_platform), ''), 'bale') = $2${instanceNewsAndSql("bk")}
     LIMIT 5`,
    [sender, platform],
  );
  return r.rows;
}

export async function markSenderAsNewsSource({
  sender,
  platform = "bale",
  sourceLabel = null,
  markedByUserId = null,
}) {
  const senderText = normalizeMessengerDisplayName(sender);
  if (!senderText) throw new Error("فرستنده نامعتبر است.");

  const plat = String(platform || "bale").trim().toLowerCase();
  if (!MESSENGER_PLATFORMS.includes(plat)) throw new Error("پلتفرم نامعتبر است.");

  const label = normalizeMessengerDisplayName(sourceLabel || senderText);
  if (!label) throw new Error("نام منبع نامعتبر است.");
  const senderKey = senderText.trim().toLowerCase();

  const r = await pool.query(
    `INSERT INTO tbl_news_sender_source_markers (
       sender_text, sender_key, platform, source_label, marked_by_user_id, updated_at
     ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (platform, sender_key)
     DO UPDATE SET
       sender_text = EXCLUDED.sender_text,
       source_label = EXCLUDED.source_label,
       marked_by_user_id = EXCLUDED.marked_by_user_id,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, sender_text, platform, source_label, marked_by_user_id, created_at, updated_at`,
    [senderText, senderKey, plat, label, markedByUserId ?? null],
  );
  return r.rows[0];
}
