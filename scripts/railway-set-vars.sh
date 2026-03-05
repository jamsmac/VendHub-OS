#!/bin/bash
# =============================================================================
# VendHub OS — Set Railway Variables for API service
# Railway CLI v4 syntax (--set flag instead of 'set' subcommand)
#
# Run this on your Mac from the VendHub OS project root:
#   chmod +x scripts/railway-set-vars.sh
#   ./scripts/railway-set-vars.sh
# =============================================================================
set -e

SERVICE="@vendhub/api"
ENV="production"

echo "🚀 Setting Railway Variables for service: $SERVICE ($ENV)"
echo ""

# --- Database (Supabase) ---
echo "📦 [1/6] Database..."
railway variables \
  --set "DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com" \
  --set "DB_PORT=6543" \
  --set "DB_NAME=postgres" \
  --set "DB_USER=postgres.qfeqgupijqgcazfilfah" \
  --set "DB_PASSWORD=Vhl9ofV9Ef7GOewj" \
  --set "DATABASE_URL=postgresql://postgres.qfeqgupijqgcazfilfah:Vhl9ofV9Ef7GOewj@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  --set "DATABASE_DIRECT_URL=postgresql://postgres:Vhl9ofV9Ef7GOewj@db.qfeqgupijqgcazfilfah.supabase.co:5432/postgres" \
  --service "$SERVICE" --environment "$ENV"

# --- Redis ---
echo "📦 [2/6] Redis..."
railway variables \
  --set "REDIS_HOST=redis.railway.internal" \
  --set "REDIS_PORT=6379" \
  --set "REDIS_PASSWORD=gWQddoaowhHvWQqfTFauXhPqVHrkIwnX" \
  --set "REDIS_URL=redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379" \
  --service "$SERVICE" --environment "$ENV"

# --- Supabase ---
echo "📦 [3/6] Supabase..."
railway variables \
  --set "SUPABASE_URL=https://qfeqgupijqgcazfilfah.supabase.co" \
  --set "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZXFndXBpanFnY2F6ZmlsZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjc2NTAsImV4cCI6MjA4Nzk0MzY1MH0.uF4WRM8-RglYbYDandZ3bE3bAowr2VufbI-cavCMKo8" \
  --set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZXFndXBpanFnY2F6ZmlsZmFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM2NzY1MCwiZXhwIjoyMDg3OTQzNjUwfQ.ua5PxnVkUwXzF1zWB1QzRvE6jPDTEALiYqCGxo2AJtg" \
  --set "SUPABASE_PUBLISHABLE_KEY=sb_publishable_fxhrXYdPnWxeUXspeco0Lw_rWUnO1Ek" \
  --set "SUPABASE_SECRET_KEY=sb_secret_vOTHDnh071PG701vh-kkTw_q71AjUtY" \
  --service "$SERVICE" --environment "$ENV"

# --- Storage (Supabase S3) ---
echo "📦 [4/6] Storage..."
railway variables \
  --set "STORAGE_ENDPOINT=https://qfeqgupijqgcazfilfah.supabase.co/storage/v1/s3" \
  --set "STORAGE_BUCKET=vendhub-media" \
  --set "STORAGE_REGION=ap-southeast-1" \
  --set "STORAGE_ACCESS_KEY=d97bd7785b83681e4179bcf3ef7df9b3" \
  --set "STORAGE_SECRET_KEY=e813f2da15425b173c5a8d35bdd192379226364462e2b6c1ad934742888c2656" \
  --set "S3_ACCESS_KEY=d97bd7785b83681e4179bcf3ef7df9b3" \
  --set "S3_SECRET_KEY=e813f2da15425b173c5a8d35bdd192379226364462e2b6c1ad934742888c2656" \
  --set "S3_CDN_URL=https://qfeqgupijqgcazfilfah.supabase.co/storage/v1/object/public/vendhub-media" \
  --service "$SERVICE" --environment "$ENV"

# --- JWT / Auth ---
echo "📦 [5/6] JWT & Auth..."
railway variables \
  --set "JWT_SECRET=LWE3U8dXiAXhu1icNVI5mwZA/fH8NyT8ZidK11f2uVvCKM1m5xs+oANmQz+qKDGJHbZMC57RQlUwPjM9nWsz2A==" \
  --set "JWT_REFRESH_SECRET=RbFaf1MMVjEhygv5Aib3YW/wbtPYasrgkjo0XrfBiUcM+Tni++dmnVnO9lJH5B8hPZgo0AHF6Ue5gpds9Tjkdg==" \
  --set "JWT_EXPIRES_IN=15m" \
  --set "JWT_REFRESH_EXPIRES_IN=7d" \
  --set "COOKIE_SECRET=m+C5wjEIgg0C9bnSXHuyOq8UoZONhl6Dcj44gFPkE8Xk3UbPe+4hHTij74NT5CWsfVNYrG+Swx/jLje1Nsk9ZA==" \
  --service "$SERVICE" --environment "$ENV"

# --- Telegram Bots ---
echo "📦 [6/7] Telegram Bots..."
railway variables \
  --set "TELEGRAM_BOT_TOKEN=8027475477:AAF_L3HumV--gena4K98dOor6rLDv1ujlhU" \
  --set "TELEGRAM_CUSTOMER_BOT_TOKEN=7863841947:AAGyxJ1gDvKGxSg_XFpP90ZrYhBi5XjapAQ" \
  --service "$SERVICE" --environment "$ENV"
# @vendhub24bot   → staff (operators, managers, warehouse, admin, investors)
# @vendhubbot     → customers (balance, app link, complaints, payments)

# --- App Config ---
echo "📦 [7/7] App Config..."
railway variables \
  --set "NODE_ENV=production" \
  --set "PORT=4000" \
  --set "API_PREFIX=api/v1" \
  --set "APP_URL=https://api.vendhub.uz" \
  --set "FRONTEND_URL=https://admin.vendhub.uz" \
  --set "CLIENT_URL=https://app.vendhub.uz" \
  --service "$SERVICE" --environment "$ENV"

echo ""
echo "✅ All variables set for Railway service: $SERVICE ($ENV)"
echo "🎯 Next: git push origin main → CI/CD will deploy automatically"
