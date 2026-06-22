# پروکسی `/api` برای فرانت‌اند (پروداکشن)

بعد از تغییر `baseURL` به `"/api"`، مرورگر فقط به **همان دامنه** که سایت روی آن است درخواست می‌زند. nginx باید مسیر `/api` را به بک‌اند Node (مثلاً پورت 3000) بفرستد.

## نمونه server برای report.sepanta.org

```nginx
server {
    listen 80;
    server_name report.sepanta.org;

    root /var/www/report-system/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
        send_timeout 180s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

سپس: `sudo nginx -t && sudo systemctl reload nginx`

## موقت (بدون nginx)

در `frontend` فایل `.env.production` بسازید:

```env
VITE_API_BASE_URL=http://62.60.128.116:3000/api
```

بعد `npm run build` و دیپلوی.
