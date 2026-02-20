---
name: vhm24-migration
description: "VendHub Module Migration - перенос модулей из VHM24-repo в VendHub OS.\nMERGE/PORT/KEEP стратегии, сравнение entity, адаптация NestJS 10→11.\nИспользовать при миграции модулей, сравнении репозиториев, проверке статуса миграции."
---

# VendHub Module Migration Skill

## Когда использовать

- Перенос модуля из VHM24-repo в VendHub OS
- Сравнение модулей между репозиториями
- Проверка статуса миграции
- Планирование порядка миграции модулей

## Пути

| Что                   | Путь                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Источник (VHM24-repo) | `/Users/js/Мой диск/3.VendHub/VHM24/VHM24-repo/backend/src/modules/`                     |
| Цель (VendHub OS)     | `vendhub-unified/apps/api/src/modules/`                                                  |
| План миграции         | `MIGRATION_PLAN_v4.md`                                                                   |
| Мастер-данные         | `/Users/js/Мой диск/3.VendHub/VHM24/Master Data/VHM24_Master_Data_Specification_v1.0.md` |

## Стратегии миграции

### MERGE (25 модулей)

Модуль есть в обоих репо. Нужно:

1. Сравнить entity поля — добавить недостающие
2. Сравнить endpoints — добавить недостающие
3. Перенести бизнес-логику, которой нет в VendHub OS
4. Разрешить конфликты (VendHub OS приоритет по архитектуре)

### PORT (24 модуля)

Модуль есть только в VHM24-repo. Нужно:

1. Создать полную структуру модуля в VendHub OS
2. Адаптировать код под NestJS 11 + текущие паттерны
3. Зарегистрировать в app.module.ts

### KEEP (4 модуля)

Модуль есть только в VendHub OS. Не трогать.

## Чеклист адаптации (VHM24-repo → VendHub OS)

### Entity

- [ ] Extends `BaseEntity` (из `common/entities/base.entity`)
- [ ] Свойства в **camelCase** (SnakeNamingStrategy конвертит)
- [ ] `@JoinColumn({ name: "db_column_name" })` — snake_case для DB column
- [ ] UUID для всех PK и FK (`string`, не `number`)
- [ ] `@DeleteDateColumn` через BaseEntity (soft delete)
- [ ] Без `created_at`, `updated_at`, `deleted_at` — они в BaseEntity

### Controller

- [ ] `@Roles()` из `common/decorators/roles.decorator`
- [ ] `@CurrentUser()` / `@CurrentUserId()` / `@CurrentOrganizationId()` из `common/decorators/current-user.decorator`
- [ ] Без роли `technician` (удалена)
- [ ] 7 ролей: owner, admin, manager, operator, warehouse, accountant, viewer
- [ ] `@ApiTags()`, `@ApiOperation()` на каждом endpoint
- [ ] `@Auth()` или `@UseGuards(JwtAuthGuard, RolesGuard)` на контроллере

### Service

- [ ] Фильтрация по `organizationId` в каждом запросе
- [ ] `softDelete()` вместо `delete()`
- [ ] Proper error handling (NotFoundException, ForbiddenException)

### DTOs

- [ ] `class-validator` декораторы на каждом поле
- [ ] `@ApiProperty()` на каждом поле
- [ ] `IsOptional()` для nullable полей

### Module

- [ ] Зарегистрирован в `app.module.ts`
- [ ] Правильные imports/exports

## Порядок миграции (рекомендованный)

```
Фаза 1 — Базовые модули (без зависимостей):
  organizations → users → auth → rbac

Фаза 2 — Справочники:
  dictionaries → locations → nomenclature → recipes

Фаза 3 — Основной бизнес:
  machines → inventory → warehouse → containers

Фаза 4 — Операции:
  tasks → routes → sales-import → transactions

Фаза 5 — Аналитика и интеграции:
  analytics → reports → monitoring → alerts

Фаза 6 — Коммуникации:
  notifications → sms → email → telegram → web-push

Фаза 7 — Продвинутые:
  billing → reconciliation → promo-codes → ai-assistant
```

## Формат отчёта сравнения

```markdown
## Модуль: [name]

**Стратегия**: MERGE | PORT | KEEP
**Зависимости**: [module1, module2]

### Entity сравнение

| Поле         | VHM24-repo    | VendHub OS   | Действие          |
| ------------ | ------------- | ------------ | ----------------- |
| serialNumber | varchar(50)   | varchar(100) | KEEP (VendHub OS) |
| cashBalance  | decimal(12,2) | -            | ADD               |

### Endpoint сравнение

| Метод | Path                | VHM24 | VendHub | Действие |
| ----- | ------------------- | ----- | ------- | -------- |
| GET   | /machines           | да    | да      | MERGE    |
| POST  | /machines/:id/reset | да    | нет     | PORT     |

### Бизнес-логика

- [x] Основные CRUD операции
- [ ] Статистика по продажам (только VHM24)
- [ ] Сброс кэша автомата (только VHM24)
```

## Связанные инструменты

- **Agent**: `module-migrator` — автоматизация миграции
- **Skill**: `vhm24-api-generator` — генерация API
- **Skill**: `vhm24-db-expert` — работа с entity и миграциями
- **Skill**: `vhm24-testing` — тесты после миграции
