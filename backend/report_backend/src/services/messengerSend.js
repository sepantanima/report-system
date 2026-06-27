import { getProviderTemplateBySlug } from "./messengerProviderTemplateService.js";
import {
  getChannelConfigById,
  resolveBotToken,
  resolveChatId,
} from "./messengerChannelConfigService.js";
import {
  baleSendMessage,
  baleSendDocument,
  telegramSendMessage,
  telegramSendDocument,
  eitaaSendMessage,
  eitaaSendDocument,
} from "./messenger/engines.js";

function extractMessageId(data) {
  const r = data?.result;
  if (!r) return null;
  return String(r.message_id ?? r.id ?? "") || null;
}

async function getSendContext(channelConfigId) {
  const row = await getChannelConfigById(channelConfigId, { raw: true });
  if (!row || !row.is_enabled) throw new Error("مقصد انتشار یافت نشد یا غیرفعال است");
  const template = await getProviderTemplateBySlug(row.provider_type);
  if (!template || !template.is_enabled) throw new Error("نوع پیام‌رسان پشتیبانی نمی‌شود");
  const token = resolveBotToken(row);
  const chatId = resolveChatId(row);
  const extra = { ...(template.default_extra_config || {}), ...(row.extra_config || {}) };
  return { row, template, token, chatId, extra };
}

async function dispatchText(engine, ctx, text) {
  const opts = {
    token: ctx.token,
    baseUrl: ctx.extra.base_url,
    chatId: ctx.chatId,
    text,
    parseMode: ctx.extra.parse_mode || undefined,
  };
  switch (engine) {
    case "bale_bot":
      return baleSendMessage(opts);
    case "telegram_bot":
      return telegramSendMessage(opts);
    case "eitaa_bot":
      return eitaaSendMessage(opts);
    default:
      throw new Error(`engine نامعتبر: ${engine}`);
  }
}

async function dispatchDocument(engine, ctx, filePath, fileName, caption) {
  const opts = {
    token: ctx.token,
    baseUrl: ctx.extra.base_url,
    chatId: ctx.chatId,
    filePath,
    fileName,
    caption,
    parseMode: ctx.extra.parse_mode || undefined,
  };
  switch (engine) {
    case "bale_bot":
      return baleSendDocument(opts);
    case "telegram_bot":
      return telegramSendDocument(opts);
    case "eitaa_bot":
      return eitaaSendDocument(opts);
    default:
      throw new Error(`engine نامعتبر: ${engine}`);
  }
}

export async function sendMessengerText(channelConfigId, text) {
  const ctx = await getSendContext(channelConfigId);
  const data = await dispatchText(ctx.template.engine, ctx, text);
  return { messageId: extractMessageId(data), raw: data };
}

export async function sendMessengerDocument(channelConfigId, filePath, fileName, caption = "") {
  const ctx = await getSendContext(channelConfigId);
  const data = await dispatchDocument(ctx.template.engine, ctx, filePath, fileName, caption);
  return { messageId: extractMessageId(data), raw: data };
}

export async function testChannelConfig(channelConfigId) {
  const msg = "آزمایش سامانه گزارش اخبار — ارسال موفق.";
  return sendMessengerText(channelConfigId, msg);
}
