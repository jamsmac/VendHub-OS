# Промт: Полный комплексный аудит VendHub OS

> Скопируйте этот промт целиком в новую сессию Claude Code для запуска аудита.

---

## Контекст

Ты проводишь **полный комплексный аудит** монорепозитория VendHub OS — unified vending machine management platform для Узбекистана. Прочитай CLAUDE.md для технического стека и архитектуры, затем AUDIT_REPORT.md и AUDIT_REPORT_v2.md для истории предыдущих аудитов.

**Цель:** Найти ВСЕ проблемы, оценить production-readiness, составить приоритизированный план действий.

---

## Фаза 0: Подготовка (5 мин)

1. Прочитай `CLAUDE.md`, `AUDIT_REPORT.md`, `AUDIT_REPORT_v2.md`
2. Запусти `git log --oneline -20` — пойми последние изменения
3. Запусти `wc -l` на ключевых директориях для оценки масштаба
4. Определи текущее состояние: какие проблемы уже исправлены, какие остались

---

## Фаза 1: Build Health (15 мин)

Для КАЖДОГО приложения проверь компиляцию:

```bash
# API
cd apps/api && npx tsc --noEmit 2>&1 | tail -5

# Web
cd apps/web && npx tsc --noEmit 2>&1 | tail -5

# Client PWA
cd apps/client && npx tsc --noEmit 2>&1 | tail -5

# Mobile
cd apps/mobile && npx tsc --noEmit 2>&1 | tail -5

# Bot
cd apps/bot && npx tsc --noEmit 2>&1 | tail -5
```

**Зафиксируй:** количество TS ошибок в каждом приложении. Если >0, классифицируй по severity.

---

## Фаза 2: Тесты (10 мин)

```bash
# API unit tests
cd apps/api && npx jest --passWithNoTests --forceExit 2>&1 | tail -20

# Подсчёт тестовых файлов
find apps/ -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.e2e-spec.ts" | wc -l
```

**Зафиксируй:** пройдено/упало/пропущено тестов, покрытие если есть.

---

## Фаза 3: Безопасность (критически важно)

### 3.1 Аутентификация и авторизация

Для КАЖДОГО контроллера (`*.controller.ts`) проверь:

- [ ] Есть ли `@UseGuards(JwtAuthGuard)` на уровне класса или модуля?
- [ ] Каждый endpoint имеет `@Roles()` декоратор (или явно `@Public()`)?
- [ ] `@Roles()` импортирован из `common/decorators/roles.decorator` (НЕ локальный)?
- [ ] `@CurrentUser()/@CurrentUserId()/@CurrentOrganizationId()` из `common/decorators/current-user.decorator`?

**КРИТИЧНО:** Если endpoint без `@Roles()` и без `@Public()` — это RBAC bypass (любой authenticated user получает доступ).

### 3.2 Multi-tenant изоляция

Для КАЖДОГО сервиса проверь:

- [ ] Все запросы фильтруют по `organizationId`?
- [ ] `findOne`/`findById` проверяет принадлежность к организации?
- [ ] `update`/`delete` проверяет ownership перед мутацией?
- [ ] Нет ли cross-tenant data leak через relations (eager loading чужих данных)?

### 3.3 Input Validation

- [ ] Все DTOs используют `class-validator` декораторы?
- [ ] Нет ли `@Body() body: any` или нетипизированных параметров?
- [ ] `ValidationPipe` включён глобально с `whitelist: true`?

### 3.4 SQL Injection и XSS

- [ ] Нет raw SQL без параметризации?
- [ ] QueryBuilder использует `:param` а не string concatenation?
- [ ] Нет unsafe HTML rendering с user input?

### 3.5 Secrets и конфигурация

- [ ] Нет hardcoded credentials/tokens/keys в коде?
- [ ] `.env` и `.env.*` в `.gitignore`?
- [ ] JWT secret достаточной длины (>32 символов)?
- [ ] Пароли хешируются (bcrypt/argon2)?

---

## Фаза 4: Архитектура и код

### 4.1 Entity проверка

Для КАЖДОЙ entity (`*.entity.ts`):

- [ ] Наследует `BaseEntity`?
- [ ] UUID primary key (не `number`)?
- [ ] Есть `@DeleteDateColumn` (soft delete) через BaseEntity?
- [ ] Правильные `@Index` для query patterns?
- [ ] Relations имеют корректные cascade настройки?
- [ ] Свойства в camelCase (SnakeNamingStrategy конвертирует)?

### 4.2 Сервисы

- [ ] Нет `console.log` (используется `Logger`)?
- [ ] Hard delete (`delete`/`remove`) заменён на `softDelete`?
- [ ] Транзакции для критических multi-step операций?
- [ ] Нет N+1 query проблем (eager relations vs explicit joins)?

### 4.3 Error Handling

- [ ] Все сервисы бросают NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`)?
- [ ] Нет голых `throw new Error()`?
- [ ] `try/catch` не глотает ошибки молча?
- [ ] Webhook/payment обработчики имеют idempotency?

### 4.4 Модульная структура

- [ ] Все модули зарегистрированы в `app.module.ts`?
- [ ] Нет circular dependencies?
- [ ] Shared package (`packages/shared`) интегрирован?

---

## Фаза 5: Frontend проверка

### 5.1 Web Admin (Next.js)

- [ ] Все страницы локализованы (i18n)?
- [ ] Auth middleware корректно перенаправляет?
- [ ] API client типизирован?
- [ ] RBAC в sidebar фильтрует меню по роли?
- [ ] Нет XSS через unsafe HTML rendering?
- [ ] Формы валидируют на клиенте (Zod/React Hook Form)?

### 5.2 Client PWA (Vite React)

- [ ] Компилируется без ошибок?
- [ ] PWA manifest корректный (name, icons, theme)?
- [ ] Service Worker зарегистрирован?
- [ ] Token refresh работает?
- [ ] i18n настроен (uz, ru)?

### 5.3 Mobile (Expo React Native)

- [ ] Компилируется без ошибок?
- [ ] Auth flow корректный (SecureStore для tokens)?
- [ ] API URL конфигурируется через env?
- [ ] Navigation routes все существуют?
- [ ] Offline mode (AsyncStorage)?

### 5.4 Telegram Bot

- [ ] API baseURL с `/api/v1` prefix?
- [ ] Auth headers отправляются?
- [ ] Error handling на webhook failures?
- [ ] Кириллица корректна (не транслитерация)?

---

## Фаза 6: Infrastructure

### 6.1 Docker

- [ ] Все Dockerfile multi-stage?
- [ ] `.dockerignore` исключает node_modules, .turbo, dist?
- [ ] Non-root user в контейнерах?
- [ ] Health checks в docker-compose?
- [ ] Env vars через docker-compose.yml или secrets?

### 6.2 Kubernetes

- [ ] Liveness/readiness probes настроены?
- [ ] Resource limits/requests заданы?
- [ ] PDB (PodDisruptionBudget) корректный?
- [ ] Secrets через K8s Secrets (не ConfigMap)?
- [ ] Env vars с `$(VAR)` обёрнуты в `/bin/sh -c`?

### 6.3 CI/CD

- [ ] GitHub Actions workflow работает?
- [ ] Pre-commit hooks (lint, type-check)?
- [ ] Lockfile коммитирован?
- [ ] Docker images тегируются по git SHA?

### 6.4 Monitoring

- [ ] Prometheus scrape paths корректны?
- [ ] Grafana dashboards настроены?
- [ ] AlertManager rules определены?
- [ ] Логирование структурировано (JSON)?
- [ ] Redis exporter с паролем?
- [ ] Grafana НЕ использует дефолтные credentials?

---

## Фаза 7: Database

- [ ] Миграции в `src/database/migrations/` корректны?
- [ ] `synchronize: false` в production?
- [ ] Connection pooling настроен?
- [ ] Индексы на все foreign key и частые WHERE-колонки?
- [ ] Нет N+1 query problems?
- [ ] Decimal/numeric для денежных сумм (не float)?

---

## Фаза 8: Business Logic

### 8.1 Платежи (Payme, Click, Uzum)

- [ ] Webhook idempotency (не дублируются транзакции)?
- [ ] Signature verification на webhooks?
- [ ] Статус-машина транзакций корректна?
- [ ] Refund flow работает?
- [ ] Фискализация (OFD/Soliq) интегрирована?

### 8.2 Inventory

- [ ] Stock levels не уходят в минус?
- [ ] Reservation к deduction атомарны (транзакция)?
- [ ] Batch tracking работает (FIFO)?

### 8.3 RBAC

- [ ] 7 ролей корректно ограничивают доступ?
- [ ] Owner может всё, viewer только читает?
- [ ] Нельзя эскалировать роль через API?

---

## Фаза 9: Performance

- [ ] Pagination на всех list endpoints?
- [ ] Нет `find()` без `take`/`limit`?
- [ ] Heavy queries используют QueryBuilder с индексами?
- [ ] Cron jobs не блокируют event loop?
- [ ] Redis для кеширования частых запросов?
- [ ] File uploads стримятся (не в memory)?

---

## Фаза 10: Code Quality

- [ ] Нет `any` типов в production коде?
- [ ] ESLint проходит без warnings?
- [ ] Нет неиспользуемых imports/variables?
- [ ] Файлы <500 строк (нет гигантских файлов)?
- [ ] Нет TODO/FIXME/HACK в production коде?

---

## Формат отчёта

Сгенерируй отчёт в формате `AUDIT_REPORT_v3.md` со следующей структурой:

```markdown
# VendHub OS — Полный Аудит v3

**Дата:** [сегодня]
**Аудитор:** Claude Opus 4.6

## Executive Summary

- Общая оценка: X/10
- Таблица оценок по категориям (Архитектура, Backend, Web, Client, Mobile, Bot, Infra, Tests, Security)
- Дельта с прошлым аудитом (v2 → v3)
- Топ-5 критических находок

## Build Health

- Таблица TS ошибок по приложениям (было → стало)
- Результаты тестов (suites, tests, pass/fail)

## Находки по приоритету

### P0 — Блокеры (исправить до деплоя)

| # | Проблема | Файл:строка | Severity | Оценка часов |

### P1 — Важные (исправить до релиза)

| # | Проблема | Файл:строка | Severity | Оценка часов |

### P2 — Улучшения (бэклог)

| # | Проблема | Файл:строка | Severity | Оценка часов |

## Модульная матрица соответствия (все ~60 модулей)

| Модуль | BaseEntity | Swagger | DTO Valid | Soft Delete | RBAC | Multi-tenant | Tests | Score |

## Регрессия

- Что было исправлено в v2, но сломалось снова?
- Новые проблемы, появившиеся после v2?

## План действий

- Неделя 1: P0 блокеры
- Неделя 2: P1 backend
- Неделя 3: P1 frontend
- Неделя 4+: P2 улучшения

## Трудозатраты

| Приоритет | Часы | Задач |
| P0 | X | N |
| P1 | X | N |
| P2 | X | N |
| Итого | X | N |
```

---

## Важные правила

1. **Не угадывай — проверяй.** Открывай файлы и смотри реальный код
2. **Каждая находка = конкретный файл:строка.** Без абстрактных рекомендаций
3. **Не дублируй** уже исправленные проблемы из AUDIT_REPORT.md — проверь что они действительно исправлены
4. **Проверяй регрессии:** Что из AUDIT_REPORT.md/v2 могло сломаться после последних изменений?
5. **Учитывай бизнес-контекст:** Узбекистан, UZS, Payme/Click/Uzum, uz/ru/en
6. **Параллелизируй** проверки через агентов где возможно (Фазы 3-6 независимы)
7. **Приоритизируй:** security > data integrity > functionality > UX > code quality
8. **Будь конкретен:** "В файле X строка Y нужно изменить Z на W" а не "рекомендуется улучшить"
9. **Считай метрики:** LOC, количество модулей, endpoints, tests, coverage
10. **Сравнивай с v2:** Дай дельту по каждой категории (было → стало)

---

_Начни с Фазы 0, затем последовательно проходи все фазы. Используй параллельных агентов для независимых проверок (Фазы 3-6 можно частично параллелить). Весь аудит должен быть завершён в рамках одной сессии._
