# داشبورد تحلیلی اخبار

## مسیر

- Frontend: `/news-analytics`
- API: `/api/news/analytics/*`

## نگاشت وضعیت خبر

| برچسب UI | تعریف SQL |
|----------|-----------|
| ثبت شده | `workflow_status = 'new'` |
| در حال بررسی | `workflow_status IN ('pending','reviewed')` و `review_state = 'pending'` |
| تأیید شده | `review_state = 'approved'` |
| رد شده | `review_state = 'rejected'` |
| منتشر شده | `workflow_status = 'finalized'` + `is_approved = 1` + غیرتکراری |

## فیلترها

- **اولویت / اهمیت:** فیلد `priority` (۱–۴)
- **کیفیت:** فیلد `quality` (۱–۵)
- **واحد:** از `tbl_users.unit_cd` روی `observer_id`
- پیش‌فرض: اخبار تکراری از آمار حذف می‌شوند (`duplicate=exclude`)

## API endpoints

| Method | Path | توضیح |
|--------|------|--------|
| GET | `/filters/meta` | دسته، منبع، واحد، کاربران |
| GET | `/overview` | آمار کلی + pie |
| GET | `/distribution?dimension=` | category / priority / quality / source |
| GET | `/timeline?granularity=day` | روند روزانه |
| GET | `/units/participation` | مشارکت واحدها |
| GET | `/rankings/monitors` | رتبه پایشگران |
| GET | `/rankings/editors` | رتبه دبیران (audit) |
| GET | `/rankings/chiefs` | رتبه سردبیران (finalize audit) |
| GET | `/rankings/units` | امتیاز تجمیعی واحد |
| GET | `/export/:widgetId?format=csv\|docx` | خروجی |

## فرمول امتیاز (میانگین وزنی)

تعریف در `backend/report_backend/src/constants/newsAnalyticsScoring.js`

- **پایشگر:** `count×1 + avgPriorityWeight×2 + avgQualityWeight×2`
- **دبیر:** `reviewed×1 + avgApprovedPriority×2 + avgApprovedQuality×2 + speedBonus×1`
- **سردبیر:** `published×1 + avgPriority×2 + avgQuality×2 + speedBonus×1`
- **واحد:** مجموع امتیاز اعضای واحد

## دسترسی (RBAC)

| نقش | دسترسی |
|-----|--------|
| admin, news_chief | همه |
| news_editor, news_monitor | آمار aggregate + رتبه خود (`myRank`) |

## تست

```bash
cd backend/report_backend
npm run test:news-analytics
```

## کش

نتایج آماری ۵ دقیقه in-memory cache می‌شوند (کلید hash فیلترها).
