#!/bin/bash

set -euo pipefail

SERVER="sepanta"
REMOTE_DIR="/var/www/report-system"
BACKEND_DIR="$REMOTE_DIR/backend/report_backend"
NODE_PATH="/home/nima/.nvm/versions/node/v20.20.2/bin"
PM2_APP="report-backend"

echo "---- Pre-flight checks ----"

if [ ! -d "frontend" ]; then
  echo "❌ frontend directory not found. Run this script from project root."
  exit 1
fi

if [ ! -d "backend/report_backend" ]; then
  echo "❌ backend/report_backend directory not found. Run this script from project root."
  exit 1
fi

if [ ! -f "frontend/package.json" ]; then
  echo "❌ frontend/package.json not found."
  exit 1
fi

echo "---- Building frontend ----"
cd frontend
npm install
npm run build
cd ..

# -----------------------------------------------------------------------------
# Server .env backup / restore notes
#
# This deploy script creates a backup of the server backend .env before uploading
# new files. The backup command is:
#
#   cp .env .env.backup.$(date +%F-%H%M%S)
#
# If the server .env gets broken or overwritten later, list available backups:
#
#   ls -lah /var/www/report-system/backend/report_backend/.env.backup.*
#
# Restore one backup manually on the server:
#
#   cd /var/www/report-system/backend/report_backend
#   cp .env.backup.2026-06-21-093000 .env
#   pm2 restart report-backend --update-env
#
# Important:
# - Server DB port must be 5432.
# - Local DB port with SSH tunnel can be 5433.
# - Never copy local .env to the server.
# -----------------------------------------------------------------------------

echo "---- Backing up server .env ----"
ssh "$SERVER" "
  set -e
  cd '$BACKEND_DIR'
  if [ ! -f .env ]; then
    echo '❌ Server .env not found at $BACKEND_DIR/.env'
    exit 1
  fi
  cp .env .env.backup.\$(date +%F-%H%M%S)
  echo '✅ Server .env backup created'
"

echo "---- Uploading files to server ----"
rsync -avz --timeout=60 --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'backend/report_backend/.env' \
  --exclude 'backend/report_backend/.env.*' \
  --exclude 'frontend/.env' \
  --exclude 'frontend/.env.*' \
  --exclude 'backend/report_backend/node_modules' \
  --exclude 'backend/report_backend/uploads' \
  --exclude 'backend/report_backend/logs' \
  --exclude 'backend/report_backend/storage' \
  --exclude 'backend/report_backend/tmp' \
  ./ "$SERVER:$REMOTE_DIR/"

echo "---- Verifying server .env after upload ----"
ssh "$SERVER" "
  set -e
  cd '$BACKEND_DIR'

  if [ ! -f .env ]; then
    echo '❌ Server .env was removed. Restore from backup before restarting.'
    exit 1
  fi

  echo 'Current DB config on server:'
  grep -E '^(DB_HOST|DB_PORT|DATABASE_URL)=' .env || true

  if grep -q 'DB_PORT=5433' .env; then
    echo '❌ Wrong DB_PORT=5433 found on server. Server must use 5432.'
    exit 1
  fi

  if grep -q '62.60.128.116:5432' .env; then
    echo '❌ Public DB host found in .env. Server must use 127.0.0.1:5432.'
    exit 1
  fi

  if grep -qE '^GOTENBERG_URL=' .env; then
    echo 'PDF Gotenberg:'
    grep -E '^GOTENBERG_URL=' .env || true
    if grep -qE 'GOTENBERG_URL=http://gotenberg:' .env; then
      echo '⚠️  Fixing docker hostname in GOTENBERG_URL → http://127.0.0.1:3001'
      sed -i -E 's|^GOTENBERG_URL=http://gotenberg:[0-9]+|GOTENBERG_URL=http://127.0.0.1:3001|' .env
    fi
    if grep -qE 'GOTENBERG_URL=http://127.0.0.1:3000' .env; then
      echo '⚠️  Fixing wrong publish port in GOTENBERG_URL → http://127.0.0.1:3001'
      sed -i 's|^GOTENBERG_URL=http://127.0.0.1:3000|GOTENBERG_URL=http://127.0.0.1:3001|' .env
    fi
  else
    echo '⚠️  GOTENBERG_URL not set — PDF will fail. Add: GOTENBERG_URL=http://127.0.0.1:3001'
  fi

  if grep -qE '^CHROME_EXECUTABLE_PATH=.*\\\\' .env 2>/dev/null || grep -q 'CHROME_EXECUTABLE_PATH=C:' .env 2>/dev/null; then
    echo '⚠️  Windows CHROME_EXECUTABLE_PATH in server .env — remove or comment it; use GOTENBERG_URL instead'
  fi

  echo '✅ Server .env looks safe'
"

echo "---- Updating backend dependencies and restarting PM2 ----"
ssh "$SERVER" "
  set -e
  export PATH='$NODE_PATH':\$PATH

  cd '$BACKEND_DIR'

  npm install --omit=dev

  pm2 restart '$PM2_APP' --update-env

  sleep 3

  pm2 status '$PM2_APP'
"

echo "---- Checking recent backend logs ----"
ssh "$SERVER" "
  export PATH='$NODE_PATH':\$PATH
  pm2 logs '$PM2_APP' --lines 40 --nostream
"

echo "✅ Deploy finished successfully"
echo ""
echo "Important:"
echo "- Server backend DB must use 127.0.0.1:5432"
echo "- Local backend with SSH tunnel can use 127.0.0.1:5433"
echo "- Frontend production should use VITE_API_URL=/api, not localhost"
echo "- PDF on server: set GOTENBERG_URL=http://127.0.0.1:PORT in server .env (not docker hostname gotenberg)"
echo "  then: pm2 restart report-backend --update-env"
echo "- Migrations: run manually on server when needed (see backend/report_backend/package.json scripts)"
