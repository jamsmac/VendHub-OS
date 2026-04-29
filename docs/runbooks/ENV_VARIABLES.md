# ENV-переменные — копипаст в Railway

Чистый файл без narrative — только готовые блоки. Подробности и контекст в `LAUNCH_CHECKLIST.md`.

## 0. Сгенерить секреты

```bash
openssl rand -base64 48 | tr -d '\n'  # JWT_SECRET
openssl rand -base64 48 | tr -d '\n'  # JWT_REFRESH_SECRET
openssl rand -base64 32 | tr -d '\n'  # COOKIE_SECRET
openssl rand -base64 32 | tr -d '\n'  # METRICS_API_KEY
openssl rand -base64 32 | tr -d '\n'  # METRICS_TOKEN
openssl rand -hex 16                  # TELEGRAM_WEBHOOK_SECRET
openssl rand -base64 24 | tr -d '\n'  # GRAFANA_ADMIN_PASSWORD
```

## 1. vendhubapi-production

```env
NODE_ENV=production
APP_NAME=VendHub
HOST=0.0.0.0
PORT=4000

DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_POOL_SIZE=20
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_MIGRATIONS_RUN=false

JWT_SECRET=<gen>
JWT_REFRESH_SECRET=<gen>
JWT_EXPIRES_IN=15m
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECRET=<gen>
COOKIE_DOMAIN=
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
COOKIE_PATH=/

TOTP_ISSUER=VendHub
TOTP_ALGORITHM=sha1

CORS_ORIGINS=https://vendhubweb-production.up.railway.app,https://vendhubclient-production.up.railway.app

METRICS_API_KEY=<gen>
METRICS_TOKEN=<gen>

TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_WEBHOOK_URL=https://vendhubapi-production.up.railway.app/telegram-bot/webhook
TELEGRAM_WEBHOOK_SECRET=<gen>

PAYME_MERCHANT_ID=<from cabinet>
PAYME_SECRET_KEY=<from cabinet>
PAYME_TEST_MODE=true

CLICK_MERCHANT_ID=<from cabinet>
CLICK_SERVICE_ID=<from cabinet>
CLICK_SECRET_KEY=<from cabinet>

UZUM_MERCHANT_ID=<from cabinet>
UZUM_SECRET_KEY=<from cabinet>

SENTRY_DSN=<from sentry.io>
SENTRY_DEV_ENABLED=false

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<gen>

THROTTLE_LIMIT=60
THROTTLE_TTL=60

AGENT_MODE=false
```

## 2. vendhubweb-production

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://vendhubapi-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://vendhubapi-production.up.railway.app
NEXT_PUBLIC_SENTRY_DSN=<separate sentry project for web>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<bot username without @>
```

## 3. vendhubclient-production

```env
NODE_ENV=production
VITE_API_URL=https://vendhubapi-production.up.railway.app
VITE_WS_URL=wss://vendhubapi-production.up.railway.app
VITE_TELEGRAM_BOT_USERNAME=<bot username without @>
VITE_SENTRY_DSN=<separate sentry project for client>
```

## 4. vendhubsite-production

```env
NODE_ENV=production
PORT=3100
NEXT_PUBLIC_SENTRY_DSN=<separate sentry project for site>
```

## 5. vendhubbot-production

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<same as api>
API_BASE_URL=https://vendhubapi-production.up.railway.app
TELEGRAM_WEBHOOK_URL=https://vendhubapi-production.up.railway.app/telegram-bot/webhook
TELEGRAM_WEBHOOK_SECRET=<same as api>
```

## Где взять

- TELEGRAM_BOT_TOKEN — @BotFather → /mybots → token
- PAYME — merchant.payme.uz
- CLICK — partner.click.uz
- UZUM — кабинет Uzum business
- SENTRY_DSN — sentry.io создать project, DSN из Project Settings → Client Keys
- DATABASE_URL, REDIS_URL — пробрасываются автоматически от Railway PG/Redis плагинов

## Пост-деплой проверка

```bash
API=https://vendhubapi-production.up.railway.app
curl -s $API/api/v1/health | jq
curl -s $API/api/v1/health/ready | jq
curl -s "$API/metrics?token=$METRICS_TOKEN" | head -5
```
