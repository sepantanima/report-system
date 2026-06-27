# PDF / Gotenberg (سرور production)

Backend با **PM2 روی host** اجرا می‌شود (نه داخل شبکه Docker n8n).

## تنظیم `.env` روی سرور

```env
# آدرس publish‌شده Gotenberg روی همان سرور — نه hostname داخلی docker
GOTENBERG_URL=http://127.0.0.1:3001
PDF_ENGINE=auto
```

اگر Gotenberg فقط داخل docker-compose با نام `gotenberg` در دسترس است، از **host** باید به پورت map‌شده وصل شوید:

```bash
docker ps | grep -i gotenberg
# مثلاً 0.0.0.0:3000->3000/tcp  →  GOTENBERG_URL=http://127.0.0.1:3000
```

## بعد از تغییر

```bash
cd /var/www/report-system/backend/report_backend
pm2 restart report-backend --update-env
pm2 logs report-backend --lines 20
```

در لاگ باید ببینید:

```
[pdf] engine=auto gotenberg=http://127.0.0.1:3000 chrome=missing
```

## تست API (با توکن)

`GET /api/news/reports/pdf-engine`

پاسخ نمونه:

```json
{
  "gotenberg_configured": true,
  "gotenberg_reachable": true,
  "chrome_available": false
}
```
