# VendHub OS — МАСТЕР-ПРОМПТ ПОЛНОГО АУДИТА

# Глубокий анализ, выявление проблем, ошибок и план доработок

> **ИНСТРУКЦИЯ ДЛЯ AI-АГЕНТА**: Выполни ПОЛНЫЙ технический и архитектурный аудит проекта VendHub OS. Работай последовательно по фазам. Каждую фазу документируй в отдельный раздел отчёта. Не пропускай ни одного файла и модуля.

---

## КОНТЕКСТ ПРОЕКТА

VendHub OS — платформа управления вендинговыми автоматами для Узбекистана.
Turborepo + pnpm монорепозиторий, 6 приложений.

### Приложения

| App         | Путь               | Технология                                   | Порт |
| ----------- | ------------------ | -------------------------------------------- | ---- |
| API Backend | `apps/api/`        | NestJS 11.1 + TypeORM 0.3.20 + PostgreSQL 16 | 4000 |
| Web Admin   | `apps/web/`        | Next.js 16.1 + React 19 (App Router)         | 3000 |
| Client PWA  | `apps/client/`     | Vite 5.4 + React 19                          | 5173 |
| Client Site | `apps/site/`       | Лендинг                                      | 3001 |
| Bot         | `apps/bot/`        | Telegraf 4.16                                | —    |
| Mobile      | `apps/mobile/`     | React Native + Expo 52                       | —    |
| Shared      | `packages/shared/` | TypeScript + tsup                            | —    |

### ⛔ ЗАПРЕЩЁННЫЕ ТЕХНОЛОГИИ

- ❌ Drizzle ORM → только **TypeORM 0.3.20**
- ❌ MySQL → только **PostgreSQL 16**
- ❌ tRPC → только **NestJS controllers + class-validator DTOs**
- ❌ Express standalone → только **NestJS**
- ❌ Prisma → только **TypeORM**

### Текущие API модули (60 штук)

```
achievements, ai, alerts, audit, auth, billing, bull-board, client,
complaints, contractors, directories, employees, equipment, favorites,
fiscal, geo, health, import, incidents, integrations, inventory,
locations, loyalty, machine-access, machines, maintenance,
material-requests, monitoring, notifications, opening-balances,
operator-ratings, orders, organizations, payments, products,
promo-codes, purchase-history, quests, rbac, recommendations,
reconciliation, references, referrals, reports, routes, sales-import,
security, settings, storage, tasks, telegram-bot, telegram-payments,
transactions, trips, users, vehicles, warehouse, webhooks, websocket,
work-logs
```

### Web Admin страницы (dashboard/)

```
(overview), audit, complaints, contractors, directories, employees,
equipment, fiscal, import, integrations, inventory, locations,
loyalty, machines, maintenance, map, material-requests, notifications,
orders, payments, products, reconciliation, reports, routes, settings,
tasks, transactions, trips, users, work-logs
```

### Client PWA страницы (22 штуки)

```
AchievementsPage, CartPage, CheckoutPage, ComplaintPage, DrinkDetailPage,
FavoritesPage, HelpPage, HomePage, LoyaltyPage, MachineDetailPage,
MapPage, MenuPage, NotFoundPage, NotificationSettingsPage,
OrderSuccessPage, ProfilePage, PromoCodePage, QRScanPage, QuestsPage,
ReferralsPage, TransactionDetailPage, TransactionHistoryPage
```

---

## ФАЗА 1: ПРОВЕРКА ЗДОРОВЬЯ СБОРКИ (Build Health Check)

> Цель: выяснить, собирается ли проект вообще. Это фундамент всего аудита.

### Шаг 1.1: TypeScript — все приложения

```bash
# Проверить КАЖДОЕ приложение отдельно. Записать ВСЕ ошибки.

cd apps/api && npx tsc --noEmit 2>&1 | tee /tmp/ts-api.log
echo "=== API TS errors: $(grep -c 'error TS' /tmp/ts-api.log || echo 0) ==="

cd ../web && npx tsc --noEmit 2>&1 | tee /tmp/ts-web.log
echo "=== Web TS errors: $(grep -c 'error TS' /tmp/ts-web.log || echo 0) ==="

cd ../client && npx tsc --noEmit 2>&1 | tee /tmp/ts-client.log
echo "=== Client TS errors: $(grep -c 'error TS' /tmp/ts-client.log || echo 0) ==="

cd ../bot && npx tsc --noEmit 2>&1 | tee /tmp/ts-bot.log
echo "=== Bot TS errors: $(grep -c 'error TS' /tmp/ts-bot.log || echo 0) ==="

cd ../mobile && npx tsc --noEmit 2>&1 | tee /tmp/ts-mobile.log
echo "=== Mobile TS errors: $(grep -c 'error TS' /tmp/ts-mobile.log || echo 0) ==="
```

**Для КАЖДОЙ ошибки зафиксируй:**

- Файл и строку
- Код ошибки (TS2304, TS2339 и т.д.)
- Описание проблемы
- Предполагаемое решение

### Шаг 1.2: ESLint

```bash
cd ../../ && npx eslint apps/api/src --max-warnings 0 2>&1 | tee /tmp/lint-api.log
npx eslint apps/web/src --max-warnings 0 2>&1 | tee /tmp/lint-web.log
npx eslint apps/client/src --max-warnings 0 2>&1 | tee /tmp/lint-client.log
```

### Шаг 1.3: Build

```bash
# Попытка собрать каждое приложение
pnpm --filter api build 2>&1 | tee /tmp/build-api.log
pnpm --filter web build 2>&1 | tee /tmp/build-web.log
pnpm --filter client build 2>&1 | tee /tmp/build-client.log
```

### Шаг 1.4: Тесты

```bash
cd apps/api && npx jest --forceExit --passWithNoTests 2>&1 | tee /tmp/test-api.log
echo "=== Tests: passed=$(grep -oP 'Tests:.*\K\d+ passed' /tmp/test-api.log), failed=$(grep -oP '\d+ failed' /tmp/test-api.log || echo 0) ==="
```

### 📊 Формат отчёта Фазы 1

```markdown
## Build Health Summary

| App    | TS Errors | ESLint Errors | Build | Tests              |
| ------ | --------- | ------------- | ----- | ------------------ |
| API    | X errors  | X errors      | ✅/❌ | X passed, Y failed |
| Web    | X errors  | X errors      | ✅/❌ | N/A                |
| Client | X errors  | X errors      | ✅/❌ | N/A                |
| Bot    | X errors  | X errors      | ✅/❌ | N/A                |
| Mobile | X errors  | X errors      | ✅/❌ | N/A                |

### Критические ошибки сборки (блокеры)

1. ...
2. ...

### Предупреждения (warnings)

1. ...
```

---

## ФАЗА 2: АУДИТ BACKEND (apps/api)

> Цель: проверить КАЖДЫЙ модуль на соответствие стандартам, полноту, ошибки.

### Шаг 2.1: Проверка обязательных правил (для КАЖДОГО модуля из 60)

Для каждого модуля в `apps/api/src/modules/` проверь:

```
✅ / ❌ — Чеклист по модулю <module_name>:

1. STRUCTURE:
   □ Есть module.ts
   □ Есть controller.ts
   □ Есть service.ts
   □ Есть service.spec.ts (хотя бы 1 тест)
   □ Есть dto/ с create и update DTO
   □ Есть entities/ с entity файлами

2. BASE ENTITY:
   □ Все entities наследуют BaseEntity
   □ Нет дублирования полей id, created_at, updated_at, deleted_at

3. UUID:
   □ Все PK — UUID (string), не number
   □ Все FK — string | null, не number

4. SNAKE_CASE:
   □ Все колонки БД в snake_case
   □ Нет camelCase в @Column()

5. CLASS-VALIDATOR:
   □ Все DTO имеют декораторы валидации
   □ @IsString, @IsUUID, @IsEnum и т.д. на каждом поле

6. SWAGGER:
   □ Контроллер имеет @ApiTags
   □ Каждый endpoint имеет @ApiOperation
   □ DTO имеют @ApiProperty / @ApiPropertyOptional

7. SOFT DELETE:
   □ Нигде не используется .delete() или .remove()
   □ Только .softDelete() и .restore()

8. MULTI-TENANT:
   □ Все запросы фильтруются по organization_id
   □ Нет утечки данных между организациями

9. GUARDS:
   □ Эндпоинты защищены JwtAuthGuard
   □ Где нужно — RolesGuard с правильными ролями
   □ OrganizationGuard на мульти-тенантных эндпоинтах

10. REGISTRATION:
    □ Модуль зарегистрирован в app.module.ts
    □ Сервис экспортируется если используется другими модулями
```

### Шаг 2.2: Анализ app.module.ts

```bash
# Проверить что ВСЕ 60 модулей зарегистрированы
cat apps/api/src/app.module.ts
```

**Найти:**

- Модули которые есть в файловой системе, но НЕ зарегистрированы в app.module.ts
- Модули которые зарегистрированы, но папки НЕ существует (мёртвые импорты)
- Циклические зависимости (forwardRef)

### Шаг 2.3: Анализ BaseEntity

```bash
cat apps/api/src/common/entities/base.entity.ts
```

**Проверить:**

- Какие поля даёт BaseEntity
- Правильные ли типы и декораторы
- Есть ли @DeleteDateColumn для soft delete

### Шаг 2.4: Анализ Database

```bash
cat apps/api/src/database/typeorm.config.ts
# или data-source.ts
```

**Проверить:**

- synchronize: false (НЕ true в production!)
- Правильные entity paths
- Правильные migration paths
- SSL настройки для production
- Connection pool settings
- Naming strategy (snake_case)

### Шаг 2.5: Проверка миграций

```bash
ls -la apps/api/src/database/migrations/
```

**Проверить:**

- Количество миграций
- Последняя дата миграции
- Нет ли конфликтных миграций
- Нет ли `synchronize: true` в конфиге (КРИТИЧЕСКАЯ ОШИБКА)

### Шаг 2.6: Анализ Entity Relations

Для КАЖДОЙ entity проверить:

- @ManyToOne, @OneToMany, @ManyToMany — правильные ли relations
- Cascade settings — нет ли каскадного удаления (должен быть только soft delete)
- Eager loading — нет ли избыточной eager загрузки (производительность)
- onDelete: 'SET NULL' вместо 'CASCADE'

### Шаг 2.7: Security Audit

```bash
# Поиск потенциальных уязвимостей
grep -r "raw(" apps/api/src/ --include="*.ts" # SQL injection
grep -r "createQueryBuilder" apps/api/src/ --include="*.ts" # Raw queries
grep -r "@Public()" apps/api/src/ --include="*.ts" # Незащищённые эндпоинты
grep -r "password" apps/api/src/ --include="*.ts" # Утечка паролей
grep -r "secret" apps/api/src/ --include="*.ts" # Утечка секретов
grep -r "console.log" apps/api/src/ --include="*.ts" # Debug logs в production
grep -r "any" apps/api/src/ --include="*.ts" -l # TypeScript any
```

### Шаг 2.8: Performance Issues

Поискать:

- N+1 запросы (find без relations, потом цикл с find)
- Отсутствие пагинации на list endpoints
- Отсутствие индексов на часто фильтруемых полях
- Большие payload без select
- Отсутствие кэширования (Redis)

### 📊 Формат отчёта Фазы 2

```markdown
## Backend Audit Summary

### Compliance Matrix (60 модулей)

| Module   | Structure | BaseEntity | UUID | Validators | Swagger | SoftDel | MultiTenant | Guards | Tests | Score |
| -------- | --------- | ---------- | ---- | ---------- | ------- | ------- | ----------- | ------ | ----- | ----- |
| auth     | ✅        | ✅         | ✅   | ✅         | ⚠️      | ✅      | ✅          | ✅     | ✅    | 9/10  |
| machines | ✅        | ✅         | ✅   | ❌         | ❌      | ✅      | ⚠️          | ✅     | ❌    | 5/10  |
| ...      | ...       | ...        | ...  | ...        | ...     | ...     | ...         | ...    | ...   | ...   |

### Критические проблемы (P0 — исправить немедленно)

1. [SECURITY] ...
2. [DATA LEAK] ...
3. [CRASH] ...

### Серьёзные проблемы (P1 — исправить до релиза)

1. ...

### Улучшения (P2 — желательно)

1. ...

### Модули без тестов (список)

### Модули без Swagger документации (список)

### Модули с нарушением multi-tenant (список)
```

---

## ФАЗА 3: АУДИТ FRONTEND — Web Admin (apps/web)

> Цель: проверить полноту, качество кода, UX, соответствие API.

### Шаг 3.1: Структура страниц

Для каждой страницы в `dashboard/` проверить:

```
Чеклист страницы <page_name>:

1. PAGE QUALITY:
   □ TypeScript strict (нет any)
   □ Обработка loading state
   □ Обработка error state
   □ Обработка empty state
   □ Responsive дизайн (mobile/tablet/desktop)

2. DATA FLOW:
   □ API вызовы через fetch/axios (не hardcoded data)
   □ Правильные API endpoints
   □ Передаётся Authorization header
   □ Передаётся organization_id

3. UI COMPONENTS:
   □ Используется shadcn/ui
   □ Используется @tanstack/react-table для таблиц
   □ Используется Recharts для графиков
   □ Используется Lucide React для иконок

4. FUNCTIONALITY:
   □ CRUD операции работают
   □ Пагинация
   □ Фильтры и поиск
   □ Сортировка
   □ Модальные окна для create/edit

5. I18N:
   □ Все строки через i18n
   □ Нет hardcoded русского/английского текста
```

### Шаг 3.2: Layout и Navigation

```bash
cat apps/web/src/app/dashboard/layout.tsx
```

**Проверить:**

- Sidebar имеет ВСЕ пункты меню для всех 30 dashboard страниц
- Правильная группировка разделов
- Иконки для каждого пункта
- Ролевой доступ (некоторые пункты видны только admin/owner)
- Mobile responsive sidebar (burger menu)

### Шаг 3.3: Auth Flow

```bash
cat apps/web/src/middleware.ts
```

**Проверить:**

- JWT token проверяется
- Redirect на login при отсутствии токена
- Refresh token логика
- Ролевой routing

### Шаг 3.4: Соответствие API ↔ Web

Создать матрицу покрытия:

```
| API Module | Web Page Exists | CRUD Complete | Notes |
|------------|----------------|---------------|-------|
| machines | ✅ /machines | ⚠️ no delete | |
| products | ✅ /products | ✅ | |
| users | ✅ /users | ❌ no create | |
| ... | ... | ... | ... |
```

### 📊 Формат отчёта Фазы 3

```markdown
## Web Admin Audit Summary

### Page Quality Matrix

| Page     | TypeScript | Loading | Error | Empty | Responsive | API | i18n | Score |
| -------- | ---------- | ------- | ----- | ----- | ---------- | --- | ---- | ----- |
| machines | ✅         | ✅      | ❌    | ❌    | ⚠️         | ✅  | ❌   | 4/7   |
| ...      | ...        | ...     | ...   | ...   | ...        | ... | ...  | ...   |

### Недостающие страницы (API есть, Web нет)

### Страницы с неполным CRUD

### UX проблемы

### Accessibility проблемы
```

---

## ФАЗА 4: АУДИТ CLIENT PWA (apps/client)

> Цель: проверить клиентское приложение — полнота, UX, производительность.

### Шаг 4.1: Проверка каждой из 22 страниц

Для каждой страницы:

```
Чеклист <PageName>:
1. □ Компонент рендерится без ошибок
2. □ TypeScript — нет any, правильные типы
3. □ API интеграция — правильные endpoints
4. □ Loading/Error/Empty states
5. □ Mobile-first дизайн
6. □ Touch interactions (swipe, pull-to-refresh)
7. □ Offline graceful degradation
8. □ i18n — все строки локализованы
9. □ Accessibility (aria labels, focus management)
10. □ Performance — нет лишних ре-рендеров
```

### Шаг 4.2: Routing

```bash
cat apps/client/src/App.tsx
```

**Проверить:**

- Все 22 страницы имеют routes
- Protected routes для авторизованных страниц
- Public routes для landing/login
- 404 page для несуществующих маршрутов
- Lazy loading (React.lazy + Suspense)

### Шаг 4.3: State Management

```bash
ls apps/client/src/hooks/
ls apps/client/src/lib/
```

**Проверить:**

- Zustand stores — структура, типизация
- API hooks — правильные endpoints, error handling
- Кэширование данных (React Query или custom)

### Шаг 4.4: PWA Capabilities

```bash
cat apps/client/public/manifest.json 2>/dev/null
cat apps/client/vite.config.ts
```

**Проверить:**

- Service Worker зарегистрирован
- manifest.json с правильными настройками
- Offline fallback
- Push notifications support
- App icon и splash screen

### 📊 Формат отчёта Фазы 4

```markdown
## Client PWA Audit Summary

### Page Quality (22 страницы)

| Page     | Renders | Types | API | States | Mobile | i18n | Score |
| -------- | ------- | ----- | --- | ------ | ------ | ---- | ----- |
| HomePage | ✅      | ⚠️    | ✅  | ❌     | ✅     | ❌   | 3/6   |
| ...      |         |       |     |        |        |      |       |

### PWA Score

- manifest.json: ✅/❌
- Service Worker: ✅/❌
- Offline support: ✅/❌
- Push notifications: ✅/❌
- Lighthouse PWA score: ?/100

### Критические UX проблемы

### Производительность (bundle size, lazy loading)
```

---

## ФАЗА 5: АУДИТ MOBILE (apps/mobile)

> Цель: оценить готовность мобильного приложения.

### Шаг 5.1: Структура экранов

```bash
find apps/mobile/src/screens -name "*.tsx" | sort
```

**Проверить:**

- Какие экраны есть (staff / client / shared)
- Какие экраны отсутствуют (по спецификации)
- Навигация (React Navigation)
- Dual mode (staff/client) реализован?

### Шаг 5.2: Expo конфигурация

```bash
cat apps/mobile/app.json
cat apps/mobile/package.json
```

**Проверить:**

- Expo SDK версия
- Permissions (камера, геолокация, push notifications)
- Splash screen и app icon
- Deep linking

### Шаг 5.3: Native модули

**Проверить наличие:**

- expo-camera (QR scan)
- react-native-maps (карта)
- expo-notifications (push)
- expo-location (геолокация)
- expo-barcode-scanner (штрих-коды)

### 📊 Формат отчёта Фазы 5

```markdown
## Mobile Audit Summary

### Screen Coverage

| Screen             | Exists | Quality | API Integration |
| ------------------ | ------ | ------- | --------------- |
| Staff: TasksScreen | ✅     | ⚠️      | ✅              |
| Client: MapScreen  | ❌     | —       | —               |
| ...                |        |         |                 |

### Missing Features

### Native Module Issues

### Build/Deploy readiness
```

---

## ФАЗА 6: АУДИТ BOT (apps/bot)

> Цель: проверить Telegram бота.

### Шаг 6.1: Команды

```bash
find apps/bot/src -name "*.ts" | sort
cat apps/bot/src/handlers/commands.ts 2>/dev/null || find apps/bot -name "*.ts" -exec grep -l "command\|hears\|on(" {} \;
```

**Проверить:**

- Какие команды реализованы
- Какие команды отсутствуют (по спеке: /menu, /promo, /achievements, /map, /tasks, /route, /report, /alerts)
- Error handling в каждой команде
- Rate limiting

### Шаг 6.2: Inline keyboards и callbacks

### Шаг 6.3: Payment flow (Telegram Stars, WebApp)

### 📊 Формат отчёта Фазы 6

```markdown
## Bot Audit Summary

| Command | Implemented | Works | Error Handling |
| ------- | ----------- | ----- | -------------- |
| /start  | ✅          | ✅    | ⚠️             |
| /menu   | ❌          | —     | —              |
| ...     |             |       |                |

### Missing Commands

### Integration Issues
```

---

## ФАЗА 7: АУДИТ ИНФРАСТРУКТУРЫ

> Цель: проверить Docker, K8s, CI/CD, мониторинг.

### Шаг 7.1: Docker

```bash
cat docker-compose.yml
cat docker-compose.prod.yml 2>/dev/null
find . -name "Dockerfile" | sort
```

**Проверить:**

- Все сервисы описаны
- Правильные порты
- Volume mounts
- Health checks
- Multi-stage builds
- Non-root user
- .dockerignore

### Шаг 7.2: Kubernetes

```bash
find infrastructure/k8s -name "*.yml" -o -name "*.yaml" | sort
```

**Проверить:**

- Deployments для каждого сервиса
- Services (ClusterIP, LoadBalancer)
- Ingress rules
- ConfigMaps и Secrets
- Resource limits (cpu, memory)
- Readiness и liveness probes
- HPA (Horizontal Pod Autoscaler)

### Шаг 7.3: CI/CD

```bash
cat .github/workflows/ci.yml 2>/dev/null
```

**Проверить:**

- Шаги: install, lint, type-check, test, build, docker, deploy
- Кэширование (node_modules, Docker layers)
- Параллельность
- Матрица тестирования

### Шаг 7.4: Мониторинг

```bash
ls infrastructure/monitoring/
```

**Проверить:**

- Prometheus config
- Grafana dashboards
- Alert rules
- Loki log aggregation

### 📊 Формат отчёта Фазы 7

```markdown
## Infrastructure Audit Summary

### Docker

- docker-compose.yml: ✅ complete / ❌ missing services
- Dockerfiles: X/6 exist
- Multi-stage: ✅/❌
- Health checks: ✅/❌

### Kubernetes

- Deployments: X/6
- Services: X
- Ingress: ✅/❌
- Probes: ✅/❌
- HPA: ✅/❌

### CI/CD

- Pipeline exists: ✅/❌
- Steps complete: X/7

### Monitoring

- Prometheus: ✅/❌
- Grafana: ✅/❌
- Alerting: ✅/❌
```

---

## ФАЗА 8: АУДИТ SHARED PACKAGES

> Цель: проверить пакет packages/shared.

### Шаг 8.1: Типы

```bash
find packages/shared/src -name "*.ts" | sort
```

**Проверить:**

- Все entities имеют shared types
- Types реэкспортируются из index.ts
- Нет дублирования типов между apps
- Используются ли shared types в client/web/mobile

### Шаг 8.2: Constants

- Общие enum'ы (MachineStatus, OrderStatus, PaymentMethod)
- Общие constants (LOYALTY_LEVELS, ROLES)

### Шаг 8.3: Utils

- Общие утилиты (formatPrice, formatDate)
- Валидаторы

---

## ФАЗА 9: CROSS-CUTTING CONCERNS

> Цель: проверить аспекты, которые пронизывают весь проект.

### 9.1: Dependency Audit

```bash
# Проверка уязвимостей
pnpm audit 2>&1

# Устаревшие пакеты
pnpm outdated 2>&1

# Дублирование зависимостей
pnpm why <package> # для подозрительных дублей
```

### 9.2: Environment Variables

```bash
cat .env.example 2>/dev/null || cat apps/api/.env.example 2>/dev/null
```

**Проверить:**

- Все необходимые переменные документированы
- Нет захардкоженных секретов в коде
- .env в .gitignore

### 9.3: i18n Coverage

```bash
# Проверить файлы локализации
find . -name "*.json" -path "*/locales/*" -o -name "*.json" -path "*/i18n/*" | sort
```

**Проверить:**

- ru.json, uz.json, en.json — полнота
- Нет hardcoded строк в компонентах

### 9.4: Error Handling Pattern

Проверить единообразие:

- API: HttpExceptionFilter
- Web: error.tsx, loading.tsx
- Client: Error boundaries
- Mobile: Error screens
- Bot: Error middleware

### 9.5: Logging

- Структурированное логирование (Winston/Pino/NestJS Logger)
- Уровни (error, warn, info, debug)
- Нет console.log в production коде
- Корреляционные ID (request-id)

---

## ФАЗА 10: ФОРМИРОВАНИЕ ИТОГОВОГО ОТЧЁТА

> Цель: свести все находки в структурированный документ с приоритизацией.

### Формат итогового отчёта

```markdown
# VendHub OS — Полный Аудит Проекта

## Дата: [дата аудита]

---

## 1. Executive Summary (Общая оценка)

- Общая готовность к production: X/100
- Критические блокеры: X штук
- Серьёзные проблемы: X штук
- Улучшения: X штук

### Вердикт: [READY / NEEDS WORK / NOT READY]

---

## 2. Scorecard по приложениям

| App    | Build | Types | Tests | Security | UX  | API Coverage | Score |
| ------ | ----- | ----- | ----- | -------- | --- | ------------ | ----- |
| API    | ✅/❌ | X err | X/Y   | ⚠️       | —   | —            | X/10  |
| Web    | ✅/❌ | X err | —     | —        | ⚠️  | X%           | X/10  |
| Client | ✅/❌ | X err | —     | —        | ✅  | X%           | X/10  |
| Mobile | ✅/❌ | X err | —     | —        | ⚠️  | X%           | X/10  |
| Bot    | ✅/❌ | X err | —     | —        | —   | X%           | X/10  |
| Infra  | —     | —     | —     | ⚠️       | —   | —            | X/10  |

---

## 3. Критические проблемы (P0) — ИСПРАВИТЬ НЕМЕДЛЕННО

### P0-001: [Название]

- **Где:** файл:строка
- **Что:** описание проблемы
- **Почему критично:** последствия
- **Как исправить:** конкретные шаги
- **Оценка:** X часов

### P0-002: ...

---

## 4. Серьёзные проблемы (P1) — ИСПРАВИТЬ ДО РЕЛИЗА

### P1-001: [Название]

- **Где:** ...
- **Что:** ...
- **Как исправить:** ...
- **Оценка:** X часов

---

## 5. Улучшения (P2) — ЖЕЛАТЕЛЬНО

### P2-001: [Название]

- ...

---

## 6. Отсутствующие компоненты (Gap Analysis)

### API ↔ Web Coverage

| API Module | Web Page | Status   |
| ---------- | -------- | -------- |
| ...        | ...      | ✅/❌/⚠️ |

### API ↔ Client Coverage

| API Feature | Client Page | Status   |
| ----------- | ----------- | -------- |
| ...         | ...         | ✅/❌/⚠️ |

### API ↔ Mobile Coverage

| API Feature | Mobile Screen | Status   |
| ----------- | ------------- | -------- |
| ...         | ...           | ✅/❌/⚠️ |

---

## 7. Полная Compliance Matrix (60 API модулей)

[таблица из Фазы 2]

---

## 8. Security Findings

### Высокий риск

### Средний риск

### Низкий риск

---

## 9. Performance Issues

### Backend

### Frontend

### Database

---

## 10. План действий (Prioritized Action Plan)

### Неделя 1 (P0 — блокеры)

1. [ ] Задача — X часов
2. [ ] Задача — X часов

### Неделя 2-3 (P1 — важное)

1. [ ] ...

### Неделя 4+ (P2 — улучшения)

1. [ ] ...

### Общая оценка трудозатрат: XX-YY человеко-дней

---

## 11. Рекомендации по архитектуре

### Что хорошо (сохранить)

### Что изменить

### Что добавить
```

---

## АЛГОРИТМ РАБОТЫ (для AI-агента)

```
ПОРЯДОК ВЫПОЛНЕНИЯ:

1. Прочитай CLAUDE.md — запомни стек и правила
2. Фаза 1 — Build Health Check (ВСЁ собирается?)
   → Если нет — документируй ошибки
3. Фаза 2 — Backend аудит (КАЖДЫЙ из 60 модулей)
   → Самая объёмная фаза, не спеши
4. Фаза 3 — Web Admin аудит
5. Фаза 4 — Client PWA аудит
6. Фаза 5 — Mobile аудит
7. Фаза 6 — Bot аудит
8. Фаза 7 — Infrastructure аудит
9. Фаза 8 — Shared packages аудит
10. Фаза 9 — Cross-cutting concerns
11. Фаза 10 — Формирование итогового отчёта

ПРАВИЛА:
- НЕ пропускай модули. Проверяй ВСЕ 60 API модулей.
- Каждую проблему описывай КОНКРЕТНО: файл, строка, что именно не так.
- Предлагай КОНКРЕТНОЕ решение, а не абстрактные советы.
- Группируй по приоритету: P0 (блокер), P1 (важно), P2 (улучшение).
- Используй параллельные агенты (Task tool) для ускорения.
- Создавай промежуточные отчёты после каждой фазы.
- НИКОГДА не предполагай — читай реальный код.
- Используй grep/find для поиска паттернов по всему проекту.
```

---

## ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ (если останется время)

### A. Dead Code Detection

```bash
# Неиспользуемые файлы, экспорты, импорты
npx ts-prune apps/api/src 2>/dev/null
```

### B. Code Complexity

```bash
# Файлы с высокой цикломатической сложностью (>15)
# Функции длиннее 100 строк
# Файлы больше 500 строк
find apps/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```

### C. Consistency Check

- Единый стиль импортов (relative vs absolute)
- Единый стиль naming (kebab-case файлы, PascalCase компоненты)
- Единый стиль error handling

### D. Database Schema Integrity

```bash
# Проверить все entity файлы на:
# - Отсутствующие индексы
# - Неправильные relation types
# - Nullable/non-nullable мисмэтч
find apps/api/src -name "*.entity.ts" | sort
```

### E. API Documentation Completeness

```bash
# Swagger decorators coverage
grep -r "@ApiTags" apps/api/src --include="*.ts" -c
grep -r "@ApiOperation" apps/api/src --include="*.ts" -c
# Сравнить числа — каждый controller должен иметь @ApiTags,
# каждый endpoint должен иметь @ApiOperation
```

---

## БИЗНЕС-КОНТЕКСТ (для правильной оценки)

- Рынок: Узбекистан
- Валюта: UZS (Uzbek Sum)
- Языки: uz-UZ, ru-RU, en
- Timezone: Asia/Tashkent (UTC+5)
- Платёжные системы: Payme, Click, Uzum Bank, HUMO, UZCARD, Telegram Stars, наличные
- Фискализация: OFD / Soliq.uz / Multikassa
- 7 ролей RBAC: owner, admin, manager, operator, warehouse, accountant, viewer
- 4 тира лояльности: Bronze → Silver → Gold → Platinum
