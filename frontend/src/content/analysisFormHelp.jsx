import React from "react";
import { ANALYSIS_TERMS, BRIEF_TERMS } from "../constants/analysisTerminology.js";
import { ANALYSIS_FIELD_LIMITS, TOPIC_FIELD_LIMITS } from "../constants/analysisFieldLimits.js";
import { AnalystSuggestionWorkflowHelp } from "./analystSuggestionHelp.jsx";

const helpSection = (title, items) => (
  <div style={{ marginBottom: 16 }}>
    <b style={{ display: "block", marginBottom: 8, color: "#38bdf8" }}>{title}</b>
    <ul style={{ margin: 0, paddingRight: 18, lineHeight: 2 }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
    </ul>
  </div>
);

const statusBlock = (items) => (
  <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>راهنمای وضعیت‌ها</div>
    {items.map(([tag, desc]) => (
      <div key={tag} style={{ fontSize: 11, marginBottom: 6, lineHeight: 1.8 }}>
        <span style={{ color: "#38bdf8", fontWeight: 600 }}>{tag}:</span> {desc}
      </div>
    ))}
  </div>
);

export const MANAGER_PANEL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("هدف این صفحه", [
      "مدیریت ارجاع مأموریت‌ها و تحلیل‌های ثبت‌شده (غیر موضوع).",
      "تصویب و مدیریت محورها از منوی جداگانه «مدیریت محورها» انجام می‌شود.",
      "گزارش‌ها از منوی «داشبورد تحلیل‌ها» در دسترس است.",
      `تب «${BRIEF_TERMS.inboxTab}» و «${BRIEF_TERMS.bankTab}»: بررسی تحلیل کوتاه، تأیید بانک و انتشار.`,
    ])}
    {helpSection("تب «مأموریت‌ها» — تحلیل‌های ثبت‌شده", [
      `در جزئیات هر تحلیل کوتاه، «${BRIEF_TERMS.suggestAnalyst}» پیشنهاد رسمی برای نقش تحلیل‌گر است.`,
      "اعمال نقش در «مدیریت کاربران» انجام می‌شود — برچسب «پیشنهاد تحلیل‌گر» در لیست کاربران تا زمان اعمال نقش باقی می‌ماند.",
      "لیست اصلی مأموریت‌هاست؛ هر محور یک دسته تاشو با مأموریت‌هایش.",
      "روی سربرگ هر دسته کلیک کنید تا باز/بسته شود؛ دکمه «ارجاع» برای افزودن مأموریت به همان محور.",
      "نوار «محور آماده ارجاع» فقط برای محورهای بدون مأموریت است — از فیلتر «نما» هم می‌توانید همان‌ها را ببینید.",
      "دکمه «ایجاد مأموریت» برای انتخاب محور و شروع ارجاع.",
      "محور با مهلت گذشته قابل ارجاع جدید نیست — از «مدیریت محورها» مهلت را تمدید کنید.",
    ])}
    {helpSection("تب «گزارش‌ها»", [
      "بازه تاریخ از فیلتر بالای صفحه. نمودار وضعیت، رتبه تحلیل‌گر/داور/واحد، لیست تحلیل‌های تکمیل‌شده.",
      "Excel روی هر ویجت رتبه‌بندی.",
    ])}
    {statusBlock([
      ["Submitted", "محور ثبت شده، منتظر تصویب"],
      ["Approved", "تصویب شده، آماده ارجاع"],
      ["Assigned / InProgress", "مأموریت فعال"],
      ["NeedsRevision", "تحلیل برگشت خورده"],
      ["FinalApproved", "تحلیل تایید نهایی"],
      ["Cancelled / Closed", "لغو یا بسته — با فیلتر archive"],
    ])}
  </div>
);

export const MISSION_DETAIL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("محتوای تحلیل", [
      "تحلیل‌گر فقط در Draft/ReturnedForRevision ویرایش می‌کند. پس از «ارسال» متن قفل می‌شود.",
      "دکمه تمام‌صفحه روی ویرایشگر → فضای بیشتر برای نوشتن. حداکثر ۶۰۰۰ کاراکتر (متن خالص).",
      "«ذخیره» = پیش‌نویس؛ «ارسال» = ورود به صف بازبینی.",
    ])}
    {helpSection("بازخورد", [
      "راهنما/مدیر فقط بازخورد می‌دهد، متن تحلیل را ویرایش نمی‌کند.",
      "«درخواست اصلاح» → NeedsRevision + باز کردن قفل برای تحلیل‌گر.",
    ])}
    {helpSection("تایید نهایی و امتیاز", [
      "فقط مدیر «تایید نهایی» می‌زند. سپس تب امتیازدهی (۱–۵) فعال می‌شود.",
      "PDF پس از تایید نهایی — A4 راست‌چین با شناسنامه.",
    ])}
    {statusBlock([
      ["Draft", "پیش‌نویس — قابل ویرایش"],
      ["Submitted", "ارسال‌شده — قفل، منتظر بازبینی"],
      ["ReturnedForRevision", "برگشت — تحلیل‌گر دوباره ویرایش"],
      ["FinalApproved", "تایید نهایی — آماده امتیاز و PDF"],
    ])}
  </div>
);

export const TOPIC_FORM_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("فرایند محور تحلیل", [
      "۱. پیشنهاد موضوع — هر کاربر با نقش پیشنهاددهنده می‌تواند موضوع ثبت کند.",
      "۲. تصویب — تصویب‌کننده موضوع را می‌پذیرد (محور می‌شود)، رد می‌کند یا برای اصلاح برمی‌گرداند.",
      "۳. ارجاع — مدیر تحلیل محور را به تحلیل‌گر با راهنما ارجاع می‌دهد.",
      "۴. تحلیل و بازبینی — تحلیل‌گر می‌نویسد، راهنما بازبینی، مدیر تایید نهایی می‌کند.",
      "۵. تکمیل — وقتی همه مأموریت‌ها تمام شوند موضوع خودکار تکمیل می‌شود؛ مدیر هم می‌تواند زودتر تکمیل کند.",
    ])}
    {statusBlock([
      ["Submitted", "منتظر تصویب"],
      ["UnderReview", "برگشت برای اصلاح"],
      ["Approved", "محور تصویب‌شده — آماده ارجاع"],
      ["Assigned", "در جریان تحلیل"],
      ["Completed", "تکمیل‌شده"],
      ["Rejected", "رد شده"],
      ["Closed", "بایگانی‌شده"],
    ])}
    {helpSection("تب‌های این صفحه", [
      "فعال: پیشنهادهای در انتظار تصویب یا نیازمند اصلاح شما.",
      "آرشیو: رد شده، تکمیل‌شده و بایگانی‌شده.",
      "پس از تصویب، محور در «مدیریت تحلیل‌ها» قابل ارجاع است.",
    ])}
    {helpSection("ثبت پیشنهاد", [
      `${ANALYSIS_TERMS.axis}/حوزه/کلیدواژه: حداکثر ${TOPIC_FIELD_LIMITS.title} کاراکتر.`,
      `شرح محور: حداکثر ${TOPIC_FIELD_LIMITS.description} کاراکتر (متن خالص). دلیل اهمیت: حداکثر ${TOPIC_FIELD_LIMITS.importance_reason} کاراکتر.`,
      `${ANALYSIS_TERMS.suggestedDeadline}: ${ANALYSIS_TERMS.suggestedDeadlineHint}.`,
      `${ANALYSIS_TERMS.suggestedDeadline} ≠ ${ANALYSIS_TERMS.missionDeadline} (بعد از ارجاع تعیین می‌شود).`,
      "مدیر یا تصویب‌کننده با ثبت مستقیم، محور را تصویب‌شده ایجاد می‌کند.",
    ])}
    {helpSection("تفاوت پایان‌ها", [
      "رد: تصمیم منفی در تصویب.",
      "تکمیل: پایان فرایند (خودکار یا توسط مدیر).",
      "بایگانی: حذف نرم از لیست فعال.",
    ])}
  </div>
);

export const ASSIGN_DETAIL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("ارجاع", [
      `تحلیل‌گر و راهنما از لیست جستجوپذیر. دستورالعمل حداکثر ${ANALYSIS_FIELD_LIMITS.description} کاراکتر.`,
      `${ANALYSIS_TERMS.missionDeadline} مهلت واقعی analyst است؛ ${ANALYSIS_TERMS.suggestedDeadline} فقط مرجع.`,
      "لغو فقط وقتی status=Assigned و تحلیل شروع نشده.",
    ])}
  </div>
);

export const MENTOR_REVIEW_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("صف بازبینی", [
      "راهنما: فقط مأموریت‌های خودش. مدیر: همه + badge «بدون راهنما».",
      "بازبینی = ثبت بازخورد در workflow؛ امتیاز فقط پس از تایید نهایی توسط مدیر.",
      "دکمه «بازبینی و ثبت نظر» → صفحه workflow تحلیل (تب بازخورد).",
    ])}
    {statusBlock([
      ["Submitted", "تحلیل ارسال شده — آماده بازبینی"],
      ["NeedsRevision", "برگشت خورده — منتظر اصلاح تحلیل‌گر"],
      ["Revised", "نسخه اصلاح‌شده — نیاز به بازبینی مجدد"],
      ["Approved", "تایید راهنما — منتظر تایید نهایی مدیر"],
    ])}
  </div>
);

export const TOPIC_MANAGEMENT_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection(ANALYSIS_TERMS.manageAxesPageTitle, [
      "چرخه محور در این صفحه تمام می‌شود: پیشنهاد → تصویب یا رد → محور تصویب‌شده.",
      "پس از تصویب، ارجاع مأموریت از «مدیریت تحلیل‌ها» انجام می‌شود.",
      "تب‌ها بر اساس نقش شما نمایش داده می‌شوند.",
    ])}
    {helpSection("تب‌ها", [
      "صف تصویب: بررسی و تصویب/رد پیشنهادها.",
      "پیشنهادات من: ثبت و پیگیری پیشنهادهای خودتان.",
      "محورهای تصویب‌شده: مشاهده محورهای فعال و تمدید مهلت.",
      "پیشنهادات ثبت تحلیل: تبدیل پیشنهاد موضوع از فرم ثبت تحلیل به محور.",
    ])}
    {helpSection("تصویب محور", [
      "کلیک روی پیشنهاد → صفحه تصمیم (تصویب / رد / برگشت / بستن).",
      `${ANALYSIS_TERMS.ratify} → محور آماده ارجاع در مدیریت تحلیل‌ها.`,
    ])}
  </div>
);

export const APPROVAL_DETAIL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("لیست تصویب", [
      "صف تصویب: پیشنهادهای Submitted و UnderReview.",
      "تب آرشیو: محورهای رد شده یا بایگانی‌شده.",
      "کلیک روی کارت یا «بررسی و تصویب» → صفحه تصمیم.",
    ])}
    {helpSection("تصویب محور", [
      "محتوای محور را بخوانید؛ در صورت نیاز «ویرایش محتوای محور» را بزنید.",
      `تصمیم: ${ANALYSIS_TERMS.ratify} / رد / برگشت برای اصلاح / بستن. توضیح حداکثر ${ANALYSIS_FIELD_LIMITS.description} کاراکتر.`,
      "«ثبت تصمیم» وضعیت را تغییر می‌دهد و به لیست تصویب برمی‌گردید.",
    ])}
    {helpSection("تصمیم‌ها", [
      `${ANALYSIS_TERMS.ratify} → محور آماده ارجاع در «مدیریت تحلیل‌ها».`,
      "برگشت برای اصلاح → پیشنهاددهنده باید اصلاح و ارسال مجدد کند.",
      "رد → محور رد نهایی. بستن → بایگانی بدون ارجاع.",
    ])}
    {statusBlock([
      ["Submitted", "منتظر تصویب"],
      ["Approved", "تصویب — آماده ارجاع"],
      ["UnderReview", "برگشت برای اصلاح پیشنهاددهنده"],
      ["Rejected", "رد نهایی"],
    ])}
  </div>
);

export const BRIEF_SUBMIT_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection(BRIEF_TERMS.pageTitle, [
      "هر کاربر می‌تواند تحلیل کوتاه ثبت کند، تحلیل دیگران را بارگذاری کند، یا موضوع جدید برای محور تحلیل پیشنهاد دهد — بدون نیاز به محور یا مأموریت از قبل.",
      `${BRIEF_TERMS.entryModeSelf}: نام شما به‌صورت خودکار به‌عنوان منبع ثبت می‌شود.`,
      `${BRIEF_TERMS.entryModeExternal}: منبع/نویسنده (شخص، نهاد، وب‌سایت و …) الزامی است — حداکثر ۵۰۰ کاراکتر.`,
      `${BRIEF_TERMS.entryModeTopicProposal}: فقط موضوع پیشنهادی و توضیح آن — دلیل اهمیت اختیاری. مدیر می‌تواند آن را به محور تحلیل ارتقا دهد.`,
      "تاریخ نگارش (شمسی) برای تحلیل‌ها اختیاری است؛ از تقویم انتخاب کنید — پیش‌فرض امروز. حداکثر ۵ ثبت در روز.",
    ])}
    {helpSection("پس از بررسی مدیر", [
      `${BRIEF_TERMS.approveBank}: ذخیره در ${BRIEF_TERMS.bankTab}.`,
      `${BRIEF_TERMS.editorApprove}: تأیید سر دبیر برای انتشار در پیام‌رسان.`,
      `${BRIEF_TERMS.promoteTopic} / ${BRIEF_TERMS.promoteMission}: ارتقا به فرایند رسمی محور و مأموریت.`,
    ])}
    {statusBlock([
      ["Submitted", "ارسال شده — منتظر بررسی مدیر"],
      ["ManagerApproved", "در بانک تحلیل"],
      ["EditorApproved", "تأیید انتشار"],
      ["Published", "منتشر شده در پیام‌رسان"],
      ["Rejected", "رد شده (با دلیل رد)"],
      ["Archived", "بایگانی"],
      ["Acknowledged", "دریافت شد (وضعیت قدیمی)"],
    ])}
  </div>
);

export const BRIEF_INBOX_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection(`تب «${BRIEF_TERMS.inboxTab}»`, [
      "صندوق ورودی تحلیل‌های تازه ثبت‌شده (وضعیت ارسال شده).",
      "مدیر: تأیید → بانک تحلیل، رد (با دلیل رد + یادداشت)، یا بایگانی.",
      `«${BRIEF_TERMS.suggestAnalyst}»: ثبت پیشنهاد رسمی برای دادن نقش تحلیل‌گر به نویسنده — اعمال نهایی در «مدیریت کاربران» انجام می‌شود.`,
      `زیرتب «${BRIEF_TERMS.bankTab}»: تحلیل‌های تأییدشده، آماده انتشار و منتشرشده.`,
      "سر دبیر: تأیید انتشار، انتخاب کانال، انتشار؛ پس از انتشار ویرایش متن بانک بدون انتشار مجدد.",
    ])}
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <AnalystSuggestionWorkflowHelp compact />
    </div>
  </div>
);

export const DASHBOARD_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("داشبورد تحلیل‌ها", [
      "آمار و گزارش‌های فرایند تحلیل: عملکرد تحلیل‌گران، داوران، واحدها، تأخیرها و تحلیل‌های تکمیل‌شده.",
      "بازه تاریخ (شمسی) برای فیلتر گزارش‌ها — اختیاری.",
      "خروجی اکسل و PDF برای تحلیل‌های تاییدشده.",
    ])}
  </div>
);

export const MISSION_MANAGE_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection(ANALYSIS_TERMS.missionManagementPageTitle, [
      `تغییر ${ANALYSIS_TERMS.missionDeadline} (شمسی)، اولویت و دستورالعمل (حداکثر ${ANALYSIS_FIELD_LIMITS.description} کاراکتر).`,
      "«ذخیره تغییرات» فقط metadata را به‌روز می‌کند؛ متن تحلیل اینجا ویرایش نمی‌شود.",
      "«لغو ارجاع» فقط وقتی status=Assigned و تحلیل شروع نشده.",
      "«ورود به workflow تحلیل» → صفحه نوشتن/بازبینی تحلیل.",
    ])}
    {statusBlock([
      ["Assigned", "ارجاع شده — تحلیل‌گر هنوز شروع نکرده"],
      ["InProgress", "تحلیل در جریان"],
      ["Cancelled", "لغو شده"],
      ["FinalApproved", "تکمیل شده — تایید نهایی"],
    ])}
  </div>
);
