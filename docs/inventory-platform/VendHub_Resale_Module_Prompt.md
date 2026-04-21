# VendHub OS — Модуль «Resale Products & Multi-Tier Inventory Accounting»

**Версия:** 1.0  
**Автор:** Jamshid Sharipov  
**Дата:** 2026-04-20  
**Назначение:** Единый промпт для автономной реализации модуля учёта товаров-перепродажи в VendHub OS (или как отдельного standalone-приложения).

---

## 0. ЧТО УЖЕ ЕСТЬ В VendHub OS — и чего НЕТ

### Уже реализовано (основа, НЕ дублировать)

| Сущность                                                                    | Статус в VHM24                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `products` с enum `type: 'recipe' \| 'resale'`                              | ✅ Есть в схеме БД                                         |
| `machines` (31+), `machine_slots`, `locations`                              | ✅ Полностью                                               |
| `bunkers`, `bunker_installations` (для ингредиентов)                        | ✅ Есть трёхуровневый учёт: warehouse → operator → machine |
| `ingredients`, `ingredient_batches`, `ingredient_consumption_log`           | ✅ Для recipe-товаров                                      |
| `suppliers`, `supply_orders`, `supply_order_items`                          | ✅ Частично (для ингредиентов)                             |
| `transactions` (продажи recipe-напитков)                                    | ✅                                                         |
| `inventory_movements` / `spare_parts_movements`                             | ✅ Только для запчастей                                    |
| `audit_logs`                                                                | ✅ Универсальный                                           |
| RBAC (7 ролей: Owner/Admin/Manager/Operator/Collector/Technician/Viewer)    | ✅                                                         |
| Telegram Bot для склада                                                     | ✅                                                         |
| UI design system «Warm Brew» (amber palette + Manrope/IBM Plex Mono)        | ✅                                                         |
| Стек: NestJS + Next.js 14 + TypeORM/Drizzle + PostgreSQL + tRPC + shadcn/ui | ✅                                                         |

### Чего НЕТ (этот модуль это добавляет)

| Функция                                                                                                                            | Приоритет   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Полный CRUD для **resale-products** (снеки, бутылки, батончики) с карточкой товара                                                 | 🔴 Критично |
| **Трёхуровневый учёт остатков resale** (OLMA-склад → хранилище автомата → сам автомат) — аналог `bunkers`, но для штучного товара  | 🔴 Критично |
| **`stock_movements`** — универсальный журнал движений для resale (покупка → склад → хранилище → автомат → продано/возврат/списано) | 🔴 Критично |
| **`purchases`** — журнал закупок с шапкой и строками (поставщик, номер накладной, дата, сумма)                                     | 🔴 Критично |
| **`product_price_history`** — история изменения цен закупки и продажи с датой и источником                                         | 🔴 Критично |
| **Сверка продаж**: сопоставление фактических движений `SALE` с данными кассы/телеметрии автомата                                   | 🟡 Важно    |
| **Прайс для арендатора** (Tenant Price Sheet) — отдельный URL без себестоимости                                                    | 🟢 Удобство |
| **Визуальная раскладка аппарата** (Indigo 5×8, 6×8) с drag-drop перестановкой спиралей                                             | 🟢 Удобство |
| **Расчёт закупки с safety stock** и сроком доставки (формула из калькулятора)                                                      | 🟡 Важно    |
| **FIFO-себестоимость** по партиям (для точной маржи при колебаниях закупочных цен)                                                 | 🟡 Важно    |
| **Сканер штрих-кодов** (mobile) для заправки и инвентаризации                                                                      | 🟢 Удобство |

**Вывод:** у VendHub ЕСТЬ архитектурная основа (три уровня инвентаря, RBAC, audit, suppliers) — но она заточена под ингредиенты + бункеры. Штучный учёт resale-товаров **отсутствует** и требует добавления. Модуль спроектирован так, чтобы **повторять паттерны существующих `bunkers`/`ingredient_consumption_log`**, чтобы не вводить инородную логику.

---

## 1. ЦЕЛИ МОДУЛЯ

1. Вести полный учёт резейл-товаров (снеки, батончики, бутылки, баночные напитки) в трёх физических локациях: центральный склад → хранилище автомата → сам автомат.
2. Фиксировать **каждое** движение товара с указанием кто/когда/откуда/куда/почему.
3. Автоматически пересчитывать остатки после каждого движения (через триггеры БД).
4. Хранить **полную** историю изменения цен закупки (из каждой поставки) и цен продажи.
5. Предоставлять инструменты: визуальная раскладка аппарата, сводный заказ поставщику, прайс арендатору.
6. Интегрироваться с существующими модулями VendHub (machines, transactions, suppliers, audit) без дублирования данных.

---

## 2. АРХИТЕКТУРА ДАННЫХ

### 2.1 ENUM-типы

```ts
// Тип движения — главный классификатор stock_movements
export const movementTypeEnum = pgEnum("movement_type", [
  "PURCHASE_IN", // Пришло с закупки на центральный склад
  "TRANSFER_TO_STORAGE", // Склад → хранилище автомата (оператор взял в сумку/авто)
  "TRANSFER_TO_MACHINE", // Хранилище → сам автомат (заправка спиралей)
  "TRANSFER_BACK", // Автомат/хранилище → склад (возврат, перераспределение)
  "SALE", // Продано клиентом (убыль с machine-локации)
  "WRITE_OFF", // Списание (просрочка, порча, кража)
  "ADJUSTMENT_PLUS", // Инвентаризация: найдено больше ожидаемого
  "ADJUSTMENT_MINUS", // Инвентаризация: найдено меньше (списание недостачи)
  "SAMPLE", // Промо / дегустация / подарок
]);

export const priceTypeEnum = pgEnum("price_type", ["COST", "SELLING"]);

export const locationTypeEnum = pgEnum("location_type", [
  "WAREHOUSE", // Центральный склад (например, OLMA)
  "MACHINE_STORAGE", // Хранилище при автомате (шкаф/бокс возле машины)
  "MACHINE", // Сам автомат (загружен в спирали)
  "TRANSIT", // В пути у оператора
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "DRAFT",
  "ORDERED",
  "RECEIVED",
  "PARTIALLY_RECEIVED",
  "CANCELLED",
]);
```

### 2.2 Таблицы

#### `products` — РАСШИРИТЬ существующую

```ts
// Добавить поля к уже существующей таблице products (type='resale')
export const products = pgTable("products", {
  // ... существующие поля ...
  barcode: varchar("barcode", { length: 32 }).unique(), // EAN-13/UPC для сканера
  volume: varchar("volume", { length: 16 }), // "0.5 PET", "50g", "0.25 CAN"
  category: varchar("category", { length: 32 }), // 'cola'|'energy'|'mojito'|'bar'|'chips'|'water'|...
  defaultSupplierId: uuid("default_supplier_id").references(() => suppliers.id),
  defaultCost: integer("default_cost"), // Текущая актуальная цена закупки (UZS)
  sellingPrice: integer("selling_price"), // Текущая цена продажи
  spiralCapacity: integer("spiral_capacity").default(8), // Сколько шт помещается в одну спираль
  expectedDailySales: decimal("expected_daily_sales", {
    precision: 6,
    scale: 2,
  }),
  safetyStockDays: integer("safety_stock_days").default(4),
  leadTimeDays: integer("lead_time_days").default(3),
  isActive: boolean("is_active").default(true),
});
```

#### `stock_locations` — физические локации хранения

```ts
export const stockLocations = pgTable(
  "stock_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 64 }).notNull(), // "OLMA склад", "Indigo Snack @ OLMA · storage"
    type: locationTypeEnum("type").notNull(),
    machineId: uuid("machine_id").references(() => machines.id), // если MACHINE/MACHINE_STORAGE
    address: text("address"),
    createdAt: timestamp("created_at").defaultNow(),
    archivedAt: timestamp("archived_at"),
  },
  (t) => ({
    machineTypeIdx: index("stock_loc_machine_type_idx").on(t.machineId, t.type),
  }),
);
```

#### `stock_movements` — ГЛАВНАЯ таблица учёта (event-sourced)

```ts
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    movementType: movementTypeEnum("movement_type").notNull(),

    // Откуда / куда. NULL означает «извне системы» (закупка, продажа, списание).
    fromLocationId: uuid("from_location_id").references(
      () => stockLocations.id,
    ),
    toLocationId: uuid("to_location_id").references(() => stockLocations.id),

    quantity: integer("quantity")
      .notNull()
      .check(sql`quantity > 0`),

    // Стоимость единицы на момент движения (для FIFO и расчёта маржи)
    unitCost: integer("unit_cost"),
    unitPrice: integer("unit_price"), // если SALE — фактическая цена продажи

    // Откуда пришло / куда ушло в бизнес-смысле
    referenceType: varchar("reference_type", { length: 32 }), // 'purchase'|'sale'|'refill'|'audit'|'writeoff'
    referenceId: uuid("reference_id"),

    performedBy: uuid("performed_by")
      .references(() => users.id)
      .notNull(),
    performedAt: timestamp("performed_at").defaultNow().notNull(),
    note: text("note"),

    // Для audit-целостности: хэш предыдущего движения (блокчейн-стиль) — опционально
    previousHash: varchar("previous_hash", { length: 64 }),
    currentHash: varchar("current_hash", { length: 64 }),
  },
  (t) => ({
    productLocationIdx: index("stock_mov_prod_loc_idx").on(
      t.productId,
      t.toLocationId,
      t.performedAt,
    ),
    typeIdx: index("stock_mov_type_idx").on(t.movementType, t.performedAt),
    referenceIdx: index("stock_mov_ref_idx").on(t.referenceType, t.referenceId),
  }),
);
```

#### `inventory_balances` — материализованный остаток (денормализация для скорости)

```ts
export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    locationId: uuid("location_id")
      .references(() => stockLocations.id)
      .notNull(),
    quantity: integer("quantity").notNull().default(0),
    avgCost: integer("avg_cost"), // Средневзвешенная себестоимость (FIFO alternative)
    lastMovementAt: timestamp("last_movement_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.locationId] }),
  }),
);
```

**Триггер БД:** после каждого INSERT в `stock_movements` — обновить `inventory_balances` для `from` (минус) и `to` (плюс). Пример на PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION update_inventory_balance() RETURNS trigger AS $$
BEGIN
  -- Списание с from_location
  IF NEW.from_location_id IS NOT NULL THEN
    INSERT INTO inventory_balances (product_id, location_id, quantity, last_movement_at)
    VALUES (NEW.product_id, NEW.from_location_id, -NEW.quantity, NEW.performed_at)
    ON CONFLICT (product_id, location_id) DO UPDATE
      SET quantity = inventory_balances.quantity - NEW.quantity,
          last_movement_at = NEW.performed_at,
          updated_at = NOW();
  END IF;
  -- Пополнение to_location
  IF NEW.to_location_id IS NOT NULL THEN
    INSERT INTO inventory_balances (product_id, location_id, quantity, avg_cost, last_movement_at)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity, NEW.unit_cost, NEW.performed_at)
    ON CONFLICT (product_id, location_id) DO UPDATE
      SET quantity = inventory_balances.quantity + NEW.quantity,
          avg_cost = CASE
            WHEN NEW.unit_cost IS NOT NULL AND inventory_balances.quantity + NEW.quantity > 0
            THEN ((inventory_balances.quantity * COALESCE(inventory_balances.avg_cost, 0))
                + (NEW.quantity * NEW.unit_cost))
                / (inventory_balances.quantity + NEW.quantity)
            ELSE inventory_balances.avg_cost
          END,
          last_movement_at = NEW.performed_at,
          updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_inventory_balance();
```

#### `purchases` — заголовок закупки

```ts
export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  purchaseNumber: varchar("purchase_number", { length: 64 }), // номер накладной поставщика
  purchasedAt: timestamp("purchased_at").notNull(),
  receivedAt: timestamp("received_at"),
  warehouseId: uuid("warehouse_id")
    .references(() => stockLocations.id)
    .notNull(),
  status: purchaseStatusEnum("status").default("DRAFT").notNull(),
  totalAmount: integer("total_amount"), // сумма по факту (UZS)
  currency: varchar("currency", { length: 3 }).default("UZS"),
  note: text("note"),
  attachmentUrl: text("attachment_url"), // фото накладной / счёт-фактура
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseId: uuid("purchase_id")
    .references(() => purchases.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: integer("unit_cost").notNull(),
  totalCost: integer("total_cost").notNull(), // quantity × unitCost
  receivedQuantity: integer("received_quantity"), // для частичного приёма
  note: text("note"),
});
```

**Бизнес-логика:** когда `purchases.status` переходит в `RECEIVED` — сервис должен:

1. Для каждой строки создать `stock_movement` с `movementType='PURCHASE_IN'`, `toLocationId = purchase.warehouseId`, `unitCost`, `referenceType='purchase'`, `referenceId=purchase.id`.
2. Создать запись в `product_price_history` с `priceType='COST'`, `price=unitCost`, `purchaseId`, `supplierId`.
3. Обновить `products.defaultCost = unitCost` (опционально, по настройке).

#### `product_price_history` — аудит цен

```ts
export const productPriceHistory = pgTable(
  "product_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    priceType: priceTypeEnum("price_type").notNull(),
    oldPrice: integer("old_price"),
    newPrice: integer("new_price").notNull(),
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    effectiveTo: timestamp("effective_to"), // NULL если действует до сих пор
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    changedBy: uuid("changed_by").references(() => users.id),
    reason: text("reason"),
  },
  (t) => ({
    productTypeIdx: index("price_hist_prod_type_idx").on(
      t.productId,
      t.priceType,
      t.effectiveFrom,
    ),
  }),
);
```

Триггер на `UPDATE products.defaultCost/sellingPrice` → автоматически закрывает предыдущую запись (`effectiveTo = NOW()`) и создаёт новую.

#### `machine_slots` — РАСШИРИТЬ для resale

```ts
// Добавить, если не существует
export const machineSlots = pgTable(
  "machine_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    machineId: uuid("machine_id")
      .references(() => machines.id)
      .notNull(),
    rowIndex: integer("row_index").notNull(), // 1-based
    colIndex: integer("col_index").notNull(),
    productId: uuid("product_id").references(() => products.id), // NULL = пустой слот
    capacity: integer("capacity").default(8), // Ёмкость спирали
    currentQty: integer("current_qty").default(0), // Текущее кол-во в спирали
    configuredAt: timestamp("configured_at").defaultNow(),
  },
  (t) => ({
    machinePosUnique: unique().on(t.machineId, t.rowIndex, t.colIndex),
  }),
);
```

#### `sales` — продажи resale (связь с transactions VHM24)

```ts
// Если уже есть transactions — ИСПОЛЬЗОВАТЬ их, добавив поле productType='resale'.
// Для каждой строки transaction_items создаётся stock_movement SALE автоматически.
```

---

## 3. БИЗНЕС-СЦЕНАРИИ (USE-CASES)

### 3.1 Закупка пришла на склад

```
UI: /admin/purchases/new
Действие: создать Purchase (DRAFT) → добавить items → нажать "Receive"
Система:
  1. INSERT purchase (status=RECEIVED)
  2. FOR EACH item:
     INSERT stock_movement (PURCHASE_IN, to=warehouse, unitCost)
     INSERT product_price_history (COST, new=unitCost)
     UPDATE products.defaultCost = unitCost (если настроено)
  3. Триггер автоматически обновляет inventory_balances
  4. audit_log: "User X received purchase #123 for 2,450,000 UZS"
```

### 3.2 Оператор загружает автомат (refill session)

```
UI (mobile): /operator/refill/{machineId}
Процесс:
  1. Оператор сканирует QR машины
  2. Выбирает слоты для заправки (или все с currentQty < capacity)
  3. Сканирует штрих-код товара, вводит количество
  4. Система создаёт пару stock_movement:
     - TRANSFER_TO_STORAGE: warehouse → machine_storage (если нужно)
     - TRANSFER_TO_MACHINE: machine_storage → machine
  5. UPDATE machine_slots.currentQty += quantity
  6. Фото-подтверждение загружается в S3/MinIO
  7. audit_log + Telegram-уведомление менеджеру
```

### 3.3 Продажа товара (событие от автомата или вручную)

```
Триггер: transaction.completed event
Система:
  FOR EACH item in transaction:
    IF product.type = 'resale':
      INSERT stock_movement (SALE, from=machine, quantity=1, unitPrice=sellingPrice)
      UPDATE machine_slots.currentQty -= 1
      IF currentQty <= safety_stock → создать Task "Refill"
```

### 3.4 Инвентаризация (ADJUSTMENT)

```
UI: /admin/inventory/audit/{locationId}
Процесс:
  1. Менеджер выбирает локацию (склад / хранилище / автомат)
  2. Система показывает ожидаемые остатки по каждому product
  3. Менеджер вводит фактически посчитанное количество
  4. FOR EACH расхождение:
     IF fact > expected:
       stock_movement (ADJUSTMENT_PLUS, to=location, qty=diff)
     IF fact < expected:
       stock_movement (ADJUSTMENT_MINUS, from=location, qty=diff)
  5. Документ инвентаризации сохраняется (PDF с подписями)
```

### 3.5 Списание (порча / просрочка)

```
UI: /operator/writeoff
Поля: товар, локация, количество, причина, фото
Система: stock_movement (WRITE_OFF, from=location, qty, reason=note)
```

### 3.6 История изменения цены продажи

```
UI: /admin/products/{id} → вкладка "История цен"
Таблица:
  Тип | Старая цена | Новая цена | Изменил | Когда | Причина
  SELLING | 9,000 | 10,000 | Jamshid | 2026-04-20 | Рост закуп. цены
  COST    | 5,500 | 6,000  | System  | 2026-04-15 | Purchase #124 (POSITI)
График Recharts: линия цены закупки + линия цены продажи + заштрихованная маржа
```

---

## 4. API (tRPC ROUTERS)

### 4.1 `productsRouter`

```ts
export const productsRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(['recipe', 'resale']).optional(),
      category: z.string().optional(),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(...),

  create: protectedProcedure
    .input(productCreateSchema)
    .mutation(async ({ ctx, input }) => { /* + audit_log */ }),

  update: protectedProcedure.input(productUpdateSchema).mutation(...),

  updatePrice: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      priceType: z.enum(['COST', 'SELLING']),
      newPrice: z.number().int().positive(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Закрыть текущую запись в price_history (effectiveTo=NOW)
      // 2. Создать новую запись (oldPrice, newPrice, changedBy)
      // 3. UPDATE products.defaultCost or sellingPrice
    }),

  priceHistory: protectedProcedure
    .input(z.object({ productId: z.string().uuid(), priceType: z.enum(['COST','SELLING']).optional() }))
    .query(...),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(...),
  duplicate: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(...),
});
```

### 4.2 `inventoryRouter`

```ts
export const inventoryRouter = router({
  balances: protectedProcedure
    .input(z.object({
      locationId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
    }))
    .query(...), // возвращает inventory_balances с JOIN products/locations

  movements: protectedProcedure
    .input(z.object({
      productId: z.string().uuid().optional(),
      locationId: z.string().uuid().optional(),
      type: movementTypeEnum.optional(),
      from: z.date().optional(),
      to: z.date().optional(),
      limit: z.number().default(50),
      cursor: z.string().optional(),
    }))
    .query(...),

  createMovement: protectedProcedure
    .input(stockMovementSchema)
    .mutation(...), // общий метод, но обычно создаётся через специализированные ниже

  refill: protectedProcedure
    .input(z.object({
      machineId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        slotId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })),
      photoUrl: z.string().url().optional(),
    }))
    .mutation(...),

  writeOff: protectedProcedure
    .input(z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().int().positive(),
      reason: z.string(),
      photoUrl: z.string().url().optional(),
    }))
    .mutation(...),

  adjust: protectedProcedure
    .input(z.object({
      locationId: z.string().uuid(),
      adjustments: z.array(z.object({
        productId: z.string().uuid(),
        factQuantity: z.number().int().min(0),
      })),
      note: z.string().optional(),
    }))
    .mutation(...),

  lowStock: protectedProcedure.query(...), // остатки ниже safety_stock
});
```

### 4.3 `purchasesRouter`

```ts
export const purchasesRouter = router({
  list: protectedProcedure.input(z.object({ status, supplierId, from, to })).query(...),
  getById: protectedProcedure.input(z.object({ id })).query(...),
  create: protectedProcedure.input(purchaseCreateSchema).mutation(...),
  addItem: protectedProcedure.input(purchaseItemSchema).mutation(...),
  receive: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      items: z.array(z.object({
        id: z.string().uuid(),
        receivedQuantity: z.number().int().min(0),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Создаёт stock_movements + price_history, ставит status=RECEIVED
    }),
  cancel: protectedProcedure.input(z.object({ id, reason })).mutation(...),
});
```

### 4.4 `machineSlotsRouter`

```ts
export const machineSlotsRouter = router({
  getByMachine: protectedProcedure.input(z.object({ machineId })).query(...),
  assignProduct: protectedProcedure
    .input(z.object({ slotId, productId, capacity: z.number().optional() }))
    .mutation(...),
  clearSlot: protectedProcedure.input(z.object({ slotId })).mutation(...),
  bulkLayout: protectedProcedure
    .input(z.object({
      machineId: z.string().uuid(),
      grid: z.array(z.array(z.string().uuid().nullable())), // [row][col] = productId | null
    }))
    .mutation(...), // для drag-drop сохранения всей сетки
});
```

### 4.5 `tenantPriceRouter` (публичный, без авторизации)

```ts
export const tenantPriceRouter = router({
  byMachine: publicProcedure
    .input(z.object({ machineSlug: z.string() })) // URL типа /price/olma-snack
    .query(async ({ input }) => {
      // Вернуть: список активных products в slots этого автомата
      // + sellingPrice + vol + category
      // БЕЗ defaultCost, БЕЗ маржи
    }),
});
```

---

## 5. UI — ЭКРАНЫ

### 5.1 `/admin/products` — Каталог товаров

- Таблица со всеми `type='resale'` товарами
- Фильтры: категория, поставщик, активность
- Поиск по названию/штрих-коду
- Inline-редактирование: название, объём, категория, цена закупки, цена продажи, ёмкость спирали
- Действия: ✎ редактировать | ⎘ дублировать | ✕ удалить | 📊 история цен
- Кнопка «+ Новый товар» — модалка с формой

### 5.2 `/admin/products/{id}` — Карточка товара

**Вкладки:**

- **Паспорт:** название, штрих-код, объём, категория, поставщик (InlineCreateSelect), цены, фото
- **История цен:** таблица + график (COST + SELLING + заштрихованная маржа)
- **Остатки:** текущие quantity в каждой локации
- **Движения:** журнал всех `stock_movements` по этому товару
- **В аппаратах:** в каких машинах и слотах стоит товар

### 5.3 `/admin/machines/{id}/layout` — Раскладка автомата

- Визуальная сетка (5×8 для Ice Drink, 6×8 для Snack)
- Цветовая категоризация слотов
- Drag-drop для перестановки
- Клик на слот → модалка выбора товара (с поиском, «+ Создать новый»)
- Нижняя таблица: сводка SKU с колонками (спиралей, ёмкость, остаток, дневные продажи, дней до пустого)

### 5.4 `/admin/purchases` — Журнал закупок

- Таблица всех закупок (дата, поставщик, номер, сумма, статус)
- Детальная карточка с items
- Кнопка «Оприходовать» (receive) — переводит в RECEIVED, создаёт движения

### 5.5 `/admin/inventory` — Остатки

- Переключатель локаций (склад / хранилища / автоматы)
- Таблица: товар × локация → количество + дней хватит + алерт если ниже safety
- Кнопка «Инвентаризация» → экран сверки

### 5.6 `/admin/inventory/movements` — Журнал движений

- Все `stock_movements` с фильтрами по типу, локации, товару, периоду
- Экспорт в CSV / Excel
- Каждая строка кликабельная → детали (кто, референс-документ)

### 5.7 `/operator/refill/{machineId}` — Заправка автомата (mobile-first)

- Mobile UI
- QR-сканер для привязки к машине
- Список слотов с текущим qty и ёмкостью
- Кнопка «Сканировать штрих-код» → авто-выбор товара
- Поле количество
- Фото до/после
- Submit → создание `stock_movements`

### 5.8 `/tenant/{machineSlug}` — Прайс для арендатора (публичный)

- Чистый белый лист, без админ-навигации
- Группы: Напитки / Энергетики / Батончики / Снеки
- Строка: название · объём · цена продажи
- Без себестоимости, без остатков

### 5.9 `/admin/products/{id}/price-editor` — быстрое обновление цены

- Поле «Новая цена продажи»
- Поле «Причина» (обязательно)
- История изменений — сразу под формой

---

## 6. ИНТЕГРАЦИИ С СУЩЕСТВУЮЩИМИ МОДУЛЯМИ VENDHUB

| Модуль VHM24   | Как интегрируется                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `transactions` | При SALE транзакции автомата → hook создаёт `stock_movement SALE`                                                                 |
| `tasks`        | При `low_stock` алерте → автосоздание task с типом REFILL                                                                         |
| `suppliers`    | FK в `purchases.supplierId`                                                                                                       |
| `machines`     | FK в `stock_locations.machineId` и `machine_slots.machineId`                                                                      |
| `users`        | FK в `performedBy` / `createdBy` / `changedBy`                                                                                    |
| `audit_logs`   | Запись на каждое создание/изменение purchase, price, movement                                                                     |
| `telegram_bot` | Уведомления: закупка оприходована / низкий остаток / заправка выполнена                                                           |
| `rbac`         | Роли: Owner/Admin — всё, Manager — закупки + отчёты, Operator — refill + writeoff, Collector — инвентаризация, Viewer — read-only |
| `reports`      | Новые отчёты: «Движение товаров», «Маржа по SKU», «Инкассация vs System-sales сверка»                                             |

---

## 7. RBAC — ПРАВА

| Действие                   | Owner | Admin | Manager | Operator | Collector | Technician | Viewer | Tenant |
| -------------------------- | ----- | ----- | ------- | -------- | --------- | ---------- | ------ | ------ |
| Создать/удалить товар      | ✅    | ✅    | ❌      | ❌       | ❌        | ❌         | ❌     | ❌     |
| Редактировать цену продажи | ✅    | ✅    | ✅      | ❌       | ❌        | ❌         | ❌     | ❌     |
| Создать закупку            | ✅    | ✅    | ✅      | ❌       | ❌        | ❌         | ❌     | ❌     |
| Оприходовать закупку       | ✅    | ✅    | ✅      | ❌       | ❌        | ❌         | ❌     | ❌     |
| Заправка автомата          | ✅    | ✅    | ✅      | ✅       | ❌        | ❌         | ❌     | ❌     |
| Списание (writeoff)        | ✅    | ✅    | ✅      | ✅       | ✅        | ❌         | ❌     | ❌     |
| Инвентаризация             | ✅    | ✅    | ✅      | ❌       | ✅        | ❌         | ❌     | ❌     |
| Смотреть себестоимость     | ✅    | ✅    | ✅      | ❌       | ❌        | ❌         | ❌     | ❌     |
| Смотреть продажи           | ✅    | ✅    | ✅      | ✅       | ✅        | ❌         | ✅     | ❌     |
| Смотреть прайс (публичный) | ✅    | ✅    | ✅      | ✅       | ✅        | ✅         | ✅     | ✅     |
| Смотреть историю цен       | ✅    | ✅    | ✅      | ❌       | ❌        | ❌         | ❌     | ❌     |

Реализация: middleware на tRPC procedures + RLS policies в Supabase для прямых клиентских запросов.

---

## 8. ПЛАН РЕАЛИЗАЦИИ (ПОШАГОВО)

**Этап 1 — Schema & Migrations (1 день)**

- Создать все таблицы (Drizzle schema + migration)
- Создать PostgreSQL триггеры
- Засеять ENUMs и базовые локации (OLMA warehouse + machine_storages + machines)
- Тесты на триггеры

**Этап 2 — Core Services & tRPC (2 дня)**

- `ProductsService` (CRUD + updatePrice)
- `InventoryService` (balances, movements, refill, writeoff, adjust)
- `PurchasesService` (create + receive → генерация движений)
- Юнит-тесты бизнес-логики
- tRPC роутеры

**Этап 3 — Admin UI (3 дня)**

- Каталог товаров (table + inline edit + add/delete)
- Карточка товара с 5 вкладками
- Раскладка автомата (drag-drop grid)
- Журнал закупок + форма создания
- Остатки + инвентаризация
- Журнал движений с фильтрами
- История цен с графиком

**Этап 4 — Operator Mobile UI (2 дня)**

- PWA `/operator/refill/{machineId}`
- QR-сканер (html5-qrcode library)
- Штрих-код сканер для товара
- Фото-загрузка

**Этап 5 — Tenant Public Page (0.5 дня)**

- `/tenant/{slug}` — публичный прайс

**Этап 6 — Integrations (1 день)**

- Transaction hook для авто-списания при SALE
- Telegram notifications
- Audit logging
- Task auto-creation при low_stock

**Этап 7 — Тесты и QA (1 день)**

- E2E сценарии: закупка → заправка → продажа → сверка
- Проверка целостности: сумма всех movements = inventory_balances
- Проверка истории цен при update
- Load test на 10k movements

**ИТОГО: ~10 рабочих дней на одного senior full-stack разработчика с готовым стеком VHM24.**

---

## 9. КРИТЕРИИ ПРИЁМКИ

1. ✅ Каждое физическое движение товара фиксируется как `stock_movement` с корректными from/to
2. ✅ `inventory_balances` согласуются с суммой движений (проверяется cron-скриптом раз в час)
3. ✅ Изменение цены закупки или продажи → запись в `product_price_history` с полной атрибуцией
4. ✅ Приходуя закупку, автоматически обновляются остатки + история цены
5. ✅ Продажа из автомата → автоматическое списание с machine-локации
6. ✅ Арендатор видит только свой прайс по публичной ссылке, без себестоимостей
7. ✅ RBAC соблюдается на всех endpoint'ах
8. ✅ Все действия логируются в `audit_logs`
9. ✅ Low-stock алерты создают задачи REFILL автоматически
10. ✅ UI соответствует design system «Warm Brew» (amber / Manrope / IBM Plex Mono)

---

## 10. КАК ИСПОЛЬЗОВАТЬ ЭТОТ ПРОМПТ

### Вариант А — реализация ВНУТРИ VendHub OS

Подай этот документ целиком в Claude Code с таким заголовком:

> Ты Claude Code в монорепе github.com/jamsmac/VendHub-OS. Реализуй модуль «Resale Products & Multi-Tier Inventory Accounting» согласно приложенной спецификации. Используй существующие паттерны VHM24: NestJS modules, Drizzle ORM, tRPC v11, shadcn/ui, design system Warm Brew. Используй skills vhm24-db-expert, vhm24-api-generator, vhm24-ui-generator, vhm24-ux-spec по очереди. Не дублируй уже существующие сущности (products с полем type уже есть, suppliers есть, machines есть). Добавляй ТОЛЬКО недостающее.

### Вариант Б — реализация как STANDALONE-приложения

Подай документ целиком с заголовком:

> Ты Claude Code. Создай standalone-приложение «Indigo OLMA Inventory» с нуля согласно спецификации: Next.js 14 App Router + Supabase + Drizzle + tRPC v11 + shadcn/ui + Tailwind. Стартуй с создания Supabase проекта и применения миграций из раздела 2. Весь документ — единственный источник требований.

### Вариант В — постепенное внедрение

Используй разделы документа по отдельности:

- Раздел 2 → Claude Code: «создай Drizzle schema и миграции»
- Раздел 4 → Claude Code: «создай tRPC роутеры»
- Раздел 5 → Claude Code (на каждый экран): «создай UI по wireframe из раздела 5.N»

---

**Конец спецификации.**
