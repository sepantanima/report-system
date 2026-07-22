/**
 * Seed data for RBAC — mirrors frontend userRoles.js + sync/instance permissions.
 * admin legacy role maps to system_admin template.
 */

export const LEGACY_ROLE_TO_TEMPLATE = {
  admin: "system_admin",
};

export const ROLE_TEMPLATE_LABELS = {
  system_admin: "مدیر کل",
  tech_admin: "مدیر فنی",
  analysis_manager: "مدیر تحلیل",
  analyst: "تحلیل‌گر",
  mentor: "راهنما",
  topic_proposer: "پیشنهاددهنده",
  topic_approver: "تصویب‌کننده محور",
  news_monitor: "پایشگر اخبار",
  news_editor: "دبیر اخبار",
  news_chief: "سردبیر اخبار",
  Field_admin: "مدیر میدانی",
  user: "کاربر واحد",
  strategy_viewer: "ناظر راهبردی",
  strategy_commander: "فرمانده راهبردی",
  strategy_analysis_manager: "مدیر تحلیل راهبردی",
};

/** @type {Record<string, string[]>} */
export const ROLE_PERMISSIONS = {
  system_admin: [
    "create_report", "manage_users", "monitor_reports", "news_entry", "news_review",
    "news_finalize", "news_duplicates", "ai_process",
    "search_reports", "sys_settings", "analytics",
    "analysis_manage", "analysis_topic_approve", "analysis_missions", "analysis_propose", "analysis_review",
    "analysis_brief_submit",
    "manage_prompts", "manage_ai_api", "manage_messenger", "manage_news_reports", "field_mgmt_summary", "news_report",
    "manage_field_entry_limits", "manage_news_entry_limits",
    "messages", "manage_announcements", "manage_message_settings",
    "manage_messenger_accounts",
    "command_center", "command_live_news", "command_annotate", "command_kpi",
    "command_outputs", "command_outputs_manage", "command_manage_prompts",
    "sync.view", "sync.export", "sync.import", "sync.reconcile", "sync.briefing", "sync.force_reapply", "sync.purge",
    "rbac.manage",
  ],
  tech_admin: [
    "manage_prompts", "manage_ai_api", "manage_messenger", "manage_messenger_accounts",
    "manage_news_reports", "manage_field_entry_limits", "manage_news_entry_limits",
    "manage_message_settings", "sys_settings", "messages",
    "command_manage_prompts", "command_outputs_manage",
    "sync.view", "sync.export", "sync.import", "sync.reconcile", "sync.briefing", "sync.force_reapply", "sync.purge",
  ],
  strategy_viewer: [
    "command_center", "command_live_news", "command_kpi", "command_outputs", "sys_settings", "messages",
  ],
  strategy_commander: [
    "command_center", "command_live_news", "command_annotate", "command_kpi",
    "command_outputs", "sys_settings", "messages",
  ],
  strategy_analysis_manager: [
    "command_center", "command_live_news", "command_kpi",
    "command_outputs", "command_outputs_manage", "command_manage_prompts",
    "sys_settings", "messages",
  ],
  analysis_manager: [
    "manage_users", "analysis_manage", "analysis_topic_approve", "analysis_propose", "analysis_review",
    "analysis_brief_submit", "sys_settings", "messages",
  ],
  analyst: ["analysis_missions", "analysis_brief_submit", "sys_settings", "messages"],
  mentor: ["analysis_review", "analysis_brief_submit", "sys_settings", "messages"],
  topic_proposer: ["analysis_propose", "analysis_brief_submit", "sys_settings", "messages"],
  topic_approver: ["analysis_topic_approve", "analysis_brief_submit", "sys_settings", "messages"],
  news_monitor: ["news_entry", "analytics", "analysis_brief_submit", "sys_settings", "messages"],
  news_editor: [
    "news_review", "news_duplicates", "ai_process", "analytics", "analysis_brief_submit",
    "sys_settings", "news_report", "messages",
  ],
  news_chief: [
    "news_review", "news_finalize", "news_duplicates", "ai_process", "analytics", "analysis_brief_submit",
    "sys_settings", "news_report", "manage_news_reports", "manage_news_entry_limits", "messages",
    "manage_announcements", "manage_message_settings", "manage_messenger_accounts",
  ],
  Field_admin: [
    "manage_users", "create_report", "monitor_reports", "analytics", "sys_settings", "analysis_topic_approve",
    "analysis_brief_submit", "field_mgmt_summary", "manage_field_entry_limits", "messages",
    "manage_announcements", "manage_message_settings", "manage_messenger_accounts",
  ],
  user: [
    "create_report", "monitor_reports", "news_entry", "analysis_brief_submit", "analysis_propose",
    "sys_settings", "analytics", "messages",
  ],
};

/** Legacy admin role permissions (same as system_admin minus rbac.manage for migration) */
ROLE_PERMISSIONS.admin = ROLE_PERMISSIONS.system_admin.filter((p) => p !== "rbac.manage");

export const PERMISSION_LABELS = {
  create_report: "ثبت گزارش",
  manage_users: "مدیریت کاربران",
  monitor_reports: "پایش گزارش‌ها",
  news_entry: "ثبت خبر",
  news_review: "بازبینی خبر",
  news_finalize: "نهایی‌سازی خبر",
  news_duplicates: "تکراری‌های خبر",
  ai_process: "پردازش AI",
  search_reports: "جستجوی گزارش",
  sys_settings: "تنظیمات",
  analytics: "تحلیل آماری",
  analysis_manage: "مدیریت تحلیل",
  analysis_topic_approve: "تصویب محور",
  analysis_missions: "مأموریت تحلیل",
  analysis_propose: "پیشنهاد محور",
  analysis_review: "بازبینی تحلیل",
  analysis_brief_submit: "تحلیل کوتاه",
  manage_prompts: "مدیریت prompt",
  manage_ai_api: "مدیریت API هوش",
  manage_messenger: "مدیریت پیام‌رسان",
  manage_news_reports: "گزارش خبری",
  field_mgmt_summary: "خلاصه مدیریتی میدان",
  news_report: "گزارش خبر",
  manage_field_entry_limits: "محدودیت ورود میدان",
  manage_news_entry_limits: "محدودیت ورود خبر",
  messages: "پیام‌ها",
  manage_announcements: "مدیریت ابلاغ",
  manage_message_settings: "تنظیمات پیام",
  manage_messenger_accounts: "حساب پیام‌رسان",
  command_center: "مرکز فرماندهی",
  command_live_news: "اخبار زنده",
  command_annotate: "حاشیه‌نویسی",
  command_kpi: "شاخص KPI",
  command_outputs: "خروجی راهبرد",
  command_outputs_manage: "مدیریت خروجی راهبرد",
  command_manage_prompts: "prompt راهبرد",
  sync: { view: "مشاهده sync", export: "خروجی sync", import: "ورود sync", reconcile: "reconcile sync", briefing: "گزارش راهبر", force_reapply: "اعمال مجدد sync", purge: "پاکسازی تاریخچه sync" },
  "sync.view": "مشاهده همگام‌سازی",
  "sync.export": "خروجی همگام‌سازی",
  "sync.import": "ورود همگام‌سازی",
  "sync.reconcile": "تأیید دستی sync",
  "sync.briefing": "گزارش راهبر",
  "sync.force_reapply": "اعمال مجدد اجباری",
  "sync.purge": "پاکسازی تاریخچه همگام‌سازی",
  "rbac.manage": "مدیریت نقش و مجوز",
};

/** توضیح کوتاه برای UI تخصیص مجوز — کاربر بداند چه منو/اقدامی باز می‌شود */
export const PERMISSION_DESCRIPTIONS = {
  create_report: "ثبت و ارسال گزارش میدانی جدید برای واحد سازمانی.",
  manage_users: "ایجاد، ویرایش، غیرفعال‌سازی کاربران و تعیین نقش/مجوز.",
  monitor_reports: "صفحه پایش گزارش‌های میدانی؛ تأیید، برگشت یا پیگیری وضعیت.",
  news_entry: "ثبت خبر جدید (منوی ورود خبر / پایشگر).",
  news_review: "بازبینی و ویرایش خبر در گردش کار دبیر (مدیریت اخبار).",
  news_finalize: "نهایی‌سازی و تأیید نهایی خبر توسط سردبیر.",
  news_duplicates: "مدیریت خبرهای تکراری، ادغام و رفع تکرار.",
  ai_process: "اجرای پردازش هوشمند روی اخبار (Smart AI Processor).",
  search_reports: "جستجوی پیشرفته در آرشیو گزارش‌های میدانی.",
  sys_settings: "دسترسی به تنظیمات سیستم، پروفایل و تغییر رمز.",
  analytics: "مشاهده داشبوردها و آمار (اخبار یا میدان بسته به منو).",
  analysis_manage: "مدیریت محورها، مأموریت‌ها و گردش کار تحلیل.",
  analysis_topic_approve: "تصویب یا رد موضوعات/محورهای پیشنهادی تحلیل.",
  analysis_missions: "مشاهده و انجام مأموریت‌های تحلیل اختصاص‌یافته.",
  analysis_propose: "پیشنهاد موضوع یا محور جدید برای تحلیل.",
  analysis_review: "بازبینی، داوری و بازخورد به تحلیل‌های ارسالی.",
  analysis_brief_submit: "ارسال تحلیل کوتاه یا پیشنهاد محور از منوی تحلیل.",
  manage_prompts: "ویرایش پرامپت‌ها و الگوهای پاکسازی خبر.",
  manage_ai_api: "تنظیم API، کلید و اولویت سرویس‌های هوش مصنوعی.",
  manage_messenger: "مدیریت کانال‌ها و مقصدهای پیام‌رسان (بله و …).",
  manage_news_reports: "تنظیمات گزارش خبری و قالب انتشار.",
  field_mgmt_summary: "خلاصه مدیریتی دوره‌ای گزارشات میدانی.",
  news_report: "تهیه، پیش‌نمایش و انتشار گزارش خبری.",
  manage_field_entry_limits: "تعیین سقف تعداد ثبت روزانه گزارش میدانی.",
  manage_news_entry_limits: "تعیین سقف تعداد ثبت روزانه خبر.",
  messages: "صندوق پیام، اعلان‌ها و پیام‌های دریافتی.",
  manage_announcements: "صدور ابلاغ یا اطلاع‌رسانی سراسری.",
  manage_message_settings: "تنظیمات سامانه پیام، ابلاغ و محدودیت‌ها.",
  manage_messenger_accounts: "اتصال و مدیریت حساب پیام‌رسان کاربران.",
  command_center: "ورود به مرکز فرماندهی راهبردی.",
  command_live_news: "تالار اخبار زنده در مرکز فرماندهی.",
  command_annotate: "حاشیه‌نویسی و برچسب‌گذاری روی اخبار راهبردی.",
  command_kpi: "مشاهده شاخص‌ها و KPI راهبردی.",
  command_outputs: "کتابخانه خروجی‌ها و گزارش‌های راهبرد.",
  command_outputs_manage: "ایجاد و مدیریت خروجی/تحلیل راهبردی.",
  command_manage_prompts: "پرامپت‌های اختصاصی ماژول راهبرد.",
  "sync.view": "مشاهده وضعیت همگام‌سازی — روی هر دو hub (آنلاین و آفلاین). شامل تعداد pending، تاریخچه و exportهای بدون ack.",
  "sync.export": "ساخت و دانلود pack — فقط روی سرور آنلاین. فایل را به USB ببرید و روی آفلاین import کنید.",
  "sync.import": "آپلود و اعمال pack — فقط روی سرور آفلاین. pack باید قبلاً از آنلاین export شده باشد.",
  "sync.reconcile": "تأیید دستی تحویل pack روی آفلاین — وقتی فایل ack را نمی‌توانید از شبکه داخلی بیاورید؛ فقط روی آنلاین.",
  "sync.briefing": "دانلود گزارش HTML تغییرات کاربر/نقش — فقط روی آفلاین؛ برای اعمال دستی روی آنلاین.",
  "sync.force_reapply": "اعمال مجدد اجباری pack قبلاً import‌شده — فقط در موارد خاص، hub آفلاین.",
  "sync.purge": "حذف دائمی رکوردهای آرشیوشده و تأییدشده از تاریخچه sync — فقط آنلاین، با قوانین امن.",
  "rbac.manage": "ویرایش نقش‌ها، مجوزها و الگوهای دسترسی.",
};

export function getDefaultPermissionsForRole(roleCode) {
  const code = String(roleCode || "").trim();
  if (ROLE_PERMISSIONS[code]) return [...ROLE_PERMISSIONS[code]];
  if (code === "admin") return [...(ROLE_PERMISSIONS.system_admin || []).filter((p) => p !== "rbac.manage")];
  return [...(ROLE_PERMISSIONS.user || [])];
}

export const SYSTEM_PERMISSION_CODES = new Set([
  "sync.view", "sync.export", "sync.import", "sync.reconcile", "sync.briefing", "sync.force_reapply", "sync.purge", "rbac.manage",
]);

export function permissionModule(code) {
  if (code.startsWith("sync.")) return "sync";
  if (code.startsWith("command_")) return "command";
  if (code.startsWith("analysis_")) return "analysis";
  if (code.startsWith("news_") || code === "news_entry" || code === "news_report") return "news";
  if (code.startsWith("manage_")) return "admin";
  if (code === "rbac.manage") return "rbac";
  return "general";
}
