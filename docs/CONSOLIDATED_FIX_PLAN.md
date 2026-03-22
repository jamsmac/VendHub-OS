# VendHub OS — Консолидированный план исправлений

> **Дата:** 2026-03-21
> **Источники:** 2 независимых аудита + 3 верификационных агента
> **Пересмотренная оценка:** 79/100 (не готов к продакшену)
> **Главный блокер:** IDOR через tenant isolation gaps в 4+ сервисах

---

## Спринт 1: Безопасность (P0) — ~35ч

### 1.1 🔴 Tenant Isolation IDOR (~12ч)

**Суть:** `findById()` в 4 сервисах не фильтрует по `organizationId` → любой аутентифицированный пользователь может читать/изменять/удалять ресурсы чужой организации.

**Подтверждено:** 3 агента верифицировали. `order-events.gateway.ts` — опровергнуто (реализован корректно).

| Файл                                                   | Метод                    | Строка | Действие                                      |
| ------------------------------------------------------ | ------------------------ | ------ | --------------------------------------------- |
| `modules/opening-balances/opening-balances.service.ts` | `findById()`             | 170    | Добавить `organizationId` в where clause      |
| `modules/sales-import/sales-import.service.ts`         | `findById()`             | 180    | Добавить `organizationId` в where clause      |
| `modules/users/users.service.ts`                       | `findById()`             | 90     | Добавить `organizationId` в where clause      |
| `modules/users/users.service.ts`                       | `findAuthUserById()`     | 122    | Добавить `AND organization_id = $2` в raw SQL |
| `modules/users/users.service.ts`                       | `update()`               | 164    | Каскадно (зависит от findById)                |
| `modules/users/users.service.ts`                       | `remove()`               | 180    | Каскадно (зависит от findById)                |
| `modules/rbac/rbac.service.ts`                         | `updateRole()`           | 58     | Добавить `organizationId` в where clause      |
| `modules/rbac/rbac.service.ts`                         | `deleteRole()`           | 73     | Добавить `organizationId` в where clause      |
| `modules/rbac/rbac.service.ts`                         | `findRoleById()`         | 123    | Добавить `organizationId` в where clause      |
| `modules/rbac/rbac.service.ts`                         | `addPermissionsToRole()` | 162    | Валидировать org ownership                    |

**Дополнительно:**

- `grep -rn "findOne({ where: { id }" apps/api/src/modules/` — найти ВСЕ аналогичные паттерны
- Добавить integration тесты: запрос от org1 к ресурсу org2 → ожидаемый 404/403

### 1.2 🔴 Organization Guard hardening (~4ч)

**Файл:** `apps/api/src/common/guards/organization.guard.ts:70-73`

**Проблема:** `if (!requestedOrgId) return true` — перекладывает ответственность на сервис, но сервисы не проверяют.

**Решение:**

```typescript
// БЫЛО:
if (!requestedOrgId) return true;

// СТАЛО:
if (!requestedOrgId) {
  // Привязываем к организации текущего пользователя
  request.organizationId = user.organizationId;
  return true;
}
```

### 1.3 🔴 Секреты в .env (~2ч)

- Ротация: JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET, STORAGE_SECRET_KEY
- Очистка git history: `bfg --replace-text passwords.txt`
- Проверить: `.env` в `.gitignore` (уже есть ✓)

### 1.4 🔴 Next.js CVE + CSP unsafe-eval (~2ч)

```bash
pnpm update next@16.1.7
```

**Файл:** `apps/web/next.config.js:79`

```diff
- "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
+ "script-src 'self' 'unsafe-inline'",
```

(Если unsafe-eval нужен для dev — обернуть в `process.env.NODE_ENV === 'development'`)

### 1.5 🔴 BaseEntity для 3 entities (~4ч)

| Файл                                                               | Действие                                       |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `modules/inventory/entities/inventory-movement.entity.ts`          | `extends BaseEntity`, убрать ручные timestamps |
| `modules/payment-reports/entities/payment-report-upload.entity.ts` | `extends BaseEntity`, убрать ручные timestamps |
| `modules/payment-reports/entities/payment-report-row.entity.ts`    | `extends BaseEntity`, убрать ручные timestamps |

- Миграция: `AddBaseEntityFieldsToPaymentReports`

### 1.6 🔴 Health check path + hardcoded port (~2ч)

| Файл                                    | Строка | Fix                                                              |
| --------------------------------------- | ------ | ---------------------------------------------------------------- |
| `.github/workflows/release.yml`         | 173    | `/health` → `/api/v1/health`                                     |
| `apps/web/.../payment-reports/page.tsx` | 73     | `localhost:3001` → использовать `apiClient` или `localhost:4000` |
| `apps/web/.../analytics-tab.tsx`        | 35     | `localhost:3001` → использовать `apiClient` или `localhost:4000` |

### 1.7 🔴 user.entity.ts UUID type (~1ч)

**Файл:** `apps/api/src/modules/users/entities/user.entity.ts:124`

```diff
- @Column({ nullable: true })
+ @Column({ type: 'uuid', nullable: true })
  organizationId: string;
```

- Audit: `grep -rn "@Column({ nullable:" apps/api/src/modules/*/entities/*.entity.ts` для всех FK без uuid type

### 1.8 🔴 API tsconfig strict overrides (~8ч)

**Файл:** `apps/api/tsconfig.json:18-21`

Поэтапное включение (каждый шаг = отдельный PR):

1. `noUnusedLocals: true` → fix unused vars
2. `noUnusedParameters: true` → fix unused params
3. `noUncheckedIndexedAccess: true` → add null checks
4. `strictPropertyInitialization: true` → add initializers/`!` assertions

---

## Спринт 2: Формы, тесты, race conditions (P1) — ~35ч

### 2.1 React Hook Form + Zod (~16ч)

```bash
cd apps/web && pnpm add react-hook-form @hookform/resolvers zod
cd apps/client && pnpm add react-hook-form @hookform/resolvers zod
```

Приоритетные формы:

1. `web/dashboard/products/new/page.tsx` — product creation (0 validation)
2. `client/pages/CheckoutPage.tsx` — payment (0 validation!)
3. `client/pages/ComplaintPage.tsx`
4. `web/components/forms/FormField.tsx` → интеграция с FormProvider

### 2.2 Сломанные тесты (~6ч)

| Файл                          | Проблема                     | Fix                                   |
| ----------------------------- | ---------------------------- | ------------------------------------- |
| `payments.service.spec.ts:95` | Incomplete QueryBuilder mock | Добавить `getOne()`, mock relations   |
| `mobile/authStore.ts:176`     | Store access race            | Обернуть в `setTimeout` или lazy init |
| `client/api.ts:24`            | Dead `_refreshToken` param   | Удалить или реализовать               |

### 2.3 CI matrix completion (~4ч)

**Файл:** `.github/workflows/ci.yml`

- Добавить `pnpm --filter site test` и `pnpm --filter mobile test`
- Убрать `continue-on-error: true` для mobile
- Release workflow: добавить полную matrix

### 2.4 Inventory race condition (~4ч)

**Файл:** `modules/inventory/inventory.service.ts`

```typescript
await this.dataSource.transaction(async (manager) => {
  const balance = await manager.findOne(StockBalance, {
    where: { warehouseId, productId, organizationId },
    lock: { mode: "pessimistic_write" },
  });
  if (balance.quantity < requestedQty) throw new BadRequestException();
  balance.quantity -= requestedQty;
  await manager.save(balance);
});
```

### 2.5 Refund retry logic (~6ч)

**Файл:** `modules/payments/payments.service.ts`

- BullMQ retry queue с exponential backoff
- Новый статус: `REFUND_RETRYING`
- Scheduled job для failed refunds

---

## Спринт 3: Покрытие тестами (P1-P2) — ~30ч

### 3.1 Bot тесты (~12ч)

- Order management, payment processing, delivery, support commands

### 3.2 Модули без тестов (~8ч)

- `batch-movements` — 0 тестов
- `calculated-state` — 0 тестов (бизнес-критичен!)
- `custom-fields` — 0 тестов

### 3.3 Coverage thresholds (~2ч)

```diff
# apps/api/jest.config.ts
- statements: 45, branches: 42, functions: 37, lines: 45
+ statements: 60, branches: 55, functions: 50, lines: 60
```

### 3.4 ESLint any → error (~2ч)

```diff
# eslint.config.mjs
- '@typescript-eslint/no-explicit-any': 'warn',
+ '@typescript-eslint/no-explicit-any': 'error',
```

### 3.5 Promo code race conditions (~4ч)

- Per-user limit check → внутри транзакции после lock
- Expiry check → в validation query (`expiryDate > NOW()`)

### 3.6 DTO @ApiProperty gaps (~2ч)

- `cash-finance/create-deposit.dto.ts` — добавить @ApiProperty на все поля
- `update-webhook.dto.ts` — проверить наследование
- Audit: `grep -rL "@ApiProperty" apps/api/src/modules/*/dto/*.ts`

---

## Спринт 4: Инфра и мониторинг (P2) — ~20ч

### 4.1 Prometheus web metrics (~4ч)

Либо реализовать `/api/metrics` в Next.js, либо убрать scrape job из `prometheus.yml:47-50`.

### 4.2 Terraform remote state (~2ч)

Раскомментировать S3 backend в `infrastructure/terraform/main.tf:27-33`.

### 4.3 K8s secrets → volumes (~3ч)

Volume mounts с 0400 permissions вместо env vars.

### 4.4 Telemetry bounds validation (~2ч)

```typescript
if (temperature < -40 || temperature > 80) throw new BadRequestException();
```

### 4.5 Alert thresholds configurable (~3ч)

Вынести в `organization_settings` таблицу.

### 4.6 Shared package consolidation (~4ч)

- Удалить дубликаты enum (ComplaintStatus/Category/Priority) из API
- Удалить `packages/shared/src/menuData.ts`
- Увеличить usage с 18 до 50+ импортов

### 4.7 .dockerignore hardening (~1ч)

Добавить `.env*`, `.env.local`, `.env.*.local`.

---

## Спринт 5: Документация и финализация (P2-P3) — ~15ч

### 5.1 AGENTS.md fix (~1ч)

`.Codex/hookify.local.md` → `.claude/hookify.local.md`

### 5.2 Readiness sync (~1ч)

Синхронизировать оценку готовности между AGENTS.md и CLAUDE.md.

### 5.3 Breadcrumbs + empty states (~4ч)

Web dashboard → breadcrumbs на всех вложенных роутах.

### 5.4 i18n audit (~2ч)

- `web/dashboard/layout.tsx:68` — `"Loading..."` → `t("loading")`
- Spot-check 80+ dashboard pages

### 5.5 Production checklist (~3ч)

- DR rehearsal
- Load testing
- Final security scan

### 5.6 Оставить один source of truth (~2ч)

CLAUDE.md = primary, AGENTS.md = symlink или deprecated.

---

## Сводка

| Спринт    | Фокус                         | Часы      | P0    | P1    | P2     | P3    |
| --------- | ----------------------------- | --------- | ----- | ----- | ------ | ----- |
| 1         | Безопасность                  | ~35ч      | 8     | 0     | 0      | 0     |
| 2         | Формы, тесты, race conditions | ~35ч      | 0     | 5     | 0      | 0     |
| 3         | Покрытие тестами              | ~30ч      | 0     | 2     | 4      | 0     |
| 4         | Инфра и мониторинг            | ~20ч      | 0     | 0     | 7      | 0     |
| 5         | Документация                  | ~15ч      | 0     | 0     | 2      | 4     |
| **ИТОГО** |                               | **~135ч** | **8** | **7** | **13** | **4** |

---

## Верификация утверждений второго аудита

| Утверждение                                                            | Подтверждено?                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| IDOR в opening-balances, sales-import, users, rbac                     | ✅ ПОДТВЕРЖДЕНО                                  |
| organization.guard.ts пропускает без orgId                             | ✅ ПОДТВЕРЖДЕНО                                  |
| order-events.gateway.ts IDOR                                           | ❌ ОПРОВЕРГНУТО (правильно реализован)           |
| CSP unsafe-eval в web next.config.js                                   | ✅ ПОДТВЕРЖДЕНО (строка 79)                      |
| API tsconfig ослабляет 4 strict проверки                               | ✅ ПОДТВЕРЖДЕНО (строки 18-21)                   |
| user.entity.ts organizationId без uuid type                            | ✅ ПОДТВЕРЖДЕНО (строка 124)                     |
| Hardcoded port 3001 в payment-reports                                  | ✅ ПОДТВЕРЖДЕНО (2 файла)                        |
| Health check path mismatch в release.yml                               | ✅ ПОДТВЕРЖДЕНО (строки 173 vs 194)              |
| CI пропускает site/mobile                                              | ✅ ПОДТВЕРЖДЕНО                                  |
| Prometheus web metrics не реализован                                   | ✅ ПОДТВЕРЖДЕНО                                  |
| 3 модуля без тестов (batch-movements, calculated-state, custom-fields) | ✅ ПОДТВЕРЖДЕНО                                  |
| security/sms/websocket = 0 тестов                                      | ❌ ОПРОВЕРГНУТО (security:3, sms:1, websocket:1) |
| DTO без @ApiProperty (cash-finance)                                    | ✅ ПОДТВЕРЖДЕНО                                  |
| AGENTS.md .Codex ошибка                                                | ✅ ПОДТВЕРЖДЕНО                                  |
| @vendhub/shared всего 17-18 импортов                                   | ✅ ПОДТВЕРЖДЕНО (18)                             |
