-- ============================================================================
-- VHM24 Master Data Management — SQL Migration Script
-- Appendix A to Technical Specification v1.0
-- ============================================================================
-- 
-- ВНЕШНИЕ ЗАВИСИМОСТИ:
-- Этот модуль предполагает наличие следующих таблиц в системе VHM24:
--   - users (id uuid) — пользователи системы
--   - organizations (id uuid) — организации/франчайзи
--   - locations (id uuid) — локации/точки продаж
-- 
-- Если эти таблицы отсутствуют, закомментируйте соответствующие FK или 
-- создайте заглушки перед выполнением миграции.
--
-- Порядок выполнения:
-- 1. Extensions
-- 2. Enum Types
-- 3. Tables (в порядке зависимостей)
-- 4. Indexes
-- 5. Triggers and Functions
-- 6. Initial Data (system directories)
--
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

create extension if not exists "uuid-ossp";      -- UUID генерация
create extension if not exists "unaccent";       -- Удаление акцентов (для normalized_name)
create extension if not exists "pg_trgm";        -- Trigram индексы (для fuzzy search)

-- ============================================================================
-- PART 2: ENUM TYPES
-- ============================================================================

-- Тип справочника
create type directory_type as enum (
    'MANUAL',       -- Внутренний, ручной
    'EXTERNAL',     -- Внешний, auto-sync
    'PARAM',        -- Параметрический
    'TEMPLATE'      -- Шаблон
);

-- Область видимости справочника
create type directory_scope as enum (
    'HQ',           -- Головной офис (глобально)
    'ORGANIZATION', -- Организация (франчайзи)
    'LOCATION'      -- Локация
);

-- Тип поля
create type field_type as enum (
    'TEXT',
    'NUMBER',
    'DATE',
    'DATETIME',
    'BOOLEAN',
    'SELECT_SINGLE',
    'SELECT_MULTI',
    'REF',
    'JSON',
    'FILE',
    'IMAGE'
);

-- Происхождение записи
create type entry_origin as enum (
    'OFFICIAL',     -- Из внешнего источника (read-only)
    'LOCAL'         -- Добавлено вручную
);

-- Статус записи
create type entry_status as enum (
    'DRAFT',            -- Черновик
    'PENDING_APPROVAL', -- Ожидает утверждения
    'ACTIVE',           -- Активный
    'DEPRECATED',       -- Устарел (для OFFICIAL)
    'ARCHIVED'          -- Архивирован
);

-- Тип источника данных
create type source_type as enum (
    'URL',      -- URL для скачивания
    'API',      -- REST API
    'FILE',     -- Загружаемый файл
    'TEXT'      -- Текстовый импорт
);

-- Статус синхронизации
create type sync_status as enum (
    'SUCCESS',
    'FAILED',
    'PARTIAL'
);

-- Статус лога синхронизации
create type sync_log_status as enum (
    'STARTED',
    'SUCCESS',
    'FAILED',
    'PARTIAL'
);

-- Действие в audit log
create type audit_action as enum (
    'CREATE',
    'UPDATE',
    'ARCHIVE',
    'RESTORE',
    'SYNC',
    'APPROVE',
    'REJECT'
);

-- Тип события
create type event_type as enum (
    'ENTRY_CREATED',
    'ENTRY_UPDATED',
    'ENTRY_ARCHIVED',
    'ENTRY_RESTORED',
    'SYNC_STARTED',
    'SYNC_COMPLETED',
    'SYNC_FAILED',
    'IMPORT_STARTED',
    'IMPORT_COMPLETED',
    'IMPORT_FAILED'
);

-- Статус доставки webhook
create type delivery_status as enum (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'DEAD'
);

-- Статус импорта
create type import_status as enum (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'PARTIAL',
    'FAILED',
    'CANCELLED'
);

-- Режим импорта
create type import_mode as enum (
    'CREATE_ONLY',  -- Только новые
    'UPSERT',       -- Создать или обновить
    'UPDATE_ONLY',  -- Только обновление
    'DRY_RUN'       -- Проверка без сохранения
);

-- ============================================================================
-- PART 3: HELPER FUNCTIONS (needed before tables)
-- ============================================================================

-- Функция обновления updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Функция нормализации имени
create or replace function normalize_entry_name(p_name text)
returns text as $$
begin
    return lower(trim(unaccent(coalesce(p_name, ''))));
end;
$$ language plpgsql immutable;

comment on function normalize_entry_name is 'Нормализует имя: lower + trim + unaccent';

-- ============================================================================
-- PART 4: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Таблица: directories
-- Описание: Справочники (метаданные)
-- ----------------------------------------------------------------------------
create table directories (
    id uuid primary key default gen_random_uuid(),
    
    -- Основные поля
    name text not null,
    slug text not null,
    description text,
    
    -- Тип и область
    type directory_type not null,
    scope directory_scope not null default 'HQ',
    organization_id uuid, -- FK добавляется позже
    location_id uuid,     -- FK добавляется позже
    
    -- Флаги
    is_hierarchical boolean not null default false,
    is_system boolean not null default false,
    
    -- Дополнительно
    icon text,
    settings jsonb not null default '{
        "allow_inline_create": true,
        "allow_local_overlay": true,
        "approval_required": false,
        "prefetch": false,
        "offline_enabled": false,
        "offline_max_entries": 1000
    }'::jsonb,
    
    -- Аудит
    created_by uuid,      -- FK добавляется позже
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

comment on table directories is 'Справочники (метаданные)';
comment on column directories.slug is 'Уникальный код справочника (латиница)';
comment on column directories.settings is 'Настройки: allow_inline_create, allow_local_overlay, approval_required, prefetch, offline_enabled, offline_max_entries';
comment on column directories.is_system is 'Системный справочник (нельзя удалить)';

-- ----------------------------------------------------------------------------
-- Таблица: directory_fields
-- Описание: Поля/параметры справочника
-- ----------------------------------------------------------------------------
create table directory_fields (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Идентификация
    name text not null,
    display_name text not null,
    description text,
    
    -- Тип и источник
    field_type field_type not null,
    ref_directory_id uuid references directories(id) on delete set null,
    allow_free_text boolean not null default false,
    
    -- Правила
    is_required boolean not null default false,
    is_unique boolean not null default false,
    is_unique_per_org boolean not null default false,
    
    -- Отображение
    show_in_list boolean not null default false,
    show_in_card boolean not null default true,
    sort_order int not null default 0,
    
    -- Значения
    default_value jsonb,
    validation_rules jsonb not null default '{}'::jsonb,
    
    -- Локализация
    translations jsonb,
    
    -- Аудит
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Constraints
    constraint uq_fields_directory_name unique (directory_id, name)
);

comment on table directory_fields is 'Поля/параметры справочника';
comment on column directory_fields.name is 'Системное имя поля (для API)';
comment on column directory_fields.display_name is 'Отображаемое название';
comment on column directory_fields.ref_directory_id is 'Справочник-источник для SELECT/REF типов';
comment on column directory_fields.allow_free_text is 'Разрешить свободный ввод для SELECT';
comment on column directory_fields.validation_rules is 'Правила валидации (regex, min/max, etc.)';
comment on column directory_fields.translations is 'Переводы названия поля';

-- ----------------------------------------------------------------------------
-- Таблица: directory_entries
-- Описание: Записи справочника
-- ----------------------------------------------------------------------------
create table directory_entries (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Иерархия (self-reference добавляется позже)
    parent_id uuid,
    
    -- Основные поля
    name text not null,
    normalized_name text not null,
    code text,
    external_key text,
    description text,
    
    -- Локализация
    translations jsonb,
    
    -- Происхождение
    origin entry_origin not null default 'LOCAL',
    origin_source text,
    origin_date timestamptz,
    
    -- Статус и версионирование
    status entry_status not null default 'ACTIVE',
    version int not null default 1,
    valid_from timestamptz,
    valid_to timestamptz,
    deprecated_at timestamptz,
    replacement_entry_id uuid,
    
    -- Организация и метаданные
    tags text[],
    sort_order int not null default 0,
    data jsonb not null default '{}'::jsonb,
    search_vector tsvector,
    organization_id uuid,
    
    -- Аудит
    created_by uuid,
    updated_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- Self-references
alter table directory_entries 
    add constraint fk_entries_parent 
    foreign key (parent_id) references directory_entries(id) on delete set null;

alter table directory_entries 
    add constraint fk_entries_replacement 
    foreign key (replacement_entry_id) references directory_entries(id) on delete set null;

comment on table directory_entries is 'Записи справочника';
comment on column directory_entries.normalized_name is 'Нормализованное имя: lower(trim(unaccent(name)))';
comment on column directory_entries.external_key is 'Ключ из внешнего источника';
comment on column directory_entries.origin is 'Происхождение: OFFICIAL (внешний источник) или LOCAL (ручное добавление)';
comment on column directory_entries.replacement_entry_id is 'Рекомендуемая замена для DEPRECATED записей';
comment on column directory_entries.data is 'Значения полей (EAV через JSONB)';
comment on column directory_entries.search_vector is 'Вектор для полнотекстового поиска';

-- ----------------------------------------------------------------------------
-- Таблица: directory_sources
-- Описание: Источники внешних данных
-- ----------------------------------------------------------------------------
create table directory_sources (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Идентификация
    name text not null,
    source_type source_type not null,
    
    -- Подключение
    url text,
    auth_config jsonb,
    request_config jsonb,
    
    -- Маппинг
    column_mapping jsonb not null,
    unique_key_field text not null,
    
    -- Расписание
    schedule text,
    is_active boolean not null default true,
    
    -- Статус синхронизации
    last_sync_at timestamptz,
    last_sync_status sync_status,
    last_sync_error text,
    consecutive_failures int not null default 0,
    
    -- Версионирование
    source_version text,
    
    -- Аудит
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table directory_sources is 'Источники внешних данных';
comment on column directory_sources.auth_config is 'Конфигурация аутентификации: {type: "bearer", token: "..."} или {type: "basic", ...}';
comment on column directory_sources.request_config is 'Конфигурация запроса: headers, method, body template';
comment on column directory_sources.column_mapping is 'Маппинг колонок: {"source_col": "field_name", ...}';
comment on column directory_sources.schedule is 'Cron expression для автоматической синхронизации';
comment on column directory_sources.source_version is 'Версия данных источника (для инвалидации кэша)';

-- ----------------------------------------------------------------------------
-- Таблица: directory_sync_logs
-- Описание: Логи синхронизации
-- ----------------------------------------------------------------------------
create table directory_sync_logs (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    source_id uuid not null references directory_sources(id) on delete cascade,
    
    -- Статус
    status sync_log_status not null,
    
    -- Время
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    
    -- Статистика
    total_records int,
    created_count int,
    updated_count int,
    deprecated_count int,
    error_count int,
    
    -- Ошибки
    errors jsonb,
    
    -- Кто запустил
    triggered_by uuid
);

comment on table directory_sync_logs is 'Логи синхронизации';
comment on column directory_sync_logs.triggered_by is 'Кто запустил синхронизацию (null если по расписанию)';
comment on column directory_sync_logs.errors is 'Массив ошибок: [{record, field, message}, ...]';

-- ----------------------------------------------------------------------------
-- Таблица: directory_entry_audit
-- Описание: История изменений записей
-- ----------------------------------------------------------------------------
create table directory_entry_audit (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid not null references directory_entries(id) on delete cascade,
    
    -- Действие
    action audit_action not null,
    
    -- Кто и когда
    changed_by uuid,
    changed_at timestamptz not null default now(),
    
    -- Изменения
    old_values jsonb,
    new_values jsonb,
    
    -- Дополнительно
    change_reason text,
    ip_address inet,
    user_agent text
);

comment on table directory_entry_audit is 'История изменений записей';
comment on column directory_entry_audit.old_values is 'Значения до изменения';
comment on column directory_entry_audit.new_values is 'Значения после изменения';
comment on column directory_entry_audit.change_reason is 'Комментарий к изменению';

-- ----------------------------------------------------------------------------
-- Таблица: directory_permissions
-- Описание: Права доступа к справочникам
-- ----------------------------------------------------------------------------
create table directory_permissions (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Субъект прав
    organization_id uuid,
    role text,
    user_id uuid,
    
    -- Права
    can_view boolean not null default true,
    can_create boolean not null default false,
    can_edit boolean not null default false,
    can_archive boolean not null default false,
    can_bulk_import boolean not null default false,
    can_sync_external boolean not null default false,
    can_approve boolean not null default false,
    
    -- Наследование и deny
    inherit_from_parent boolean not null default true,
    is_deny boolean not null default false,
    
    -- Аудит
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Constraint: должен быть указан role или user_id
    constraint chk_permissions_subject check (role is not null or user_id is not null)
);

comment on table directory_permissions is 'Права доступа к справочникам';
comment on column directory_permissions.role is 'Роль: owner, admin, manager, operator, viewer';
comment on column directory_permissions.inherit_from_parent is 'Наследовать права от родительской организации (HQ)';
comment on column directory_permissions.is_deny is 'Явный запрет (перекрывает allow)';

-- ----------------------------------------------------------------------------
-- Таблица: directory_events
-- Описание: События для webhooks и триггеров
-- ----------------------------------------------------------------------------
create table directory_events (
    id uuid primary key default gen_random_uuid(),
    
    -- Тип события
    event_type event_type not null,
    
    -- Связи
    directory_id uuid not null references directories(id) on delete cascade,
    entry_id uuid references directory_entries(id) on delete set null,
    
    -- Batch (для массовых операций)
    batch_id uuid,
    sequence_num int,
    
    -- Данные
    payload jsonb not null default '{}'::jsonb,
    
    -- Время
    created_at timestamptz not null default now(),
    processed_at timestamptz
);

comment on table directory_events is 'События для webhooks и триггеров';
comment on column directory_events.batch_id is 'ID группы событий (для массовых операций)';
comment on column directory_events.sequence_num is 'Порядковый номер в группе';
comment on column directory_events.processed_at is 'Когда событие обработано (null = ожидает)';

-- ----------------------------------------------------------------------------
-- Таблица: webhooks
-- Описание: Настройки webhooks
-- ----------------------------------------------------------------------------
create table webhooks (
    id uuid primary key default gen_random_uuid(),
    
    -- Связь со справочником (null = все справочники)
    directory_id uuid references directories(id) on delete cascade,
    
    -- Настройки
    name text not null,
    url text not null,
    secret text,
    event_types text[] not null,
    is_active boolean not null default true,
    
    -- Дополнительные headers
    headers jsonb,
    
    -- Аудит
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table webhooks is 'Настройки webhooks';
comment on column webhooks.secret is 'Секрет для HMAC-SHA256 подписи payload';
comment on column webhooks.event_types is 'Типы событий для отправки: {ENTRY_CREATED, ENTRY_UPDATED, ...}';

-- ----------------------------------------------------------------------------
-- Таблица: webhook_deliveries
-- Описание: Логи доставки webhooks
-- ----------------------------------------------------------------------------
create table webhook_deliveries (
    id uuid primary key default gen_random_uuid(),
    webhook_id uuid not null references webhooks(id) on delete cascade,
    event_id uuid not null references directory_events(id) on delete cascade,
    
    -- Статус
    status delivery_status not null default 'PENDING',
    attempts int not null default 0,
    
    -- Время
    last_attempt_at timestamptz,
    next_attempt_at timestamptz,
    
    -- Результат
    response_status int,
    response_body text,
    error_message text,
    
    -- Аудит
    created_at timestamptz not null default now()
);

comment on table webhook_deliveries is 'Логи доставки webhooks';
comment on column webhook_deliveries.next_attempt_at is 'Время следующей попытки (для retry)';

-- ----------------------------------------------------------------------------
-- Таблица: webhook_dead_letters
-- Описание: Dead letter queue для неудачных webhook доставок
-- ----------------------------------------------------------------------------
create table webhook_dead_letters (
    id uuid primary key default gen_random_uuid(),
    webhook_id uuid not null references webhooks(id) on delete cascade,
    event_id uuid not null references directory_events(id) on delete cascade,
    delivery_id uuid references webhook_deliveries(id) on delete set null,
    
    -- Информация об ошибке
    attempts int not null,
    last_error text,
    
    -- Сохранённый payload
    payload jsonb not null,
    
    -- Аудит
    created_at timestamptz not null default now()
);

comment on table webhook_dead_letters is 'Dead letter queue для неудачных webhook доставок';

-- ----------------------------------------------------------------------------
-- Таблица: import_jobs
-- Описание: Задачи массового импорта
-- ----------------------------------------------------------------------------
create table import_jobs (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Статус
    status import_status not null default 'PENDING',
    mode import_mode not null default 'UPSERT',
    
    -- Файл
    file_name text,
    file_path text,
    
    -- Настройки
    column_mapping jsonb not null,
    unique_key_field text,
    is_atomic boolean not null default false,
    
    -- Статистика
    total_rows int not null default 0,
    processed_rows int not null default 0,
    success_count int not null default 0,
    error_count int not null default 0,
    
    -- Ошибки и preview
    errors jsonb not null default '[]'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    preview_data jsonb,
    
    -- Аудит
    created_by uuid,
    created_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz
);

comment on table import_jobs is 'Задачи массового импорта';
comment on column import_jobs.is_atomic is 'Атомарный режим: всё или ничего';
comment on column import_jobs.errors is 'Массив ошибок: [{row, field, message, data}, ...]';
comment on column import_jobs.preview_data is 'Первые 10 строк для preview';

-- ----------------------------------------------------------------------------
-- Таблица: import_templates
-- Описание: Шаблоны маппинга для импорта
-- ----------------------------------------------------------------------------
create table import_templates (
    id uuid primary key default gen_random_uuid(),
    directory_id uuid not null references directories(id) on delete cascade,
    
    -- Идентификация
    name text not null,
    description text,
    
    -- Маппинг
    column_mapping jsonb not null,
    unique_key_field text,
    default_mode import_mode not null default 'UPSERT',
    
    -- Флаги
    is_default boolean not null default false,
    
    -- Аудит
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table import_templates is 'Шаблоны маппинга для импорта';
comment on column import_templates.is_default is 'Шаблон по умолчанию для справочника';

-- ----------------------------------------------------------------------------
-- Таблица: user_recent_selections
-- Описание: Недавние выборы пользователя (для autocomplete)
-- ----------------------------------------------------------------------------
create table user_recent_selections (
    user_id uuid not null,
    directory_id uuid not null references directories(id) on delete cascade,
    entry_id uuid not null references directory_entries(id) on delete cascade,
    
    -- Время и счётчик
    selected_at timestamptz not null default now(),
    selection_count int not null default 1,
    
    -- Composite PK
    primary key (user_id, directory_id, entry_id)
);

comment on table user_recent_selections is 'Недавние выборы пользователя для autocomplete';
comment on column user_recent_selections.selection_count is 'Счётчик выборов (для сортировки по популярности)';

-- ----------------------------------------------------------------------------
-- Таблица: directory_stats
-- Описание: Статистика справочников
-- ----------------------------------------------------------------------------
create table directory_stats (
    directory_id uuid primary key references directories(id) on delete cascade,
    
    -- Счётчики
    total_entries int not null default 0,
    active_entries int not null default 0,
    official_entries int not null default 0,
    local_entries int not null default 0,
    
    -- Синхронизация
    last_sync_at timestamptz,
    last_sync_status sync_status,
    consecutive_sync_failures int not null default 0,
    
    -- Импорт
    last_import_at timestamptz,
    
    -- Производительность
    avg_search_time_ms numeric,
    
    -- Аудит
    updated_at timestamptz not null default now()
);

comment on table directory_stats is 'Статистика справочников';
comment on column directory_stats.consecutive_sync_failures is 'Количество подряд неудачных синхронизаций';
comment on column directory_stats.avg_search_time_ms is 'Среднее время поиска в миллисекундах';

-- ============================================================================
-- PART 5: INDEXES
-- ============================================================================

-- directories
create unique index idx_directories_slug_active 
    on directories(slug) where deleted_at is null;
create index idx_directories_type on directories(type);
create index idx_directories_scope_org on directories(scope, organization_id);
create index idx_directories_deleted on directories(deleted_at) where deleted_at is not null;

-- directory_fields
create index idx_fields_directory on directory_fields(directory_id);
create index idx_fields_directory_order on directory_fields(directory_id, sort_order);
create index idx_fields_ref on directory_fields(ref_directory_id) 
    where ref_directory_id is not null;

-- directory_entries
create index idx_entries_directory on directory_entries(directory_id);
create index idx_entries_directory_status on directory_entries(directory_id, status);
create index idx_entries_parent on directory_entries(parent_id) where parent_id is not null;
create index idx_entries_code on directory_entries(directory_id, code) where code is not null;
create index idx_entries_external_key on directory_entries(directory_id, external_key) 
    where external_key is not null;
create index idx_entries_origin on directory_entries(directory_id, origin);

-- Уникальность normalized_name в рамках directory + origin
create unique index idx_entries_normalized_unique 
    on directory_entries(directory_id, normalized_name, origin) 
    where deleted_at is null;

-- Полнотекстовый поиск
create index idx_entries_search_vector on directory_entries using gin(search_vector);

-- Trigram для fuzzy search
create index idx_entries_normalized_trgm 
    on directory_entries using gin(normalized_name gin_trgm_ops);

-- JSONB индексы
create index idx_entries_tags on directory_entries using gin(tags);
create index idx_entries_data on directory_entries using gin(data jsonb_path_ops);
create index idx_entries_translations on directory_entries using gin(translations);

-- directory_sources
create index idx_sources_directory on directory_sources(directory_id);
create index idx_sources_active_schedule on directory_sources(is_active, schedule) 
    where schedule is not null;

-- directory_sync_logs
create index idx_sync_logs_directory on directory_sync_logs(directory_id);
create index idx_sync_logs_source on directory_sync_logs(source_id);
create index idx_sync_logs_started on directory_sync_logs(started_at desc);

-- directory_entry_audit
create index idx_audit_entry on directory_entry_audit(entry_id);
create index idx_audit_entry_time on directory_entry_audit(entry_id, changed_at desc);
create index idx_audit_changed_by on directory_entry_audit(changed_by);
create index idx_audit_action on directory_entry_audit(action);

-- directory_permissions
create index idx_permissions_directory on directory_permissions(directory_id);
create index idx_permissions_directory_role on directory_permissions(directory_id, role);
create index idx_permissions_user on directory_permissions(user_id) where user_id is not null;
create index idx_permissions_org on directory_permissions(organization_id) 
    where organization_id is not null;

-- directory_events
create index idx_events_directory on directory_events(directory_id);
create index idx_events_type_time on directory_events(event_type, created_at desc);
create index idx_events_batch on directory_events(batch_id) where batch_id is not null;
create index idx_events_unprocessed on directory_events(created_at) where processed_at is null;

-- webhooks
create index idx_webhooks_directory on webhooks(directory_id);
create index idx_webhooks_active on webhooks(is_active) where is_active = true;

-- webhook_deliveries
create index idx_deliveries_webhook on webhook_deliveries(webhook_id);
create index idx_deliveries_event on webhook_deliveries(event_id);
create index idx_deliveries_pending on webhook_deliveries(next_attempt_at) 
    where status = 'PENDING';
create index idx_deliveries_dead on webhook_deliveries(webhook_id) 
    where status = 'DEAD';

-- webhook_dead_letters
create index idx_dead_letters_webhook on webhook_dead_letters(webhook_id);
create index idx_dead_letters_created on webhook_dead_letters(created_at);

-- import_jobs
create index idx_import_jobs_directory on import_jobs(directory_id);
create index idx_import_jobs_status on import_jobs(status);
create index idx_import_jobs_user on import_jobs(created_by);
create index idx_import_jobs_created on import_jobs(created_at desc);

-- import_templates
create index idx_import_templates_directory on import_templates(directory_id);

-- user_recent_selections
create index idx_recent_user_dir on user_recent_selections(user_id, directory_id, selected_at desc);

-- ============================================================================
-- PART 6: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Триггеры updated_at
-- ----------------------------------------------------------------------------
create trigger trg_directories_updated_at
    before update on directories
    for each row execute function update_updated_at();

create trigger trg_fields_updated_at
    before update on directory_fields
    for each row execute function update_updated_at();

create trigger trg_entries_updated_at
    before update on directory_entries
    for each row execute function update_updated_at();

create trigger trg_sources_updated_at
    before update on directory_sources
    for each row execute function update_updated_at();

create trigger trg_permissions_updated_at
    before update on directory_permissions
    for each row execute function update_updated_at();

create trigger trg_webhooks_updated_at
    before update on webhooks
    for each row execute function update_updated_at();

create trigger trg_import_templates_updated_at
    before update on import_templates
    for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- Триггер: Нормализация имени записи
-- ----------------------------------------------------------------------------
create or replace function trg_update_normalized_name()
returns trigger as $$
begin
    new.normalized_name := normalize_entry_name(new.name);
    return new;
end;
$$ language plpgsql;

create trigger trg_entry_normalized_name
    before insert or update of name
    on directory_entries
    for each row execute function trg_update_normalized_name();

-- ----------------------------------------------------------------------------
-- Триггер: Обновление search_vector
-- ----------------------------------------------------------------------------
create or replace function trg_update_entry_search_vector()
returns trigger as $$
begin
    new.search_vector :=
        setweight(to_tsvector('simple', coalesce(new.normalized_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(new.code, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(new.external_key, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(new.translations::text, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');
    return new;
end;
$$ language plpgsql;

create trigger trg_entry_search_vector
    before insert or update of name, normalized_name, code, external_key, translations, description
    on directory_entries
    for each row execute function trg_update_entry_search_vector();

-- ----------------------------------------------------------------------------
-- Функция: Проверка циклов в иерархии
-- ----------------------------------------------------------------------------
create or replace function check_hierarchy_cycle(
    p_entry_id uuid,
    p_new_parent_id uuid
) returns boolean as $$
declare
    v_current_id uuid := p_new_parent_id;
    v_depth int := 0;
    v_max_depth int := 100;
begin
    -- Нет родителя = нет цикла
    if p_new_parent_id is null then
        return false;
    end if;
    
    -- Сам на себя = цикл
    if p_entry_id = p_new_parent_id then
        return true;
    end if;
    
    -- Проходим вверх по иерархии
    while v_current_id is not null and v_depth < v_max_depth loop
        select parent_id into v_current_id
        from directory_entries
        where id = v_current_id;
        
        -- Нашли цикл
        if v_current_id = p_entry_id then
            return true;
        end if;
        
        v_depth := v_depth + 1;
    end loop;
    
    return false;
end;
$$ language plpgsql;

comment on function check_hierarchy_cycle is 'Проверяет наличие цикла при установке parent_id';

-- Триггер проверки цикла
create or replace function trg_check_hierarchy_cycle()
returns trigger as $$
begin
    if new.parent_id is not null then
        if check_hierarchy_cycle(new.id, new.parent_id) then
            raise exception 'Cycle detected in hierarchy: entry % cannot have parent %', 
                new.id, new.parent_id
                using errcode = 'integrity_constraint_violation';
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_entry_hierarchy_cycle
    before insert or update of parent_id
    on directory_entries
    for each row execute function trg_check_hierarchy_cycle();

-- ----------------------------------------------------------------------------
-- Триггер: Обновление статистики справочника
-- ----------------------------------------------------------------------------
create or replace function trg_update_directory_stats()
returns trigger as $$
declare
    v_directory_id uuid;
begin
    v_directory_id := coalesce(new.directory_id, old.directory_id);
    
    insert into directory_stats (
        directory_id, 
        total_entries, 
        active_entries, 
        official_entries, 
        local_entries, 
        updated_at
    )
    select 
        v_directory_id,
        count(*),
        count(*) filter (where status = 'ACTIVE'),
        count(*) filter (where origin = 'OFFICIAL'),
        count(*) filter (where origin = 'LOCAL'),
        now()
    from directory_entries
    where directory_id = v_directory_id
      and deleted_at is null
    on conflict (directory_id) do update set
        total_entries = excluded.total_entries,
        active_entries = excluded.active_entries,
        official_entries = excluded.official_entries,
        local_entries = excluded.local_entries,
        updated_at = excluded.updated_at;
    
    return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_entries_update_stats
    after insert or update or delete on directory_entries
    for each row execute function trg_update_directory_stats();

-- ----------------------------------------------------------------------------
-- Функция: Очистка старых recent selections
-- ----------------------------------------------------------------------------
create or replace function cleanup_recent_selections(
    p_user_id uuid default null,
    p_max_per_directory int default 20
)
returns int as $$
declare
    v_deleted int;
begin
    with ranked as (
        select 
            user_id, 
            directory_id, 
            entry_id,
            row_number() over (
                partition by user_id, directory_id 
                order by selected_at desc
            ) as rn
        from user_recent_selections
        where p_user_id is null or user_id = p_user_id
    ),
    to_delete as (
        select user_id, directory_id, entry_id
        from ranked
        where rn > p_max_per_directory
    )
    delete from user_recent_selections urs
    using to_delete td
    where urs.user_id = td.user_id
      and urs.directory_id = td.directory_id
      and urs.entry_id = td.entry_id;
    
    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$$ language plpgsql;

comment on function cleanup_recent_selections is 
    'Удаляет старые записи, оставляя топ-N на directory per user';

-- ----------------------------------------------------------------------------
-- Функция: Получение локализованного имени
-- ----------------------------------------------------------------------------
create or replace function get_localized_name(
    p_entry directory_entries,
    p_locale text,
    p_default_locale text default 'ru'
)
returns text as $$
begin
    -- Попробовать текущую локаль
    if p_entry.translations is not null and p_entry.translations ? p_locale then
        return p_entry.translations ->> p_locale;
    end if;
    
    -- Попробовать локаль по умолчанию
    if p_entry.translations is not null and p_entry.translations ? p_default_locale then
        return p_entry.translations ->> p_default_locale;
    end if;
    
    -- Вернуть базовое имя
    return p_entry.name;
end;
$$ language plpgsql immutable;

comment on function get_localized_name is 'Возвращает локализованное имя с fallback chain';

-- ----------------------------------------------------------------------------
-- Функция: Поиск записей с ранжированием
-- ----------------------------------------------------------------------------
create or replace function search_directory_entries(
    p_directory_id uuid,
    p_query text,
    p_status entry_status default 'ACTIVE',
    p_limit int default 50
)
returns table (
    id uuid,
    name text,
    code text,
    origin entry_origin,
    rank real
) as $$
begin
    return query
    select 
        e.id,
        e.name,
        e.code,
        e.origin,
        ts_rank(e.search_vector, plainto_tsquery('simple', p_query)) as rank
    from directory_entries e
    where e.directory_id = p_directory_id
      and e.status = p_status
      and e.deleted_at is null
      and (
        e.search_vector @@ plainto_tsquery('simple', p_query)
        or e.normalized_name ilike '%' || lower(p_query) || '%'
        or e.code ilike p_query || '%'
      )
    order by 
        case when e.code ilike p_query || '%' then 0 else 1 end,
        rank desc,
        e.name
    limit p_limit;
end;
$$ language plpgsql;

comment on function search_directory_entries is 'Поиск записей с комбинированным ранжированием';

-- ============================================================================
-- PART 7: INITIAL DATA (System Directories)
-- ============================================================================

-- Системные справочники создаются при первой инициализации

-- Единицы измерения
insert into directories (name, slug, type, scope, is_system, description, settings)
values (
    'Единицы измерения',
    'units',
    'PARAM',
    'HQ',
    true,
    'Единицы измерения для товаров и ингредиентов',
    '{"allow_inline_create": true, "prefetch": true, "offline_enabled": true}'::jsonb
) on conflict do nothing;

-- Категории товаров
insert into directories (name, slug, type, scope, is_system, is_hierarchical, description, settings)
values (
    'Категории товаров',
    'product_categories',
    'PARAM',
    'HQ',
    true,
    true,
    'Иерархический справочник категорий товаров',
    '{"allow_inline_create": true, "prefetch": true}'::jsonb
) on conflict do nothing;

-- Производители
insert into directories (name, slug, type, scope, is_system, description, settings)
values (
    'Производители',
    'manufacturers',
    'MANUAL',
    'HQ',
    true,
    'Производители товаров',
    '{"allow_inline_create": true, "prefetch": false}'::jsonb
) on conflict do nothing;

-- Типы контрагентов
insert into directories (name, slug, type, scope, is_system, description, settings)
values (
    'Типы контрагентов',
    'contractor_types',
    'PARAM',
    'HQ',
    true,
    'Типы контрагентов: поставщик, арендодатель и т.д.',
    '{"allow_inline_create": true, "prefetch": true}'::jsonb
) on conflict do nothing;

-- Типы автоматов
insert into directories (name, slug, type, scope, is_system, description, settings)
values (
    'Типы автоматов',
    'machine_types',
    'PARAM',
    'HQ',
    true,
    'Типы вендинговых автоматов',
    '{"allow_inline_create": true, "prefetch": true}'::jsonb
) on conflict do nothing;

-- Типы локаций
insert into directories (name, slug, type, scope, is_system, description, settings)
values (
    'Типы локаций',
    'location_types',
    'PARAM',
    'HQ',
    true,
    'Типы локаций: БЦ, ТРЦ, учебное заведение и т.д.',
    '{"allow_inline_create": true, "prefetch": true}'::jsonb
) on conflict do nothing;

-- Базовые единицы измерения
do $$
declare
    v_units_id uuid;
begin
    select id into v_units_id from directories where slug = 'units';
    
    if v_units_id is not null then
        insert into directory_entries (directory_id, name, code, origin, status, sort_order)
        values 
            (v_units_id, 'Штука', 'pcs', 'LOCAL', 'ACTIVE', 1),
            (v_units_id, 'Килограмм', 'kg', 'LOCAL', 'ACTIVE', 2),
            (v_units_id, 'Грамм', 'g', 'LOCAL', 'ACTIVE', 3),
            (v_units_id, 'Литр', 'l', 'LOCAL', 'ACTIVE', 4),
            (v_units_id, 'Миллилитр', 'ml', 'LOCAL', 'ACTIVE', 5),
            (v_units_id, 'Упаковка', 'pack', 'LOCAL', 'ACTIVE', 6),
            (v_units_id, 'Коробка', 'box', 'LOCAL', 'ACTIVE', 7),
            (v_units_id, 'Порция', 'portion', 'LOCAL', 'ACTIVE', 8)
        on conflict do nothing;
    end if;
end $$;

-- ============================================================================
-- PART 8: GRANTS (настроить под свои роли)
-- ============================================================================

-- Пример:
-- grant select, insert, update, delete on all tables in schema public to vhm24_app;
-- grant usage, select on all sequences in schema public to vhm24_app;
-- grant execute on all functions in schema public to vhm24_app;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
