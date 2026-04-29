# 🚀 Запуск пилота на Railway — практический чек-лист

> Этот файл создан 2026-04-29 как companion к `docs/audits/MASTER.html` секция E.
> Все команды можно копировать и выполнять в терминале или Railway UI.

---

## 0. Pre-flight (5 минут)

Прежде чем что-то делать — убедиться что у тебя всё на руках.

```bash
# Установлен Railway CLI
railway --version || npm i -g @railway/cli

# Залогинен
railway whoami

# Если не залогинен:
railway login
```

**Где взять секреты для интеграций:**

- `TELEGRAM_BOT_TOKEN` — от @BotFather в Telegram (`/mybots → выбрать бота → API Token`)
- `PAYME_MERCHANT_ID` + `PAYME_SECRET_KEY` — кабинет Payme business (`merchant.payme.uz`)
- `CLICK_MERCHANT_ID` + `CLICK_SERVICE_ID` + `CLICK_SECRET_KEY` — кабинет Click (`partner.click.uz`)
- `UZUM_MERCHANT_ID` + `UZUM_SECRET_KEY` — кабинет Uzum
- `SENTRY_DSN` — создать проект на `sentry.io`, по проекту на каждый сервис
- Soliq.uz / Multikassa credentials — из договора с фискальным оператором

---

## 1. Сгенерить все секреты одной командой

Скопируй и выполни в терминале:

```bash
cat <<'EOF' > /tmp/vendhub-secrets.txt
# ====================================
# СЕКРЕТЫ VENDHUB OS — НЕ КОММИТИТЬ
# Сгенерировано: $(date)
# ====================================

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
COOKIE_SECRET=$(openssl rand -base64 32 | tr -d '\n')
METRICS_API_KEY=$(openssl rand -base64 32 | tr -d '\n')
METRICS_TOKEN=$(openssl rand -base64 32 | tr -d '\n')
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 16)
EOF
bash /tmp/vendhub-secrets.txt
cat /tmp/vendhub-secrets.txt
```

Результат — 6 строк со сгенерированными значениями. Сохрани в надёжном месте (1Password / KeePass).

**Не коммить в git!** Эти значения только для прода и должны жить только в Railway env.

---

## 2. Railway — диагностика блокера сначала

Открой в браузере: <https://railway.app/account/usage>

**Что искать:**

- ✗ Plan: **Trial** или **Hobby Free** при упёртом лимите → нужен Pro ($20/мес)
- ✗ Билинг: **Failed payment** / **Card expired** → починить
- ✗ **Project paused** → разпаузить через Settings → Resume

После решения биллинга:

```bash
# Список своих сервисов
railway service

# Manual redeploy api сервиса
railway redeploy --service=vendhubapi-production

# Watch logs
railway logs --service=vendhubapi-production --follow
```

Если за 2 минуты нет лога «Build started» — билинг не решён. Проверить ещё раз.

---

## 3. ENV-переменные по сервисам

### Сервис `vendhubapi-production` — API

В Railway Dashboard → Service vendhubapi-production → **Variables** → **Raw Editor**:

```bash
# === БАЗА ===
NODE_ENV=production
APP_NAME=VendHub
HOST=0.0.0.0
PORT=4000

# === БАЗА ДАННЫХ (Railway PG plugin) ===
# DATABASE_URL пробрасывается автоматически если PG-плагин подключен
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_POOL_SIZE=20
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_MIGRATIONS_RUN=false

# === REDIS (Railway Redis plugin) ===
# REDIS_URL пробрасывается автоматически

# === JWT — ВСТАВИТЬ ИЗ /tmp/vendhub-secrets.txt ===
JWT_SECRET=<вставить из /tmp/vendhub-secrets.txt>
JWT_REFRESH_SECRET=<вставить>
JWT_EXPIRES_IN=15m
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_IN=7d

# === COOKIES — критично для cross-origin web ↔ api ===
COOKIE_SECRET=<вставить из /tmp/vendhub-secrets.txt>
COOKIE_DOMAIN=
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
COOKIE_PATH=/

# === 2FA ===
TOTP_ISSUER=VendHub
TOTP_ALGORITHM=sha1

# === CORS ===
CORS_ORIGINS=https://vendhubweb-production.up.railway.app,https://vendhubclient-production.up.railway.app

# === METRICS — защита /metrics и /monitoring ===
METRICS_API_KEY=<вставить>
METRICS_TOKEN=<вставить>

# === TELEGRAM ===
TELEGRAM_BOT_TOKEN=<от @BotFather>
TELEGRAM_WEBHOOK_URL=https://vendhubapi-production.up.railway.app/telegram-bot/webhook
TELEGRAM_WEBHOOK_SECRET=<вставить>

# === PAYME (test mode сначала) ===
PAYME_MERCHANT_ID=<из кабинета>
PAYME_SECRET_KEY=<из кабинета>
PAYME_TEST_MODE=true

# === CLICK ===
CLICK_MERCHANT_ID=<из кабинета>
CLICK_SERVICE_ID=<из кабинета>
CLICK_SECRET_KEY=<из кабинета>

# === UZUM ===
UZUM_MERCHANT_ID=<из кабинета>
UZUM_SECRET_KEY=<из кабинета>

# === SENTRY ===
SENTRY_DSN=<из sentry.io>
SENTRY_DEV_ENABLED=false

# === GRAFANA (если используешь) ===
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<сгенерить openssl rand -base64 24>

# === RATE LIMIT ===
THROTTLE_LIMIT=60
THROTTLE_TTL=60

# === MISC ===
AGENT_MODE=false
```

### Сервис `vendhubweb-production` — Admin Panel

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://vendhubapi-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://vendhubapi-production.up.railway.app
NEXT_PUBLIC_SENTRY_DSN=<отдельный sentry-проект для web>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<имя бота без @>
```

### Сервис `vendhubclient-production` — Telegram Mini App

```bash
NODE_ENV=production
VITE_API_URL=https://vendhubapi-production.up.railway.app
VITE_WS_URL=wss://vendhubapi-production.up.railway.app
VITE_TELEGRAM_BOT_USERNAME=<имя бота без @>
VITE_SENTRY_DSN=<sentry-проект для client>
```

### Сервис `vendhubsite-production` — маркетинг сайт

```bash
NODE_ENV=production
PORT=3100
NEXT_PUBLIC_SENTRY_DSN=<sentry-проект для site>
```

### Сервис `vendhubbot-production` — Telegram bot

```bash
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<тот же что в api>
API_BASE_URL=https://vendhubapi-production.up.railway.app
TELEGRAM_WEBHOOK_URL=https://vendhubapi-production.up.railway.app/telegram-bot/webhook
TELEGRAM_WEBHOOK_SECRET=<тот же>
```

---

## 4. Backup БД (5 минут)

**Без этого нельзя.** Если миграции что-то сломают — откатиться без backup невозможно.

```bash
# Подключиться к Railway Postgres
railway connect postgres

# Внутри psql выйти: \q
# Дамп через railway run:
railway run --service=vendhubapi-production -- pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql

# Размер
ls -lh backup-*.sql

# Сохранить копию в безопасное место (НЕ коммитить!)
mv backup-*.sql ~/Backups/
```

---

## 5. Применить миграции

В `apps/api/railway.toml` уже настроен `releaseCommand`, который запускает миграции автоматически при следующем deploy. Если api сервис не передеплоен после коммитов с миграциями — просто пнуть его:

```bash
railway redeploy --service=vendhubapi-production
railway logs --service=vendhubapi-production --follow
```

Должны появиться логи вида:

```
Migrations run: N
Migration 1776100000000-PredictiveRefillPhase3 has been executed successfully.
...
```

**Проверить что применились:**

```bash
railway connect postgres
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 10;
\q
```

Должна быть `1776900000000-AddMaintenanceComponentLink` или новее.

**Seed PREDICTED_STOCKOUT alert rules** (если ещё не было):

```bash
railway connect postgres
SELECT COUNT(*) FROM alert_rules WHERE metric = 'predicted_stockout';
```

Если 0 — нужен seed-скрипт. Пнуть в команду — должен быть готовый seed в `apps/api/src/database/seeds/`.

---

## 6. Порядок деплоя

После того как api работает, остальные сервисы можно деплоить параллельно:

```bash
# 1. API уже готов после шага 5

# 2. Bot (зависит от api)
railway redeploy --service=vendhubbot-production

# 3. Web админка
railway redeploy --service=vendhubweb-production

# 4. Client (Telegram Mini App)
railway redeploy --service=vendhubclient-production

# 5. Site (маркетинг — необязательно для пилота)
railway redeploy --service=vendhubsite-production
```

---

## 7. Smoke-тесты (10 минут)

Базовые проверки. Если что-то падает — к секции «Откат» в `docs/audits/MASTER.html` или `docs/runbooks/rollback.md`.

### Health endpoints

```bash
# Замените URL'ы на свои если кастомные домены
API=https://vendhubapi-production.up.railway.app

curl -s $API/api/v1/health | jq
# {"status": "ok", "timestamp": "..."}

curl -s $API/api/v1/health/ready | jq
# {"status": "ok", "info": {"database": {"status": "up"}, "redis": {"status": "up"}}}

curl -s $API/api/v1/health/detailed | jq
# Полная диагностика всех компонентов

# Metrics с токеном
curl -s "$API/metrics?token=$METRICS_TOKEN" | head -20
# Prometheus-формат

# Без токена — должно отбить
curl -s -o /dev/null -w "%{http_code}\n" $API/metrics
# 401
```

### Auth flow

```bash
# Логин (заменить на свои тестовые креды)
curl -X POST $API/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "jamshid@vendhub.uz", "password": "..."}'

# Проверка профиля
curl $API/api/v1/auth/me -b cookies.txt | jq

# Выход
curl -X POST $API/api/v1/auth/logout -b cookies.txt

# /me должен вернуть 401
curl -o /dev/null -w "%{http_code}\n" $API/api/v1/auth/me -b cookies.txt
# 401
```

### Веб админка

В браузере:

1. Открыть `https://vendhubweb-production.up.railway.app`
2. Логин с теми же кредами
3. /dashboard — видны метрики
4. /dashboard/machines — таблица 23 машин
5. Клик на машину — открывается detail page с телеметрией
6. /dashboard/predictive-refill — recommendations

### Telegram Mini App

В Telegram:

1. Открыть бота, нажать «Запустить»
2. Должен открыться Mini App с балансом и историей покупок
3. Кнопки работают, данные загружаются

---

## 8. Мониторинг первых 48 часов

**Что наблюдать:**

```bash
# Real-time логи api
railway logs --service=vendhubapi-production --follow | grep -i "error\|warn"

# Очередь BullMQ — открыть в браузере
# https://vendhubapi-production.up.railway.app/admin/queues

# Sentry — алерты на email
# Настройка: Project → Alerts → Create rule
# Conditions: When event count > 5x baseline within 10 min
```

**Минимум алертов в Sentry/Grafana:**

| Уровень  | Условие                                      |
| -------- | -------------------------------------------- |
| Critical | 5xx на /api/v1/auth/_ или /api/v1/payments/_ |
| Critical | p95 latency > 2 сек                          |
| Warning  | failed payments > 1% от общего числа         |
| Warning  | новый класс ошибок в Sentry                  |
| Info     | очередь BullMQ > 50 задач                    |

---

## 9. Если что-то пошло не так

### Быстрый откат (2 минуты)

```bash
# Через Railway dashboard:
# Service → Deployments → найти последний known-good → "Redeploy"

# Или CLI:
railway deployments --service=vendhubapi-production
railway redeploy --deployment=<id-предыдущего>
```

### Если миграция сломала БД

```bash
# Откатить только последнюю миграцию
railway run --service=vendhubapi-production -- pnpm migration:revert
```

### Если совсем плохо — restore из backup

```bash
railway connect postgres
DROP DATABASE vendhub;  # ⚠ ОПАСНО
CREATE DATABASE vendhub;
\q
psql $DATABASE_URL < ~/Backups/backup-YYYYMMDD-HHMM.sql
```

---

## 10. После запуска — что записать

Через 24 часа после запуска обновить:

- `docs/HANDOFF.md` — что задеплоено, какие версии работают, кто что мониторит
- `docs/audits/MODULE_AUDIT_INDEX.md` — добавить запись «Пилот запущен такого числа»
- Issue в трекере — что нашлось во время первых дней

---

## 11. Чек-лист перед публикацией пилота клиентам

Когда сервисы стабильны 48 часов и smoke-тесты проходят:

- [ ] Railway все 5 сервисов в Running
- [ ] Все health-эндпоинты возвращают 200
- [ ] Один тестовый платёж через Payme sandbox прошёл end-to-end
- [ ] Фискальный чек создан и виден в Soliq
- [ ] Бухгалтер подтвердил доступ к нужным экранам
- [ ] Машина-access настроен — менеджер видит только свои машины
- [ ] Sentry не показывает критические ошибки
- [ ] Backup БД сделан и сохранён
- [ ] Rollback-команды известны (см. секцию 9)
- [ ] Команда знает кому звонить ночью при инциденте

После всех галочек — можно открывать клиентам.

---

**Источник правды для деталей:** [docs/audits/MASTER.html](../audits/MASTER.html), секция E «План выкатки».
