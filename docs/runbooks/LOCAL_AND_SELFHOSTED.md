# 🖥️ Локальный запуск + деплой на свой сервер

Альтернатива Railway. Сначала запускаешь у себя на ноутбуке через Docker, тестируешь, потом теми же командами разворачиваешь на VDS-сервере.

**Время:**

- Локальный запуск: 30 минут
- Деплой на сервер: 2-3 часа (включая SSL, бэкапы, мониторинг)

---

## Часть A — Локальный запуск (на твоём компьютере)

### A1. Что нужно установить

```bash
# Docker Desktop (для macOS / Windows)
# https://www.docker.com/products/docker-desktop

# Или Docker Engine (для Linux)
# https://docs.docker.com/engine/install/

# Проверить:
docker --version          # должен быть 24.0+
docker compose version    # должен быть 2.20+

# Node.js 20 (для запуска без Docker, опционально)
node --version            # >=20.11 <25

# pnpm 9 (опционально)
pnpm --version            # 9.x
```

Если что-то не установлено — гугл «install docker macos» и т.д. На macOS проще всего через Docker Desktop. На Linux — родной apt/dnf.

### A2. Клонировать репо

```bash
git clone https://github.com/<your-org>/VendHub-OS.git ~/VendHub-OS
cd ~/VendHub-OS
git status   # должно показывать "main"
```

### A3. Подготовить .env

В репо уже есть `.env.docker` для локального запуска. Не нужно ничего генерить — секреты там dummy для локалки.

```bash
# Просто посмотри что там
cat .env.docker
```

Если хочешь добавить настоящий Telegram-бот для тестов:

```bash
# Создать .env.local на основе .env.docker
cp .env.docker .env.local

# Открыть и заменить:
# TELEGRAM_BOT_TOKEN=placeholder → твой реальный токен от @BotFather
nano .env.local
```

### A4. Запустить всё

**Простой путь — через готовый скрипт:**

```bash
bash scripts/quick-start.sh
```

Этот скрипт сам:

1. Проверит что Docker установлен
2. Накатит миграции
3. Поднимет все контейнеры

**Или вручную через Docker Compose:**

```bash
# Поднять все сервисы
docker compose --env-file .env.docker up -d

# Watch логи
docker compose logs -f

# Только конкретный сервис
docker compose logs -f api
```

### A5. Что должно стартовать

После `docker compose up`:

| Сервис                 | Порт              | URL                                |
| ---------------------- | ----------------- | ---------------------------------- |
| Postgres               | 5432              | (внутренний)                       |
| Redis                  | 6379              | (внутренний)                       |
| MinIO (S3-storage)     | 9000 / 9001       | http://localhost:9001 (admin)      |
| API (NestJS)           | 4000              | http://localhost:4000              |
| Web (Next.js админка)  | 3000              | http://localhost:3000              |
| Client (Vite Mini App) | 5173              | http://localhost:5173              |
| Site (маркетинг)       | 3100              | http://localhost:3100              |
| Adminer (DB UI)        | 8080              | http://localhost:8080              |
| Redis Commander        | 8081              | http://localhost:8081              |
| Bull-board (queues UI) | 4000/admin/queues | http://localhost:4000/admin/queues |
| Nginx (proxy)          | 80 / 443          | http://localhost                   |

Проверь что api работает:

```bash
curl http://localhost:4000/api/v1/health
# {"status":"ok","timestamp":"..."}

curl http://localhost:4000/api/v1/health/ready
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

### A6. Smoke-тест

```bash
bash scripts/smoke-test-local.sh
```

Скрипт:

1. Проверяет что api и web живы
2. Запускает Playwright тест predictive-refill против localhost
3. Сообщает результат

### A7. Открыть в браузере

- Админка: <http://localhost:3000>
- Mini App: <http://localhost:5173>
- DB Adminer: <http://localhost:8080> (server: postgres, user: vendhub, pass: vendhub_local_dev, db: vendhub)
- Bull-board: <http://localhost:4000/admin/queues>

### A8. Залить тестовые данные (опционально)

```bash
# Если есть seed-скрипт
pnpm --filter @vendhub/api db:seed

# Или импорт из Supabase (если данные там)
ts-node scripts/seed-all-from-supabase.ts
```

### A9. Остановить

```bash
docker compose down

# Если хочешь стереть данные БД и начать заново
docker compose down -v
```

---

## Часть B — Подготовить свой сервер

### B1. Требования к серверу

**Минимум для пилота (23 машины + до 1000 клиентов):**

- 4 vCPU, 8 GB RAM, 40 GB SSD
- Ubuntu 22.04 LTS (или Debian 12, или другой современный Linux)
- Открытые порты: 22 (SSH), 80, 443

**Хороший VPS для этой задачи (~$15-30/мес):**

- Hetzner CX22 (€4.5) — на старт точно хватит
- DigitalOcean Droplet 4GB ($24)
- Linode 4GB ($30)
- Yandex Cloud / Selectel (если важно «в РФ»)
- Любой узбекский хостинг

**Не подходит:**

- < 4 GB RAM — Docker Compose со всеми сервисами не влезет
- shared hosting без Docker
- бесплатные tier'ы — нет SLA

### B2. Первая настройка сервера

После того как создал VPS, заходишь по SSH:

```bash
ssh root@<server-ip>

# 1. Обновления
apt update && apt upgrade -y

# 2. Установка Docker
curl -fsSL https://get.docker.com | bash

# 3. Установка docker compose plugin
apt install -y docker-compose-plugin

# 4. Создать non-root пользователя
adduser vendhub
usermod -aG docker vendhub
usermod -aG sudo vendhub

# 5. Настроить SSH-ключ
mkdir -p /home/vendhub/.ssh
cp ~/.ssh/authorized_keys /home/vendhub/.ssh/
chown -R vendhub:vendhub /home/vendhub/.ssh
chmod 700 /home/vendhub/.ssh
chmod 600 /home/vendhub/.ssh/authorized_keys

# 6. Запретить root-логин по SSH
sed -i 's/^#*PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# 7. Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Выйти и зайти как vendhub
exit
ssh vendhub@<server-ip>
```

### B3. Клонировать репо на сервер

```bash
ssh vendhub@<server-ip>

cd ~
git clone https://github.com/<your-org>/VendHub-OS.git
cd VendHub-OS
```

Если репо приватный — настроить SSH-deploy-key или использовать GitHub PAT.

### B4. Сгенерить production secrets

На своём ноутбуке (НЕ на сервере):

```bash
cat <<EOF > /tmp/vendhub-prod-secrets.env
NODE_ENV=production
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
COOKIE_SECRET=$(openssl rand -base64 32 | tr -d '\n')
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
METRICS_API_KEY=$(openssl rand -base64 32 | tr -d '\n')
METRICS_TOKEN=$(openssl rand -base64 32 | tr -d '\n')
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 16)
STORAGE_ACCESS_KEY=$(openssl rand -hex 8)
STORAGE_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')
EOF

# Сохрани файл в надёжное место (1Password, и т.д.)
cat /tmp/vendhub-prod-secrets.env
```

Потом scp/rsync на сервер:

```bash
scp /tmp/vendhub-prod-secrets.env vendhub@<server-ip>:~/VendHub-OS/.env.production
```

На сервере доделать `.env.production` — добавить TELEGRAM*BOT_TOKEN, PAYME*_, CLICK\__, UZUM*\*, SOLIQ*\*, SENTRY_DSN — всё что в `ENV_VARIABLES.md`.

```bash
ssh vendhub@<server-ip>
cd ~/VendHub-OS
nano .env.production
# Добавить остальные секреты
chmod 600 .env.production   # только владелец читает
```

### B5. Запустить production stack

```bash
cd ~/VendHub-OS

# Pull images, build apps, start
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Watch логи
docker compose -f docker-compose.prod.yml logs -f
```

При первом запуске собираются Docker-образы — это займёт 5-15 минут.

### B6. SSL / HTTPS через Caddy (рекомендуется)

В `docker-compose.prod.yml` есть nginx — можно его использовать. Но проще всего **Caddy** — он сам получает Let's Encrypt сертификат.

Создать `~/VendHub-OS/Caddyfile`:

```
# api.vendhub.uz отдаёт api на 4000
api.vendhub.uz {
    reverse_proxy localhost:4000
}

# app.vendhub.uz — админка
app.vendhub.uz {
    reverse_proxy localhost:3000
}

# m.vendhub.uz — Telegram Mini App
m.vendhub.uz {
    reverse_proxy localhost:5173
}

# vendhub.uz — маркетинг сайт
vendhub.uz, www.vendhub.uz {
    reverse_proxy localhost:3100
}
```

Запустить Caddy в Docker:

```bash
docker run -d \
  --name caddy \
  --restart unless-stopped \
  --network host \
  -v ~/VendHub-OS/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:latest
```

DNS — у твоего регистратора домена создать A-записи:

- `api.vendhub.uz` → IP сервера
- `app.vendhub.uz` → IP сервера
- `m.vendhub.uz` → IP сервера
- `vendhub.uz` → IP сервера

Caddy сам получит SSL за 1-2 минуты.

### B7. Бэкапы БД

В `docker-compose.yml` уже есть сервис `db-backup`. Включить его и в prod:

```bash
# Создать backup-cron
mkdir -p ~/backups

# Скрипт бэкапа
cat > ~/VendHub-OS/scripts/backup-prod-db.sh << 'EOF'
#!/bin/bash
set -e
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups"

docker exec vendhub-postgres pg_dump -U vendhub vendhub | gzip > "$BACKUP_DIR/vendhub-$TIMESTAMP.sql.gz"

# Удалить бэкапы старше 30 дней
find "$BACKUP_DIR" -name "vendhub-*.sql.gz" -mtime +30 -delete

echo "✓ Backup: $BACKUP_DIR/vendhub-$TIMESTAMP.sql.gz"
EOF

chmod +x ~/VendHub-OS/scripts/backup-prod-db.sh

# Добавить в crontab — каждый день в 2 часа ночи
(crontab -l 2>/dev/null; echo "0 2 * * * /home/vendhub/VendHub-OS/scripts/backup-prod-db.sh >> /home/vendhub/backups/cron.log 2>&1") | crontab -

# Проверить
crontab -l
```

**Дополнительно — копировать бэкапы на S3 / Backblaze:**

```bash
# Установить rclone
curl https://rclone.org/install.sh | sudo bash

# Настроить — следовать визарду
rclone config

# Дополнить backup-prod-db.sh:
# rclone copy ~/backups/vendhub-$TIMESTAMP.sql.gz remote:vendhub-backups/
```

### B8. Мониторинг

Минимальный setup:

**Uptime monitoring** через бесплатные сервисы:

- UptimeRobot (бесплатно, 50 мониторов): https://uptimerobot.com
- Better Stack (5 мониторов бесплатно)

Настроить ping каждой 5 минут на:

- https://api.vendhub.uz/api/v1/health
- https://app.vendhub.uz
- https://m.vendhub.uz

**Алерты** на Telegram-бот через @BotFather → создать второй бот для алертов.

**Sentry** — уже интегрирован в код, нужен только DSN в `.env.production`.

**Логи в файл:**

```bash
# Docker автоматически пишет логи в JSON-файлы в /var/lib/docker/containers/
# Чтобы не разрослись — настроить ротацию

cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

---

## Часть C — Smoke-тест на сервере

После деплоя:

```bash
# Health
curl https://api.vendhub.uz/api/v1/health
curl https://api.vendhub.uz/api/v1/health/ready

# Metrics с токеном
curl "https://api.vendhub.uz/metrics?token=$METRICS_TOKEN" | head -10

# Через CLI логин
curl -X POST https://api.vendhub.uz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"jamshid@vendhub.uz","password":"..."}'

curl https://api.vendhub.uz/api/v1/auth/me -b cookies.txt
```

В браузере:

1. https://app.vendhub.uz — админка, залогиниться, увидеть 23 машины
2. https://m.vendhub.uz — Telegram Mini App (через бота, не напрямую)
3. https://api.vendhub.uz/api/docs — Swagger UI

---

## Часть D — Регулярные операции

### Обновить код

```bash
ssh vendhub@<server-ip>
cd ~/VendHub-OS

git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Watch — если миграции
docker compose -f docker-compose.prod.yml logs -f api
```

### Откатиться

```bash
git log --oneline -5
git checkout <prev-good-commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Остановить всё

```bash
docker compose -f docker-compose.prod.yml down
```

### Логи конкретного сервиса

```bash
docker compose -f docker-compose.prod.yml logs -f api --tail=200
```

### Войти внутрь контейнера для отладки

```bash
docker exec -it vendhub-api sh
docker exec -it vendhub-postgres psql -U vendhub vendhub
```

### Restore из бэкапа

```bash
gunzip < ~/backups/vendhub-20260429-020000.sql.gz | docker exec -i vendhub-postgres psql -U vendhub vendhub
```

---

## Часть E — Сравнение Railway vs Self-hosted

| Аспект      | Railway            | Self-hosted (VDS)               |
| ----------- | ------------------ | ------------------------------- |
| Цена        | ~$20/мес Pro       | $5-30/мес VDS                   |
| Setup time  | 30 мин             | 2-3 часа первый раз             |
| Maintenance | Railway делает     | Ты (updates, backups, security) |
| SSL         | автоматически      | Caddy (легко) или certbot       |
| Backups     | Railway бэкапит БД | Ты сам через cron               |
| Monitoring  | Railway dashboard  | UptimeRobot / Sentry / свой     |
| Откат       | Railway UI         | git revert + redeploy           |
| Скорость    | хорошая            | зависит от региона VDS          |
| Контроль    | средний            | полный                          |
| Lock-in     | средний            | нулевой                         |

**Когда Railway лучше:**

- Нет времени на DevOps
- Команда не любит Linux
- Готов платить за удобство

**Когда self-hosted лучше:**

- Хочешь полный контроль
- Заботишься о Lock-in
- Нужен низкий пинг для Узбекистана (можно поставить в DC в Ташкенте)
- Хочешь экономить (от $5/мес)

---

## Что важно знать

1. **На локалке всё уже работает.** Если `docker compose up` поднимается — твой код в порядке.
2. **Миграции БД накатываются автоматически** при старте api (в `.env.docker` стоит `DB_MIGRATIONS_RUN=true`). На проде нужно решить: автомиграции или ручные через `releaseCommand`.
3. **Главная сложность self-hosted — SSL и бэкапы.** Caddy решает SSL за 5 минут. Бэкапы решает cron + rclone.
4. **Ноутбук != сервер по нагрузке.** Локально ты не увидишь проблем с памятью или диском. На сервере следи за `df -h` и `free -m`.
5. **Disaster recovery план:** что делать если сервер упал и не поднимается. Минимум — 7 дней бэкапов на S3.

---

## Связанные документы

- `docs/audits/MASTER.html` — полный аудит проекта
- `docs/runbooks/ENV_VARIABLES.md` — список env-переменных
- `docs/runbooks/LAUNCH_CHECKLIST.md` — Railway-вариант (для сравнения)
- `docs/runbooks/rollback.md` — детальный playbook отката
- `docker-compose.yml` — dev-конфиг
- `docker-compose.prod.yml` — production-конфиг
- `scripts/quick-start.sh` — local launcher
- `scripts/smoke-test-local.sh` — local smoke test
