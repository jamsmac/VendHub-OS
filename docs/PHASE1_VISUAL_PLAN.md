# Phase 1: Payment Reports → Transactions Pipeline

> Визуальный план превращения загруженных платёжных отчётов в единую базу транзакций

---

## 1. Проблема (сейчас)

```mermaid
flowchart LR
    subgraph "Загрузка работает ✅"
        A["📄 Payme XLSX"] --> P[Парсинг]
        B["📄 Click CSV"] --> P
        C["📄 Kassa XLSX"] --> P
        D["📄 VendHub CSV"] --> P
    end

    P --> R["payment_report_rows\n(отдельная таблица)"]

    subgraph "Разрыв ❌"
        R -.-x T["transactions\n(единая база продаж)"]
    end

    T --> AN[Аналитика]
    T --> EX[Расходы]
    T --> TA[Авто-задачи]

    style R fill:#ff6b6b,color:white
    style T fill:#51cf66,color:white
```

**Данные застревают в `payment_report_rows` и не попадают в `transactions`.**
Без этого невозможны: расчёт расходов, автозадачи, аналитика продаж.

---

## 2. Решение (целевое)

```mermaid
flowchart TD
    subgraph "ШАГ 1: Загрузка (уже работает)"
        A["📄 Файл отчёта\nPayme / Click / Kassa / VendHub"]
        -->|"POST /payment-reports/upload"| B["🔍 Авто-определение\nформата (confidence)"]
        B --> C["📊 Парсинг\n+ дедупликация SHA-256"]
        C --> D[("💾 payment_report_rows\nexternalId, machineCode,\namount, paymentTime,\npaymentMethod")]
    end

    subgraph "ШАГ 2: Импорт (НОВОЕ)"
        D -->|"Кнопка 'Импорт'\nPOST /:id/import"| E["🔄 PaymentReportImportService"]
        E --> F["📋 Конвертация\nPaymentReportRow → HwImportedSale"]
        F --> G["🏭 Резолв машин\nmachineCode → machineId"]
        G --> H["💰 Создание Transaction\ntype=SALE, status=COMPLETED"]
        H --> I[("💾 transactions\nединая база продаж")]
    end

    subgraph "ШАГ 3: Верификация"
        I --> J["✅ Сверка\nReconciliationService"]
        J --> K["📊 Dashboard\nОтчёты, аналитика"]
    end

    style E fill:#4dabf7,color:white
    style I fill:#51cf66,color:white
```

---

## 3. Поток данных (детально)

```mermaid
flowchart TD
    A["👤 Бухгалтер загрузил\nPayme отчёт (XLSX)"]

    A --> B{"Файл уже загружался?\n(SHA-256 hash)"}
    B -->|Да| B1["❌ Дубликат файла"]
    B -->|Нет| C["🔍 Определить формат\nPayme: 85% confidence"]

    C --> D["📊 Парсинг строк\nСУММА БЕЗ КОМИССИИ → amount\nВРЕМЯ ОПЛАТЫ → paymentTime\nНОМЕР ЗАКАЗА → orderNumber"]

    D --> E{"Дубликат строки?\n(externalId + reportType)"}
    E -->|Да| E1["⚠️ isDuplicate = true"]
    E -->|Нет| F["✅ PaymentReportRow создан\nStatus: COMPLETED"]

    F --> G["👤 Бухгалтер нажимает\n'Импорт в транзакции'"]

    G --> H["📋 Загрузить строки\nWHERE isDuplicate=false\nAND isImported=false"]

    H --> I["🏭 Batch резолв машин\nSELECT id, machine_number\nFROM machines\nWHERE organization_id = :orgId\n\n→ Map<code, machineId>"]

    I --> J{"machineCode\nнайден?"}
    J -->|Нет| J1["⚠️ importError =\n'machine_not_found'"]
    J -->|Да| K{"Transaction с таким\npaymentId уже есть?"}

    K -->|Да| K1["⚠️ Пропуск\n(дубликат транзакции)"]
    K -->|Нет| L["✅ CREATE Transaction\ntype = SALE\nstatus = COMPLETED\namount = row.amount\npaymentMethod = mapped\nmachineId = resolved\ntransactionDate = paymentTime\npaymentId = orderNumber"]

    L --> M["🔗 Связать:\nrow.isImported = true\nrow.importedTransactionId = txn.id\nhwSale.transactionId = txn.id"]

    M --> N["📊 Обновить upload:\nimportedRows++\nimportedAt = now()"]

    N --> O["✅ ГОТОВО\n{imported: 14, errors: 0}"]

    style L fill:#51cf66,color:white
    style O fill:#51cf66,color:white
    style J1 fill:#ff6b6b,color:white
    style B1 fill:#ff6b6b,color:white
```

---

## 4. Маппинг платёжных методов

```mermaid
flowchart LR
    subgraph "Из файла отчёта"
        direction TB
        R1["'UZCARD' / 'Узкард'"]
        R2["'HUMO' / 'Хумо'"]
        R3["'Карта' / 'card'"]
        R4["'Наличные' / 'cash'"]
        R5["'Click'"]
        R6["'Payme'"]
        R7["'QR'"]
        R8["NULL / пусто"]
    end

    subgraph "PaymentMethod enum"
        direction TB
        E1["UZCARD"]
        E2["HUMO"]
        E3["CARD"]
        E4["CASH"]
        E5["CLICK"]
        E6["PAYME"]
        E7["QR"]
        E8["CARD ← fallback"]
    end

    R1 --> E1
    R2 --> E2
    R3 --> E3
    R4 --> E4
    R5 --> E5
    R6 --> E6
    R7 --> E7
    R8 --> E8
```

---

## 5. Резолв кода машины

```mermaid
flowchart TD
    A["machineCode из отчёта\nнапример: 'M-001'"]

    A --> B["Batch запрос ОДИН раз:\nSELECT id, machine_number, serial_number\nFROM machines\nWHERE organization_id = :orgId\nAND deleted_at IS NULL"]

    B --> C["Map #1: machine_number → id\n'M-001' → 'uuid-abc'\n'M-002' → 'uuid-def'"]

    B --> D["Map #2: serial_number → id\n'SN12345' → 'uuid-abc'\n'SN67890' → 'uuid-def'"]

    A --> E{"Поиск в Map #1\nпо machineNumber"}
    E -->|"Найден ✅"| F["machineId = uuid"]
    E -->|"Не найден"| G{"Поиск в Map #2\nпо serialNumber"}
    G -->|"Найден ✅"| F
    G -->|"Не найден ❌"| H["machineId = NULL\nimportError = 'machine_not_found'"]

    style F fill:#51cf66,color:white
    style H fill:#ff6b6b,color:white
```

---

## 6. Таблицы и связи (ER-диаграмма)

```mermaid
erDiagram
    PAYMENT_REPORT_UPLOADS ||--o{ PAYMENT_REPORT_ROWS : "содержит"
    PAYMENT_REPORT_ROWS ||--o| HW_IMPORTED_SALES : "конвертируется в"
    HW_IMPORTED_SALES ||--o| TRANSACTIONS : "создаёт"
    MACHINES ||--o{ TRANSACTIONS : "принадлежит"

    PAYMENT_REPORT_UPLOADS {
        uuid id PK
        uuid organization_id FK
        varchar file_name
        enum report_type "PAYME|CLICK|KASSA|VENDHUB"
        enum status "COMPLETED"
        int total_rows
        int imported_rows "← НОВОЕ"
        int import_errors "← НОВОЕ"
        timestamp imported_at "← НОВОЕ"
    }

    PAYMENT_REPORT_ROWS {
        uuid id PK
        uuid upload_id FK
        varchar external_id
        varchar order_number
        timestamp payment_time
        decimal amount
        varchar payment_method
        varchar machine_code
        boolean is_duplicate
        boolean is_imported "← НОВОЕ"
        uuid imported_transaction_id "← НОВОЕ"
        text import_error "← НОВОЕ"
    }

    HW_IMPORTED_SALES {
        uuid id PK
        uuid import_batch_id
        timestamp sale_date
        varchar machine_code
        uuid machine_id "← заполняется при импорте"
        decimal amount
        varchar order_number
        uuid transaction_id "← заполняется при создании Transaction"
        boolean is_reconciled
    }

    TRANSACTIONS {
        uuid id PK
        uuid organization_id FK
        uuid machine_id FK
        enum type "SALE"
        enum status "COMPLETED"
        decimal amount
        enum payment_method "PAYME|CLICK|UZCARD..."
        timestamp transaction_date
        varchar payment_id "= orderNumber (для дедупликации)"
        jsonb metadata "sourceUploadId, sourceRowId"
    }

    MACHINES {
        uuid id PK
        varchar machine_number "M-001"
        varchar serial_number "SN12345"
    }
```

---

## 7. Что создаём / что меняем

```mermaid
mindmap
  root((Phase 1))
    Новые файлы
      payment-report-import.service.ts
        Оркестратор импорта
        5 шагов pipeline
        Маппинг paymentMethod
        Batch resolve машин
      payment-report-import.service.spec.ts
        8 unit тестов
      Migration
        3 новых поля в rows
        4 новых поля в uploads
        2 индекса
    Изменяемые файлы
      payment-report-row.entity.ts
        +isImported boolean
        +importedTransactionId uuid
        +importError text
      payment-report-upload.entity.ts
        +importedRows int
        +importErrors int
        +importedAt timestamp
        +importedBy varchar
      payment-reports.controller.ts
        +POST /:id/import
        +GET /:id/import-status
        +POST /rows/:rowId/import
      payment-reports.module.ts
        +ReconciliationModule
        +Transaction entity
        +Machine entity
        +HwImportedSale entity
        +PaymentReportImportService
      page.tsx (frontend)
        +Кнопка импорта
        +Confirmation dialog
        +Import status badge
        +Row status icons
```

---

## 8. UI — как выглядит для пользователя

### Список загрузок (таблица)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📊 Платёжные отчёты                                                     │
├──────────┬────────────┬────────┬──────────┬──────────┬───────────────────┤
│ Файл     │ Тип        │ Строк  │ Сумма    │ Статус   │ Импорт            │
├──────────┼────────────┼────────┼──────────┼──────────┼───────────────────┤
│ jan.xlsx  │ 💜 Payme   │ 1,247  │ 45.2M    │ ✅ Готов │ ✅ 1,247/1,247    │
│ jan.csv   │ 🔵 Click   │ 892    │ 28.1M    │ ✅ Готов │ ⚠️ 880/892       │
│ feb.xlsx  │ 💜 Payme   │ 1,103  │ 41.8M    │ ✅ Готов │ ⏳ Не импортирован │
│ kassa.xlsx│ 🟢 Касса   │ 2,341  │ 67.5M    │ ✅ Готов │ ⏳ Не импортирован │
└──────────┴────────────┴────────┴──────────┴──────────┴───────────────────┘
```

### Просмотр строк загрузки (с кнопкой импорта)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📄 feb.xlsx — Payme (confidence: 92%)                                   │
│                                                                          │
│  [🔄 Импорт в транзакции]   [📊 Аналитика]   [🔍 Фильтры]              │
├──────┬──────────┬──────────┬──────────┬────────────┬─────────────────────┤
│ №    │ Заказ    │ Сумма    │ Время    │ Метод      │ Машина  │ Статус    │
├──────┼──────────┼──────────┼──────────┼────────────┼─────────┼───────────┤
│ 1    │ ORD-4521 │ 12,000   │ 10:23    │ Узкард     │ M-001   │ ⏳        │
│ 2    │ ORD-4522 │ 8,500    │ 10:45    │ Наличные   │ M-003   │ ⏳        │
│ 3    │ ORD-4523 │ 15,000   │ 11:02    │ Хумо       │ M-001   │ ⏳        │
│ ...  │          │          │          │            │         │           │
│ 1103 │ ORD-5623 │ 9,200    │ 22:15    │ Payme      │ M-007   │ ⏳        │
└──────┴──────────┴──────────┴──────────┴────────────┴─────────┴───────────┘
```

### Dialog подтверждения импорта

```
┌─────────────────────────────────────────┐
│  🔄 Импорт в транзакции                │
│                                          │
│  Файл:   feb.xlsx (Payme)               │
│  Строк:  1,103                          │
│  Сумма:  41,800,000 UZS                 │
│                                          │
│  ℹ️  Строки будут проверены:            │
│  • Код машины → привязка к автомату     │
│  • Дедупликация по номеру заказа        │
│  • Неизвестные машины → пропускаются    │
│                                          │
│  [Отмена]          [✅ Импортировать]    │
└─────────────────────────────────────────┘
```

### Результат импорта (toast)

```
✅ Импорт завершён
   Импортировано: 1,091 из 1,103
   Машина не найдена: 12 строк (M-099, M-100)
   Сумма: 41,350,000 UZS
```

### После импорта — статус каждой строки

```
┌──────┬──────────┬──────────┬────────────┬─────────┬───────────────────┐
│ №    │ Заказ    │ Сумма    │ Метод      │ Машина  │ Статус            │
├──────┼──────────┼──────────┼────────────┼─────────┼───────────────────┤
│ 1    │ ORD-4521 │ 12,000   │ UZCARD     │ M-001   │ ✅ → TXN-abc123  │
│ 2    │ ORD-4522 │ 8,500    │ CASH       │ M-003   │ ✅ → TXN-def456  │
│ 45   │ ORD-4565 │ 7,000    │ HUMO       │ M-099   │ ❌ Машина M-099   │
│      │          │          │            │         │    не найдена      │
│ 1103 │ ORD-5623 │ 9,200    │ PAYME      │ M-007   │ ✅ → TXN-xyz789  │
└──────┴──────────┴──────────┴────────────┴─────────┴───────────────────┘
```

---

## 9. Общая картина (все 6 фаз)

```mermaid
flowchart TB
    subgraph P1["Phase 1: Reports → Transactions ⭐ СЕЙЧАС"]
        direction LR
        A["📄 Файл"] --> B["Парсинг"] --> C["PaymentReportRow"] --> D["HwImportedSale"] --> E["Transaction ✅"]
    end

    subgraph P2["Phase 2: Себестоимость (COGS)"]
        direction LR
        E2["Transaction SALE"] --> F["deductIngredients\nFIFO"] --> G["SaleIngredient\ncostTotal"] --> H["Transaction EXPENSE"]
    end

    subgraph P3["Phase 3: Авто-задачи"]
        direction LR
        I["Container.isLow\n< 20%"] --> J["TaskAutoGeneration\nCron 2ч"] --> K["Task REFILL\nс items"]
    end

    subgraph P4["Phase 4: Синхронизация бункеров"]
        direction LR
        L["Продажа"] --> M["Container.deduct\ncurrentQuantity--"] --> N["Event:\ncontainer.level.updated"]
    end

    subgraph P5["Phase 5: Проверка UI"]
        direction LR
        O["46+ страниц\nадминки"] --> P["Тест каждой\nфункции"]
    end

    subgraph P6["Phase 6: Railway Deploy"]
        direction LR
        Q["Build all apps"] --> R["Миграции"] --> S["🚀 Production"]
    end

    P1 --> P2
    P2 --> P4
    P4 --> P3
    P1 --> P5
    P3 --> P5
    P5 --> P6

    style P1 fill:#4dabf7,color:white
    style P2 fill:#748ffc,color:white
    style P3 fill:#9775fa,color:white
    style P4 fill:#da77f2,color:white
    style P5 fill:#f783ac,color:white
    style P6 fill:#ff6b6b,color:white
```

---

## 10. Файлы для Phase 1

| Действие  | Файл                                             | Описание                                                    |
| --------- | ------------------------------------------------ | ----------------------------------------------------------- |
| ✨ CREATE | `services/payment-report-import.service.ts`      | Оркестратор (5 шагов)                                       |
| ✨ CREATE | `services/payment-report-import.service.spec.ts` | 8 unit тестов                                               |
| ✨ CREATE | `database/migrations/...-AddImportFields.ts`     | 7 новых колонок + 2 индекса                                 |
| ✏️ MODIFY | `entities/payment-report-row.entity.ts`          | +3 поля: isImported, importedTransactionId, importError     |
| ✏️ MODIFY | `entities/payment-report-upload.entity.ts`       | +4 поля: importedRows, importErrors, importedAt, importedBy |
| ✏️ MODIFY | `payment-reports.controller.ts`                  | +3 endpoint'а                                               |
| ✏️ MODIFY | `payment-reports.module.ts`                      | +imports, +providers                                        |
| ✏️ MODIFY | `page.tsx` (frontend)                            | +кнопка, +dialog, +badges                                   |

**Переиспользуем** (не трогаем):

- `ReconciliationService.importHwSales()` — batch import в HwImportedSale
- `ReconciliationService.processReconciliation()` — сверка
- `SalesImportService` — паттерн progress tracking
