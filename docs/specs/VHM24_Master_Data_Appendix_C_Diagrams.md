# VHM24 Master Data Management — Mermaid Diagrams

## Appendix C to Technical Specification v1.0

Этот документ содержит все диаграммы системы справочников в формате Mermaid.

---

## 1. ER-диаграмма (Entity Relationship)

```mermaid
erDiagram
    directories ||--o{ directory_fields : "has fields"
    directories ||--o{ directory_entries : "contains entries"
    directories ||--o{ directory_sources : "has sources"
    directories ||--o{ directory_permissions : "has permissions"
    directories ||--o| directory_stats : "has stats"
    directories ||--o{ import_jobs : "has imports"
    directories ||--o{ import_templates : "has templates"
    directories ||--o{ webhooks : "has webhooks"

    directory_entries ||--o{ directory_entry_audit : "has audit"
    directory_entries ||--o{ directory_events : "triggers events"
    directory_entries }o--o| directory_entries : "parent/child"
    directory_entries }o--o| directory_entries : "replacement"

    directory_fields }o--o| directories : "ref to directory"

    directory_sources ||--o{ directory_sync_logs : "has logs"

    directory_events ||--o{ webhook_deliveries : "delivered by"
    webhooks ||--o{ webhook_deliveries : "delivers"
    webhook_deliveries ||--o| webhook_dead_letters : "fails to"

    user_recent_selections }o--|| directory_entries : "selects entry"
    user_recent_selections }o--|| directories : "from directory"

    directories {
        uuid id PK
        text name
        text slug UK
        directory_type type
        directory_scope scope
        uuid organization_id FK
        uuid location_id FK
        boolean is_hierarchical
        boolean is_system
        text icon
        jsonb settings
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    directory_fields {
        uuid id PK
        uuid directory_id FK
        text name
        text display_name
        text description
        field_type field_type
        uuid ref_directory_id FK
        boolean allow_free_text
        boolean is_required
        boolean is_unique
        boolean is_unique_per_org
        boolean show_in_list
        boolean show_in_card
        int sort_order
        jsonb default_value
        jsonb validation_rules
        jsonb translations
        timestamptz created_at
        timestamptz updated_at
    }

    directory_entries {
        uuid id PK
        uuid directory_id FK
        uuid parent_id FK
        text name
        text normalized_name
        text code
        text external_key
        text description
        jsonb translations
        entry_origin origin
        text origin_source
        timestamptz origin_date
        entry_status status
        int version
        timestamptz valid_from
        timestamptz valid_to
        timestamptz deprecated_at
        uuid replacement_entry_id FK
        text_array tags
        int sort_order
        jsonb data
        tsvector search_vector
        uuid organization_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    directory_sources {
        uuid id PK
        uuid directory_id FK
        text name
        source_type source_type
        text url
        jsonb auth_config
        jsonb request_config
        jsonb column_mapping
        text unique_key_field
        text schedule
        boolean is_active
        timestamptz last_sync_at
        sync_status last_sync_status
        text last_sync_error
        int consecutive_failures
        text source_version
        timestamptz created_at
        timestamptz updated_at
    }

    directory_sync_logs {
        uuid id PK
        uuid directory_id FK
        uuid source_id FK
        sync_log_status status
        timestamptz started_at
        timestamptz finished_at
        int total_records
        int created_count
        int updated_count
        int deprecated_count
        int error_count
        jsonb errors
        uuid triggered_by FK
    }

    directory_entry_audit {
        uuid id PK
        uuid entry_id FK
        audit_action action
        uuid changed_by FK
        timestamptz changed_at
        jsonb old_values
        jsonb new_values
        text change_reason
        inet ip_address
        text user_agent
    }

    directory_permissions {
        uuid id PK
        uuid directory_id FK
        uuid organization_id FK
        text role
        uuid user_id FK
        boolean can_view
        boolean can_create
        boolean can_edit
        boolean can_archive
        boolean can_bulk_import
        boolean can_sync_external
        boolean can_approve
        boolean inherit_from_parent
        boolean is_deny
        timestamptz created_at
        timestamptz updated_at
    }

    directory_events {
        uuid id PK
        event_type event_type
        uuid directory_id FK
        uuid entry_id FK
        uuid batch_id
        int sequence_num
        jsonb payload
        timestamptz created_at
        timestamptz processed_at
    }

    webhooks {
        uuid id PK
        uuid directory_id FK
        text name
        text url
        text secret
        text_array event_types
        boolean is_active
        jsonb headers
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    webhook_deliveries {
        uuid id PK
        uuid webhook_id FK
        uuid event_id FK
        delivery_status status
        int attempts
        timestamptz last_attempt_at
        timestamptz next_attempt_at
        int response_status
        text response_body
        text error_message
        timestamptz created_at
    }

    webhook_dead_letters {
        uuid id PK
        uuid webhook_id FK
        uuid event_id FK
        uuid delivery_id FK
        int attempts
        text last_error
        jsonb payload
        timestamptz created_at
    }

    import_jobs {
        uuid id PK
        uuid directory_id FK
        import_status status
        import_mode mode
        text file_name
        text file_path
        jsonb column_mapping
        text unique_key_field
        boolean is_atomic
        int total_rows
        int processed_rows
        int success_count
        int error_count
        jsonb errors
        jsonb warnings
        jsonb preview_data
        uuid created_by FK
        timestamptz created_at
        timestamptz started_at
        timestamptz finished_at
    }

    import_templates {
        uuid id PK
        uuid directory_id FK
        text name
        text description
        jsonb column_mapping
        text unique_key_field
        import_mode default_mode
        boolean is_default
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    user_recent_selections {
        uuid user_id PK
        uuid directory_id PK_FK
        uuid entry_id PK_FK
        timestamptz selected_at
        int selection_count
    }

    directory_stats {
        uuid directory_id PK_FK
        int total_entries
        int active_entries
        int official_entries
        int local_entries
        timestamptz last_sync_at
        sync_status last_sync_status
        int consecutive_sync_failures
        timestamptz last_import_at
        numeric avg_search_time_ms
        timestamptz updated_at
    }
```

---

## 2. Workflow статусов записи

```mermaid
stateDiagram-v2
    [*] --> DRAFT: создание

    DRAFT --> PENDING_APPROVAL: submit (если approval_required)
    DRAFT --> ACTIVE: publish (если !approval_required)

    PENDING_APPROVAL --> ACTIVE: approve
    PENDING_APPROVAL --> DRAFT: reject

    ACTIVE --> DEPRECATED: sync (удалено из источника)
    ACTIVE --> ARCHIVED: archive (вручную)
    ACTIVE --> ACTIVE: update

    ARCHIVED --> ACTIVE: restore

    DEPRECATED --> ACTIVE: restore (редко)

    note right of DRAFT
        Черновик
        Не виден в выборе
    end note

    note right of PENDING_APPROVAL
        Ожидает утверждения
        Не виден в выборе
    end note

    note right of ACTIVE
        Активный
        Доступен для выбора
    end note

    note right of DEPRECATED
        Устарел (OFFICIAL)
        Виден с предупреждением
    end note

    note right of ARCHIVED
        Архивирован
        Не виден в выборе
    end note
```

---

## 3. Flow синхронизации внешнего источника

```mermaid
flowchart TD
    A[Начало Sync] --> B{Источник активен?}
    B -->|Нет| C[Пропустить]
    B -->|Да| D[Создать sync_log]

    D --> E[Загрузить данные из источника]
    E --> F{Успешно?}

    F -->|Нет| G[Записать ошибку]
    G --> H[consecutive_failures++]
    H --> I{failures > 3?}
    I -->|Да| J[Отправить алерт]
    I -->|Нет| K[Завершить с ошибкой]
    J --> K

    F -->|Да| L[Применить маппинг]
    L --> M[Для каждой записи]

    M --> N{Существует в БД?}
    N -->|Нет| O[CREATE с origin=OFFICIAL]
    N -->|Да| P{Изменилась?}

    P -->|Нет| Q[Пропустить]
    P -->|Да| R[UPDATE, version++]

    O --> S[Audit log]
    R --> S

    S --> T{Еще записи?}
    T -->|Да| M
    T -->|Нет| U[Найти удаленные из источника]

    U --> V[Пометить DEPRECATED]
    V --> W[Обновить stats]
    W --> X[consecutive_failures = 0]
    X --> Y[Создать SYNC_COMPLETED event]
    Y --> Z[Завершить успешно]

    style A fill:#4CAF50
    style Z fill:#4CAF50
    style K fill:#f44336
    style J fill:#ff9800
```

---

## 4. Flow импорта данных

```mermaid
flowchart TD
    A[Загрузка файла] --> B[Парсинг Excel/CSV]
    B --> C[Показать preview]

    C --> D{Есть шаблон?}
    D -->|Да| E[Применить шаблон]
    D -->|Нет| F[Ручной маппинг]

    E --> G[Настроить маппинг]
    F --> G

    G --> H[Выбрать режим]
    H --> I{DRY_RUN?}

    I -->|Да| J[Валидация без сохранения]
    J --> K[Показать результат]
    K --> L{Продолжить?}
    L -->|Нет| M[Конец]
    L -->|Да| N[Выбрать рабочий режим]

    I -->|Нет| N
    N --> O[Создать import_job]

    O --> P[Обработка строк]
    P --> Q{Валидация OK?}

    Q -->|Нет| R{Atomic mode?}
    R -->|Да| S[Rollback всего]
    R -->|Нет| T[Записать ошибку, продолжить]

    Q -->|Да| U{CREATE_ONLY?}
    U -->|Да| V{Существует?}
    V -->|Да| W[Пропустить]
    V -->|Нет| X[CREATE]

    U -->|Нет| Y{UPDATE_ONLY?}
    Y -->|Да| Z{Существует?}
    Z -->|Да| AA[UPDATE]
    Z -->|Нет| AB[Пропустить]

    Y -->|Нет| AC[UPSERT]
    AC --> AD{Существует?}
    AD -->|Да| AE[UPDATE]
    AD -->|Нет| AF[CREATE]

    X --> AG[Audit log]
    AA --> AG
    AE --> AG
    AF --> AG
    W --> AH{Еще строки?}
    AB --> AH
    T --> AH
    AG --> AH

    AH -->|Да| P
    AH -->|Нет| AI[Обновить stats]

    S --> AJ[Статус: FAILED]
    AI --> AK[Статус: COMPLETED/PARTIAL]

    AJ --> AL[Создать IMPORT_FAILED event]
    AK --> AM[Создать IMPORT_COMPLETED event]

    AL --> AN[Показать результат]
    AM --> AN

    style A fill:#2196F3
    style AN fill:#4CAF50
    style S fill:#f44336
    style AJ fill:#f44336
```

---

## 5. Flow Inline Create

```mermaid
flowchart TD
    A[Пользователь вводит текст] --> B[Поиск в справочнике]
    B --> C{Найдено?}

    C -->|Да| D[Показать результаты]
    D --> E[Пользователь выбирает]
    E --> F[Значение выбрано]

    C -->|Нет| G{allow_inline_create?}
    G -->|Нет| H[Показать: Ничего не найдено]

    G -->|Да| I[Показать: + Добавить]
    I --> J{Клик на Добавить}

    J --> K[Проверить похожие]
    K --> L{Есть похожие?}

    L -->|Да| M[Показать: Возможно, уже есть]
    M --> N{Всё равно создать?}
    N -->|Нет| O[Выбрать похожую]
    O --> F

    L -->|Нет| P{Только name?}
    N -->|Да| P

    P -->|Да| Q[Создать запись сразу]
    P -->|Нет| R[Открыть mini-form]

    R --> S[Заполнить обязательные]
    S --> T[Нажать Создать]
    T --> Q

    Q --> U{approval_required?}
    U -->|Да| V[Статус: PENDING_APPROVAL]
    U -->|Нет| W[Статус: ACTIVE]

    V --> X[Показать предупреждение]
    W --> Y[Запись создана]
    X --> Y

    Y --> Z[Audit log]
    Z --> AA[Создать event]
    AA --> AB[Автовыбор записи]
    AB --> F

    style A fill:#2196F3
    style F fill:#4CAF50
    style H fill:#ff9800
```

---

## 6. Алгоритм разрешения прав (RBAC)

```mermaid
flowchart TD
    A[Запрос действия] --> B[Получить все правила]

    B --> C[Сортировка по приоритету]
    C --> D["1. User deny rules"]
    D --> E["2. User allow rules"]
    E --> F["3. Role deny rules"]
    F --> G["4. Role allow rules"]
    G --> H["5. Org deny rules"]
    H --> I["6. Org allow rules"]
    I --> J["7. Inherited rules"]

    J --> K[Проход по правилам]

    K --> L{Текущее правило}
    L --> M{is_deny = true?}

    M -->|Да| N{permission = true?}
    N -->|Да| O[DENIED]
    N -->|Нет| P[Следующее правило]

    M -->|Нет| Q{permission = true?}
    Q -->|Да| R[ALLOWED]
    Q -->|Нет| P

    P --> S{Еще правила?}
    S -->|Да| L
    S -->|Нет| T[DEFAULT: DENIED]

    style A fill:#2196F3
    style O fill:#f44336
    style R fill:#4CAF50
    style T fill:#f44336
```

---

## 7. Webhook Delivery Flow

```mermaid
flowchart TD
    A[Event создан] --> B[Найти активные webhooks]
    B --> C{Webhooks найдены?}

    C -->|Нет| D[Завершить]
    C -->|Да| E[Для каждого webhook]

    E --> F[Создать delivery]
    F --> G[Подготовить payload]
    G --> H[Подписать HMAC-SHA256]

    H --> I[Отправить POST]
    I --> J{HTTP 2xx?}

    J -->|Да| K[status = SUCCESS]
    K --> L[Записать response]

    J -->|Нет| M[attempts++]
    M --> N{attempts < 5?}

    N -->|Да| O[Вычислить backoff]
    O --> P["delay = 2^(attempts-1) sec"]
    P --> Q[next_attempt_at = now + delay]
    Q --> R[status = PENDING]

    N -->|Нет| S[status = DEAD]
    S --> T[Создать dead_letter]
    T --> U[Отправить алерт]

    L --> V{Еще webhooks?}
    R --> V
    U --> V

    V -->|Да| E
    V -->|Нет| W[Завершить]

    style A fill:#2196F3
    style K fill:#4CAF50
    style S fill:#f44336
    style U fill:#ff9800
```

---

## 8. Поиск с ранжированием

```mermaid
flowchart TD
    A[Запрос поиска] --> B[Параметры: query, directory_id]

    B --> C[Параллельные запросы]

    C --> D[Full-text search]
    C --> E[Trigram match]
    C --> F[Exact code match]

    D --> G["search_vector @@ query"]
    E --> H["normalized_name ILIKE %query%"]
    F --> I["code ILIKE query%"]

    G --> J[Результаты FTS]
    H --> K[Результаты Trigram]
    I --> L[Результаты Exact]

    J --> M[Объединение UNION]
    K --> M
    L --> M

    M --> N[Ранжирование]

    N --> O{code exact match?}
    O -->|Да| P[Приоритет 0]
    O -->|Нет| Q[ts_rank score]

    P --> R[Сортировка]
    Q --> R

    R --> S["ORDER BY priority, rank DESC, name"]
    S --> T[LIMIT 50]

    T --> U{include_recent?}
    U -->|Да| V[Получить recent]
    U -->|Нет| W[Вернуть результат]

    V --> X[Объединить recent + results]
    X --> W

    style A fill:#2196F3
    style W fill:#4CAF50
```

---

## 9. Offline Sync & Conflict Resolution

```mermaid
flowchart TD
    A[Приложение online] --> B[Проверить pending changes]

    B --> C{Есть изменения?}
    C -->|Нет| D[Sync server → client]
    C -->|Да| E[Для каждого изменения]

    E --> F[Получить серверную версию]
    F --> G{updated_at совпадает?}

    G -->|Да| H[Применить изменение]
    H --> I[Удалить из pending]

    G -->|Нет| J[КОНФЛИКТ]
    J --> K[Показать UI конфликта]

    K --> L{Выбор пользователя}

    L -->|Keep mine| M[Отправить на сервер]
    M --> I

    L -->|Take server| N[Отменить локальное]
    N --> I

    L -->|Merge| O[Открыть merge editor]
    O --> P[Объединить вручную]
    P --> M

    I --> Q{Еще изменения?}
    Q -->|Да| E
    Q -->|Нет| D

    D --> R[Получить обновления]
    R --> S[Сохранить в IndexedDB]
    S --> T[Sync завершён]

    style A fill:#2196F3
    style T fill:#4CAF50
    style J fill:#ff9800
```

---

## 10. Архитектура компонентов системы

```mermaid
graph TB
    subgraph Frontend
        UI[UI Components]
        Cache[Local Cache]
        IDB[(IndexedDB)]
        WS[WebSocket Client]
    end

    subgraph API["API Gateway"]
        REST[REST Controllers]
        GQL[GraphQL Resolvers]
        Auth[Auth Middleware]
        RBAC[RBAC Guard]
    end

    subgraph Services["Business Logic"]
        DirSvc[Directory Service]
        EntrySvc[Entry Service]
        SearchSvc[Search Service]
        SyncSvc[Sync Service]
        ImportSvc[Import Service]
        EventSvc[Event Service]
        WebhookSvc[Webhook Service]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        Redis[(Redis Cache)]
        S3[(S3 Storage)]
    end

    subgraph External["External"]
        ExtAPI[External APIs]
        WebhookDest[Webhook Destinations]
    end

    subgraph Jobs["Background Jobs"]
        SyncJob[Sync Scheduler]
        WebhookJob[Webhook Worker]
        CleanupJob[Cleanup Jobs]
    end

    UI --> REST
    UI --> GQL
    UI --> WS
    Cache --> IDB

    REST --> Auth
    GQL --> Auth
    Auth --> RBAC
    RBAC --> DirSvc
    RBAC --> EntrySvc
    RBAC --> SearchSvc
    RBAC --> ImportSvc

    DirSvc --> PG
    EntrySvc --> PG
    SearchSvc --> PG
    SearchSvc --> Redis
    ImportSvc --> PG
    ImportSvc --> S3

    SyncSvc --> ExtAPI
    SyncSvc --> PG

    EventSvc --> PG
    EventSvc --> WS

    WebhookSvc --> WebhookDest
    WebhookSvc --> PG

    SyncJob --> SyncSvc
    WebhookJob --> WebhookSvc
    CleanupJob --> PG

    style PG fill:#336791
    style Redis fill:#DC382D
    style S3 fill:#569A31
```

---

## 11. Типы справочников и их особенности

```mermaid
graph TD
    subgraph Types["Типы справочников"]
        MANUAL["MANUAL<br/>Внутренний"]
        EXTERNAL["EXTERNAL<br/>Внешний"]
        PARAM["PARAM<br/>Параметрический"]
        TEMPLATE["TEMPLATE<br/>Шаблон"]
    end

    subgraph MANUALFeatures["MANUAL"]
        MF1[Полный CRUD]
        MF2[origin = LOCAL]
        MF3[Inline Create]
    end

    subgraph EXTERNALFeatures["EXTERNAL"]
        EF1[Auto-sync]
        EF2[OFFICIAL read-only]
        EF3[LOCAL overlay]
        EF4[Versioning]
    end

    subgraph PARAMFeatures["PARAM"]
        PF1[Источник для SELECT]
        PF2[Prefetch enabled]
        PF3[Небольшой объём]
    end

    subgraph TEMPLATEFeatures["TEMPLATE"]
        TF1[System templates]
        TF2[User templates]
        TF3[Clone & create]
    end

    MANUAL --> MF1
    MANUAL --> MF2
    MANUAL --> MF3

    EXTERNAL --> EF1
    EXTERNAL --> EF2
    EXTERNAL --> EF3
    EXTERNAL --> EF4

    PARAM --> PF1
    PARAM --> PF2
    PARAM --> PF3

    TEMPLATE --> TF1
    TEMPLATE --> TF2
    TEMPLATE --> TF3

    style MANUAL fill:#4CAF50
    style EXTERNAL fill:#2196F3
    style PARAM fill:#FF9800
    style TEMPLATE fill:#9C27B0
```

---

## 12. Миграция данных

```mermaid
gantt
    title План миграции Master Data
    dateFormat  YYYY-MM-DD

    section Подготовка
    Создание таблиц           :a1, 2024-01-01, 3d
    Написание миграционных скриптов  :a2, after a1, 5d
    Тестирование на dev       :a3, after a2, 3d

    section Миграция данных
    Перенос справочников      :b1, after a3, 2d
    Перенос записей           :b2, after b1, 5d
    Проверка целостности      :b3, after b2, 2d

    section Dual-write
    Включение dual-write      :c1, after b3, 1d
    Мониторинг консистентности :c2, after c1, 7d

    section Переключение
    Переключение READ         :d1, after c2, 1d
    Тестирование в production :d2, after d1, 5d
    Отключение старого WRITE  :d3, after d2, 1d

    section Завершение
    Архивирование старых таблиц :e1, after d3, 2d
    Документация              :e2, after e1, 3d
```

---

**Конец Appendix C**
