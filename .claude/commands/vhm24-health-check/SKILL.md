---
name: vhm24-health-check
description: "VendHub Health Check - диагностика и мониторинг работоспособности сервисов.\nDocker, PostgreSQL, Redis, API, Web, Client, Bot проверки.\nИспользовать при проблемах с запуском, падении сервисов, диагностике ошибок."
---

# VendHub Health Check Skill

## Когда использовать

- Сервис не запускается или не отвечает
- После обновления зависимостей или конфигурации
- Перед деплоем — проверка готовности
- Диагностика production issues
- Плановая проверка здоровья системы

## Быстрая диагностика

### 1. Docker сервисы

```bash
cd vendhub-unified && docker compose ps
docker compose logs --tail=30 [service-name]
```

| Сервис   | Порт | Проверка                                                |
| -------- | ---- | ------------------------------------------------------- |
| postgres | 5432 | `pg_isready -h localhost -p 5432`                       |
| redis    | 6379 | `redis-cli ping`                                        |
| api      | 4000 | `curl -s localhost:4000/api/v1/health`                  |
| web      | 3000 | `curl -s -o /dev/null -w "%{http_code}" localhost:3000` |
| client   | 5173 | `curl -s -o /dev/null -w "%{http_code}" localhost:5173` |
| site     | 3100 | `curl -s -o /dev/null -w "%{http_code}" localhost:3100` |

### 2. TypeScript компиляция

```bash
cd vendhub-unified
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/client/tsconfig.json
npx tsc --noEmit -p apps/bot/tsconfig.json
```

### 3. Зависимости

```bash
pnpm install --frozen-lockfile
pnpm audit --prod
```

## Типичные проблемы и решения

### API не запускается

```
Симптом: "Connection refused" на порту 4000
Причины:
  1. PostgreSQL не запущен → docker compose up postgres
  2. Ошибка в .env → проверить DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
  3. Миграции не выполнены → cd apps/api && npm run migration:run
  4. Порт занят → lsof -i :4000 && kill PID
  5. TS ошибки → npx tsc --noEmit -p apps/api/tsconfig.json
```

### Web/Client не компилируется

```
Симптом: Build fails
Причины:
  1. Отсутствуют node_modules → pnpm install
  2. Кеш Turbo/Next → rm -rf .turbo .next apps/web/.next
  3. TS ошибки → npx tsc --noEmit
  4. Версия Node.js → node --version (нужна 18+)
```

### Redis не подключается

```
Симптом: ECONNREFUSED на 6379
Причины:
  1. Redis не запущен → docker compose up redis
  2. Пароль в .env не совпадает с docker-compose
  3. Redis занят другим процессом → redis-cli shutdown
```

### TypeORM ошибки

```
Симптом: "relation does not exist" или "column does not exist"
Причины:
  1. Миграции не выполнены → npm run migration:run
  2. Entity не в пути → проверить typeorm.config.ts entities glob
  3. Новые поля без миграции → npm run migration:generate -- -n AddFields
```

## Мониторинг stack (если развёрнут)

```bash
# Prometheus
curl localhost:9090/-/healthy

# Grafana
curl localhost:3001/api/health

# Loki
curl localhost:3100/ready

# Запуск мониторинга
cd infrastructure/monitoring && docker compose -f docker-compose.monitoring.yml up -d
```

## Связанные инструменты

- **Agent**: `health-check` — автоматическая диагностика
- **Agent**: `build-verifier` — проверка компиляции
- **Skill**: `vhm24-devops` — Docker, K8s, CI/CD
- **Skill**: `vhm24-monitoring` — Prometheus, Grafana, логи
