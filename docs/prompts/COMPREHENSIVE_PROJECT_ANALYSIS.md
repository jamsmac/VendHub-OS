# Промт: Комплексный всесторонний анализ проекта VendHub OS

> **Цель:** Провести глубокий, детальный аудит всех аспектов проекта VendHub OS — от архитектуры и кода до DevOps, безопасности, бизнес-логики и готовности к продакшену.
>
> **Формат результата:** Для каждого раздела — конкретные находки с примерами файлов/строк, оценка критичности (🔴 Critical / 🟡 Warning / 🟢 OK), и рекомендации по исправлению.

---

## КОНТЕКСТ ПРОЕКТА

VendHub OS — унифицированная платформа управления вендинговыми автоматами для рынка Узбекистана. Turborepo-монорепо с 6 приложениями (api, web, client, bot, mobile, site), 84 API-модулями на NestJS, фронтенд на Next.js/React/Vite. Миграция бизнес-логики из VHM24-repo (56 модулей NestJS) в продакшен-архитектуру.

**Стек:** NestJS 11.1 + TypeORM 0.3.20 + PostgreSQL 16 + Redis 7/BullMQ 5 + Next.js 16.1 + React 19.2 (web/client/site) / React 18.3 (mobile) + Expo 52 + Telegraf 4.16 + shadcn/ui + TailwindCSS 3.4 + Sentry (error tracking)

**Тестирование:** Jest 29 (api, bot) + Vitest 1.6 (client) + Playwright 1.48 (E2E)

**i18n:** next-intl 4.8 (web/site) + i18next 25.5 (client, mobile)

**Docker-сервисы (13):**

- Core: postgres:16-alpine, redis:7-alpine
- Apps: api (:4000), web (:3000), client (:5173), bot (:3001), site (:3100)
- Infra: minio (:9000/:9001), nginx (:80/:443), certbot, db-backup
- Dev-only: adminer (:8080), redis-commander (:8081), bull-board (:3030)

**CI/CD:** GitHub Actions — 3 workflow (ci.yml, deploy.yml, release.yml)

**Текущие метрики:**

- 84 API-модуля, 12 миграций, 2 BullMQ-процессора (fiscal, machine-writeoff)
- 3 WebSocket-гейтвея (MachineEvents, OrderEvents, Notification)
- 3 платёжных провайдера (PaymeHandler, ClickHandler, UzumHandler) + Telegram Stars
- 5 Guards (JwtAuth, Roles, Organization, Csrf, UserThrottler)
- 7 ролей RBAC: owner(100), admin(90), manager(70), accountant(50), warehouse(40), operator(30), viewer(10)
- BaseEntity: id(UUID), createdAt, updatedAt, deletedAt, createdById, updatedById
- Shared пакет (@vendhub/shared): 16 type-файлов, 3 constants, 6 utils, tsup-сборка

---

## ЧАСТЬ 1: АРХИТЕКТУРА И СТРУКТУРА

### 1.1 Монорепо-архитектура

- Правильно ли настроен Turborepo? Проверь `turbo.json` — пайплайны, кэширование, зависимости между apps
- Корректен ли `pnpm-workspace.yaml`? Нет ли дублирования зависимостей между apps?
- Используется ли shared-пакет (`packages/shared`) эффективно? Все ли общие типы, энумы, утилиты вынесены туда?
- Есть ли циклические зависимости между пакетами?

### 1.2 Структура API (NestJS)

- Все ли 84 модуля зарегистрированы в `app.module.ts`?
- Нет ли "орфанных" модулей (существуют как папки, но не подключены)?
- Соблюдается ли единая структура модулей: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `entities/`?
- Правильно ли настроены `imports`/`exports` между модулями? Нет ли лишних зависимостей?
- Используется ли `forwardRef()` и если да — оправдано ли это?

### 1.3 Структура фронтенд-приложений

- web (Next.js 16): Используется ли App Router корректно? Есть ли смешение Pages Router и App Router?
- client (Vite PWA): Правильно ли настроен Vite? Оптимизирован ли bundle?
- site (Next.js): Правильно ли настроены SSG/SSR для маркетингового сайта?
- mobile (Expo 52, React Native 0.76.6, **React 18.3.1** — НЕ 19!): Корректна ли конфигурация Expo? Совместимы ли нативные модули? Есть ли план обновления React до 19?
- bot (Telegraf): Правильно ли структурирован код бота? Есть ли middleware-паттерн?

### 1.4 Shared пакет (@vendhub/shared)

- Полнота: 16 type-файлов, 3 constants, 6 utils — все ли общие типы собраны? Нет ли типов в apps, которые должны быть в shared?
- Экспорты настроены через tsup (./types, ./constants, ./utils) — все ли apps используют эти экспорты?
- Нет ли дублирования типов/энумов между apps и shared? (Ранее было 29 дублированных энумов — все ли консолидированы?)
- Правильно ли настроена сборка (tsup 8.0.1)?
- menuData.ts (20KB) — не слишком ли это для shared-пакета? Должен ли быть в web-app?

### 1.5 Специфичные модули (проверка полноты)

- agent-bridge: Правильно ли реализован мост для AI-агентов?
- calculated-state: Корректна ли логика вычисляемых состояний автоматов?
- entity-events: Работает ли Event Sourcing / audit trail?
- custom-fields: Корректно ли работают пользовательские поля?
- geo: Правильно ли работает геокодинг (GeocodingService)?
- machine-access: Правильно ли разграничен доступ к автоматам?

---

## ЧАСТЬ 2: БАЗА ДАННЫХ И ORM

### 2.1 Схема базы данных

- Все ли сущности (entities) наследуют `BaseEntity`? Нет ли сущностей с ручным `id`, `createdAt`, `updatedAt`?
- Все ли первичные ключи — UUID (`string`), а не `number`?
- Правильно ли определены связи: `@OneToMany`, `@ManyToOne`, `@ManyToMany`? Нет ли потерянных связей?
- Есть ли каскадные операции? Безопасны ли они?
- Используется ли `@DeleteDateColumn` для soft delete во ВСЕХ сущностях?
- Все ли внешние ключи типа `string | null`?

### 2.2 Миграции (текущее количество: 12)

- Все ли 12 миграций применимы последовательно? (Init → Invites → FixSchema → Tasks → Missing → InventoryCheck → SyncEntities → SyncDrift → Lifecycle → AlertMetric → CustomFields → PaymentReports)
- Нет ли конфликтующих миграций (одинаковые имена таблиц/колонок)?
- Есть ли миграции с `DROP TABLE` или `DROP COLUMN` без обратной совместимости?
- Включён ли `synchronize: false` в production-конфигурации?
- Правильно ли настроен `SnakeNamingStrategy`?
- Достаточно ли 12 миграций для 84 модулей? Не используется ли synchronize для остальных?

### 2.3 Запросы и производительность

- Есть ли N+1 проблемы в запросах? Где не используются `relations` или `join`?
- Какие таблицы не имеют индексов, но используются в WHERE/JOIN?
- Есть ли raw SQL запросы? Безопасны ли они от SQL-инъекций?
- Используется ли пагинация во ВСЕХ list-эндпоинтах?
- Есть ли тяжёлые запросы, которые нужно оптимизировать?

### 2.4 Мультитенантность

- КАЖДЫЙ запрос фильтруется по `organization_id`? Проверить все сервисы
- Нет ли путей обхода tenant isolation через прямые запросы?
- Тестируется ли tenant isolation?

---

## ЧАСТЬ 3: API И БЭКЕНД

### 3.1 Контроллеры

- Все ли эндпоинты имеют `@ApiTags`, `@ApiOperation`, `@ApiResponse`?
- Используется ли `@ApiProperty` на ВСЕХ DTO-полях?
- Есть ли эндпоинты без `@Auth()` или `@Public()` декораторов (неопределённый доступ)?
- Все ли CRUD-операции следуют REST-соглашениям?
- Нет ли бизнес-логики в контроллерах (должна быть в сервисах)?

### 3.2 DTO и валидация

- Все ли входные данные проходят через DTO с `class-validator`?
- Нет ли эндпоинтов, принимающих `@Body() body: any`?
- Все ли DTO имеют `@IsOptional()` где нужно? Нет ли required-полей, которые должны быть optional?
- Используются ли `@Transform()` и `@Type()` для преобразования данных?
- Есть ли separate Create/Update DTO или используется один и тот же?

### 3.3 Сервисы

- Правильно ли используются транзакции (`queryRunner`, `@Transaction`)?
- Обрабатываются ли ошибки корректно? Используются ли кастомные exceptions?
- Нет ли утечек абстракции (repository-паттерн пробивается в контроллер)?
- Есть ли бизнес-правила, зашитые только в один сервис, но нужные в нескольких?

### 3.4 Guards и Middleware

- Правильно ли настроена цепочка: `UserThrottlerGuard → JwtAuthGuard → RolesGuard → OrganizationGuard → CsrfGuard`?
- Все ли защищённые роуты имеют `@Roles()` с правильными ролями из 7-ролевой RBAC (owner/admin/manager/accountant/warehouse/operator/viewer)?
- Корректно ли работает `@Public()` декоратор?
- Настроен ли rate limiting адекватно?
- Используется ли CsrfGuard на мутирующих эндпоинтах?
- Поддерживает ли JwtAuthGuard agent mode (для agent-bridge)?

### 3.5 Очереди и фоновые задачи

- Правильно ли настроены 2 BullMQ-процессора: FiscalQueueProcessor ("fiscal") и WriteoffProcessor ("machine-writeoff")?
- Используется ли современный WorkerHost-паттерн (`@nestjs/bullmq`)?
- Есть ли retry-логика? Dead letter queue?
- Мониторится ли состояние очередей через bull-board (:3030)?
- Достаточно ли 2 процессоров? Какие ещё операции нужно вынести в очередь (отправка SMS, email, генерация отчётов)?
- Есть ли потенциальные deadlock-ситуации?

### 3.6 WebSocket / Real-time

- Правильно ли настроены 3 гейтвея: MachineEventsGateway, OrderEventsGateway, NotificationGateway?
- Корректно ли BaseGateway валидирует JWT + проверяет token blacklist?
- Правильно ли работает Socket.IO с @socket.io/redis-adapter для кластера?
- Есть ли room-based фильтрация по organization/role?
- Есть ли fallback при потере соединения?
- Не дублируется ли логика между гейтвеями?

---

## ЧАСТЬ 4: ФРОНТЕНД

### 4.1 Архитектура UI

- Правильно ли организован state management (Zustand)?
- Не дублируется ли состояние между stores и React state?
- Используются ли React Hook Form + Zod на всех формах?
- Корректно ли работает кэширование данных?

### 4.2 Компоненты

- Используется ли shadcn/ui консистентно? Нет ли кастомных компонентов, дублирующих shadcn?
- Правильно ли используются Radix UI примитивы?
- Есть ли компоненты с prop drilling глубже 3 уровней?
- Используется ли `React.memo`, `useMemo`, `useCallback` где нужно?
- Есть ли утечки памяти (неочищенные подписки, таймеры)?

### 4.3 Таблицы и данные

- Правильно ли используется `@tanstack/react-table`?
- Есть ли серверная пагинация, сортировка, фильтрация?
- Корректно ли работает виртуализация для больших таблиц?

### 4.4 Графики и дашборды

- Корректно ли интегрирован Recharts?
- Адаптивны ли графики?
- Есть ли loading/error states для всех виджетов?

### 4.5 Формы

- Все ли формы используют React Hook Form + Zod?
- Есть ли формы без валидации?
- Корректно ли работает multi-step wizard?
- Есть ли optimistic updates?

### 4.6 Роутинг и навигация

- web: Правильно ли настроены layouts, loading, error boundaries в App Router?
- client: Правильно ли настроен react-router?
- Есть ли защита роутов по ролям на фронтенде?
- Корректно ли работают breadcrumbs?

### 4.7 Интернационализация

- Поддержаны ли все 3 языка (uz, ru, en)?
- Нет ли хардкоженных строк в компонентах?
- Правильно ли форматируются даты, числа, валюта (UZS)?
- Используется ли timezone Asia/Tashkent?
- Консистентны ли i18n-библиотеки? (next-intl 4.8 в web/site vs i18next 25.5 в client/mobile — осознанный выбор или расхождение?)

---

## ЧАСТЬ 5: БЕЗОПАСНОСТЬ

### 5.1 Аутентификация

- Безопасно ли хранится JWT secret?
- Правильно ли настроен refresh token flow?
- Есть ли защита от brute force (rate limiting на /auth)?
- Корректно ли реализован TOTP (otplib)?
- Есть ли blacklist для отозванных токенов?

### 5.2 Авторизация (RBAC)

- Все ли 7 ролей корректно ограничены?
- Нет ли privilege escalation путей?
- Тестируется ли RBAC автоматически?
- Корректно ли работает OrganizationGuard для tenant isolation?

### 5.3 Уязвимости

- Есть ли SQL-инъекции (raw queries)?
- Есть ли XSS (непроверенный user input в HTML)?
- Есть ли CSRF-уязвимости?
- Есть ли IDOR (Insecure Direct Object Reference) — доступ к чужим ресурсам по ID?
- Защищены ли file upload эндпоинты?
- Есть ли Server-Side Request Forgery (SSRF)?

### 5.4 Данные

- Хешируются ли пароли (bcrypt/argon2)?
- Не логируются ли чувствительные данные?
- Маскируются ли данные карт в платёжных модулях?
- Соответствует ли хранение данных требованиям Узбекистана?

### 5.5 Зависимости

- Есть ли уязвимости в npm-пакетах? (`npm audit`)
- Какие пакеты критически устарели?
- Есть ли пакеты с известными CVE?

---

## ЧАСТЬ 6: ТЕСТИРОВАНИЕ

### 6.1 Покрытие тестами

- Каков текущий процент покрытия (line, branch, function)?
- Какие критические модули НЕ покрыты тестами?
- Есть ли модули с 0% покрытия?

### 6.2 Unit-тесты (Jest 29 для api/bot, Vitest 1.6 для client)

- Все ли сервисы имеют unit-тесты?
- Правильно ли мокаются зависимости?
- Тестируются ли edge cases и ошибки?
- Есть ли тесты для guards, interceptors, pipes?
- Корректно ли настроен Vitest для client-app (не смешивается с Jest)?

### 6.3 Integration-тесты

- Тестируются ли API-эндпоинты с реальной БД?
- Есть ли тесты для цепочки controller → service → repository?
- Тестируется ли RBAC (каждая роль)?

### 6.4 E2E-тесты (Playwright)

- Покрыты ли критические пользовательские сценарии?
- Тестируется ли на разных viewport (desktop, tablet, mobile)?
- Есть ли visual regression тесты?

### 6.5 Качество тестов

- Нет ли flaky-тестов?
- Есть ли тесты, которые зависят от порядка выполнения?
- Используются ли фабрики/фикстуры для тестовых данных?

---

## ЧАСТЬ 7: ПРОИЗВОДИТЕЛЬНОСТЬ

### 7.1 Бэкенд

- Используется ли connection pooling для PostgreSQL?
- Настроен ли Redis-кэш для частых запросов?
- Есть ли memory leaks в long-running процессах?
- Оптимизированы ли bulk-операции?
- Используется ли streaming для больших данных?

### 7.2 Фронтенд

- Каков размер JavaScript-бандлов? Есть ли code splitting?
- Используется ли lazy loading для роутов?
- Оптимизированы ли изображения (WebP, lazy loading)?
- Есть ли Server Components в Next.js (где уместно)?
- Каковы показатели Core Web Vitals (LCP, FID, CLS)?

### 7.3 База данных

- Какие запросы самые медленные (EXPLAIN ANALYZE)?
- Есть ли missing indexes?
- Правильно ли настроен connection pool size?
- Есть ли dead tuples (vacuum)?

### 7.4 Инфраструктура

- Правильно ли настроены ресурсы Kubernetes (requests/limits)?
- Есть ли horizontal autoscaling (HPA)?
- Настроен ли CDN для статики?
- Есть ли rate limiting на уровне nginx?

---

## ЧАСТЬ 8: DEVOPS И ИНФРАСТРУКТУРА

### 8.1 Docker

- Оптимизированы ли Dockerfile (multi-stage, кэширование слоёв)?
- Правильно ли настроен `docker-compose.yml` (healthcheck, depends_on, volumes)?
- Есть ли `.dockerignore` для всех apps?
- Используются ли non-root пользователи в контейнерах?

### 8.2 Kubernetes

- Правильно ли настроены Deployments, Services, Ingress?
- Есть ли liveness и readiness probes?
- Настроены ли resource requests/limits?
- Есть ли NetworkPolicies для изоляции?
- Правильно ли хранятся секреты (Secrets/External Secrets)?

### 8.3 CI/CD (3 GitHub Actions workflow)

- Работают ли все 3 pipeline корректно: ci.yml (тесты/линт), deploy.yml (деплой), release.yml (релиз)?
- Включены ли lint, type-check, test, build в ci.yml?
- Есть ли separate stages (dev → staging → production) в deploy.yml?
- Настроен ли rollback?
- Есть ли автоматический triggering deploy после успешного ci?

### 8.4 Мониторинг

- Правильно ли настроен Prometheus (метрики, алерты)?
- Есть ли Grafana-дашборды для ключевых метрик?
- Настроен ли Loki для централизованных логов?
- Есть ли алерты на критические ситуации (CPU, memory, errors, latency)?
- Мониторятся ли бизнес-метрики (заказы/мин, ошибки оплат)?

### 8.5 Terraform / IaC

- Всё ли infrastructure описано как код?
- Используется ли remote state (S3, Consul)?
- Есть ли plan перед apply?
- Версионируются ли модули Terraform?

---

## ЧАСТЬ 9: КАЧЕСТВО КОДА

### 9.1 Стандарты

- Настроен ли ESLint с правильными правилами?
- Используется ли Prettier? Единый стиль форматирования?
- Есть ли husky + lint-staged для pre-commit?
- TypeScript strict mode включён?

### 9.2 Паттерны и анти-паттерны

- Нет ли God-объектов (сервисы с 1000+ строк)?
- Соблюдается ли Single Responsibility Principle?
- Есть ли dead code (неиспользуемые экспорты, файлы)?
- Нет ли хардкоженных значений (magic numbers, строки)?
- Используются ли правильные паттерны: Repository, Strategy, Observer, Factory?

### 9.3 TypeScript

- Нет ли `any` типов? Сколько их и где?
- Используются ли generics правильно?
- Нет ли type assertions (`as`) где можно использовать type guards?
- Корректны ли generic types в shared-пакете?
- Компилируется ли весь TypeScript без ошибок (`tsc --noEmit`)?

### 9.4 Именование

- Соблюдается ли camelCase для свойств (SnakeNamingStrategy для БД)?
- Консистентны ли имена файлов (kebab-case)?
- Консистентны ли имена модулей, сервисов, контроллеров?

---

## ЧАСТЬ 10: БИЗНЕС-ЛОГИКА

### 10.1 Платежи

- Корректно ли интегрированы 3 провайдера: PaymeHandler (JSON-RPC), ClickHandler (REST/MD5), UzumHandler (REST/HMAC-SHA256)?
- Работает ли Telegram Stars через telegram-payments модуль?
- Обрабатываются ли все callback/webhook-сценарии для каждого провайдера?
- Есть ли защита от double spend?
- Логируются ли все транзакции?
- Корректна ли фискализация (fiscal модуль + FiscalQueueProcessor)?
- Работает ли payment-reports модуль для сверок?
- Есть ли reconciliation между платёжными системами и внутренней БД?
- Корректно ли billing модуль генерирует счета?

### 10.2 Управление автоматами

- Корректна ли телеметрия (температура, уровень продуктов, состояние)?
- Работает ли alert-система при критических показателях?
- Есть ли offline-режим для мобильного приложения техников?
- Правильно ли рассчитываются маршруты обслуживания?

### 10.3 Склад и инвентарь

- Корректен ли учёт движения товаров?
- Есть ли защита от отрицательных остатков?
- Работает ли batch-перемещение?
- Корректна ли инвентаризация?

### 10.4 Лояльность и промо

- Работает ли реферальная программа?
- Корректно ли начисляются/списываются бонусы?
- Есть ли защита от злоупотреблений промо-кодами?
- Работает ли квестовая система?

### 10.5 Отчётность и аналитика

- Корректны ли финансовые отчёты (сверки)?
- Есть ли кэширование тяжёлых аналитических запросов?
- Правильно ли рассчитываются KPI?
- Экспортируются ли отчёты в Excel/PDF?

### 10.6 Telegram Bot

- Корректно ли работает авторизация через Telegram?
- Обрабатываются ли все команды и callback queries?
- Есть ли graceful handling ошибок?
- Работают ли инлайн-клавиатуры?
- Есть ли rate limiting для бот-запросов?

---

## ЧАСТЬ 11: МИГРАЦИЯ VHM24 → VENDHUB OS

### 11.1 Статус миграции

- Сколько из 56 модулей VHM24 уже перенесены?
- Какие модули ещё не мигрированы?
- Есть ли расхождения в бизнес-логике между VHM24 и VendHub OS?
- Потеряна ли какая-либо функциональность при миграции?

### 11.2 Совместимость данных

- Совместимы ли схемы БД?
- Есть ли план миграции данных?
- Тестировалась ли миграция данных?
- Есть ли rollback-план?

### 11.3 API совместимость

- Есть ли breaking changes в API?
- Документированы ли изменения для клиентов API?
- Работает ли vhm24-integration bridge?

---

## ЧАСТЬ 12: ДОКУМЕНТАЦИЯ

### 12.1 Техническая документация

- Актуален ли CLAUDE.md?
- Есть ли README для каждого app?
- Документированы ли все API-эндпоинты (Swagger)?
- Есть ли ADR (Architecture Decision Records)?
- Документирована ли схема базы данных (ER-диаграмма)?

### 12.2 Onboarding

- Может ли новый разработчик запустить проект по документации за 30 минут?
- Есть ли CONTRIBUTING.md?
- Описаны ли все environment variables?

### 12.3 Бизнес-документация

- Есть ли спецификации бизнес-процессов?
- Документирована ли интеграция с платёжными системами?
- Есть ли документация для операторов/менеджеров?

---

## ЧАСТЬ 13: ГОТОВНОСТЬ К ПРОДАКШЕНУ

### 13.1 Чек-лист продакшен-готовности

- [ ] Все apps компилируются без ошибок
- [ ] TypeScript strict: 0 ошибок
- [ ] ESLint: 0 предупреждений
- [ ] Все тесты проходят
- [ ] Покрытие тестами > 70%
- [ ] Нет критических уязвимостей в зависимостях
- [ ] Все секреты в environment variables (не в коде)
- [ ] Health check эндпоинты работают
- [ ] Логирование настроено (structured JSON)
- [ ] Мониторинг и алерты настроены
- [ ] Бэкапы БД настроены
- [ ] SSL/TLS настроен
- [ ] CORS настроен правильно
- [ ] Rate limiting включён
- [ ] Error tracking (Sentry — уже установлен: @sentry/node, @sentry/react) корректно настроен
- [ ] Graceful shutdown реализован
- [ ] Database migrations применяются автоматически
- [ ] Rollback-стратегия документирована

### 13.2 Нагрузочное тестирование

- Проводилось ли load testing?
- Сколько concurrent users выдерживает система?
- Какие bottleneck при нагрузке?
- Есть ли план capacity planning?

### 13.3 Disaster Recovery

- Есть ли DR-план?
- Тестировался ли восстановление из бэкапа?
- Каков RPO/RTO?

---

## ФОРМАТ ОТЧЁТА

Для каждого раздела предоставь:

1. **Статус:** 🔴 Critical / 🟡 Warning / 🟢 OK
2. **Находки:** Конкретные проблемы с указанием файлов и строк
3. **Влияние:** Как это влияет на продакшен
4. **Рекомендация:** Что именно нужно исправить
5. **Приоритет:** P0 (блокер) / P1 (срочно) / P2 (важно) / P3 (улучшение)
6. **Трудозатраты:** Примерная оценка в часах

### Итоговая таблица

| Раздел             | Статус   | Критичных | Предупреждений | ОК  |
| ------------------ | -------- | --------- | -------------- | --- |
| Архитектура        | 🔴/🟡/🟢 | N         | N              | N   |
| БД и ORM           | ...      | ...       | ...            | ... |
| API                | ...      | ...       | ...            | ... |
| Фронтенд           | ...      | ...       | ...            | ... |
| Безопасность       | ...      | ...       | ...            | ... |
| Тестирование       | ...      | ...       | ...            | ... |
| Производительность | ...      | ...       | ...            | ... |
| DevOps             | ...      | ...       | ...            | ... |
| Качество кода      | ...      | ...       | ...            | ... |
| Бизнес-логика      | ...      | ...       | ...            | ... |
| Миграция           | ...      | ...       | ...            | ... |
| Документация       | ...      | ...       | ...            | ... |
| Продакшен          | ...      | ...       | ...            | ... |

### Топ-10 критичных проблем

Приведи 10 самых важных проблем, которые нужно исправить ДО выхода в продакшен, с конкретными шагами.

### Roadmap исправлений

Предложи план исправлений разбитый по спринтам (1 спринт = 1 неделя):

- **Спринт 1:** Блокеры и P0
- **Спринт 2:** Безопасность и P1
- **Спринт 3:** Качество и тесты
- **Спринт 4:** Производительность и оптимизация
- **Спринт 5:** Документация и финализация

---

## ИНСТРУКЦИИ ДЛЯ АГЕНТА

1. **Используй все доступные MCP-серверы** (Serena для навигации по коду, Context7 для документации)
2. **Запускай параллельных агентов** для разных частей анализа
3. **Проверяй код реально**, не опирайся только на CLAUDE.md — он может быть неактуален
4. **Запусти компиляцию** (`tsc --noEmit`) для каждого app
5. **Запусти тесты** (`jest --passWithNoTests`) и зафиксируй результат
6. **Проверь `npm audit`** для уязвимостей
7. **Посчитай метрики**: LOC, количество файлов, покрытие тестами, количество `any`, количество TODO/FIXME
8. **Сравни с CLAUDE.md**: все ли описанные правила реально соблюдаются?

### Команды для запуска

```bash
# ======== КОМПИЛЯЦИЯ (каждый app отдельно) ========
cd apps/api && npx tsc --noEmit 2>&1 | tail -30
cd apps/web && npx tsc --noEmit 2>&1 | tail -30
cd apps/client && npx tsc --noEmit 2>&1 | tail -30
cd apps/bot && npx tsc --noEmit 2>&1 | tail -30
cd apps/site && npx tsc --noEmit 2>&1 | tail -30
# mobile не проверяется через tsc напрямую (Expo-specific)

# Или через Turborepo:
pnpm type-check 2>&1 | tail -50

# ======== ТЕСТЫ ========
# API + Bot (Jest 29)
cd apps/api && npx jest --passWithNoTests --coverage 2>&1 | tail -50
cd apps/bot && npx jest --passWithNoTests 2>&1 | tail -30

# Client (Vitest — НЕ Jest!)
cd apps/client && npx vitest run 2>&1 | tail -30

# E2E (Playwright)
npx playwright test 2>&1 | tail -30

# Или всё через Turborepo:
pnpm test 2>&1 | tail -50

# ======== АУДИТ ЗАВИСИМОСТЕЙ ========
pnpm audit 2>&1 | tail -50

# ======== МЕТРИКИ КОДА ========
# Поиск any типов (по каждому app)
echo "=== any types ===" && \
for app in api web client bot site mobile; do \
  count=$(grep -r ": any\|as any\|<any>" apps/$app/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l); \
  echo "$app: $count"; \
done

# Поиск TODO/FIXME/HACK
echo "=== TODOs ===" && \
grep -rn "TODO\|FIXME\|HACK\|XXX" apps/ --include="*.ts" --include="*.tsx" | wc -l

# Поиск хардкоженных строк
echo "=== Hardcoded URLs ===" && \
grep -rn "http://localhost\|127\.0\.0\.1\|hardcoded" apps/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

# Поиск console.log (не должно быть в продакшене)
echo "=== console.log ===" && \
grep -rn "console\.\(log\|warn\|error\)" apps/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l

# Проверка орфанных модулей (папки без регистрации в app.module)
echo "=== Orphan modules ===" && \
diff <(ls apps/api/src/modules/ | sort) <(grep -oP "import.*from.*modules/\K[^/\"']+|[A-Z]\w+Module" apps/api/src/app.module.ts | sort -u)

# Проверка BaseEntity наследования
echo "=== Entities without BaseEntity ===" && \
grep -rL "extends BaseEntity" apps/api/src/modules/*/entities/*.entity.ts 2>/dev/null

# Проверка UUID vs number PK
echo "=== Non-UUID primary keys ===" && \
grep -rn "@PrimaryGeneratedColumn()" apps/api/src/ --include="*.entity.ts" | grep -v "uuid"

# LOC по apps
echo "=== Lines of code ===" && \
for app in api web client bot site mobile; do \
  count=$(find apps/$app/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1); \
  echo "$app: $count"; \
done

# Размер бандлов
echo "=== Bundle sizes ===" && \
du -sh apps/web/.next 2>/dev/null && \
du -sh apps/client/dist 2>/dev/null && \
du -sh apps/site/.next 2>/dev/null

# Количество миграций
echo "=== Migrations ===" && \
ls -la apps/api/src/database/migrations/ | wc -l

# Shared пакет: проверка дублирования энумов
echo "=== Duplicate enums ===" && \
grep -rn "^export enum" apps/ packages/ --include="*.ts" | awk -F: '{print $NF}' | sort | uniq -d
```

---

_Дата создания: 2026-03-21_
_Дата верификации: 2026-03-21 (сверено с реальной кодовой базой)_
_Проект: VendHub OS_
_Версия промта: 1.1 (verified)_
