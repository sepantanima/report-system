import pool from "../db.js";
import { parseUserRoles, hasAnyRole } from "../middleware/requireRole.js";
import { validateMessagePayload } from "../constants/messageFieldLimits.js";
import {
  assertAnnouncementAllowed,
  assertDirectMessageAllowed,
} from "./messageSettingsService.js";
import { deliverMessage, insertMessageTargets } from "./messageDeliveryService.js";
import { estimateAudienceCount, resolveEntityOwnerUserIds } from "./messageAudienceResolver.js";
import {
  formatAlertMessengerText,
  getMessengerPublishStatus,
  publishAlertToChannels,
} from "./messageMessengerPublishService.js";

const MANAGER_ROLES = ["admin", "Field_admin", "news_chief"];

export function isSystemAdmin(user) {
  return hasAnyRole(user, ["admin"]);
}

export function isManager(user) {
  return hasAnyRole(user, MANAGER_ROLES);
}

function enrichMessageRow(row, extra = {}) {
  if (!row) return null;
  return {
    ...row,
    sender_name: row.sender_name ?? row.sender_username ?? null,
    is_read: !!row.read_at,
    is_edited: !!row.edited_at,
    is_recipient_deleted: !!row.recipient_deleted_at,
    is_sender_deleted: !!row.sender_deleted_at,
    ...extra,
  };
}

export async function searchUsersForMessaging(q, limit = 20) {
  const term = String(q || "").trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const r = await pool.query(
    `SELECT id, username, name, role, unit_cd
     FROM tbl_users
     WHERE active IS DISTINCT FROM false
       AND (username ILIKE $1 OR name ILIKE $1)
     ORDER BY name NULLS LAST, username
     LIMIT $2`,
    [like, Math.min(limit, 20)],
  );
  return r.rows;
}

export async function searchUnitsForMessaging(q, limit = 40) {
  const cap = Math.min(parseInt(limit, 10) || 40, 80);
  const term = String(q || "").trim();
  const selectCols = `"UnitCode" AS unit_cd, "UnitShortName" AS unit_short_name,
       COALESCE(NULLIF(TRIM("Name"), ''), "UnitShortName") AS unit_name`;
  if (!term) {
    const r = await pool.query(
      `SELECT ${selectCols} FROM tbl_units ORDER BY "UnitShortName" NULLS LAST LIMIT $1`,
      [cap],
    );
    return r.rows;
  }
  const like = `%${term}%`;
  const r = await pool.query(
    `SELECT ${selectCols}
     FROM tbl_units
     WHERE "UnitShortName" ILIKE $1 OR "Name" ILIKE $1 OR "UnitCode"::text ILIKE $1
     ORDER BY "UnitShortName" NULLS LAST
     LIMIT $2`,
    [like, cap],
  );
  return r.rows;
}

export async function createDirectMessage(body, user) {
  const err = validateMessagePayload(body);
  if (err) throw new Error(err);

  const rawIds = Array.isArray(body.recipient_ids)
    ? body.recipient_ids
    : [body.recipient_id ?? body.user_id];
  const recipientIds = [...new Set(
    rawIds.map((x) => parseInt(x, 10)).filter(Number.isFinite),
  )];
  if (!recipientIds.length) throw new Error("حداقل یک گیرنده انتخاب کنید");
  if (recipientIds.includes(user.id)) throw new Error("ارسال پیام به خودتان مجاز نیست");

  await assertDirectMessageAllowed(user.id);

  const targets = recipientIds.map((id) => ({ target_type: "user", target_value: String(id) }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO tbl_messages (kind, priority, title, body, sender_id)
       VALUES ('direct', $1, $2, $3, $4) RETURNING *`,
      [
        body.priority || "normal",
        String(body.title || "").trim().slice(0, 120),
        String(body.body || "").trim().slice(0, 500),
        user.id,
      ],
    );
    const msg = ins.rows[0];
    await insertMessageTargets(client, msg.id, targets);
    await client.query("COMMIT");
    await deliverMessage(msg, targets);
    return getSentMessageDetail(msg.id, user);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function createAnnouncement(body, user) {
  if (!isManager(user)) throw new Error("فقط مدیران می‌توانند ابلاغ صادر کنند");
  const err = validateMessagePayload(body, { requireTitle: true });
  if (err) throw new Error(err);
  await assertAnnouncementAllowed(user.id);

  const targets = Array.isArray(body.targets) ? body.targets : [];
  if (!targets.length && !body.recipient_id) {
    throw new Error("حداقل یک مخاطب برای ابلاغ لازم است");
  }
  const normalizedTargets = targets.length
    ? targets
    : [{ target_type: "user", target_value: String(body.recipient_id) }];

  const channelIds = body.channel_config_ids || [];
  const showBanner = body.show_as_banner !== false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO tbl_messages (
         kind, priority, title, body, sender_id,
         show_as_banner, banner_dismissible, publish_to_messenger,
         starts_at, expires_at
       ) VALUES (
         'announcement', $1, $2, $3, $4,
         $5, $6, $7,
         COALESCE($8::timestamptz, CURRENT_TIMESTAMP),
         $9::timestamptz
       ) RETURNING *`,
      [
        body.priority || "important",
        String(body.title || "").trim().slice(0, 120),
        String(body.body || "").trim().slice(0, 500),
        user.id,
        showBanner,
        body.banner_dismissible !== false,
        Array.isArray(channelIds) && channelIds.length > 0,
        body.starts_at || null,
        body.expires_at || null,
      ],
    );
    const msg = ins.rows[0];
    await insertMessageTargets(client, msg.id, normalizedTargets);
    await client.query("COMMIT");

    const recipientCount = await deliverMessage(msg, normalizedTargets);

    let messengerResults = [];
    if (channelIds.length) {
      const senderName = user.name || user.username;
      const text = formatAlertMessengerText({ title: msg.title, body: msg.body, senderName });
      messengerResults = await publishAlertToChannels({
        messageId: msg.id,
        channelConfigIds: channelIds,
        text,
        userId: user.id,
      });
    }

    return {
      ...(await getSentMessageDetail(msg.id, user)),
      recipient_count: recipientCount,
      messenger_results: messengerResults,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function createEntityMessage(body, user) {
  if (!isManager(user)) throw new Error("فقط مدیران می‌توانند پیام مرتبط با موجودیت ارسال کنند");
  const err = validateMessagePayload(body, { requireTitle: true });
  if (err) throw new Error(err);
  await assertAnnouncementAllowed(user.id);

  const entityType = String(body.entity_type || "").trim();
  const entityId = String(body.entity_id || "").trim();
  if (!entityType || !entityId) throw new Error("موجودیت (خبر/گزارش) الزامی است");

  const targets = Array.isArray(body.targets) ? body.targets : [];
  const channelIds = body.channel_config_ids || [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO tbl_messages (
         kind, priority, title, body, sender_id,
         entity_type, entity_id,
         show_as_banner, banner_dismissible, publish_to_messenger,
         starts_at, expires_at
       ) VALUES (
         'entity', $1, $2, $3, $4,
         $5, $6,
         $7, $8, $9,
         COALESCE($10::timestamptz, CURRENT_TIMESTAMP),
         $11::timestamptz
       ) RETURNING *`,
      [
        body.priority || "order",
        String(body.title || "").trim().slice(0, 120),
        String(body.body || "").trim().slice(0, 500),
        user.id,
        entityType,
        entityId,
        !!body.show_as_banner,
        body.banner_dismissible !== false,
        Array.isArray(channelIds) && channelIds.length > 0,
        body.starts_at || null,
        body.expires_at || null,
      ],
    );
    const msg = ins.rows[0];
    if (targets.length) await insertMessageTargets(client, msg.id, targets);
    await client.query("COMMIT");

    const recipientCount = await deliverMessage(msg, targets);

    let messengerResults = [];
    if (channelIds.length) {
      const senderName = user.name || user.username;
      const text = formatAlertMessengerText({ title: msg.title, body: msg.body, senderName });
      messengerResults = await publishAlertToChannels({
        messageId: msg.id,
        channelConfigIds: channelIds,
        text,
        userId: user.id,
      });
    }

    return {
      ...(await getSentMessageDetail(msg.id, user)),
      recipient_count: recipientCount,
      messenger_results: messengerResults,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listInbox(userId, { unread_only = false, limit = 50, offset = 0, include_deleted = false } = {}) {
  const params = [userId];
  let q = `
    SELECT m.*, r.read_at, r.dismissed_at, r.delivery_reason, r.deleted_at AS recipient_deleted_at,
           u.name AS sender_name, u.username AS sender_username
    FROM tbl_message_recipients r
    JOIN tbl_messages m ON m.id = r.message_id
    LEFT JOIN tbl_users u ON u.id = m.sender_id
    WHERE r.user_id = $1`;
  if (!include_deleted) {
    q += ` AND r.deleted_at IS NULL`;
  }
  if (unread_only === true || unread_only === "true" || unread_only === "1") {
    q += ` AND r.read_at IS NULL`;
  }
  params.push(Math.min(parseInt(limit, 10) || 50, 100));
  q += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;
  params.push(parseInt(offset, 10) || 0);
  q += ` OFFSET $${params.length}`;
  const r = await pool.query(q, params);
  return r.rows.map((row) => enrichMessageRow(row));
}

export async function getUnreadCount(userId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM tbl_message_recipients
     WHERE user_id = $1 AND read_at IS NULL AND deleted_at IS NULL`,
    [userId],
  );
  return r.rows[0]?.cnt ?? 0;
}

export async function listActiveBanners(userId) {
  const r = await pool.query(
    `SELECT m.*, r.dismissed_at, r.read_at,
            u.name AS sender_name
     FROM tbl_message_recipients r
     JOIN tbl_messages m ON m.id = r.message_id
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     WHERE r.user_id = $1
       AND r.deleted_at IS NULL
       AND m.show_as_banner = true
       AND r.dismissed_at IS NULL
       AND (m.starts_at IS NULL OR m.starts_at <= CURRENT_TIMESTAMP)
       AND (m.expires_at IS NULL OR m.expires_at > CURRENT_TIMESTAMP)
     ORDER BY
       CASE m.priority WHEN 'order' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
       m.created_at DESC`,
    [userId],
  );
  return r.rows.map((row) => enrichMessageRow(row));
}

export async function markMessageRead(messageId, userId) {
  const r = await pool.query(
    `UPDATE tbl_message_recipients SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE message_id = $1 AND user_id = $2
     RETURNING *`,
    [messageId, userId],
  );
  if (!r.rows.length) throw new Error("پیام یافت نشد");
  return r.rows[0];
}

export async function dismissBanner(messageId, userId) {
  const r = await pool.query(
    `UPDATE tbl_message_recipients
     SET dismissed_at = COALESCE(dismissed_at, CURRENT_TIMESTAMP),
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE message_id = $1 AND user_id = $2
     RETURNING *`,
    [messageId, userId],
  );
  if (!r.rows.length) throw new Error("پیام یافت نشد");
  return r.rows[0];
}

export async function getReadStatus(messageId, user) {
  const msg = await getMessageById(messageId);
  if (!msg) throw new Error("پیام یافت نشد");
  await assertCanViewSentMessage(msg, user);

  const stats = await pool.query(
    `SELECT
       COUNT(*)::int AS total_recipients,
       COUNT(*) FILTER (WHERE read_at IS NOT NULL)::int AS read_count
     FROM tbl_message_recipients WHERE message_id = $1`,
    [messageId],
  );
  const readers = await pool.query(
    `SELECT r.user_id, r.read_at, u.name, u.username
     FROM tbl_message_recipients r
     JOIN tbl_users u ON u.id = r.user_id
     WHERE r.message_id = $1 AND r.read_at IS NOT NULL
     ORDER BY r.read_at DESC`,
    [messageId],
  );
  const unread = await pool.query(
    `SELECT r.user_id, u.name, u.username
     FROM tbl_message_recipients r
     JOIN tbl_users u ON u.id = r.user_id
     WHERE r.message_id = $1 AND r.read_at IS NULL
     ORDER BY u.name NULLS LAST`,
    [messageId],
  );
  const total = stats.rows[0]?.total_recipients ?? 0;
  const readCount = stats.rows[0]?.read_count ?? 0;
  return {
    message_id: messageId,
    total_recipients: total,
    read_count: readCount,
    unread_count: total - readCount,
    readers: readers.rows,
    unread_users: unread.rows,
  };
}

async function getMessageById(id) {
  const r = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.username AS sender_username
     FROM tbl_messages m
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     WHERE m.id = $1`,
    [id],
  );
  return r.rows[0] || null;
}

async function assertCanViewSentMessage(msg, user) {
  if (msg.sender_id === user.id) return;
  if (isManager(user)) return;
  const rec = await pool.query(
    `SELECT 1 FROM tbl_message_recipients WHERE message_id = $1 AND user_id = $2`,
    [msg.id, user.id],
  );
  if (rec.rows.length) return;
  if (msg.entity_type && msg.entity_id) {
    const owners = await resolveEntityOwnerUserIds(msg.entity_type, msg.entity_id);
    if (owners.includes(user.id)) return;
  }
  throw new Error("دسترسی غیرمجاز");
}

export async function getSentMessageDetail(messageId, user) {
  const msg = await getMessageById(messageId);
  if (!msg) throw new Error("پیام یافت نشد");
  await assertCanViewSentMessage(msg, user);

  const targets = await pool.query(
    `SELECT * FROM tbl_message_targets WHERE message_id = $1 ORDER BY id`,
    [messageId],
  );
  const messenger = await getMessengerPublishStatus(messageId);
  let readStatus = null;
  if (msg.sender_id === user.id || isManager(user)) {
    readStatus = await getReadStatus(messageId, user);
  }

  return {
    ...enrichMessageRow(msg),
    targets: targets.rows,
    messenger_publishes: messenger,
    read_status: readStatus,
  };
}

export async function listEntityMessages(entityType, entityId, user) {
  const r = await pool.query(
    `SELECT m.*, u.name AS sender_name,
            r.read_at, r.dismissed_at
     FROM tbl_messages m
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     LEFT JOIN tbl_message_recipients r ON r.message_id = m.id AND r.user_id = $3
     WHERE m.entity_type = $1 AND m.entity_id = $2
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [entityType, String(entityId), user.id],
  );

  const rows = [];
  for (const row of r.rows) {
    try {
      await assertCanViewSentMessage(row, user);
      rows.push(enrichMessageRow(row));
    } catch {
      /* skip */
    }
  }
  return rows;
}

export async function previewAudience(targets) {
  return { count: await estimateAudienceCount(targets) };
}

export async function listSentByUser(userId, limit = 50, { include_deleted = false } = {}) {
  const params = [userId];
  let q = `
    SELECT m.*, u.name AS sender_name,
       (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id) AS recipient_count,
       (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id AND rc.read_at IS NOT NULL) AS read_count
     FROM tbl_messages m
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     WHERE m.sender_id = $1`;
  if (!include_deleted) {
    q += ` AND m.sender_deleted_at IS NULL`;
  }
  params.push(Math.min(parseInt(limit, 10) || 50, 100));
  q += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;
  const r = await pool.query(q, params);
  return r.rows.map((row) => enrichMessageRow(row));
}

export async function softDeleteInboxMessage(messageId, userId) {
  const r = await pool.query(
    `UPDATE tbl_message_recipients
     SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
     WHERE message_id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [messageId, userId],
  );
  if (!r.rows.length) throw new Error("پیام یافت نشد");
  return { id: messageId, deleted: true, scope: "inbox" };
}

export async function softDeleteSentMessage(messageId, userId) {
  const r = await pool.query(
    `UPDATE tbl_messages
     SET sender_deleted_at = COALESCE(sender_deleted_at, CURRENT_TIMESTAMP)
     WHERE id = $1 AND sender_id = $2 AND sender_deleted_at IS NULL
     RETURNING id`,
    [messageId, userId],
  );
  if (!r.rows.length) throw new Error("پیام یافت نشد یا شما فرستنده نیستید");
  return { id: messageId, deleted: true, scope: "sent" };
}

export async function permanentDeleteMessage(messageId, user) {
  if (!isSystemAdmin(user)) {
    throw new Error("فقط مدیر کل می‌تواند پیام را به‌طور قطعی حذف کند");
  }
  const r = await pool.query(
    `DELETE FROM tbl_messages WHERE id = $1 RETURNING id, kind`,
    [messageId],
  );
  if (!r.rows.length) throw new Error("پیام یافت نشد");
  return { id: messageId, deleted: true, permanent: true, kind: r.rows[0].kind };
}

export async function listAllMessagesAdmin({
  include_deleted = true,
  limit = 200,
  offset = 0,
  kind,
  priority,
} = {}) {
  const params = [];
  let q = `
    SELECT m.*, u.name AS sender_name, u.username AS sender_username,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id) AS recipient_count,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id AND rc.read_at IS NOT NULL) AS read_count,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id AND rc.deleted_at IS NOT NULL) AS recipient_deleted_count
    FROM tbl_messages m
    LEFT JOIN tbl_users u ON u.id = m.sender_id
    WHERE 1=1`;
  if (!include_deleted) {
    q += ` AND m.sender_deleted_at IS NULL`;
  }
  if (kind) {
    params.push(kind);
    q += ` AND m.kind = $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    q += ` AND m.priority = $${params.length}`;
  }
  params.push(Math.min(parseInt(limit, 10) || 200, 500));
  q += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;
  params.push(parseInt(offset, 10) || 0);
  q += ` OFFSET $${params.length}`;
  const r = await pool.query(q, params);
  return r.rows.map((row) => enrichMessageRow(row));
}

export async function listBroadcastsAdmin({ limit = 120 } = {}) {
  const r = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.username AS sender_username,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id) AS recipient_count,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id AND rc.read_at IS NOT NULL) AS read_count,
      (SELECT COUNT(*)::int FROM tbl_message_recipients rc WHERE rc.message_id = m.id AND rc.dismissed_at IS NOT NULL) AS dismissed_count
     FROM tbl_messages m
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     WHERE m.kind IN ('announcement', 'entity')
     ORDER BY m.created_at DESC
     LIMIT $1`,
    [Math.min(parseInt(limit, 10) || 120, 300)],
  );
  return r.rows.map((row) => enrichMessageRow(row));
}

export async function listDirectConversationPairs({ limit = 80 } = {}) {
  const r = await pool.query(
    `WITH pairs AS (
       SELECT LEAST(m.sender_id, r.user_id) AS u1,
              GREATEST(m.sender_id, r.user_id) AS u2,
              m.created_at,
              m.id
       FROM tbl_messages m
       JOIN tbl_message_recipients r ON r.message_id = m.id
       WHERE m.kind = 'direct'
     )
     SELECT p.u1, p.u2,
       MAX(p.created_at) AS last_at,
       COUNT(DISTINCT p.id)::int AS message_count,
       u1.name AS user1_name, u1.username AS user1_username,
       u2.name AS user2_name, u2.username AS user2_username
     FROM pairs p
     JOIN tbl_users u1 ON u1.id = p.u1
     JOIN tbl_users u2 ON u2.id = p.u2
     GROUP BY p.u1, p.u2, u1.name, u1.username, u2.name, u2.username
     ORDER BY last_at DESC
     LIMIT $1`,
    [Math.min(parseInt(limit, 10) || 80, 150)],
  );
  return r.rows;
}

export async function getDirectConversationThread(userId1, userId2) {
  const a = parseInt(userId1, 10);
  const b = parseInt(userId2, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
    throw new Error("کاربران گفتگو نامعتبر است");
  }
  const users = await pool.query(
    `SELECT id, name, username FROM tbl_users WHERE id = ANY($1::int[])`,
    [[a, b]],
  );
  const userMap = Object.fromEntries(users.rows.map((u) => [u.id, u]));
  const r = await pool.query(
    `SELECT m.*, u.name AS sender_name, u.username AS sender_username,
      (SELECT COALESCE(json_agg(json_build_object(
         'user_id', rc.user_id, 'name', ru.name, 'username', ru.username
       ) ORDER BY rc.user_id), '[]'::json)
       FROM tbl_message_recipients rc
       JOIN tbl_users ru ON ru.id = rc.user_id
       WHERE rc.message_id = m.id) AS recipients
     FROM tbl_messages m
     LEFT JOIN tbl_users u ON u.id = m.sender_id
     WHERE m.kind = 'direct'
     AND (
       (m.sender_id = $1 AND EXISTS (
         SELECT 1 FROM tbl_message_recipients r WHERE r.message_id = m.id AND r.user_id = $2
       ))
       OR (m.sender_id = $2 AND EXISTS (
         SELECT 1 FROM tbl_message_recipients r WHERE r.message_id = m.id AND r.user_id = $1
       ))
     )
     ORDER BY m.created_at ASC
     LIMIT 300`,
    [a, b],
  );
  return {
    user_a: userMap[a] || { id: a },
    user_b: userMap[b] || { id: b },
    messages: r.rows.map((row) => enrichMessageRow(row)),
  };
}

export async function getAdminMessageDetail(messageId) {
  const msg = await getMessageById(messageId);
  if (!msg) throw new Error("پیام یافت نشد");
  const targets = await pool.query(
    `SELECT * FROM tbl_message_targets WHERE message_id = $1 ORDER BY id`,
    [messageId],
  );
  const messenger = await getMessengerPublishStatus(messageId);
  const readStatus = await pool.query(
    `SELECT
       COUNT(*)::int AS total_recipients,
       COUNT(*) FILTER (WHERE read_at IS NOT NULL)::int AS read_count
     FROM tbl_message_recipients WHERE message_id = $1`,
    [messageId],
  );
  const readers = await pool.query(
    `SELECT r.user_id, r.read_at, r.dismissed_at, u.name, u.username
     FROM tbl_message_recipients r
     JOIN tbl_users u ON u.id = r.user_id
     WHERE r.message_id = $1 AND r.read_at IS NOT NULL
     ORDER BY r.read_at DESC`,
    [messageId],
  );
  const unread = await pool.query(
    `SELECT r.user_id, u.name, u.username
     FROM tbl_message_recipients r
     JOIN tbl_users u ON u.id = r.user_id
     WHERE r.message_id = $1 AND r.read_at IS NULL
     ORDER BY u.name NULLS LAST`,
    [messageId],
  );
  const total = readStatus.rows[0]?.total_recipients ?? 0;
  const readCount = readStatus.rows[0]?.read_count ?? 0;
  return {
    ...enrichMessageRow(msg),
    targets: targets.rows,
    messenger_publishes: messenger,
    read_status: {
      message_id: messageId,
      total_recipients: total,
      read_count: readCount,
      unread_count: total - readCount,
      readers: readers.rows,
      unread_users: unread.rows,
    },
  };
}

export async function bulkSoftDeleteInbox(messageIds, userId) {
  const ids = [...new Set((messageIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  if (!ids.length) throw new Error("پیامی انتخاب نشده");
  const r = await pool.query(
    `UPDATE tbl_message_recipients
     SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1 AND message_id = ANY($2::int[]) AND deleted_at IS NULL
     RETURNING message_id`,
    [userId, ids],
  );
  return { deleted: r.rows.length, ids: r.rows.map((x) => x.message_id) };
}

export async function bulkSoftDeleteSent(messageIds, userId) {
  const ids = [...new Set((messageIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  if (!ids.length) throw new Error("پیامی انتخاب نشده");
  const r = await pool.query(
    `UPDATE tbl_messages
     SET sender_deleted_at = COALESCE(sender_deleted_at, CURRENT_TIMESTAMP)
     WHERE sender_id = $1 AND id = ANY($2::int[]) AND sender_deleted_at IS NULL
     RETURNING id`,
    [userId, ids],
  );
  return { deleted: r.rows.length, ids: r.rows.map((x) => x.id) };
}

export async function bulkPermanentDelete(messageIds, user) {
  if (!isSystemAdmin(user)) throw new Error("فقط مدیر کل می‌تواند پیام را به‌طور قطعی حذف کند");
  const ids = [...new Set((messageIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  if (!ids.length) throw new Error("پیامی انتخاب نشده");
  const r = await pool.query(
    `DELETE FROM tbl_messages WHERE id = ANY($1::int[]) RETURNING id`,
    [ids],
  );
  return { deleted: r.rows.length, ids: r.rows.map((x) => x.id) };
}

export async function updateMessage(messageId, body, user) {
  const msg = await getMessageById(messageId);
  if (!msg) throw new Error("پیام یافت نشد");
  if (msg.sender_id !== user.id && !isSystemAdmin(user)) {
    throw new Error("فقط فرستنده می‌تواند پیام را ویرایش کند");
  }
  if (!["announcement", "entity"].includes(msg.kind)) {
    throw new Error("فقط ابلاغ و دستور قابل ویرایش است");
  }
  const err = validateMessagePayload(body, { requireTitle: true });
  if (err) throw new Error(err);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE tbl_messages
       SET title = $2, body = $3, priority = $4,
           show_as_banner = COALESCE($5, show_as_banner),
           banner_dismissible = COALESCE($6, banner_dismissible),
           edited_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        messageId,
        String(body.title || "").trim().slice(0, 120),
        String(body.body || "").trim().slice(0, 500),
        body.priority || msg.priority || "important",
        body.show_as_banner,
        body.banner_dismissible,
      ],
    );
    await client.query(
      `UPDATE tbl_message_recipients
       SET read_at = NULL, dismissed_at = NULL
       WHERE message_id = $1 AND read_at IS NOT NULL`,
      [messageId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return getSentMessageDetail(messageId, user);
}
