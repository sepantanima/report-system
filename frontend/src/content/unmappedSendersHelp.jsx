import React from "react";

export const UNMAPPED_SENDERS_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 1.9, textAlign: "justify", color: "inherit" }}>
    <p style={{ marginTop: 0, fontWeight: 600 }}>هدف این صفحه</p>
    <p style={{ margin: "0 0 10px", opacity: 0.95 }}>
      وقتی خبر یا گزارش میدانی از پیام‌رسان (بله، تلگرام، ایتا) می‌آید، فیلد <b>sender</b> ممکن است
      هنوز به هیچ کاربر سامانه وصل نباشد. این صفحه همان موارد را نشان می‌دهد تا مدیر آن‌ها را
      تعیین‌تکلیف کند.
    </p>

    <p style={{ margin: "14px 0 6px", fontWeight: 600 }}>دو نوع اقدام</p>
    <ul style={{ margin: 0, paddingRight: 20 }}>
      <li style={{ marginBottom: 6 }}>
        <b>وصل به کاربر:</b> sender واقعاً نام یا شناسهٔ یک نفر است — کاربر سامانه را انتخاب کنید
        تا در آمار و گزارش‌ها زیر نام او شمرده شود.
      </li>
      <li style={{ marginBottom: 6 }}>
        <b>منبع خبری است</b> (فقط برای ردیف‌های خبر): sender در واقع نام کانال یا منبع خبری است،
        نه کاربر. پس از ثبت، دیگر در این لیست و در شمارنده «فرستنده نامشخص» داشبورد تحلیل نمی‌آید.
      </li>
    </ul>

    <p style={{ margin: "14px 0 6px", fontWeight: 600 }}>نوار آمار</p>
    <ul style={{ margin: 0, paddingRight: 20 }}>
      <li>تعداد فرستنده‌های یکتا (خبر + میدان)</li>
      <li>تفکیک خبر و گزارش میدانی</li>
      <li>جمع رکوردهای تحت تأثیر — تعداد کل اخبار/گزارش‌هایی که هنوز sender ناشناس دارند</li>
    </ul>

    <p style={{ margin: "14px 0 6px", fontWeight: 600 }}>جستجو و فیلتر</p>
    <p style={{ margin: 0, opacity: 0.9 }}>
      می‌توانید روی نام sender، پلتفرم، یا نوع (خبر / میدانی) جستجو کنید. پس از هر نگاشت موفق،
      فقط همان ردیف از لیست حذف می‌شود و کل صفحه دوباره بارگذاری نمی‌شود.
    </p>
  </div>
);
