# VendHub OS — Module-by-Module Audit Index

**Цель документа:** хранить контекст модульного аудита между сессиями. Любая новая сессия Claude должна прочитать этот файл первым, чтобы:

- Знать, какие модули уже проанализированы и где лежат отчёты.
- Не повторять работу.
- Помнить ключевые архитектурные решения и риски, найденные в предыдущих модулях.

**Started:** 2026-04-29
**Owner:** Jamshid + Claude
**Goal:** Подготовить пилот к запуску на Railway. Проанализировать критичные модули по группам.

---

## Контекст проекта (must-know)

- **Repo:** `~/VendHub-OS/`, ветка `main`.
- **Stack:** NestJS 11 (api) + Next.js 16 (web/site) + Vite (client) + RN+Expo (mobile). pnpm monorepo, Turborepo.
- **Hosting plan:** ВСЁ на Railway. Vercel НЕ используется (вариант А из обсуждения 2026-04-29). API+bot+Postgres+Redis обязаны жить на Railway, web/site/client туда же — один счёт.
- **Текущий блокер №1:** `vendhubweb-production` на Railway не билдится с 2026-04-06 (см. `docs/RAILWAY-DEPLOY-STATUS-2026-04-21.md`). Код собирается локально. Проблема — биллинг/пауза Railway.
- **Текущий блокер №2:** Миграции Sprint E/F (до `1776900000000`) не применены на проде. См. `docs/ROADMAP-2026-Q2.md` P1.2.
- **23 машины** в проде, операторы пока не видят админку из-за блокера №1.
- **Score:** API 10.0, RBAC canary = 0, 0 CVE.

## Принятые продуктовые решения

### 2026-04-29: Упрощение модели ролей до 4 staff + 1 client + конструктор прав

Решение: переходим на модель **4 staff-ролей** (Owner, Admin, Manager, Employee) + **отдельная роль Client** для покупателей с собственным кабинетом. Per-user конструктор прав для staff.

**Ключевые правила:**

- **Owner — один пользователь (Jamshid)**, все организации.
- **Admin** — привязан к одной организации.
- **Admin** может создавать и Manager, и Employee напрямую (две отдельные мета-галочки).
- **Manager** создаёт Employee только если Admin включил мета-галочку `can_create_employees`.
- Каждый раздаёт права только из своего набора.
- **«Наблюдатель»** — это пресет шаблона внутри Employee (все галочки read-only), не отдельная роль.
- **Client** — отдельная пятая роль. Не часть staff-иерархии. Свой кабинет (профиль, покупки, бонусы, ачивки, рефералы). Логинится через Telegram Mini App или phone+OTP. Может быть привязан к нескольким организациям.
- **Staff и Client изолированы** — разные таблицы (`users` и `clients`), разные эндпоинты логина, разный audience в JWT.
- Всё управление staff в **одной панели**, не разрозненными экранами.

**Не перед пилотом.** Реализация — после 4-6 недель стабилизации. Детали в [role-redesign-decision.md](identity-access/role-redesign-decision.md).

Все будущие аудиты модулей должны учитывать этот целевой ориентир.

## Архитектурные правила (нельзя нарушать)

1. Entities **extend `BaseEntity`** (`apps/api/src/common/entities/base.entity.ts`) — id, timestamps, soft-delete, createdBy/updatedBy внутри.
2. BullMQ — это `@nestjs/bullmq`, **НЕ** `@nestjs/bull`.
3. Tenant scoping — через `user.organizationId` напрямую, **НЕТ** декоратора `@CurrentOrganizationId`.
4. `exactOptionalPropertyTypes: true` в `tsconfig.base.json`. В `apps/api` opt-out (Issue #17, deferred).
5. OpenAPI drift gate активен в CI — после изменений API surface запускать `pnpm --filter @vendhub/api openapi:generate` и коммитить `openapi.json`.

## Методика анализа каждого модуля

По каждому модулю собираем 8 пунктов:

1. **Назначение и границы** — что делает, чьи команды принимает, чьи ресурсы дёргает.
2. **Связи** — `imports`, `exports`, кто импортирует, события (`@OnEvent`, `eventEmitter.emit`).
3. **Схема данных** — entities, миграции, индексы, soft-delete.
4. **API surface** — REST endpoints, WS gateways, BullMQ queues, cron jobs.
5. **Tenant scoping и RBAC** — `organizationId` фильтр, `@Roles()`, `@Public()`, утечки.
6. **Тестовое покрытие** — сколько `.spec.ts`, что покрыто.
7. **Риски к проду** — feature flags, миграции, TODO/FIXME, известные баги.
8. **Готовность** — 🟢 ready / 🟡 нужно действие / 🔴 блокер. С конкретными action items.

Каждый отчёт — отдельный файл в этой папке: `docs/audits/<group>/<module>.md`.

---

## Группы модулей и порядок прохождения

### 1. Identity & Access — В РАБОТЕ

**Статус:** активный аудит начат 2026-04-29.

| Модуль          | Статус             | Отчёт                                              | Готовность                            |
| --------------- | ------------------ | -------------------------------------------------- | ------------------------------------- |
| auth            | ✅ Проанализирован | [identity-access/auth.md](identity-access/auth.md) | 🟡 Нужны env vars + проверка на проде |
| users           | ⏳ Pending         | —                                                  | —                                     |
| rbac            | ⏳ Pending         | —                                                  | —                                     |
| security        | ⏳ Pending         | —                                                  | —                                     |
| invites         | ⏳ Pending         | —                                                  | —                                     |
| access-requests | ⏳ Pending         | —                                                  | —                                     |
| machine-access  | ⏳ Pending         | —                                                  | —                                     |
| employees       | ⏳ Pending         | —                                                  | —                                     |

### 2. Payments & Fiscal — Pending

payments, telegram-payments, fiscal, billing, payment-reports, cash-finance, payout-requests

### 3. Machines & Telemetry — Pending

machines, equipment, monitoring, websocket, alerts, predictive-refill, calculated-state, slot-history, geo, locations

### 4. Inventory & Stock — Pending

inventory, inventory-dashboard, inventory-reconciliation, stock-movements, batch-movements, opening-balances, warehouse, storage, containers

### 5. Orders & Sales — Pending

orders, transactions, sales-import, complaints, purchase-history

### 6. Products & Catalog — Pending

products, categories, directories, references, custom-fields, favorites

### 7. Loyalty & Engagement — Pending

loyalty, achievements, quests, referrals, promo-codes, operator-ratings

### 8. Routes & Field Ops — Pending

routes, tasks, maintenance, material-requests, work-logs, vehicles, incidents, recommendations, reconciliation

### 9. Integrations — Pending

integrations, vhm24-integration, telegram-bot, fcm, sms, email, web-push, webhooks, agent-bridge, data-parser, import

### 10. Reports & Analytics — Pending

reports, analytics, metrics, ai, investor

### 11. Tenancy & Admin — Pending

organizations, contractors, counterparty, settings, cms, site-cms, public-tenant, website-config

### 12. Plumbing — Pending

health, audit, entity-events, notifications, storage, alerts

---

## Сводный список рисков и блокеров (живой)

Накапливается по мере анализа. Каждая запись имеет источник (модуль, где найдена).

### 🔴 Блокеры запуска

1. Railway web build пустой с 2026-04-06 — биллинг/пауза. (источник: `RAILWAY-DEPLOY-STATUS-2026-04-21.md`)
2. Миграции `1776100000000`+ не накатились на прод DB. (источник: `ROADMAP-2026-Q2.md` P1.2)

### 🟡 Требуют действия

1. **AGENT_MODE bypass в `JwtAuthGuard`** — пропускает auth если `AGENT_MODE=true` и `NODE_ENV !== "production"`. Проверить, что на Railway переменная `NODE_ENV=production` явно выставлена. (источник: auth)
2. **`JWT_SECRET ?? ""` в `auth.module.ts` и `auth.service.ts`** — если переменная отсутствует, `JwtModule` молча использует пустую строку как секрет. `JwtStrategy` падает явно, но `JwtService.sign()` будет работать. Проверить env на Railway. (источник: auth)
3. **Telegram login (`@Public POST /auth/telegram`)** — верифицирует HMAC через `verifyTelegramData()`. Проверить, что `TELEGRAM_BOT_TOKEN` на Railway корректный и не logging-ится. (источник: auth)
4. **`COOKIE_SAME_SITE` дефолт = `"lax"` ломает cross-origin login** — в проде на разных Railway-доменах нужно `COOKIE_SAME_SITE=none`. `COOKIE_SECURE` авто-true в prod, выставлять не надо. (источник: auth)
5. **tzdata отсутствует в `apps/api/Dockerfile`** — все 4 stage'а на `node:20-alpine`, без `apk add tzdata`. Cron'ы с `timeZone: "Asia/Tashkent"` (минимум 3 в auth) выполняются в UTC. Добавить `RUN apk add --no-cache tzdata` в production stage. (источник: auth) **Найдено при перепроверке.**

### 📋 Deferred / out of scope для запуска

1. Issue #17 — `exactOptionalPropertyTypes` в `apps/api` (284 ошибки).
2. ML-расширение predictive-refill (Sprint F+).
3. Auto-route optimization based on recommendations (Sprint F+).

---

## Журнал сессий

| Дата       | Сессия                            | Что сделали                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Следующий шаг                                                |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2026-04-29 | Setup + auth                      | Согласовали Vercel→Railway план, методику аудита, разбили 95 модулей на 12 групп. Сделан аудит `auth`.                                                                                                                                                                                                                                                                                                                                                                                          | Продолжить с `users`                                         |
| 2026-04-29 | Verify auth                       | Перепроверка отчёта `auth`. Исправлены 2 неточности (cron — 3 шт. вместо 1; cookie дефолты умнее). Найден новый риск 🟡 R4a — нет tzdata в Alpine Dockerfile, ломает Asia/Tashkent cron'ы.                                                                                                                                                                                                                                                                                                      | Продолжить с `users`                                         |
| 2026-04-29 | Объяснение auth                   | Создан подробный HTML-документ `auth-explained.html` для нетехнического чтения — 16 разделов, навигация, графики.                                                                                                                                                                                                                                                                                                                                                                               | Идём по 8 пунктам раздела 16 в документе по порядку с verify |
| 2026-04-29 | Pt. A: матрица ролей              | Парсингом всех `@Roles()` декораторов собрана матрица 84 модуля × 7 ролей × 1067 эндпоинтов. Сохранено в `01-role-matrix.md`. Найдены 3 code smells (MIXED стили, нулевые OWNER колонки, нулевой ACCOUNTANT в inventory). При перепроверке исправлена ошибка про `metrics`/`monitoring` — они защищены токенами, не публичны.                                                                                                                                                                   | Pt. B — Telegram Mini App flow                               |
| 2026-04-29 | Pt. A: интерактивный HTML         | Создан `01-role-matrix.html` — наглядный документ с 4 вкладками (Текущее / Идеал / Разрыв / План) и 12 раскрывающимися блоками. Описаны 12 современных RBAC-фишек: гранулярные permissions, resource-level, custom roles, ABAC, JIT elevation, SCIM, approval workflows, immutable audit, risk-based 2FA, break-glass, permission discovery, field-level. Из них 4 уже частично есть, 8 — на будущее. План разбит на 4 фазы: 6 пунктов сделано, 4 надо до запуска (2 часа работы), 12 на потом. | Pt. B — Telegram Mini App flow                               |
| 2026-04-29 | Pt. A: продуктовое решение        | После обсуждения с Jamshid принято решение: переход на 4-ролевую модель (Owner=Jamshid / Admin=орг / Manager / Employee) + per-user конструктор прав. Замена 7 жёстких ролей на 4 + delegated permissions. Реализация — НЕ перед пилотом, через 4-6 недель после стабилизации. План: 5 фаз, 4-6 недель разработки. Сохранено в `role-redesign-decision.md`.                                                                                                                                     | Pt. B — Telegram Mini App flow                               |
| 2026-04-29 | Уточнения по ролям                | Admin может создавать и Manager, и Employee напрямую (две мета-галочки). Manager создаёт Employee только если Admin включил can_create_employees. Делегирование «только из своих» на каждом уровне. Единая панель управления людьми.                                                                                                                                                                                                                                                            | —                                                            |
| 2026-04-29 | Расширение модели                 | Добавлена 5-я роль Client (покупатели) — отдельная таблица clients, отдельные эндпоинты логина, разный JWT audience. «Наблюдатель» зафиксирован как пресет шаблона внутри Employee, не отдельная роль. Обновлено в decision.md и в HTML.                                                                                                                                                                                                                                                        | —                                                            |
| 2026-04-29 | Проверка готовности кода          | Обнаружено что в коде уже есть: динамический RBAC модуль с таблицами roles/permissions/user_roles/role_permissions, machine-access модуль с 5 типами доступа (FULL/REFILL/COLLECTION/MAINTENANCE/VIEW) — это resource-level права на машины, access-requests workflow, audit log на 25+ типов событий. Готовность Фазы 3 «фундамент» гораздо выше базовой оценки.                                                                                                                               | —                                                            |
| 2026-04-29 | План скорректирован               | Сроки убраны из плана. Resource-level (machine-access) поднят в Фазу 1 — реализуется до запуска пилота, не откладывается. Сводный счётчик стал 9/33 готово. Custom roles удалены из плана как «решено конструктором».                                                                                                                                                                                                                                                                           | —                                                            |
| 2026-04-29 | Pt. A: execution plan             | Создан `02-phase3-execution-plan.html` — детальный план Фазы 3 с 5 экранами-mockup'ами целевой системы, матрицей агентов и скиллов (6 кастомных агентов проекта + 19 VHM24-скиллов + системные плагины), структурой knowledge base (ADR, specs, runbooks, agent runbooks), и workflow на 5 спринтов.                                                                                                                                                                                            | Pt. B — Telegram Mini App flow                               |
| 2026-04-29 | MASTER.html v2                    | Создан единый мастер-файл аудита с visual upgrade: hero-дашборд с прогрессом 64% «к запуску пилота», 6-шаговый phase tracker, 4 цветные карточки решений, scroll-spy в сайдбаре, FAB наверх. Дополняется по мере секций B-H.                                                                                                                                                                                                                                                                    | —                                                            |
| 2026-04-29 | Pt. E: План выкатки               | Заполнена секция E в MASTER.html. 7 вкладок: 0 Railway → 1 Env (по сервисам) → 2 Migrations (40 миграций, latest 1776900000000, releaseCommand уже настроен) → 3 Deploy sequence → 4 Smoke tests (10 сценариев + health endpoints) → 5 Monitoring 48h (Sentry/Grafana/Bull queues) → Rollback (Railway redeploy / git revert / migration revert). Прогресс 2/8 секций.                                                                                                                          | Pt. B / D / H по выбору                                      |
| 2026-04-29 | Pt. B: Telegram Mini App          | Заполнена секция B. 3 вкладки: Поток (10 шагов от кнопки до залогиненного клиента), Безопасность (HMAC двухступенчатый, 60-сек freshness, throttle, HttpOnly), Edge cases (8 сценариев).                                                                                                                                                                                                                                                                                                        | Pt. C                                                        |
| 2026-04-29 | Pt. C: Регистрация по приглашению | Заполнена секция C. 3 вкладки: Поток создания+использования, Структура invite (10 полей таблицы + 5 эндпоинтов), Edge cases (race condition, brute force, etc). Готов на пилоте.                                                                                                                                                                                                                                                                                                                | Pt. D                                                        |
| 2026-04-29 | Pt. D: RBAC модуль                | Заполнена секция D. 3 вкладки: Архитектура (4 таблицы roles/permissions/user_roles/role_permissions), 12 эндпоинтов RbacController, Что нужно добавить в Фазе 3 (PermissionsGuard, assertCanGrant, мета-разрешения). RBAC-фундамент уже значительно более продвинутый чем enum UserRole.                                                                                                                                                                                                        | Pt. F                                                        |
| 2026-04-29 | Pt. F: Аудит users                | Заполнена секция F. По методике 8 пунктов. User entity 30+ полей, 5 эндпоинтов, 8 индексов, ~30 service-методов. Готов 🟢. Action items: разделить User → User+Client (Фаза 3.6), unit-тест на stripProtectedFields.                                                                                                                                                                                                                                                                            | Pt. G                                                        |
| 2026-04-29 | Pt. G: Остальные Identity         | Заполнена секция G. 5 модулей: security (логи событий), invites (уже в C), access-requests (workflow запросов прав), machine-access (resource-level FULL/REFILL/COLLECTION/MAINTENANCE/VIEW), employees (HR-данные 40 эндпоинтов). Сводка: вся группа Identity & Access технически готова к запуску.                                                                                                                                                                                            | Pt. H                                                        |
| 2026-04-29 | Pt. H: Payments                   | Заполнена секция H. 7 модулей денежного критического пути. End-to-end сценарий из 12 шагов «клиент купил кофе». Стратегия пилота: начать с Payme + Soliq, Click/Uzum через 1-2 недели после стабилизации. **Прогресс: 8/8 секций ✓**.                                                                                                                                                                                                                                                           | Все секции готовы — мастер-файл закрыт                       |
| 2026-04-29 | Companion artifacts               | Создан `docs/runbooks/LAUNCH_CHECKLIST.md` (полный пошаговый чек-лист) и `docs/runbooks/ENV_VARIABLES.md` (clean copy-paste).                                                                                                                                                                                                                                                                                                                                                                   | —                                                            |
| 2026-04-29 | HANDOFF + ADR                     | Обновлён `docs/HANDOFF.md` (новый снимок состояния). Созданы 4 ADR: 0009-hosting-on-railway, 0010-role-model-redesign, 0011-organizations-stay, 0012-machine-access-at-pilot.                                                                                                                                                                                                                                                                                                                   | —                                                            |
| 2026-04-29 | 10 групповых аудитов              | Созданы отдельные HTML-файлы по каждой из 10 оставшихся групп: group-machines.html, group-inventory.html, group-orders.html, group-products.html, group-loyalty.html, group-routes.html, group-integrations.html, group-reports.html, group-tenancy.html, group-plumbing.html. Все используют общий `_styles.css`. **Прогресс: 12/12 групп ✓**.                                                                                                                                                 | Аудит проекта полностью завершён                             |
