# VendHub OS — Full Production Audit Prompt

> **Дата**: 2026-03-31
> **Масштаб**: 85 модулей, 124 entity, 94 контроллера, 176 сервисов, 6 приложений
> **Цель**: Найти ВСЕ баги, уязвимости и несоответствия перед production deploy

---

## Инструкция для агента

Ты — senior security auditor и code reviewer. Проведи **8-фазный аудит** проекта VendHub OS.

**Правила:**
1. Действуй шаг за шагом, перепроверяй после каждой фазы
2. Исправляй найденные ошибки сразу (не откладывай)
3. Не останавливайся пока не сделаешь все на 100%
4. Каждый найденный баг должен иметь: файл, строку, severity (P0/P1/P2), описание, fix
5. После каждого исправления — проверь компиляцию `npx tsc --noEmit`
6. False positives документируй отдельно с обоснованием

**Прочитай CLAUDE.md перед началом** — там 8 обязательных правил кода и все архитектурные решения.

---

## Фаза 1: Компиляция и сборка (5 мин)

**Цель:** Убедиться что все 6 приложений компилируются без ошибок.

```bash
# Проверь каждое приложение
for app in api web client bot site mobile; do
  echo "=== $app ==="
  npx tsc --noEmit -p apps/$app/tsconfig.json 2>&1 | grep -c 'error TS'
done

# Проверь shared package
npx tsc --noEmit -p packages/shared/tsconfig.json 2>&1 | grep -c 'error TS'
```

**Критерий:** 0 ошибок во всех 7 проектах. Любая TS ошибка — P1 баг.

---

## Фаза 2: Безопасность — Tenant Isolation (30 мин)

**Цель:** КАЖДЫЙ запрос к данным пользователя ДОЛЖЕН фильтровать по `organizationId`.

### 2.1 Контроллеры без @Roles()

```bash
# Найди контроллеры без @Roles() декоратора
for f in $(find apps/api/src/modules -name '*.controller.ts'); do
  if ! grep -q '@Roles(' "$f"; then
    echo "NO ROLES: $f"
  fi
done
```

**Исключения (НЕ баги):**
- Контроллеры с `@Public()` декоратором (публичные эндпоинты)
- Guards глобальные в `app.module.ts` (6 штук: JwtAuthGuard, RolesGuard, OrganizationGuard, ThrottlerGuard, и т.д.)

### 2.2 Сервисы без organizationId

```bash
# Найди public методы сервисов которые принимают id но НЕ organizationId
grep -rn 'async find\|async get\|async update\|async delete\|async remove' \
  apps/api/src/modules/*/[^_]*.service.ts | \
  grep -v 'organizationId' | \
  grep -v 'spec.ts' | \
  grep -v 'private '
```

**Для каждого найденного метода проверь:**
1. Вызывается ли из контроллера с передачей `organizationId`?
2. Является ли методом только для внутреннего использования (system-level)?
3. Есть ли WHERE clause с `organizationId` в query?

**Severity:**
- P0: Метод доступен через REST и не фильтрует по org → IDOR vulnerability
- P1: Метод используется внутренне, но может быть вызван без org check
- False positive: Метод user-scoped (userId) или system-level (admin-only)

### 2.3 Pessimistic locks на финансовых операциях

```bash
# Найди финансовые сервисы без pessimistic_write
for module in payout-requests payments transactions collections billing fiscal; do
  echo "=== $module ==="
  grep -n 'pessimistic_write\|pessimistic_read' \
    apps/api/src/modules/$module/*.service.ts 2>/dev/null || echo "NO LOCKS"
done
```

**Правило:** Все операции изменения статуса в финансовых модулях ДОЛЖНЫ использовать pessimistic write lock внутри `dataSource.transaction()`.

### 2.4 Self-approval check

```bash
# Проверь что финансовые approve/review методы запрещают self-approval
grep -rn 'approve\|review' apps/api/src/modules/*/[^_]*.service.ts | \
  grep -v spec | grep -v 'import\|//\|*'
```

**Для каждого approve/review метода проверь:** есть ли проверка `requestedById !== reviewerId`?

---

## Фаза 3: Безопасность — Auth & Input Validation (20 мин)

### 3.1 Пароли

```bash
# Проверь что пароли ВСЕГДА хешируются при создании пользователя
grep -rn 'password' apps/api/src/modules/users/*.service.ts | \
  grep -v 'spec\|hash\|bcrypt\|compare'
```

**Правило:** Пароли ТОЛЬКО через `bcrypt.hash(password, 12)`. Никогда plaintext.

### 3.2 DTO validation

```bash
# Найди контроллеры с @Body() без типизированного DTO
grep -rn '@Body()' apps/api/src/modules/*/[^_]*.controller.ts | \
  grep -v 'Dto\|dto'
```

**Правило:** Каждый `@Body()` параметр ДОЛЖЕН быть типизирован DTO с class-validator декораторами.

### 3.3 Swagger decorators

```bash
# Контроллеры без @ApiTags
for f in $(find apps/api/src/modules -name '*.controller.ts' -not -name '*.spec.ts'); do
  if ! grep -q '@ApiTags' "$f"; then
    echo "NO SWAGGER: $f"
  fi
done
```

### 3.4 SQL Injection в raw queries

```bash
# Найди raw SQL queries (потенциальный SQL injection)
grep -rn '\.query(' apps/api/src/modules --include='*.service.ts' | \
  grep -v 'createQueryBuilder\|spec\.ts'
```

**Проверь:** используются ли параметризованные запросы (`$1`, `$2` или `:param`)?

### 3.5 Hardcoded credentials

```bash
# Поиск hardcoded секретов
grep -rn 'password.*=.*"\|secret.*=.*"\|token.*=.*"\|apikey.*=.*"' \
  apps/ packages/ scripts/ --include='*.ts' | \
  grep -v 'node_modules\|spec\|test\|mock\|example\|env\|process\.env\|\.d\.ts'
```

**Severity:** P0 для любого real credential, P2 для тестовых/моковых.

---

## Фаза 4: Архитектура — Entity & Database (20 мин)

### 4.1 BaseEntity compliance

```bash
# Все entity ДОЛЖНЫ extends BaseEntity
for f in $(find apps/api/src/modules -name '*.entity.ts'); do
  if ! grep -q 'extends BaseEntity' "$f"; then
    echo "NO BASE ENTITY: $f"
  fi
done
```

**Правило CLAUDE.md Rule 1:** Каждая entity MUST extend BaseEntity. No exceptions.

### 4.2 UUID primary keys

```bash
# Проверь что нет number primary keys
grep -rn '@PrimaryGeneratedColumn()' apps/api/src/modules --include='*.entity.ts'
```

**Правило:** UUID only. `@PrimaryGeneratedColumn('uuid')` — но BaseEntity уже предоставляет id.

### 4.3 Soft delete compliance

```bash
# Поиск hard delete
grep -rn '\.delete(' apps/api/src/modules --include='*.service.ts' | \
  grep -v 'softDelete\|spec\|mock\|test'
```

**Правило CLAUDE.md Rule 6:** ТОЛЬКО soft delete через `.softDelete()` и `.restore()`.

### 4.4 Migrations check

```bash
# Проверь что все миграции имеют up() и down()
for f in apps/api/src/database/migrations/*.ts; do
  has_up=$(grep -c 'async up' "$f")
  has_down=$(grep -c 'async down' "$f")
  if [ "$has_up" = "0" ] || [ "$has_down" = "0" ]; then
    echo "INCOMPLETE MIGRATION: $f (up=$has_up, down=$has_down)"
  fi
done
```

### 4.5 Module registration

```bash
# Проверь что все модули зарегистрированы в app.module.ts
for dir in $(ls -d apps/api/src/modules/*/); do
  module=$(basename "$dir")
  pascal=$(echo "$module" | sed -r 's/(^|-)(\w)/\U\2/g')Module
  if ! grep -q "$pascal" apps/api/src/app.module.ts; then
    echo "NOT REGISTERED: $module ($pascal)"
  fi
done
```

---

## Фаза 5: Frontend — Forms & Navigation (15 мин)

### 5.1 React Hook Form + Zod

```bash
# Найди формы без RHF+Zod (useState формы — техдолг)
grep -rn 'useState.*"")\|useState.*{}' apps/web/src/app/dashboard/*/page.tsx | \
  grep -v 'Filter\|filter\|search\|page\|tab\|open\|modal\|dialog\|target'
```

**Правило:** Все формы с отправкой на backend ДОЛЖНЫ использовать `useForm({ resolver: zodResolver(schema) })`.

### 5.2 DTO↔Frontend field mapping

Проверь каждую форму отправки:
```bash
# Найди все мутации с apiClient/api.post/api.patch
grep -rn 'api\.post\|api\.patch\|api\.put\|mutationFn' \
  apps/web/src/app/dashboard/*/page.tsx apps/web/src/lib/hooks/*.ts | \
  grep -v 'spec\|test'
```

**Для каждой мутации:** совпадают ли поля frontend формы с backend DTO?

Известные маппинги (из CLAUDE.md):
| Frontend | Backend DTO | Module |
|----------|------------|--------|
| `code` | `machineNumber` | machines |
| `basePrice` | `sellingPrice` | products |
| `costPrice` | `purchasePrice` | products |
| `position` | `employeeRole` | employees |
| `type` | `typeCode` | tasks |
| `parent_id` | `parentId` | organizations |
| `name` | `companyName` | contractors |

### 5.3 Sidebar coverage

```bash
# Каждая dashboard страница должна быть в sidebar
for page in $(find apps/web/src/app/dashboard -maxdepth 1 -type d -name '[a-z]*' | \
  sed 's|.*/dashboard/||' | sort); do
  if ! grep -q "\"/dashboard/$page\"" apps/web/src/components/layout/sidebar.tsx; then
    echo "NOT IN SIDEBAR: $page"
  fi
done
```

### 5.4 Error handling в mutations

```bash
# Найди мутации с generic error messages
grep -rn 'toast.error("' apps/web/src/app/dashboard --include='*.tsx' | \
  grep -v 'extractErrorMessage\|error\.message\|err\.'
```

**Правило:** Toast ошибки должны показывать РЕАЛЬНОЕ сообщение от API, а не generic строку.

---

## Фаза 6: i18n & Localization (10 мин)

### 6.1 Translation completeness

```bash
# Сравни количество ключей в en/ru/uz
for lang in en ru uz; do
  echo "$lang: $(python3 -c "import json; d=json.load(open('apps/web/messages/$lang.json')); print(sum(len(v) if isinstance(v,dict) else 1 for v in d.values()))")"
done
```

### 6.2 Hardcoded Russian strings

```bash
# Найди hardcoded русские строки в компонентах (должны быть через i18n)
grep -rn '[а-яА-Я]' apps/web/src/app/dashboard/*/page.tsx | \
  grep -v '\/\/' | grep -v 'useTranslations' | head -30
```

**Примечание:** Некоторые страницы могут иметь hardcoded строки если они ещё не мигрированы на i18n. Документируй как P2 техдолг.

### 6.3 Timezone consistency

```bash
# Все cron jobs должны иметь Asia/Tashkent timezone
grep -rn '@Cron(' apps/api/src/modules --include='*.service.ts' | \
  grep -v 'CronExpression.EVERY' | grep -v 'Tashkent'
```

---

## Фаза 7: Testing Coverage (15 мин)

### 7.1 Compile and run tests

```bash
# API tests (from apps/api dir)
cd apps/api && npx jest --config jest.config.ts --passWithNoTests 2>&1 | tail -5

# Client tests
cd apps/client && npx vitest run 2>&1 | tail -5

# Mobile tests
cd apps/mobile && npx jest --passWithNoTests 2>&1 | tail -5
```

### 7.2 Test file coverage

```bash
# Модули без тестов
for dir in $(ls -d apps/api/src/modules/*/); do
  module=$(basename "$dir")
  if [ -z "$(find "$dir" -name '*.spec.ts' 2>/dev/null)" ]; then
    echo "NO TESTS: $module"
  fi
done
```

### 7.3 E2E spec coverage

```bash
# Dashboard страницы без E2E specs
for page in $(find apps/web/src/app/dashboard -maxdepth 1 -type d -name '[a-z]*' | \
  sed 's|.*/dashboard/||'); do
  if [ ! -f "e2e/web/$page.spec.ts" ]; then
    echo "NO E2E: $page"
  fi
done
```

---

## Фаза 8: Infrastructure & DevOps (10 мин)

### 8.1 Docker health checks

```bash
# Проверь health check paths
grep -A5 'healthcheck' docker-compose.yml | grep 'test\|curl\|wget'
```

**Правило:** Health check должен быть `/api/v1/health` для API, не `/health`.

### 8.2 CI/CD pipeline

```bash
# Проверь что CI тестирует все 6 приложений
grep -A20 'matrix\|strategy' .github/workflows/ci.yml
```

### 8.3 Environment variables

```bash
# Проверь что .env.example содержит все нужные переменные
grep -r 'process.env\.' apps/api/src --include='*.ts' | \
  sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u > /tmp/used_env.txt
grep -v '^#' .env.example | cut -d= -f1 | sort -u > /tmp/example_env.txt
comm -23 /tmp/used_env.txt /tmp/example_env.txt
```

### 8.4 Dependency vulnerabilities

```bash
pnpm audit --audit-level moderate 2>&1 | tail -20
```

---

## Формат отчёта

После каждой фазы выведи таблицу:

```markdown
### Фаза N: [Название] — Результат: X багов найдено

| # | Severity | Файл | Строка | Описание | Статус |
|---|----------|------|--------|----------|--------|
| 1 | P0 | path/to/file.ts | 42 | Описание бага | FIXED ✅ / OPEN 🔴 |
| 2 | P1 | ... | ... | ... | ... |

**False Positives (не баги):**
- [описание и обоснование]
```

---

## Итоговая сводка

В конце аудита выведи:

```markdown
## AUDIT SUMMARY

| Метрика | Значение |
|---------|----------|
| Всего багов найдено | X |
| P0 (Critical) | X |
| P1 (Important) | X |
| P2 (Minor) | X |
| Исправлено | X |
| Осталось открытых | X |
| False positives | X |
| TypeScript errors (after fixes) | 0 |
| Tests passing | api: X, client: X, mobile: X |
| Apps compiling | 6/6 |

### Рекомендации по приоритетам:
1. [Что исправить первым]
2. [Что можно отложить]
3. [Техдолг для backlog]
```

---

## Текущие метрики проекта (на 2026-03-31)

| Метрика | Значение |
|---------|----------|
| API модули | 85 |
| Entity файлы | 124 |
| Миграции | 24 |
| Контроллеры | 94 |
| Сервисы | 176 |
| Dashboard страницы | 63 |
| Sidebar пунктов | 60 |
| E2E spec файлов | 102 |
| Unit test файлов | 236 |
| Контроллеры с @Roles | 86 |
| Сервисы с organizationId | 141 |
| Формы с RHF+Zod | 24 |
| Global guards | 6 |
| Контроллеры с @ApiTags | 94 |
| TypeScript errors | 0 (all 6 apps) |
| Последний полный аудит | 2026-03-30 |

---

## Известные исключения (НЕ баги)

1. **Guards глобальные** — `JwtAuthGuard`, `RolesGuard`, `OrganizationGuard` зарегистрированы как `APP_GUARD` в `app.module.ts`. Не нужен `@UseGuards()` на каждом контроллере.
2. **agent-bridge модуль** — intentionally global/admin-scoped, no org filtering by design.
3. **favorites модуль** — uses `userId` not `organizationId` (favorites are per-user).
4. **Route ordering** — NestJS multi-segment paths (e.g. `analytics/employee`) are NOT shadowed by single-segment `:id` due to segment-count matching.
5. **`(overview)` page** — Next.js route group, not a real URL segment.
6. **`counterparty` page** — legacy lightweight page, sidebar redirected to `counterparties` (full version).
7. **Users approve/reject/block etc.** — NOT exposed via controller REST endpoints (service-only methods).
8. **Cron intervals** (every N minutes/hours) — don't need timezone, only daily/weekly/monthly do.

---

## Как запустить

### Вариант 1: Через Claude агент
```
Прочитай файл FULL_AUDIT_PROMPT.md и выполни полный 8-фазный аудит проекта.
Действуй шаг за шагом, перепроверяй после каждой фазы, исправляй ошибки и не останавливайся пока не сделаешь все на 100%.
```

### Вариант 2: Через production-quality-guardian агент
Запусти `.claude/agents/production-quality-guardian` с этим промтом как контекстом.

### Вариант 3: Поэтапно
Запускай каждую фазу отдельно, проверяя результаты перед переходом к следующей.
