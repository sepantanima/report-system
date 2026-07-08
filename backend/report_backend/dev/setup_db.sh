#!/usr/bin/env bash
# Dev-only helper: bootstrap a local PostgreSQL database for this app.
#
# In production the base tables already exist and only the numbered migrations
# are applied. Locally there is no full schema in the repo, so this script:
#   1) creates the base tables (dev/dev_base_schema.sql)
#   2) runs every migration in migrations/ in numeric order
#   3) seeds a dev admin user + unit (dev/dev_seed.sql)
#
# Requires the `psql` client and a running PostgreSQL with the database + role
# already created (see AGENTS.md). Reads connection info from env vars, with
# defaults matching backend/report_backend/.env.
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-n8n}"
DB_PASS="${DB_PASS:-n8n}"
DB_NAME="${DB_NAME:-Unit_Reports}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export PGPASSWORD="$DB_PASS"
PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)

echo "==> Base schema"
"${PSQL[@]}" -f "$HERE/dev_base_schema.sql"

echo "==> Migrations"
for f in $(ls "$ROOT"/migrations/*.sql | sort); do
  echo "    - $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

echo "==> Seed"
"${PSQL[@]}" -f "$HERE/dev_seed.sql"

echo "==> Done. Admin login: admin / admin123"
