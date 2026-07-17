/** نام‌های ثابت فرم/اکشن برای اجرای مرکزی AI (هم‌نام با بک‌اند) */
export const FORM_AI_NAMES = {
  FIELD_MANAGEMENT_SUMMARY_CREATE: "field_management_summary_create",
  ACTION_GENERATE_SUMMARY: "generate_summary",
  NEWS_MONITOR_MANAGE: "news_monitor_manage",
  ACTION_SUMMARIZE_TEXT: "summarize_text",
  NEWS_SMART_ANALYSIS: "news_smart_analysis",
  ACTION_ANALYZE_OVERVIEW: "analyze_overview",
  ACTION_ANALYZE_THEMATIC: "analyze_thematic",
  ACTION_ANALYZE_TRENDS: "analyze_trends",
  ACTION_ANALYZE_RISK: "analyze_risk",
  NEWS_EDITORIAL_BATCH: "news_editorial_batch",
  ACTION_RUN_EDITORIAL: "run_editorial",
  STRATEGY_COMMAND_OUTPUTS: "strategy_command_outputs",
  ACTION_GENERATE_SOFT_WAR_ANNEX: "generate_soft_war_annex",
  SAMPLE_FORM: "sample_form",
  ACTION_SAMPLE_SUMMARIZE: "sample_summarize",
  ACTION_SAMPLE_SECURE: "sample_secure",
};

/**
 * فرم‌ها و دکمه‌هایی که در کد برنامه ثبت شده‌اند
 * راهبر فقط از این لیست انتخاب می‌کند.
 * باید با `backend/report_backend/src/constants/aiFormRegistry.js` (REGISTERED_FORM_ACTION_KEYS) هم‌خوان بماند.
 */
export const REGISTERED_FORM_AI_ACTIONS = [
  {
    form_name: FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE,
    label_fa: "ایجاد خلاصه مدیریتی میدانی",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_GENERATE_SUMMARY,
        label_fa: "تولید پیش‌نویس با هوش‌افزار",
        default_button_label_fa: "تولید پیش‌نویس با هوش‌افزار",
      },
    ],
  },
  {
    form_name: FORM_AI_NAMES.NEWS_MONITOR_MANAGE,
    label_fa: "مدیریت و بررسی اخبار",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_SUMMARIZE_TEXT,
        label_fa: "خلاصه‌سازی متن خبر",
        default_button_label_fa: "خلاصه‌سازی با هوش‌افزار",
      },
    ],
  },
  {
    form_name: FORM_AI_NAMES.NEWS_SMART_ANALYSIS,
    label_fa: "پردازش هوشمند اخبار",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_ANALYZE_OVERVIEW,
        label_fa: "خلاصه کلی",
        default_button_label_fa: "خلاصه کلی",
      },
      {
        action_name: FORM_AI_NAMES.ACTION_ANALYZE_THEMATIC,
        label_fa: "تحلیل موضوعی",
        default_button_label_fa: "تحلیل موضوعی",
      },
      {
        action_name: FORM_AI_NAMES.ACTION_ANALYZE_TRENDS,
        label_fa: "روند و الگو",
        default_button_label_fa: "روند و الگو",
      },
      {
        action_name: FORM_AI_NAMES.ACTION_ANALYZE_RISK,
        label_fa: "ریسک و تهدید",
        default_button_label_fa: "ریسک و تهدید",
      },
    ],
  },
  {
    form_name: FORM_AI_NAMES.NEWS_EDITORIAL_BATCH,
    label_fa: "پالایش هوشمند اخبار",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_RUN_EDITORIAL,
        label_fa: "پالایش و دبیری دسته‌ای",
        default_button_label_fa: "پالایش و دبیری هوشمند",
      },
    ],
  },
  {
    form_name: FORM_AI_NAMES.STRATEGY_COMMAND_OUTPUTS,
    label_fa: "خروجی‌های راهبردی مرکز فرماندهی",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_GENERATE_SOFT_WAR_ANNEX,
        label_fa: "تولید پیوست جنگ نرم",
        default_button_label_fa: "تولید پیوست جنگ نرم",
      },
    ],
  },
  {
    form_name: FORM_AI_NAMES.SAMPLE_FORM,
    label_fa: "فرم نمونه",
    actions: [
      {
        action_name: FORM_AI_NAMES.ACTION_SAMPLE_SUMMARIZE,
        label_fa: "خلاصه‌سازی",
        default_button_label_fa: "خلاصه‌سازی با هوش‌افزار",
      },
      {
        action_name: FORM_AI_NAMES.ACTION_SAMPLE_SECURE,
        label_fa: "امن‌سازی",
        default_button_label_fa: "امن‌سازی متن با هوش‌افزار",
      },
    ],
  },
];

/** راهنمای صفحهٔ «اکشن‌های AI فرم‌ها» — فهرست نکات ساده */
export const AI_FORM_ACTION_SIMPLE_FLOW_FA = [
  "برای هر دکمه مشخص کنید کدام فرم و کدام نقش (اکشن) است.",
  "همیشه یک پرامپت از «مدیریت پرامپت‌ها» انتخاب کنید؛ متن اصلی ارسال به مدل از همان پرامپت خوانده می‌شود.",
  "برای «خلاصه مدیریتی» اگر در پرامپت از {{PERIOD_START}}، {{PERIOD_END}}، {{PERIOD_KIND_FA}}، {{REPORTS_DIGEST}} استفاده کنید، سرور آن‌ها را از بازه و گزارش‌های پایگاه پر می‌کند.",
  "برای «مدیریت اخبار» در پرامپت می‌توانید از {{FORM_cleaned_text}}، {{FORM_source}} و سایر فیلدهای JSON استفاده کنید.",
  "برای «پردازش هوشمند اخبار» از {{PERIOD_START}}، {{PERIOD_END}}، {{NEWS_COUNT}}، {{FILTER_SUMMARY}}، {{NEWS_DIGEST}} در پرامپت استفاده کنید.",
  "برای «پالایش هوشمند اخبار» فقط سیاست‌های تشخیص (اهمیت، کیفیت، مرتبط/غیرمرتبط، دسته) را بنویسید؛ مقیاس‌ها، دسته‌ها، آستانه خلاصه و قالب JSON توسط سامانه از پایگاه تزریق می‌شود.",
  "کاربرد API (usage_key) را مثل همان چیزی که در «مدیریت API هوش» ثبت کرده‌اید انتخاب کنید؛ در صورت نیاز یک ردیف مشخص را برای اولویت بگذارید.",
  "فیلدهای فرم را در JSON به صورت آرایهٔ نام فیلد بدهید تا در مسیرهای دیگر زیر پرامپت اضافه شوند؛ در متن پرامپت می‌توانید از {{FORM_نام_فیلد}} استفاده کنید.",
];

/** توضیح کوتاه استراتژی یکسان (unified_v1) */
export const UNIFIED_AI_ASSEMBLY_HINT_FA =
  "استراتژی «یکسان»: متن پرامپت همیشه از رجیستری (کلید انتخابی شما) خوانده می‌شود. اگر در متن توکن‌های {{...}} باشد، با دادهٔ فرم و متغیرهای ثبت‌شده برای آن اکشن پر می‌شوند؛ وگرنه فیلدهای JSON به صورت بلوک برچسب‌دار زیر پرامپت می‌آیند. برای اکشن خلاصه میدانی، علاوه بر این، متغیرهای بازه و digest گزارش در سرور محاسبه و در قالب جایگزین می‌شوند.";

export function getDefaultRegisteredFormAction() {
  const f = REGISTERED_FORM_AI_ACTIONS[0];
  const a = f?.actions?.[0];
  return {
    form_name: f?.form_name ?? FORM_AI_NAMES.FIELD_MANAGEMENT_SUMMARY_CREATE,
    action_name: a?.action_name ?? FORM_AI_NAMES.ACTION_GENERATE_SUMMARY,
    button_label_fa: a?.default_button_label_fa ?? "",
  };
}

/**
 * @returns {{ form: { form_name: string, label_fa: string, actions: object[] }, action: object } | null}
 */
export function findRegisteredActionMeta(formName, actionName) {
  const fn = String(formName || "").trim();
  const an = String(actionName || "").trim();
  const form = REGISTERED_FORM_AI_ACTIONS.find((x) => x.form_name === fn);
  if (!form) return null;
  const action = form.actions?.find((x) => x.action_name === an);
  if (!action) return null;
  return { form, action };
}

export function getFormLabelFa(formName) {
  const fn = String(formName || "").trim();
  const f = REGISTERED_FORM_AI_ACTIONS.find((x) => x.form_name === fn);
  return f?.label_fa || fn || "—";
}

export function getActionLabelFa(formName, actionName) {
  const m = findRegisteredActionMeta(formName, actionName);
  return m?.action?.label_fa || String(actionName || "").trim() || "—";
}
