import moment from "jalali-moment";
import { sendMessengerText } from "./messengerSend.js";
import { insertMessengerSendLog } from "./messengerSendLogService.js";
import { getChannelConfigById } from "./messengerChannelConfigService.js";
import { getNewsReportSettings } from "./newsReportSettingsService.js";
import { applyTemplate } from "./newsReportMessengerTemplate.js";
import { DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE } from "../constants/newsReportDefaults.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";
import { stripHtml } from "../utils/analysisHelpers.js";

const MESSENGER_TEXT_MAX = 4096;
const PUBLISH_USAGE_KEY = MESSENGER_USAGE_KEYS.ANALYSIS_SUBMISSION_PUBLISH;

function formatCompositionDatePersian(dateStr) {
  if (!dateStr) return "";
  try {
    return moment(dateStr, "YYYY-MM-DD").locale("fa").format("jYYYY/jMM/jDD");
  } catch {
    return "";
  }
}

/** First segment of attribution for messenger hashtag (#نویسنده). */
export function attributionHashtag(attributionText = "") {
  const raw = String(attributionText || "").trim();
  if (!raw) return "نویسنده";
  const segment = raw.split(/[,،\-–|]/)[0].trim();
  return segment.replace(/\s+/g, "_") || "نویسنده";
}

function personHashtag(name = "", fallback = "") {
  const raw = String(name || "").trim();
  if (!raw) return fallback;
  return raw.replace(/\s+/g, "_");
}

function channelHasBriefPublishUsage(row) {
  const keys = Array.isArray(row?.usage_keys) && row.usage_keys.length
    ? row.usage_keys
    : (row?.usage_key ? [row.usage_key] : []);
  return keys.includes(PUBLISH_USAGE_KEY) || row?.usage_key === PUBLISH_USAGE_KEY;
}

export async function validateBriefPublishChannelIds(channelConfigIds = []) {
  const ids = [...new Set((channelConfigIds || []).map((x) => parseInt(x, 10)).filter(Number.isFinite))];
  const valid = [];
  for (const id of ids) {
    const row = await getChannelConfigById(id, { raw: true });
    if (!row || !row.is_enabled) throw new Error(`کانال ${id} یافت نشد یا غیرفعال است`);
    if (!channelHasBriefPublishUsage(row)) {
      throw new Error(`کانال «${row.title_fa || id}» برای انتشار تحلیل ثبت‌شده پیکربندی نشده است`);
    }
    valid.push(id);
  }
  if (!valid.length) throw new Error("حداقل یک کانال انتشار انتخاب کنید");
  return valid;
}

export function buildBriefMessengerText(brief, settings = {}) {
  const tpl = settings.brief_submission_messenger_template?.trim()
    || DEFAULT_BRIEF_SUBMISSION_MESSENGER_TEMPLATE;

  const authorHashtag = attributionHashtag(brief.attribution_text || brief.author_name);
  const submitterHashtag = personHashtag(brief.author_name, "ثبت_کننده");
  const compositionDate =
    formatCompositionDatePersian(brief.composition_date)
    || formatCompositionDatePersian(new Date().toISOString().slice(0, 10));

  const bodyPlain = stripHtml(brief.bank_content || brief.content || "").trim();

  const reserved = applyTemplate(tpl, {
    author_hashtag: authorHashtag,
    composition_date: compositionDate,
    brief_body: "",
    submitter_hashtag: submitterHashtag,
  }).length;

  const maxBody = Math.max(100, MESSENGER_TEXT_MAX - reserved - 10);
  let body = bodyPlain;
  let truncated = false;
  if (body.length > maxBody) {
    body = `${body.slice(0, maxBody - 1)}…`;
    truncated = true;
  }

  const text = applyTemplate(tpl, {
    author_hashtag: authorHashtag,
    composition_date: compositionDate,
    brief_body: body,
    submitter_hashtag: submitterHashtag,
  });

  return { text, truncated, charCount: text.length, maxChars: MESSENGER_TEXT_MAX };
}

export async function buildBriefMessengerTextWithSettings(brief) {
  const settings = await getNewsReportSettings();
  return buildBriefMessengerText(brief, settings);
}

export async function publishBriefToMessenger(brief, channelConfigId, userId) {
  const [result] = await publishBriefToChannels(brief, [channelConfigId], userId);
  if (!result?.ok) throw new Error(result?.error || "خطا در انتشار");
  return { ok: true, truncated: result.truncated, messageId: result.messageId };
}

export async function publishBriefToChannels(brief, channelConfigIds = [], userId) {
  const validIds = await validateBriefPublishChannelIds(channelConfigIds);
  const { text, truncated } = await buildBriefMessengerTextWithSettings(brief);
  const results = [];

  for (const cid of validIds) {
    const entry = { channel_config_id: cid, ok: false, error: null, messageId: null, truncated };
    try {
      const res = await sendMessengerText(cid, text);
      await insertMessengerSendLog({
        user_id: userId,
        usage_key: PUBLISH_USAGE_KEY,
        channel_config_id: cid,
        payload_kind: "text",
        status: "ok",
        platform_message_id: res.messageId,
        request_meta: { brief_submission_id: brief.id, truncated, republish: brief.status === "Published" },
      });
      entry.ok = true;
      entry.messageId = res.messageId;
    } catch (e) {
      entry.error = e.message;
      try {
        await insertMessengerSendLog({
          user_id: userId,
          usage_key: PUBLISH_USAGE_KEY,
          channel_config_id: cid,
          payload_kind: "text",
          status: "error",
          error_message: e.message,
          request_meta: { brief_submission_id: brief.id, republish: brief.status === "Published" },
        });
      } catch {
        /* ignore */
      }
    }
    results.push(entry);
  }

  return results;
}
