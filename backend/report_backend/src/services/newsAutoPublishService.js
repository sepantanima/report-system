import { listDestinationsForUser } from "./messengerChannelConfigService.js";
import { publishSingleNews } from "./messengerSendOrchestrator.js";
import { buildSingleNewsMessage } from "./newsReportMessengerTemplate.js";
import { getNewsReportSettings } from "./newsReportSettingsService.js";
import { fetchNewsByIds } from "./newsReportQuery.js";
import { MESSENGER_USAGE_KEYS } from "../constants/messengerUsageKeys.js";

/**
 * پس از «تأیید و انتشار» سردبیر: یک پیام تک‌خبر با قالب تنظیمات
 * به همه کانال‌های فعال با کاربرد «انتشار گزارش اخبار» ارسال می‌شود.
 * خطا در ارسال، وضعیت finalize را برنمی‌گرداند.
 */
export async function fanOutFinalizedNews({ newsId, userId = null } = {}) {
  const id = parseInt(newsId, 10);
  if (!Number.isFinite(id)) {
    return { ok: false, sent: [], failed: [], skipped: "شناسه خبر نامعتبر است" };
  }

  const destinations = await listDestinationsForUser(MESSENGER_USAGE_KEYS.NEWS_REPORT_PUBLISH);
  if (!destinations.length) {
    return {
      ok: true,
      sent: [],
      failed: [],
      skipped: "هیچ کانال انتشاری فعالی تنظیم نشده است",
      destination_count: 0,
    };
  }

  const rows = await fetchNewsByIds([id], {});
  if (!rows.length) {
    return { ok: false, sent: [], failed: [], skipped: "خبر برای قالب‌بندی یافت نشد", destination_count: destinations.length };
  }

  const settings = await getNewsReportSettings();
  const message = buildSingleNewsMessage(settings, rows[0], 1);

  const sent = [];
  const failed = [];

  for (const dest of destinations) {
    try {
      await publishSingleNews({
        channelConfigId: dest.id,
        userId,
        message,
        newsId: id,
      });
      sent.push({ id: dest.id, title_fa: dest.title_fa, provider_type: dest.provider_type });
    } catch (e) {
      failed.push({
        id: dest.id,
        title_fa: dest.title_fa,
        provider_type: dest.provider_type,
        error: e?.message || String(e),
      });
    }
  }

  return {
    ok: failed.length === 0,
    sent,
    failed,
    destination_count: destinations.length,
    sent_count: sent.length,
    failed_count: failed.length,
  };
}
