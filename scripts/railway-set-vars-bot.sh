#!/bin/bash
# =============================================================================
# VendHub OS — Set Railway Variables for BOT service (DEPRECATED)
#
# ⚠️  DEPRECATED — This standalone bot service is no longer the primary bot.
#
# The two-bot architecture has been moved INTO the API service:
#   • @vendhub24bot (staff)   → TELEGRAM_BOT_TOKEN          in @vendhub/api
#   • @vendhubbot   (customers) → TELEGRAM_CUSTOMER_BOT_TOKEN in @vendhub/api
#
# To set those tokens, run: scripts/railway-set-vars.sh
#
# This script is kept for reference only. The Railway `bot` service can be
# disabled or removed once the API service is confirmed stable in production.
#
# If you still need to run the standalone bot for legacy reasons:
#   1. Get your TELEGRAM_BOT_TOKEN from @BotFather on Telegram
#      → /newbot  (or /mybots to retrieve existing token)
#   2. Edit this script and replace REPLACE_WITH_YOUR_BOT_TOKEN below
#   3. Optionally generate a BOT_API_TOKEN (see notes at the bottom)
#
# Run this on your Mac from the VendHub OS project root:
#   chmod +x scripts/railway-set-vars-bot.sh
#   ./scripts/railway-set-vars-bot.sh
# =============================================================================
set -e

SERVICE="bot"
ENV="production"

echo "🤖 Setting Railway Variables for service: $SERVICE ($ENV)"
echo ""

# --- Telegram ---
echo "📦 [1/3] Telegram..."
railway variables \
  --set "TELEGRAM_BOT_TOKEN=REPLACE_WITH_YOUR_BOT_TOKEN" \
  --service "$SERVICE" --environment "$ENV"

# --- API & Redis ---
echo "📦 [2/3] API & Redis..."
railway variables \
  --set "API_URL=https://api.vendhub.uz" \
  --set "REDIS_URL=redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379" \
  --service "$SERVICE" --environment "$ENV"

# --- App Config ---
echo "📦 [3/3] App config..."
railway variables \
  --set "NODE_ENV=production" \
  --set "PORT=3001" \
  --set "MINI_APP_URL=https://app.vendhub.uz" \
  --service "$SERVICE" --environment "$ENV"

# --- Optional: Webhook (recommended for production) ---
# Uncomment if you have a dedicated webhook URL (Telegram requires HTTPS):
#
# railway variables \
#   --set "WEBHOOK_DOMAIN=https://bot.vendhub.uz" \
#   --set "WEBHOOK_PATH=/webhook" \
#   --set "WEBHOOK_SECRET=$(openssl rand -hex 32)" \
#   --service "$SERVICE" --environment "$ENV"

# --- Optional: BOT_API_TOKEN ---
# The bot works without this (API calls are skipped gracefully).
# To enable full API integration, create a bot service account user via the
# admin panel → Users, then generate a long-lived token.
#
# NOTE: Standard JWTs expire in 15 minutes — not suitable here.
# You need a service account with a long-lived token (JWT_EXPIRES_IN=365d)
# or implement a token-refresh flow in the bot's api.ts.
#
# Once you have a token:
# railway variables \
#   --set "BOT_API_TOKEN=<long-lived-service-account-jwt>" \
#   --service "$SERVICE" --environment "$ENV"

echo ""
echo "✅ Bot variables set!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. If you used the placeholder token, update TELEGRAM_BOT_TOKEN in"
echo "      Railway dashboard → bot service → Variables"
echo "   2. Deploy: railway up --service bot"
echo "   3. Verify: railway logs --service bot"
