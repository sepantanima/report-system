/**
 * Node 11 — Pattern Cleaner (No AI)
 * همگام با tbl_news_clean_patterns + builtin سامانه
 * حذف ایموجی، نماد، تبلیغات کانال، هشتگ‌ها، تگ‌های HTML (<p> و …)
 * ✅ حفظ و اصلاح نیم‌فاصله (ZWNJ)
 *
 * آستانه خلاصه — هم‌راستا با summarize_char_threshold در تنظیمات سامانه (پیش‌فرض ۳۰۰)
 */
const SUMMARIZE_CHAR_THRESHOLD = 300;

let text = String($json.cleaned_text || $json.raw_text || '');

// =====================
// ✅ حذف تگ HTML (علت باقی‌ماندن <p> اول/آخر)
// =====================
text = text
  .replace(/&lt;(\/?)\s*p\s*&gt;/gi, '<$1p>')
  .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/div>/gi, '\n')
  .replace(/<\/h[1-6]>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

// =====================
// ✅ الگوهای عبارت/رجکس (حذف از متن)
// =====================
const PATTERNS = [
  // --- تبلیغ و دعوت ---
  /با این کانال.*?👇/gi,
  /به کانال.*?بپیوندید.*?👇/gi,
  /آخرین اخبار.*?👇/gi,
  /اخبار فوری.*?👇/gi,
  /روی عضویت کلیک کنید/gi,
  /آخرین اخبار/gi,
  /اخبار فوری/gi,

  // --- لینک و دامنه ---
  /\|?\s*akharinkhabar\.ir/gi,
  /FilimoSchool\.com/gi,
  /khabarmohem\.ir/gi,
  /\bkhabarfoori\.com\b/gi,
  /\bble\.ir\/join\/[A-Za-z0-9_-]+\b/gi,
  /\*?\s*ble\.ir\/join\/[A-Za-z0-9]+\s*(?:ble\.ir\/join\/[A-Za-z0-9]+\s*)+\*?/gi,

  // --- امضا، کانال‌ها، تگ‌های خبری ---
  /[ـ\-_=]{5,}\s*نیوز/gi,
  /\[کانال\s*ایتا\s*خبرنامه\s*تهران\]/gi,
  /\[کانال\s*تلگرام\s*خبرنامه\s*تهران\]/gi,
  /\[کانال\s*روبیکا\s*خبرنامه\s*تهران\]/gi,
  /\(\s*\[کانال\s*روبیکا\s*خبرنامه\s*تهران\]\s*\)/gi,

  // --- کانال‌ها (n8n + جدول سامانه) ---
  /@Artesh_Mardomi/gi,
  /@KhabarFuri/gi,
  /@khbar1fori/gi,
  /@Jahan_Fouri/gi,
  /@Cataphract1/gi,
  /@tajhizat_nezami2017/gi,
  /@sarbazane_g/gi,
  /@World_Newsly/gi,
  /@KhalijFarsNews\s*\|\s*پایگاه خبری خلیج‌فارس/gi,
  /قدس نیوز/gi,
  /صابرین نیوز.*?👇/gi,
  /صابرین نیوز/gi,
  /پدرفتنه/gi,
  /ایرانِ‌بیدار/gi,

  // --- تبلیغات اضافه‌شده در سامانه ---
  /برای دنبال کردن اخبار جنگ\s*،?\s*تعطیلی روی لینک زیر ضربه بزنید/gi,

  // --- حذف کامل همه هشتگ‌ها ---
  /#[\w\u0600-\u06FF_‌]+/g,

  // --- نمادهای تزئینی ---
  /┄┅═✧.*?✧═┅┄/gi,
  /\|\s*\|/gi,
  /\|\s*Link\b/gi,
  /به ثانیه، به دقیقه باخبر باش/gi,

  // --- پرانتزهای اضافی ---
  /(?:\(\s*){2,}/g,
  /(?:\)\s*){2,}/g,

  // --- نیــوز و خطوط تزئینی ---
  /[ـ]{2,}/gi,
  /\s*نیوز\s*/gi,

  // --- کانال‌های خبرنامه تهران (همه حالت‌ها) ---
  /\[?\s*کانال\s*ایتا\s*خبرنامه\s*(?:تهران)?\s*\]?/gi,
  /\[?\s*کانال\s*روبیکا\s*خبرنامه\s*(?:تهران)?\s*\]?/gi,
  /\[?\s*کانال\s*تلگرام\s*خبرنامه\s*(?:تهران)?\s*\]?/gi,
  /\(\s*کانال\s*ایتا\s*خبرنامه\s*(?:تهران)?\s*\)/gi,
  /\(\s*کانال\s*روبیکا\s*خبرنامه\s*(?:تهران)?\s*\)/gi,
  /\(\s*کانال\s*تلگرام\s*خبرنامه\s*(?:تهران)?\s*\)/gi,
  /ما را در سایت و تلگرام اسپوتنیک دنبال کنید/gi,
  /─+\s*منبع:.*?زمان:\s*[\d۰-۹]{1,2}:[\d۰-۹]{2}\s*\|\s*[\d۰-۹]{4}\/[\d۰-۹]{1,2}\/[\d۰-۹]{1,2}/gi,
  /(کانال\s*ایتا\s*خبرنامه|کانال\s*روبیکا\s*خبرنامه|کانال\s*تلگرام\s*خبرنامه)/gi,

  // --- لینک کامل ---
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
];

// الگوهایی که کل خط را حذف می‌کنند (remove_mode = line در جدول)
const LINE_PATTERNS = [
  /AkhbareFori/gi,
];

const EMOJI_REGEX =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

const removed = [];

LINE_PATTERNS.forEach((rx) => {
  const lines = text.split('\n');
  let hit = false;
  const kept = lines.filter((line) => {
    const r = new RegExp(rx.source, rx.flags);
    if (r.test(line)) {
      hit = true;
      return false;
    }
    return true;
  });
  if (hit) removed.push(rx.toString() + ' [line]');
  text = kept.join('\n');
});

PATTERNS.forEach((rx) => {
  const r = new RegExp(rx.source, rx.flags);
  if (r.test(text)) removed.push(rx.toString());
  text = text.replace(new RegExp(rx.source, rx.flags), '');
});

text = text.replace(EMOJI_REGEX, '');

text = text
  .replace(/\u200c+/g, '‌')
  .replace(/\s*\u200c\s*/g, '‌')
  .replace(/\u200c{2,}/g, '‌');

text = text
  .replace(/^\s*<\/?p>\s*/i, '')
  .replace(/\s*<\/?p>\s*$/i, '')
  .replace(/<\/?p>/gi, '\n')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const summary = text.length > SUMMARIZE_CHAR_THRESHOLD
  ? text.slice(0, SUMMARIZE_CHAR_THRESHOLD) + '… ادامه'
  : text;

return [
  {
    json: {
      ...$json,
      cleaned_text: text,
      summary: summary,
      removed_patterns: removed
    }
  }
];
