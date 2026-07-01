import React from "react";
import { ANALYSIS_TERMS } from "../constants/analysisTerminology.js";

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
      "مدیریت کل چرخه محور → تصویب → ارجاع → مأموریت → گزارش.",
      "هر تب یک مرحله جدا دارد؛ با بازگشت از جزئیات، همان تب و فیلترها حفظ می‌شوند.",
    ])}
    {helpSection(`تب «${ANALYSIS_TERMS.ratifyTab}»`, [
      "کارت محورهای ثبت‌شده / برگشت‌خورده را نشان می‌دهد.",
      "کلیک روی کارت → صفحه تصویب/رد/برگشت. دکمه «ثبت تصمیم» وضعیت را تغییر می‌دهد.",
      "Submitted = منتظر تصویب؛ UnderReview = برگشت برای اصلاح پیشنهاددهنده.",
    ])}
    {helpSection(`تب «${ANALYSIS_TERMS.assignTab}»`, [
      "فقط محورهای تصویب‌شده (Approved/Assigned). badge روی کارت: تعداد ارجاع، در جریان، تمام.",
      "کلیک → جدول مأموریت‌ها + «ارجاع جدید». لغوشده‌ها پیش‌فرض پنهان؛ از فیلتر «نمایش لغو/بایگانی» ببینید.",
    ])}
    {helpSection("تب «مأموریت‌ها»", [
      "پایش همه assignmentها. «مدیریت» → تغییر مهلت/دستورالعمل. workflow تحلیل از مسیر جداگانه.",
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
      "دکمه تمام‌صفحه روی ویرایشگر → فضای بیشتر برای نوشتن. حداکثر ۴۰۰۰ کاراکتر (متن خالص).",
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
    {helpSection("ثبت محور", [
      `${ANALYSIS_TERMS.axis}/حوزه/کلیدواژه: حداکثر ۸۰ کاراکتر.`,
      "شرح و دلیل اهمیت: حداکثر ۱۵۰ کاراکتر (متن خالص). از toolbar برای بولد/زیرخط استفاده کنید.",
      `${ANALYSIS_TERMS.suggestedDeadline}: ${ANALYSIS_TERMS.suggestedDeadlineHint}.`,
      `${ANALYSIS_TERMS.suggestedDeadline} ≠ ${ANALYSIS_TERMS.missionDeadline} (بعد از ارجاع تعیین می‌شود).`,
    ])}
    {helpSection("پس از ارسال", [
      "UnderReview = برگشت برای اصلاح — متن برگشت روی کارت نمایش داده می‌شود.",
      "Rejected = رد نهایی. Approved = آماده ارجاع توسط مدیر.",
    ])}
  </div>
);

export const ASSIGN_DETAIL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("ارجاع", [
      "تحلیل‌گر و راهنما از لیست جستجوپذیر. دستورالعمل حداکثر ۱۵۰ کاراکتر.",
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

export const APPROVAL_DETAIL_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("تصویب محور", [
      "محتوای محور را بخوانید؛ در صورت نیاز «ویرایش محتوای محور» را بزنید.",
      `تصمیم: ${ANALYSIS_TERMS.ratify} / رد / برگشت برای اصلاح / بستن. توضیح حداکثر ۱۵۰ کاراکتر.`,
      "«ثبت تصمیم» وضعیت را تغییر می‌دهد و به لیست تصویب برمی‌گردید.",
    ])}
    {helpSection("تصمیم‌ها", [
      `${ANALYSIS_TERMS.ratify} → محور آماده ارجاع در تب «${ANALYSIS_TERMS.assignTab}».`,
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

export const MISSION_MANAGE_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("مدیریت مأموریت", [
      `تغییر ${ANALYSIS_TERMS.missionDeadline} (شمسی)، اولویت و دستورالعمل (حداکثر ۱۵۰ کاراکتر).`,
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
