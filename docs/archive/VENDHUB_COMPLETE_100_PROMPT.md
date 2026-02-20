# VendHub OS - Комплексный Промпт для Анализа и Доработки до 100%

**Дата:** 4 февраля 2026
**Версия:** 3.0 (Финальная)

---

## 📋 ЧАСТЬ 1: ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

### 🏗️ Архитектура (Monorepo)

```
vendhub-unified/
├── apps/
│   ├── api/          # NestJS Backend (59 модулей, 93 entities)
│   ├── web/          # Next.js Admin Panel (45 pages)
│   ├── client/       # Vite Client App (32 components)
│   ├── bot/          # Telegram Bot (4 handlers)
│   └── mobile/       # React Native (26 screens)
├── packages/
│   └── shared/       # Общие типы и утилиты
├── infrastructure/
│   ├── docker/
│   ├── k8s/
│   ├── terraform/
│   └── helm/
└── docs/
```

### 📊 Статистика Кодовой Базы

| Компонент | Количество | Статус |
|-----------|------------|--------|
| API модулей | 59 | ✅ |
| Database entities | 93 | ✅ |
| Web pages | 45 | ✅ |
| Client components | 32 | ✅ |
| Bot handlers | 4 | ⚠️ |
| Mobile screens | 26 | ⚠️ |
| TypeScript errors | 0 | ✅ |

### 🔧 Что было сделано за последние дни:

1. **Исправления TypeScript:**
   - `trips.controller.ts` - порядок параметров
   - `trips.cron.ts` - CronExpression.EVERY_15_MINUTES → `'*/15 * * * *'`
   - `trips.service.ts` - типы `userId ?? null`

2. **Улучшения безопасности (trips.service.ts):**
   - Проверка vehicle belongs to organizationId
   - Проверка доступа в resolveAnomaly через trip.organizationId
   - SQL запросы с кавычками для snake_case колонок
   - Multi-tenant изоляция

3. **Sentry интеграция:**
   - `@sentry/node` добавлен в dependencies
   - Инициализация в main.ts
   - DSN настроен в .env

4. **Документация создана:**
   - FINAL_READINESS_REPORT.md
   - TRIPS_FRONTEND_PROMPT.md
   - DIRECTORIES_FRONTEND_PROMPT.md
   - MASTER_DATA_INTEGRATION_PROMPT.md
   - VENDTRIP_BOT_INTEGRATION_PROMPT.md

---

## 📋 ЧАСТЬ 2: ОЦЕНКА ГОТОВНОСТИ ПО КОМПОНЕНТАМ

### Backend API: 95% ✅

| Модуль | Entities | Service | Controller | Tests |
|--------|----------|---------|------------|-------|
| auth | ✅ | ✅ | ✅ | ⚠️ |
| users | ✅ | ✅ | ✅ | ⚠️ |
| organizations | ✅ | ✅ | ✅ | ⚠️ |
| machines | ✅ | ✅ | ✅ | ⚠️ |
| products | ✅ | ✅ | ✅ | ⚠️ |
| inventory | ✅ | ✅ | ✅ | ⚠️ |
| tasks | ✅ | ✅ | ✅ | ⚠️ |
| payments | ✅ | ✅ | ✅ | ⚠️ |
| transactions | ✅ | ✅ | ✅ | ⚠️ |
| complaints | ✅ | ✅ | ✅ | ⚠️ |
| **trips** | ✅ | ✅ | ✅ | ❌ |
| **routes** | ✅ | ✅ | ✅ | ❌ |
| **directories** | ✅ | ✅ | ✅ | ❌ |
| vehicles | ✅ | ✅ | ✅ | ❌ |
| employees | ✅ | ✅ | ✅ | ⚠️ |

**Что не хватает:**
- Unit тесты для новых модулей (trips, routes, directories)
- E2E тесты
- API rate limiting fine-tuning

---

### Frontend Web (Next.js): 80% ⚠️

| Страница | Существует | Работает | Полная |
|----------|------------|----------|--------|
| Dashboard | ✅ | ✅ | ⚠️ |
| Machines | ✅ | ✅ | ⚠️ |
| Products | ✅ | ✅ | ⚠️ |
| Inventory | ✅ | ✅ | ⚠️ |
| Tasks | ✅ | ✅ | ⚠️ |
| Users | ✅ | ✅ | ⚠️ |
| Directories | ✅ | ⚠️ | ❌ |
| **Trips** | ❌ | ❌ | ❌ |
| **Routes** | ❌ | ❌ | ❌ |
| Reports | ✅ | ⚠️ | ❌ |

**Что не хватает:**
- Trips страницы (List, Detail, Map)
- Routes страницы (List, Builder, Map)
- Directories полный функционал
- Reports интерактивные графики

---

### Frontend Client (Vite): 70% ⚠️

| Функционал | Статус |
|------------|--------|
| Auth/Login | ✅ |
| Machine finder | ⚠️ |
| Order flow | ⚠️ |
| Loyalty points | ⚠️ |
| Quests | ⚠️ |
| Cart | ⚠️ |

**Что не хватает:**
- Полная интеграция с API
- Offline mode
- Push notifications

---

### Telegram Bot: 60% ⚠️

| Команда | Статус |
|---------|--------|
| /start | ✅ |
| /find | ⚠️ |
| /points | ⚠️ |
| /quests | ⚠️ |
| /history | ⚠️ |
| /referral | ⚠️ |
| /cart | ⚠️ |
| /support | ✅ |
| /help | ✅ |
| **Live Location (Trips)** | ❌ |

**Что не хватает:**
- Интеграция trips.service с bot handlers
- Live Location tracking
- Inline keyboards для управления поездками

---

### Mobile App (React Native): 40% ❌

| Экран | Статус |
|-------|--------|
| Auth | ✅ |
| Dashboard | ⚠️ |
| Tasks | ⚠️ |
| Trip Tracker | ❌ |
| Route Navigation | ❌ |
| Offline sync | ❌ |

**Что не хватает:**
- Trip tracking screens
- Route navigation
- GPS background tracking
- Offline data sync
- Push notifications

---

### DevOps: 75% ⚠️

| Компонент | Статус |
|-----------|--------|
| Docker | ✅ |
| docker-compose | ✅ |
| Kubernetes | ⚠️ |
| Helm charts | ⚠️ |
| Terraform | ⚠️ |
| CI/CD (GitHub Actions) | ⚠️ |
| **Sentry** | ✅ (только что) |
| Monitoring | ⚠️ |

---

## 📋 ЧАСТЬ 3: ПЛАН ДОРАБОТКИ ДО 100%

### Фаза 1: Critical (Неделя 1) — 40 часов

#### 1.1 Web Frontend - Trips Module (20 часов)
```
Создать:
- /dashboard/trips/page.tsx - список поездок
- /dashboard/trips/[id]/page.tsx - детали поездки
- /dashboard/trips/tracker/page.tsx - live карта

Компоненты:
- TripCard.tsx
- TripMap.tsx (Leaflet/Mapbox)
- TripStopsList.tsx
- TripAnomaliesList.tsx
- TripStatsCard.tsx

API интеграция:
- hooks/useTrips.ts
- lib/trips-api.ts
```

#### 1.2 Telegram Bot - Trip Commands (12 часов)
```
Добавить handlers:
- /trip_start - начать поездку
- /trip_end - завершить поездку
- /trip_status - текущий статус

Live Location:
- handlers/location.ts - обработка GPS точек
- Интеграция с trips.service.addPoint()

Inline keyboards:
- Выбор типа задачи
- Подтверждение остановки
- Выбор автомата
```

#### 1.3 Unit Tests для новых модулей (8 часов)
```
Создать:
- trips.service.spec.ts
- routes.service.spec.ts
- directories.service.spec.ts

Покрытие:
- startTrip/endTrip flow
- GPS point filtering
- Anomaly detection
- Geofence verification
```

---

### Фаза 2: Important (Неделя 2) — 40 часов

#### 2.1 Web Frontend - Routes Module (16 часов)
```
Создать:
- /dashboard/routes/page.tsx - список маршрутов
- /dashboard/routes/builder/page.tsx - конструктор
- /dashboard/routes/[id]/page.tsx - детали маршрута

Компоненты:
- RouteMap.tsx
- RouteBuilder.tsx (drag & drop)
- RouteStopCard.tsx
- RouteOptimizer.tsx
```

#### 2.2 Mobile App - Trip Screens (16 часов)
```
Создать:
- screens/TripScreen.tsx
- screens/TripMapScreen.tsx
- screens/RouteNavigationScreen.tsx

Функционал:
- GPS background tracking
- Offline queue для точек
- Push notifications
```

#### 2.3 Web Frontend - Directories Enhancement (8 часов)
```
Улучшить:
- HierarchyTree.tsx (drag & drop)
- FieldRenderer.tsx (все 12 типов)
- ImportExportDialog.tsx
- SyncStatusPanel.tsx
```

---

### Фаза 3: Nice-to-have (Неделя 3) — 24 часа

#### 3.1 E2E Tests (8 часов)
```
Playwright tests:
- Auth flow
- Trip CRUD flow
- Route creation flow
- Directory management
```

#### 3.2 Reports & Analytics (8 часов)
```
Создать:
- TripAnalyticsDashboard.tsx
- EmployeePerformanceChart.tsx
- MachineVisitHeatmap.tsx
- MileageReconciliationReport.tsx
```

#### 3.3 DevOps Finalization (8 часов)
```
Завершить:
- Kubernetes manifests review
- Helm values optimization
- GitHub Actions workflows
- Monitoring dashboards (Grafana)
```

---

## 📋 ЧАСТЬ 4: ПРОМПТ ДЛЯ CLAUDE

### Промпт для полного анализа:

```
Проанализируй проект VendHub OS в папке vendhub-unified:

1. BACKEND АНАЛИЗ:
   - Проверь все 59 модулей в apps/api/src/modules/
   - Найди модули без service.ts или controller.ts
   - Проверь TypeScript ошибки: npx tsc --noEmit
   - Проверь миграции в apps/api/src/database/migrations/

2. FRONTEND WEB АНАЛИЗ:
   - Проверь все страницы в apps/web/src/app/
   - Найди страницы без реальной функциональности (заглушки)
   - Проверь использование API hooks
   - Проверь shadcn/ui компоненты

3. TELEGRAM BOT АНАЛИЗ:
   - Проверь handlers в apps/bot/src/handlers/
   - Найди нереализованные команды
   - Проверь интеграцию с API

4. MOBILE АНАЛИЗ:
   - Проверь screens в apps/mobile/src/
   - Найди экраны без навигации
   - Проверь offline функционал

5. ТЕСТЫ:
   - Найди модули без *.spec.ts файлов
   - Проверь покрытие тестами

6. DEVOPS:
   - Проверь docker-compose.yml
   - Проверь .github/workflows/
   - Проверь infrastructure/

Результат: создай JSON с оценкой каждого компонента от 0 до 100.
```

---

### Промпт для доработки до 100%:

```
Доработай VendHub OS до 100% готовности:

ПРИОРИТЕТ 1 - КРИТИЧНО (эта неделя):

1. TRIPS FRONTEND:
   Используй промпт из Docs/TRIPS_FRONTEND_PROMPT.md
   Создай:
   - apps/web/src/app/dashboard/trips/page.tsx
   - apps/web/src/app/dashboard/trips/[id]/page.tsx
   - apps/web/src/components/trips/TripMap.tsx
   - apps/web/src/components/trips/TripStopsList.tsx
   - apps/web/src/hooks/useTrips.ts

2. TELEGRAM BOT TRIPS:
   В apps/bot/src/handlers/ добавь:
   - location.ts для Live Location
   - trip-commands.ts для /trip_start, /trip_end

   Интегрируй с trips.service через API:
   - POST /api/v1/trips/start
   - POST /api/v1/trips/:id/points
   - POST /api/v1/trips/:id/end

3. UNIT TESTS:
   Создай в apps/api/src/modules/trips/:
   - trips.service.spec.ts
   - trips.controller.spec.ts

ПРИОРИТЕТ 2 - ВАЖНО (следующая неделя):

4. ROUTES FRONTEND:
   Создай:
   - apps/web/src/app/dashboard/routes/page.tsx
   - apps/web/src/app/dashboard/routes/builder/page.tsx
   - apps/web/src/components/routes/RouteMap.tsx
   - apps/web/src/components/routes/RouteBuilder.tsx

5. MOBILE TRIP SCREENS:
   Создай:
   - apps/mobile/src/screens/TripScreen.tsx
   - apps/mobile/src/screens/TripMapScreen.tsx
   - services/gps-tracking.ts

ПРИОРИТЕТ 3 - ДОПОЛНИТЕЛЬНО:

6. E2E TESTS:
   - tests/e2e/trips.spec.ts
   - tests/e2e/routes.spec.ts

7. ANALYTICS DASHBOARDS:
   - apps/web/src/components/analytics/TripAnalytics.tsx

После каждого изменения:
- Запусти npx tsc --noEmit
- Проверь что нет ошибок
- Сохрани прогресс

Цель: довести все компоненты до 95%+ готовности.
```

---

## 📋 ЧАСТЬ 5: ЧЕКЛИСТ ГОТОВНОСТИ

### Backend API ☑️
- [x] 59 модулей созданы
- [x] 93 entities определены
- [x] TypeScript компилируется без ошибок
- [x] Sentry интегрирован
- [x] Multi-tenant изоляция
- [ ] Unit тесты для trips/routes/directories
- [ ] E2E тесты
- [ ] API documentation (Swagger полный)

### Frontend Web ☑️
- [x] 45 страниц созданы
- [x] shadcn/ui компоненты
- [x] Auth flow
- [ ] Trips pages (List, Detail, Map)
- [ ] Routes pages (List, Builder)
- [ ] Directories полный функционал
- [ ] Interactive reports

### Telegram Bot ☑️
- [x] Базовые команды
- [x] Redis sessions
- [x] Rate limiting
- [ ] Live Location handler
- [ ] Trip management commands
- [ ] Inline keyboards

### Mobile App ☑️
- [x] Базовая структура
- [x] 26 screens
- [ ] Trip tracking
- [ ] Route navigation
- [ ] GPS background
- [ ] Offline sync

### DevOps ☑️
- [x] Docker
- [x] docker-compose
- [x] Sentry
- [x] .env configuration
- [ ] K8s manifests review
- [ ] CI/CD pipelines
- [ ] Monitoring dashboards

---

## 📊 ИТОГОВАЯ ОЦЕНКА

| Компонент | Текущий % | Цель % | Часов работы |
|-----------|-----------|--------|--------------|
| Backend API | 95% | 100% | 16 |
| Frontend Web | 80% | 100% | 36 |
| Telegram Bot | 60% | 95% | 16 |
| Mobile App | 40% | 80% | 24 |
| DevOps | 75% | 95% | 12 |
| **ОБЩИЙ** | **70%** | **94%** | **104** |

---

## 🚀 БЫСТРЫЙ СТАРТ

```bash
# 1. Клонировать и установить
cd "VendHub OS/vendhub-unified"
npm install

# 2. Настроить окружение
cp .env.example .env
# Заполнить DATABASE_URL, REDIS_URL, TELEGRAM_BOT_TOKEN, SENTRY_DSN

# 3. Запустить базы данных
docker-compose up -d postgres redis

# 4. Запустить миграции
cd apps/api && npm run migration:run

# 5. Запустить dev сервер
cd ../.. && npm run dev

# 6. Открыть
# API: http://localhost:4000/docs
# Web: http://localhost:3000
# Client: http://localhost:5173
```

---

*Этот промпт содержит полный анализ и план доработки VendHub OS до 100% готовности.*
