# Промт для создания идеальной финальной версии объединённой документации интерфейса VendHub OS

**Версия:** 1.0
**Дата:** 26 января 2026
**Автор:** Claude AI
**Назначение:** Генерация комплексной унифицированной документации UI/UX

---

## 🎯 Цель

Создать **идеальную финальную версию** объединённой документации интерфейса проекта VendHub OS (VHM24), которая:

1. **Объединяет** существующие документы в единый согласованный источник истины
2. **Интегрирует** Master Data Management спецификацию как ядро системы справочников
3. **Детализирует** каждый компонент UI с точностью до пикселя и состояния
4. **Обеспечивает** полную трассируемость от UX-паттерна до API-эндпоинта

---

## 📋 Входные документы для анализа

| Документ | Описание | Приоритет |
|----------|----------|-----------|
| `VHM24_Master_Data_Specification_v1.0.md` | Основная техническая спецификация MDM | 🔴 Критический |
| `VHM24_Master_Data_Appendix_E_NestJS_Backend.md` | TypeORM entities, services, controllers | 🔴 Критический |
| `VHM24_Master_Data_Appendix_F_React_Frontend.md` | React компоненты, hooks, stores | 🔴 Критический |
| `VHM24_Master_Data_Appendix_B_JSONB_Examples.md` | Все JSONB структуры данных | 🟡 Важный |
| `VHM24_Master_Data_Appendix_C_Diagrams.md` | Mermaid диаграммы (ERD, flows) | 🟡 Важный |
| `VHM24_Master_Data_Appendix_D_Checklist.md` | 100+ пунктов чеклиста внедрения | 🟢 Справочный |
| `UI_UX_SPECIFICATION.md` | UI/UX спецификация v1.0 | 🔴 Критический |
| `VENDHUB_UI_DOCUMENTATION_COMPLETE.md` | Текущая документация v2.1.0 | 🔴 Критический |

---

## 📐 Структура идеальной документации

### РАЗДЕЛ 1: ОБЗОР СИСТЕМЫ (Executive Summary)

```markdown
## 1.1 Введение и назначение
- Бизнес-контекст: Enterprise-платформа управления сетью торговых автоматов
- Целевая аудитория: Операторы, менеджеры, владельцы вендинговых сетей
- Ключевые ценности: Автоматизация, прозрачность, масштабируемость

## 1.2 Глобальная архитектура
┌──────────────────────────────────────────────────────────────────┐
│                    VENDHUB OS ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  WEB ADMIN  │  │ CLIENT PWA  │  │MOBILE STAFF │  │TELEGRAM │ │
│  │  Next.js 16 │  │ Vite+React  │  │React Native │  │Telegraf │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬────┘ │
│         │                │                │               │      │
│         └────────────────┴────────────────┴───────────────┘      │
│                                  │                               │
│                    ┌─────────────▼─────────────┐                 │
│                    │      NestJS 11 API        │                 │
│                    │    222+ REST Endpoints    │                 │
│                    │    + Master Data Module   │                 │
│                    └─────────────┬─────────────┘                 │
│                                  │                               │
│         ┌────────────────────────┼────────────────────────┐      │
│         ▼                        ▼                        ▼      │
│   ┌──────────┐          ┌────────────────┐         ┌──────────┐  │
│   │PostgreSQL│          │    Redis       │         │S3/R2     │  │
│   │ 40+ таблиц│          │ Cache + Queue  │         │ Files    │  │
│   └──────────┘          └────────────────┘         └──────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

## 1.3 Технологический стек (точные версии)
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Web | Next.js | 16 | SSR Admin Dashboard |
| Frontend Mobile | React Native + Expo | 0.76 / 50 | Staff Mobile App |
| Frontend Client | Vite + React | 6 / 19 | Customer PWA |
| Backend | NestJS + TypeORM | 11 / 0.3 | REST API |
| Database | PostgreSQL | 16 | Primary RDBMS |
| Cache | Redis | 7 | Caching + Queues |
| UI Kit | shadcn/ui + Radix UI | latest | Component Library |
| State | TanStack Query + Zustand | 5 / 4 | Client State |
| Charts | Recharts | 2 | Data Visualization |
| Forms | React Hook Form + Zod | 7 / 3 | Form Management |
| Icons | Lucide React | latest | Icon System |

## 1.4 Роли и права доступа (7-уровневая RBAC)
- OWNER (100): Полный доступ, управление организациями
- ADMIN (90): Управление пользователями, настройки системы
- MANAGER (70): Операционное управление, отчёты
- ACCOUNTANT (50): Финансовые отчёты, фискализация
- WAREHOUSE (40): Управление складом
- OPERATOR (30): Выполнение задач, инвентарь
- VIEWER (10): Только просмотр
- TECHNICIAN (25): Техобслуживание (специальная роль)
```

### РАЗДЕЛ 2: MASTER DATA MANAGEMENT (Ядро системы)

```markdown
## 2.1 Концепция справочников

### 2.1.1 Типы справочников
| Тип | Код | Описание | Примеры |
|-----|-----|----------|---------|
| MANUAL | manual | Внутренний, ручной | Товары, Локации, Автоматы |
| EXTERNAL | external | Внешний, auto-sync | ИКПУ, МФО банков |
| PARAM | param | Параметрический | Категории, Единицы измерения |
| TEMPLATE | template | Из шаблона | Клонированные справочники |

### 2.1.2 OFFICIAL vs LOCAL происхождение
┌─────────────────────────────────────────┐
│           EXTERNAL Directory            │
├─────────────────────────────────────────┤
│  🛡️ OFFICIAL Layer (read-only)         │
│  ├── Запись 1 (из внешнего источника)  │
│  └── Запись N (из внешнего источника)  │
├─────────────────────────────────────────┤
│  ✍️ LOCAL Layer (editable)              │
│  └── Записи, добавленные вручную       │
└─────────────────────────────────────────┘

Визуальная маркировка:
- 🛡️ Щит = OFFICIAL (синий badge)
- ✍️ Карандаш = LOCAL (серый badge)

## 2.2 Directory Builder Wizard (6 шагов)

### Шаг 1: Выбор типа
UI: Radio cards с иконками и описаниями
- MANUAL — "Вы ведёте данные самостоятельно"
- EXTERNAL — "Данные загружаются из внешнего источника"
- PARAM — "Источник значений для полей других справочников"
- FROM TEMPLATE — "Создать на основе готового шаблона"

### Шаг 2: Базовая информация
Поля формы:
- Название (text, required, max 255)
- Код/slug (text, required, pattern: ^[a-z][a-z0-9_]*$)
- Описание (textarea, max 1000)
- Scope (select: HQ / Organization / Location)
- Иконка (icon picker)

### Шаг 3: Конструктор полей (Field Builder)
UI: Drag-and-drop список с live preview
Типы полей:
| Тип | UI Component | Data Format |
|-----|--------------|-------------|
| TEXT | Input | "string" |
| NUMBER | Input[type=number] | 123 |
| DATE | DatePicker | "2024-01-15" |
| DATETIME | DateTimePicker | "2024-01-15T10:30:00Z" |
| BOOLEAN | Switch | true/false |
| SELECT_SINGLE | DirectorySelect | "uuid" |
| SELECT_MULTI | DirectorySelect[multiple] | ["uuid1", "uuid2"] |
| REF | DirectorySelect | "uuid" |
| JSON | JSONEditor | {...} |
| FILE | FileUpload | {file_id, url, name} |
| IMAGE | ImageUpload | {file_id, url, thumb} |

Настройки поля:
- is_required: boolean
- is_unique: boolean
- show_in_list: boolean
- show_in_card: boolean
- validation_rules: JSON

### Шаг 4: Источник данных (только для EXTERNAL)
UI: Conditional panel
- source_type: URL / API / FILE / TEXT
- url / endpoint: Input
- auth_config: {type, credentials}
- column_mapping: Drag-and-drop mapper
- unique_key_field: Select
- schedule: Cron expression input
- [Test Connection] button

### Шаг 5: Настройки использования
Toggles:
- allow_inline_create: boolean (default: true)
- allow_local_overlay: boolean (default: true)
- approval_required: boolean (default: false)
- prefetch: boolean (default: false)
- offline_enabled: boolean (default: false)
- offline_max_entries: number (default: 1000)

### Шаг 6: Права доступа
Matrix table:
| Роль | View | Create | Edit | Archive | Import | Sync |
|------|------|--------|------|---------|--------|------|
| Owner/Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Operator | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

## 2.3 DirectorySelect Component (Autocomplete with Inline Create)

### States
1. **Closed** — Button с выбранным значением или placeholder
2. **Open/Empty** — Dropdown с recent selections
3. **Open/Searching** — Loading spinner + debounced results
4. **Open/Results** — Список результатов с группировкой
5. **Open/NoResults** — "Ничего не найдено" + Inline Create option

### Anatomy
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Поиск...                                     [Loading]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ НЕДАВНИЕ                                                    │
│   🛡️ Услуги связи (17101001)                      [⏰ 2m]  │
│   ✍️ Кофе (наш) (CUSTOM01)                        [⏰ 1d]  │
│                                                             │
│ РЕЗУЛЬТАТЫ ПОИСКА                                           │
│   🛡️ Продукты питания (17101002)                           │
│   🛡️ Товары для дома (17101003)                            │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ ➕ Добавить "..." как локальную запись                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### API Integration
- GET /api/directories/:id/entries/search?q={query}&include_recent=true
- POST /api/directories/:id/entries (Inline Create)
- POST /users/me/recent-selections/:directoryId (Record selection)

## 2.4 EntryList Component (Table View)

### Columns
- Checkbox (bulk selection)
- Name (with origin badge)
- Code
- Origin (OFFICIAL/LOCAL)
- Dynamic fields (from directory.fields where show_in_list=true)
- Actions (MoreHorizontal dropdown)

### Actions
- View (Eye icon) → Navigate to entry card
- Edit (Edit icon) → Entry form (disabled for OFFICIAL)
- Archive (Archive icon) → Soft delete (disabled for OFFICIAL)

### Bulk Actions
- Change category
- Add tags
- Archive selected

## 2.5 EntryTree Component (Hierarchical View)

### For is_hierarchical=true directories
UI: TreeView with expand/collapse
- Lazy loading of children
- Drag-and-drop reordering
- Cycle detection UI warning

## 2.6 Import Wizard (AI-Powered)

### 4-Step Flow
1. **Upload** — File dropzone (xlsx, csv)
2. **Mapping** — Column mapping with auto-detection
3. **Preview** — First 10 rows validation
4. **Process** — Progress bar + results

### Import Modes
- CREATE_ONLY — Только создание новых
- UPSERT — Создание + обновление
- UPDATE_ONLY — Только обновление существующих
- DRY_RUN — Проверка без записи

### AI Agents (from UI_UX_SPECIFICATION)
- Document Classification Agent
- Schema Mapping Agent
- Data Extraction Agent
- Validation Agent
- Reference Resolution Agent
- Reconciliation Agent
- Learning Agent
```

### РАЗДЕЛ 3: WEB ADMIN DASHBOARD (20 экранов)

```markdown
## 3.1 Навигационная структура

### Sidebar Navigation
📊 ОБЗОР
├── /dashboard — Dashboard (KPI, графики)
└── /dashboard/analytics — Аналитика (в разработке)

🤖 АВТОМАТЫ
├── /dashboard/machines — Список автоматов
└── /dashboard/locations — Локации

📦 ТОВАРЫ
├── /dashboard/products — Каталог товаров
└── /dashboard/inventory — 3-уровневый инвентарь

✅ ОПЕРАЦИИ
├── /dashboard/tasks — Задачи (Kanban)
├── /dashboard/orders — Заказы
├── /dashboard/maintenance — Техобслуживание
├── /dashboard/material-requests — Заявки на материалы
└── /dashboard/complaints — Жалобы клиентов

👥 ПЕРСОНАЛ
├── /dashboard/employees — Сотрудники
├── /dashboard/contractors — Подрядчики
├── /dashboard/work-logs — Табель рабочего времени
└── /dashboard/users — Пользователи системы

💰 ФИНАНСЫ
├── /dashboard/reports — Отчёты и аналитика
└── /dashboard/fiscal — Фискализация (MultiKassa)

⚙️ СИСТЕМА
├── /dashboard/integrations — Интеграции
├── /dashboard/settings — Настройки
├── /dashboard/audit — Аудит действий
└── /dashboard/notifications — Уведомления

## 3.2 Детализация каждого экрана

### 3.2.1 Auth Page (/auth)
[Полная спецификация из VENDHUB_UI_DOCUMENTATION_COMPLETE.md]
- Layout: Centered card
- Components: Logo, Form, Forgot password link
- States: Initial, Loading, Error, 2FA prompt
- API: POST /api/v1/auth/login, POST /api/v1/auth/2fa/verify

### 3.2.2 Dashboard (/dashboard)
[Полная спецификация с KPI cards, Charts, Recent activity]

### 3.2.3 Machines (/dashboard/machines)
[DataTable + Map View + Machine Card]

### 3.2.4 Products (/dashboard/products)
[DirectorySelect integration, Category hierarchy]

... [Все 20 экранов с детализацией]
```

### РАЗДЕЛ 4: MOBILE STAFF APP (React Native)

```markdown
## 4.1 Структура приложения
- Bottom Tab Navigator: Tasks, Map, Inventory, Profile
- Stack Navigators для каждого Tab

## 4.2 Оффлайн режим
- IndexedDB/AsyncStorage для справочников
- Conflict resolution UI
- Sync status indicator

## 4.3 Экраны и компоненты
[Детализация всех экранов с учётом placeholder'ов]
```

### РАЗДЕЛ 5: CLIENT PWA (Vite + React)

```markdown
## 5.1 Покупательский интерфейс
- Каталог товаров
- Оформление заказа
- Программа лояльности
- История заказов

## 5.2 TWA (Telegram Web App)
- Интеграция с Telegram
- Telegram-специфичные UI адаптации
```

### РАЗДЕЛ 6: TELEGRAM BOT (Telegraf)

```markdown
## 6.1 Команды (11 штук)
/start, /help, /status, /tasks, /inventory, /report, /incidents, /schedule, /location, /settings, /cart

## 6.2 Callback Handlers (45+)
[Полный список с описанием]

## 6.3 Inline Keyboards
[Структуры клавиатур для каждого flow]
```

### РАЗДЕЛ 7: DESIGN SYSTEM ("Warm Brew")

```markdown
## 7.1 Цветовая палитра
:root {
  /* Espresso & Caramel */
  --espresso-900: oklch(0.22 0.02 50);
  --caramel-500: oklch(0.65 0.12 65);
  --cream-100: oklch(0.96 0.01 90);

  /* Semantic */
  --primary: var(--caramel-500);
  --background: var(--cream-100);
  --foreground: var(--espresso-900);

  /* Status */
  --success: oklch(0.65 0.15 145);
  --warning: oklch(0.75 0.15 85);
  --error: oklch(0.55 0.20 25);
}

## 7.2 Типографика
- Font: Inter (Google Fonts)
- Weights: 400, 500, 600, 700
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48

## 7.3 Компоненты shadcn/ui
[Список используемых компонентов с кастомизациями]

## 7.4 Иконки (Lucide React)
[Соглашения по использованию иконок]
```

### РАЗДЕЛ 8: API REFERENCE

```markdown
## 8.1 Модули API (20 модулей, 222+ endpoints)
| Модуль | Эндпоинтов | Описание |
|--------|------------|----------|
| Auth | 21 | Аутентификация, 2FA |
| Users | 16 | Управление пользователями |
| Organizations | 12 | Организации |
| Machines | 18 | Автоматы |
| Products | 22 | Товары |
| Tasks | 15 | Задачи |
| Orders | 13 | Заказы |
| Transactions | 11 | Транзакции |
| Inventory | 14 | Инвентарь |
| Locations | 8 | Локации |
| Employees | 9 | Сотрудники |
| Reports | 7 | Отчёты |
| Notifications | 6 | Уведомления |
| Settings | 5 | Настройки |
| Audit | 4 | Аудит |
| Files | 10 | Файлы |
| AI | 12 | AI-модули |
| Telegram | 8 | Telegram интеграция |
| Fiscal | 6 | Фискализация |
| Directories | 15+ | Master Data |

## 8.2 Формат ответов
{
  "success": true,
  "data": {...},
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}

## 8.3 Error Codes
[Полный список кодов ошибок MDM]
```

### РАЗДЕЛ 9: FLOWS И ДИАГРАММЫ

```markdown
## 9.1 Mermaid диаграммы (из Appendix C)
- ER Diagram
- Entry Status Workflow
- Sync Flow
- Import Flow
- Inline Create Flow
- RBAC Resolution
- Webhook Delivery
- Search Ranking
- Offline Sync
- Architecture Overview
- Directory Types
- Migration Gantt

## 9.2 User Journey Maps
[Основные пользовательские сценарии]
```

### РАЗДЕЛ 10: ЧЕКЛИСТ ВНЕДРЕНИЯ

```markdown
## 10.1 Database (PostgreSQL)
- [ ] Extensions: uuid-ossp, unaccent, pg_trgm
- [ ] 12 enum types
- [ ] 15 tables
- [ ] Triggers and functions
- [ ] Indexes (GIN, trigram, JSONB)

## 10.2 Backend (NestJS)
- [ ] 12 modules
- [ ] 16 entities
- [ ] 9 DTOs
- [ ] 12 services
- [ ] 5 controllers
- [ ] Guards & Interceptors
- [ ] Background jobs

## 10.3 Frontend (React)
- [ ] DirectorySelect component
- [ ] InlineCreateModal
- [ ] EntryList (table view)
- [ ] EntryTree (tree view)
- [ ] ImportWizard
- [ ] Hooks: useDirectory, useEntries, useSearch, useLocalized
- [ ] Stores: directoriesStore, entriesStore, offlineStore

## 10.4 Testing
- [ ] Unit tests (validators, functions)
- [ ] Integration tests (CRUD, search, import)
- [ ] E2E tests (user flows)
- [ ] Performance tests (100k+ entries)
- [ ] Security tests (RBAC, injection)
```

---

## 🔧 Инструкции по генерации

### Шаг 1: Анализ исходных документов
```
1. Прочитать полностью VHM24_Master_Data_Specification_v1.0.md
2. Извлечь все JSONB структуры из Appendix_B
3. Интегрировать диаграммы из Appendix_C
4. Сопоставить backend (Appendix_E) и frontend (Appendix_F)
5. Сверить с существующей документацией VENDHUB_UI_DOCUMENTATION_COMPLETE.md
6. Учесть UI_UX_SPECIFICATION.md для дизайн-системы
```

### Шаг 2: Структурирование
```
1. Создать единую иерархию разделов
2. Избежать дублирования информации
3. Обеспечить cross-references между разделами
4. Добавить якорные ссылки для навигации
```

### Шаг 3: Детализация UI
```
Для каждого экрана/компонента описать:
1. Путь (route)
2. Доступ (роли)
3. Layout (wireframe ASCII или описание)
4. Компоненты (с версиями)
5. States (все возможные состояния)
6. API endpoints
7. Валидация (правила)
8. Error handling
9. Loading states
10. Empty states
```

### Шаг 4: Верификация
```
1. Проверить соответствие кодовой базе
2. Убедиться в полноте API endpoints
3. Валидировать JSONB структуры
4. Проверить корректность диаграмм
```

---

## 📊 Метрики качества документации

| Критерий | Целевое значение |
|----------|------------------|
| Полнота покрытия экранов | 100% |
| Детализация API | Все 222+ endpoints |
| JSONB структуры | Все типы с примерами |
| Диаграммы | 12+ Mermaid диаграмм |
| Cross-references | 100% связность |
| Языки | Русский (основной) + English (technical terms) |
| Объём | 150-200 страниц |
| Версионирование | SemVer (3.0.0) |

---

## 🏷️ Теги и метаданные

```yaml
document:
  title: "VendHub OS — Unified UI/UX Documentation"
  version: "3.0.0"
  date: "2026-01-26"
  status: "Final"
  languages: ["ru", "en"]

project:
  name: "VendHub OS (VHM24)"
  type: "Enterprise Vending Platform"
  stack:
    frontend: ["Next.js 16", "React Native 0.76", "Vite + React"]
    backend: ["NestJS 11", "TypeORM", "PostgreSQL 16"]
    ui: ["shadcn/ui", "Radix UI", "Tailwind CSS"]

modules:
  - name: "Master Data Management"
    status: "Core"
    priority: "Critical"
  - name: "Web Admin Dashboard"
    status: "Production"
    screens: 20
  - name: "Mobile Staff App"
    status: "Development"
    screens: 15
  - name: "Client PWA"
    status: "Production"
    screens: 10
  - name: "Telegram Bot"
    status: "Production"
    commands: 11
```

---

## ✅ Контрольный чеклист генерации

- [ ] Все 8 входных документов проанализированы
- [ ] Структура из 10 разделов создана
- [ ] MDM интегрирован как ядро
- [ ] 20 экранов Web Admin детализированы
- [ ] Mobile App документирован с учётом placeholder'ов
- [ ] API Reference содержит 222+ endpoints
- [ ] Design System "Warm Brew" описан
- [ ] Все Mermaid диаграммы включены
- [ ] JSONB структуры с примерами
- [ ] Чеклист внедрения из 100+ пунктов

---

**Конец промта**

*Используйте этот промт как руководство для генерации финальной объединённой документации интерфейса VendHub OS.*
