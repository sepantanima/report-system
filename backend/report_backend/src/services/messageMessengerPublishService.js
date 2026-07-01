import pool from "../db.js";
import { sendMessengerText } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { getChannelConfigById } from "./messengerChannelConfigService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";

const ALERT_KEY = MESSENGER_USAGE_KEYS.NEWS_ALERT_BROADCAST;

function channelHasAlertUsage(row) {
  const keys = Array.isArray(row?.usage_keys) && row.usage_keys.length
    ? row.usage_keys
    : (row?.usage_key ? [row.usage_key] : []);
  return keys.includes(ALERT_KEY) || row?.usage_key === ALERT_KEY;
}

export async function validateAlertChannelIds(channelConfigIds = []) {
  const ids = [...new Set((channelConfigIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  const valid = [];
  for (const id of ids) {
    const row = await getChannelConfigById(id, { raw: true });
    if (!row || !row.is_enabled) throw new Error(`کانال ${id} یافت نشد یا غیرفعال است`);
    if (!channelHasAlertUsage(row)) {
      throw new Error(`کانال «${row.title_fa || id}» برای ابلاغ (هشدار/اطلاع‌رسانی) پیکربندی نشده است`);
    }
    valid.push(id);
  }
  return valid;
}

export function formatAlertMessengerText({ title, body, senderName }) {
  const dateFa = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const parts = ["📢 ابلاغ"];
  if (title) parts.push(title);
  parts.push("");
  parts.push(body);
  parts.push("");
  parts.push(`— ${senderName || "سامانه"} | ${dateFa}`);
  return parts.join("\n").slice(0, 4000);
}

export async function publishAlertToChannels({
  messageId,
  channelConfigIds = [],
  text,
  userId,
}) {
  const validIds = await validateAlertChannelIds(channelConfigIds);
  const results = [];

  for (const channelConfigId of validIds) {
    let sendLogId = null;
    let status = "error";
    let errorMessage = null;
    try {
      const res = await sendMessengerText(channelConfigId, text);
      sendLogId = await insertMessengerSendLog({
        user_id: userId,
        usage_key: ALERT_KEY,
        channel_config_id: channelConfigId,
        payload_kind: "text",
        status: "ok",
        platform_message_id: res.messageId,
        request_meta: { step: "alert_broadcast", message_id: messageId },
      });
      status = "ok";
    } catch (e) {
      errorMessage = e.message;
      try {
        sendLogId = await insertMessengerSendLog({
          user_id: userId,
          usage_key: ALERT_KEY,
          channel_config_id: channelConfigId,
          payload_kind: "text",
          status: "error",
          error_message: e.message,
          request_meta: { step: "alert_broadcast_failed", message_id: messageId },
        });
      } catch {
        /* ignore */
      }
    }

    const ins = await pool.query(
      `INSERT INTO tbl_message_messenger_publishes (message_id, channel_config_id, send_log_id, status, error_message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [messageId, channelConfigId, sendLogId, status, errorMessage],
    );
    results.push(ins.rows[0]);
  }

  return results;
}

export async function getMessengerPublishStatus(messageId) {
  const r = await pool.query(
    `SELECT p.*, c.title_fa AS channel_title
     FROM tbl_message_messenger_publishes p
     LEFT JOIN tbl_messenger_channel_configs c ON c.id = p.channel_config_id
     WHERE p.message_id = $1 ORDER BY p.id`,
    [messageId],
  );
  return r.rows;
}
