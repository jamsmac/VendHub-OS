# VendHub OS - Комплексный анализ проекта

## Промпт 1: Архитектурный анализ

```
Проведи глубокий архитектурный анализ VendHub OS:

1. СТРУКТУРА ПРОЕКТА
- Проверь организацию monorepo (apps/, packages/, libs/)
- Оцени разделение ответственности между модулями
- Найди циклические зависимости между модулями
- Проверь правильность импортов и экспортов

2. МОДУЛЬНАЯ АРХИТЕКТУРА (NestJS)
- Проверь все модули на правильную регистрацию в app.module.ts
- Убедись что все providers, controllers, exports корректны
- Проверь DI (Dependency Injection) паттерны
- Найди отсутствующие или неиспользуемые модули

3. БАЗА ДАННЫХ
- Проверь все entity файлы на корректность связей (OneToMany, ManyToOne, ManyToMany)
- Найди отсутствующие индексы для часто используемых полей
- Проверь миграции на консистентность со схемой
- Найди потенциальные N+1 query проблемы

4. API DESIGN
- Проверь RESTful конвенции (naming, HTTP methods)
- Найди отсутствующие эндпоинты для CRUD операций
- Проверь версионирование API
- Оцени консистентность response форматов

Выведи отчет с найденными проблемами и рекомендациями.
```

## Промпт 2: Анализ безопасности

```
Проведи Security Audit для VendHub OS:

1. АУТЕНТИФИКАЦИЯ И АВТОРИЗАЦИЯ
- Проверь JWT конфигурацию (expiry, refresh tokens)
- Найди эндпоинты без защиты @UseGuards()
- Проверь RBAC декораторы @Roles() на всех protected routes
- Найди hardcoded credentials или secrets в коде

2. ВАЛИДАЦИЯ ДАННЫХ
- Проверь все DTO на наличие class-validator декораторов
- Найди endpoints принимающие данные без валидации
- Проверь санитизацию пользовательского ввода
- Найди потенциальные SQL injection уязвимости

3. ЗАЩИТА ОТ АТАК
- Проверь наличие rate limiting
- Найди CORS конфигурацию
- Проверь защиту от CSRF
- Найди потенциальные XSS уязвимости

4. ЧУВСТВИТЕЛЬНЫЕ ДАННЫЕ
- Найди логирование sensitive данных (пароли, токены)
- Проверь шифрование паролей (bcrypt rounds)
- Найди exposure персональных данных в responses
- Проверь безопасность файловых операций

5. ПЛАТЕЖНАЯ БЕЗОПАСНОСТЬ
- Проверь валидацию webhook подписей (Payme, Click, Uzum)
- Найди хранение платежных данных
- Проверь логирование транзакций

Выведи отчет с критичностью каждой уязвимости (Critical/High/Medium/Low).
```

## Промпт 3: Анализ производительности

```
Проведи Performance Analysis для VendHub OS:

1. DATABASE PERFORMANCE
- Найди все запросы без пагинации (потенциальные memory leaks)
- Проверь использование select() для ограничения полей
- Найди запросы с JOIN без индексов
- Проверь использование transactions где необходимо

2. CACHING
- Проверь Redis конфигурацию
- Найди часто вызываемые методы без кэширования
- Проверь TTL стратегии для разных типов данных
- Найди cache invalidation логику

3. ASYNC OPERATIONS
- Проверь использование Bull queues для heavy tasks
- Найди блокирующие операции в request handlers
- Проверь обработку batch операций
- Найди отсутствующие Promise.all для параллельных запросов

4. API PERFORMANCE
- Найди эндпоинты возвращающие слишком много данных
- Проверь compression для responses
- Найди отсутствующие ETags/caching headers
- Проверь streaming для больших файлов

5. FRONTEND PERFORMANCE
- Проверь lazy loading компонентов
- Найди излишние re-renders
- Проверь bundle size optimization
- Найди неоптимизированные изображения

Выведи отчет с метриками и рекомендациями по оптимизации.
```

## Промпт 4: Анализ качества кода

```
Проведи Code Quality Analysis для VendHub OS:

1. ТИПИЗАЦИЯ (TypeScript)
- Найди использование 'any' типов
- Проверь strict mode настройки tsconfig
- Найди отсутствующие типы для API responses
- Проверь generic types usage

2. ERROR HANDLING
- Найди catch блоки без proper handling
- Проверь кастомные exception классы
- Найди unhandled promise rejections
- Проверь error logging consistency

3. CODE DUPLICATION
- Найди дублирующийся код между сервисами
- Проверь переиспользование утилит
- Найди копипаст в контроллерах
- Проверь общие паттерны

4. NAMING CONVENTIONS
- Проверь консистентность naming (camelCase, PascalCase)
- Найди непонятные имена переменных/функций
- Проверь naming для файлов и директорий
- Найди магические числа без констант

5. DOCUMENTATION
- Проверь JSDoc комментарии для публичных методов
- Найди сложные функции без документации
- Проверь README файлы для каждого app/package
- Найди устаревшие комментарии

Выведи отчет с code smells и recommendations.
```

## Промпт 5: Анализ тестирования

```
Проведи Test Coverage Analysis для VendHub OS:

1. UNIT TESTS
- Найди сервисы без unit тестов
- Проверь покрытие критических бизнес-логики
- Найди тесты без assertions
- Проверь mocking стратегии

2. INTEGRATION TESTS
- Найди API endpoints без integration тестов
- Проверь тестирование database operations
- Найди тесты внешних интеграций (Payme, Telegram)
- Проверь test database setup

3. E2E TESTS
- Найди критические user flows без e2e тестов
- Проверь тестирование авторизации flows
- Найди тесты для multi-tenant scenarios
- Проверь mobile app тесты

4. TEST INFRASTRUCTURE
- Проверь test fixtures и factories
- Найди flaky тесты
- Проверь CI/CD test pipeline
- Найди тесты с hardcoded данными

Выведи отчет с test coverage metrics и gaps.
```

## Промпт 6: Анализ DevOps и инфраструктуры

```
Проведи Infrastructure Analysis для VendHub OS:

1. DOCKER CONFIGURATION
- Проверь Dockerfile оптимизацию (layer caching, multi-stage)
- Найди security issues в containers
- Проверь docker-compose для dev/prod
- Найди отсутствующие health checks

2. CI/CD PIPELINE
- Проверь GitHub Actions workflows
- Найди отсутствующие stages (lint, test, build, deploy)
- Проверь deployment strategies
- Найди secrets management

3. MONITORING & LOGGING
- Проверь structured logging
- Найди отсутствующие metrics endpoints
- Проверь error tracking integration
- Найди alerting configuration

4. SCALABILITY
- Проверь horizontal scaling готовность
- Найди stateful components
- Проверь database connection pooling
- Найди single points of failure

5. BACKUP & RECOVERY
- Проверь database backup strategy
- Найди disaster recovery plan
- Проверь data retention policies
- Найди rollback procedures

Выведи отчет с infrastructure recommendations.
```

## Промпт 7: Бизнес-логика и функциональность

```
Проведи Business Logic Analysis для VendHub OS:

1. INVENTORY MANAGEMENT
- Проверь 3-level inventory flow (Warehouse → Operator → Machine)
- Найди edge cases без обработки
- Проверь stock alerts и notifications
- Найди inventory reconciliation логику

2. FINANCIAL OPERATIONS
- Проверь расчет комиссий и revenue sharing
- Найди currency handling (UZS specifics)
- Проверь fiscal integration (OFD/soliq.uz)
- Найди аудит trail для финансовых операций

3. MULTI-TENANT
- Проверь data isolation между organizations
- Найди franchise hierarchy logic
- Проверь tenant-specific configurations
- Найди cross-tenant data leaks

4. RBAC IMPLEMENTATION
- Проверь все 7 ролей и их permissions
- Найди inconsistent permission checks
- Проверь role inheritance
- Найди missing role assignments

5. INTEGRATIONS
- Проверь Payme/Click/Uzum payment flows
- Найди retry logic для external APIs
- Проверь webhook handling
- Найди timeout configurations

Выведи отчет с бизнес-логикой gaps и recommendations.
```

---

# Порядок выполнения анализа

1. **Архитектурный анализ** - базовая структура проекта
2. **Анализ безопасности** - критические уязвимости
3. **Анализ качества кода** - maintainability
4. **Анализ производительности** - scalability
5. **Бизнес-логика** - функциональная корректность
6. **Тестирование** - coverage gaps
7. **DevOps** - deployment readiness

После каждого этапа создается отчет и исправляются найденные проблемы.
