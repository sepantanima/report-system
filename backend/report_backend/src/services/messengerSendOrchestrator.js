import { sendMessengerText, sendMessengerDocument } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";
import { buildMessengerReportBody } from "./newsReportMessengerTemplate.js";

const TXT_INLINE_MAX = 3500;

export async function publishNewsReport({
  channelConfigId,
  userId,
  format,
  filePath,
  fileName,
  meta = {},
  settings = {},
  rows = [],
  slot = {},
}) {
  const usageKey = MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH;
  const messengerBody = meta.messengerText
    || buildMessengerReportBody(settings, slot, rows);
  const documentCaption = meta.documentCaption || messengerBody;

  const logStart = async (kind, status, extra = {}) => {
    try {
      await insertMessengerSendLog({
        user_id: userId,
        usage_key: usageKey,
        channel_config_id: channelConfigId,
        payload_kind: kind,
        status,
        ...extra,
      });
    } catch {
      /* ignore */
    }
  };

  try {
    if (format === "txt" && messengerBody.length <= TXT_INLINE_MAX) {
      const body = await sendMessengerText(channelConfigId, messengerBody);
      await logStart("text", "ok", { platform_message_id: body.messageId, request_meta: { step: "body_text" } });
    } else if (filePath) {
      const doc = await sendMessengerDocument(channelConfigId, filePath, fileName, documentCaption);
      await logStart("document", "ok", {
        platform_message_id: doc.messageId,
        request_meta: { step: "document", fileName },
      });
    } else {
      const body = await sendMessengerText(channelConfigId, messengerBody);
      await logStart("text", "ok", { platform_message_id: body.messageId, request_meta: { step: "body_text" } });
    }

    return { ok: true };
  } catch (e) {
    await logStart("text", "error", { error_message: e.message, request_meta: { step: "failed" } });
    throw e;
  }
}

export async function publishSingleNews({
  channelConfigId,
  userId,
  message,
}) {
  const usageKey = MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH;
  try {
    const res = await sendMessengerText(channelConfigId, message);
    await insertMessengerSendLog({
      user_id: userId,
      usage_key: usageKey,
      channel_config_id: channelConfigId,
      payload_kind: "text",
      status: "ok",
      platform_message_id: res.messageId,
      request_meta: { step: "single_news" },
    });
    return { ok: true };
  } catch (e) {
    await insertMessengerSendLog({
      user_id: userId,
      usage_key: usageKey,
      channel_config_id: channelConfigId,
      payload_kind: "text",
      status: "error",
      error_message: e.message,
      request_meta: { step: "single_news_failed" },
    });
    throw e;
  }
}
