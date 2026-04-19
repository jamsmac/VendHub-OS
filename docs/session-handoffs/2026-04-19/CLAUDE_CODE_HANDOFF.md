# Claude Code — Session Handoff

**Цель этого документа:** дать следующей сессии Claude Code в terminal'e всё, что
нужно чтобы без потерь продолжить Sprint E Phase 3. Прочитать целиком перед
первой командой.

**Repo:** `~/VendHub-OS`
**Branch:** `main`
**Последний коммит:** `81828e0` — Sprint E Phase 2 (predictive-refill engine)
**Всего коммитов сессии:** 35 (Sprints A → B → C → D → E Phase 1+2)
**Open issue для следующего шага:** #18 (создать из `ISSUE_18_BODY.md`)

---

## 1. Где мы сейчас

### Что завершено

| Sprint        | Key result                                                                                                                        | Commits   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **A**         | Security hardening: JWT, MIME, signed tokens, encryption keys. Score 6.9→8.5                                                      | ~12       |
| **B**         | Dependencies: 26 CVE → 0. CI split.                                                                                               | ~4        |
| **C**         | Docs + coverage + production hardening. Score 10.0.                                                                               | ~8        |
| **D**         | RBAC canary (64→0), OpenAPI CI drift, exactOptionalPropertyTypes в packages+web, promotions + dashboard consolidation (−3019 LOC) | ~6        |
| **E Phase 1** | Schema + entities + module wiring + migration                                                                                     | `fe4a9f4` |
| **E Phase 2** | EWMA consumption rates, forecasting, recommendations + 3 REST endpoints                                                           | `81828e0` |

### Что сейчас работает

- **Backend engine полностью API-complete:**
  - `GET /predictive-refill/forecast/:machineId` — days-of-supply per slot
  - `GET /predictive-refill/recommendations?action=…` — priority-sorted recs
  - `POST /predictive-refill/recommendations/:id/mark-acted` — audit trail
- **RBAC canary в 0** (после Sprint D)
- **OpenAPI drift CI gate** активен (Sprint D)
- **PREDICTED_STOCKOUT** добавлен в `AlertMetric` enum, но НЕ wired в
  recommendation service (будет в Phase 3)

### Что НЕ работает (gap к Phase 3)

- Нет UI — пользователь не видит рекомендации
- Нет cron — recommendations обновляются только при ручном HTTP запросе
- Alerts не fire даже если `daysOfSupply < 2`

---

## 2. Критические архитектурные решения

**Respect these. Они были установлены через calibration, не просто так.**

### 2.1. Entities extend `BaseEntity`, не пишут `id/createdAt/updatedAt` руками

`BaseEntity` живёт в `apps/api/src/common/entities/base.entity.ts` и даёт:

- `id` (UUID PK)
- `createdAt`, `updatedAt`, `deletedAt`
- `createdById`, `updatedById`
- soft delete infrastructure

**Пример правильно:**

```typescript
@Entity("consumption_rates")
export class ConsumptionRate extends BaseEntity {
  @Column("uuid")
  organizationId: string;
  // ...
}
```

**НЕ:**

```typescript
@Entity()
export class ConsumptionRate {
  @PrimaryGeneratedColumn("uuid") id: string; // ❌ дубликат BaseEntity
  @CreateDateColumn() createdAt: Date; // ❌ дубликат
}
```

### 2.2. BullMQ — это `@nestjs/bullmq`, НЕ `@nestjs/bull`

**Всегда:**

```typescript
import { BullModule } from "@nestjs/bullmq";
import { Processor, Process } from "@nestjs/bullmq";
```

Две существующие очереди для reference: `fiscal` и `machine-writeoff`. Матчим
их pattern для scheduler wiring.

### 2.3. Tenant scoping — через `user.organizationId` напрямую

**Нет декоратора `@CurrentOrganizationId`.** Не изобретать его.

```typescript
@Get('recommendations')
@Roles('admin', 'manager', 'operator')
async list(
  @Query() query: GetRecsDto,
  @CurrentUser() user: AuthenticatedUser,
) {
  return this.service.list(user.organizationId, query);
}
```

`@CurrentUser()` существует, `AuthenticatedUser` interface — проверь точный импорт
через `rg "interface AuthenticatedUser" apps/api/src`.

### 2.4. RBAC canary требует ±25 line context window

Файл: `apps/api/src/__tests__/rbac-canary.spec.ts`

**Почему ±25, не ±8:** между HTTP-методом (`@Get`) и `@Roles()` декоратором
часто стоят Swagger декораторы (`@ApiOperation`, `@ApiResponse`), и они могут
занимать до 15 строк. При ±8 canary ложно ругался на 64 endpoint'а, которые на
самом деле защищены.

**Не сужать этот контекст.** Если добавляешь новый endpoint — ставь `@Roles(...)`
в разумной близости, не прячь за ещё 30 строк Swagger.

### 2.5. Migration pattern — raw SQL внутри `MigrationInterface`

**НЕ TypeORM schema sync, НЕ Drizzle.** Файлы в
`apps/api/src/database/migrations/`, naming: `{unix_timestamp}-{Name}.ts`

Пример — `1776000000000-AddPredictiveRefill.ts`. Copy его как template для новых
миграций.

### 2.6. `exactOptionalPropertyTypes` включён глобально, выключен для `apps/api`

`tsconfig.base.json` → `true`
`apps/api/tsconfig.json` → `false` (opt-out)

**Это временно.** Issue #17 в backlog'е трекает 284 ошибки в `apps/api`. Не трогай
если не работаешь именно над #17.

### 2.7. RU primary, EN secondary

Все user-facing строки через i18n. Русский — первичный язык продукта. Не
хардкодить "Срочно"/"Urgent" в JSX — через `useTranslations()` hook (или
whatever pattern использует `apps/web`).

---

## 3. Codebase conventions — quick reference

### Paths

```
apps/api/src/modules/{module}/
├── entities/
├── dto/
├── services/
├── controllers/
├── jobs/              ← BullMQ processors
├── __tests__/         ← unit tests
└── {module}.module.ts

apps/web/src/app/dashboard/{feature}/
├── page.tsx
├── loading.tsx
├── [id]/page.tsx      ← drill-down
└── components/
```

### Tests

- Unit: Jest, rely on `getRepositoryToken()` mock. НЕ поднимать реальный Postgres.
- E2E: playwright, spec в `apps/web/e2e/`
- RBAC canary: `pnpm test -- rbac-canary.spec.ts` — должен быть `0 violations`

### Commands

```bash
# Типы
pnpm --filter @vendhub/api type-check
pnpm --filter @vendhub/web type-check

# Тесты
pnpm --filter @vendhub/api test
pnpm --filter @vendhub/api test -- predictive-refill
pnpm --filter @vendhub/api test -- rbac-canary.spec.ts

# OpenAPI
pnpm --filter @vendhub/api openapi:generate

# Миграции (локально обычно не бежит из-за DB role, CI валидирует)
pnpm --filter @vendhub/api migration:run
```

---

## 4. Pending работа — Sprint E Phase 3

Полный dispatch: `SPRINT_E_PHASE_3_DISPATCH.md`
Issue body: `ISSUE_18_BODY.md`

### Порядок выполнения (НЕ переставлять)

**Block A — Cron processor (~0.5 day)**

1. `rg "@Cron\(" apps/api/src --type ts` — найти существующий scheduler pattern
2. `rg "\.add\(" apps/api/src/modules --type ts` — найти queue enqueue pattern
3. `DailyForecastProcessor` в `modules/predictive-refill/jobs/`
4. `refreshForOrg()` в `ConsumptionRateService`, `refreshAll()` в `RecommendationService`
5. Scheduler wiring — матчить existing pattern
6. Unit test (mocked repos) + integration test
7. Commit: `predictive-refill: nightly cron processor + refresh-all methods`

**Block B — UX spec gate (~0.25 day, 0 commits)**

1. Invoke `vhm24-ux-spec` skill
2. Inputs: обе страницы, API shape из DTO, anchors `/dashboard/machines` + `/dashboard/routes`, personas (ops manager + field technician)
3. Output: layouts, props, empty/loading/error states, i18n keys
4. **Gate:** нет "unknown" перед Block C

**Block C — Frontend (~1.25 day, 6 commits)**

1. `rg "recharts|@nivo|chart\.js" apps/web/package.json` — использовать existing, не добавлять новую dep
2. Sidebar entry между `/dashboard/machines` и `/dashboard/routes`
3. Page + components — по dispatch'у
4. Alert wiring в `RecommendationService.refreshAll()` (свёрнутый из Phase 4)
5. E2E + i18n strings
6. Документация в `docs/features/` и `docs/runbooks/`

### Acceptance

- type-check green в api + web
- Все predictive-refill тесты green
- RBAC canary = 0
- Org-isolation spot check: org A не видит recs org B
- Ручной `queue.add('recalc-all')` → таблица заполнилась
- Stockout condition → alert через existing channel
- E2E: list → detail → add to route → route показывает stops

### Commit budget

6–8 коммитов. Sprint E закроется на ~42–44.

---

## 5. Gotchas — уроки этой сессии

### 5.1. Pre-flight checks — не формальность

Каждый раз когда я (Cowork Claude) писал dispatch без pre-flight, в коде
всплывал сюрприз. Правило: **перед Block A** в следующей сессии выполни:

```bash
rg "class Transaction\b" apps/api/src --type ts -l
rg "class MachineSlot\b" apps/api/src --type ts -l
rg "interface AuthenticatedUser" apps/api/src
rg "@CurrentUser" apps/api/src/common/decorators/
rg "@Cron\(" apps/api/src --type ts
rg "\.add\('" apps/api/src/modules --type ts
```

Если что-то не соответствует предположениям dispatch'а — корректируй dispatch,
не код поверх неверной модели.

### 5.2. RBAC canary на новые endpoints

Phase 2 добавил 3 endpoint'а. Они получили `@Roles(...)` декораторы. Canary после
этого всё ещё 0 — убедись что Phase 3 новых HTTP endpoint'ов не добавляет
(должно не добавлять, но проверь).

### 5.3. `git add -A` — опасно

В Sprint D один раз `git add -A` подцепил untracked `docs/previews/`. Всегда
добавляй явно по путям или модулям:

```bash
git add apps/api/src/modules/predictive-refill/
```

Не `git add .`, не `git add -A`.

### 5.4. При hook failure — новый коммит, НЕ `--amend`

Pre-commit hook failed = commit НЕ состоялся. `git commit --amend` в этом
случае модифицирует **предыдущий** коммит, что может уничтожить работу.

Правильно: fix the issue → re-stage → new commit.

### 5.5. Loading.tsx конфликты

Next.js App Router: `loading.tsx` может быть в каждой папке роута. В Sprint D
один раз дублировался между `/dashboard/loading.tsx` и
`/dashboard/dashboard/loading.tsx` (по 65 строк). Проверяй при создании
вложенных роутов.

### 5.6. Первый cron run будет медленным

`refreshAll` итерирует по всем (machine, product). На staging замерь сначала.
Если >5 минут — батчить по org или по time-slot.

### 5.7. Alert fatigue — реальный риск

100 машин × 20 продуктов = 2000 потенциальных алертов/сутки. Suppression
window (≥24h per machine+product) — обязательно. Без него — incident в первый же
день прода.

---

## 6. Где что лежит

### Dispatch docs (в `mnt/outputs/`)

- `SPRINT_D_DISPATCH.md` — план Sprint D (closed)
- `SPRINT_E_PREDICTIVE_REFILL.md` — product spec для Sprint E
- `SPRINT_E_PHASE_2_DISPATCH.md` — Phase 2 план (executed)
- `SPRINT_E_PHASE_3_DISPATCH.md` — **Phase 3 план (next up)**
- `ISSUE_18_BODY.md` — **paste в GitHub в начале следующей сессии**
- `CLAUDE_CODE_HANDOFF.md` — этот документ

### Ключевые файлы в repo

```
apps/api/src/
├── __tests__/rbac-canary.spec.ts              ← canary, ±25 context
├── common/
│   ├── entities/base.entity.ts                ← extend from this
│   └── decorators/current-user.decorator.ts   ← @CurrentUser()
├── modules/
│   ├── alerts/entities/alert-rule.entity.ts   ← AlertMetric enum (PREDICTED_STOCKOUT added)
│   ├── predictive-refill/                     ← Phase 1+2 landed here
│   │   ├── entities/
│   │   ├── services/                          ← EWMA, forecast, recommendation
│   │   ├── controllers/
│   │   ├── dto/
│   │   └── predictive-refill.module.ts
│   └── queues/                                ← scheduler pattern reference
├── database/migrations/
│   └── 1776000000000-AddPredictiveRefill.ts   ← migration template
└── app.module.ts                              ← PredictiveRefillModule registered line ~745

apps/web/src/
├── app/dashboard/                             ← add predictive-refill/ here
├── components/layout/sidebar.tsx              ← add entry
└── (lib or trpc folder)                       ← data fetching pattern

tsconfig.base.json                             ← exactOptionalPropertyTypes: true
apps/api/tsconfig.json                         ← opt-out: false (Issue #17 tracks)
.github/workflows/ci.yml                       ← OpenAPI drift gate
```

### Important commits

- `fe4a9f4` — Sprint E Phase 1 (schema + entities)
- `81828e0` — Sprint E Phase 2 (services + controller)

---

## 7. Deferred / out of scope

Не трогать в Phase 3 unless explicitly asked:

- **Issue #17** — `exactOptionalPropertyTypes` в `apps/api` (284 ошибок)
- **ML model** (seasonal, holiday patterns) — Sprint F+
- **Auto-route optimization** на основе recommendations — Sprint F+
- **Multi-product bundle refills** — Sprint F+
- **Dynamic pricing, energy monitoring** — product audit выявил как differentiators, но это отдельные sprint'ы (F, G)
- **MachineSlot.currentQuantity telemetry freshness** — документируй как
  known dependency в runbook, НЕ чини в этом sprint'е

---

## 8. Первые команды следующей сессии

**Строго по порядку:**

```bash
# 1. Ориентация
cd ~/VendHub-OS
git log --oneline -5                    # убедиться что 81828e0 на вершине
git status                              # чистый working tree

# 2. Создать Issue #18
gh issue create --title "Sprint E Phase 3 — Frontend + self-running backend" \
  --body-file /path/to/ISSUE_18_BODY.md

# 3. Pre-flight для Block A
rg "@Cron\(" apps/api/src --type ts
rg "\.add\('" apps/api/src/modules --type ts
rg "class Organization\b" apps/api/src/modules/organizations --type ts -l

# 4. Type-check baseline
pnpm --filter @vendhub/api type-check   # должен быть 0 errors
pnpm test --filter @vendhub/api -- rbac-canary.spec.ts  # 0 violations

# 5. Только после этого — начинай Block A
```

---

## 9. Если что-то пошло не так

**Type errors появились из ниоткуда:**

```bash
git diff --stat HEAD~5..HEAD            # что менялось
pnpm install                            # пере-симлинки workspace'а
```

**RBAC canary > 0:**

```bash
pnpm test -- rbac-canary.spec.ts --verbose 2>&1 | grep "modules/" | sort -u
# посмотри на какие endpoints ругается, добавь @Roles() или @Public()
```

**Миграция не бежит локально:**
Это ожидаемо без настроенного Postgres role. CI валидирует на первом же PR.
Если нужен локальный прогон — подними docker `postgres:16-alpine` с env из `.env.test`.

**OpenAPI drift gate fails в CI:**

```bash
pnpm --filter @vendhub/api openapi:generate
git add apps/api/openapi.json
git commit -m "chore: regenerate openapi.json"
```

**Тест предсказывает лишние alert fires:**
Проверь suppression window logic в AlertsService. Новый `PREDICTED_STOCKOUT` не
должен fire'ить чаще чем раз в 24h per (machine, product).

---

## 10. Контекст для продолжения разговора

Если в новой сессии нужно чтобы Claude Code понял контекст — первое сообщение:

> Продолжаем VendHub OS. Прочитай сначала `~/VendHub-OS/docs/HANDOFF.md`
> (или приложи этот файл), затем `ISSUE_18_BODY.md` и `SPRINT_E_PHASE_3_DISPATCH.md`.
> Начинаем с Block A (cron processor). Pre-flight checks сначала.

(Скопируй этот handoff в `~/VendHub-OS/docs/HANDOFF.md` чтобы был под рукой в
repo'е для всех будущих сессий.)

---

**Session end.** 35 commits. Score 10.0 с predictive engine в проде.
Phase 3 — straight shot через cron → UX spec → frontend.
