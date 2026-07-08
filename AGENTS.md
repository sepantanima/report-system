# AGENTS.md

## Cursor Cloud specific instructions

This is a Persian (RTL) organizational field-reporting & news-management platform.
It is a two-part monorepo:

- `backend/report_backend` — Node.js (ESM) + Express + PostgreSQL API. Entry `src/server.js`, run with `npm start` (listens on `PORT`, default `3000`).
- `frontend` — React 19 + Vite 6 SPA. Dev server `npm run dev` (Vite, port `5173`). It proxies `/api` → `http://localhost:3000`, so start the backend first.

### Services

| Service | Dir | Dev command | Port | Notes |
| --- | --- | --- | --- | --- |
| Backend API | `backend/report_backend` | `npm start` | 3000 | Needs PostgreSQL + a `.env` file. No `dev`/hot-reload script — restart `node` after backend edits. |
| Frontend | `frontend` | `npm run dev` | 5173 | Vite dev proxies `/api` to the backend. |
| PostgreSQL | — | system service | 5432 | Not in the repo; must be running locally. |

Optional/feature-only services (not required to run the app): Gotenberg (PDF export), n8n (news ingest/publish), and external AI/LLM providers configured at runtime via the admin UI.

### Database setup (one-time, NOT in the update script)

The repo does **not** contain the full schema — the base tables
(`tbl_users`, `tbl_units`, `tbl_unit_events`, `tbl_news`, `tbl_report_types`)
exist only in production. The numbered files in `backend/report_backend/migrations/`
are ADD-only module migrations that assume those base tables already exist.

For a local dev database:

1. Ensure PostgreSQL is running, then create the role and database (defaults match `.env`):
   ```bash
   sudo -u postgres psql -c "CREATE USER n8n WITH PASSWORD 'n8n' SUPERUSER;"
   sudo -u postgres psql -c 'CREATE DATABASE "Unit_Reports" OWNER n8n;'
   ```
2. Create `backend/report_backend/.env` (gitignored). Minimum:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=n8n
   DB_PASS=n8n
   DB_NAME=Unit_Reports
   PORT=3000
   JWT_SECRET=dev_local_secret_change_me
   PDF_ENGINE=auto
   ```
3. Bootstrap the schema + seed a dev admin:
   ```bash
   bash backend/report_backend/dev/setup_db.sh
   ```
   This applies `dev/dev_base_schema.sql`, runs all migrations in order, and seeds
   an admin (`dev/dev_seed.sql`). Migrations must run in numeric order (some later
   ones `DROP`/recreate earlier tables). Login: `admin` / `admin123`.

The `dev/` bootstrap files are dev-only helpers and are not used in production.

### Known caveats

- `npm run build` (frontend production build) currently fails on a pre-existing,
  case-sensitivity bug: `src/pages/login.jsx` imports `./login.css` but the file is
  `Login.css`. Vite's **dev** server resolves it fine, so `npm run dev` works. This
  is a repo bug, unrelated to environment setup — do not treat it as an env problem.
- `npm run lint` (frontend) reports many pre-existing errors/warnings in the current
  codebase; ESLint itself runs correctly.
- Backend has no automated test framework; `npm run test:news-format` and
  `npm run test:news-analytics` are standalone script checks.
- Backend has no watcher/hot-reload — after changing backend code, restart the
  `node src/server.js` process.
