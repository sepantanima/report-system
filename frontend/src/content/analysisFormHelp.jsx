import React from "react";

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
      "مدیریت کل چرخه موضوع → تایید → ارجاع → مأموریت → گزارش.",
      "هر تب یک مرحله جدا دارد؛ با بازگشت از جزئیات، همان تب و فیلترها حفظ می‌شوند.",
    ])}
    {helpSection("تب «بررسی موضوعات»", [
      "کارت موضوعات ثبت‌شده / برگشت‌خورده را نشان می‌دهد.",
      "کلیک روی کارت → صفحه تایید/رد/برگشت. دکمه «ثبت تصمیم» وضعیت را تغییر می‌دهد.",
      "وضعیت Submitted = منتظر بررسی؛ UnderReview = برگشت برای اصلاح پیشنهاددهنده.",
    ])}
    {helpSection("تب «ارجاع موضوعات»", [
      "فقط موضوعات Approved/Assigned. badge روی کارت: تعداد ارجاع، در جریان، تمام.",
      "کلیک → جدول ارجاع‌ها + «ارجاع جدید». لغوشده‌ها پیش‌فرض پنهان؛ از فیلتر «نمایش لغو/بایگانی» ببینید.",
    ])}
    {helpSection("تب «مأموریت‌ها»", [
      "پایش همه assignmentها. «مدیریت» → تغییر مهلت/دستورالعمل. workflow تحلیل از مسیر جداگانه.",
    ])}
    {helpSection("تب «گزارش‌ها»", [
      "بازه تاریخ از فیلتر بالای صفحه. نمودار وضعیت، رتبه تحلیل‌گر/داور/واحد، لیست تحلیل‌های تکمیل‌شده.",
      "Excel روی هر ویجت رتبه‌بندی.",
    ])}
    {statusBlock([
      ["Submitted", "موضوع ثبت شده، منتظر تایید"],
      ["Approved", "تایید شده، آماده ارجاع"],
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
      "دکمه تمام‌صفحه روی ویرایشگر → فضای بیشتر برای نوشتن. حداکثر ۲۰۰۰ کاراکتر (متن خالص).",
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
    {helpSection("ثبت موضوع", [
      "عنوان/حوزه/کلیدواژه: حداکثر ۸۰ کاراکتر.",
      "شرح و دلیل اهمیت: حداکثر ۱۵۰ کاراکتر (متن خالص). از toolbar برای بولد/زیرخط استفاده کنید.",
      "مهلت پیشنهادی موضوع ≠ مهلت انجام تحلیل (بعد از ارجاع تعیین می‌شود).",
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
      "«مهلت انجام تحلیل» مهلت واقعی analyst است؛ مهلت پیشنهادی موضوع فقط مرجع.",
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
    {helpSection("بررسی موضوع", [
      "محتوای موضوع را بخوانید؛ در صورت نیاز «ویرایش محتوای موضوع» را بزنید.",
      "تصمیم: تایید / رد / برگشت برای اصلاح / بستن. توضیح حداکثر ۱۵۰ کاراکتر.",
      "«ثبت تصمیم» وضعیت را تغییر می‌دهد و به لیست بررسی برمی‌گردید.",
    ])}
    {helpSection("تصمیم‌ها", [
      "تایید → موضوع آماده ارجاع در تب «ارجاع موضوعات».",
      "برگشت برای اصلاح → پیشنهاددهنده باید اصلاح و ارسال مجدد کند.",
      "رد → موضوع رد نهایی. بستن → بایگانی بدون ارجاع.",
    ])}
    {statusBlock([
      ["Submitted", "منتظر بررسی مدیر"],
      ["Approved", "تایید — آماده ارجاع"],
      ["UnderReview", "برگشت برای اصلاح پیشنهاددهنده"],
      ["Rejected", "رد نهایی"],
    ])}
  </div>
);

export const MISSION_MANAGE_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    {helpSection("مدیریت مأموریت", [
      "تغییر مهلت انجام تحلیل (شمسی)، اولویت و دستورالعمل (حداکثر ۱۵۰ کاراکتر).",
      "«ذخیره تغییرات» فقط metadata را به‌روز می‌کند؛ متن تحلیل اینجا ویرایش نمی‌شود.",
      "«لغو ارجاع» فقط وقتی status=Assigned و تحلیل شروع نشده.",
      "«ورود به workflow تحلیل» → صفحه نوشتن/بازبینی تحلیل.",
    ])}
    {statusBlock([
      ["Assigned", "ارجاع شده — تحلیل‌گر هنوز شروع نکرده"],
      ["InProgress", "تحلیل در جریان"],
      ["Cancelled", "لغو شده"],
      ["Completed", "تکمیل شده"],
    ])}
  </div>
);
