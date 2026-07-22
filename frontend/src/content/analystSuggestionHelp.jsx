import React from "react";

const sectionStyle = { marginBottom: 16 };
const titleStyle = { display: "block", marginBottom: 8, color: "#38bdf8", fontWeight: 700 };
const listStyle = { margin: 0, paddingRight: 18, lineHeight: 2 };

/** فرایند ثابت «پیشنهاد تحلیل‌گر» — مستقل از RBAC */
export function AnalystSuggestionWorkflowHelp({ compact = false }) {
  const steps = [
    "کاربر (معمولاً با نقش کاربر واحد یا پایشگر) یک «تحلیل کوتاه» در سامانه ثبت می‌کند.",
    "مدیر تحلیل در «مدیریت مأموریت‌ها» → تب «تحلیل‌های ثبت‌شده»، روی همان مورد دکمه «پیشنهاد نقش تحلیل‌گر» را می‌زند.",
    "این کار یک پیشنهاد رسمی در سامانه ثبت می‌کند — هنوز نقش تحلیل‌گر به کاربر داده نشده است.",
    "در «مدیریت کاربران»، ستون «تحلیل کوتاه» برای آن نویسنده برچسب بنفش «پیشنهاد تحلیل‌گر» نشان می‌دهد؛ فیلتر «پیشنهاد تحلیل‌گر» همین کاربران را فهرست می‌کند.",
    "مدیر کاربران (یا کسی با مجوز manage_users) کاربر را ویرایش می‌کند، نقش «تحلیل‌گر» را فعال و ذخیره می‌کند.",
    "پس از ذخیره، برچسب «پیشنهاد تحلیل‌گر» خودکار حذف می‌شود و نقش «تحلیل‌گر» در لیست نقش‌های کاربر دیده می‌شود.",
  ];

  return (
    <div style={{ fontSize: compact ? 12 : 13, lineHeight: 1.9, textAlign: "justify" }}>
      <div style={sectionStyle}>
        <span style={titleStyle}>پیشنهاد تحلیل‌گر یعنی چه؟</span>
        <p style={{ margin: "0 0 8px" }}>
          نشانه‌ای است که <b>مدیر تحلیل</b> بر اساس کیفیت «تحلیل کوتاه» ثبت‌شده، این فرد را برای نقش تحلیل‌گر مناسب
          می‌داند. این برچسب <b>خودکار نقش نمی‌دهد</b> — فقط به مدیر کاربران یادآوری می‌کند که نقش را بررسی و در صورت
          تأیید، از فرم ویرایش کاربر اعمال کند.
        </p>
      </div>
      <div style={sectionStyle}>
        <span style={titleStyle}>مسیر عملی (گام‌به‌گام)</span>
        <ol style={listStyle}>
          {steps.map((s) => (
            <li key={s} style={{ marginBottom: 6 }}>{s}</li>
          ))}
        </ol>
      </div>
      {!compact && (
        <div style={{ ...sectionStyle, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: 12 }}>
          <span style={{ ...titleStyle, color: "#a855f7", marginBottom: 4 }}>نکته</span>
          <p style={{ margin: 0, fontSize: 12 }}>
            اگر نقش تحلیل‌گر را بدون پیشنهاد قبلی هم بدهید، مشکلی نیست. برچسب «پیشنهاد تحلیل‌گر» فقط برای پیگیری
            پیشنهادهای ثبت‌شده از صف تحلیل کوتاه است.
          </p>
        </div>
      )}
    </div>
  );
}

export const ANALYST_SUGGESTION_HELP = () => <AnalystSuggestionWorkflowHelp />;
