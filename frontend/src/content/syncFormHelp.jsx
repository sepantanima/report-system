import React from "react";

export const SYNC_MANAGEMENT_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 2.05, textAlign: "justify" }}>
    <p><b>همگام‌سازی آنلاین → آفلاین (USB یک‌طرفه)</b> — فقط pack از خارج به داخل می‌رود؛ هیچ فایلی از سرور داخلی با فلاش به خارج برنمی‌گردد.</p>

    <p style={{ marginTop: 12 }}><b>کدام کار کجا؟</b></p>
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginBottom: 8 }}>
      <tbody>
        <tr><td style={{ padding: "4px 8px", opacity: 0.85 }}>آنلاین</td><td>export، پیش‌نمایش، تأیید تحویل دستی، مدیریت تاریخچه</td></tr>
        <tr><td style={{ padding: "4px 8px", opacity: 0.85 }}>آفلاین</td><td>import و اعمال pack — بدون دانلود ack</td></tr>
      </tbody>
    </table>

    <p style={{ marginTop: 12 }}><b>مسیر عملی</b></p>
    <ol style={{ paddingRight: 18, margin: "4px 0" }}>
      <li>آنلاین: export → دانلود JSON.</li>
      <li>USB: فقط آنلاین → آفلاین.</li>
      <li>آفلاین: import → اعمال.</li>
      <li>هماهنگی (تلفن/حضوری): اپرator آنلاین «تأیید تحویل دستی» می‌زند.</li>
    </ol>

    <p style={{ marginTop: 12 }}><b>تأیید تحویل (به‌جای ack)</b></p>
    <ul style={{ paddingRight: 18, margin: "4px 0" }}>
      <li>فایل ack روی آفلاین تولید یا دانلود <b>نمی‌شود</b>.</li>
      <li>هشدار زرد = exportهایی که هنوز روی آنلاین تأیید نشده‌اند.</li>
      <li>مجوز: <code>sync.reconcile</code> — معمولاً مدیر فنی/کل.</li>
      <li>export بعدی مجاز است؛ import تکراری روی آفلاین skip می‌شود.</li>
    </ul>

    <p style={{ marginTop: 12 }}><b>تب تاریخچه — مدیریت و پاکسازی</b></p>
    <ul style={{ paddingRight: 18, margin: "4px 0" }}>
      <li>فیلتر: نوع، وضعیت تحویل، جستجو pack_id، فقط منتظر تأیید، شامل آرشیو.</li>
      <li>تأیید تکی/گروهی exportهای منتظر — با یادداشت اختیاری.</li>
      <li>آرشیو: خارج کردن از لیست فعال (export باز آرشیو نمی‌شود).</li>
      <li>پاکسازی: فقط آرشیوشده + تأییدشده + قدیمی‌تر از N روز — مجوز purge.</li>
    </ul>

    <p style={{ marginTop: 12 }}><b>تغییرات کاربر/نقش روی آفلاین</b></p>
    <p style={{ margin: "4px 0" }}>
      با pack sync منتقل نمی‌شود. «گزارش راهبر» فقط برای مشاهده روی آفلاین است — انتقال با USB به خارج توصیه نمی‌شود؛ راهبر آنلاین را تلفنی/حضوری راهنمایی کنید.
    </p>
  </div>
);
