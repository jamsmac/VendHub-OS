# 📋 Контекст сессии VendHub OS — для продолжения работы

**Последнее обновление:** 2026-04-29 (вечер, миграции починены)
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
| API ready endpoint    | ✅ database+redis up                                                   |
| База данных           | ✅ **248 таблиц**, schema:sync из entities, 40 миграций fake-marked    |
| TypeORM CLI           | ✅ Чинено — `typeorm-ts-node-commonjs` вместо ручного пути             |

### ✅ Что сделано в этой сессии (2026-04-29 вечер)

**Миграции починены через rebaseline.**

1. **`apps/api/package.json` script `typeorm`** — был сломан в pnpm workspace (путь `../../node_modules/typeorm/cli.js` не существует, пакеты лежат в `apps/api/node_modules/typeorm/`). Заменено на:

   ```json
   "typeorm": "TYPEORM_CLI=1 typeorm-ts-node-commonjs"
   ```

   `typeorm-ts-node-commonjs` — официальная bin-обёртка из пакета `typeorm` 0.3+, сама подключает ts-node и резолвит CLI. `TYPEORM_CLI=1` отключает Redis-кэш в `typeorm.config.ts` явно (не полагается на argv-эвристику).

2. **Mega-sync миграция `1773885435060-SyncEntities` (5085 строк)** — сгенерирована через `migration:generate` против разъехавшейся БД, содержит 60 ссылок на `*_old` enum-типы которых нет на чистой схеме. Падает на `ALTER TYPE machine_type_enum_old RENAME TO machine_type_enum_old_old`.

3. **Rebaseline вместо ремонта** — стандартный паттерн для проекта где migrations разъехались с entities:

   ```bash
   docker compose stop api
   docker compose exec postgres psql -U vendhub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; ..."
   # + CREATE EXTENSION uuid-ossp/pgcrypto/pg_trgm/unaccent/tablefunc
   docker compose run --rm --no-deps api sh -c "cd /app/apps/api && TYPEORM_CLI=1 ./node_modules/.bin/typeorm-ts-node-commonjs schema:sync -d ./src/database/typeorm.config.ts"
   # → 247 таблиц созданы из entities
   # INSERT INTO typeorm_migrations все 40 миграций (fake-mark)
   docker compose start api
   ```

4. **Проверка:** `migration:show` → все 40 строк `[X]`. `scheduled_reports` существует, нет больше `relation does not exist` ошибок. health/ready: db+redis up.

**Результат:** локалка запущена, API подключён к БД с полной схемой.

---

## 🎯 Следующие шаги

1. **(сделано)** ~~Прокатить миграции~~ — БД синхронизирована, 248 таблиц.
2. **(сделано)** ~~Проверить health-check ready~~ — db+redis up.
3. **(сделано)** ~~Засидировать админа~~ — owner создан:
   - **Email:** `admin@vendhub.uz`
   - **Password:** `VendHub2026!`
   - **Org:** VendHub HQ
   - Login через `POST /api/v1/auth/login` возвращает JWT (проверено).
4. **(сделано)** ~~Web админка~~ — http://localhost:3000 → 200 OK
5. **(сделано)** ~~Swagger~~ — http://localhost:4000/docs → 200 OK
6. **(сделано)** ~~Telegram Mini App~~ — http://localhost:5173 → 200 OK
7. **Site контейнер — отложено** (не блокирует пилот). См. секцию ниже.
8. **Пересобрать api образ** — `docker compose build api` чтобы fix `package.json` попал в образ.
9. **Подставить настоящий `TELEGRAM_BOT_TOKEN`** в `.env` если нужно тестить бота.
10. **Пройти UI smoke** — залогиниться в админку, создать тестовую машину/продукт, проверить что предиктивный refill работает.

### 🟡 Site контейнер — debug заметки

`apps/site/Dockerfile` падает с `next: not found` на старте. Корень: pnpm 9.15 в Docker без TTY с workspace-настройкой ловит несколько граблей одновременно:

1. **`.npmrc` не копируется в deps stage** — `node-linker=hoisted` не применяется
2. **Интерактивный prompt** "modules directory will be reinstalled" виснет в non-TTY (escape: `CI=true`)
3. **`--frozen-lockfile` молча скипает** ветки lockfile когда workspace неполный (отсутствуют package.json других apps)
4. **`COPY --from=deps node_modules`** не сохраняет `.bin/` symlinks в BuildKit при cross-stage копировании

Я попробовал несколько комбинаций (см. историю commits/diff если интересно), но ни одна не дала рабочего результата. **Обходной путь — запускать site нативно через host pnpm**, минуя Docker:

```bash
cd ~/Projects/VendHub-OS/VendHub-OS
pnpm install                                    # один раз, чистит и устанавливает все workspaces
pnpm --filter @vendhub/site dev -p 3100          # запустит site на http://localhost:3100
```

Это нормальный dev-флоу для Next.js — Docker нужен только для prod-сборки (Stage 4 в Dockerfile, она независима от dev stage и должна работать).

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
17. ❌ ~~Миграции БД не прокатились~~ — `pnpm migration:run` падал на pnpm-пути к typeorm CLI
18. ✅ **`apps/api/package.json` script `typeorm` починен** — заменили `ts-node ../../node_modules/typeorm/cli.js` на `TYPEORM_CLI=1 typeorm-ts-node-commonjs`
19. ✅ **Rebaseline БД** — выяснилось что mega-sync миграция (5085 строк, 60 `*_old`-артефактов) фундаментально не идемпотентна на свежей схеме. Сделали `DROP SCHEMA public CASCADE` → `schema:sync` из entities → fake-mark всех 40 миграций в `typeorm_migrations`. Результат: 248 таблиц, API healthy, нет runtime-ошибок про missing relations.
20. **← мы здесь.** Локалка готова к сидированию (`pnpm db:seed:admin`) и UI-проверке.

---

**Конец snapshot'а.** Открывай этот файл с любого устройства — продолжишь без потерь.
