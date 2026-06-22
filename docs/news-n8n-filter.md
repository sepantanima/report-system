# فیلتر انتشار اخبار در n8n (فاز ۵)

پس از استقرار «مدیریت اخبار» و بررسی اخبار توسط مدیر، workflow واکشی n8n می‌تواند فقط اخبار تأییدشده را بگیرد.

## پیشنهاد شرط اضافه به SELECT

در بخش `WHERE` query واکشی (بعد از فیلتر بازه `ref_key`):

```sql
AND COALESCE(workflow_status, 'pending') = 'finalized'
AND COALESCE(is_approved, 0) = 1
AND COALESCE(duplicate_status, 'none') = 'none'
```

(ستون `workflow_status` پس از مایگریشن `011_news_workflow_v2.sql` در دسترس است.)

## نگاشت وضعیت (گردش کار → DB)

| workflow_status | معنی |
|-----------------|------|
| new | تازه ثبت (پایشگر) |
| pending | در انتظار دبیر |
| reviewed | بررسی‌شده توسط دبیر |
| finalized | تأیید نهایی سردبیر — آماده n8n |

## نگاشت حکم دبیر (review_state → DB)

| وضعیت در برنامه | is_approved | status |
|-----------------|-------------|--------|
| بررسی | 0 | 0 |
| تأیید | 1 | 1 |
| رد | 2 | 0 |
| شایعه | 1 | 2 |

تا زمانی که این فیلتر را اضافه نکنید، n8n همانند قبل همه اخبار دارای متن در بازه را می‌بیند.

---

## فرمت متن: HTML داخلی + خروجی بله/تلگرام

در DB فیلد `cleaned_text` به‌صورت **HTML** (ویرایشگر سامانه) نگه‌داری می‌شود. فیلد `raw_text` متن خام ورودی (مثلاً Markdown بله/تلگرام) را حفظ می‌کند.

ستون `source_platform` (مایگریشن `013_news_source_platform.sql`):

| مقدار | معنی |
|-------|------|
| `bale` | ورود/خروج Markdown کلاسیک بله (`*bold*`, `_italic_`) |
| `telegram` | خروج MarkdownV2 تلگرام (با escape) |
| `manual` | ثبت/ویرایش دستی در سامانه |
| `null` | تشخیص خودکار هنگام ingest |

### ingest از n8n (INSERT)

**نیازی به ستون `workflow_status` در INSERT نیست** — پس از مایگریشن `015_news_workflow_default_pending.sql` پیش‌فرض دیتابیس `pending` است و خبر مستقیم در صف دبیر قرار می‌گیرد.

ثبت پیش‌نویس از فرم پایشگر در سامانه همچنان صریحاً `workflow_status = 'new'` می‌گیرد.

هنگام درج، `raw_text` را همان‌طور که از bot می‌آید ذخیره کنید و `source_platform` را تنظیم کنید. اگر `cleaned_text` نفرستید، سرور خودش Markdown را به HTML تبدیل می‌کند:

```json
{
  "raw_text": "خبر *مهم* از منبع",
  "source": "کانال نمونه",
  "source_platform": "bale",
  "source_date_jalali": "1405-03-21",
  "source_time_hm": "0819"
}
```

### خروج تک‌خبر برای bot (بدون auth — legacy)

```
GET /api/news/export-text/:id?format=telegram
GET /api/news/export-text/:id?format=bale
GET /api/news/export-text/:id?format=html
GET /api/news/export-text/:id?format=plain
```

پاسخ:

```json
{
  "id": 42021,
  "format": "telegram",
  "text": "متن *فرمت\\-شده*",
  "plain": "متن فرمت‌شده",
  "source": "کانال",
  "source_platform": "bale",
  "ref_key": null
}
```

در node ارسال تلگرام، فیلد `text` را با `parse_mode: MarkdownV2` بفرستید. برای بله از Markdown کلاسیک bot خود استفاده کنید.

### خروج گروهی (با auth — مدیریت اخبار)

```
GET /api/news/monitor/bulk-export?format=telegram&workflow_status=finalized&start_date=1405-03-01&end_date=1405-03-21
Authorization: Bearer <token>
```

همان فیلترهای `GET /api/news/monitor` (بازه، workflow، منبع، …) اعمال می‌شود.

### نمونه workflow n8n

1. HTTP Request: `GET .../monitor/bulk-export?format=telegram&workflow_status=finalized` (یا SQL + حلقه روی id)
2. برای هر ردیف: Telegram Send Message با `text = {{ $json.text }}` و `parse_mode = MarkdownV2`
3. برای بله: `format=bale` و API bot بله

### تست تبدیل در سرور

```bash
cd backend/report_backend
npm run test:news-format
```

---

## پاکسازی متن (raw_text / cleaned_text)

### جریان در سامانه

| فیلد | نقش |
|------|-----|
| `raw_text` | متن خام اولیه — **بدون تغییر** در طول مدیریت |
| `cleaned_text` | نتیجه پاکسازی الگوها + HTML برای نمایش/ویرایش دبیر |
| `hash_key` | FNV-1a روی `trim(cleaned_plain) + '||' + source` |

پایشگر فقط `raw_text` می‌فرستد؛ پاکسازی در سرور (`newsIngestPipeline`) انجام می‌شود.

الگوهای قابل ویرایش: `/admin/news-clean-patterns` (نقش admin).

### n8n

- workflow فعلی که Node پاکسازی دارد همچنان کار می‌کند.
- برای هم‌خوانی کامل: می‌توانید Node 11 را حذف کنید و فقط `raw_text` INSERT کنید؛ سامانه همان منطق را اعمال می‌کند.
- پس از استقرار FNV-1a، اسکریپت `node scripts/recomputeNewsHashKeys.js` را یک‌بار اجرا کنید تا `hash_key` رکوردهای قدیمی بازمحاسبه شود.

