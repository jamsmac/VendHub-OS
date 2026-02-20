# Промт: Исправление 100% находок аудита v3

> Скопируйте этот промт целиком в новую сессию Claude Code. Работа разделена на 6 батчей, выполняемых последовательно.

---

## Контекст

Ты исправляешь **ВСЕ 40 находок** из `AUDIT_REPORT_v3.md`. Прочитай `CLAUDE.md` для понимания архитектуры и конвенций проекта.

**Правила:**

1. После КАЖДОГО батча — запускай `npx tsc --noEmit` для API, Web, Client, Bot, Mobile. Ноль TS ошибок обязателен.
2. После батчей 1-3 — запускай `npx jest --passWithNoTests --forceExit` в API. Все 1680+ тестов должны проходить.
3. Не ломай существующие тесты и интерфейсы.
4. Каждый батч — отдельный коммит с осмысленным описанием.
5. Используй параллельных агентов где задачи независимы.
6. **camelCase** entity properties — SnakeNamingStrategy конвертирует в snake_case. `@JoinColumn({ name: "db_column" })` — НЕ менять.

---

## Батч 1: P0 — Блокеры деплоя (3 задачи)

### P0-001: Storage tenant isolation

**Файл:** `apps/api/src/modules/storage/storage.service.ts`

**Что сделать:**

1. Все методы (`uploadFile`, `getFileUrl`, `deleteFile`, `getFileMetadata`) должны принимать `organizationId: string` параметр
2. Ключи файлов должны иметь prefix `org/${organizationId}/` — чтобы файлы физически разделены по организациям
3. В `getFileUrl` и `deleteFile` проверять что ключ файла начинается с `org/${organizationId}/` — иначе `throw new ForbiddenException('Access denied to this file')`
4. В контроллере (`storage.controller.ts`) передавать `organizationId` из `@CurrentOrganizationId()`
5. Для обратной совместимости: если файл без prefix — считать его legacy и разрешать только owner/admin

### P0-002: Loyalty spendPoints() — transaction

**Файл:** `apps/api/src/modules/loyalty/loyalty.service.ts`

**Что сделать:**

1. Inject `DataSource` в конструктор `LoyaltyService`
2. Метод `spendPoints()` (строки ~294-365) обернуть в `this.dataSource.transaction(async (manager) => { ... })`
3. Внутри транзакции использовать `manager.getRepository(...)` вместо `this.*Repo`
4. Добавить pessimistic lock на user record: `manager.findOne(User, { where: { id: userId }, lock: { mode: "pessimistic_write" } })`
5. Также проверить `earnPoints()` и `deductFromOldestTransactions()` — если они вызываются отдельно, тоже обернуть
6. Обновить тесты в `loyalty.service.spec.ts` — mock `DataSource` и `manager`

### P0-003: K8s backup-cronjob DB_USERNAME → DB_USER

**Файл:** `infrastructure/k8s/base/backup-cronjob.yml`

**Что сделать:**

1. Строка 66: заменить `${DB_USERNAME}` на `${DB_USER}`
2. Строка 124: заменить `name: DB_USERNAME` на `name: DB_USER`
3. Проверить что `secretKeyRef.key` по-прежнему ссылается на правильный ключ в secrets

---

## Батч 2: P1 Security (9 задач)

### P1-001 + P1-002: Web auth token fix

**Файлы:**

- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/store/auth.ts`
- `apps/web/src/middleware.ts`

**Что сделать:**

1. В `apps/web/src/lib/api.ts` — заменить ключи localStorage:
   - `localStorage.getItem('accessToken')` → `localStorage.getItem('vendhub_access_token')`
   - `localStorage.getItem('refreshToken')` → `localStorage.getItem('vendhub_refresh_token')`
   - `localStorage.setItem('accessToken', ...)` → `localStorage.setItem('vendhub_access_token', ...)`
   - `localStorage.setItem('refreshToken', ...)` → `localStorage.setItem('vendhub_refresh_token', ...)`
   - `localStorage.removeItem('accessToken')` → `localStorage.removeItem('vendhub_access_token')`
   - `localStorage.removeItem('refreshToken')` → `localStorage.removeItem('vendhub_refresh_token')`
2. В `apps/web/src/lib/store/auth.ts` — в методе `login()` после записи в localStorage ТАКЖЕ устанавливать cookie:
   ```typescript
   document.cookie = `vendhub_access_token=${tokens.accessToken}; path=/; max-age=86400; SameSite=Lax`;
   ```
   В методе `logout()` удалять cookie:
   ```typescript
   document.cookie = "vendhub_access_token=; path=/; max-age=0";
   ```
3. В `apps/web/src/middleware.ts` — изменить имя cookie:
   - `request.cookies.get('accessToken')` → `request.cookies.get('vendhub_access_token')`
4. Удалить мёртвый код `apps/web/src/lib/api/client.ts` и `apps/web/src/lib/api/index.ts` (P2-006 заодно)

### P1-003: Payment webhook TOCTOU — pessimistic locking

**Файл:** `apps/api/src/modules/payments/payments.service.ts`

**Что сделать для КАЖДОГО из 3 обработчиков:**

1. **`paymePerformTransaction()` (~строки 366-430):**

   ```typescript
   return this.dataSource.transaction(async (manager) => {
     const txRepo = manager.getRepository(PaymentTransaction);
     const transaction = await txRepo.findOne({
       where: { id: transactionId },
       lock: { mode: "pessimistic_write" },
     });
     // ... existing logic but using txRepo.save() instead of this.paymentTransactionRepo.save()
   });
   ```

2. **`clickComplete()` (~строки 750-816):** — аналогично

3. **`handleUzumWebhook()` (~строки 916-994):** — аналогично

4. Убедиться что `DataSource` уже inject'ен в `PaymentsService` (если нет — добавить)
5. Обновить тесты — mock transaction manager

### P1-004: Privilege escalation — запрет owner role в DTO

**Файлы:**

- `apps/api/src/modules/users/dto/create-user.dto.ts`
- `apps/api/src/modules/users/users.service.ts`

**Что сделать:**

1. В `CreateUserDto` добавить custom validator на поле `role`:
   ```typescript
   @IsEnum(UserRole)
   @IsOptional()
   @Validate(NoOwnerRoleValidator) // или inline: @IsNotIn([UserRole.OWNER])
   role?: UserRole;
   ```
   Или проще — в `UsersService.create()` и `update()` добавить проверку:
   ```typescript
   if (dto.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
     throw new ForbiddenException("Only owners can assign owner role");
   }
   ```
2. Аналогично проверить в `update()` — admin не может повысить до owner

### P1-005: telegram-payments @Roles()

**Файл:** `apps/api/src/modules/telegram-payments/telegram-payments.controller.ts`

**Что сделать:**

1. Добавить `@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)` на уровне класса или на каждый endpoint
2. Убедиться что `@Roles` импортирован из `../../common/decorators/roles.decorator`
3. Webhook endpoint (если есть) может быть `@Public()` если вызывается Telegram

### P1-006, P1-007, P1-008: Multi-tenant findById

**Файлы:**

- `apps/api/src/modules/purchase-history/purchase-history.service.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/src/modules/locations/locations.service.ts`

**Что сделать в КАЖДОМ сервисе:**

1. Метод `findById(id)` или `findOne(id)` изменить на `findById(id, organizationId)`:
   ```typescript
   async findById(id: string, organizationId: string) {
     const entity = await this.repo.findOne({
       where: { id, organizationId },
     });
     if (!entity) throw new NotFoundException();
     return entity;
   }
   ```
2. Обновить контроллер — передавать `organizationId` из `@CurrentOrganizationId()`
3. Все методы `update()`, `delete()` также должны проверять `organizationId`

### P1-009: Replace @Body() dto: any

**Файлы и исправления:**

| Файл                                  | Endpoint         | Создать DTO                                               |
| ------------------------------------- | ---------------- | --------------------------------------------------------- |
| `employees.controller.ts:309`         | POST assign-task | `AssignTaskDto { taskId: string, employeeId: string }`    |
| `employees.controller.ts:347`         | POST bulk-assign | `BulkAssignDto { taskIds: string[], employeeId: string }` |
| `reports.controller.ts:70`            | POST generate    | `GenerateReportDto` (уже может существовать — проверить)  |
| `reports.controller.ts:168,226,269`   | PATCH updates    | `UpdateReportDto`                                         |
| `notifications.controller.ts:198`     | PATCH updates    | `UpdateNotificationDto`                                   |
| `notifications.controller.ts:297,312` | POST data        | `CreateNotificationDto` / `SendBulkNotificationDto`       |
| `tasks.controller.ts:340`             | POST data        | `TaskActionDto`                                           |
| `telegram-bot.controller.ts:64`       | POST webhook     | OK as-is (raw Telegram update, skip)                      |

Для каждого: создать DTO файл с `class-validator` декораторами, заменить `any` на typed DTO.

---

## Батч 3: P1 Data Integrity (5 задач)

### P1-010: Orders createOrder() — transaction

**Файл:** `apps/api/src/modules/orders/orders.service.ts`

**Что сделать:**

1. Inject `DataSource` в конструктор
2. Обернуть `createOrder()` в `this.dataSource.transaction(async (manager) => { ... })`
3. Использовать `manager.getRepository()` для всех операций внутри транзакции
4. Обновить тесты

### P1-011: Billing service — transaction

**Файл:** `apps/api/src/modules/billing/billing.service.ts`

**Что сделать:**

1. Inject `DataSource`
2. Критические multi-step методы (создание invoice + payment recording) обернуть в транзакцию
3. Обновить тесты

### P1-012: PromoCode redemption — transaction

**Файл:** `apps/api/src/modules/promo-codes/promo-codes.service.ts`

**Что сделать:**

1. Inject `DataSource`
2. Метод redemption (проверка лимита → increment → apply) обернуть в транзакцию с pessimistic lock на promo code record
3. Обновить тесты

### P1-013: Fix broken @Index decorators

**Файлы и исправления:**

| Файл                                              | Было                                                 | Стало                                               |
| ------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `reports/entities/report.entity.ts:616`           | `@Index(["organizationId", "status", "created_at"])` | `@Index(["organizationId", "status", "createdAt"])` |
| `reports/entities/report.entity.ts:617`           | `@Index(["definitionId", "created_at"])`             | `@Index(["definitionId", "createdAt"])`             |
| `reports/entities/report.entity.ts:618`           | `@Index(["created_by_id", "created_at"])`            | `@Index(["createdById", "createdAt"])`              |
| `security/entities/security-event.entity.ts:42`   | `@Index(["created_at"])`                             | `@Index(["createdAt"])`                             |
| `sales-import/entities/sales-import.entity.ts:21` | `@Index(['created_at'], ...)`                        | `@Index(['createdAt'], ...)`                        |

**ВАЖНО:** `@Index` использует property names (camelCase), НЕ DB column names (snake_case).

### P1-014: Replace bare throw new Error()

Заменить ВСЕ 24 `throw new Error()` на NestJS HTTP exceptions:

| Файл:строка                                                  | throw new Error(...)                      | Заменить на                                                                         |
| ------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `routes/route-optimization.service.ts:54`                    | "Route not found"                         | `throw new NotFoundException('Route not found')`                                    |
| `fiscal/services/fiscal.service.ts:743`                      | "Device not found"                        | `throw new NotFoundException('Fiscal device not found')`                            |
| `storage/storage.controller.ts:92`                           | "No file provided"                        | `throw new BadRequestException('No file provided')`                                 |
| `import/import.controller.ts:144`                            | "No file provided"                        | `throw new BadRequestException('No file provided')`                                 |
| `import/import.controller.ts:163`                            | "Unsupported file format"                 | `throw new BadRequestException('Unsupported file format')`                          |
| `import/import.controller.ts:384`                            | "No file provided"                        | `throw new BadRequestException('No file provided')`                                 |
| `referrals/referrals.service.ts:552`                         | "Failed to generate unique referral code" | `throw new InternalServerErrorException('Failed to generate unique referral code')` |
| `auth/auth.service.ts:934`                                   | Recovery error                            | `throw new InternalServerErrorException(...)`                                       |
| `directories/services/directory-source.service.ts:392`       | "Unsupported URL protocol"                | `throw new BadRequestException('Unsupported URL protocol')`                         |
| `directories/services/directory-source.service.ts:410`       | HTTP status error                         | `throw new BadGatewayException(...)`                                                |
| `directories/services/directory-source.service.ts:434`       | Fetch error                               | `throw new BadGatewayException(...)`                                                |
| `integrations/services/ai-parser.service.ts:135`             | "Session not found"                       | `throw new NotFoundException('Session not found')`                                  |
| `integrations/services/ai-parser.service.ts:235,239,247,260` | URL validation errors                     | `throw new BadRequestException(...)`                                                |
| `integrations/services/ai-parser.service.ts:294`             | "Failed to fetch documentation"           | `throw new BadGatewayException(...)`                                                |
| `integrations/services/integration-tester.service.ts:124`    | "Unknown endpoint"                        | `throw new BadRequestException('Unknown endpoint')`                                 |
| `telegram-payments/telegram-payments.service.ts:609,645,690` | Telegram API failures                     | `throw new BadGatewayException(...)`                                                |
| `security/services/encryption.service.ts:76`                 | Key error                                 | `throw new InternalServerErrorException(...)`                                       |
| `payments/payments.service.ts:1215,1242`                     | Config errors                             | `throw new InternalServerErrorException(...)`                                       |

Добавь недостающие imports: `NotFoundException, BadRequestException, InternalServerErrorException, BadGatewayException, ForbiddenException` из `@nestjs/common`.

---

## Батч 4: P1 Infrastructure (4 задачи)

### P1-015: Bot K8s probes port fix

**Файл:** `infrastructure/k8s/base/bot-deployment.yml`

**Что сделать:**

1. Строки 53-59: удалить второй port `health: 3002`, оставить только `http: 3001`
2. Строки 88-102: изменить `port: health` на `port: http` в liveness и readiness probes
3. Или заменить `port: health` на `port: 3001` напрямую

### P1-016: Docker-compose healthchecks

**Файл:** `docker-compose.yml`

**Что сделать:**

1. В сервис `api` добавить:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 40s
   ```
2. В сервис `client` добавить:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:5173"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

### P1-017: ConfigMap missing STORAGE_ENDPOINT

**Файл:** `infrastructure/k8s/base/configmap.yml`

**Что сделать:**

1. Добавить ключ `STORAGE_ENDPOINT: "minio:9000"` в ConfigMap `vendhub-config`

### P1-018: Staging deploy SHA tagging

**Файл:** `.github/workflows/ci.yml` (~строки 507-514)

**Что сделать:**

1. В staging deploy step передавать SHA tag:
   ```yaml
   script: |
     cd /opt/vendhub
     export IMAGE_TAG=${{ github.sha }}
     git pull origin main
     docker compose -f docker-compose.prod.yml pull
     docker compose -f docker-compose.prod.yml up -d
     docker compose -f docker-compose.prod.yml exec api pnpm migration:run
   ```
2. Убедиться что `docker-compose.prod.yml` использует `${IMAGE_TAG:-latest}` в image tags

---

## Батч 5: P2 Quick Wins (10 задач, ~10h)

Эти задачи можно выполнять параллельно через агентов.

### P2-003: Entity snake_case → camelCase (17 файлов)

**Файлы:** (полный список)

1. `modules/incidents/entities/incident.entity.ts`
2. `modules/notifications/entities/fcm-token.entity.ts`
3. `modules/notifications/entities/push-subscription.entity.ts`
4. `modules/notifications/entities/notification.entity.ts`
5. `modules/operator-ratings/entities/operator-rating.entity.ts`
6. `modules/machine-access/entities/machine-access.entity.ts`
7. `modules/achievements/entities/achievement.entity.ts`
8. `modules/achievements/entities/user-achievement.entity.ts`
9. `modules/import/entities/import-session.entity.ts`
10. `modules/import/entities/import-audit-log.entity.ts`
11. `modules/import/entities/schema-definition.entity.ts`
12. `modules/import/entities/validation-rule.entity.ts`
13. `modules/references/entities/ikpu-code.entity.ts`
14. `modules/references/entities/goods-classifier.entity.ts`
15. `modules/references/entities/vat-rate.entity.ts`
16. `modules/references/entities/payment-provider.entity.ts`
17. `modules/references/entities/package-type.entity.ts`
18. `modules/directories/entities/directory.entity.ts` (частично: `approval_required`, `offline_enabled`)

**Правила:**

- Переименовать property: `organization_id` → `organizationId`
- **НЕ менять** `@JoinColumn({ name: "organization_id" })` и `@Column({ name: "..." })` — это DB column names
- **НЕ менять** `@Index(["snake_case"])` в файлах где properties тоже snake_case — сначала свойства, потом @Index
- grep все `.service.ts`, `.controller.ts`, `.spec.ts` в том же модуле — обновить ВСЕ обращения: `entity.organization_id` → `entity.organizationId`
- grep object literal keys: `{ organization_id: value }` → `{ organizationId: value }`
- QueryBuilder `.where("e.organization_id")` → `.where("e.organizationId")` (TypeORM resolves property names)

### P2-006: Удалить dead code web API client

**Удалить файлы:**

- `apps/web/src/lib/api/client.ts`
- `apps/web/src/lib/api/index.ts`
- Удалить директорию `apps/web/src/lib/api/` если больше ничего нет

### P2-007: Web Reset Password i18n

**Файл:** `apps/web/src/app/auth/reset-password/page.tsx` (или `apps/web/src/app/[locale]/auth/reset-password/page.tsx`)

**Что сделать:**

1. Добавить `const t = useTranslations('auth')`
2. Заменить все 20+ hardcoded Russian strings на `t('key')` calls
3. Добавить ключи в `messages/ru.json`, `messages/en.json`, `messages/uz.json`

### P2-010: Unbounded inventory queries

**Файл:** `apps/api/src/modules/inventory/inventory.service.ts`

**Что сделать:** Добавить `.take(100)` или `limit` параметр к:

1. `getWarehouseLowStock()` (~строка 176)
2. `getMachinesNeedingRefill()` (~строка 254)
3. `getMachineInventory()` (~строка 241)

**Файл:** `apps/api/src/modules/inventory/services/inventory-reservation.service.ts` 4. `getActiveReservations()` (~строка 440) — добавить `.take(100)`

### P2-011: Scheduled reports unbounded

**Файл:** `apps/api/src/modules/reports/reports.service.ts` (~строка 660)

**Что сделать:**

1. В CRON `processScheduledReports()` добавить `.take(10)` на запрос due reports
2. Если больше 10 — следующий запуск CRON подхватит остальные

### P2-013: Удалить dead ESLint configs

**Удалить файлы:**

- `apps/api/.eslintrc.json`
- `apps/client/.eslintrc.json`

### P2-014: Grafana Redis datasource password

**Файл:** `infrastructure/monitoring/grafana/provisioning/datasources/datasources.yml`

**Что сделать:** В Redis datasource добавить:

```yaml
secureJsonData:
  password: ${REDIS_PASSWORD}
```

### P2-016: formatUZS i18n

**Файл:** Найти функцию `formatUZS` (вероятно `apps/web/src/` или `apps/client/src/utils/`)

**Что сделать:** Заменить hardcoded `" сум"` на параметр или i18n call.

### P2-017: NetworkPolicy pod selector fix

**Файл:** `infrastructure/k8s/base/network-policies.yml`

**Что сделать:**

1. Строки 191-198: порт 9187 на postgres pod — удалить (pg_exporter не sidecar)
2. Строка ~238: порт 9121 на redis pod — удалить (redis-exporter отдельный pod)

### P2-018: Monitoring DB env vars

**Файл:** `infrastructure/monitoring/docker-compose.monitoring.yml`

**Что сделать:**

1. Строки 81-82: `POSTGRES_USER` → `DB_USER`, `POSTGRES_PASSWORD` → `DB_PASSWORD`
2. Строка 175: в DATA_SOURCE_NAME заменить `${POSTGRES_USER}:${POSTGRES_PASSWORD}` → `${DB_USER}:${DB_PASSWORD}`

### P2-019: Release workflow — add bot + site

**Файл:** `.github/workflows/release.yml`

**Что сделать:** Добавить build+push steps для `bot` и `site` images по аналогии с `api`, `web`, `client`.

---

## Батч 6: P2 Large Tasks (9 задач, ~71h)

> Эти задачи крупные. Каждую можно выполнять отдельной сессией.

### P2-001: Reduce `any` types (546 → <50)

**Стратегия:**

1. Сначала пройти **Response DTOs** (`user-response.dto.ts`, `machine-response.dto.ts`, `transaction-response.dto.ts`) — заменить `any` на конкретные типы
2. `storage.service.ts` (18 any) — типизировать S3 SDK вызовы через `@aws-sdk/client-s3` types
3. `audit.subscriber.ts` (16 any) — типизировать TypeORM subscriber events
4. `telegram-customer-bot.service.ts` (13 any) — использовать Telegraf types
5. `reports/` services (33 any) — создать interfaces для report data structures
6. Frontend: `catch (error: any)` → `catch (error: unknown)` + type guard
7. Mobile: `NativeStackNavigationProp<any>` → proper navigation param types
8. Изменить ESLint rule `no-explicit-any` с `warn` на `error`
9. Допустимые `any` (SDK boundaries) — добавить `// eslint-disable-next-line` с комментарием

### P2-002: Split giant files (49 файлов > 500 строк, 15 > 1000)

**Приоритетные разбиения:**

1. `vendhub-report-generator.service.ts` (1670 строк) → split по типам отчётов: `sales-report.generator.ts`, `inventory-report.generator.ts`, `financial-report.generator.ts`
2. `transactions.service.ts` (1445 строк) → `transaction-query.service.ts`, `transaction-create.service.ts`, `transaction-reconcile.service.ts`
3. `payments.service.ts` (1409 строк) → `payme.handler.ts`, `click.handler.ts`, `uzum.handler.ts`, `payment-common.service.ts`
4. Web pages >1000 строк → extract table/form/modal в `_components/` рядом с page.tsx
5. `bot/handlers/callbacks.ts` (1174 строк) → split по category: `operator-callbacks.ts`, `client-callbacks.ts`, `admin-callbacks.ts`

### P2-004: Mobile i18n (208 strings)

**Что сделать:**

1. `pnpm --filter mobile add i18next react-i18next expo-localization`
2. Создать `apps/mobile/src/i18n/` с `index.ts`, `ru.json`, `uz.json`, `en.json`
3. Инициализировать i18n в `App.tsx`
4. Извлечь все 208 hardcoded Russian strings в locale файлы
5. Wrap каждый screen в `useTranslation()`

### P2-005: Client PWA i18n cleanup (74 strings)

**Что сделать:**

1. В 9 page файлах (`OrderSuccessPage`, `AchievementsPage`, `PromoCodePage`, `HelpPage`, `DrinkDetailPage`, `LoyaltyPage`, `NotificationSettingsPage`, `GoogleMap`, `MachineCard`) заменить hardcoded strings на `t()` calls
2. Добавить keys в существующие locale файлы `apps/client/src/i18n/locales/`
3. Geolocation store — возвращать error codes, переводить в UI layer

### P2-008: Real payment refunds

**Файл:** `apps/api/src/modules/payments/payments.service.ts`

**Что сделать:**

1. Для Payme: вызвать `PerformTransactionCancel` API
2. Для Click: вызвать Click refund API
3. Для Uzum: вызвать Uzum refund API
4. Пока нет credentials — пометить refund как `PROCESSING` (не `COMPLETED`) и залоггировать что нужен API call
5. Это бизнес-решение — обсудить с PO какой подход выбрать

### P2-009: Report generator pagination

**Файл:** `apps/api/src/modules/reports/services/vendhub-report-generator.service.ts`

**Что сделать:**

1. Заменить `qb.getMany()` (~строка 234) на stream/batch processing:
   ```typescript
   const BATCH_SIZE = 1000;
   let offset = 0;
   while (true) {
     const batch = await qb.skip(offset).take(BATCH_SIZE).getMany();
     if (batch.length === 0) break;
     // process batch
     offset += BATCH_SIZE;
   }
   ```
2. Или лучше — использовать SQL aggregation (`GROUP BY`) вместо in-memory loops

### P2-012: Recommendations cache → Redis

**Файл:** `apps/api/src/modules/recommendations/recommendations.service.ts`

**Что сделать:**

1. Заменить `private popularProductsCache = new Map()` на Redis-based cache
2. Inject `@InjectRedis()` или использовать `CacheManager` от NestJS
3. Key pattern: `recommendations:popular:${organizationId}`
4. TTL: 5 минут (как сейчас у in-memory)

### P2-015: DB CHECK constraint for negative inventory

**Что сделать:**

1. Создать миграцию: `npx typeorm migration:create src/database/migrations/AddInventoryCheckConstraints`
2. В миграции:
   ```sql
   ALTER TABLE warehouse_inventory ADD CONSTRAINT chk_warehouse_qty CHECK (current_quantity >= 0);
   ALTER TABLE operator_inventory ADD CONSTRAINT chk_operator_qty CHECK (current_quantity >= 0);
   ALTER TABLE machine_inventory ADD CONSTRAINT chk_machine_qty CHECK (current_quantity >= 0);
   ```

---

## Верификация

После ВСЕХ батчей:

```bash
# 1. TypeScript — 0 ошибок
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/client && npx tsc --noEmit
cd apps/bot && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# 2. Тесты — все проходят
cd apps/api && npx jest --passWithNoTests --forceExit

# 3. ESLint
cd apps/api && npx eslint src/ --max-warnings 0 2>&1 | tail -5

# 4. Проверка что нет throw new Error в services
grep -r "throw new Error(" apps/api/src/modules/ --include="*.service.ts" --include="*.controller.ts" | wc -l
# Ожидается: 0

# 5. Проверка что нет @Body() any
grep -r "@Body() .* any" apps/api/src/modules/ --include="*.controller.ts" | wc -l
# Ожидается: 0 (кроме telegram-bot webhook)

# 6. Проверка DB_USERNAME нигде не осталось
grep -r "DB_USERNAME" infrastructure/ | wc -l
# Ожидается: 0
```

---

## Коммиты

| Батч | Commit message                                                                        |
| ---- | ------------------------------------------------------------------------------------- |
| 1    | `fix(P0): storage tenant isolation, loyalty transaction, k8s backup env`              |
| 2    | `fix(P1-security): web auth tokens, payment TOCTOU locks, privilege escalation, RBAC` |
| 3    | `fix(P1-integrity): order/billing/promo transactions, broken indexes, error types`    |
| 4    | `fix(P1-infra): bot probe port, docker healthchecks, configmap, staging SHA`          |
| 5    | `fix(P2-quick): entity naming, dead code, unbounded queries, eslint, monitoring`      |
| 6    | `fix(P2-large): reduce any types, split files, mobile i18n, report pagination`        |

---

_Промт создан на основе AUDIT_REPORT_v3.md (2026-02-20). Каждая задача привязана к конкретному файлу и строке._
