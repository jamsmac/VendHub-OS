# 📋 Контекст сессии VendHub OS — для продолжения работы

**Последнее обновление:** 2026-04-29
**Owner:** Jamshid Sadikov (jamshidsmac@gmail.com)
**Repo:** `~/Projects/VendHub-OS/VendHub-OS` (на macOS)
**Branch:** `main`

> Этот файл — точка входа в проект **с любого устройства**. Открой и сразу понимаешь где остановились и что делать дальше. Создан, чтобы продолжать работу с Claude через Cloud / другой компьютер / телефон.

---

## 🚦 Где сейчас остановились

**Этап:** запуск VendHub OS локально через Docker Compose. Хотим убедиться что всё работает у меня на ноутбуке, потом задеплоить на свой VDS-сервер (НЕ Railway).

### Что уже работает локально

| Компонент             | Статус                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Docker Desktop 28.3.3 | ✅ установлен                                                          |
| Docker Compose v2.39  | ✅ работает                                                            |
| Node 20.20            | ✅ установлен                                                          |
| Postgres контейнер    | ✅ healthy                                                             |
| Redis контейнер       | ✅ healthy                                                             |
| MinIO контейнер       | ✅ healthy                                                             |
| API контейнер         | ✅ Up (но `unhealthy` health-check — косметика)                        |
| Web контейнер         | ✅ healthy                                                             |
| Client контейнер      | ✅ Up                                                                  |
| Site контейнер        | ❌ Restarting (`next: not found`) — отложено                           |
| API health endpoint   | ✅ `curl localhost:4000/api/v1/health` отвечает `{"success":true,...}` |
| База данных           | ❌ **Только 1 таблица** (audit_log), миграции НЕ накатились            |

### Текущий блокер — миграции БД

При запуске `pnpm migration:run` падает потому что в `apps/api/package.json` путь `../../node_modules/typeorm/cli.js` не работает с pnpm workspace (pnpm кладёт пакеты в `.pnpm` подпапки).

**Точная ошибка:**

```
Error: Cannot find module './cli.js'
Require stack:
- /app/node_modules/typeorm/imaginaryUncacheableRequireResolveScript
```

### Следующий шаг — на чём остановились

Когда продолжишь, **выполни эти команды у себя**:

```bash
cd ~/Projects/VendHub-OS/VendHub-OS

# 1. Найти правильный путь к typeorm CLI
docker compose exec api ls /app/node_modules/typeorm/ 2>/dev/null | head -20
docker compose exec api find /app/node_modules -name "cli.js" -path "*typeorm*" 2>/dev/null | head -5
```

Скорее всего путь будет либо `/app/node_modules/typeorm/build/cli.js` (TypeORM 0.3+) либо в `.pnpm` подпапке.

После этого нужно либо:

- **Вариант A** — поправить script в `apps/api/package.json` на правильный путь
- **Вариант B** — установить `typeorm-ts-node-commonjs` который сам находит CLI в pnpm:
  ```bash
  docker compose exec api sh -c "cd apps/api && pnpm add -D typeorm-ts-node-commonjs"
  ```
  И в package.json заменить script на:
  ```json
  "migration:run": "typeorm-ts-node-commonjs migration:run -d ./src/database/typeorm.config.ts"
  ```

---

## 🎯 Что нужно сделать после миграций

1. **Прокатить 40 миграций** — должны создаться все ~150 таблиц
2. **Проверить health-check ready:** `curl localhost:4000/api/v1/health/ready`
3. **Открыть админку:** http://localhost:3000
4. **Открыть Swagger:** http://localhost:4000/docs
5. **Открыть Telegram Mini App:** http://localhost:5173
6. **Починить site контейнер** — `next: not found`, скорее всего Dockerfile.site проблема с pnpm hoist

---

## 📁 Где что расположено

### Главные файлы документации

```
~/Projects/VendHub-OS/VendHub-OS/
├── docs/
│   ├── HANDOFF.md                          ← общий снимок проекта
│   ├── EXECUTIVE_SUMMARY.html              ← 1-страничная сводка
│   ├── SESSION_CONTEXT.md                  ← ЭТОТ ФАЙЛ — старт продолжения
│   ├── audits/
│   │   ├── MASTER.html                     ← главный документ аудита (12 групп)
│   │   ├── MODULE_AUDIT_INDEX.md           ← журнал решений и сессий
│   │   ├── _styles.css                     ← общий стиль для group-*.html
│   │   ├── group-machines.html             ← аудит группы Machines & Telemetry
│   │   ├── group-inventory.html            ← Inventory & Stock
│   │   ├── group-orders.html               ← Orders & Sales
│   │   ├── group-products.html             ← Products & Catalog
│   │   ├── group-loyalty.html              ← Loyalty & Engagement
│   │   ├── group-routes.html               ← Routes & Field Ops
│   │   ├── group-integrations.html         ← Integrations
│   │   ├── group-reports.html              ← Reports & Analytics
│   │   ├── group-tenancy.html              ← Tenancy & Admin
│   │   ├── group-plumbing.html             ← Plumbing
│   │   └── identity-access/
│   │       ├── auth.md                     ← аудит auth модуля
│   │       ├── auth-explained.html         ← объяснение auth простыми словами
│   │       ├── 01-role-matrix.md           ← матрица 84 модуля × 7 ролей
│   │       ├── 01-role-matrix.html         ← интерактивный документ ролей
│   │       ├── 02-phase3-execution-plan.html ← план Фазы 3 миграции ролей
│   │       └── role-redesign-decision.md   ← принятое решение про 4 staff + Client
│   ├── adr/
│   │   ├── 0009-hosting-on-railway.md      ← ADR: хостинг (Railway → теперь VDS)
│   │   ├── 0010-role-model-redesign.md     ← ADR: 4 staff + Client + конструктор
│   │   ├── 0011-organizations-stay.md      ← ADR: организации остаются
│   │   └── 0012-machine-access-at-pilot.md ← ADR: machine-access на пилоте
│   └── runbooks/
│       ├── LAUNCH_CHECKLIST.md             ← Railway-вариант запуска
│       ├── ENV_VARIABLES.md                ← clean copy-paste env-блоки
│       ├── LOCAL_AND_SELFHOSTED.md         ← ⭐ Local + self-hosted guide
│       ├── deploy.md                       ← общий процесс деплоя
│       ├── rollback.md                     ← процедура отката
│       └── oncall.md                       ← on-call процедуры
└── apps/
    ├── api/                                ← NestJS backend
    ├── web/                                ← Next.js админка
    ├── site/                               ← маркетинг сайт
    ├── client/                             ← Telegram Mini App
    └── bot/                                ← Telegram bot
```

### Конфигурация локального запуска

- `docker-compose.yml` — для dev (с MinIO, adminer, redis-commander, bull-board)
- `docker-compose.prod.yml` — для production
- `.env.docker` — шаблон env для локалки
- `.env` — копия .env.docker (мы создавали через `cp .env.docker .env`)
- `scripts/quick-start.sh` — launcher
- `scripts/smoke-test-local.sh` — проверка после старта

---

## 🧠 Что обсуждали за всю сессию

### Принятые архитектурные решения (4 ADR)

1. **ADR-0009: Хостинг.** Изначально решили — всё на Railway. Сейчас пересматривается: пользователь хочет **локально + свой VDS-сервер** вместо Railway. На сервере есть docker-compose.prod.yml.

2. **ADR-0010: Модель ролей.** 7 жёстких ролей → 4 staff (Owner / Admin / Manager / Employee) + 1 Client (покупатели) + конструктор галочек. Реализация после стабилизации пилота. 8 этапов миграции.

3. **ADR-0011: Организации остаются.** 114 entities имеют organizationId — это позвоночник multi-tenancy.

4. **ADR-0012: Machine-access на пилоте.** Resource-level доступ к машинам (5 типов: FULL/REFILL/COLLECTION/MAINTENANCE/VIEW) включается до запуска пилота.

### Жёсткие правила для будущей разработки

- **Owner = singleton** — Jamshid, единственный
- **Admin привязан к одной организации**
- **Делегирование «только из своих»** — assertCanGrant
- **Staff и Client изолированы** — разные таблицы, разный JWT audience
- **Управление в одной панели** — не разрозненные экраны
- **Entities extend BaseEntity** (id, timestamps, soft-delete)
- **BullMQ — `@nestjs/bullmq`, НЕ `@nestjs/bull`**
- **Tenant scoping — через `user.organizationId` напрямую**

### Полный аудит проекта (12 групп, 93 модуля, 1156 эндпоинтов)

| Группа               | Модулей | Эндпоинтов | Статус |
| -------------------- | ------: | ---------: | ------ |
| Identity & Access    |       8 |        103 | ✅     |
| Payments             |       7 |         79 | ✅     |
| Machines & Telemetry |      10 |        113 | ✅     |
| Inventory & Stock    |       9 |         83 | ✅     |
| Orders & Sales       |       6 |         85 | ✅     |
| Products & Catalog   |       6 |        112 | ✅     |
| Loyalty & Engagement |       6 |         77 | ✅     |
| Routes & Field Ops   |      10 |        165 | ✅     |
| Integrations         |      13 |        150 | ✅     |
| Reports & Analytics  |       5 |         89 | ✅     |
| Tenancy & Admin      |       8 |         87 | ✅     |
| Plumbing             |       5 |         13 | ✅     |

### Что есть в проекте (готовая инфраструктура)

- **6 кастомных агентов** в `.claude/agents/`: module-migrator (opus), db-migration-helper, build-verifier, production-quality-guardian (opus), health-check, dependency-audit
- **15 VHM24-скиллов** для разработки
- **Динамический RBAC модуль** уже в коде (roles + permissions + user_roles + role_permissions)
- **Machine-access модуль** уже в коде с 5 типами доступа
- **40 миграций** базы данных (latest `1776900000000`)
- **121 тест в auth** модуле, 0 RBAC violations, 0 CVE

---

## 🚀 Как продолжить с другого устройства / в новом чате

### Если работаешь на этом же компьютере

1. Открой Terminal
2. `cd ~/Projects/VendHub-OS/VendHub-OS`
3. Открой этот файл: `cat docs/SESSION_CONTEXT.md`
4. Посмотри блок **«Следующий шаг»** выше
5. Продолжай с тех команд

### Если в новом чате с Claude

Скопируй этот блок в начало нового чата:

```
Я продолжаю работу с проектом VendHub OS.

Прочитай первым делом:
1. ~/Projects/VendHub-OS/VendHub-OS/docs/SESSION_CONTEXT.md (точка входа)
2. ~/Projects/VendHub-OS/VendHub-OS/docs/HANDOFF.md (общий контекст)
3. ~/Projects/VendHub-OS/VendHub-OS/docs/audits/MASTER.html (полный аудит)

Краткая ситуация: я запустил проект локально через docker compose,
но миграции БД не прокатились — pnpm-путь к typeorm CLI не работает.
Нужно починить script в apps/api/package.json или использовать
typeorm-ts-node-commonjs.

Где остановились — в SESSION_CONTEXT.md, секция "Следующий шаг".
```

### Если на телефоне через Cloud

1. Открой GitHub в браузере: репозиторий VendHub-OS
2. Перейди в `docs/SESSION_CONTEXT.md` — увидишь этот файл
3. Если нужно дать команду — Claude может править файлы через git, ты потом сделай `git pull` локально

### Если на другом компьютере

1. Установи Docker Desktop
2. `git clone <repo-url> VendHub-OS`
3. `cd VendHub-OS`
4. `cp .env.docker .env`
5. `docker compose up -d --build`
6. Открой `docs/SESSION_CONTEXT.md` и продолжи с **«Следующий шаг»**

---

## 🆘 Важные команды для отладки

### Статус всех контейнеров

```bash
docker compose ps
```

### Логи api (последние 50 строк)

```bash
docker compose logs --tail=50 api
```

### Health-check

```bash
curl -s http://localhost:4000/api/v1/health
curl -s http://localhost:4000/api/v1/health/ready
```

### Подключиться к Postgres

```bash
docker compose exec postgres psql -U vendhub
# Внутри: \dt  — список таблиц
# \q — выйти
```

### Перезапустить только api

```bash
docker compose restart api
```

### Полный перезапуск со сборкой

```bash
docker compose down
docker compose up -d --build
```

### Стереть всё и начать с нуля

```bash
docker compose down -v
docker volume rm vendhub-postgres-data vendhub-postgres-wal-archive 2>/dev/null
docker compose up -d --build
```

---

## 📊 Что НЕ готово

### 🔴 Блокеры запуска локально (текущие)

1. **Миграции БД не накатились** — pnpm-путь к typeorm CLI не работает (см. «Следующий шаг»)
2. **Site контейнер рестартует** — `next: not found` в Docker-образе

### 🟡 Косметика

3. API health-check helper expects плоский ответ, наш API возвращает enveloped. Контейнер пишет `unhealthy`, но фактически работает. Можно поправить healthcheck в Dockerfile или игнорировать.
4. Старые volumes от `vendhubos` (без дефиса) могут показываться. Удалили основные, остался `vendhub_redis-data`.

### 🟢 После пилота (Фаза 3 миграция модели)

5. Переход на 4 staff + Client + конструктор галочек (8 этапов, 4-6 недель работы команды)
6. Approval workflows, immutable audit log, risk-based 2FA (Фаза 4)
7. SCIM, JIT elevation, ABAC (Фаза 5)

---

## 🔗 Контакты ключевых сервисов

| Что                   | URL / куда смотреть                |
| --------------------- | ---------------------------------- |
| Локальная админка     | http://localhost:3000              |
| Локальный API         | http://localhost:4000              |
| Локальный Swagger     | http://localhost:4000/docs         |
| Telegram Mini App     | http://localhost:5173              |
| Adminer (DB UI)       | http://localhost:8080              |
| Bull-board (queues)   | http://localhost:4000/admin/queues |
| MinIO Console         | http://localhost:9001              |
| Sentry                | sentry.io (нужно создать проект)   |
| Telegram BotFather    | @BotFather в Telegram              |
| Payme cabinet         | merchant.payme.uz                  |
| Click cabinet         | partner.click.uz                   |
| Soliq.uz / Multikassa | по договору                        |

---

## ⚙️ Стек проекта

**Backend:**

- NestJS 11.x
- TypeORM 0.3.x (Postgres)
- BullMQ 5.x (`@nestjs/bullmq`)
- Telegraf 4.x (Telegram bot)
- Redis 7

**Frontend:**

- Next.js 16 (web админка + site маркетинг)
- React 19, Vite 6 (Telegram Mini App)
- shadcn/ui, Tailwind CSS

**Mobile:**

- React Native + Expo 52 (`apps/mobile`, не для пилота)

**Database:**

- PostgreSQL 16 + PostGIS extension
- Redis 7 для кэша / sessions / BullMQ

**Storage:**

- MinIO (S3-совместимый)

**Languages:**

- TypeScript 5.x повсеместно
- Локализация: ru, uz, en

---

## 📝 Журнал последних действий в этой сессии

1. ✅ Создан полный аудит 12 групп модулей (HTML-файлы в `docs/audits/`)
2. ✅ 4 ADR-документа в `docs/adr/`
3. ✅ HANDOFF.md обновлён
4. ✅ EXECUTIVE_SUMMARY.html создан
5. ✅ LAUNCH_CHECKLIST.md (Railway-вариант)
6. ✅ ENV_VARIABLES.md (clean copy-paste)
7. ✅ LOCAL_AND_SELFHOSTED.md (главный практический guide)
8. ✅ Все цифры верифицированы python-скриптом против реального кода
9. ✅ Запуск Docker — собрался первый раз за 165 секунд (4 image)
10. ✅ Postgres + Redis + MinIO работают
11. ✅ API стартовал, но в seed-runner.ts были TypeScript errors (TypeORM 0.3 не принимает type generics в `query<T>()`)
12. ✅ Исправлено `seed-runner.ts` — заменены 5 вхождений `runner.query<{ id: string }[]>(...)` на `const existing: Array<{ id: string }> = await runner.query(...)`
13. ✅ Исправлено `run-olma-seed.ts` — `url: process.env.DATABASE_URL` → conditional spread для exactOptionalPropertyTypes
14. ✅ Postgres volume пересоздан с правильным паролем
15. ✅ API запустился: `Nest application successfully started on port 4000`
16. ✅ Health endpoint отвечает 200
17. ❌ **Миграции БД не прокатились** — `pnpm migration:run` падает на pnpm-пути к typeorm CLI
18. **← мы здесь.** Нужно поправить script или использовать typeorm-ts-node-commonjs

---

**Конец snapshot'а.** Открывай этот файл с любого устройства — продолжишь без потерь.
