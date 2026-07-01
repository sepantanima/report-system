import pool from "../db.js";
import { resolveEntityOwnerUserIds, resolveUserIdsFromTargets } from "./messageAudienceResolver.js";

export async function insertRecipients(messageId, userIds, deliveryReason = "target") {
  const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!unique.length) return 0;
  const values = [];
  const params = [];
  unique.forEach((uid, i) => {
    const base = i * 3;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(messageId, uid, deliveryReason);
  });
  await pool.query(
    `INSERT INTO tbl_message_recipients (message_id, user_id, delivery_reason)
     VALUES ${values.join(", ")}
     ON CONFLICT (message_id, user_id) DO NOTHING`,
    params,
  );
  return unique.length;
}

export async function deliverMessage(message, targets = []) {
  const userIds = new Set();

  if (message.kind === "direct") {
    const directTarget = targets.find((t) => t.target_type === "user" || t.type === "user");
    const uid = parseInt(directTarget?.target_value ?? directTarget?.value, 10);
    if (Number.isFinite(uid)) userIds.add(uid);
  } else {
    const resolved = await resolveUserIdsFromTargets(targets);
    resolved.forEach((id) => userIds.add(id));
  }

  if (message.entity_type && message.entity_id) {
    const owners = await resolveEntityOwnerUserIds(message.entity_type, message.entity_id);
    owners.forEach((id) => userIds.add(id));
  }

  if (message.sender_id) {
    userIds.delete(message.sender_id);
  }

  const reason = message.kind === "direct" ? "direct" : message.kind === "entity" ? "entity_owner" : "announcement";
  return insertRecipients(message.id, [...userIds], reason);
}

export async function insertMessageTargets(client, messageId, targets = []) {
  for (const t of targets) {
    const target_type = String(t.target_type || t.type || "").trim();
    const target_value = t.target_value != null ? String(t.target_value) : (t.value != null ? String(t.value) : null);
    if (!target_type) continue;
    await client.query(
      `INSERT INTO tbl_message_targets (message_id, target_type, target_value) VALUES ($1, $2, $3)`,
      [messageId, target_type, target_value],
    );
  }
}
