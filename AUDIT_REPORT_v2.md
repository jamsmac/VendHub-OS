# VendHub OS — Полный Аудит Проекта v2

## Дата: 2026-02-18

---

## 1. Executive Summary

| Метрика                           | Значение   |
| --------------------------------- | ---------- |
| **Общая готовность к production** | **68/100** |
| **Критические блокеры (P0)**      | **8**      |
| **Серьёзные проблемы (P1)**       | **22**     |
| **Улучшения (P2)**                | **35+**    |

### Вердикт: **NEEDS WORK** — требуется 2-3 недели доработки для production-ready

**Что хорошо:**

- TypeScript компилируется без ошибок во всех 5 приложениях
- 1652 unit-теста проходят (63 test suites, 100% pass rate)
- Все 60 API модулей зарегистрированы в app.module.ts
- 190 из 193 entities корректно наследуют BaseEntity
- 646 индексов БД, хорошая пагинация
- K8s манифесты комплексные: NetworkPolicies, HPA, PDB, Kustomize overlays
- Мониторинг стек полностью спроектирован: 15 alert rules, 5 Grafana dashboards

**Критические проблемы:**

- Mobile auth полностью сломан (несовпадение ключей токенов)
- Bot API интеграция сломана (отсутствует `/api/v1` prefix)
- Shared package (`@vendhub/shared`) написан но не используется ни одним приложением
- Prometheus не может собирать метрики (auth + неправильный path)
- ~80+ API endpoints доступны любому аутентифицированному пользователю без @Roles()

---

## 2. Scorecard по приложениям

| App        | Build | TS Errors | ESLint           | Tests       | Security | API Coverage    | Score      |
| ---------- | ----- | --------- | ---------------- | ----------- | -------- | --------------- | ---------- |
| **API**    | ✅    | 0         | 0 err / 252 warn | 1652 passed | ⚠️       | 100%            | **8.5/10** |
| **Web**    | ✅    | 0         | 0 err / 26 warn  | N/A         | ⚠️       | ~95%            | **7/10**   |
| **Client** | ✅    | 0         | 0 err / 10 warn  | N/A         | ✅       | ~90%            | **7.5/10** |
| **Bot**    | ✅    | 0         | 0 err / 14 warn  | 0           | ❌ P0    | **0%** (broken) | **3/10**   |
| **Mobile** | ⚠️    | 0         | N/A              | 0           | ❌ P0    | **0%** (broken) | **2/10**   |
| **Infra**  | —     | —         | —                | —           | ⚠️       | —               | **6/10**   |
| **Shared** | ✅    | 0         | —                | 0           | —        | **0%** (unused) | **1/10**   |

---

## 3. Build Health Summary (Фаза 1)

| App    | TS Errors | ESLint Errors | ESLint Warnings         | Build              | Tests                  |
| ------ | --------- | ------------- | ----------------------- | ------------------ | ---------------------- |
| API    | 0         | 0             | 252 (`no-explicit-any`) | ✅ `nest build`    | 63 suites, 1652 passed |
| Web    | 0         | 0             | 26 (`no-explicit-any`)  | ✅ Next.js static  | N/A                    |
| Client | 0         | 0             | 10 (`no-explicit-any`)  | ✅ Vite (624KB js) | N/A                    |
| Bot    | 0         | 0             | 14 (`no-explicit-any`)  | ✅ `tsc`           | 0 (skipped)            |
| Mobile | 0         | N/A           | N/A                     | ⚠️ missing assets  | 0 (skipped)            |

**Примечание:** Client PWA bundle 624KB — выше лимита 500KB. Рекомендуется code splitting.

---

## 4. Критические проблемы (P0) — ИСПРАВИТЬ НЕМЕДЛЕННО

### P0-001: Mobile auth полностью сломан — несовпадение ключей токенов

- **Где:** `apps/mobile/src/stores/authStore.ts` vs `apps/mobile/src/services/api.ts`
- **Что:** authStore сохраняет токены с ключами `vendhub_access_token` (underscores), api service читает из `vendhub-access-token` (hyphens). API interceptor никогда не найдёт сохранённый токен.
- **Последствия:** После логина ни один API запрос не работает — приложение полностью нефункционально
- **Как исправить:** Унифицировать ключи (использовать `vendhub_access_token` везде)
- **Оценка:** 0.5 часа

### P0-002: Bot API URL без `/api/v1` prefix

- **Где:** `apps/bot/src/utils/api.ts`
- **Что:** Bot API client использует `config.apiUrl` напрямую (e.g., `http://localhost:4000`) без `/api/v1` prefix. Все NestJS endpoints имеют prefix `/api/v1`.
- **Последствия:** Каждый API вызов бота возвращает 404. Все функции бота сломаны.
- **Как исправить:** Изменить `baseURL` на `` `${config.apiUrl}/api/v1` ``
- **Оценка:** 0.5 часа

### P0-003: Mobile assets directory missing

- **Где:** `apps/mobile/app.json` references `./assets/icon.png`, `./assets/splash.png`, etc.
- **Что:** Директория `assets/` не существует. app.json ссылается на 6 файлов ассетов.
- **Последствия:** Build приложения упадёт.
- **Как исправить:** Создать `assets/` и добавить icon.png, splash.png, adaptive-icon.png, notification-icon.png, notification.wav, favicon.png
- **Оценка:** 1 час

### P0-004: `@vendhub/shared` package не используется ни одним приложением

- **Где:** `packages/shared/` — 14 type modules, 3 constant modules, 5 utility modules
- **Что:** Ни один `package.json` приложений не импортирует `@vendhub/shared`. Grep по `from '@vendhub/shared'` — 0 результатов. Каждое приложение дублирует типы локально.
- **Последствия:** Типы не синхронизированы между frontend и backend. Баги из-за рассогласования enum/interface.
- **Как исправить:** Добавить `@vendhub/shared` в dependencies всех apps, заменить локальные типы на shared
- **Оценка:** 8-12 часов

### P0-005: 3 entity не наследуют BaseEntity

- **Где:** `apps/api/src/modules/directories/entities/`
- **Что:** `DirectorySyncLog`, `DirectorySource`, `DirectoryEntryAudit` — без UUID PK, soft delete, audit fields
- **Последствия:** Нарушение обязательного правила проекта. Эти записи нельзя soft-delete, нет audit trail.
- **Как исправить:** Добавить `extends BaseEntity`, убрать дублирующие поля id/timestamps
- **Оценка:** 2 часа

### P0-006: expo-barcode-scanner в plugins но не в dependencies

- **Где:** `apps/mobile/app.json` plugins vs `package.json` dependencies
- **Что:** `expo-barcode-scanner` указан в app.json plugins, но отсутствует в package.json. BarcodeScanScreen использует `expo-camera`.
- **Последствия:** Build может упасть из-за orphaned plugin reference.
- **Как исправить:** Удалить `expo-barcode-scanner` из app.json plugins (используется expo-camera)
- **Оценка:** 0.5 часа

### P0-007: google-services.json missing для Android

- **Где:** `apps/mobile/app.json` → `"googleServicesFile": "./google-services.json"`
- **Что:** Файл не существует в репозитории. Нужен для Firebase/push notifications.
- **Последствия:** Android push notifications и Firebase не работают.
- **Как исправить:** Получить файл из Firebase Console и добавить
- **Оценка:** 0.5 часа

### P0-008: Mobile ClientHomeScreen navigates to undefined routes

- **Где:** `apps/mobile/src/screens/client/ClientHomeScreen.tsx`
- **Что:** `navigation.navigate("QRScanner")`, `navigation.navigate("Orders")`, `navigation.navigate("Help")` — эти маршруты не существуют в `ClientStackParamList`
- **Последствия:** Runtime crash при нажатии кнопок
- **Как исправить:** Добавить маршруты в ClientNavigator или изменить navigation targets
- **Оценка:** 1 час

---

## 5. Серьёзные проблемы (P1) — ИСПРАВИТЬ ДО РЕЛИЗА

### P1-001: ~80+ endpoints без @Roles() — доступны любому пользователю

- **Где:** favorites (16), notifications (11), loyalty (6), transactions (7), quests (4), referrals (5), recommendations (3), promo-codes (1), client (7), geo (5), references (13), achievements (4)
- **Что:** RolesGuard возвращает `true` при отсутствии @Roles() metadata. Любой аутентифицированный пользователь (даже viewer) может модифицировать данные.
- **Как исправить:** Добавить @Roles() декораторы. Для user-scoped endpoints (favorites, notifications) — минимум `@Roles('viewer')`. Для admin (recommendations) — `@Roles('admin', 'owner')`.
- **Оценка:** 6-8 часов

### P1-002: Prometheus не может собирать метрики

- **Где:** `apps/api/src/modules/monitoring/monitoring.controller.ts` + `infrastructure/k8s/base/api-deployment.yml` + `infrastructure/monitoring/prometheus/prometheus.yml`
- **Что:** Metrics endpoint `/monitoring/metrics` требует JWT auth (@Roles('admin','owner')). K8s annotation указывает на `/metrics` (wrong path). Prometheus не может аутентифицироваться.
- **Как исправить:** 1) Добавить @Public() на metrics endpoint, или 2) Создать отдельный `/metrics` endpoint без auth, или 3) Использовать ServiceMonitor с bearer token
- **Оценка:** 2 часа

### P1-003: Hard delete в ai-parser.service.ts

- **Где:** `apps/api/src/modules/integrations/services/ai-parser.service.ts:319`
- **Что:** `.remove()` вместо `.softRemove()`. Единственный случай hard delete entity.
- **Как исправить:** Заменить `.remove()` на `.softRemove()`
- **Оценка:** 0.5 часа

### P1-004: CASCADE на User relations

- **Где:** `favorites/entities/favorite.entity.ts:33`, `achievements/entities/user-achievement.entity.ts:24`, `quests/entities/user-quest.entity.ts:26`
- **Что:** `onDelete: "CASCADE"` — удаление User каскадирует все favorites, achievements, quests
- **Как исправить:** Изменить на `onDelete: "SET NULL"` + создать миграцию
- **Оценка:** 2 часа

### P1-005: loyalty `/levels/info` без @Public()

- **Где:** `apps/api/src/modules/loyalty/loyalty.controller.ts:250-257`
- **Что:** Endpoint комментирован как "public" но не имеет @Public() декоратора — требует JWT
- **Как исправить:** Добавить `@Public()` декоратор
- **Оценка:** 0.25 часа

### P1-006: Bot state machine написан но не используется

- **Где:** `apps/bot/src/states/index.ts`
- **Что:** StateMachine class с transition validation и timeouts определён, но handlers обходят его, напрямую устанавливая `ctx.session.step`
- **Как исправить:** Рефакторинг handlers для использования StateMachine.transition()
- **Оценка:** 4 часа

### P1-007: Bot health endpoint отсутствует в polling mode

- **Где:** `apps/bot/Dockerfile` (healthcheck) vs bot source
- **Что:** Dockerfile проверяет `http://localhost:3001/health`, но бот в polling mode не запускает HTTP сервер.
- **Как исправить:** Добавить Express/Fastify HTTP server для health endpoint
- **Оценка:** 1 час

### P1-008: Bot mixed Russian/transliterated text

- **Где:** `apps/bot/src/handlers/commands.ts`, `callbacks.ts`
- **Что:** Trip-related messages используют ASCII транслитерацию ("Pozhalujsta, zaregistrirujtes'"), остальное — кириллица
- **Как исправить:** Перевести все сообщения в кириллицу
- **Оценка:** 2 часа

### P1-009: Mobile Expo SDK mismatch

- **Где:** `apps/mobile/package.json`
- **Что:** Expo SDK `~50.0.0` (CLAUDE.md: 52), React `18.2.0` (CLAUDE.md: 19), Zustand `^4.4.7` (CLAUDE.md: 5)
- **Как исправить:** Обновить до Expo 52 + React 19 + Zustand 5
- **Оценка:** 4-6 часов

### P1-010: Notification delete без ownership check

- **Где:** `apps/api/src/modules/notifications/notifications.controller.ts`
- **Что:** `DELETE /:id` не проверяет что notification принадлежит запрашивающему пользователю
- **Как исправить:** Добавить проверку `notification.userId === req.user.id`
- **Оценка:** 0.5 часа

### P1-011: Raw SQL в trips service

- **Где:** `apps/api/src/modules/trips/trips.service.ts:581,637`
- **Что:** Raw SQL SELECT queries. Параметризованы (безопасно), но должны быть TypeORM QueryBuilder.
- **Оценка:** 2 часа

### P1-012: CI integration test = unit test

- **Где:** `.github/workflows/ci.yml`
- **Что:** Integration test job запускает ту же команду что и unit test (`pnpm --filter api test`). Нет реального разделения.
- **Оценка:** 2 часа

### P1-013: Staging deploy использует dev compose

- **Где:** `.github/workflows/ci.yml:498`
- **Что:** Staging deploy запускает `docker compose up -d` (dev compose) вместо `docker-compose.prod.yml`
- **Оценка:** 0.5 часа

### P1-014: Bot missing from dev docker-compose.yml

- **Где:** `docker-compose.yml`
- **Что:** Bot service определён в `docker-compose.prod.yml`, но отсутствует в dev compose
- **Оценка:** 0.5 часа

### P1-015: Environment variable name mismatch (S3)

- **Где:** `apps/api/.env.example` (S3*\*) vs `docker-compose.yml` (STORAGE*\*)
- **Что:** API ожидает `S3_ENDPOINT`, compose передаёт `STORAGE_ENDPOINT`
- **Оценка:** 1 час

### P1-016: Environment variable name mismatch (DB_USER)

- **Где:** K8s secrets template (`DB_USERNAME`) vs API/compose (`DB_USER`)
- **Что:** K8s deployment будет иметь неправильное имя переменной — DB connection fail
- **Оценка:** 0.5 часа

### P1-017: Bot PDB minAvailable=1 с replicas=1

- **Где:** `infrastructure/k8s/base/bot-deployment.yml`
- **Что:** PDB `minAvailable: 1` с `replicas: 1` + `strategy: Recreate` блокирует node drain
- **Оценка:** 0.25 часа

### P1-018: `technician` role в @Roles() но не в enum

- **Где:** maintenance, storage, work-logs controllers
- **Что:** `@Roles('technician', ...)` но `technician` нет в 7 определённых RBAC ролях
- **Оценка:** 1 час

### P1-019: Bot confirm_points_payment callback not registered

- **Где:** `apps/bot/src/handlers/callbacks.ts:382`
- **Что:** Создаёт `confirm_points_payment` callback_data, но handler не зарегистрирован
- **Оценка:** 0.5 часа

### P1-020: Mobile — 5 missing client screens

- **Где:** `apps/mobile/src/screens/client/`
- **Что:** Нет Payment, Order History, Achievements, Promo Code, Referral screens
- **Оценка:** 8-12 часов

### P1-021: Bot/Mobile — zero tests

- **Где:** `apps/bot/`, `apps/mobile/`
- **Что:** Ни одного теста. Bot: `echo "No tests" && exit 0`. Mobile: `--passWithNoTests`
- **Оценка:** 8-12 часов

### P1-022: Redis exporter без пароля

- **Где:** `infrastructure/monitoring/docker-compose.monitoring.yml:189`
- **Что:** Redis exporter подключается к `redis://redis:6379` без auth
- **Оценка:** 0.25 часа

---

## 6. Backend Compliance Matrix (60 API модулей)

| #   | Module            | Structure | BaseEntity | UUID | Validators | Swagger | SoftDel | MultiTenant | Guards | Reg | Score |
| --- | ----------------- | --------- | ---------- | ---- | ---------- | ------- | ------- | ----------- | ------ | --- | ----- |
| 1   | achievements      | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 2   | ai                | ✅        | —          | —    | ✅         | ✅      | —       | ✅          | ✅     | ✅  | 10/10 |
| 3   | alerts            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 4   | audit             | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 5   | auth              | ✅        | —          | —    | ✅         | ✅      | —       | ✅          | ✅     | ✅  | 10/10 |
| 6   | billing           | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 7   | bull-board        | ✅        | —          | —    | —          | ✅      | —       | —           | ✅     | ✅  | 10/10 |
| 8   | client            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 9   | complaints        | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 10  | contractors       | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 11  | directories       | ✅        | **❌**     | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 8/10  |
| 12  | employees         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 13  | equipment         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 14  | favorites         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ⚠️          | **❌** | ✅  | 7/10  |
| 15  | fiscal            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 16  | geo               | ✅        | —          | —    | ✅         | ✅      | —       | ✅          | ⚠️     | ✅  | 9/10  |
| 17  | health            | ✅        | —          | —    | —          | ✅      | —       | —           | —      | ✅  | 10/10 |
| 18  | import            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 19  | incidents         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 20  | integrations      | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 21  | inventory         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 22  | locations         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 23  | loyalty           | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 24  | machine-access    | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 25  | machines          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 26  | maintenance       | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 27  | material-requests | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 28  | monitoring        | ✅        | —          | —    | ✅         | ✅      | —       | —           | ✅     | ✅  | 10/10 |
| 29  | notifications     | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 30  | opening-balances  | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 31  | operator-ratings  | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 32  | orders            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 33  | organizations     | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 34  | payments          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 35  | products          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 36  | promo-codes       | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 37  | purchase-history  | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 38  | quests            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 39  | rbac              | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 40  | recommendations   | ✅        | —          | —    | ✅         | ✅      | —       | ✅          | **❌** | ✅  | 8/10  |
| 41  | reconciliation    | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 42  | references        | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | —           | ⚠️     | ✅  | 9/10  |
| 43  | referrals         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 44  | reports           | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 45  | routes            | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 46  | sales-import      | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 47  | security          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 48  | settings          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 49  | storage           | ✅        | —          | —    | ✅         | ✅      | —       | ✅          | ✅     | ✅  | 10/10 |
| 50  | tasks             | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 51  | telegram-bot      | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 52  | telegram-payments | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 53  | transactions      | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ⚠️     | ✅  | 9/10  |
| 54  | trips             | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 55  | users             | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 56  | vehicles          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 57  | warehouse         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 58  | webhooks          | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |
| 59  | websocket         | ✅        | —          | —    | —          | —       | —       | ✅          | —      | ✅  | 8/10  |
| 60  | work-logs         | ✅        | ✅         | ✅   | ✅         | ✅      | ✅      | ✅          | ✅     | ✅  | 10/10 |

**Средний балл:** 9.6/10 — Отличное соответствие стандартам API.

---

## 7. Web Admin Dashboard Pages (Фаза 3)

Build output подтверждает наличие 35+ dashboard pages:

| Page                                | Exists | API Integration | Status |
| ----------------------------------- | ------ | --------------- | ------ |
| /dashboard (overview)               | ✅     | ✅              | OK     |
| /dashboard/audit                    | ✅     | ✅              | OK     |
| /dashboard/complaints               | ✅     | ✅              | OK     |
| /dashboard/contractors              | ✅     | ✅              | OK     |
| /dashboard/directories              | ✅     | ✅              | OK     |
| /dashboard/employees                | ✅     | ✅              | OK     |
| /dashboard/equipment                | ✅     | ✅              | OK     |
| /dashboard/fiscal                   | ✅     | ✅              | OK     |
| /dashboard/import                   | ✅     | ✅              | OK     |
| /dashboard/integrations             | ✅     | ✅              | OK     |
| /dashboard/inventory                | ✅     | ✅              | OK     |
| /dashboard/locations                | ✅     | ✅              | OK     |
| /dashboard/loyalty (+ sub-pages)    | ✅     | ✅              | OK     |
| /dashboard/machines                 | ✅     | ✅              | OK     |
| /dashboard/maintenance              | ✅     | ✅              | OK     |
| /dashboard/map                      | ✅     | ✅              | OK     |
| /dashboard/material-requests        | ✅     | ✅              | OK     |
| /dashboard/notifications            | ✅     | ✅              | OK     |
| /dashboard/orders                   | ✅     | ✅              | OK     |
| /dashboard/payments                 | ✅     | ✅              | OK     |
| /dashboard/products                 | ✅     | ✅              | OK     |
| /dashboard/reconciliation           | ✅     | ✅              | OK     |
| /dashboard/reports                  | ✅     | ✅              | OK     |
| /dashboard/routes (+ builder, [id]) | ✅     | ✅              | OK     |
| /dashboard/settings                 | ✅     | ✅              | OK     |
| /dashboard/tasks                    | ✅     | ✅              | OK     |
| /dashboard/transactions             | ✅     | ✅              | OK     |
| /dashboard/trips (+ tracker, [id])  | ✅     | ✅              | OK     |
| /dashboard/users (+ new, [id])      | ✅     | ✅              | OK     |
| /dashboard/work-logs                | ✅     | ✅              | OK     |

Все использют `@tanstack/react-query`, `shadcn/ui` components, Russian localization, proper loading/error states.

---

## 8. Client PWA Pages (Фаза 4)

Build: ✅ (Vite + PWA Service Worker generated)

| Feature                     | Status                      |
| --------------------------- | --------------------------- |
| manifest.webmanifest        | ✅ Generated                |
| Service Worker (sw.js)      | ✅ Generated                |
| Precache (5 entries, 667KB) | ✅                          |
| i18n (ru, uz, en)           | ✅ ~1100 keys per language  |
| Bundle size                 | ⚠️ 624KB (over 500KB limit) |

---

## 9. Mobile App (Фаза 5)

| Metric              | Value                                                        |
| ------------------- | ------------------------------------------------------------ |
| Screens implemented | 28 (15 staff + 13 client)                                    |
| Missing screens     | 5 (Payment, OrderHistory, Achievements, PromoCode, Referral) |
| Navigation          | React Navigation (dual client/staff modes)                   |
| Auth                | expo-secure-store (BUT key mismatch — P0-001)                |
| Native modules      | Camera, Location, Notifications, Image Picker, Secure Store  |
| Build ready         | ❌ Missing assets, google-services.json, outdated SDK        |
| Tests               | 0                                                            |

---

## 10. Bot App (Фаза 6)

| Metric              | Value                                 |
| ------------------- | ------------------------------------- |
| Commands registered | 22                                    |
| Callback handlers   | 40+                                   |
| Session management  | Redis-backed, 24h TTL                 |
| Rate limiting       | 30 req/min per user                   |
| Webhook support     | ✅ with secret validation             |
| API integration     | ❌ BROKEN (missing /api/v1 prefix)    |
| State machine       | Written but not used                  |
| Tests               | 0                                     |
| Localization        | Mixed Russian + ASCII transliteration |

---

## 11. Infrastructure (Фаза 7)

### Docker

| Item                    | Status                              |
| ----------------------- | ----------------------------------- |
| Dockerfiles (5/6 apps)  | ✅ Multi-stage, non-root, dumb-init |
| docker-compose.yml      | ⚠️ Bot missing                      |
| docker-compose.prod.yml | ✅ Complete                         |
| .dockerignore           | ⚠️ Missing `node_modules` exclusion |

### Kubernetes

| Item                     | Count/Status                   |
| ------------------------ | ------------------------------ |
| Deployments/StatefulSets | 7                              |
| Services                 | 7                              |
| Ingress (5 hosts)        | ✅                             |
| HPA                      | 4/7                            |
| PDB                      | 6 (bot has problematic config) |
| NetworkPolicies          | 7 + default deny               |
| Probes                   | ✅ (except bot)                |
| Kustomize overlays       | staging + production           |
| Helm chart               | ✅                             |
| Terraform                | ✅                             |

### CI/CD

| Step                | Status                    |
| ------------------- | ------------------------- |
| Lint + type-check   | ✅                        |
| Unit tests          | ✅                        |
| Integration tests   | ⚠️ Same as unit tests     |
| E2E (Playwright)    | ⚠️ Only API, no frontends |
| Docker build + push | ✅ (3/5 images)           |
| Trivy scan          | ⚠️ Only API + Web         |
| Staging deploy      | ⚠️ Uses dev compose       |
| Production deploy   | ✅ With backup + rollback |

### Monitoring

| Component               | Status                                       |
| ----------------------- | -------------------------------------------- |
| Prometheus              | ⚠️ Config exists but metrics endpoint broken |
| Grafana (5 dashboards)  | ✅                                           |
| Alertmanager (15 rules) | ✅                                           |
| Loki + Promtail         | ✅                                           |

---

## 12. Security Findings

### Высокий риск

| #    | Finding                                                         |
| ---- | --------------------------------------------------------------- |
| S-01 | ~80+ endpoints без @Roles() — any auth user can access (P1-001) |
| S-02 | `technician` role in @Roles() не существует в enum (P1-018)     |
| S-03 | Notification DELETE без ownership check (P1-010)                |

### Средний риск

| #    | Finding                                                          |
| ---- | ---------------------------------------------------------------- |
| S-04 | 67 CASCADE relations (некоторые должны быть SET NULL)            |
| S-05 | Raw SQL queries в trips service (параметризованы, но рискованно) |
| S-06 | 1 hard delete (.remove()) в ai-parser.service                    |
| S-07 | Bot referral link утекает bot token prefix                       |

### Низкий риск

| #    | Finding                                                 |
| ---- | ------------------------------------------------------- | --- | ------ |
| S-08 | 252 ESLint `any` warnings                               |
| S-09 | `pnpm audit` soft-failed в CI (`                        |     | true`) |
| S-10 | Grafana default admin/admin credentials                 |
| S-11 | K8s secrets as plain YAML templates (no Sealed Secrets) |

---

## 13. Performance Issues

### Backend

| Issue              | Location                                                     |
| ------------------ | ------------------------------------------------------------ |
| N+1 query          | `trips.service.ts:631-648` — sequential task queries in loop |
| Missing pagination | `favorites.service.ts` — returns all records                 |

### Frontend

| Issue       | Location                                                   |
| ----------- | ---------------------------------------------------------- |
| Bundle size | Client PWA 624KB (over 500KB limit) — needs code splitting |

### Database

| Metric                | Value                                        |
| --------------------- | -------------------------------------------- |
| Indexes               | 646 @Index() decorators — excellent coverage |
| Connection pool       | 20 max, 10/30s timeouts — good               |
| Slow query monitoring | 1000ms threshold — good                      |

---

## 14. План действий (Prioritized Action Plan)

### Неделя 1 (P0 — блокеры) — 20-24 часа

| #   | Задача                                               | Оценка |
| --- | ---------------------------------------------------- | ------ |
| 1   | Fix mobile token key mismatch (P0-001)               | 0.5ч   |
| 2   | Fix bot API URL prefix (P0-002)                      | 0.5ч   |
| 3   | Create mobile assets directory (P0-003)              | 1ч     |
| 4   | Fix directory entities to extend BaseEntity (P0-005) | 2ч     |
| 5   | Fix expo-barcode-scanner plugin reference (P0-006)   | 0.5ч   |
| 6   | Add google-services.json (P0-007)                    | 0.5ч   |
| 7   | Fix ClientHomeScreen navigation routes (P0-008)      | 1ч     |
| 8   | Integrate @vendhub/shared across all apps (P0-004)   | 12ч    |
| 9   | Fix Prometheus metrics auth + path (P1-002)          | 2ч     |

### Неделя 2 (P1 — важное) — 30-35 часов

| #   | Задача                                              | Оценка |
| --- | --------------------------------------------------- | ------ |
| 1   | Add @Roles() to ~80 endpoints (P1-001)              | 8ч     |
| 2   | Fix CASCADE → SET NULL on User relations (P1-004)   | 2ч     |
| 3   | Fix hard delete in ai-parser (P1-003)               | 0.5ч   |
| 4   | Add bot health HTTP endpoint (P1-007)               | 1ч     |
| 5   | Fix bot text transliteration (P1-008)               | 2ч     |
| 6   | Fix env variable naming mismatches (P1-015, P1-016) | 1.5ч   |
| 7   | Fix staging deploy compose file (P1-013)            | 0.5ч   |
| 8   | Add bot to dev compose (P1-014)                     | 0.5ч   |
| 9   | Fix bot state machine usage (P1-006)                | 4ч     |
| 10  | Fix bot PDB config (P1-017)                         | 0.25ч  |
| 11  | Fix loyalty @Public() (P1-005)                      | 0.25ч  |
| 12  | Fix notification ownership check (P1-010)           | 0.5ч   |
| 13  | Separate integration tests in CI (P1-012)           | 2ч     |
| 14  | Fix technician role (P1-018)                        | 1ч     |
| 15  | Fix bot confirm_points_payment callback (P1-019)    | 0.5ч   |
| 16  | Upgrade Mobile Expo SDK 50→52 (P1-009)              | 6ч     |

### Неделя 3-4 (P1 continued + P2) — 30-40 часов

| #   | Задача                                          | Оценка |
| --- | ----------------------------------------------- | ------ |
| 1   | Create 5 missing mobile client screens (P1-020) | 12ч    |
| 2   | Write bot + mobile tests (P1-021)               | 12ч    |
| 3   | Code split Client PWA bundle                    | 2ч     |
| 4   | Add node_modules to .dockerignore               | 0.25ч  |
| 5   | Fix Redis exporter auth (P1-022)                | 0.25ч  |
| 6   | Remove `any` types (252 warnings)               | 4ч     |
| 7   | Add i18n to Web admin                           | 8ч     |
| 8   | Review and fix 67 CASCADE relations             | 4ч     |

### Общая оценка: **80-100 человеко-часов** (2-3 недели для 1 разработчика)

---

## 15. Статистика проекта

| Метрика               | Значение    |
| --------------------- | ----------- |
| API модулей           | 60          |
| Entity классов        | 193         |
| API endpoints (прим.) | ~838        |
| Test suites           | 63          |
| Unit tests            | 1652        |
| DB indexes            | 646         |
| Web dashboard pages   | 35+         |
| Client PWA pages      | 22          |
| Mobile screens        | 28          |
| Bot commands          | 22          |
| Bot callbacks         | 40+         |
| K8s manifests         | 17+         |
| Grafana dashboards    | 5           |
| Alert rules           | 15          |
| Shared type modules   | 14 (unused) |
| Docker images         | 5           |
| CI/CD jobs            | 8           |

---

## 16. Рекомендации по архитектуре

### Что хорошо (сохранить)

1. **API architecture** — 60 модулей следуют единому паттерну, 9.6/10 compliance
2. **BaseEntity pattern** — 190/193 entities корректны, UUID + soft delete + audit
3. **Global guard chain** — ThrottlerGuard → CsrfGuard → JwtAuthGuard → RolesGuard → OrganizationGuard
4. **Test coverage** — 1652 unit tests, 100% pass rate
5. **K8s infrastructure** — NetworkPolicies, HPA, PDB, probes, init containers
6. **Monitoring design** — Prometheus + Grafana + Loki + Alertmanager с business alerts
7. **Client PWA** — i18n (3 languages), Service Worker, proper state management
8. **Dual-mode mobile** — Staff/Client navigation separation is architecturally sound

### Что изменить

1. **Shared package integration** — P0 priority, eliminate type duplication
2. **@Roles() consistency** — Standardize on enum, not string literals
3. **CI pipeline** — Separate unit/integration/E2E properly
4. **Mobile SDK** — Upgrade from Expo 50 to 52, React 19, Zustand 5
5. **Bot API client** — Fix URL prefix, wire state machine

### Что добавить

1. **Sealed Secrets / External Secrets** — для production K8s
2. **Bot HTTP health server** — для K8s probes в polling mode
3. **Mobile offline support** — React Query AsyncStorage persistence
4. **Web admin i18n** — ru/uz/en localization
5. **E2E tests** — Full-stack with Playwright (API + Web + Client)
6. **Bundle analysis** — Webpack/Vite bundle analyzer для Client PWA
