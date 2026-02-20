# VendHub OS -- Системная документация и диаграммы

> Полный набор диаграмм для документирования архитектуры, процессов, данных и взаимодействий системы VendHub OS.
> Все диаграммы написаны в формате Mermaid и могут быть отрендерены в GitHub, Notion, Obsidian и других инструментах.

---

## Содержание

1. [System Overview](#system-overview) -- Обзор системы
   - 1.1 System Architecture Diagram
   - 1.2 Module Dependency Diagram
   - 1.3 Deployment Diagram
2. [ERD (Entity Relationship Diagrams)](#erd-entity-relationship-diagrams) -- Схемы базы данных
   - 2.1 Core (Organizations, Users, RBAC)
   - 2.2 Machines & Locations
   - 2.3 Products & Recipes
   - 2.4 Inventory (3-Level System)
   - 2.5 Tasks, Routes & Trips
   - 2.6 Financial (Transactions, Payments, Orders)
3. [Flowcharts](#flowcharts) -- Блок-схемы алгоритмов
   - 3.1 User Authentication (Login)
   - 3.2 Order Processing
   - 3.3 Task Lifecycle (Refill)
   - 3.4 Inventory Movement (3-Level Flow)
   - 3.5 Payment Processing (Payme/Click)
   - 3.6 Cash Collection Process
   - 3.7 Maintenance Request Workflow
   - 3.8 Location Lifecycle
4. [UML Diagrams](#uml-diagrams) -- UML-диаграммы
   - 4.1 Use Case Diagram
   - 4.2 Class Diagram
   - 4.3 Sequence Diagrams (4 сценария)
   - 4.4 Activity Diagrams (3 процесса)
   - 4.5 State Diagrams (5 сущностей)
5. [BPMN (Business Process Diagrams)](#bpmn-business-process-diagrams) -- Бизнес-процессы
   - 5.1 Vending Machine Sales Process
   - 5.2 Daily Operations Workflow
   - 5.3 New Machine Installation
   - 5.4 Financial Reconciliation (Monthly)
   - 5.5 Customer Complaint Resolution
   - 5.6 Employee Trip Tracking

---

## SYSTEM OVERVIEW

VendHub OS -- это единая платформа управления вендинговыми автоматами для рынка Узбекистана. Система построена как monorepo на базе Turborepo и включает 5 приложений (NestJS API, Next.js Admin, Vite PWA, Telegram Bot, React Native Mobile), 60+ API-модулей, интеграции с локальными платежными системами (Payme, Click, Uzum Bank), фискальными сервисами (Soliq/OFD) и мониторинг на базе Prometheus + Grafana + Loki.

---

### 1. System Architecture Diagram

Высокоуровневая архитектура показывает все приложения, инфраструктурные компоненты, внешние интеграции и потоки данных между ними.

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        WEB["Next.js Admin Panel<br/>:3000"]
        CLIENT["Vite PWA Client<br/>:5173"]
        MOBILE["React Native<br/>Expo Mobile"]
        BOT["Telegram Bot<br/>Telegraf 4.16"]
    end

    subgraph Gateway["Reverse Proxy"]
        NGINX["Nginx<br/>:80 / :443<br/>SSL Termination<br/>Rate Limiting"]
    end

    subgraph API_Layer["API Layer"]
        API["NestJS API<br/>:4000<br/>60+ modules<br/>REST + WebSocket"]
        SWAGGER["Swagger UI<br/>/api/docs"]
        BULLBOARD["BullBoard UI<br/>/admin/queues"]
    end

    subgraph Data_Layer["Data Layer"]
        PG["PostgreSQL 16<br/>:5432<br/>120+ entities<br/>UUID PKs"]
        REDIS["Redis 7<br/>:6379<br/>Cache / Sessions<br/>BullMQ Queues"]
        MINIO["MinIO S3<br/>:9000 / :9001<br/>File Storage"]
    end

    subgraph Monitoring["Monitoring Stack"]
        PROM["Prometheus<br/>:9090"]
        GRAFANA["Grafana<br/>:3001"]
        LOKI["Loki<br/>:3100"]
        PROMTAIL["Promtail<br/>Log Collector"]
        ALERTMGR["Alertmanager<br/>:9093"]
        NODE_EXP["Node Exporter<br/>:9100"]
        CADVISOR["cAdvisor<br/>:8080"]
        PG_EXP["Postgres Exporter<br/>:9187"]
        REDIS_EXP["Redis Exporter<br/>:9121"]
    end

    subgraph External["External Services"]
        PAYME["Payme"]
        CLICK["Click"]
        UZUM["Uzum Bank"]
        TELEGRAM_API["Telegram API"]
        ESKIZ["Eskiz SMS"]
        PLAYMOBILE["PlayMobile SMS"]
        SOLIQ["Soliq / OFD<br/>Fiscal Service"]
        MYID["myID.uz<br/>Auth Provider"]
        SENTRY["Sentry<br/>Error Tracking"]
    end

    %% Client to Gateway
    WEB -->|HTTPS| NGINX
    CLIENT -->|HTTPS| NGINX
    MOBILE -->|HTTPS| NGINX

    %% Gateway to API
    NGINX -->|Proxy Pass| API
    NGINX -->|Static Files| WEB
    NGINX -->|Static Files| CLIENT

    %% Bot direct to API
    BOT -->|Internal HTTP| API
    TELEGRAM_API <-->|Webhook / Long Poll| BOT

    %% API to Data Layer
    API -->|TypeORM| PG
    API -->|ioredis / BullMQ| REDIS
    API -->|S3 SDK| MINIO

    %% API internal UIs
    API --- SWAGGER
    API --- BULLBOARD

    %% API to External
    API -->|Payment API| PAYME
    API -->|Payment API| CLICK
    API -->|Payment API| UZUM
    API -->|REST| ESKIZ
    API -->|REST| PLAYMOBILE
    API -->|Fiscal API| SOLIQ
    API -->|OAuth2 / OIDC| MYID
    API -->|DSN| SENTRY

    %% Monitoring connections
    PROM -->|Scrape /metrics| API
    PROM -->|Scrape| NODE_EXP
    PROM -->|Scrape| CADVISOR
    PROM -->|Scrape| PG_EXP
    PROM -->|Scrape| REDIS_EXP
    PROM -->|Alert Rules| ALERTMGR
    GRAFANA -->|Query| PROM
    GRAFANA -->|Query| LOKI
    PROMTAIL -->|Push Logs| LOKI
    ALERTMGR -->|Notify| TELEGRAM_API

    %% Styling
    classDef app fill:#4A90D9,stroke:#2C5F8A,color:#fff
    classDef infra fill:#50B83C,stroke:#2E7D20,color:#fff
    classDef external fill:#F5A623,stroke:#C47D0E,color:#fff
    classDef monitor fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef gateway fill:#E74C3C,stroke:#C0392B,color:#fff

    class WEB,CLIENT,MOBILE,BOT app
    class PG,REDIS,MINIO infra
    class PAYME,CLICK,UZUM,TELEGRAM_API,ESKIZ,PLAYMOBILE,SOLIQ,MYID,SENTRY external
    class PROM,GRAFANA,LOKI,PROMTAIL,ALERTMGR,NODE_EXP,CADVISOR,PG_EXP,REDIS_EXP monitor
    class NGINX gateway
```

---

### 2. Module Dependency Diagram

VendHub API содержит 60+ NestJS-модулей, организованных в функциональные группы. Диаграмма показывает зависимости между модульными группами.

```mermaid
flowchart TB
    subgraph Core["Core Modules"]
        AUTH["auth<br/>JWT + TOTP + Passport"]
        USERS["users"]
        ORGS["organizations<br/>Multi-tenant"]
        RBAC["rbac<br/>7 roles"]
        SECURITY["security<br/>Encryption + Events"]
    end

    subgraph Operations["Operations"]
        MACHINES["machines"]
        LOCATIONS["locations"]
        TASKS["tasks<br/>Photo Validation"]
        ROUTES["routes<br/>Optimization"]
        TRIPS["trips<br/>GPS Tracking"]
        MAINTENANCE["maintenance"]
        MACHINE_ACCESS["machine-access"]
        EQUIPMENT["equipment<br/>Spare Parts"]
        VEHICLES["vehicles"]
    end

    subgraph Inventory_Group["Inventory"]
        INVENTORY["inventory<br/>3-Level System"]
        WAREHOUSE["warehouse"]
        PRODUCTS["products<br/>Categories + Recipes"]
        MAT_REQ["material-requests"]
        OPEN_BAL["opening-balances"]
    end

    subgraph Finance["Finance"]
        TRANSACTIONS["transactions"]
        PAYMENTS["payments<br/>Payme, Click, Uzum"]
        ORDERS["orders"]
        BILLING["billing<br/>Invoicing"]
        RECONCILIATION["reconciliation<br/>HW vs TX vs Pay"]
        FISCAL["fiscal<br/>MultiKassa + OFD"]
        SALES_IMPORT["sales-import"]
    end

    subgraph Client_Facing["Client B2C"]
        CLIENT_MOD["client<br/>Orders + Wallet"]
        LOYALTY["loyalty<br/>Rewards"]
        QUESTS["quests<br/>Achievements"]
        REFERRALS["referrals"]
        FAVORITES["favorites"]
        PROMO["promo-codes"]
        PURCHASE_HIST["purchase-history"]
        RECOMMENDATIONS["recommendations"]
        TGPAY["telegram-payments<br/>Stars"]
    end

    subgraph Communication["Communication"]
        NOTIFICATIONS["notifications<br/>Push + SMS + Email"]
        TG_BOT["telegram-bot<br/>Telegraf"]
        WEBSOCKET["websocket<br/>Socket.IO"]
    end

    subgraph Analytics["Analytics"]
        REPORTS["reports"]
        ALERTS["alerts<br/>Rules + Triggers"]
        AUDIT["audit<br/>Full Trail"]
        MONITORING_MOD["monitoring<br/>Metrics"]
    end

    subgraph Support["Support"]
        COMPLAINTS["complaints<br/>QR + SLA"]
        INCIDENTS["incidents"]
        WORK_LOGS["work-logs<br/>Time Tracking"]
        OP_RATINGS["operator-ratings"]
        CONTRACTORS["contractors"]
    end

    subgraph Reference["Reference Data"]
        REFERENCES["references"]
        DIRECTORIES["directories<br/>EAV"]
        SETTINGS["settings"]
        IMPORT["import<br/>CSV + Excel"]
        STORAGE["storage<br/>S3 / MinIO"]
        GEO["geo<br/>Maps API"]
    end

    subgraph HR["HR"]
        EMPLOYEES["employees<br/>Attendance + Payroll"]
    end

    subgraph Infra_Modules["Infrastructure Modules"]
        HEALTH["health<br/>Liveness + Readiness"]
        INTEGRATIONS["integrations<br/>AI Configurator"]
        AI["ai<br/>Import + Analysis"]
        BULLBOARD_MOD["bull-board<br/>Queue UI"]
        WEBHOOKS["webhooks"]
    end

    %% Core dependencies
    AUTH --> USERS
    AUTH --> ORGS
    AUTH --> RBAC
    USERS --> ORGS
    RBAC --> USERS

    %% Operations depend on Core
    MACHINES --> ORGS
    MACHINES --> LOCATIONS
    TASKS --> MACHINES
    TASKS --> USERS
    ROUTES --> MACHINES
    ROUTES --> LOCATIONS
    TRIPS --> ROUTES
    TRIPS --> VEHICLES
    TRIPS --> USERS
    MAINTENANCE --> MACHINES
    MAINTENANCE --> EQUIPMENT
    MACHINE_ACCESS --> MACHINES
    MACHINE_ACCESS --> USERS

    %% Inventory depends on Core + Operations
    INVENTORY --> MACHINES
    INVENTORY --> WAREHOUSE
    INVENTORY --> PRODUCTS
    WAREHOUSE --> ORGS
    WAREHOUSE --> PRODUCTS
    MAT_REQ --> WAREHOUSE
    MAT_REQ --> USERS
    OPEN_BAL --> INVENTORY

    %% Finance depends on multiple layers
    TRANSACTIONS --> MACHINES
    TRANSACTIONS --> ORGS
    PAYMENTS --> TRANSACTIONS
    PAYMENTS --> ORDERS
    ORDERS --> MACHINES
    ORDERS --> PRODUCTS
    BILLING --> ORGS
    BILLING --> TRANSACTIONS
    RECONCILIATION --> TRANSACTIONS
    RECONCILIATION --> PAYMENTS
    FISCAL --> TRANSACTIONS
    SALES_IMPORT --> TRANSACTIONS

    %% Client-facing depends on Core + Inventory + Finance
    CLIENT_MOD --> ORDERS
    CLIENT_MOD --> PAYMENTS
    LOYALTY --> USERS
    LOYALTY --> TRANSACTIONS
    QUESTS --> USERS
    QUESTS --> LOYALTY
    REFERRALS --> USERS
    FAVORITES --> USERS
    FAVORITES --> MACHINES
    PROMO --> ORDERS
    PURCHASE_HIST --> ORDERS
    RECOMMENDATIONS --> PRODUCTS
    RECOMMENDATIONS --> PURCHASE_HIST
    TGPAY --> PAYMENTS
    TGPAY --> TG_BOT

    %% Communication connects everything
    NOTIFICATIONS --> USERS
    TG_BOT --> NOTIFICATIONS
    WEBSOCKET --> AUTH

    %% Analytics
    REPORTS --> TRANSACTIONS
    REPORTS --> INVENTORY
    REPORTS --> MACHINES
    ALERTS --> MACHINES
    ALERTS --> NOTIFICATIONS
    AUDIT --> AUTH
    MONITORING_MOD --> HEALTH

    %% Support
    COMPLAINTS --> MACHINES
    COMPLAINTS --> NOTIFICATIONS
    INCIDENTS --> MACHINES
    INCIDENTS --> MAINTENANCE
    WORK_LOGS --> USERS
    WORK_LOGS --> TASKS
    OP_RATINGS --> USERS
    OP_RATINGS --> TASKS
    CONTRACTORS --> ORGS

    %% HR
    EMPLOYEES --> ORGS
    EMPLOYEES --> USERS

    %% Reference
    IMPORT --> PRODUCTS
    IMPORT --> MACHINES
    STORAGE --> ORGS
    GEO --> LOCATIONS

    %% Infra
    AI --> IMPORT
    INTEGRATIONS --> WEBHOOKS
    BULLBOARD_MOD --> TASKS

    %% Styling
    classDef core fill:#E74C3C,stroke:#C0392B,color:#fff
    classDef ops fill:#3498DB,stroke:#2471A3,color:#fff
    classDef inv fill:#27AE60,stroke:#1E8449,color:#fff
    classDef fin fill:#F39C12,stroke:#D68910,color:#fff
    classDef cli fill:#8E44AD,stroke:#6C3483,color:#fff
    classDef comm fill:#1ABC9C,stroke:#148F77,color:#fff
    classDef analytics fill:#E67E22,stroke:#CA6F1E,color:#fff
    classDef support fill:#95A5A6,stroke:#717D7E,color:#fff
    classDef ref fill:#5DADE2,stroke:#2E86C1,color:#fff
    classDef hr fill:#EC7063,stroke:#CB4335,color:#fff
    classDef inframod fill:#566573,stroke:#2C3E50,color:#fff

    class AUTH,USERS,ORGS,RBAC,SECURITY core
    class MACHINES,LOCATIONS,TASKS,ROUTES,TRIPS,MAINTENANCE,MACHINE_ACCESS,EQUIPMENT,VEHICLES ops
    class INVENTORY,WAREHOUSE,PRODUCTS,MAT_REQ,OPEN_BAL inv
    class TRANSACTIONS,PAYMENTS,ORDERS,BILLING,RECONCILIATION,FISCAL,SALES_IMPORT fin
    class CLIENT_MOD,LOYALTY,QUESTS,REFERRALS,FAVORITES,PROMO,PURCHASE_HIST,RECOMMENDATIONS,TGPAY cli
    class NOTIFICATIONS,TG_BOT,WEBSOCKET comm
    class REPORTS,ALERTS,AUDIT,MONITORING_MOD analytics
    class COMPLAINTS,INCIDENTS,WORK_LOGS,OP_RATINGS,CONTRACTORS support
    class REFERENCES,DIRECTORIES,SETTINGS,IMPORT,STORAGE,GEO ref
    class EMPLOYEES hr
    class HEALTH,INTEGRATIONS,AI,BULLBOARD_MOD,WEBHOOKS inframod
```

---

### 3. Deployment Diagram

Диаграмма развертывания показывает все Docker-сервисы, их порты, volumes для персистентности и сетевые соединения.

```mermaid
flowchart TB
    subgraph DockerNetwork["vendhub-network (bridge)"]

        subgraph AppServices["Application Services"]
            API_SVC["vendhub-api<br/>NestJS :4000<br/>CPU: 2, RAM: 2G"]
            WEB_SVC["vendhub-web<br/>Next.js :3000<br/>CPU: 1, RAM: 1G"]
            CLIENT_SVC["vendhub-client<br/>Vite PWA :5173<br/>CPU: 1, RAM: 1G"]
            BOT_SVC["vendhub-bot<br/>Telegraf<br/>CPU: 0.5, RAM: 512M"]
        end

        subgraph DataServices["Data Services"]
            PG_SVC["vendhub-postgres<br/>PostgreSQL 16 :5432<br/>CPU: 2, RAM: 4G"]
            REDIS_SVC["vendhub-redis<br/>Redis 7 :6379<br/>CPU: 1, RAM: 2G"]
            MINIO_SVC["vendhub-minio<br/>MinIO :9000/:9001<br/>CPU: 1, RAM: 1G"]
        end

        subgraph ProxyServices["Proxy Layer"]
            NGINX_SVC["vendhub-nginx<br/>Nginx :80/:443<br/>CPU: 1, RAM: 512M"]
        end

        subgraph MonitoringServices["Monitoring Services"]
            PROM_SVC["vendhub-prometheus<br/>:9090<br/>Retention: 30d / 10GB"]
            GRAFANA_SVC["vendhub-grafana<br/>:3001"]
            LOKI_SVC["vendhub-loki<br/>:3100"]
            PROMTAIL_SVC["vendhub-promtail"]
            ALERT_SVC["vendhub-alertmanager<br/>:9093"]
            NODEEXP_SVC["node-exporter :9100"]
            CADV_SVC["cAdvisor :8080"]
            PGEXP_SVC["postgres-exporter :9187"]
            REDISEXP_SVC["redis-exporter :9121"]
        end

        subgraph DevTools["Dev Tools (profile: dev)"]
            ADMINER_SVC["vendhub-adminer<br/>:8080"]
            REDISCMD_SVC["redis-commander<br/>:8081"]
            BULL_SVC["vendhub-bull-board<br/>:3030"]
        end
    end

    subgraph Volumes["Persistent Volumes"]
        VOL_PG["postgres_data"]
        VOL_REDIS["redis_data"]
        VOL_MINIO["minio_data"]
        VOL_PROM["prometheus_data"]
        VOL_GRAF["grafana_data"]
        VOL_LOKI["loki_data"]
        VOL_NGINX["nginx_logs / nginx_cache"]
        VOL_ALERT["alertmanager_data"]
    end

    %% Dependencies
    NGINX_SVC --> API_SVC
    NGINX_SVC --> WEB_SVC
    NGINX_SVC --> CLIENT_SVC

    API_SVC -->|depends_on healthy| PG_SVC
    API_SVC -->|depends_on healthy| REDIS_SVC
    API_SVC --> MINIO_SVC
    BOT_SVC --> API_SVC
    BOT_SVC --> REDIS_SVC
    WEB_SVC --> API_SVC
    CLIENT_SVC --> API_SVC

    %% Monitoring dependencies
    PROM_SVC --> API_SVC
    PROM_SVC --> NODEEXP_SVC
    PROM_SVC --> CADV_SVC
    PROM_SVC --> PGEXP_SVC
    PROM_SVC --> REDISEXP_SVC
    PROM_SVC --> ALERT_SVC
    GRAFANA_SVC --> PROM_SVC
    GRAFANA_SVC --> LOKI_SVC
    PROMTAIL_SVC --> LOKI_SVC
    PGEXP_SVC --> PG_SVC
    REDISEXP_SVC --> REDIS_SVC

    %% Dev tools
    ADMINER_SVC --> PG_SVC
    REDISCMD_SVC --> REDIS_SVC
    BULL_SVC --> REDIS_SVC

    %% Volume mounts
    PG_SVC -.- VOL_PG
    REDIS_SVC -.- VOL_REDIS
    MINIO_SVC -.- VOL_MINIO
    PROM_SVC -.- VOL_PROM
    GRAFANA_SVC -.- VOL_GRAF
    LOKI_SVC -.- VOL_LOKI
    NGINX_SVC -.- VOL_NGINX
    ALERT_SVC -.- VOL_ALERT

    %% Styling
    classDef app fill:#4A90D9,stroke:#2C5F8A,color:#fff
    classDef data fill:#27AE60,stroke:#1E8449,color:#fff
    classDef proxy fill:#E74C3C,stroke:#C0392B,color:#fff
    classDef monitor fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef dev fill:#95A5A6,stroke:#717D7E,color:#fff
    classDef vol fill:#F5F5F5,stroke:#CCCCCC,color:#333

    class API_SVC,WEB_SVC,CLIENT_SVC,BOT_SVC app
    class PG_SVC,REDIS_SVC,MINIO_SVC data
    class NGINX_SVC proxy
    class PROM_SVC,GRAFANA_SVC,LOKI_SVC,PROMTAIL_SVC,ALERT_SVC,NODEEXP_SVC,CADV_SVC,PGEXP_SVC,REDISEXP_SVC monitor
    class ADMINER_SVC,REDISCMD_SVC,BULL_SVC dev
    class VOL_PG,VOL_REDIS,VOL_MINIO,VOL_PROM,VOL_GRAF,VOL_LOKI,VOL_NGINX,VOL_ALERT vol
```

---


---

## ERD (Entity Relationship Diagrams)

### ERD 1: Core (Organizations, Users, RBAC)

Диаграмма показывает ядро системы: организационную иерархию, систему пользователей с 7 ролями, двухфакторную аутентификацию и управление сессиями.

```mermaid
erDiagram
    organizations {
        uuid id PK
        varchar name
        varchar slug UK
        enum type "headquarters/franchise/branch/operator/partner"
        enum status "active/pending/suspended/terminated"
        uuid parent_id FK
        enum subscription_tier "free/starter/professional/enterprise"
        varchar inn UK
        varchar email
        varchar phone
        jsonb settings
        jsonb limits
    }
    users {
        uuid id PK
        varchar email UK
        varchar username UK
        varchar password
        varchar first_name
        varchar last_name
        enum role "owner/admin/manager/operator/warehouse/accountant/viewer"
        enum status "active/inactive/suspended/pending/rejected"
        uuid organization_id FK
        varchar telegram_id UK
        boolean two_factor_enabled
        enum loyalty_level "bronze/silver/gold/platinum"
        int points_balance
        int login_attempts
        timestamp locked_until
    }
    user_sessions {
        uuid id PK
        uuid user_id FK
        varchar refresh_token_hash
        jsonb device_info
        varchar ip_address
        timestamp expires_at
        boolean is_revoked
    }
    two_factor_auth {
        uuid id PK
        uuid user_id FK
        varchar totp_secret
        varchar sms_phone
        text backup_codes
        int failed_attempts
    }
    roles {
        uuid id PK
        varchar name
        uuid organization_id FK
        int level
        boolean is_system
    }
    permissions {
        uuid id PK
        varchar name UK
        varchar resource
        varchar action
    }
    organization_contracts {
        uuid id PK
        uuid organization_id FK
        varchar contract_number UK
        enum status "draft/active/suspended/expired/terminated"
        decimal commission_rate
        date start_date
        date end_date
    }
    organization_invitations {
        uuid id PK
        uuid organization_id FK
        varchar email
        varchar role
        varchar token UK
        enum status "pending/accepted/declined/expired"
        timestamp expires_at
    }
    organizations ||--o{ organizations : "parent-children"
    organizations ||--o{ users : "has"
    organizations ||--o{ organization_contracts : "has"
    organizations ||--o{ organization_invitations : "has"
    organizations ||--o{ roles : "has"
    users ||--o{ user_sessions : "has"
    users ||--o| two_factor_auth : "has"
    roles }o--o{ permissions : "role_permissions"
    users }o--o{ roles : "user_roles"
```

### ERD 2: Machines and Locations

Диаграмма охватывает управление вендинговыми автоматами и точками размещения. Автоматы привязаны к локациям через зоны, имеют слоты для продуктов и журнал ошибок.

```mermaid
erDiagram
    machines {
        uuid id PK
        uuid organization_id FK
        varchar machine_number UK
        varchar name
        varchar serial_number UK
        enum type "coffee/snack/drink/combo/fresh/ice_cream/water"
        enum status "active/low_stock/error/maintenance/offline/disabled"
        enum connection_status "online/offline/unstable"
        uuid location_id FK
        uuid assigned_operator_id FK
        jsonb telemetry
        decimal current_cash_amount
        decimal total_revenue
        int max_product_slots
        timestamp last_ping_at
    }
    machine_slots {
        uuid id PK
        uuid machine_id FK
        varchar slot_number
        uuid product_id FK
        int capacity
        int current_quantity
        decimal price
        boolean is_active
        int total_sold
    }
    machine_components {
        uuid id PK
        uuid machine_id FK
        enum component_type "hopper/grinder/brew_unit/mixer/pump/heater"
        varchar serial_number
        enum status "installed/removed/in_repair/disposed"
        decimal purchase_price
        date warranty_until
    }
    machine_error_logs {
        uuid id PK
        uuid machine_id FK
        varchar error_code
        text message
        enum severity "info/warning/error/critical"
        timestamp occurred_at
        timestamp resolved_at
    }
    machine_location_history {
        uuid id PK
        uuid machine_id FK
        uuid from_location_id FK
        uuid to_location_id FK
        timestamp moved_at
        enum reason "installation/relocation/removal/maintenance"
    }
    locations {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar code UK
        enum type "shopping_center/university/hospital/metro_station"
        enum status "prospecting/contract_pending/active/suspended/closing/closed"
        decimal latitude
        decimal longitude
        varchar city
        decimal monthly_rent
    }
    location_zones {
        uuid id PK
        uuid location_id FK
        varchar name
        enum type "entrance/lobby/food_court/hallway"
        uuid machine_id FK
        boolean is_occupied
    }
    location_contracts {
        uuid id PK
        uuid location_id FK
        uuid organization_id FK
        varchar contract_number UK
        enum type "rent/revenue_share/hybrid/free"
        enum status "draft/pending_approval/active/expired/terminated"
        date start_date
        date end_date
        decimal monthly_amount
        decimal revenue_share_percent
    }
    location_contract_payments {
        uuid id PK
        uuid contract_id FK
        date period_start
        date period_end
        decimal total_amount
        decimal paid_amount
        enum status "pending/partial/paid/overdue"
        date due_date
    }
    locations ||--o{ location_zones : "has"
    locations ||--o{ location_contracts : "has"
    location_contracts ||--o{ location_contract_payments : "has"
    locations ||--o{ machines : "hosts"
    machines ||--o{ machine_slots : "has"
    machines ||--o{ machine_components : "has"
    machines ||--o{ machine_error_logs : "has"
    machines ||--o{ machine_location_history : "has"
    location_zones ||--o| machines : "holds"
```

### ERD 3: Products and Recipes

Каталог продуктов и рецептурная система. Продукты могут быть готовыми товарами или ингредиентами. Рецепты поддерживают версионирование, партии ингредиентов обеспечивают FIFO-учет.

```mermaid
erDiagram
    products {
        uuid id PK
        uuid organization_id FK
        varchar sku UK
        varchar name
        enum category "coffee_beans/tea/milk/sugar/hot_drinks/cold_drinks/snacks/cups"
        enum status "active/inactive/discontinued"
        enum unit_of_measure "g/kg/ml/l/pcs/pack/box/portion"
        boolean is_ingredient
        decimal purchase_price
        decimal selling_price
        decimal vat_rate
        varchar ikpu_code
        decimal min_stock_level
        uuid default_supplier_id FK
    }
    recipes {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        varchar name
        enum type_code "primary/alternative/promotional"
        decimal total_cost
        int preparation_time_seconds
        int version
        boolean is_active
    }
    recipe_ingredients {
        uuid id PK
        uuid recipe_id FK
        uuid ingredient_id FK
        decimal quantity
        enum unit_of_measure "g/kg/ml/l/pcs"
        boolean is_optional
        int sort_order
    }
    recipe_snapshots {
        uuid id PK
        uuid recipe_id FK
        int version
        jsonb snapshot
        timestamp valid_from
        timestamp valid_to
    }
    ingredient_batches {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        varchar batch_number
        decimal quantity
        decimal remaining_quantity
        decimal purchase_price
        date expiry_date
        enum status "in_stock/depleted/expired/reserved"
        uuid supplier_id FK
    }
    suppliers {
        uuid id PK
        uuid organization_id FK
        varchar code UK
        varchar name
        varchar phone
        varchar email
        varchar tax_id
        int payment_term_days
        boolean is_active
    }
    product_price_history {
        uuid id PK
        uuid product_id FK
        decimal purchase_price
        decimal selling_price
        timestamp effective_from
        timestamp effective_to
    }
    products ||--o{ recipes : "has"
    recipes ||--o{ recipe_ingredients : "contains"
    recipe_ingredients }o--|| products : "uses ingredient"
    recipes ||--o{ recipe_snapshots : "versioned as"
    products ||--o{ ingredient_batches : "tracked in"
    suppliers ||--o{ ingredient_batches : "supplies"
    products ||--o{ product_price_history : "price history"
```

### ERD 4: Inventory (3-Level System)

Трехуровневая система инвентаризации: склад, оператор, автомат. Движения товаров отслеживаются через inventory_movements. Система резервирования предотвращает конфликты.

```mermaid
erDiagram
    warehouse_inventory {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        decimal current_quantity
        decimal reserved_quantity
        decimal min_stock_level
        decimal avg_purchase_price
        timestamp last_restocked_at
    }
    operator_inventory {
        uuid id PK
        uuid organization_id FK
        uuid operator_id FK
        uuid product_id FK
        decimal current_quantity
        decimal reserved_quantity
        timestamp last_received_at
    }
    machine_inventory {
        uuid id PK
        uuid organization_id FK
        uuid machine_id FK
        uuid product_id FK
        decimal current_quantity
        decimal min_stock_level
        decimal max_capacity
        decimal selling_price
        int total_sold
        timestamp last_refilled_at
    }
    inventory_movements {
        uuid id PK
        uuid organization_id FK
        enum movement_type "warehouse_in/warehouse_out/warehouse_to_operator/operator_to_machine/machine_sale/adjustment/write_off"
        uuid product_id FK
        decimal quantity
        uuid operator_id FK
        uuid machine_id FK
        uuid task_id FK
        decimal unit_cost
        timestamp operation_date
    }
    inventory_reservations {
        uuid id PK
        uuid organization_id FK
        uuid task_id FK
        uuid product_id FK
        decimal quantity_reserved
        decimal quantity_fulfilled
        enum status "pending/confirmed/fulfilled/cancelled/expired"
        enum inventory_level "warehouse/operator"
        timestamp expires_at
    }
    inventory_adjustments {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        enum adjustment_type "stocktake/correction/damage/expiry/theft"
        enum inventory_level "warehouse/operator/machine"
        decimal system_quantity
        decimal actual_quantity
        decimal difference
        boolean is_approved
    }
    inventory_counts {
        uuid id PK
        uuid organization_id FK
        enum inventory_level "warehouse/operator/machine"
        enum status "draft/in_progress/completed/cancelled"
        int total_items_counted
        int total_differences
    }
    warehouses {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar code UK
        enum type "main/regional/transit/virtual"
        uuid manager_id FK
        boolean is_active
    }
    warehouses ||--o{ warehouse_inventory : "stores"
    warehouse_inventory ||--o{ inventory_movements : "tracked by"
    operator_inventory ||--o{ inventory_movements : "tracked by"
    machine_inventory ||--o{ inventory_movements : "tracked by"
    inventory_reservations }o--|| inventory_movements : "fulfilled via"
    inventory_counts ||--o{ inventory_adjustments : "generates"
```

### ERD 5: Tasks, Routes and Trips

Система управления задачами, маршрутизация операторов и GPS-трекинг поездок. Задачи связаны с инвентарём и фотофиксацией. Маршруты оптимизируют посещения автоматов.

```mermaid
erDiagram
    tasks {
        uuid id PK
        uuid organization_id FK
        varchar task_number UK
        enum type_code "refill/collection/cleaning/repair/install/removal/audit"
        enum status "pending/assigned/in_progress/completed/rejected/postponed/cancelled"
        enum priority "low/normal/high/urgent"
        uuid machine_id FK
        uuid assigned_to_user_id FK
        timestamp due_date
        decimal expected_cash_amount
        decimal actual_cash_amount
        boolean has_photo_before
        boolean has_photo_after
        timestamp started_at
        timestamp completed_at
    }
    task_items {
        uuid id PK
        uuid task_id FK
        uuid product_id FK
        decimal planned_quantity
        decimal actual_quantity
    }
    task_comments {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        text comment
        boolean is_internal
    }
    task_components {
        uuid id PK
        uuid task_id FK
        uuid component_id FK
        enum role "old/new/target"
    }
    task_photos {
        uuid id PK
        uuid task_id FK
        enum category "before/after/during"
        varchar url
        decimal latitude
        decimal longitude
    }
    routes {
        uuid id PK
        uuid organization_id FK
        uuid operator_id FK
        varchar name
        enum type "refill/collection/maintenance/mixed"
        enum status "planned/in_progress/completed/cancelled"
        date planned_date
        decimal estimated_distance_km
    }
    route_stops {
        uuid id PK
        uuid route_id FK
        uuid machine_id FK
        int sequence
        uuid task_id FK
        enum status "pending/arrived/in_progress/completed/skipped"
    }
    trips {
        uuid id PK
        uuid organization_id FK
        uuid employee_id FK
        uuid vehicle_id FK
        enum status "active/completed/cancelled"
        timestamp started_at
        timestamp ended_at
        int calculated_distance_meters
        int total_stops
    }
    trip_stops {
        uuid id PK
        uuid trip_id FK
        uuid machine_id FK
        decimal latitude
        decimal longitude
        timestamp started_at
        timestamp ended_at
        int duration_seconds
    }
    trip_points {
        uuid id PK
        uuid trip_id FK
        decimal latitude
        decimal longitude
        timestamp recorded_at
        decimal speed_mps
    }
    tasks ||--o{ task_items : "contains"
    tasks ||--o{ task_comments : "has"
    tasks ||--o{ task_components : "involves"
    tasks ||--o{ task_photos : "documented by"
    routes ||--o{ route_stops : "has"
    route_stops }o--o| tasks : "linked to"
    trips ||--o{ trip_stops : "stops at"
    trips ||--o{ trip_points : "tracked by"
```

### ERD 6: Financial (Transactions, Payments, Orders)

Финансовый блок: транзакции с фискализацией через OFD/Soliq.uz, платежи через Payme/Click/Uzum, заказы клиентов, инкассация наличных, комиссионные расчеты и ежедневные сводки.

```mermaid
erDiagram
    transactions {
        uuid id PK
        uuid organization_id FK
        uuid machine_id FK
        varchar transaction_number UK
        enum type "sale/refund/collection/deposit/withdrawal/adjustment/commission"
        enum status "pending/processing/completed/failed/refunded"
        enum payment_method "cash/card/payme/click/uzcard/humo/qr/bonus"
        decimal amount
        decimal vat_amount
        decimal total_amount
        varchar fiscal_sign
        varchar fiscal_receipt_number
        boolean is_fiscalized
        timestamp transaction_date
    }
    transaction_items {
        uuid id PK
        uuid transaction_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal vat_rate
        decimal total_amount
        varchar ikpu_code
    }
    collection_records {
        uuid id PK
        uuid organization_id FK
        uuid machine_id FK
        uuid task_id FK
        decimal cash_amount
        decimal coin_amount
        decimal expected_cash_amount
        decimal difference
        decimal difference_percent
        boolean is_verified
        timestamp collected_at
    }
    payment_transactions {
        uuid id PK
        uuid organization_id FK
        enum provider "payme/click/uzum/telegram_stars/cash/wallet"
        varchar provider_tx_id UK
        decimal amount
        enum status "pending/processing/completed/failed/refunded"
        uuid order_id FK
        uuid machine_id FK
        jsonb raw_request
        jsonb raw_response
    }
    payment_refunds {
        uuid id PK
        uuid payment_transaction_id FK
        decimal amount
        enum reason "customer_request/machine_error/product_unavailable/duplicate"
        enum status "pending/processing/completed/failed"
        varchar provider_refund_id
    }
    orders {
        uuid id PK
        uuid organization_id FK
        varchar order_number UK
        uuid user_id FK
        uuid machine_id FK
        enum status "pending/confirmed/preparing/ready/completed/cancelled/refunded"
        enum payment_status "pending/paid/failed/refunded"
        enum payment_method "cash/click/payme/uzum/telegram/bonus"
        decimal subtotal_amount
        decimal discount_amount
        decimal total_amount
        varchar promo_code
        int points_earned
        int points_used
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal total_price
        jsonb customizations
    }
    commissions {
        uuid id PK
        uuid organization_id FK
        uuid contract_id FK
        date period_start
        date period_end
        decimal base_amount
        decimal commission_rate
        decimal commission_amount
        enum status "pending/calculated/paid"
    }
    daily_summaries {
        uuid id PK
        uuid organization_id FK
        uuid machine_id FK
        date summary_date
        int sales_count
        decimal sales_amount
        decimal refunds_amount
        decimal collections_amount
        decimal net_amount
    }
    transactions ||--o{ transaction_items : "contains"
    payment_transactions ||--o{ payment_refunds : "refunded via"
    orders ||--o{ order_items : "contains"
    orders ||--o{ payment_transactions : "paid via"
    transactions }o--o| collection_records : "linked to"
```


---

## Flowcharts

### Flowchart 1: User Authentication (Login)

Процесс аутентификации: проверка учетных данных, контроль блокировки аккаунта, двухфакторная аутентификация через TOTP/SMS, выдача JWT + Refresh Token.

```mermaid
flowchart TD
    A[User enters email and password] --> B{Validate email format}
    B -->|Invalid| C[Return 400: Invalid email]
    B -->|Valid| D[Find user by email]
    D -->|Not found| E[Return 401: Invalid credentials]
    D -->|Found| G{Account locked?}
    G -->|Yes| H[Return 423: Account locked]
    G -->|No| I{Verify password hash}
    I -->|Mismatch| J[Increment login_attempts]
    J --> K{login_attempts >= 5?}
    K -->|Yes| L[Lock account 30 min]
    L --> N[Return 401: Account locked]
    K -->|No| E
    I -->|Match| P{Check user status}
    P -->|suspended| Q[Return 403: Suspended]
    P -->|inactive| R[Return 403: Inactive]
    P -->|pending| S[Return 403: Awaiting approval]
    P -->|active| U{2FA enabled?}
    U -->|No| V[Reset login_attempts]
    V --> W[Generate JWT access token 15min]
    W --> X[Generate refresh token 7d]
    X --> Y[Create UserSession record]
    Y --> AB[Return tokens and user data]
    U -->|Yes| AC{2FA method?}
    AC -->|TOTP| AD[Request TOTP code]
    AC -->|SMS| AE[Send SMS code]
    AE --> AF[Request SMS code]
    AD --> AG{Verify 2FA code}
    AF --> AG
    AG -->|Invalid| AH[Increment 2FA failed_attempts]
    AH --> AI{failed_attempts >= 5?}
    AI -->|Yes| AK[Return 401: 2FA locked]
    AI -->|No| AL[Return 401: Invalid code]
    AG -->|Valid| V
```

### Flowchart 2: Order Processing (Customer Purchase)

Полный цикл покупки: выбор продукта, обработка оплаты через Payme/Click/Uzum/наличные, выдача товара, фискализация через OFD, начисление бонусов.

```mermaid
flowchart TD
    A[Customer selects product] --> B{Machine status?}
    B -->|offline/disabled| C[Display: Unavailable]
    B -->|active| E{Product in stock?}
    E -->|No| F[Display: Out of stock]
    E -->|Yes| G[Display price]
    G --> H[Customer confirms]
    H --> I[Create Order PENDING]
    I --> J{Payment method?}
    J -->|Cash| K[Accept cash via validator]
    J -->|Payme| L[Create payment_transaction]
    J -->|Click| M[Create payment_transaction]
    J -->|Uzum| N[Create payment_transaction]
    K --> P{Cash sufficient?}
    P -->|No| Q[Insert more cash]
    Q --> K
    P -->|Yes| S[Payment completed]
    L --> T[Send API to provider]
    M --> T
    N --> T
    T --> U{Payment callback?}
    U -->|Timeout| V[Cancel order]
    U -->|Failed| X[Payment failed]
    X --> Z[Display: Payment failed]
    U -->|Success| S
    S --> AA[Order CONFIRMED]
    AA --> AC[Dispense product]
    AC -->|Error| AE[Cancel + refund]
    AE --> AG[Log error + notify operator]
    AC -->|Success| AI[Deduct machine_inventory]
    AI --> AJ[Create inventory_movement machine_sale]
    AJ --> AK[Create Transaction sale]
    AK --> AL{Fiscalize via OFD}
    AL -->|Success| AN[Save fiscal_sign]
    AL -->|Error| AM[Queue for retry]
    AN --> AP{Loyalty account?}
    AM --> AP
    AP -->|Yes| AQ[Award points]
    AP -->|No| AU[Order COMPLETED]
    AQ --> AU
    AU --> AW[Display receipt]
```

### Flowchart 3: Task Lifecycle (Refill)

Жизненный цикл задачи на заправку: от создания менеджером до подтверждения. Включает резервирование инвентаря, передачу оператору, фотофиксацию до/после, возможность отклонения.

```mermaid
flowchart TD
    A[Manager creates refill task] --> B[Check machine_inventory levels]
    B --> C[Calculate needed quantities]
    C --> D[Create task PENDING]
    D --> E[Create task_items]
    E --> F{Warehouse stock sufficient?}
    F -->|No| G[Flag shortages + notify]
    F -->|Yes| I[Create inventory_reservations]
    I --> J[Update reserved_quantity]
    J --> K[Assign to operator]
    K --> L[Task status ASSIGNED]
    L --> M[Notify operator]
    M --> N{Operator accepts?}
    N -->|Postponed| O[Task POSTPONED]
    O --> Q[Manager reassigns]
    Q --> K
    N -->|Accepted| R[Task IN_PROGRESS]
    R --> S[Operator picks from warehouse]
    S --> T[Movement: warehouse_to_operator]
    T --> V[Add to operator_inventory]
    V --> X[Operator travels to machine]
    X --> Y[Arrives at machine]
    Y --> AA[Take BEFORE photo]
    AA --> AC[Load products into machine]
    AC --> AE[Record actual quantities]
    AE --> AF[Movement: operator_to_machine]
    AF --> AH[Add to machine_inventory]
    AH --> AI[Take AFTER photo]
    AI --> AL[Submit completion]
    AL --> AM[Task COMPLETED]
    AM --> AO{Manager reviews}
    AO -->|Approve| AP[Task approved]
    AO -->|Reject| AS[Task REJECTED]
    AS --> AU[Rollback inventory movements]
    AU --> AX[Notify operator]
```

### Flowchart 4: Inventory Movement (3-Level Flow)

Полный цикл движения товаров через 3 уровня: склад -> оператор -> автомат -> продажа. Включает обратные потоки, корректировки и списания.

```mermaid
flowchart TD
    A[Purchase arrives at warehouse] --> B[Movement: warehouse_in]
    B --> C[Update warehouse_inventory]
    C --> D[Create ingredient_batch]
    D --> F{Machines need refill?}
    F -->|Yes| G[Auto-create refill task]
    F -->|No| H[Wait for trigger]
    G --> I[Reserve inventory]
    I --> K[Operator picks up]
    K --> M[Movement: warehouse_to_operator]
    M --> N[Deduct warehouse_inventory]
    N --> P[Add to operator_inventory]
    P --> Q[Operator travels to machine]
    Q --> R[Operator loads machine]
    R --> S[Movement: operator_to_machine]
    S --> T[Deduct operator_inventory]
    T --> U[Add to machine_inventory]
    U --> W{Customer buys}
    W --> X[Movement: machine_sale]
    X --> Y[Deduct machine_inventory]

    AA[Surplus in machine] --> AB[Operator removes]
    AB --> AC[Movement: machine_to_operator]
    AC --> AD[Add to operator_inventory]
    AD --> AE[Return to warehouse]
    AE --> AF[Movement: operator_to_warehouse]
    AF --> AG[Add to warehouse_inventory]

    AH[Inventory count] --> AI[Count actual quantities]
    AI --> AK{Match?}
    AK -->|Yes| AL[Verified]
    AK -->|No| AM[Create adjustment]
    AM --> AO[Movement: adjustment]
    AO --> AP[Update quantity]

    AQ[Expired/damaged] --> AR[Create adjustment]
    AR --> AS[Movement: write_off]
    AS --> AT[Deduct inventory]
```

### Flowchart 5: Payment Processing (Payme/Click)

Обработка электронных платежей: валидация webhook-подписей, обновление статусов, фискализация, обработка возвратов.

```mermaid
flowchart TD
    A[Order created PENDING] --> B{Select provider}
    B -->|Payme| C[payment_transaction provider=payme]
    B -->|Click| D[payment_transaction provider=click]
    B -->|Uzum| E[payment_transaction provider=uzum]
    C --> F[Generate checkout URL]
    D --> G[Generate checkout URL]
    E --> H[Generate checkout URL]
    F --> I[Redirect to provider]
    G --> I
    H --> I
    I --> J[Customer completes payment]
    J --> K[Provider sends webhook]
    K --> L{Validate signature}
    L -->|Invalid| M[Return 403 + log security event]
    L -->|Valid| O{Callback type?}
    O -->|CheckPerformTransaction| P[Verify order + amount]
    P -->|Valid| PB[Return OK]
    O -->|CreateTransaction| Q[Status PROCESSING]
    Q --> QA[Save provider_tx_id]
    O -->|PerformTransaction| R[Finalize payment]
    O -->|Click Prepare| S[Verify order]
    S --> SA[Status PROCESSING]
    O -->|Click Complete| R
    R --> T[Status COMPLETED]
    T --> V[Order payment_status PAID]
    V --> W[Order status CONFIRMED]
    W --> X[Create Transaction sale]
    X --> Y{Fiscalize}
    Y -->|Success| ZB[Save fiscal_sign]
    Y -->|Error| ZD[Queue retry]
    ZB --> ZE[Notify: Payment successful]
    ZD --> ZE

    AA[Refund requested] --> AB[Create payment_refund PENDING]
    AB --> AC{Call provider refund API}
    AC --> AD[Send refund request]
    AD --> AF{Response?}
    AF -->|Success| AG[Refund COMPLETED]
    AG --> AI[payment_transaction REFUNDED]
    AI --> AK[Order REFUNDED]
    AK --> AL[Notify customer]
    AF -->|Failed| AM[Refund FAILED]
    AM --> AN[Log error + notify admin]
```

### Flowchart 6: Cash Collection Process

Инкассация наличных: от обнаружения порога до верификации. Система сравнивает ожидаемые суммы с фактическими, выявляет расхождения более 5%.

```mermaid
flowchart TD
    A[Monitor machine cash amount] --> B{Cash >= 90% capacity?}
    B -->|No| C[Continue monitoring]
    B -->|Yes| D[Create collection task]
    D --> E[Set expected_cash_amount]
    E --> F[Assign to operator]
    F --> G[Notify via Telegram/push]
    G --> H[Operator travels to machine]
    H --> I[Arrive at machine]
    I --> J[Record GPS coordinates]
    J --> K[Read counter_before]
    K --> L[Open cash box]
    L --> M[Count bills]
    M --> N[Count coins]
    N --> O[Record actual amounts]
    O --> P[Read counter_after]
    P --> Q[Take photos]
    Q --> S[Close cash box]
    S --> T[Submit collection data]
    T --> U[Create collection_record]
    U --> V[Calculate difference]
    V --> X{Difference > 5%?}
    X -->|Yes| Y[Flag for review]
    Y --> AA[Alert manager]
    AA --> AB{Manager investigates}
    AB -->|Explained| AC[Add notes]
    AC --> AD[Set is_verified=true]
    AB -->|Suspicious| AE[Create incident]
    AE --> AF[Escalate to admin]
    X -->|No| AG[Auto-verify]
    AG --> AD
    AD --> AH[Create Transaction collection]
    AH --> AI[Reset machine cash to 0]
    AI --> AJ[Task COMPLETED]
    AJ --> AK[Update daily_summary]
```

### Flowchart 7: Maintenance Request Workflow

Обслуживание автомата: от обнаружения проблемы до верификации. Поддерживает ожидание запчастей, учет работ и расчет простоя.

```mermaid
flowchart TD
    A{Issue source?}
    A -->|Error log| B[Critical error detected]
    A -->|Telemetry| C[Abnormal values]
    A -->|Manual report| D[Operator reports]
    A -->|Scheduled| E[Maintenance schedule]
    B --> F[Create request DRAFT]
    C --> F
    D --> F
    E --> F
    F --> G[Set type and priority]
    G --> H[Record downtime_start]
    H --> I[Submit]
    I --> J[Status SUBMITTED]
    J --> K{Manager reviews}
    K -->|Reject| L[REJECTED]
    L --> LC{Revise?}
    LC -->|Yes| F
    LC -->|No| LE[Closed]
    K -->|Approve| M[APPROVED]
    M --> O[Schedule date]
    O --> P[SCHEDULED]
    P --> Q[Assign technician]
    Q --> S[Technician starts]
    S --> T[IN_PROGRESS]
    T --> U[Take before photos]
    U --> V[Log work]
    V --> W{Parts needed?}
    W -->|Yes| X[AWAITING_PARTS]
    X --> Z[Order parts]
    Z --> ZA{Received?}
    ZA -->|No| ZB[Monitor delivery]
    ZB --> ZA
    ZA -->|Yes| ZD[IN_PROGRESS]
    ZD --> V
    W -->|No| AA[Continue work]
    AA --> AB[Install/replace parts]
    AB --> AD[Log hours and costs]
    AD --> AE[Calculate total_cost]
    AE --> AF[Take after photos]
    AF --> AH[COMPLETED]
    AH --> AI[Record downtime_end]
    AI --> AK{Manager verifies}
    AK -->|Issues| AL[Return to IN_PROGRESS]
    AL --> V
    AK -->|Verified| AM[VERIFIED]
    AM --> AO[Machine status active]
    AO --> AQ[Notification sent]
```

### Flowchart 8: Location Lifecycle

Жизненный цикл локации от первого контакта до закрытия. Включает переговоры, подписание контракта, установку автоматов и продление/расторжение.

```mermaid
flowchart TD
    A[Sales rep identifies location] --> B[Create location PROSPECTING]
    B --> C[Record details and coordinates]
    C --> F[Schedule site visit]
    F --> G[Conduct evaluation]
    G --> I[Calculate scores]
    I --> J{Worth pursuing?}
    J -->|No| K[Status CLOSED]
    J -->|Yes| L[Begin negotiation]
    L --> N[Discuss terms]
    N --> O[Create contract DRAFT]
    O --> R[Status CONTRACT_PENDING]
    R --> S[Submit for approval]
    S --> U{Approved?}
    U -->|No| V[Reject]
    V --> L
    U -->|Yes| W[Contract ACTIVE]
    W --> Y[Location ACTIVE]
    Y --> AB[Plan machine installation]
    AB --> AC[Create install tasks]
    AC --> AD[Install machines in zones]
    AD --> AG[Begin operations]
    AG --> AH[Create periodic payments]
    AH --> AI{Contract expiring?}
    AI -->|Expiring| AK[Notify manager]
    AK --> AL{Renew or close?}
    AL -->|Renew| AM[Create new contract]
    AM --> AI
    AL -->|Close| AP[Status CLOSING]
    AP --> AR[Create removal tasks]
    AR --> AS[Remove machines]
    AS --> AV[Settle final payments]
    AV --> AX[Contract TERMINATED]
    AX --> AY[Location CLOSED]
```


---

## UML Diagrams

### A) Use Case Diagram

Диаграмма показывает 9 акторов (7 внутренних ролей + 2 внешних) и их use cases в соответствии с RBAC-моделью VendHub OS.

```mermaid
flowchart LR
    subgraph Actors
        Owner([Owner])
        Admin([Admin])
        Manager([Manager])
        Operator([Operator])
        Warehouse([Warehouse])
        Accountant([Accountant])
        Viewer([Viewer])
        Client([Client])
        TelegramBot([Telegram Bot])
    end

    subgraph UC_Owner["Owner Use Cases"]
        O1[Manage Organizations]
        O2[Manage Subscriptions]
        O3[View All Reports]
        O4[Manage API Keys]
    end

    subgraph UC_Admin["Admin Use Cases"]
        A1[Manage Users]
        A2[Manage Machines]
        A3[Manage Locations]
        A4[Manage Contracts]
        A5[View Reports]
        A6[Manage Settings]
        A7[Approve Tasks]
    end

    subgraph UC_Manager["Manager Use Cases"]
        M1[Create Tasks]
        M2[Assign Tasks]
        M3[Approve Completion]
        M4[View Reports]
        M5[Manage Routes]
        M6[Manage Inventory]
    end

    subgraph UC_Operator["Operator Use Cases"]
        OP1[Execute Tasks]
        OP2[Take Photos]
        OP3[Report Issues]
        OP4[View Assigned Tasks]
    end

    subgraph UC_Warehouse["Warehouse Use Cases"]
        W1[Manage Warehouse Stock]
        W2[Process Movements]
        W3[Conduct Stocktakes]
        W4[Manage Suppliers]
    end

    subgraph UC_Accountant["Accountant Use Cases"]
        AC1[Financial Reports]
        AC2[Manage Commissions]
        AC3[Reconciliation]
        AC4[Manage Payments]
        AC5[Fiscal Reports]
    end

    subgraph UC_Viewer["Viewer Use Cases"]
        V1[View Dashboards]
        V2[View Reports]
    end

    subgraph UC_Client["Client Use Cases"]
        C1[Browse Products]
        C2[Place Orders]
        C3[Make Payments]
        C4[Order History]
        C5[Loyalty Program]
    end

    subgraph UC_Bot["Bot Use Cases"]
        B1[Notifications]
        B2[Track Trips]
        B3[Report Issues]
        B4[View Tasks]
    end

    Owner --> O1 & O2 & O3 & O4
    Admin --> A1 & A2 & A3 & A4 & A5 & A6 & A7
    Manager --> M1 & M2 & M3 & M4 & M5 & M6
    Operator --> OP1 & OP2 & OP3 & OP4
    Warehouse --> W1 & W2 & W3 & W4
    Accountant --> AC1 & AC2 & AC3 & AC4 & AC5
    Viewer --> V1 & V2
    Client --> C1 & C2 & C3 & C4 & C5
    TelegramBot --> B1 & B2 & B3 & B4
```

### B) Class Diagram

Доменная модель VendHub OS: 20 ключевых сущностей с атрибутами, методами и связями. Organization -- корень мультитенантной иерархии.

```mermaid
classDiagram
    class Organization {
        +String id
        +String name
        +String slug
        +String type
        +String status
        +String subscriptionTier
        +getActiveUsers() User[]
        +getMachineCount() int
    }
    class User {
        +String id
        +String email
        +String role
        +String status
        +String organizationId
        +Decimal pointsBalance
        +assignTask(task) void
        +getPermissions() String[]
    }
    class Machine {
        +String id
        +String machineNumber
        +String type
        +String status
        +String connectionStatus
        +String locationId
        +Decimal currentCashAmount
        +checkStock() boolean
        +updateTelemetry(data) void
    }
    class Location {
        +String id
        +String name
        +String code
        +String type
        +String status
        +Decimal latitude
        +Decimal longitude
        +getActiveMachines() Machine[]
    }
    class Product {
        +String id
        +String sku
        +String name
        +String category
        +boolean isIngredient
        +Decimal purchasePrice
        +Decimal sellingPrice
        +calculateMargin() Decimal
    }
    class Recipe {
        +String id
        +String name
        +String typeCode
        +Decimal totalCost
        +int preparationTimeSeconds
        +calculateCost() Decimal
    }
    class RecipeIngredient {
        +String id
        +String recipeId
        +String productId
        +Decimal quantity
    }
    class Task {
        +String id
        +String taskNumber
        +String typeCode
        +String status
        +String priority
        +assign(userId) void
        +complete() void
        +reject(reason) void
    }
    class TaskItem {
        +String id
        +String taskId
        +String productId
        +Decimal plannedQuantity
        +Decimal actualQuantity
    }
    class Order {
        +String id
        +String orderNumber
        +String status
        +String paymentStatus
        +Decimal totalAmount
        +confirm() void
        +cancel() void
    }
    class OrderItem {
        +String id
        +String orderId
        +String productId
        +int quantity
        +Decimal totalPrice
    }
    class Transaction {
        +String id
        +String transactionNumber
        +String type
        +String status
        +Decimal totalAmount
        +boolean isFiscalized
        +fiscalize() void
    }
    class TransactionItem {
        +String id
        +String transactionId
        +String productId
        +int quantity
    }
    class PaymentTransaction {
        +String id
        +String provider
        +String providerTxId
        +Decimal amount
        +String status
        +processWebhook(data) void
    }
    class WarehouseInventory {
        +String id
        +String productId
        +Decimal currentQuantity
        +Decimal reservedQuantity
        +reserve(qty) void
    }
    class OperatorInventory {
        +String id
        +String operatorId
        +String productId
        +Decimal currentQuantity
        +loadToMachine(qty) void
    }
    class MachineInventory {
        +String id
        +String machineId
        +String productId
        +Decimal currentQuantity
        +Decimal maxCapacity
        +isLow() boolean
        +refill(qty) void
    }
    class MaintenanceRequest {
        +String id
        +String maintenanceType
        +String status
        +String priority
        +Decimal totalCost
        +approve() void
    }
    class Route {
        +String id
        +String operatorId
        +String type
        +String status
        +optimize() void
    }
    class Trip {
        +String id
        +String employeeId
        +String status
        +int calculatedDistanceMeters
        +start() void
        +complete() void
    }
    Organization "1" --> "*" User : has
    Organization "1" --> "*" Machine : owns
    Organization "1" --> "*" Location : manages
    Organization "1" --> "*" Product : catalogs
    Location "1" --> "*" Machine : hosts
    Machine "1" --> "*" MachineInventory : stocks
    Machine "1" --> "*" Task : requires
    Machine "1" --> "*" Transaction : records
    Machine "1" --> "*" Order : processes
    Machine "1" --> "*" MaintenanceRequest : has
    User "1" --> "*" Task : assigned to
    User "1" --> "*" OperatorInventory : carries
    Product "1" --> "*" Recipe : used in
    Recipe "1" --> "*" RecipeIngredient : contains
    Task "1" --> "*" TaskItem : includes
    Order "1" --> "*" OrderItem : contains
    Transaction "1" --> "*" TransactionItem : details
    Route "1" --> "*" RouteStop : visits
    Trip "1" --> "*" TripStop : stops at
```

### C) Sequence Diagrams

#### C1: Customer Purchase via Vending Machine

Полный цикл покупки: выбор товара, валидация, оплата через Payme, webhook, фискализация, начисление лояльности.

```mermaid
sequenceDiagram
    actor Customer
    participant VM as Vending Machine
    participant API as API Gateway
    participant PaySvc as Payment Service
    participant Payme as Payme Provider
    participant InvSvc as Inventory Service
    participant FiscalSvc as Fiscal Service
    participant LoyaltySvc as Loyalty Service

    Customer->>VM: Select product
    VM->>API: POST /orders (productId, machineId)
    API->>InvSvc: Check stock availability
    InvSvc-->>API: Stock confirmed
    API->>InvSvc: Reserve inventory
    API-->>VM: Order created (orderId, amount)
    VM->>Customer: Display payment QR code
    Customer->>VM: Scan QR / tap pay
    VM->>API: POST /payments/initiate
    API->>PaySvc: Create payment transaction
    PaySvc->>Payme: Create invoice
    Payme-->>PaySvc: Invoice URL
    PaySvc-->>API: Payment pending
    Customer->>Payme: Confirm payment in app
    Payme->>API: POST /webhooks/payme (confirmed)
    API->>PaySvc: Process webhook
    PaySvc->>PaySvc: Validate signature
    PaySvc-->>API: Payment confirmed
    API->>InvSvc: Deduct machine inventory
    API->>FiscalSvc: Generate fiscal receipt
    FiscalSvc->>FiscalSvc: Send to OFD/Soliq
    FiscalSvc-->>API: Fiscal receipt ID
    API->>LoyaltySvc: Award loyalty points
    LoyaltySvc-->>API: Points credited
    API-->>VM: Dispense command
    VM->>VM: Dispense product
    VM->>Customer: Product + receipt
    VM->>API: POST /orders/confirm-dispensed
```

#### C2: Task Execution (Refill)

Полный цикл задачи на заправку: создание, валидация инвентаря, назначение оператора, перемещение товаров, фотофиксация, одобрение.

```mermaid
sequenceDiagram
    actor Mgr as Manager
    participant API as API
    participant TaskSvc as Task Service
    participant InvSvc as Inventory Service
    actor Op as Operator
    participant Mobile as Mobile App
    participant NotifSvc as Notification Service

    Mgr->>API: POST /tasks (type=refill, machineId)
    API->>TaskSvc: Create refill task
    TaskSvc->>InvSvc: Check warehouse stock
    InvSvc-->>TaskSvc: Stock available
    TaskSvc->>InvSvc: Reserve warehouse stock
    TaskSvc->>TaskSvc: Assign operator
    TaskSvc-->>API: Task created (ASSIGNED)
    API->>NotifSvc: Send notification
    NotifSvc->>Mobile: Push notification
    NotifSvc->>Op: Telegram notification
    Op->>Mobile: View task details
    Mobile->>API: PATCH /tasks/{id}/accept
    Op->>Mobile: Confirm warehouse pickup
    Mobile->>API: POST /inventory/movements (warehouse_to_operator)
    API->>InvSvc: Transfer stock to operator
    Op->>Mobile: Arrive at machine
    Mobile->>API: POST /tasks/{id}/photo (before)
    Op->>Mobile: Load products
    Mobile->>API: POST /inventory/movements (operator_to_machine)
    API->>InvSvc: Transfer stock to machine
    Op->>Mobile: Take after photo
    Mobile->>API: POST /tasks/{id}/photo (after)
    Op->>Mobile: Submit completion
    Mobile->>API: PATCH /tasks/{id}/complete
    API->>NotifSvc: Notify manager
    Mgr->>API: PATCH /tasks/{id}/approve
    API->>TaskSvc: Approve task
```

#### C3: Authentication with 2FA

Аутентификация с двухфакторной проверкой через TOTP (otplib). Сессии хранятся в Redis с настраиваемым TTL.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Auth as Auth API
    participant UserSvc as User Service
    participant TwoFA as TwoFactor Service
    participant Session as Session Service
    participant Redis as Redis

    User->>FE: Enter email + password
    FE->>Auth: POST /auth/login
    Auth->>UserSvc: Validate credentials
    UserSvc->>UserSvc: Verify bcrypt hash
    UserSvc-->>Auth: Credentials valid
    Auth->>TwoFA: Check 2FA enabled
    TwoFA-->>Auth: 2FA enabled
    Auth-->>FE: 200 (requiresTwoFactor=true, tempToken)
    FE->>User: Show TOTP input
    User->>FE: Enter 6-digit code
    FE->>Auth: POST /auth/2fa/verify (tempToken, code)
    Auth->>TwoFA: Verify TOTP code
    TwoFA->>TwoFA: Validate via otplib
    TwoFA-->>Auth: TOTP valid
    Auth->>Auth: Generate JWT (15min)
    Auth->>Auth: Generate refresh token (7d)
    Auth->>Session: Create session
    Session->>Redis: SETEX session (TTL 7d)
    Redis-->>Session: OK
    Auth-->>FE: 200 (accessToken, refreshToken, user)
    FE->>FE: Store tokens

    Note over FE,Auth: Token Refresh Flow
    FE->>Auth: POST /auth/refresh (refreshToken)
    Auth->>Session: Validate session
    Session->>Redis: GET session
    Redis-->>Session: Valid
    Auth->>Auth: Generate new access token
    Auth-->>FE: New access token
```

#### C4: Real-time Machine Telemetry

Телеметрия в реальном времени: автоматы отправляют данные каждые 30 секунд через WebSocket, система проверяет пороги и рассылает алерты.

```mermaid
sequenceDiagram
    participant VM as Vending Machine
    participant WSGw as WebSocket Gateway
    participant TelSvc as Telemetry Service
    participant AlertSvc as Alert Service
    participant Redis as Redis
    participant TgBot as Telegram Bot
    participant Dashboard as Admin Dashboard

    VM->>WSGw: Connect (machineToken)
    WSGw->>WSGw: Validate token
    WSGw-->>VM: Connected

    loop Every 30 seconds
        VM->>WSGw: emit telemetry data
        WSGw->>TelSvc: Process payload
        TelSvc->>TelSvc: Validate and normalize
        TelSvc->>Redis: HSET machine telemetry
        TelSvc->>AlertSvc: Check thresholds
        alt Threshold exceeded
            AlertSvc->>AlertSvc: Create alert
            AlertSvc->>TgBot: Send notification
        end
        TelSvc->>Redis: PUBLISH telemetry channel
        Redis->>Dashboard: Subscription message
        Dashboard->>Dashboard: Update live map
    end

    alt Connection lost
        WSGw->>TelSvc: Handle disconnect
        TelSvc->>Redis: Set status offline
        TelSvc->>AlertSvc: Trigger offline alert
        AlertSvc->>TgBot: Notify offline
    end
```

### D) Activity Diagrams

#### D1: Inventory Replenishment Cycle

Полный цикл пополнения запасов от обнаружения низкого остатка до заправки автомата. 4 роли: System, Manager, Warehouse, Operator.

```mermaid
flowchart TD
    Start([Start]) --> DetectLow

    subgraph System["System (Automated)"]
        DetectLow[Detect low stock]
        DetectLow --> CheckThreshold{Below threshold?}
        CheckThreshold -- No --> Monitor[Continue monitoring]
        Monitor --> DetectLow
        CheckThreshold -- Yes --> CreateAlert[Create alert]
        CreateAlert --> NotifyManager[Notify manager]
    end

    NotifyManager --> ReviewAlert

    subgraph ManagerLane["Manager"]
        ReviewAlert[Review alert]
        ReviewAlert --> AssessNeeds[Assess needs]
        AssessNeeds --> CreateTask[Create refill task]
        CreateTask --> AssignOperator[Assign operator]
        AssignOperator --> CheckRoute{Add to route?}
        CheckRoute -- Yes --> AddToRoute[Add to route]
        CheckRoute -- No --> CreateRoute[Create new route]
    end

    AddToRoute --> ReserveStock
    CreateRoute --> ReserveStock

    subgraph WarehouseLane["Warehouse"]
        ReserveStock[Reserve stock]
        ReserveStock --> CheckAvail{Sufficient?}
        CheckAvail -- No --> CreatePO[Create purchase order]
        CreatePO --> ReceiveGoods[Receive goods]
        ReceiveGoods --> ReserveStock
        CheckAvail -- Yes --> PreparePickup[Prepare items]
        PreparePickup --> OperatorPickup[Hand to operator]
        OperatorPickup --> RecordMovement1[Record warehouse_to_operator]
    end

    RecordMovement1 --> TravelToMachine

    subgraph OperatorLane["Operator"]
        TravelToMachine[Travel to machine]
        TravelToMachine --> PhotoBefore[Take before photo]
        PhotoBefore --> LoadProducts[Load products]
        LoadProducts --> RecordMovement2[Record operator_to_machine]
        RecordMovement2 --> PhotoAfter[Take after photo]
        PhotoAfter --> SubmitCompletion[Submit completion]
    end

    SubmitCompletion --> ManagerReview

    subgraph ManagerApproval["Manager Approval"]
        ManagerReview[Review with photos]
        ManagerReview --> Approve{Approve?}
        Approve -- Yes --> MarkComplete[Mark complete]
        Approve -- No --> RejectTask[Reject]
        RejectTask --> TravelToMachine
    end

    MarkComplete --> UpdateStatus

    subgraph SystemFinal["System Final"]
        UpdateStatus[Update machine status]
        UpdateStatus --> ClearAlert[Clear alert]
        ClearAlert --> EndState([End])
    end
```

#### D2: Monthly Financial Reconciliation

Ежемесячная финансовая сверка: агрегация, расчет комиссий, сверка с банковскими выписками, подготовка налоговой отчетности.

```mermaid
flowchart TD
    Start([Month End Trigger]) --> Aggregate

    Aggregate[Aggregate daily summaries] --> SplitByType{Split by payment}

    SplitByType --> CashFlow[Calculate cash collections]
    SplitByType --> CardFlow[Calculate card payments]

    CashFlow --> CompareCash[Compare collected vs expected]
    CompareCash --> CashMatch{Match?}
    CashMatch -- No --> FlagCash[Flag discrepancy]
    CashMatch -- Yes --> CashOK[Cash reconciled]

    CardFlow --> MatchProvider[Match with provider statements]
    MatchProvider --> CardMatch{All matched?}
    CardMatch -- No --> FlagCard[Flag unmatched]
    CardMatch -- Yes --> CardOK[Cards reconciled]

    CashOK --> CalcCommissions
    CardOK --> CalcCommissions
    FlagCash --> ManagerReview
    FlagCard --> ManagerReview

    CalcCommissions[Calculate commissions] --> CalcRent[Calculate rent payments]
    CalcRent --> CalcTax[Calculate VAT and taxes]
    CalcTax --> GenerateReports[Generate reports]

    ManagerReview[Manager reviews] --> ResolveDisc{Resolved?}
    ResolveDisc -- Yes --> AdjustEntries[Create adjustments]
    AdjustEntries --> GenerateReports
    ResolveDisc -- No --> Escalate[Escalate to admin]
    Escalate --> AdjustEntries

    GenerateReports --> ExportAccounting[Export to accounting]
    ExportAccounting --> FiscalReport[Generate fiscal report]
    FiscalReport --> End([Month Closed])
```

#### D3: New Organization Onboarding

Полный путь подключения новой организации: регистрация, верификация, KYC, настройка, подключение платежей, запуск.

```mermaid
flowchart TD
    Start([Start]) --> Registration

    Registration[Submit registration] --> ValidateEmail{Email valid?}
    ValidateEmail -- No --> ShowError[Validation error]
    ShowError --> Registration
    ValidateEmail -- Yes --> CreatePending[Create pending org]

    CreatePending --> SendVerification[Send email verification]
    SendVerification --> WaitVerify{Verified?}
    WaitVerify -- No --> Timeout{48h timeout?}
    Timeout -- No --> WaitVerify
    Timeout -- Yes --> Expire[Expire registration]

    WaitVerify -- Yes --> KYCUpload[Upload KYC documents]
    KYCUpload --> UploadBusiness[Business registration docs]
    UploadBusiness --> UploadID[ID documents]
    UploadID --> SubmitReview[Submit for review]

    SubmitReview --> AdminReview[Admin reviews]
    AdminReview --> Decision{Approved?}
    Decision -- No --> NeedInfo{More info?}
    NeedInfo -- Yes --> NotifyOwner[Request docs]
    NotifyOwner --> KYCUpload
    NeedInfo -- No --> Reject[Reject application]

    Decision -- Yes --> ActivateOrg[Activate organization]
    ActivateOrg --> SetSubscription[Set subscription tier]
    SetSubscription --> ConfigDefaults[Configure defaults]
    ConfigDefaults --> CreateOwner[Create owner account]

    CreateOwner --> InviteUsers[Invite team members]
    InviteUsers --> RegisterMachines[Register machines]
    RegisterMachines --> AssignLocations[Create locations]
    AssignLocations --> ConfigPayments[Configure payments]

    ConfigPayments --> PaymeSetup[Setup Payme]
    ConfigPayments --> ClickSetup[Setup Click]
    ConfigPayments --> UzumSetup[Setup Uzum]

    PaymeSetup --> VerifyPayments
    ClickSetup --> VerifyPayments
    UzumSetup --> VerifyPayments

    VerifyPayments{Providers verified?}
    VerifyPayments -- No --> FixConfig[Fix configuration]
    FixConfig --> ConfigPayments
    VerifyPayments -- Yes --> TestTx[Run test transaction]
    TestTx --> GoLive[Organization LIVE]
    GoLive --> End([End])
```

### E) State Diagrams

#### E1: Machine Status

Все операционные состояния вендингового автомата. Offline -- транзитное состояние при потере связи, Disabled требует действия администратора.

```mermaid
stateDiagram-v2
    [*] --> Active : Machine registered and connected

    Active --> LowStock : Stock below threshold
    LowStock --> Active : Refill completed

    Active --> Error : Hardware/software error
    Error --> Maintenance : Repair task created

    Maintenance --> Active : Repair completed
    Maintenance --> Error : Repair failed

    Active --> Offline : Connection lost
    LowStock --> Offline : Connection lost
    Error --> Offline : Connection lost
    Maintenance --> Offline : Connection lost

    Offline --> Active : Restored (was Active)
    Offline --> LowStock : Restored (was LowStock)
    Offline --> Error : Restored (was Error)
    Offline --> Maintenance : Restored (was Maintenance)

    Active --> Disabled : Admin disables
    LowStock --> Disabled : Admin disables
    Error --> Disabled : Admin disables
    Maintenance --> Disabled : Admin disables
    Offline --> Disabled : Admin disables

    Disabled --> Active : Admin re-enables
    Disabled --> [*] : Decommissioned
```

#### E2: Order Status

Жизненный цикл заказа от создания до завершения или отмены. Возврат возможен для завершенных и частично оплаченных заказов.

```mermaid
stateDiagram-v2
    [*] --> Pending : Order created

    Pending --> Confirmed : Payment initiated
    Pending --> Cancelled : Timeout or user cancels

    Confirmed --> Preparing : Payment confirmed
    Confirmed --> Cancelled : Payment failed

    Preparing --> Ready : Product prepared
    Preparing --> Cancelled : Machine error

    Ready --> Completed : Product dispensed
    Ready --> Cancelled : Dispensing failed

    Completed --> Refunded : Refund approved
    Cancelled --> Refunded : Partial refund

    Completed --> [*]
    Refunded --> [*]
    Cancelled --> [*]
```

#### E3: Task Status

Жизненный цикл задачи со всеми валидными переходами. Postponed позволяет оператору отложить, Rejected отправляет на переделку.

```mermaid
stateDiagram-v2
    [*] --> Pending : Task created

    Pending --> Assigned : Operator assigned
    Pending --> Cancelled : Manager cancels

    Assigned --> InProgress : Operator starts
    Assigned --> Postponed : Operator postpones
    Assigned --> Cancelled : Manager cancels

    InProgress --> Completed : Operator submits
    InProgress --> Postponed : Operator postpones
    InProgress --> Cancelled : Manager cancels

    Postponed --> Assigned : Rescheduled
    Postponed --> Cancelled : Manager cancels

    Completed --> Rejected : Manager rejects

    Rejected --> Assigned : Reassigned for redo

    Cancelled --> [*]
    Completed --> [*] : Approved by manager
```

#### E4: Maintenance Request Status

Процесс обслуживания от черновика до верификации. Включает статус AwaitingParts для ожидания запчастей и цикл верификации.

```mermaid
stateDiagram-v2
    [*] --> Draft : Request initiated

    Draft --> Submitted : Details completed
    Draft --> Cancelled : Creator cancels

    Submitted --> Approved : Admin approves
    Submitted --> Rejected : Admin rejects

    Rejected --> Draft : Revised
    Rejected --> Cancelled : Permanently cancelled

    Approved --> Scheduled : Date set
    Approved --> Cancelled : Cancelled

    Scheduled --> InProgress : Technician begins
    Scheduled --> Cancelled : Cancelled

    InProgress --> AwaitingParts : Parts needed
    InProgress --> Completed : Work finished

    AwaitingParts --> InProgress : Parts received

    Completed --> Verified : QA passed
    Completed --> InProgress : QA failed rework

    Verified --> [*] : Closed

    Cancelled --> [*]
```

#### E5: Location Status

Жизненный цикл локации от поиска до закрытия. Закрытые локации могут быть переоценены для повторного использования.

```mermaid
stateDiagram-v2
    [*] --> Prospecting : Location identified

    Prospecting --> ContractPending : Terms negotiated
    Prospecting --> Closed : Deemed unsuitable

    ContractPending --> Active : Contract signed
    ContractPending --> Prospecting : Renegotiation
    ContractPending --> Closed : Talks failed

    Active --> Suspended : Issue or overdue
    Active --> Closing : Termination initiated

    Suspended --> Active : Issue resolved
    Suspended --> Closing : Termination

    Closing --> Closed : Machines removed

    Closed --> Prospecting : Re-evaluation
    Closed --> [*] : Archived
```

## BPMN (Business Process Diagrams)

---

### BPMN 1: Vending Machine Sales Process

**Opisanie / Описание:** Процесс покупки товара через вендинговый автомат -- от выбора товара покупателем до выдачи товара и фискализации чека. Включает проверку наличия товара, выбор способа оплаты (наличные, Payme, Click, Uzum, Telegram Stars), авторизацию платежа и генерацию фискального чека через OFD/Soliq.uz. При ошибках (нет товара, отклонение платежа) процесс корректно завершается с уведомлением пользователя.

**Участники (Pools/Lanes):**
- Customer (Покупатель)
- Vending Machine (Автомат)
- VendHub API (Бэкенд)
- Payment Provider (Payme / Click / Uzum)
- Fiscal Service (OFD / Soliq.uz)

**Ключевые события:**
- Start: Покупатель подходит к автомату
- Intermediate: Уведомление о статусе оплаты, таймаут оплаты
- End: Товар выдан (успех), Отказ в продаже (ошибка)

**Шлюзы:**
- Exclusive Gateway: Выбор метода оплаты (Cash / Card / QR)
- Exclusive Gateway: Товар в наличии? (Да / Нет)
- Exclusive Gateway: Платеж одобрен? (Да / Нет)

```mermaid
flowchart TB
    subgraph Customer_Pool["Customer"]
        C_START(("Start:<br/>Approach Machine"))
        C_SELECT["Select Product<br/>on Display"]
        C_PAY_CHOICE["Choose Payment<br/>Method"]
        C_CONFIRM["Confirm<br/>Payment"]
        C_RECEIVE["Receive Product<br/>and Receipt"]
        C_END_OK(("End:<br/>Purchase Complete"))
        C_END_FAIL(("End:<br/>Purchase Failed"))
    end

    subgraph Machine_Pool["Vending Machine"]
        M_DISPLAY["Display Product<br/>Menu and Prices"]
        M_CHECK_STOCK{"Stock<br/>Available?"}
        M_NO_STOCK["Display: Out of<br/>Stock Message"]
        M_SHOW_PAY["Show Payment<br/>Options"]
        M_PAY_TYPE{"Payment<br/>Method?"}
        M_ACCEPT_CASH["Accept Cash<br/>via Bill Validator"]
        M_SHOW_QR["Display QR Code<br/>for Payment"]
        M_WAIT_PAY["Wait for Payment<br/>Confirmation"]
        M_TIMEOUT{"Payment<br/>Timeout?"}
        M_DISPENSE["Dispense<br/>Product"]
        M_SHOW_RECEIPT["Display Digital<br/>Receipt / QR"]
        M_SHOW_ERROR["Display Error:<br/>Payment Failed"]
    end

    subgraph API_Pool["VendHub API"]
        A_VALIDATE["Validate Order<br/>Check Price + Stock"]
        A_CREATE_ORDER["Create Order<br/>Record in DB"]
        A_INIT_PAY["Initialize<br/>Payment Request"]
        A_PROCESS_CASH["Process Cash<br/>Payment Locally"]
        A_VERIFY_PAY["Verify Payment<br/>Status"]
        A_PAY_OK{"Payment<br/>Confirmed?"}
        A_UPDATE_INV["Update Inventory<br/>Decrement Stock"]
        A_RECORD_TX["Record Transaction<br/>in Ledger"]
        A_REQUEST_FISCAL["Request Fiscal<br/>Receipt"]
        A_SEND_NOTIF["Send Low-Stock<br/>Alert if Needed"]
        A_CANCEL["Cancel Order<br/>Release Hold"]
    end

    subgraph PayProvider_Pool["Payment Provider"]
        P_AUTH["Authorize<br/>Payment"]
        P_CONFIRM["Confirm<br/>Settlement"]
        P_DECLINE["Decline<br/>Payment"]
    end

    subgraph Fiscal_Pool["Fiscal Service (OFD)"]
        F_GENERATE["Generate Fiscal<br/>Receipt"]
        F_STORE["Store Fiscal Data<br/>for Tax Report"]
        F_RETURN["Return Receipt<br/>Number + QR"]
    end

    %% Customer flow
    C_START --> C_SELECT
    C_SELECT --> M_DISPLAY
    M_DISPLAY --> M_CHECK_STOCK
    M_CHECK_STOCK -->|No| M_NO_STOCK
    M_NO_STOCK --> C_END_FAIL
    M_CHECK_STOCK -->|Yes| A_VALIDATE

    A_VALIDATE --> A_CREATE_ORDER
    A_CREATE_ORDER --> M_SHOW_PAY
    M_SHOW_PAY --> C_PAY_CHOICE
    C_PAY_CHOICE --> M_PAY_TYPE

    M_PAY_TYPE -->|"Cash"| M_ACCEPT_CASH
    M_PAY_TYPE -->|"QR / Mobile"| M_SHOW_QR

    M_ACCEPT_CASH --> A_PROCESS_CASH
    A_PROCESS_CASH --> A_PAY_OK

    M_SHOW_QR --> C_CONFIRM
    C_CONFIRM --> A_INIT_PAY
    A_INIT_PAY --> P_AUTH

    P_AUTH -->|Approved| P_CONFIRM
    P_AUTH -->|Declined| P_DECLINE

    P_CONFIRM --> A_VERIFY_PAY
    P_DECLINE --> A_PAY_OK

    A_VERIFY_PAY --> A_PAY_OK

    A_PAY_OK -->|Yes| A_UPDATE_INV
    A_PAY_OK -->|No| A_CANCEL

    A_CANCEL --> M_SHOW_ERROR
    M_SHOW_ERROR --> C_END_FAIL

    A_UPDATE_INV --> A_RECORD_TX
    A_RECORD_TX --> A_REQUEST_FISCAL
    A_REQUEST_FISCAL --> F_GENERATE
    F_GENERATE --> F_STORE
    F_STORE --> F_RETURN
    F_RETURN --> M_DISPENSE
    M_DISPENSE --> M_SHOW_RECEIPT
    M_SHOW_RECEIPT --> C_RECEIVE
    C_RECEIVE --> C_END_OK

    A_RECORD_TX --> A_SEND_NOTIF

    %% Timeout handling
    M_SHOW_QR --> M_WAIT_PAY
    M_WAIT_PAY --> M_TIMEOUT
    M_TIMEOUT -->|Yes| A_CANCEL
    M_TIMEOUT -->|No| A_VERIFY_PAY
```

---

### BPMN 2: Daily Operations Workflow

**Opisanie / Описание:** Ежедневный операционный цикл управления вендинговыми автоматами. Ночью система автоматически анализирует данные, генерирует оповещения о низком остатке, создает задачи на обслуживание. Утром менеджер просматривает дашборд, приоритизирует задачи, формирует маршруты и назначает операторов. Складской персонал готовит товар по заявкам. Операторы выполняют маршруты -- пополнение, инкассация, чистка -- и отправляют отчеты с фотоподтверждением.

**Участники (Pools/Lanes):**
- System (Automated -- ночная аналитика, cron-задачи)
- Manager (Менеджер операций)
- Warehouse Staff (Складской персонал)
- Operator (Полевой оператор)

**Ключевые события:**
- Start: Timer Event -- 00:00 ночной запуск аналитики
- Intermediate: Уведомления (Telegram/Push) менеджеру, оператору, складу
- End: Маршрут завершен, отчет принят

**Шлюзы:**
- Parallel Gateway: Параллельное создание задач (пополнение + инкассация + обслуживание)
- Exclusive Gateway: Тип задачи (refill / collect / clean / repair)
- Exclusive Gateway: Требуется ли склад?

```mermaid
flowchart TB
    subgraph System_Pool["System (Automated)"]
        S_START(("Timer: 00:00<br/>Nightly Run"))
        S_ANALYTICS["Run Overnight<br/>Analytics"]
        S_CHECK_STOCK["Check All Machine<br/>Stock Levels"]
        S_GEN_ALERTS["Generate Low-Stock<br/>and Error Alerts"]
        S_PARALLEL_START{{"Parallel<br/>Gateway"}}
        S_CREATE_REFILL["Create Auto-Tasks:<br/>Refill"]
        S_CREATE_COLLECT["Create Auto-Tasks:<br/>Cash Collection"]
        S_CREATE_MAINT["Schedule Preventive<br/>Maintenance"]
        S_PARALLEL_END{{"Parallel<br/>Join"}}
        S_OPTIMIZE_ROUTES["Optimize Routes<br/>by Geography"]
        S_NOTIFY_MANAGER["Send Morning<br/>Summary to Manager"]
    end

    subgraph Manager_Pool["Manager"]
        MG_RECEIVE["Receive Morning<br/>Notification"]
        MG_DASHBOARD["Review Dashboard<br/>KPIs and Alerts"]
        MG_PRIORITIZE["Prioritize Tasks<br/>by Urgency"]
        MG_ADJUST["Adjust Routes<br/>and Assignments"]
        MG_ASSIGN["Assign Operators<br/>to Routes"]
        MG_NOTIFY_WH["Send Material<br/>Requests to Warehouse"]
        MG_MONITOR["Monitor Operator<br/>Progress Live"]
        MG_REVIEW["Review Completed<br/>Trip Reports"]
        MG_APPROVE{"Reports<br/>Approved?"}
        MG_REQUEST_FIX["Request Corrections<br/>from Operator"]
        MG_CLOSE["Close Daily<br/>Operations"]
        MG_END(("End:<br/>Day Closed"))
    end

    subgraph Warehouse_Pool["Warehouse Staff"]
        WH_RECEIVE["Receive Material<br/>Request"]
        WH_CHECK_STOCK["Check Warehouse<br/>Stock Availability"]
        WH_NEEDS_ORDER{"Stock<br/>Sufficient?"}
        WH_ORDER["Create Purchase<br/>Order"]
        WH_PREPARE["Prepare Stock<br/>for Operators"]
        WH_PACK["Pack Route-Specific<br/>Crates"]
        WH_HANDOFF["Hand Off Stock<br/>to Operator"]
        WH_UPDATE_INV["Update Warehouse<br/>Inventory"]
    end

    subgraph Operator_Pool["Operator"]
        OP_RECEIVE["Receive Route<br/>Assignment via App"]
        OP_PICKUP["Pick Up Stock<br/>from Warehouse"]
        OP_START_TRIP["Start Trip<br/>Share Live Location"]
        OP_ARRIVE["Arrive at Machine<br/>Check-in via GPS"]
        OP_TASK_TYPE{"Task<br/>Type?"}
        OP_REFILL["Refill Machine<br/>Log Quantities"]
        OP_COLLECT["Collect Cash<br/>Count and Log"]
        OP_CLEAN["Clean Machine<br/>Photo Before/After"]
        OP_REPAIR["Execute Repair<br/>Log Parts Used"]
        OP_PHOTO["Take Confirmation<br/>Photos"]
        OP_NEXT{"More Machines<br/>on Route?"}
        OP_SUBMIT["Submit Trip<br/>Report"]
        OP_END(("End:<br/>Route Complete"))
    end

    %% System flow
    S_START --> S_ANALYTICS
    S_ANALYTICS --> S_CHECK_STOCK
    S_CHECK_STOCK --> S_GEN_ALERTS
    S_GEN_ALERTS --> S_PARALLEL_START
    S_PARALLEL_START --> S_CREATE_REFILL
    S_PARALLEL_START --> S_CREATE_COLLECT
    S_PARALLEL_START --> S_CREATE_MAINT
    S_CREATE_REFILL --> S_PARALLEL_END
    S_CREATE_COLLECT --> S_PARALLEL_END
    S_CREATE_MAINT --> S_PARALLEL_END
    S_PARALLEL_END --> S_OPTIMIZE_ROUTES
    S_OPTIMIZE_ROUTES --> S_NOTIFY_MANAGER

    %% Manager flow
    S_NOTIFY_MANAGER --> MG_RECEIVE
    MG_RECEIVE --> MG_DASHBOARD
    MG_DASHBOARD --> MG_PRIORITIZE
    MG_PRIORITIZE --> MG_ADJUST
    MG_ADJUST --> MG_ASSIGN
    MG_ASSIGN --> MG_NOTIFY_WH
    MG_ASSIGN --> OP_RECEIVE
    MG_NOTIFY_WH --> WH_RECEIVE

    %% Warehouse flow
    WH_RECEIVE --> WH_CHECK_STOCK
    WH_CHECK_STOCK --> WH_NEEDS_ORDER
    WH_NEEDS_ORDER -->|No| WH_ORDER
    WH_ORDER --> WH_PREPARE
    WH_NEEDS_ORDER -->|Yes| WH_PREPARE
    WH_PREPARE --> WH_PACK
    WH_PACK --> WH_HANDOFF
    WH_HANDOFF --> WH_UPDATE_INV
    WH_HANDOFF --> OP_PICKUP

    %% Operator flow
    OP_RECEIVE --> OP_PICKUP
    OP_PICKUP --> OP_START_TRIP
    OP_START_TRIP --> OP_ARRIVE
    OP_ARRIVE --> OP_TASK_TYPE
    OP_TASK_TYPE -->|Refill| OP_REFILL
    OP_TASK_TYPE -->|Collect| OP_COLLECT
    OP_TASK_TYPE -->|Clean| OP_CLEAN
    OP_TASK_TYPE -->|Repair| OP_REPAIR
    OP_REFILL --> OP_PHOTO
    OP_COLLECT --> OP_PHOTO
    OP_CLEAN --> OP_PHOTO
    OP_REPAIR --> OP_PHOTO
    OP_PHOTO --> OP_NEXT
    OP_NEXT -->|Yes| OP_ARRIVE
    OP_NEXT -->|No| OP_SUBMIT
    OP_SUBMIT --> OP_END

    %% Manager monitoring
    OP_START_TRIP -.->|Live GPS| MG_MONITOR
    OP_SUBMIT --> MG_REVIEW
    MG_MONITOR --> MG_REVIEW
    MG_REVIEW --> MG_APPROVE
    MG_APPROVE -->|Yes| MG_CLOSE
    MG_APPROVE -->|No| MG_REQUEST_FIX
    MG_REQUEST_FIX --> OP_SUBMIT
    MG_CLOSE --> MG_END
```

---

### BPMN 3: New Machine Installation

**Opisanie / Описание:** Процесс установки нового вендингового автомата -- от поиска локации до полной активации в системе. Sales-менеджер находит локацию и заключает договор. Администратор согласовывает и создает запись в системе. Склад готовит автомат и начальный ассортимент. Оператор доставляет, устанавливает, подключает и тестирует автомат. Система верифицирует подключение, запускает телеметрию и активирует автомат для продаж.

**Участники (Pools/Lanes):**
- Sales Manager (Менеджер продаж)
- Admin (Администратор)
- Warehouse (Склад)
- Operator (Оператор-установщик)
- System (VendHub API)

**Ключевые события:**
- Start: Идентификация новой локации
- Intermediate: Согласование договора, уведомление о готовности
- End: Автомат активирован и работает

**Шлюзы:**
- Exclusive Gateway: Локация одобрена? (Да / Нет)
- Exclusive Gateway: Договор подписан? (Да / Нет)
- Exclusive Gateway: Тест подключения пройден? (Да / Нет)

```mermaid
flowchart TB
    subgraph Sales_Pool["Sales Manager"]
        SL_START(("Start:<br/>New Location Need"))
        SL_IDENTIFY["Identify Potential<br/>Location"]
        SL_ASSESS["Assess Location:<br/>Traffic, Power, Space"]
        SL_NEGOTIATE["Negotiate Rental<br/>Contract Terms"]
        SL_SUBMIT["Submit Location<br/>for Approval"]
        SL_CONTRACT["Upload Signed<br/>Contract Document"]
        SL_REJECTED(("End:<br/>Location Rejected"))
    end

    subgraph Admin_Pool["Admin"]
        AD_REVIEW_LOC["Review Location<br/>Application"]
        AD_LOC_OK{"Location<br/>Approved?"}
        AD_REJECT_LOC["Reject with<br/>Reason"]
        AD_APPROVE_LOC["Approve Location<br/>Create in System"]
        AD_REVIEW_CONTRACT["Review Contract<br/>Terms and Docs"]
        AD_CONTRACT_OK{"Contract<br/>Approved?"}
        AD_REJECT_CONTRACT["Request Contract<br/>Revisions"]
        AD_CREATE_MACHINE["Create Machine<br/>Record in DB"]
        AD_ASSIGN_OPERATOR["Assign Operator<br/>for Installation"]
        AD_FINAL_APPROVE["Final Approval:<br/>Activate Machine"]
    end

    subgraph Warehouse_Pool["Warehouse"]
        WH_RECEIVE_ORDER["Receive Machine<br/>Preparation Order"]
        WH_PREP_MACHINE["Prepare Machine:<br/>QC, Clean, Label"]
        WH_LOAD_STOCK["Load Initial<br/>Product Stock"]
        WH_CREATE_DOC["Create Delivery<br/>Document"]
        WH_READY["Notify: Machine<br/>Ready for Pickup"]
    end

    subgraph Operator_Pool["Operator"]
        OP_RECEIVE_TASK["Receive Installation<br/>Task via App"]
        OP_PICKUP_MACHINE["Pick Up Machine<br/>from Warehouse"]
        OP_TRANSPORT["Transport to<br/>Location"]
        OP_INSTALL_PHYS["Physical Install:<br/>Place and Level"]
        OP_CONNECT_POWER["Connect Power<br/>and Network"]
        OP_CONNECT_TELEMETRY["Configure Telemetry<br/>Module"]
        OP_TEST["Run Diagnostic<br/>Test"]
        OP_TEST_OK{"All Tests<br/>Pass?"}
        OP_FIX["Troubleshoot<br/>and Fix Issues"]
        OP_PHOTOS["Take Installation<br/>Photos"]
        OP_SIGN_REPORT["Submit Installation<br/>Report"]
    end

    subgraph System_Pool["System (VendHub API)"]
        SYS_VERIFY["Verify Machine<br/>Connectivity"]
        SYS_TELEMETRY["Initialize<br/>Telemetry Stream"]
        SYS_CREATE_INVENTORY["Create Initial<br/>Inventory Records"]
        SYS_SET_PRICES["Apply Default<br/>Price List"]
        SYS_ACTIVATE["Set Machine Status:<br/>ACTIVE"]
        SYS_NOTIFY["Send Activation<br/>Notifications"]
        SYS_END(("End:<br/>Machine Live"))
    end

    %% Sales flow
    SL_START --> SL_IDENTIFY
    SL_IDENTIFY --> SL_ASSESS
    SL_ASSESS --> SL_NEGOTIATE
    SL_NEGOTIATE --> SL_SUBMIT

    %% Admin location review
    SL_SUBMIT --> AD_REVIEW_LOC
    AD_REVIEW_LOC --> AD_LOC_OK
    AD_LOC_OK -->|No| AD_REJECT_LOC
    AD_REJECT_LOC --> SL_REJECTED
    AD_LOC_OK -->|Yes| AD_APPROVE_LOC

    %% Contract phase
    AD_APPROVE_LOC --> SL_CONTRACT
    SL_CONTRACT --> AD_REVIEW_CONTRACT
    AD_REVIEW_CONTRACT --> AD_CONTRACT_OK
    AD_CONTRACT_OK -->|No| AD_REJECT_CONTRACT
    AD_REJECT_CONTRACT --> SL_NEGOTIATE
    AD_CONTRACT_OK -->|Yes| AD_CREATE_MACHINE

    %% Machine preparation
    AD_CREATE_MACHINE --> WH_RECEIVE_ORDER
    AD_CREATE_MACHINE --> AD_ASSIGN_OPERATOR
    WH_RECEIVE_ORDER --> WH_PREP_MACHINE
    WH_PREP_MACHINE --> WH_LOAD_STOCK
    WH_LOAD_STOCK --> WH_CREATE_DOC
    WH_CREATE_DOC --> WH_READY

    %% Operator installation
    AD_ASSIGN_OPERATOR --> OP_RECEIVE_TASK
    WH_READY --> OP_PICKUP_MACHINE
    OP_RECEIVE_TASK --> OP_PICKUP_MACHINE
    OP_PICKUP_MACHINE --> OP_TRANSPORT
    OP_TRANSPORT --> OP_INSTALL_PHYS
    OP_INSTALL_PHYS --> OP_CONNECT_POWER
    OP_CONNECT_POWER --> OP_CONNECT_TELEMETRY
    OP_CONNECT_TELEMETRY --> OP_TEST
    OP_TEST --> OP_TEST_OK
    OP_TEST_OK -->|No| OP_FIX
    OP_FIX --> OP_TEST
    OP_TEST_OK -->|Yes| OP_PHOTOS
    OP_PHOTOS --> OP_SIGN_REPORT

    %% System activation
    OP_SIGN_REPORT --> SYS_VERIFY
    SYS_VERIFY --> SYS_TELEMETRY
    SYS_TELEMETRY --> SYS_CREATE_INVENTORY
    SYS_CREATE_INVENTORY --> SYS_SET_PRICES
    SYS_SET_PRICES --> AD_FINAL_APPROVE
    AD_FINAL_APPROVE --> SYS_ACTIVATE
    SYS_ACTIVATE --> SYS_NOTIFY
    SYS_NOTIFY --> SYS_END
```

---

### BPMN 4: Financial Reconciliation (Monthly)

**Opisanie / Описание:** Ежемесячный процесс финансовой сверки (reconciliation). Система автоматически агрегирует ежедневные продажи, рассчитывает комиссии партнерам, формирует платежные ведомости и фискальные отчеты. Бухгалтер сверяет транзакции с банковскими выписками, верифицирует инкассации, выявляет расхождения. Менеджер одобряет списания и корректировки. На выходе -- налоговая отчетность в Soliq.uz и закрытие финансового периода.

**Участники (Pools/Lanes):**
- System (Автоматическая агрегация)
- Accountant (Бухгалтер)
- Manager (Менеджер / Руководитель)
- External (Банк / Налоговая)

**Ключевые события:**
- Start: Timer Event -- 1-е число месяца
- Intermediate: Error Event -- Расхождения найдены
- End: Период закрыт, отчетность подана

**Шлюзы:**
- Exclusive Gateway: Расхождения найдены? (Да / Нет)
- Exclusive Gateway: Списание одобрено? (Да / Нет)
- Parallel Gateway: Параллельная сверка (касса + безнал + фискал)

```mermaid
flowchart TB
    subgraph System_Pool["System (Automated)"]
        SY_START(("Timer:<br/>1st of Month"))
        SY_LOCK["Lock Previous<br/>Month Period"]
        SY_AGGREGATE["Aggregate Daily<br/>Sales Summaries"]
        SY_PARALLEL_START{{"Parallel<br/>Gateway"}}
        SY_CALC_COMMISSION["Calculate Partner<br/>Commissions"]
        SY_CALC_PAYROLL["Generate Operator<br/>Payment Schedule"]
        SY_CASH_SUMMARY["Summarize Cash<br/>Collections"]
        SY_DIGITAL_SUMMARY["Summarize Digital<br/>Payments"]
        SY_PARALLEL_END{{"Parallel<br/>Join"}}
        SY_GEN_REPORT["Generate Monthly<br/>Financial Report"]
        SY_GEN_FISCAL["Generate Fiscal<br/>Summary for Tax"]
        SY_NOTIFY["Notify Accountant:<br/>Report Ready"]
    end

    subgraph Accountant_Pool["Accountant"]
        AC_RECEIVE["Receive Monthly<br/>Report Notification"]
        AC_REVIEW["Review Transaction<br/>Summary"]
        AC_PARALLEL_START{{"Parallel<br/>Verify"}}
        AC_VERIFY_CASH["Verify Cash Collections<br/>vs Operator Reports"]
        AC_VERIFY_DIGITAL["Verify Digital Payments<br/>vs Provider Statements"]
        AC_VERIFY_FISCAL["Verify Fiscal Receipts<br/>vs Transaction Log"]
        AC_PARALLEL_END{{"Parallel<br/>Join"}}
        AC_RECONCILE["Run Reconciliation<br/>Algorithm"]
        AC_DISCREPANCY{"Discrepancies<br/>Found?"}
        AC_FLAG["Flag and Document<br/>Each Discrepancy"]
        AC_INVESTIGATE["Investigate Root<br/>Cause"]
        AC_CLASSIFY{"Type of<br/>Discrepancy?"}
        AC_MINOR_FIX["Auto-Correct<br/>Minor Differences"]
        AC_SUBMIT_WRITEOFF["Submit Write-off<br/>Request to Manager"]
        AC_NO_ISSUES["Confirm All<br/>Balances Match"]
        AC_PREPARE_TAX["Prepare Tax<br/>Filing Documents"]
        AC_SUBMIT_TAX["Submit to Accountant<br/>Portal"]
    end

    subgraph Manager_Pool["Manager"]
        MG_RECEIVE_WO["Receive Write-off<br/>Request"]
        MG_REVIEW_WO["Review Discrepancy<br/>Details"]
        MG_APPROVE_WO{"Approve<br/>Write-off?"}
        MG_REJECT_WO["Reject: Request<br/>Further Investigation"]
        MG_SIGN_WO["Approve and Sign<br/>Write-off"]
        MG_REVIEW_FINAL["Review Final<br/>Monthly Report"]
        MG_CLOSE_PERIOD["Approve Period<br/>Closure"]
    end

    subgraph External_Pool["External (Bank / Tax)"]
        EX_BANK_IMPORT["Import Bank<br/>Statements"]
        EX_PROVIDER_STMT["Download Payment<br/>Provider Statements"]
        EX_TAX_SUBMIT["Submit Tax Filing<br/>to Soliq.uz"]
        EX_TAX_CONFIRM["Receive Tax Filing<br/>Confirmation"]
        EX_END(("End:<br/>Period Closed"))
    end

    %% System flow
    SY_START --> SY_LOCK
    SY_LOCK --> SY_AGGREGATE
    SY_AGGREGATE --> SY_PARALLEL_START
    SY_PARALLEL_START --> SY_CALC_COMMISSION
    SY_PARALLEL_START --> SY_CALC_PAYROLL
    SY_PARALLEL_START --> SY_CASH_SUMMARY
    SY_PARALLEL_START --> SY_DIGITAL_SUMMARY
    SY_CALC_COMMISSION --> SY_PARALLEL_END
    SY_CALC_PAYROLL --> SY_PARALLEL_END
    SY_CASH_SUMMARY --> SY_PARALLEL_END
    SY_DIGITAL_SUMMARY --> SY_PARALLEL_END
    SY_PARALLEL_END --> SY_GEN_REPORT
    SY_GEN_REPORT --> SY_GEN_FISCAL
    SY_GEN_FISCAL --> SY_NOTIFY

    %% Accountant flow
    SY_NOTIFY --> AC_RECEIVE
    AC_RECEIVE --> AC_REVIEW
    AC_REVIEW --> EX_BANK_IMPORT
    AC_REVIEW --> EX_PROVIDER_STMT
    EX_BANK_IMPORT --> AC_PARALLEL_START
    EX_PROVIDER_STMT --> AC_PARALLEL_START
    AC_PARALLEL_START --> AC_VERIFY_CASH
    AC_PARALLEL_START --> AC_VERIFY_DIGITAL
    AC_PARALLEL_START --> AC_VERIFY_FISCAL
    AC_VERIFY_CASH --> AC_PARALLEL_END
    AC_VERIFY_DIGITAL --> AC_PARALLEL_END
    AC_VERIFY_FISCAL --> AC_PARALLEL_END
    AC_PARALLEL_END --> AC_RECONCILE
    AC_RECONCILE --> AC_DISCREPANCY

    AC_DISCREPANCY -->|Yes| AC_FLAG
    AC_FLAG --> AC_INVESTIGATE
    AC_INVESTIGATE --> AC_CLASSIFY
    AC_CLASSIFY -->|"Minor (under threshold)"| AC_MINOR_FIX
    AC_CLASSIFY -->|"Major (over threshold)"| AC_SUBMIT_WRITEOFF
    AC_MINOR_FIX --> AC_NO_ISSUES

    AC_DISCREPANCY -->|No| AC_NO_ISSUES

    %% Manager approval
    AC_SUBMIT_WRITEOFF --> MG_RECEIVE_WO
    MG_RECEIVE_WO --> MG_REVIEW_WO
    MG_REVIEW_WO --> MG_APPROVE_WO
    MG_APPROVE_WO -->|No| MG_REJECT_WO
    MG_REJECT_WO --> AC_INVESTIGATE
    MG_APPROVE_WO -->|Yes| MG_SIGN_WO
    MG_SIGN_WO --> AC_NO_ISSUES

    %% Tax filing
    AC_NO_ISSUES --> AC_PREPARE_TAX
    AC_PREPARE_TAX --> AC_SUBMIT_TAX
    AC_SUBMIT_TAX --> EX_TAX_SUBMIT
    EX_TAX_SUBMIT --> EX_TAX_CONFIRM

    %% Final closure
    AC_NO_ISSUES --> MG_REVIEW_FINAL
    MG_REVIEW_FINAL --> MG_CLOSE_PERIOD
    MG_CLOSE_PERIOD --> EX_TAX_CONFIRM
    EX_TAX_CONFIRM --> EX_END
```

---

### BPMN 5: Customer Complaint Resolution

**Opisanie / Описание:** Процесс обработки жалобы покупателя. Покупатель сканирует QR-код на вендинговом автомате и отправляет жалобу через Telegram-бота. Бот автоматически создает тикет и отправляет подтверждение. Менеджер службы поддержки классифицирует жалобу (возврат, ремонт, информация) и назначает действие. При необходимости ремонта создается задача на обслуживание. Система обрабатывает возврат средств при необходимости. Покупатель получает уведомление о решении и может оценить качество обслуживания. SLA контролируется таймером.

**Участники (Pools/Lanes):**
- Customer (Покупатель)
- Telegram Bot (Бот)
- Support Manager (Менеджер поддержки)
- Operator (Оператор)
- System (VendHub API)

**Ключевые события:**
- Start: Покупатель сканирует QR-код
- Intermediate: Timer Event -- SLA таймаут (24 часа), уведомления
- End: Жалоба закрыта, оценка получена

**Шлюзы:**
- Exclusive Gateway: Тип жалобы (Refund / Repair / Info)
- Exclusive Gateway: Возврат одобрен? (Да / Нет)
- Exclusive Gateway: SLA превышен? (Да / Нет)

```mermaid
flowchart TB
    subgraph Customer_Pool["Customer"]
        CU_START(("Start:<br/>Problem at Machine"))
        CU_SCAN["Scan QR Code<br/>on Machine"]
        CU_OPEN_BOT["Open Telegram<br/>Bot Chat"]
        CU_DESCRIBE["Describe Problem<br/>Attach Photo"]
        CU_CONFIRM_RECV["Receive Ticket<br/>Confirmation"]
        CU_WAIT["Wait for<br/>Resolution"]
        CU_RECEIVE_RESULT["Receive Resolution<br/>Notification"]
        CU_RATE["Rate Service<br/>Quality (1-5)"]
        CU_END(("End:<br/>Complaint Resolved"))
    end

    subgraph Bot_Pool["Telegram Bot"]
        TB_RECEIVE["Receive Customer<br/>Message"]
        TB_IDENTIFY["Identify Machine<br/>from QR Data"]
        TB_CREATE_TICKET["Create Complaint<br/>Ticket in System"]
        TB_SEND_CONFIRM["Send Confirmation<br/>with Ticket Number"]
        TB_SEND_UPDATE["Send Status<br/>Update to Customer"]
        TB_SEND_RESOLUTION["Send Resolution<br/>Details"]
        TB_REQUEST_RATING["Request Service<br/>Rating"]
    end

    subgraph Support_Pool["Support Manager"]
        SM_RECEIVE["Receive New<br/>Complaint Alert"]
        SM_REVIEW["Review Complaint<br/>Details and History"]
        SM_CLASSIFY{"Complaint<br/>Type?"}
        SM_REFUND_PATH["Initiate Refund<br/>Process"]
        SM_REPAIR_PATH["Create Maintenance<br/>Task"]
        SM_INFO_PATH["Prepare Information<br/>Response"]
        SM_REFUND_CHECK{"Refund<br/>Approved?"}
        SM_REJECT_REFUND["Reject Refund:<br/>Explain Reason"]
        SM_APPROVE_REFUND["Approve Refund<br/>Amount"]
        SM_ASSIGN_OPERATOR["Assign Operator<br/>for Repair"]
        SM_VERIFY_FIX["Verify Repair<br/>Completed"]
        SM_CLOSE_TICKET["Close Ticket<br/>with Resolution"]
    end

    subgraph Operator_Pool["Operator"]
        OP_RECEIVE_TASK["Receive Repair<br/>Task"]
        OP_DIAGNOSE["Visit Machine<br/>and Diagnose"]
        OP_EXECUTE_FIX["Execute Repair<br/>or Replace Part"]
        OP_SUBMIT_REPORT["Submit Repair<br/>Report with Photos"]
    end

    subgraph System_Pool["System"]
        SYS_SLA_TIMER["Start SLA Timer<br/>24h Deadline"]
        SYS_SLA_CHECK{"SLA<br/>Exceeded?"}
        SYS_ESCALATE["Escalate to<br/>Admin + Alert"]
        SYS_PROCESS_REFUND["Process Refund<br/>via Payment Provider"]
        SYS_UPDATE_STATS["Update Complaint<br/>Statistics"]
        SYS_UPDATE_RATING["Store Customer<br/>Rating"]
    end

    %% Customer starts
    CU_START --> CU_SCAN
    CU_SCAN --> CU_OPEN_BOT
    CU_OPEN_BOT --> CU_DESCRIBE

    %% Bot receives
    CU_DESCRIBE --> TB_RECEIVE
    TB_RECEIVE --> TB_IDENTIFY
    TB_IDENTIFY --> TB_CREATE_TICKET
    TB_CREATE_TICKET --> TB_SEND_CONFIRM
    TB_SEND_CONFIRM --> CU_CONFIRM_RECV
    CU_CONFIRM_RECV --> CU_WAIT

    %% SLA tracking
    TB_CREATE_TICKET --> SYS_SLA_TIMER
    SYS_SLA_TIMER --> SYS_SLA_CHECK
    SYS_SLA_CHECK -->|Yes| SYS_ESCALATE
    SYS_ESCALATE --> SM_RECEIVE
    SYS_SLA_CHECK -->|No| SM_RECEIVE

    %% Manager classification
    TB_CREATE_TICKET --> SM_RECEIVE
    SM_RECEIVE --> SM_REVIEW
    SM_REVIEW --> SM_CLASSIFY

    SM_CLASSIFY -->|Refund| SM_REFUND_PATH
    SM_CLASSIFY -->|Repair| SM_REPAIR_PATH
    SM_CLASSIFY -->|Info| SM_INFO_PATH

    %% Refund path
    SM_REFUND_PATH --> SM_REFUND_CHECK
    SM_REFUND_CHECK -->|No| SM_REJECT_REFUND
    SM_REJECT_REFUND --> SM_CLOSE_TICKET
    SM_REFUND_CHECK -->|Yes| SM_APPROVE_REFUND
    SM_APPROVE_REFUND --> SYS_PROCESS_REFUND
    SYS_PROCESS_REFUND --> SM_CLOSE_TICKET

    %% Repair path
    SM_REPAIR_PATH --> SM_ASSIGN_OPERATOR
    SM_ASSIGN_OPERATOR --> OP_RECEIVE_TASK
    OP_RECEIVE_TASK --> OP_DIAGNOSE
    OP_DIAGNOSE --> OP_EXECUTE_FIX
    OP_EXECUTE_FIX --> OP_SUBMIT_REPORT
    OP_SUBMIT_REPORT --> SM_VERIFY_FIX
    SM_VERIFY_FIX --> SM_CLOSE_TICKET

    %% Info path
    SM_INFO_PATH --> SM_CLOSE_TICKET

    %% Close and notify
    SM_CLOSE_TICKET --> TB_SEND_RESOLUTION
    SM_CLOSE_TICKET --> SYS_UPDATE_STATS
    TB_SEND_RESOLUTION --> CU_RECEIVE_RESULT
    CU_RECEIVE_RESULT --> TB_REQUEST_RATING
    TB_REQUEST_RATING --> CU_RATE
    CU_RATE --> SYS_UPDATE_RATING
    SYS_UPDATE_RATING --> CU_END

    %% Status updates during process
    SM_ASSIGN_OPERATOR -.->|Status: In Progress| TB_SEND_UPDATE
    TB_SEND_UPDATE -.-> CU_WAIT
```

---

### BPMN 6: Employee Trip Tracking

**Opisanie / Описание:** Процесс отслеживания рабочих поездок оператора. Оператор через мобильное приложение начинает поездку и включает трансляцию геолокации. Telegram-бот получает обновления GPS-координат, фиксирует остановки и контрольные точки маршрута. Система рассчитывает маршрут, детектирует аномалии (длительные остановки, отклонения от маршрута, превышение скорости) и формирует отчет по поездке. Менеджер отслеживает операторов в реальном времени на карте, просматривает завершенные поездки и утверждает отчеты.

**Участники (Pools/Lanes):**
- Operator (Мобильное приложение)
- Telegram Bot (Бот / GPS-приемник)
- System (VendHub API -- аналитика)
- Manager (Контроль и утверждение)

**Ключевые события:**
- Start: Оператор начинает поездку
- Intermediate: Signal Event -- обновление GPS, Error Event -- аномалия обнаружена
- End: Поездка завершена и утверждена

**Шлюзы:**
- Exclusive Gateway: Аномалия обнаружена? (Да / Нет)
- Exclusive Gateway: Тип аномалии (Long Stop / Route Deviation / Speed)
- Exclusive Gateway: Отчет одобрен? (Да / Нет)

```mermaid
flowchart TB
    subgraph Operator_Pool["Operator (Mobile App)"]
        OP_START(("Start:<br/>Begin Work Day"))
        OP_OPEN_APP["Open VendHub<br/>Mobile App"]
        OP_START_TRIP["Start Trip<br/>Enable GPS Sharing"]
        OP_DRIVING["Driving to<br/>Next Machine"]
        OP_ARRIVE_MACHINE["Arrive at Machine<br/>Auto Check-in"]
        OP_CHECKIN["Check-in:<br/>Scan Machine QR"]
        OP_PERFORM_TASK["Perform Task<br/>at Machine"]
        OP_CHECKOUT["Check-out:<br/>Complete Task"]
        OP_MORE{"More Machines<br/>on Route?"}
        OP_END_TRIP["End Trip<br/>Stop GPS Sharing"]
        OP_REVIEW_SUMMARY["Review Trip<br/>Summary"]
        OP_SUBMIT_TRIP["Submit Trip<br/>Report"]
        OP_EXPLAIN["Provide Explanation<br/>for Anomaly"]
        OP_END(("End:<br/>Trip Approved"))
    end

    subgraph Bot_Pool["Telegram Bot / GPS"]
        BT_RECEIVE_LOC["Receive Location<br/>Update"]
        BT_LOG_POINT["Log GPS Point<br/>with Timestamp"]
        BT_DETECT_STOP{"Vehicle<br/>Stopped?"}
        BT_LOG_STOP["Log Stop Event:<br/>Location + Duration"]
        BT_DETECT_MOVE["Detect Movement<br/>Resumed"]
        BT_SEND_ARRIVAL["Send Arrival<br/>Notification"]
        BT_FORWARD_DATA["Forward All Data<br/>to API"]
    end

    subgraph System_Pool["System (VendHub API)"]
        SYS_RECEIVE_DATA["Receive GPS<br/>Data Stream"]
        SYS_CALC_ROUTE["Calculate Actual<br/>Route Traveled"]
        SYS_COMPARE["Compare Actual vs<br/>Planned Route"]
        SYS_ANOMALY{"Anomaly<br/>Detected?"}
        SYS_ANOMALY_TYPE{"Anomaly<br/>Type?"}
        SYS_LONG_STOP["Flag: Unplanned<br/>Long Stop"]
        SYS_DEVIATION["Flag: Route<br/>Deviation"]
        SYS_SPEED["Flag: Speed<br/>Violation"]
        SYS_ALERT["Send Alert to<br/>Manager"]
        SYS_RECORD_TRIP["Record Trip<br/>Points in DB"]
        SYS_CALC_DISTANCE["Calculate Total<br/>Distance + Time"]
        SYS_CALC_FUEL["Estimate Fuel<br/>Consumption"]
        SYS_GEN_REPORT["Generate Trip<br/>Report"]
        SYS_NO_ANOMALY["Trip Within<br/>Normal Parameters"]
    end

    subgraph Manager_Pool["Manager"]
        MG_LIVE_MAP["Monitor Live Map<br/>All Active Operators"]
        MG_RECEIVE_ALERT["Receive Anomaly<br/>Alert"]
        MG_INVESTIGATE["Review Anomaly<br/>Details on Map"]
        MG_CONTACT{"Contact<br/>Operator?"}
        MG_SEND_MESSAGE["Send Message<br/>via Telegram"]
        MG_NOTE["Add Note<br/>to Trip Record"]
        MG_REVIEW_TRIP["Review Completed<br/>Trip Report"]
        MG_TRIP_OK{"Report<br/>Approved?"}
        MG_REQUEST_EXPLAIN["Request Explanation<br/>for Discrepancies"]
        MG_APPROVE["Approve Trip<br/>Report"]
        MG_END(("End:<br/>Report Filed"))
    end

    %% Operator starts
    OP_START --> OP_OPEN_APP
    OP_OPEN_APP --> OP_START_TRIP

    %% GPS tracking loop
    OP_START_TRIP --> OP_DRIVING
    OP_DRIVING --> BT_RECEIVE_LOC
    BT_RECEIVE_LOC --> BT_LOG_POINT
    BT_LOG_POINT --> BT_DETECT_STOP
    BT_DETECT_STOP -->|Yes| BT_LOG_STOP
    BT_LOG_STOP --> BT_DETECT_MOVE
    BT_DETECT_MOVE --> BT_FORWARD_DATA
    BT_DETECT_STOP -->|No| BT_FORWARD_DATA

    %% Machine arrival
    OP_DRIVING --> OP_ARRIVE_MACHINE
    OP_ARRIVE_MACHINE --> BT_SEND_ARRIVAL
    BT_SEND_ARRIVAL --> OP_CHECKIN
    OP_CHECKIN --> OP_PERFORM_TASK
    OP_PERFORM_TASK --> OP_CHECKOUT
    OP_CHECKOUT --> OP_MORE
    OP_MORE -->|Yes| OP_DRIVING
    OP_MORE -->|No| OP_END_TRIP

    %% System analysis
    BT_FORWARD_DATA --> SYS_RECEIVE_DATA
    SYS_RECEIVE_DATA --> SYS_CALC_ROUTE
    SYS_CALC_ROUTE --> SYS_COMPARE
    SYS_COMPARE --> SYS_ANOMALY

    SYS_ANOMALY -->|Yes| SYS_ANOMALY_TYPE
    SYS_ANOMALY_TYPE -->|Long Stop| SYS_LONG_STOP
    SYS_ANOMALY_TYPE -->|Deviation| SYS_DEVIATION
    SYS_ANOMALY_TYPE -->|Speed| SYS_SPEED
    SYS_LONG_STOP --> SYS_ALERT
    SYS_DEVIATION --> SYS_ALERT
    SYS_SPEED --> SYS_ALERT
    SYS_ALERT --> MG_RECEIVE_ALERT
    SYS_ALERT --> SYS_RECORD_TRIP

    SYS_ANOMALY -->|No| SYS_NO_ANOMALY
    SYS_NO_ANOMALY --> SYS_RECORD_TRIP

    %% Trip completion
    OP_END_TRIP --> SYS_RECORD_TRIP
    SYS_RECORD_TRIP --> SYS_CALC_DISTANCE
    SYS_CALC_DISTANCE --> SYS_CALC_FUEL
    SYS_CALC_FUEL --> SYS_GEN_REPORT
    SYS_GEN_REPORT --> OP_REVIEW_SUMMARY
    OP_REVIEW_SUMMARY --> OP_SUBMIT_TRIP

    %% Manager live monitoring
    OP_START_TRIP -.->|Live GPS Feed| MG_LIVE_MAP

    %% Manager handles alerts
    MG_RECEIVE_ALERT --> MG_INVESTIGATE
    MG_INVESTIGATE --> MG_CONTACT
    MG_CONTACT -->|Yes| MG_SEND_MESSAGE
    MG_SEND_MESSAGE --> MG_NOTE
    MG_CONTACT -->|No| MG_NOTE

    %% Manager reviews completed trips
    OP_SUBMIT_TRIP --> MG_REVIEW_TRIP
    MG_REVIEW_TRIP --> MG_TRIP_OK
    MG_TRIP_OK -->|No| MG_REQUEST_EXPLAIN
    MG_REQUEST_EXPLAIN --> OP_EXPLAIN
    OP_EXPLAIN --> MG_REVIEW_TRIP
    MG_TRIP_OK -->|Yes| MG_APPROVE
    MG_APPROVE --> OP_END
    MG_APPROVE --> MG_END
```
