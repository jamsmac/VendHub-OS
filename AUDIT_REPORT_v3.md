# VendHub OS — Полный Аудит v3

**Дата:** 2026-02-20
**Аудитор:** Claude Opus 4.6
**Методология:** 10-фазный аудит (`docs/FULL_AUDIT_PROMPT.md`)

---

## Executive Summary

| Метрика                           | v2 (02-19) | v3 (02-20) | Дельта  |
| --------------------------------- | ---------- | ---------- | ------- |
| **Общая готовность к production** | **88/100** | **82/100** | **-6**  |
| **Критические блокеры (P0)**      | **0**      | **3**      | **+3**  |
| **Серьёзные проблемы (P1)**       | **0**      | **18**     | **+18** |
| **Улучшения (P2)**                | **24+**    | **19**     | ~       |
| **Unit-тесты (pass)**             | 1652       | 1680       | +28     |
| **Test suites**                   | 63         | 69         | +6      |
| **TS-ошибки (все 5 apps)**        | 0          | 0          | =       |
| **LOC (total)**                   | ~250K      | ~275K      | +25K    |

### Почему оценка снизилась с 88 до 82?

v2 закрыл все **известные** P0/P1, но более глубокий аудит v3 выявил:

- 3 новых P0 (не обнаруженных в v2): storage tenant isolation, loyalty транзакция, K8s backup
- 18 P1 (security + data integrity), которые v2 не проверял на этой глубине
- Web dashboard КРИТИЧНО сломан (token mismatch) — работал в v2, но **не тестировался end-to-end**

### Scorecard по категориям

| Категория          | v2 Score | v3 Score | Дельта |
| ------------------ | -------- | -------- | ------ |
| **Архитектура**    | 9.5      | 9.0      | -0.5   |
| **Backend (API)**  | 9.5      | 8.5      | -1.0   |
| **Web Admin**      | 7.5      | 6.0      | -1.5   |
| **Client PWA**     | 8.0      | 7.5      | -0.5   |
| **Mobile**         | 7.0      | 6.5      | -0.5   |
| **Bot**            | 8.0      | 8.0      | =      |
| **Infrastructure** | 7.5      | 7.0      | -0.5   |
| **Tests**          | 8.0      | 8.0      | =      |
| **Security**       | 8.5      | 6.5      | -2.0   |

### Топ-5 критических находок

1. **P0-001:** Storage service — нулевая tenant isolation, любой authenticated user может читать/писать файлы любой организации
2. **P0-002:** Loyalty `spendPoints()` — 3 последовательные операции БД без транзакции (race condition → двойное списание баллов)
3. **P1-001:** Web dashboard — `vendhub_access_token` vs `accessToken` key mismatch ломает ВСЕ API вызовы с dashboard
4. **P1-002:** Payment webhooks Payme/Click/Uzum — TOCTOU race condition (no pessimistic locking)
5. **P1-003:** Admin может создать пользователя с ролью `owner` → privilege escalation

---

## Build Health

### TypeScript Compilation

| App    | v2 TS Errors | v3 TS Errors | Статус |
| ------ | ------------ | ------------ | ------ |
| API    | 0            | 0            | ✅     |
| Web    | 0            | 0            | ✅     |
| Client | 0            | 0            | ✅     |
| Bot    | 0            | 0            | ✅     |
| Mobile | 0            | 0            | ✅     |

### Test Results

| Метрика      | v2   | v3         |
| ------------ | ---- | ---------- |
| Test Suites  | 63   | 69 (+6)    |
| Tests Passed | 1652 | 1680 (+28) |
| Tests Failed | 0    | 0          |
| Pass Rate    | 100% | 100%       |
| Test Files   | 72   | 78 (+6)    |

**Breakdown:** 69 API spec files + 2 bot test files + 1 mobile test file + 6 e2e specs

### Codebase Metrics

| Метрика         | Значение |
| --------------- | -------- |
| Total LOC       | ~275,559 |
| API LOC         | 134,646  |
| Web LOC         | 49,710   |
| Mobile LOC      | 16,973   |
| Client LOC      | 9,629    |
| Shared LOC      | 7,769    |
| Bot LOC         | 5,537    |
| Entities        | 100      |
| Controllers     | 65       |
| Services        | 101      |
| DTOs            | 163      |
| Modules         | 62       |
| `any` types     | 546      |
| Files >500 LOC  | ~49      |
| TODO/FIXME/HACK | 0        |

---

## Находки по приоритету

### P0 — Блокеры (исправить до деплоя)

| #      | Проблема                                                                                                                                                                                                                                                           | Файл:строка                                               | Severity | Часы |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | -------- | ---- |
| P0-001 | **Storage: нулевая tenant isolation.** `StorageService.uploadFile()` / `getFileUrl()` / `deleteFile()` не проверяют `organizationId`. Любой authenticated user может получить доступ к файлам любой организации через ключ файла.                                  | `apps/api/src/modules/storage/storage.service.ts`         | CRITICAL | 4h   |
| P0-002 | **Loyalty `spendPoints()`: нет транзакции.** 3 последовательные операции (save transaction → FIFO deduction loop → update balance) выполняются без `dataSource.transaction()`. Race condition при одновременных запросах → двойное списание, отрицательный баланс. | `apps/api/src/modules/loyalty/loyalty.service.ts:294-365` | CRITICAL | 3h   |
| P0-003 | **K8s backup-cronjob: `DB_USERNAME` вместо `DB_USER`.** В v2 исправили все остальные manifests, но backup-cronjob остался с неправильным env var → backup скрипт не подключается к БД.                                                                             | `infrastructure/k8s/base/backup-cronjob.yml:66,124`       | HIGH     | 0.5h |

**Итого P0: 3 задачи, ~7.5 часов**

---

### P1 — Важные (исправить до релиза)

#### Security

| #      | Проблема                                                                                                                                                                                                             | Файл:строка                                                                 | Severity | Часы |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- | ---- |
| P1-001 | **Web token key mismatch.** Auth store сохраняет как `vendhub_access_token`, но API client (`lib/api.ts`) читает `accessToken`. Все dashboard API вызовы идут без токена → 401.                                      | `apps/web/src/lib/store/auth.ts` + `apps/web/src/lib/api.ts`                | CRITICAL | 1h   |
| P1-002 | **Web middleware cookie не устанавливается.** `middleware.ts:27` проверяет cookie `accessToken`, но auth store НИКОГДА не устанавливает этот cookie → middleware всегда редиректит на /auth.                         | `apps/web/src/middleware.ts:27` + `apps/web/src/lib/store/auth.ts`          | CRITICAL | 1h   |
| P1-003 | **Payment webhook TOCTOU race.** Все 3 обработчика (Payme/Click/Uzum) делают `findOne()` → проверка статуса → `save()` без pessimistic lock или transaction. При параллельных webhook retry → дублирование операций. | `apps/api/src/modules/payments/payments.service.ts:366-430,750-816,916-994` | HIGH     | 4h   |
| P1-004 | **Privilege escalation: admin → owner.** `CreateUserDto.role` принимает любой `UserRole` включая `owner`. Admin может создать пользователя с ролью owner через POST /users. Аналогично UpdateUserDto.                | `apps/api/src/modules/users/dto/create-user.dto.ts:30-33`                   | HIGH     | 2h   |
| P1-005 | **telegram-payments без @Roles().** Все endpoints контроллера доступны любому authenticated user (нет ограничения по ролям).                                                                                         | `apps/api/src/modules/telegram-payments/telegram-payments.controller.ts`    | HIGH     | 0.5h |
| P1-006 | **purchase-history `findOne` без organizationId.** `findById()` ищет по ID без фильтрации по организации → cross-tenant data access.                                                                                 | `apps/api/src/modules/purchase-history/purchase-history.service.ts`         | HIGH     | 1h   |
| P1-007 | **reconciliation `findOne` без organizationId.** Аналогично purchase-history.                                                                                                                                        | `apps/api/src/modules/reconciliation/reconciliation.service.ts`             | HIGH     | 1h   |
| P1-008 | **locations `findOne` без organizationId.** Аналогично.                                                                                                                                                              | `apps/api/src/modules/locations/locations.service.ts`                       | HIGH     | 1h   |
| P1-009 | **11 endpoints с `@Body() dto: any`.** Нет class-validator валидации, произвольные данные попадают в сервис.                                                                                                         | Разные контроллеры (details in Security phase)                              | MEDIUM   | 3h   |

#### Data Integrity

| #      | Проблема                                                                                                                                                                      | Файл:строка                                                               | Severity | Часы |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- | ---- |
| P1-010 | **Orders `createOrder()` без транзакции.** Создание заказа, обновление inventory, создание платежа — 3 операции без atomicity.                                                | `apps/api/src/modules/orders/orders.service.ts`                           | HIGH     | 3h   |
| P1-011 | **Billing service без транзакции.** Множественные связанные операции не обёрнуты в транзакцию.                                                                                | `apps/api/src/modules/billing/billing.service.ts`                         | MEDIUM   | 2h   |
| P1-012 | **PromoCode redemption без транзакции.** Проверка лимита → increment → apply — не атомарно.                                                                                   | `apps/api/src/modules/promo-codes/promo-codes.service.ts`                 | MEDIUM   | 2h   |
| P1-013 | **5 сломанных @Index.** Используют snake_case column names (`created_at`) на camelCase entity properties. SnakeNamingStrategy не применяется к строковым аргументам `@Index`. | `apps/api/src/modules/reports/entities/report.entity.ts:616-618` + others | MEDIUM   | 1h   |
| P1-014 | **24 bare `throw new Error()`.** В 10 файлах вместо NestJS HTTP exceptions. Клиент получает 500 Internal Server Error вместо информативного ответа.                           | 10 service files                                                          | MEDIUM   | 2h   |

#### Infrastructure

| #      | Проблема                                                                                                                                       | Файл:строка                                               | Severity | Часы |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- | ---- |
| P1-015 | **Bot K8s probes: порт 3002 вместо 3001.** Bot слушает только на 3001, liveness/readiness пробы на 3002 всегда fail → pod в restart loop.      | `infrastructure/k8s/base/bot-deployment.yml:53-59,88-102` | HIGH     | 0.5h |
| P1-016 | **API/Client missing docker-compose healthcheck.** В отличие от web, api и client не имеют healthcheck → docker не знает о готовности сервиса. | `docker-compose.yml`                                      | MEDIUM   | 0.5h |
| P1-017 | **ConfigMap missing STORAGE_ENDPOINT.** backup-cronjob ссылается на `STORAGE_ENDPOINT` из configmap, но ключ не существует.                    | `infrastructure/k8s/base/configmap.yml`                   | MEDIUM   | 0.5h |
| P1-018 | **Staging deploy pulls `latest` not SHA.** Staging deployment использует `latest` tag → no traceability, может деплоить незнакомый код.        | `infrastructure/k8s/overlays/staging/`                    | MEDIUM   | 1h   |

**Итого P1: 18 задач, ~26.5 часов**

---

### P2 — Улучшения (бэклог)

| #      | Проблема                                                                                                                                                 | Файл/область                                        | Severity | Часы |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------- | ---- |
| P2-001 | 546 explicit `any` types в production коде (408 в API, 88 в Web, 50 в остальных)                                                                         | Весь codebase                                       | LOW      | 20h  |
| P2-002 | ~49 файлов > 500 строк (15+ > 1000 строк). Крупнейшие: payments.service.ts, orders.service.ts                                                            | API services                                        | LOW      | 16h  |
| P2-003 | 17 entity файлов ещё с snake_case properties (incidents, notifications, operator-ratings, machine-access, achievements, import, references, directories) | `apps/api/src/modules/*/entities/`                  | LOW      | 8h   |
| P2-004 | Mobile: нет i18n системы, 208 hardcoded Russian strings                                                                                                  | `apps/mobile/src/`                                  | MEDIUM   | 8h   |
| P2-005 | Client PWA: 74 hardcoded Russian strings вне i18n                                                                                                        | `apps/client/src/`                                  | LOW      | 4h   |
| P2-006 | Web: dead code `lib/api/client.ts` (не используется нигде)                                                                                               | `apps/web/src/lib/api/client.ts`                    | LOW      | 0.5h |
| P2-007 | Web: Reset Password page без i18n                                                                                                                        | `apps/web/src/app/[locale]/auth/reset-password/`    | LOW      | 1h   |
| P2-008 | Payme/Click refunds: только меняют статус в БД, не вызывают provider API для реального возврата                                                          | `payments.service.ts`                               | MEDIUM   | 8h   |
| P2-009 | Report generator: загружает ВСЕ транзакции в память для генерации отчётов                                                                                | `reports/report-generator.service.ts`               | MEDIUM   | 4h   |
| P2-010 | 4 unbounded queries в inventory service (`.find()` без `take`/`limit`)                                                                                   | `inventory.service.ts`                              | LOW      | 2h   |
| P2-011 | Scheduled reports: CRON job без пагинации                                                                                                                | `reports/report-scheduler.service.ts`               | LOW      | 2h   |
| P2-012 | In-memory cache в recommendations service (сломается при multi-pod)                                                                                      | `recommendations.service.ts`                        | LOW      | 3h   |
| P2-013 | Dual ESLint configs в API и Client (мёртвый `.eslintrc.json` рядом с `eslint.config.mjs`)                                                                | `apps/api/`, `apps/client/`                         | LOW      | 0.5h |
| P2-014 | Grafana Redis datasource без пароля                                                                                                                      | `infrastructure/monitoring/grafana/datasources.yml` | LOW      | 0.5h |
| P2-015 | No DB CHECK constraint для negative inventory                                                                                                            | DB schema                                           | LOW      | 1h   |
| P2-016 | `formatUZS` hardcoded "сум" вместо i18n                                                                                                                  | `apps/client/src/utils/`                            | LOW      | 0.5h |
| P2-017 | NetworkPolicy targets wrong pod selector                                                                                                                 | `infrastructure/k8s/base/`                          | LOW      | 1h   |
| P2-018 | Monitoring uses POSTGRES_USER instead of DB_USER                                                                                                         | `infrastructure/monitoring/`                        | LOW      | 0.5h |
| P2-019 | Release workflow omits bot and site                                                                                                                      | `.github/workflows/`                                | LOW      | 1h   |

**Итого P2: 19 задач, ~81 часов**

---

## Регрессия

### Проверка v2 → v3

| v2 Fix                         | Статус v3    | Примечание                                             |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| Mobile auth token keys         | ✅ Работает  | `vendhub_access_token` uniformly                       |
| Bot `/api/v1` prefix           | ✅ Работает  | baseURL корректный                                     |
| 7 fake decorator controllers   | ✅ Работает  | Все используют реальные imports                        |
| Ghost `technician` role        | ✅ Нет нигде | Удалён полностью                                       |
| Notification ownership check   | ✅ Работает  | ForbiddenException на чужие                            |
| Storage STORAGE\_\* env vars   | ✅ Работает  | С AWS\_\* fallback                                     |
| .dockerignore exclusions       | ✅ Работает  | node_modules, .turbo, dist                             |
| Click/Uzum webhook idempotency | ✅ Работает  | Проверка existingTransaction                           |
| Payment signature verification | ✅ Работает  | Timing-safe comparison                                 |
| K8s DB_USER fix                | ⚠️ Частично  | Исправлено везде **кроме** backup-cronjob.yml (P0-003) |
| Web redirect /login → /auth    | ✅ Работает  | Middleware редиректит                                  |
| Bot PDB minAvailable 0         | ✅ Работает  |                                                        |
| Prometheus scrape path         | ✅ Работает  |                                                        |

### Новые проблемы (не было в v2)

| #     | Описание                          | Причина                                                   |
| ----- | --------------------------------- | --------------------------------------------------------- |
| NEW-1 | Web token key mismatch (P1-001)   | Вероятно, v2 не тестировал full auth flow через dashboard |
| NEW-2 | Web middleware cookie (P1-002)    | Аналогично — cookie flow не проверялся                    |
| NEW-3 | Storage tenant isolation (P0-001) | v2 проверял env vars, но не logic layer                   |
| NEW-4 | Payment TOCTOU (P1-003)           | v2 добавил idempotency проверку, но не pessimistic locks  |
| NEW-5 | Privilege escalation (P1-004)     | v2 проверял @Roles(), но не DTO validation на role field  |
| NEW-6 | Loyalty spendPoints tx (P0-002)   | v2 не проверял транзакционность бизнес-логики             |

---

## Модульная матрица соответствия

| Модуль            | BaseEntity | Swagger | DTO Valid | Soft Del | RBAC      | Multi-tenant | Tests | Score |
| ----------------- | ---------- | ------- | --------- | -------- | --------- | ------------ | ----- | ----- |
| auth              | ✅         | ✅      | ✅        | ✅       | ✅ Public | N/A          | ✅    | 10/10 |
| users             | ✅         | ✅      | ⚠️ P1-004 | ✅       | ✅        | ✅           | ✅    | 7/10  |
| organizations     | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| machines          | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| products          | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| inventory         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| orders            | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 7/10  |
| payments          | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 6/10  |
| loyalty           | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 5/10  |
| storage           | ✅         | ✅      | ✅        | N/A      | ✅        | ❌ P0-001    | ✅    | 4/10  |
| reports           | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 7/10  |
| billing           | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 7/10  |
| promo-codes       | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 7/10  |
| categories        | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| employees         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| tasks             | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| trips             | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| notifications     | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| favorites         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| achievements      | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| quests            | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| recommendations   | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 8/10  |
| complaints        | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| reviews           | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| geo               | ✅         | ✅      | ✅        | N/A      | ✅        | ✅           | ✅    | 10/10 |
| locations         | ✅         | ✅      | ✅        | ✅       | ✅        | ⚠️ P1-008    | ✅    | 7/10  |
| purchase-history  | ✅         | ✅      | ✅        | ✅       | ✅        | ⚠️ P1-006    | ✅    | 7/10  |
| reconciliation    | ✅         | ✅      | ✅        | ✅       | ✅        | ⚠️ P1-007    | ✅    | 7/10  |
| telegram-payments | ✅         | ✅      | ✅        | ✅       | ❌ P1-005 | ✅           | ✅    | 6/10  |
| telegram-bot      | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| work-logs         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| incidents         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| machine-access    | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| directories       | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| operator-ratings  | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| references        | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| import            | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| sales-import      | ✅         | ✅      | ✅        | ✅       | ✅        | ⚠️           | ✅    | 8/10  |
| opening-balances  | ✅         | ✅      | ✅        | ✅       | ✅        | ⚠️           | ✅    | 8/10  |
| analytics         | ✅         | ✅      | ✅        | N/A      | ✅        | ⚠️           | ✅    | 8/10  |
| client            | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 9/10  |
| health            | N/A        | ✅      | N/A       | N/A      | ✅ Public | N/A          | N/A   | 10/10 |
| scheduler         | N/A        | N/A     | N/A       | N/A      | N/A       | ✅           | ✅    | 8/10  |
| database          | N/A        | N/A     | N/A       | N/A      | N/A       | N/A          | N/A   | 10/10 |
| config            | N/A        | N/A     | N/A       | N/A      | N/A       | N/A          | N/A   | 10/10 |
| audit-log         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| warehouse         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| regions           | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| contracts         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| commissions       | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| planogram         | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| encashment        | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| fiscal            | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| sms               | ✅         | ✅      | ✅        | N/A      | ✅        | ✅           | ✅    | 10/10 |
| mailer            | ✅         | ✅      | ✅        | N/A      | ✅        | N/A          | ✅    | 10/10 |
| telemetry         | ✅         | ✅      | ✅        | N/A      | ✅        | ✅           | ✅    | 10/10 |
| socket            | N/A        | N/A     | N/A       | N/A      | ✅        | ✅           | ✅    | 10/10 |
| dashboard         | ✅         | ✅      | ✅        | N/A      | ✅        | ✅           | ✅    | 9/10  |
| machine-models    | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| maintenance       | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |
| supply-chain      | ✅         | ✅      | ✅        | ✅       | ✅        | ✅           | ✅    | 10/10 |

**Средний score: 8.8/10** (было 9.2 в v2 — снижение из-за более глубокой проверки multi-tenant и transactions)

---

## Что хорошо (подтверждено в v3)

- ✅ **0 TS ошибок** во всех 5 приложениях
- ✅ **1680 тестов** проходят (100% pass rate), +28 от v2
- ✅ Все 100 entity корректно наследуют `BaseEntity` с UUID PK
- ✅ 0 `console.log` в production API коде — используется `Logger`
- ✅ 0 `eager: true` relations — нет N+1 проблем через eager loading
- ✅ Все 62 модуля зарегистрированы в `app.module.ts`
- ✅ Circular dependencies managed through `forwardRef()`
- ✅ Soft delete via `@DeleteDateColumn()` через BaseEntity
- ✅ Password hashing: bcrypt с 12 rounds
- ✅ JWT_SECRET validation: throws on startup if not set
- ✅ `.env` and `.env.*` in `.gitignore`
- ✅ `SanitizePipe` для XSS prevention
- ✅ No SQL injection: all queries use parameterized TypeORM
- ✅ Payment signature verification: timing-safe comparison (все 3 провайдера)
- ✅ Inventory uses pessimistic locking + transactions for stock operations
- ✅ Fiscal/OFD integration complete
- ✅ Pagination present on majority of list endpoints
- ✅ Decimal/numeric types for monetary amounts
- ✅ `synchronize` properly gated by `NODE_ENV`
- ✅ K8s manifests: HPA, PDB, NetworkPolicies, Kustomize overlays
- ✅ 15 Prometheus alert rules, 5 Grafana dashboards
- ✅ Multi-stage Docker builds with non-root users

---

## План действий

### Неделя 1: P0 блокеры (7.5h)

| День | Задача                                                                                                    | Часы |
| ---- | --------------------------------------------------------------------------------------------------------- | ---- |
| Пн   | P0-001: Storage tenant isolation — добавить `organizationId` в ключи файлов, проверку в upload/get/delete | 4h   |
| Пн   | P0-003: K8s backup-cronjob `DB_USERNAME` → `DB_USER`                                                      | 0.5h |
| Вт   | P0-002: Loyalty `spendPoints()` — обернуть в `dataSource.transaction()`                                   | 3h   |

### Неделя 2: P1 Security + Data Integrity (16h)

| День | Задача                                                                                    | Часы |
| ---- | ----------------------------------------------------------------------------------------- | ---- |
| Пн   | P1-001 + P1-002: Web auth fix (token key + cookie)                                        | 2h   |
| Пн   | P1-003: Payment webhook pessimistic locking                                               | 4h   |
| Вт   | P1-004: Users DTO — запретить role=owner через custom validator                           | 2h   |
| Вт   | P1-005: telegram-payments @Roles()                                                        | 0.5h |
| Ср   | P1-006,007,008: Multi-tenant findById fixes (purchase-history, reconciliation, locations) | 3h   |
| Ср   | P1-009: Replace `@Body() dto: any` with proper DTOs                                       | 3h   |
| Чт   | P1-014: Replace 24 bare `throw new Error()`                                               | 2h   |

### Неделя 3: P1 Transactions + Infra (10.5h)

| День | Задача                                     | Часы |
| ---- | ------------------------------------------ | ---- |
| Пн   | P1-010: Orders createOrder transaction     | 3h   |
| Пн   | P1-011: Billing service transaction        | 2h   |
| Вт   | P1-012: PromoCode redemption transaction   | 2h   |
| Вт   | P1-013: Fix 5 broken @Index decorators     | 1h   |
| Ср   | P1-015: Bot K8s probe port fix             | 0.5h |
| Ср   | P1-016: Docker healthchecks for API/Client | 0.5h |
| Ср   | P1-017: ConfigMap missing STORAGE_ENDPOINT | 0.5h |
| Ср   | P1-018: Staging deploy SHA tagging         | 1h   |

### Неделя 4+: P2 Улучшения (бэклог, prioritized)

1. P2-004: Mobile i18n (8h) — обязательно для Uzbekistan market
2. P2-008: Real payment refunds (8h) — нужен для production
3. P2-009: Report pagination/streaming (4h) — memory safety
4. P2-001: Reduce `any` types (20h) — постепенно
5. P2-002: Split giant files (16h) — постепенно
6. P2-003: Entity snake_case cleanup (8h) — consistency
7. Остальные P2: по приоритету

---

## Трудозатраты

| Приоритет | Часы    | Задач  | Описание       |
| --------- | ------- | ------ | -------------- |
| P0        | 7.5     | 3      | Блокеры деплоя |
| P1        | 26.5    | 18     | До релиза      |
| P2        | 81      | 19     | Бэклог         |
| **Итого** | **115** | **40** |                |

### Сравнение с v2

| Метрика            | v2 итого       | v3 итого |
| ------------------ | -------------- | -------- |
| P0 задач (open)    | 0              | 3        |
| P1 задач (open)    | 0              | 18       |
| P2 задач (open)    | 24             | 19       |
| Общая трудоёмкость | ~40h (P2 only) | ~115h    |

**Вывод:** v2 успешно закрыл поверхностные проблемы. v3 обнаружил глубинные проблемы безопасности и data integrity, которые v2 не проверял (транзакционность, TOCTOU races, tenant isolation на уровне бизнес-логики, privilege escalation через DTOs).

### Рекомендация

**НЕ деплоить до закрытия всех P0** (7.5 часов работы). P1 можно деплоить в staging, но НЕ в production до закрытия хотя бы security P1 (P1-001 через P1-009).

---

_Аудит выполнен с использованием параллельных агентов для фаз 3-10. Каждая находка подтверждена чтением реального кода._
