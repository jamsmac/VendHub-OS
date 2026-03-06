# VHM24 Master Data Management — Implementation Checklist

## Appendix D to Technical Specification v1.0

Этот документ содержит полный чеклист для внедрения системы справочников.

---

## 📋 Общий прогресс

| Этап            | Статус | Прогресс |
| --------------- | ------ | -------- |
| 1. База данных  | ⬜     | 0%       |
| 2. Backend API  | ⬜     | 0%       |
| 3. Frontend     | ⬜     | 0%       |
| 4. Интеграции   | ⬜     | 0%       |
| 5. Тестирование | ⬜     | 0%       |
| 6. Миграция     | ⬜     | 0%       |
| 7. Документация | ⬜     | 0%       |

---

## 1. База данных

### 1.1 PostgreSQL Extensions

- [ ] Установить extension `uuid-ossp`
- [ ] Установить extension `unaccent`
- [ ] Установить extension `pg_trgm`
- [ ] Проверить версию PostgreSQL (требуется 14+)

### 1.2 Enum Types

- [ ] Создать `directory_type`
- [ ] Создать `directory_scope`
- [ ] Создать `field_type`
- [ ] Создать `entry_origin`
- [ ] Создать `entry_status`
- [ ] Создать `source_type`
- [ ] Создать `sync_status`
- [ ] Создать `sync_log_status`
- [ ] Создать `audit_action`
- [ ] Создать `event_type`
- [ ] Создать `delivery_status`
- [ ] Создать `import_status`
- [ ] Создать `import_mode`

### 1.3 Таблицы (в порядке зависимостей)

- [ ] `directories`
- [ ] `directory_fields`
- [ ] `directory_entries`
- [ ] `directory_sources`
- [ ] `directory_sync_logs`
- [ ] `directory_entry_audit`
- [ ] `directory_permissions`
- [ ] `directory_events`
- [ ] `webhooks`
- [ ] `webhook_deliveries`
- [ ] `webhook_dead_letters`
- [ ] `import_jobs`
- [ ] `import_templates`
- [ ] `user_recent_selections`
- [ ] `directory_stats`

### 1.4 Индексы

- [ ] Индексы для `directories`
- [ ] Индексы для `directory_fields`
- [ ] Индексы для `directory_entries` (включая GIN для search_vector)
- [ ] Trigram индекс для `normalized_name`
- [ ] JSONB индексы для `data`, `tags`, `translations`
- [ ] Индексы для остальных таблиц

### 1.5 Триггеры и функции

- [ ] `update_updated_at()` — автообновление timestamps
- [ ] `normalize_entry_name()` — нормализация имени
- [ ] `trg_update_normalized_name` — триггер нормализации
- [ ] `trg_update_entry_search_vector` — триггер search_vector
- [ ] `check_hierarchy_cycle()` — проверка циклов
- [ ] `trg_check_hierarchy_cycle` — триггер проверки циклов
- [ ] `trg_update_directory_stats` — триггер статистики
- [ ] `cleanup_recent_selections()` — очистка recent
- [ ] `get_localized_name()` — получение локализованного имени
- [ ] `search_directory_entries()` — функция поиска

### 1.6 Верификация

- [ ] Проверить все FK constraints
- [ ] Проверить все UNIQUE constraints
- [ ] Проверить все CHECK constraints
- [ ] Запустить миграцию на dev окружении
- [ ] Проверить производительность индексов

---

## 2. Backend API (NestJS)

### 2.1 Модули

- [ ] `DirectoriesModule`
- [ ] `EntriesModule`
- [ ] `FieldsModule`
- [ ] `SourcesModule`
- [ ] `SyncModule`
- [ ] `ImportModule`
- [ ] `PermissionsModule`
- [ ] `EventsModule`
- [ ] `WebhooksModule`
- [ ] `SearchModule`
- [ ] `AuditModule`
- [ ] `StatsModule`

### 2.2 Entities (TypeORM)

- [ ] `Directory` entity
- [ ] `DirectoryField` entity
- [ ] `DirectoryEntry` entity
- [ ] `DirectorySource` entity
- [ ] `DirectorySyncLog` entity
- [ ] `DirectoryEntryAudit` entity
- [ ] `DirectoryPermission` entity
- [ ] `DirectoryEvent` entity
- [ ] `Webhook` entity
- [ ] `WebhookDelivery` entity
- [ ] `WebhookDeadLetter` entity
- [ ] `ImportJob` entity
- [ ] `ImportTemplate` entity
- [ ] `UserRecentSelection` entity
- [ ] `DirectoryStats` entity

### 2.3 DTOs

- [ ] CreateDirectoryDto
- [ ] UpdateDirectoryDto
- [ ] CreateEntryDto
- [ ] UpdateEntryDto
- [ ] BulkUpdateDto
- [ ] ImportConfigDto
- [ ] SearchQueryDto
- [ ] PermissionDto
- [ ] WebhookDto

### 2.4 Services

- [ ] `DirectoryService` — CRUD справочников
- [ ] `EntryService` — CRUD записей
- [ ] `SearchService` — поиск с ранжированием
- [ ] `SyncService` — синхронизация внешних источников
- [ ] `ImportService` — массовый импорт
- [ ] `ExportService` — экспорт данных
- [ ] `PermissionService` — проверка прав
- [ ] `EventService` — генерация событий
- [ ] `WebhookService` — доставка webhooks
- [ ] `AuditService` — запись audit log
- [ ] `CacheService` — кэширование
- [ ] `ValidationService` — валидация данных

### 2.5 Controllers (REST API)

- [ ] `DirectoriesController`
  - [ ] GET /api/directories
  - [ ] POST /api/directories
  - [ ] GET /api/directories/:id
  - [ ] PATCH /api/directories/:id
  - [ ] DELETE /api/directories/:id
- [ ] `EntriesController`
  - [ ] GET /api/directories/:id/entries
  - [ ] POST /api/directories/:id/entries
  - [ ] GET /api/directories/:id/entries/:eid
  - [ ] PATCH /api/directories/:id/entries/:eid
  - [ ] DELETE /api/directories/:id/entries/:eid
  - [ ] POST /api/directories/:id/entries/:eid/restore
- [ ] `SearchController`
  - [ ] GET /api/directories/:id/entries/search
- [ ] `BulkController`
  - [ ] POST /api/directories/:id/entries/bulk-import
  - [ ] POST /api/directories/:id/entries/bulk-update
  - [ ] POST /api/directories/:id/entries/bulk-archive
  - [ ] GET /api/directories/:id/entries/export
- [ ] `SyncController`
  - [ ] POST /api/directories/:id/sync
  - [ ] GET /api/directories/:id/sync-logs
- [ ] `ImportJobsController`
  - [ ] GET /api/directories/:id/import-jobs/:jid
  - [ ] POST /api/directories/:id/import-jobs/:jid/cancel

### 2.6 Guards & Interceptors

- [ ] `RbacGuard` — проверка прав доступа
- [ ] `AuditInterceptor` — запись в audit log
- [ ] `CacheInterceptor` — HTTP кэширование (ETag)

### 2.7 Validators

- [ ] Sync validators (regex, min/max, allowed_values)
- [ ] Async validators registry
- [ ] Conditional rules processor
- [ ] Validator cache service

### 2.8 Background Jobs

- [ ] `SyncScheduler` — запуск синхронизации по cron
- [ ] `WebhookWorker` — доставка webhooks с retry
- [ ] `CleanupJob` — очистка old data (recent selections, dead letters)
- [ ] `StatsJob` — обновление статистики

### 2.9 WebSocket

- [ ] `DirectoryGateway` — events для real-time обновлений
- [ ] События: directory.updated, entry.created, entry.updated, etc.

---

## 3. Frontend

### 3.1 Компоненты UI

- [ ] `DirectoryList` — список справочников
- [ ] `DirectoryCard` — карточка справочника
- [ ] `DirectoryWizard` — создание справочника (6 шагов)
- [ ] `FieldBuilder` — конструктор полей
- [ ] `EntryList` — список записей (table view)
- [ ] `EntryTree` — древовидный вид (tree view)
- [ ] `EntryCard` — карточка записи
- [ ] `EntryForm` — форма создания/редактирования
- [ ] `EntryAuditLog` — история изменений
- [ ] `DirectorySelect` — выбор из справочника (dropdown/autocomplete)
- [ ] `InlineCreateForm` — mini-form для inline create
- [ ] `ImportWizard` — мастер импорта
- [ ] `ImportMapping` — маппинг колонок
- [ ] `ImportPreview` — предпросмотр импорта
- [ ] `ImportResult` — результаты импорта
- [ ] `SyncStatus` — статус синхронизации
- [ ] `PermissionsEditor` — редактор прав
- [ ] `ConflictResolver` — разрешение конфликтов (offline)

### 3.2 Hooks

- [ ] `useDirectory` — получение справочника
- [ ] `useEntries` — получение записей с пагинацией
- [ ] `useEntry` — получение одной записи
- [ ] `useSearch` — поиск с debounce
- [ ] `useLocalized` — локализация имени
- [ ] `usePermission` — проверка прав
- [ ] `useRecentSelections` — недавние выборы
- [ ] `useDirectoryCache` — кэширование справочника

### 3.3 Stores/State

- [ ] `directoriesStore` — список справочников
- [ ] `entriesStore` — записи текущего справочника
- [ ] `cacheStore` — локальный кэш
- [ ] `offlineStore` — offline данные (IndexedDB)

### 3.4 Services

- [ ] `DirectoryApiService` — API клиент
- [ ] `CacheService` — localStorage/IndexedDB
- [ ] `SyncService` — offline sync
- [ ] `WebSocketService` — подключение к WS

### 3.5 Страницы/Routes

- [ ] `/directories` — список справочников
- [ ] `/directories/new` — создание справочника
- [ ] `/directories/:id` — просмотр справочника
- [ ] `/directories/:id/edit` — редактирование справочника
- [ ] `/directories/:id/entries` — записи справочника
- [ ] `/directories/:id/entries/:eid` — карточка записи
- [ ] `/directories/:id/import` — импорт
- [ ] `/directories/:id/sync` — синхронизация
- [ ] `/directories/:id/permissions` — права доступа

---

## 4. Интеграции

### 4.1 Внешние источники

- [ ] Интеграция с ИКПУ API
- [ ] Интеграция с МФО банков
- [ ] Универсальный HTTP connector
- [ ] File parser (Excel, CSV)

### 4.2 Хранилище файлов

- [ ] Интеграция с S3/Cloudflare R2
- [ ] Upload service для FILE/IMAGE полей
- [ ] Thumbnail generation

### 4.3 Кэширование

- [ ] Redis cache для популярных справочников
- [ ] Cache invalidation через events

### 4.4 Мониторинг

- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alerting rules

---

## 5. Тестирование

### 5.1 Unit Tests

- [ ] Validators (sync + async)
- [ ] `normalize_entry_name()`
- [ ] `check_hierarchy_cycle()`
- [ ] `get_localized_name()` fallback
- [ ] RBAC permission resolution
- [ ] Conditional rules processor

### 5.2 Integration Tests

- [ ] CRUD directories
- [ ] CRUD entries
- [ ] Search (FTS, trigram, exact)
- [ ] Inline create with duplicate detection
- [ ] Hierarchy operations
- [ ] Bulk import (all modes)
- [ ] Sync external
- [ ] Webhook delivery

### 5.3 E2E Tests

- [ ] Create directory through wizard
- [ ] Add entries manually
- [ ] Search and select in form
- [ ] Inline create flow
- [ ] Import from Excel
- [ ] Export to Excel

### 5.4 Performance Tests

- [ ] Search on 100k+ entries (<500ms)
- [ ] Bulk import 10k rows (<60s)
- [ ] Concurrent inline create (no duplicates)
- [ ] Tree load 1000 nodes (<2s)

### 5.5 Security Tests

- [ ] RBAC bypass attempts
- [ ] SQL injection (search, filters)
- [ ] XSS in entry names
- [ ] CSRF protection

---

## 6. Миграция

### 6.1 Подготовка

- [ ] Анализ существующих данных
- [ ] Маппинг старых структур → новые
- [ ] Написание миграционных скриптов
- [ ] Тестирование на копии production

### 6.2 Этап 1: Parallel creation

- [ ] Развернуть Master Data
- [ ] Импортировать справочники
- [ ] Импортировать записи
- [ ] Проверить целостность

### 6.3 Этап 2: Dual-write

- [ ] Включить запись в обе системы
- [ ] Мониторинг консистентности
- [ ] Исправление расхождений

### 6.4 Этап 3: Switchover

- [ ] Переключить READ на новую систему
- [ ] Тестирование в production
- [ ] Отключить WRITE в старую систему

### 6.5 Этап 4: Cleanup

- [ ] Архивировать старые таблицы
- [ ] Удалить dual-write код
- [ ] Обновить документацию

### 6.6 Rollback Plan

- [ ] Документировать процедуру отката
- [ ] Подготовить reverse sync скрипты
- [ ] Тестировать rollback на staging

---

## 7. Документация

### 7.1 Техническая документация

- [ ] Спецификация системы (этот документ)
- [ ] SQL миграция (Appendix A)
- [ ] JSONB структуры (Appendix B)
- [ ] Диаграммы (Appendix C)
- [ ] API Reference (OpenAPI/Swagger)

### 7.2 Пользовательская документация

- [ ] Руководство администратора
- [ ] Руководство пользователя
- [ ] FAQ

### 7.3 Runbooks

- [ ] Добавление нового справочника
- [ ] Настройка синхронизации
- [ ] Массовый импорт данных
- [ ] Troubleshooting sync errors
- [ ] Восстановление из backup

---

## 8. Финальная проверка

### 8.1 Функциональность

- [ ] Все типы справочников работают
- [ ] CRUD операции для всех сущностей
- [ ] Search находит по name, code, translations
- [ ] Hierarchy не допускает циклы
- [ ] OFFICIAL записи read-only
- [ ] Inline create работает корректно
- [ ] Import обрабатывает ошибки
- [ ] Webhooks доставляются

### 8.2 Безопасность

- [ ] RBAC работает корректно
- [ ] Нет SQL injection
- [ ] Нет XSS
- [ ] Audit log записывает все изменения

### 8.3 Производительность

- [ ] Search <500ms на 100k+ записей
- [ ] Import 10k rows <60s
- [ ] UI отзывчив

### 8.4 Мониторинг

- [ ] Metrics собираются
- [ ] Dashboards настроены
- [ ] Alerts работают

---

## 📝 Заметки

```
Дата начала: ____________
Дата завершения: ____________
Ответственный: ____________

Комментарии:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

**Конец Appendix D**
