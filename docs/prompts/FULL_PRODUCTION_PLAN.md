# VendHub OS — Полный План Доработки до 100% Production

**Дата:** 17 февраля 2026
**Текущая готовность:** ~55% (реальная оценка после глубокого аудита)
**Целевая готовность:** 100% Production-Ready
**Метод:** Автономная работа Claude Code с самопроверкой

---

## КОНТЕКСТ ПРОЕКТА

VendHub OS — unified vending machine management platform для Узбекистана.
Turborepo монорепо: NestJS 11 API + Next.js 16 Admin + Vite React PWA + React Native Mobile + Telegraf Bot.

### Текущее Состояние (Верифицировано)

| Компонент               | Файлов                                           | Готовность | Главные Проблемы                               |
| ----------------------- | ------------------------------------------------ | ---------- | ---------------------------------------------- |
| **API** (NestJS)        | 59 модулей, 92 entity, 77 service, 64 controller | 75%        | 11 модулей без DTOs, strict mode отключён      |
| **Web** (Next.js Admin) | 52 страницы, 95 файлов                           | 30%        | Большинство страниц — скелеты, нет auth guards |
| **Client** (Vite PWA)   | 16 страниц, 38 файлов                            | 40%        | Нет реальной API интеграции, checkout stub     |
| **Mobile** (Expo)       | 15 экранов, 30 файлов                            | 25%        | Незавершённые workflows, нет offline           |
| **Bot** (Telegraf)      | 13 команд, 50+ callbacks                         | 50%        | Payment stubs, нет logging                     |
| **Shared** (tsup)       | 12 типов, 4 utils, 3 constants                   | 20%        | Неполные типы, дублирование                    |
| **Тесты**               | 62 unit + 16 E2E, 0 frontend                     | 35%        | Нет coverage thresholds, нет CI                |
| **Инфра**               | Docker, K8s, Helm, Terraform, Monitoring         | 70%        | Нет CI/CD pipeline                             |

---

## ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА (НЕ НАРУШАТЬ)

1. **BaseEntity** — каждая entity наследует BaseEntity (id UUID, created_at, updated_at, deleted_at, created_by_id, updated_by_id)
2. **UUID** — все PK и FK строки UUID, никогда number
3. **snake_case** — все колонки БД в snake_case
4. **class-validator** — все DTOs с декораторами @IsString, @IsNumber, @IsEnum, @IsOptional и т.д.
5. **Swagger** — @ApiTags, @ApiOperation, @ApiProperty на всех endpoints и DTOs
6. **Soft delete** — только через @DeleteDateColumn, .softDelete(), .restore()
7. **Multi-tenant** — фильтрация по organization_id во всех запросах
8. **Нет Drizzle, MySQL, tRPC, Express standalone** — только TypeORM + NestJS + PostgreSQL

---

## ФАЗА 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ API (Приоритет: P0)

### 1.1 Добавить DTOs к 11 модулям без валидации

**Модули без DTOs:**

```
organizations, locations, audit, security, webhooks,
storage, ai, monitoring, health, bull-board, geo (частично)
```

**Для каждого модуля:**

1. Создать `dto/create-<name>.dto.ts` и `dto/update-<name>.dto.ts`
2. Добавить class-validator декораторы на все поля
3. Добавить @ApiProperty декораторы для Swagger
4. Обновить контроллер чтобы использовал DTOs
5. Проверить: `npx tsc --noEmit` в apps/api

**Пример шаблона DTO:**

```typescript
import { IsString, IsOptional, IsUUID, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOrganizationDto {
  @ApiProperty({ description: "Organization name" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
```

**Используй скилл:** `vhm24-api-generator`

### 1.2 Включить TypeScript Strict Mode в API

**Файл:** `apps/api/tsconfig.json`

**Текущее (ПЛОХО):**

```json
"strictPropertyInitialization": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noUncheckedIndexedAccess": false
```

**Целевое:**

```json
"strictPropertyInitialization": false, // оставить для entity декораторов
"noUnusedLocals": true,
"noUnusedParameters": true,
"noUncheckedIndexedAccess": true
```

После включения — исправить все возникшие TS ошибки.

### 1.3 Убрать все `any` типы (2354 случая)

**Приоритет:** Критические файлы (controllers, services, entities) — заменить `any` на конкретные типы.
**Допустимо:** `any` в тестах и internal utilities.

**Алгоритм:**

```bash
# Найти все any
grep -rn ": any" apps/api/src --include="*.ts" | grep -v spec | grep -v node_modules | wc -l
# Исправлять по файлам, начиная с controllers и services
```

### 1.4 Закоммитить незакоммиченные изменения

28 файлов с изменениями — проверить, создать осмысленные коммиты.

---

## ФАЗА 2: BACKEND — ПОЛНАЯ ДОРАБОТКА API

### 2.1 Проверить и дополнить все 59 модулей

**Для каждого модуля проверить:**

- [ ] Entity extends BaseEntity
- [ ] Все поля с правильными типами (@Column, @ManyToOne, etc.)
- [ ] Controller с CRUD endpoints (GET list, GET one, POST, PATCH, DELETE)
- [ ] Service с бизнес-логикой
- [ ] DTOs с class-validator
- [ ] Swagger декораторы
- [ ] Тест файл (.spec.ts)
- [ ] Модуль зарегистрирован в app.module.ts
- [ ] Multi-tenant фильтрация (organization_id)

**Модули требующие доработки (топ-14):**

1. **organizations** — добавить DTOs
2. **locations** — добавить DTOs
3. **audit** — добавить DTOs для фильтрации логов
4. **security** — добавить DTOs для security events
5. **webhooks** — добавить entity + DTOs
6. **storage** — добавить entity + DTOs для файлового хранилища
7. **ai** — добавить entity + DTOs
8. **monitoring** — добавить DTOs для метрик
9. **health** — добавить тесты
10. **bull-board** — добавить тесты
11. **geo** — добавить entity если нужна геозона
12. **recommendations** — добавить entity
13. **websocket** — добавить REST controller для управления подписками
14. **fiscal** — добавить недостающие DTOs

### 2.2 Database: Миграции и Seeds

1. Проверить все 49 миграций на корректность
2. Создать seed данные для разработки:
   - Тестовая организация
   - Админ пользователь
   - 5-10 машин с локациями
   - Продукты и категории
   - Тестовые транзакции
3. Проверить: `pnpm db:migrate && pnpm db:seed`

### 2.3 API Security Hardening

**Используй скилл:** `vhm24-security-hardening`

1. CORS — настроить для production:
   ```typescript
   app.enableCors({
     origin: process.env.CORS_ORIGINS?.split(","),
     credentials: true,
     methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
     allowedHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
   });
   ```
2. Helmet — проверить настройки CSP
3. Rate Limiting — проверить ThrottlerModule настройки
4. Input Sanitization — проверить все DTOs
5. SQL Injection — проверить все raw queries
6. JWT — проверить refresh token rotation

---

## ФАЗА 3: FRONTEND — ADMIN PANEL (apps/web)

**Используй скилл:** `vhm24-ui-generator`

### 3.1 Auth System

1. **Middleware** — route protection для всех /dashboard/\* маршрутов
2. **Auth Guards** — проверка токена и роли перед рендером страницы
3. **Token Refresh** — автоматическое обновление при 401
4. **Logout** — корректное завершение сессии

### 3.2 Доработать все 52 страницы

**Каждая страница должна иметь:**

- Реальную интеграцию с API (не моки)
- Loading states (Skeleton)
- Error states (Error boundaries)
- Empty states
- Пагинацию и фильтрацию в таблицах
- CRUD операции через формы
- Role-based visibility (показывать только то что доступно роли)

**Приоритетные страницы (P0):**

1. Dashboard Overview — KPIs с реальными данными
2. Machines List + Detail — полный CRUD
3. Products List + Detail — полный CRUD с drink/snack логикой
4. Users List + Create/Edit — управление пользователями с ролями
5. Inventory Dashboard — 3-уровневый складской учёт
6. Tasks Kanban — создание, назначение, статусы
7. Transactions List — продажи с фильтрами
8. Locations — CRUD + карта
9. Settings — организация, профиль
10. Auth pages — login, forgot password, reset password

**Страницы P1 (важные):** 11. Reports — аналитические отчёты с графиками 12. Fiscal — фискальные операции (ИСПРАВИТЬ API ОШИБКИ) 13. Payments — история и настройки платёжных систем 14. Employees — HR функционал 15. Routes + Trips — маршруты и рейсы 16. Maintenance — обслуживание машин 17. Complaints — обработка жалоб 18. Contractors — управление подрядчиками 19. Equipment — оборудование 20. Directories — справочники

**Страницы P2 (дополнительные):**
21-52. Остальные страницы доработать до функционального состояния.

### 3.3 Компоненты

**Используй скилл:** `vhm24-component-lib`

Проверить наличие и доработать:

- DataTable с сортировкой, фильтрацией, пагинацией
- Forms с React Hook Form + Zod
- Charts с Recharts (line, bar, pie, area)
- Map компонент (Yandex Maps)
- FileUpload
- DateRangePicker
- StatusBadge
- ConfirmDialog
- Breadcrumbs
- Notifications (Sonner toast)

### 3.4 i18n (Локализация)

**Используй скилл:** `vhm24-i18n`

- Русский (основной)
- Узбекский
- Английский
- Все тексты через i18n, никаких хардкод строк

---

## ФАЗА 4: FRONTEND — CLIENT PWA (apps/client)

**Используй скиллы:** `vhm24-ui-generator`, `vhm24-mobile`

### 4.1 API интеграция

Все 16 страниц подключить к реальному API:

1. HomePage — реальные машины с геолокацией
2. MapPage — Google/Yandex Maps с маркерами машин
3. MachineDetailPage — данные машины
4. MenuPage — продукты из API
5. CartPage — корзина с реальными ценами
6. CheckoutPage — оплата (Payme, Click, Uzum Bank)
7. ProfilePage — данные пользователя
8. LoyaltyPage — реальные баллы
9. QuestsPage — реальные квесты
10. FavoritesPage — из API
11. TransactionHistoryPage — из API
12. ReferralsPage — реальная реферальная система
13. ComplaintPage — отправка в API
14. QRScanPage — сканирование QR машины

### 4.2 PWA Features

- Service Worker с offline fallback
- Push notifications
- Manifest icons (pwa-192x192.png, pwa-512x512.png)
- App update prompt
- Offline page

### 4.3 Payment Integration

**Используй скилл:** `vhm24-payments`

- Payme checkout
- Click checkout
- Uzum Bank
- Telegram Stars (для бота)
- Cash (наличные)

---

## ФАЗА 5: MOBILE APP (apps/mobile)

**Используй скилл:** `vhm24-mobile`

### 5.1 Завершить экраны

1. Доработать TaskPhotoScreen — загрузка фото через camera
2. Добавить экран MachineMap (Expo MapView)
3. Push notifications — полная настройка
4. Offline синхронизация — AsyncStorage/MMKV
5. Biometric auth — Expo LocalAuthentication
6. Deep linking — Expo Linking

### 5.2 Mobile-specific

- Expo EAS Build configuration
- App Store / Google Play подготовка
- Permissions handling
- Background tasks

---

## ФАЗА 6: TELEGRAM BOT (apps/bot)

### 6.1 Доработки

1. Payment flows — Payme/Click через Telegram Pay
2. Full API integration — все endpoints
3. Image/file handling
4. Structured logging (Winston/Pino)
5. Error recovery
6. Bot analytics
7. Mini-app (TWA) integration

---

## ФАЗА 7: SHARED PACKAGE (packages/shared)

### 7.1 Унификация

1. Общий API клиент (axios instance с interceptors)
2. Все shared типы (sync с API entities)
3. Shared validation schemas (Zod)
4. Shared constants (roles, statuses, enums)
5. Shared hooks (useAuth, useApi, useNotifications)
6. Utility functions (format, date, distance)

---

## ФАЗА 8: ТЕСТИРОВАНИЕ

**Используй скилл:** `vhm24-testing`

### 8.1 Unit Tests (Jest)

**Цель:** 80%+ coverage

1. **API:** Дописать тесты для всех 59 сервисов (сейчас 62 файла)
2. Добавить тесты для health, bull-board модулей
3. Добавить coverage thresholds в jest.config.ts:
   ```typescript
   coverageThreshold: {
     global: { branches: 70, functions: 80, lines: 80, statements: 80 }
   }
   ```

### 8.2 E2E Tests (Playwright)

**Цель:** Покрыть все critical user flows

**API E2E:** (сейчас 7 -> нужно 20+)

- Auth complete flow
- Machines CRUD
- Products CRUD
- Inventory operations
- Tasks lifecycle
- Payments flow
- Reports generation
- Users CRUD
- Locations CRUD
- Settings

**Web E2E:** (сейчас 4 -> нужно 15+)

- Login/Logout
- Dashboard navigation
- Machines CRUD
- Products CRUD
- Inventory
- Tasks
- Users management
- Reports
- Settings

**Client E2E:** (сейчас 4 -> нужно 10+)

- Home page
- Machine discovery
- Cart flow
- Checkout
- Profile
- Loyalty
- Quests
- Referrals

### 8.3 Frontend Unit Tests

- React Testing Library для web и client
- Component tests для всех shared компонентов
- Hook tests для custom hooks

---

## ФАЗА 9: CI/CD И DEVOPS

**Используй скилл:** `vhm24-devops`

### 9.1 GitHub Actions Pipeline

**Создать:** `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    - pnpm lint --max-warnings 0
    - pnpm type-check
  test:
    - pnpm test:unit
    - Coverage gate >= 80%
  e2e:
    - Docker services (postgres, redis)
    - pnpm test:e2e
  build:
    - pnpm build
    - Docker image build
  security:
    - npm audit
    - Snyk scan (optional)
```

### 9.2 Docker Production

- Проверить все Dockerfiles (api, web, client, bot)
- Multi-stage builds
- Non-root user
- Health checks в каждом контейнере
- Resource limits в docker-compose.prod.yml

### 9.3 Kubernetes

- Проверить все manifests (deployments, services, ingress, HPA, PDB)
- Secrets management
- ConfigMaps per environment
- Horizontal Pod Autoscaler
- Pod Disruption Budgets

---

## ФАЗА 10: МОНИТОРИНГ И OBSERVABILITY

**Используй скилл:** `vhm24-monitoring`

### 10.1 Logging

- Winston structured logging в API
- Log levels per environment
- Request/Response logging
- Error tracking

### 10.2 Metrics

- Prometheus metrics endpoint (/metrics)
- Custom business metrics:
  - Transactions per machine
  - Revenue per hour
  - Machine uptime
  - Payment success rate

### 10.3 Dashboards

- Grafana dashboards для:
  - System health
  - Business KPIs
  - Error rates
  - Performance
- Alertmanager rules для critical events

### 10.4 Error Tracking

- Sentry integration (API + Web + Client)
- Source maps upload
- Release tracking

---

## ФАЗА 11: ДОКУМЕНТАЦИЯ

**Используй скилл:** `vhm24-docs-generator`

### 11.1 API Documentation

- Swagger/OpenAPI полная документация
- Postman collection (обновить)
- API authentication guide

### 11.2 Developer Documentation

- CONTRIBUTING.md
- Architecture overview
- Module documentation
- Database schema diagram
- Deployment guide (обновить)

### 11.3 User Documentation

- Admin panel user guide
- Mobile app user guide
- API integration guide для партнёров

---

## СТРАТЕГИЯ ВЫПОЛНЕНИЯ

### Параллельные потоки

Запускай через `Task` tool параллельные субагенты:

**Поток 1: Backend**

- Фазы 1, 2 (API DTOs, strict mode, security)

**Поток 2: Frontend**

- Фазы 3, 4 (Web admin, Client PWA)

**Поток 3: Testing + CI**

- Фазы 8, 9 (тесты, GitHub Actions)

**Поток 4: Mobile + Bot**

- Фазы 5, 6 (Mobile, Telegram)

### Порядок выполнения

```
Фаза 1 (P0) → Фаза 2 (P0) → Фаза 8 (P0)
     ↓              ↓              ↓
Фаза 3 (P1) → Фаза 4 (P1) → Фаза 9 (P1)
     ↓              ↓              ↓
Фаза 5 (P2) → Фаза 6 (P2) → Фаза 7 (P2)
     ↓              ↓              ↓
Фаза 10 (P2) → Фаза 11 (P2) → ФИНАЛ
```

### Верификация после каждой фазы

```bash
# TypeScript
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/client && npx tsc --noEmit

# Lint
pnpm lint --max-warnings 0

# Tests
pnpm test

# Build
pnpm build

# E2E (если docker запущен)
pnpm test:e2e
```

### Самоконтроль

После каждой фазы:

1. Проверь что код компилируется
2. Проверь что тесты проходят
3. Проверь что lint чистый
4. Проверь что build успешный
5. Если ошибка — исправь сам и повтори проверку
6. НЕ ПРОДОЛЖАЙ к следующей фазе пока текущая не пройдена

---

## ФИНАЛЬНЫЙ ЧЕКЛИСТ (100% Production)

### Backend

- [ ] Все 59 модулей с полными DTOs и class-validator
- [ ] Все entities наследуют BaseEntity
- [ ] Swagger документация на 100% endpoints
- [ ] TypeScript строгий режим
- [ ] 0 критических `any` типов в production коде
- [ ] CORS, Helmet, Rate Limiting настроены
- [ ] JWT + TOTP аутентификация работает
- [ ] 7 ролей RBAC функционируют
- [ ] Multi-tenant фильтрация на всех запросах
- [ ] Миграции рабочие, seed данные есть
- [ ] Health checks: /health, /ready, /metrics

### Frontend (Web)

- [ ] Все 52 страницы функциональны
- [ ] Auth guards на всех protected маршрутах
- [ ] API интеграция на всех страницах
- [ ] Пагинация, фильтрация, сортировка в таблицах
- [ ] CRUD формы с валидацией
- [ ] Loading/Error/Empty states
- [ ] Responsive design
- [ ] Dark mode
- [ ] i18n (ru, uz, en)

### Frontend (Client PWA)

- [ ] Все 16 страниц с реальными данными
- [ ] Checkout с Payme/Click/Uzum
- [ ] PWA: service worker, offline, manifest, icons
- [ ] Push notifications
- [ ] Geolocation

### Mobile

- [ ] Все экраны функциональны
- [ ] Camera integration
- [ ] Push notifications
- [ ] Offline support
- [ ] EAS Build configured

### Bot

- [ ] Все 13 команд работают
- [ ] Payment integration
- [ ] Logging & monitoring
- [ ] Error recovery

### Testing

- [ ] 80%+ unit test coverage
- [ ] E2E tests для critical flows
- [ ] Frontend component tests
- [ ] Coverage thresholds enforced

### DevOps

- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker production builds
- [ ] K8s manifests validated
- [ ] Monitoring dashboards
- [ ] Alerting rules
- [ ] Sentry error tracking
- [ ] Deployment runbook updated

### Documentation

- [ ] Swagger API docs complete
- [ ] Developer onboarding guide
- [ ] Deployment procedures
- [ ] Architecture documentation

---

## ИСПОЛЬЗУЕМЫЕ SKILLS

| Фаза | Skill                      | Цель                         |
| ---- | -------------------------- | ---------------------------- |
| 1-2  | `vhm24-api-generator`      | Генерация DTOs, endpoints    |
| 1-2  | `vhm24-db-expert`          | Миграции, entities           |
| 1-2  | `vhm24-auth-rbac`          | Auth, guards, roles          |
| 1-2  | `vhm24-security-hardening` | CORS, rate limit, validation |
| 3    | `vhm24-ui-generator`       | React страницы               |
| 3    | `vhm24-component-lib`      | UI компоненты                |
| 3    | `vhm24-forms`              | Формы с RHF + Zod            |
| 3    | `vhm24-charts`             | Recharts дашборды            |
| 4    | `vhm24-payments`           | Payme, Click, Uzum           |
| 4-5  | `vhm24-mobile`             | Mobile patterns              |
| 5    | `vhm24-realtime`           | WebSocket                    |
| 7    | `vhm24-i18n`               | Локализация                  |
| 8    | `vhm24-testing`            | Jest + Playwright            |
| 9    | `vhm24-devops`             | Docker, CI/CD                |
| 10   | `vhm24-monitoring`         | Prometheus, Grafana          |
| 11   | `vhm24-docs-generator`     | Swagger, ADR, README         |
| \*   | `vhm24-qa-review`          | Код-ревью каждой фазы        |
| \*   | `vhm24-orchestrator`       | Координация skills           |

---

## ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НЕ создавай файлы ради файлов** — каждый файл должен быть интегрирован в проект
2. **НЕ дублируй код** — используй shared package
3. **НЕ пропускай валидацию** — каждый DTO должен иметь декораторы
4. **НЕ используй `any`** — всегда указывай конкретный тип
5. **НЕ забывай про тесты** — пиши тест до или сразу после кода
6. **Коммить часто** — после каждой завершённой подзадачи
7. **Проверяй себя** — после каждого блока кода запускай tsc, lint, test

---

_Промпт создан на основе глубокого аудита 17.02.2026_
_4 параллельных агента проанализировали: API модули, Frontend, Инфраструктуру, Тестирование_
