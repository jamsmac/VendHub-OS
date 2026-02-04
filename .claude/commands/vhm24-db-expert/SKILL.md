---
name: vhm24-db-expert
description: |
  VendHub Database Expert - TypeORM схемы и миграции для PostgreSQL.
  Создаёт entity, relations, миграции, сиды, оптимизирует запросы.
  Использовать при создании/изменении таблиц, связей, миграций.
---

# VendHub Database Expert

Эксперт по базе данных VendHub: TypeORM 0.3.20, PostgreSQL 16, entity, миграции, оптимизация запросов.

## Назначение

- Проектирование схемы базы данных PostgreSQL
- Создание TypeORM entity с декораторами
- Настройка связей между сущностями (relations)
- Генерация и запуск миграций
- Оптимизация запросов через QueryBuilder и Repository API
- Создание сидов для начальных данных

## Когда использовать

- Создание новой entity (таблицы)
- Изменение существующей схемы
- Добавление связей между таблицами
- Написание сложных запросов (QueryBuilder, raw SQL)
- Работа с транзакциями
- Создание и запуск миграций
- Настройка индексов и оптимизация производительности
- Вопросы по структуре данных VendHub

## Технологический стек

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| TypeORM | 0.3.20 | ORM для работы с БД |
| PostgreSQL | 16 | СУБД |
| Node.js | 20+ | Среда выполнения |
| TypeScript | 5.x | Язык разработки |

## Структура проекта VendHub

```
src/
├── entities/                # TypeORM entity
│   ├── base.entity.ts       # Базовая entity (BaseEntity)
│   ├── user.entity.ts       # Пользователи
│   ├── machine.entity.ts    # Вендинговые автоматы
│   ├── product.entity.ts    # Товары/напитки
│   ├── order.entity.ts      # Заказы
│   └── ...
├── migrations/              # Миграции TypeORM
│   ├── 1700000000000-CreateUsers.ts
│   └── ...
├── seeds/                   # Сиды начальных данных
│   ├── seed-runner.ts
│   └── ...
├── subscribers/             # TypeORM subscribers
│   └── ...
├── config/
│   └── data-source.ts       # Конфигурация DataSource
└── server/
    └── api/
        └── routers/         # Роутеры API
```

## Конфигурация DataSource

```typescript
// src/config/data-source.ts
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "vendhub",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vendhub",
  synchronize: false, // НИКОГДА true в production
  logging: process.env.NODE_ENV === "development",
  entities: ["src/entities/**/*.entity.ts"],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: ["src/subscribers/**/*.ts"],
  // Настройки пула соединений
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
```

---

## 1. Паттерн BaseEntity

Все entity в VendHub наследуют от базовой entity. Это обеспечивает единообразные поля аудита и soft delete.

```typescript
// src/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BaseEntity as TypeORMBaseEntity,
} from "typeorm";

export abstract class BaseEntity extends TypeORMBaseEntity {
  // UUID первичный ключ — НИКОГДА не используем number/autoincrement
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Дата создания — заполняется автоматически
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  // Дата обновления — обновляется автоматически
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;

  // Soft delete — запись не удаляется физически, а помечается датой удаления
  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  // Кто создал запись (UUID пользователя)
  @Column({ name: "created_by_id", type: "uuid", nullable: true })
  created_by_id: string | null;

  // Кто последний обновил запись (UUID пользователя)
  @Column({ name: "updated_by_id", type: "uuid", nullable: true })
  updated_by_id: string | null;
}
```

**Важно:**
- `id` всегда `uuid`, никогда `number`
- `@DeleteDateColumn` включает soft delete — при вызове `.softRemove()` или `.softDelete()` запись получает `deleted_at`, а не удаляется физически
- Стандартные find-запросы автоматически исключают записи с `deleted_at IS NOT NULL`
- Для получения удалённых записей используй `withDeleted: true`

---

## 2. Создание Entity

### Базовый шаблон entity

```typescript
// src/entities/machine.entity.ts
import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";
import { Order } from "./order.entity";

@Entity("machines") // Имя таблицы — snake_case, множественное число
@Index("idx_machines_serial_number", ["serial_number"], { unique: true })
@Index("idx_machines_status", ["status"])
@Index("idx_machines_location_id", ["location_id"])
export class Machine extends BaseEntity {
  // Строковые поля
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "serial_number", type: "varchar", length: 100, unique: true })
  serial_number: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  // Enum поле (PostgreSQL enum тип)
  @Column({
    type: "enum",
    enum: ["active", "inactive", "maintenance", "decommissioned"],
    default: "inactive",
  })
  status: "active" | "inactive" | "maintenance" | "decommissioned";

  // Числовые поля
  @Column({ name: "slot_count", type: "int", default: 0 })
  slot_count: number;

  // Денежные поля — ВСЕГДА decimal
  @Column({ name: "cash_balance", type: "decimal", precision: 12, scale: 2, default: 0 })
  cash_balance: number;

  // Boolean поля
  @Column({ name: "is_online", type: "boolean", default: false })
  is_online: boolean;

  // JSONB поле (PostgreSQL)
  @Column({ type: "jsonb", nullable: true, default: {} })
  settings: Record<string, any>;

  // UUID поле для координат или внешних ID
  @Column({ name: "location_id", type: "uuid", nullable: true })
  location_id: string | null;

  // Дата без временной зоны
  @Column({ name: "last_service_date", type: "timestamp", nullable: true })
  last_service_date: Date | null;

  // --- Связи ---

  // Многие автоматы принадлежат одному владельцу
  @ManyToOne(() => User, (user) => user.machines, { onDelete: "SET NULL" })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Column({ name: "owner_id", type: "uuid", nullable: true })
  owner_id: string | null;

  // У автомата много заказов
  @OneToMany(() => Order, (order) => order.machine)
  orders: Order[];
}
```

### Все поддерживаемые типы колонок PostgreSQL

| Данные | Тип TypeORM | Пример |
|--------|-------------|--------|
| UUID PK | `@PrimaryGeneratedColumn("uuid")` | `id: string` |
| Строка (до N) | `{ type: "varchar", length: 255 }` | `name: string` |
| Длинный текст | `{ type: "text" }` | `description: string` |
| Целое число | `{ type: "int" }` | `quantity: number` |
| Маленькое число | `{ type: "smallint" }` | `sort_order: number` |
| Большое число | `{ type: "bigint" }` | `total_views: string` |
| Деньги/точность | `{ type: "decimal", precision: 12, scale: 2 }` | `price: number` |
| UUID ссылка | `{ type: "uuid" }` | `user_id: string` |
| JSON (PostgreSQL) | `{ type: "jsonb" }` | `settings: Record<string, any>` |
| Дата+время+зона | `{ type: "timestamptz" }` | `scheduled_at: Date` |
| Дата+время | `{ type: "timestamp" }` | `event_date: Date` |
| Только дата | `{ type: "date" }` | `birth_date: string` |
| Boolean | `{ type: "boolean" }` | `is_active: boolean` |
| Enum | `{ type: "enum", enum: [...] }` | `status: string` |
| Массив строк | `{ type: "varchar", array: true }` | `tags: string[]` |
| Массив UUID | `{ type: "uuid", array: true }` | `role_ids: string[]` |

---

## 3. Связи (Relations)

### ManyToOne / OneToMany

```typescript
// src/entities/order.entity.ts
// Заказ принадлежит пользователю и автомату

@Entity("orders")
@Index("idx_orders_user_id", ["user_id"])
@Index("idx_orders_machine_id", ["machine_id"])
@Index("idx_orders_status_created", ["status", "created_at"])
export class Order extends BaseEntity {
  @Column({ name: "order_number", type: "varchar", length: 50, unique: true })
  order_number: string;

  @Column({
    type: "enum",
    enum: ["pending", "processing", "completed", "cancelled", "refunded"],
    default: "pending",
  })
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";

  @Column({ name: "total_amount", type: "decimal", precision: 12, scale: 2 })
  total_amount: number;

  // --- ManyToOne: Заказ -> Пользователь ---
  @ManyToOne(() => User, (user) => user.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id", type: "uuid" })
  user_id: string;

  // --- ManyToOne: Заказ -> Автомат ---
  @ManyToOne(() => Machine, (machine) => machine.orders, { onDelete: "SET NULL" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  @Column({ name: "machine_id", type: "uuid", nullable: true })
  machine_id: string | null;

  // --- OneToMany: Заказ -> Позиции заказа ---
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
```

```typescript
// src/entities/user.entity.ts
// Обратная сторона связи

@Entity("users")
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "full_name", type: "varchar", length: 255 })
  full_name: string;

  // --- OneToMany: Пользователь -> Заказы ---
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  // --- OneToMany: Пользователь -> Автоматы ---
  @OneToMany(() => Machine, (machine) => machine.owner)
  machines: Machine[];
}
```

### ManyToMany с JoinTable

```typescript
// src/entities/product.entity.ts
// Продукт может содержать много ингредиентов,
// ингредиент может быть в нескольких продуктах

import { Entity, Column, ManyToMany, JoinTable } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Ingredient } from "./ingredient.entity";

@Entity("products")
export class Product extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @Column({ type: "varchar", length: 50 })
  sku: string;

  @Column({ type: "boolean", default: true })
  is_available: boolean;

  // --- ManyToMany: Продукт <-> Ингредиент ---
  @ManyToMany(() => Ingredient, (ingredient) => ingredient.products, { cascade: true })
  @JoinTable({
    name: "product_ingredients",                          // Имя junction-таблицы
    joinColumn: { name: "product_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "ingredient_id", referencedColumnName: "id" },
  })
  ingredients: Ingredient[];
}
```

```typescript
// src/entities/ingredient.entity.ts
// Обратная сторона ManyToMany

@Entity("ingredients")
export class Ingredient extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  unit: string; // "г", "мл", "шт"

  @Column({ name: "cost_per_unit", type: "decimal", precision: 10, scale: 4 })
  cost_per_unit: number;

  // Обратная сторона — без @JoinTable
  @ManyToMany(() => Product, (product) => product.ingredients)
  products: Product[];
}
```

### ManyToMany с дополнительными полями (через промежуточную entity)

Если junction-таблица содержит дополнительные колонки (например, количество ингредиента в продукте), используй отдельную entity:

```typescript
// src/entities/product-ingredient.entity.ts
// Промежуточная entity с дополнительными полями

@Entity("product_ingredients")
@Index("idx_product_ingredients_product", ["product_id"])
@Index("idx_product_ingredients_ingredient", ["ingredient_id"])
export class ProductIngredient extends BaseEntity {
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_id", type: "uuid" })
  product_id: string;

  @ManyToOne(() => Ingredient, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ingredient_id" })
  ingredient: Ingredient;

  @Column({ name: "ingredient_id", type: "uuid" })
  ingredient_id: string;

  // Дополнительные поля
  @Column({ type: "decimal", precision: 10, scale: 4 })
  amount: number;

  @Column({ type: "varchar", length: 50 })
  unit: string;
}
```

---

## 4. Enum-колонки с PostgreSQL enum

```typescript
// src/entities/enums/machine-status.enum.ts
// Определение enum для TypeScript

export enum MachineStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
  DECOMMISSIONED = "decommissioned",
}

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  QR = "qr",
  NFC = "nfc",
  ONLINE = "online",
}

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  TECHNICIAN = "technician",
  OPERATOR = "operator",
  VIEWER = "viewer",
}
```

```typescript
// Использование enum в entity
import { MachineStatus } from "./enums/machine-status.enum";

@Entity("machines")
export class Machine extends BaseEntity {
  // Вариант 1: через TypeScript enum (рекомендуется)
  @Column({
    type: "enum",
    enum: MachineStatus,
    default: MachineStatus.INACTIVE,
  })
  status: MachineStatus;

  // Вариант 2: через массив строк
  @Column({
    type: "enum",
    enum: ["active", "inactive", "maintenance"],
    default: "inactive",
  })
  status: string;
}
```

**Важно:** TypeORM автоматически создаёт PostgreSQL enum тип в БД. При добавлении новых значений в существующий enum нужна миграция с `ALTER TYPE`.

---

## 5. Индексы (@Index)

```typescript
import { Entity, Column, Index, Unique } from "typeorm";

// Индекс на уровне entity (составной индекс)
@Entity("orders")
@Index("idx_orders_user_status", ["user_id", "status"])
@Index("idx_orders_created_at", ["created_at"])
@Index("idx_orders_machine_created", ["machine_id", "created_at"])
// Уникальный составной индекс
@Unique("uq_orders_number", ["order_number"])
export class Order extends BaseEntity {
  // Уникальный индекс на уровне колонки
  @Column({ type: "varchar", length: 50, unique: true })
  order_number: string;

  // Обычная колонка (индекс задан на уровне entity)
  @Column({ name: "user_id", type: "uuid" })
  user_id: string;

  @Column({
    type: "enum",
    enum: ["pending", "processing", "completed", "cancelled", "refunded"],
    default: "pending",
  })
  status: string;
}
```

### Частичные и GIN-индексы (через миграцию)

Для сложных индексов PostgreSQL (partial, GIN, GiST) используй raw SQL в миграции:

```typescript
// Частичный индекс — только активные записи
await queryRunner.query(`
  CREATE INDEX idx_machines_active_online
  ON machines (is_online)
  WHERE status = 'active' AND deleted_at IS NULL
`);

// GIN индекс для JSONB поля — быстрый поиск по JSON
await queryRunner.query(`
  CREATE INDEX idx_machines_settings_gin
  ON machines USING GIN (settings)
`);
```

### Когда создавать индексы

- Частые WHERE условия
- Поля ORDER BY
- Колонки JOIN (FK — TypeORM создаёт автоматически)
- Уникальные значения (email, serial_number)
- Составные условия фильтрации (status + created_at)

---

## 6. Миграции

### Генерация миграции (по разнице между entity и БД)

```bash
# Генерация миграции — TypeORM сравнит entity с текущим состоянием БД
npx typeorm migration:generate src/migrations/AddMachineLocationField -d src/config/data-source.ts
```

### Создание пустой миграции (для ручного SQL)

```bash
npx typeorm migration:create src/migrations/SeedDefaultRoles
```

### Запуск миграций

```bash
# Применить все непримененные миграции
npx typeorm migration:run -d src/config/data-source.ts

# Откатить последнюю миграцию
npx typeorm migration:revert -d src/config/data-source.ts

# Показать статус миграций
npx typeorm migration:show -d src/config/data-source.ts
```

### Пример сгенерированной миграции

```typescript
// src/migrations/1700000000000-CreateMachines.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateMachines1700000000000 implements MigrationInterface {
  // Имя миграции для логов
  name = "CreateMachines1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создание enum типа в PostgreSQL
    await queryRunner.query(`
      CREATE TYPE "machine_status_enum" AS ENUM ('active', 'inactive', 'maintenance', 'decommissioned')
    `);

    // Создание таблицы
    await queryRunner.createTable(
      new Table({
        name: "machines",
        columns: [
          { name: "id", type: "uuid", isPrimary: true, generationStrategy: "uuid", default: "uuid_generate_v4()" },
          { name: "name", type: "varchar", length: "255" },
          { name: "serial_number", type: "varchar", length: "100", isUnique: true },
          { name: "description", type: "text", isNullable: true },
          { name: "status", type: "machine_status_enum", default: "'inactive'" },
          { name: "slot_count", type: "int", default: 0 },
          { name: "cash_balance", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "is_online", type: "boolean", default: false },
          { name: "settings", type: "jsonb", isNullable: true, default: "'{}'" },
          { name: "owner_id", type: "uuid", isNullable: true },
          { name: "location_id", type: "uuid", isNullable: true },
          { name: "last_service_date", type: "timestamp", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
          { name: "deleted_at", type: "timestamptz", isNullable: true },
          { name: "created_by_id", type: "uuid", isNullable: true },
          { name: "updated_by_id", type: "uuid", isNullable: true },
        ],
      }),
      true,
    );

    // Создание индексов
    await queryRunner.createIndex("machines", new TableIndex({
      name: "idx_machines_serial_number",
      columnNames: ["serial_number"],
      isUnique: true,
    }));

    await queryRunner.createIndex("machines", new TableIndex({
      name: "idx_machines_status",
      columnNames: ["status"],
    }));

    await queryRunner.createIndex("machines", new TableIndex({
      name: "idx_machines_owner_id",
      columnNames: ["owner_id"],
    }));

    // Создание внешнего ключа
    await queryRunner.createForeignKey("machines", new TableForeignKey({
      name: "fk_machines_owner",
      columnNames: ["owner_id"],
      referencedTableName: "users",
      referencedColumnNames: ["id"],
      onDelete: "SET NULL",
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("machines", "fk_machines_owner");
    await queryRunner.dropTable("machines");
    await queryRunner.query(`DROP TYPE "machine_status_enum"`);
  }
}
```

---

## 7. Паттерны запросов

### Repository API

```typescript
import { AppDataSource } from "../config/data-source";
import { Machine } from "../entities/machine.entity";
import { MachineStatus } from "../entities/enums/machine-status.enum";

const machineRepo = AppDataSource.getRepository(Machine);

// --- Поиск одной записи ---
const machine = await machineRepo.findOne({
  where: { id: machineId },
  relations: { owner: true, orders: true },
});

// --- Поиск с условиями ---
const activeMachines = await machineRepo.find({
  where: {
    status: MachineStatus.ACTIVE,
    is_online: true,
  },
  relations: { owner: true },
  order: { created_at: "DESC" },
  take: 20,   // LIMIT
  skip: 0,    // OFFSET
});

// --- Поиск с включением soft-deleted записей ---
const allMachines = await machineRepo.find({
  withDeleted: true, // Включить записи с deleted_at IS NOT NULL
});

// --- Подсчёт записей ---
const count = await machineRepo.count({
  where: { status: MachineStatus.ACTIVE },
});

// --- Создание ---
const newMachine = machineRepo.create({
  name: "Автомат #42",
  serial_number: "VH-2024-042",
  status: MachineStatus.INACTIVE,
  owner_id: userId,
  created_by_id: currentUserId,
});
await machineRepo.save(newMachine);

// --- Обновление ---
await machineRepo.update(machineId, {
  status: MachineStatus.ACTIVE,
  is_online: true,
  updated_by_id: currentUserId,
});

// --- Soft delete (помечает deleted_at) ---
await machineRepo.softDelete(machineId);

// --- Восстановление soft-deleted записи ---
await machineRepo.restore(machineId);

// --- Физическое удаление (осторожно!) ---
await machineRepo.delete(machineId);
```

### QueryBuilder

```typescript
// --- Сложная выборка с JOIN и агрегацией ---
const salesByMachine = await AppDataSource
  .getRepository(Order)
  .createQueryBuilder("order")
  .select("order.machine_id", "machine_id")
  .addSelect("machine.name", "machine_name")
  .addSelect("SUM(order.total_amount)", "total_sales")
  .addSelect("COUNT(order.id)", "order_count")
  .addSelect("AVG(order.total_amount)", "avg_order")
  .innerJoin("order.machine", "machine")
  .where("order.status = :status", { status: "completed" })
  .andWhere("order.created_at >= :startDate", { startDate })
  .andWhere("order.created_at <= :endDate", { endDate })
  .andWhere("order.deleted_at IS NULL")
  .groupBy("order.machine_id")
  .addGroupBy("machine.name")
  .orderBy("total_sales", "DESC")
  .limit(50)
  .getRawMany();

// --- Подзапрос ---
const machinesWithLowStock = await AppDataSource
  .getRepository(Machine)
  .createQueryBuilder("machine")
  .where((qb) => {
    const subQuery = qb
      .subQuery()
      .select("bi.machine_id")
      .from("bunker_inventory", "bi")
      .where("bi.current_level < bi.min_level")
      .getQuery();
    return `machine.id IN ${subQuery}`;
  })
  .andWhere("machine.status = :status", { status: MachineStatus.ACTIVE })
  .getMany();

// --- Обновление через QueryBuilder ---
await AppDataSource
  .getRepository(Machine)
  .createQueryBuilder()
  .update(Machine)
  .set({
    is_online: false,
    updated_by_id: systemUserId,
  })
  .where("last_ping_at < :threshold", {
    threshold: new Date(Date.now() - 5 * 60 * 1000),
  })
  .execute();

// --- Пагинация с подсчётом общего количества ---
const [orders, totalCount] = await AppDataSource
  .getRepository(Order)
  .createQueryBuilder("order")
  .leftJoinAndSelect("order.user", "user")
  .leftJoinAndSelect("order.machine", "machine")
  .where("order.status IN (:...statuses)", { statuses: ["pending", "processing"] })
  .orderBy("order.created_at", "DESC")
  .skip((page - 1) * perPage)
  .take(perPage)
  .getManyAndCount();
```

### Raw SQL запросы

```typescript
// Для особо сложных запросов или когда QueryBuilder не подходит
const result = await AppDataSource.query(`
  SELECT
    m.id,
    m.name,
    m.serial_number,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COUNT(o.id) AS order_count,
    MAX(o.created_at) AS last_order_at
  FROM machines m
  LEFT JOIN orders o ON o.machine_id = m.id
    AND o.status = 'completed'
    AND o.deleted_at IS NULL
    AND o.created_at >= $1
  WHERE m.status = 'active'
    AND m.deleted_at IS NULL
  GROUP BY m.id, m.name, m.serial_number
  ORDER BY total_revenue DESC
  LIMIT $2
`, [startDate, limit]);
```

---

## 8. Транзакции

```typescript
import { AppDataSource } from "../config/data-source";
import { Order } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { BunkerInventory } from "../entities/bunker-inventory.entity";

// --- Вариант 1: через DataSource.transaction (рекомендуется) ---
await AppDataSource.transaction(async (manager) => {
  // Создать заказ
  const order = manager.create(Order, {
    order_number: generateOrderNumber(),
    user_id: input.userId,
    machine_id: input.machineId,
    total_amount: input.total,
    status: "pending",
    created_by_id: currentUserId,
  });
  await manager.save(order);

  // Создать позиции заказа
  const items = input.items.map((item) =>
    manager.create(OrderItem, {
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.quantity * item.price,
    })
  );
  await manager.save(items);

  // Обновить остатки в бункерах
  for (const item of input.items) {
    await manager
      .createQueryBuilder()
      .update(BunkerInventory)
      .set({
        current_level: () => `current_level - ${item.quantity}`,
        updated_by_id: currentUserId,
      })
      .where("product_id = :productId AND machine_id = :machineId", {
        productId: item.productId,
        machineId: input.machineId,
      })
      .execute();
  }

  // Если любой шаг бросит исключение — вся транзакция откатится
});

// --- Вариант 2: через QueryRunner (полный контроль) ---
const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  await queryRunner.manager.save(Order, orderData);
  await queryRunner.manager.save(OrderItem, itemsData);

  // Можно выполнить raw SQL внутри транзакции
  await queryRunner.query(`
    UPDATE bunker_inventory
    SET current_level = current_level - $1
    WHERE product_id = $2 AND machine_id = $3
  `, [quantity, productId, machineId]);

  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

---

## 9. Subscribers и Listeners

### Entity Listeners (в самой entity)

```typescript
// src/entities/order.entity.ts
import { Entity, BeforeInsert, BeforeUpdate, AfterSoftRemove } from "typeorm";

@Entity("orders")
export class Order extends BaseEntity {
  // ... колонки ...

  // Выполняется перед INSERT
  @BeforeInsert()
  generateOrderNumber() {
    if (!this.order_number) {
      this.order_number = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    }
  }

  // Выполняется перед UPDATE
  @BeforeUpdate()
  validateStatus() {
    // Нельзя вернуть отменённый заказ в обработку
    // Логика валидации перехода статусов
  }

  // Выполняется после soft delete
  @AfterSoftRemove()
  async onSoftDelete() {
    // Логика при soft-удалении заказа
    console.log(`Заказ ${this.order_number} помечен как удалённый`);
  }
}
```

### Subscriber (отдельный класс для сложной логики)

```typescript
// src/subscribers/order.subscriber.ts
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  SoftRemoveEvent,
} from "typeorm";
import { Order } from "../entities/order.entity";

@EventSubscriber()
export class OrderSubscriber implements EntitySubscriberInterface<Order> {
  // Подписываемся только на entity Order
  listenTo() {
    return Order;
  }

  // После создания заказа
  async afterInsert(event: InsertEvent<Order>): Promise<void> {
    const order = event.entity;
    // Отправить уведомление о новом заказе
    console.log(`Создан новый заказ: ${order.order_number}`);
    // await notificationService.sendNewOrderNotification(order);
  }

  // После обновления заказа
  async afterUpdate(event: UpdateEvent<Order>): Promise<void> {
    const order = event.entity as Order;
    // Проверить смену статуса и выполнить действия
    if (event.updatedColumns.some((col) => col.propertyName === "status")) {
      console.log(`Статус заказа ${order.order_number} изменён на: ${order.status}`);
    }
  }

  // После soft delete
  async afterSoftRemove(event: SoftRemoveEvent<Order>): Promise<void> {
    const order = event.entity as Order;
    console.log(`Заказ ${order.order_number} удалён (soft delete)`);
  }
}
```

```typescript
// src/subscribers/audit.subscriber.ts
// Глобальный subscriber для аудита всех entity

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  // Без listenTo() — слушает ВСЕ entity

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    // Автоматически проставляем updated_by_id при обновлении
    if (event.entity && event.queryRunner.data?.currentUserId) {
      event.entity.updated_by_id = event.queryRunner.data.currentUserId;
    }
  }
}
```

---

## 10. Существующие таблицы VendHub

### Основные сущности

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `users` | Пользователи системы | email, full_name, role, phone |
| `machines` | Вендинговые автоматы | serial_number, status, location_id, owner_id |
| `products` | Товары/напитки | name, sku, price, category, is_available |
| `orders` | Заказы/продажи | order_number, status, total_amount, user_id, machine_id |
| `order_items` | Позиции заказа | order_id, product_id, quantity, unit_price |
| `employees` | Сотрудники | user_id, position, department, hire_date |

### Склад и ингредиенты

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `ingredients` | Ингредиенты для напитков | name, unit, cost_per_unit |
| `product_ingredients` | Состав продукта | product_id, ingredient_id, amount, unit |
| `bunkers` | Бункеры (ёмкости в автоматах) | machine_id, ingredient_id, capacity, current_level |
| `warehouse_inventory` | Остатки на складе | ingredient_id, warehouse_id, quantity |
| `stock_movements` | Движение товаров | type, ingredient_id, quantity, from_location, to_location |

### Операции и обслуживание

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `tasks` | Задачи для сотрудников | title, status, assignee_id, machine_id, due_date |
| `work_logs` | Рабочие логи | employee_id, machine_id, action_type, started_at, finished_at |
| `spare_parts` | Запасные части | name, sku, quantity, min_quantity |
| `maintenance_schedule` | График обслуживания | machine_id, type, scheduled_at, completed_at |
| `machine_events` | События автоматов | machine_id, event_type, payload, occurred_at |

### Финансы

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `payments` | Платежи | order_id, method, amount, status, transaction_id |
| `cash_collections` | Инкассации | machine_id, collector_id, amount, collected_at |
| `payment_methods` | Способы оплаты | name, type, is_active, config |

### Справочники и настройки

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `locations` | Локации/адреса | name, address, lat, lng, type |
| `warehouses` | Склады | name, location_id, type |
| `roles` | Роли пользователей | name, permissions |
| `settings` | Системные настройки | key, value, group |
| `audit_logs` | Лог аудита | entity_name, entity_id, action, changes, user_id |

---

## 11. Именование (Naming Conventions)

### Общие правила

| Элемент | Стиль | Пример |
|---------|-------|--------|
| Таблицы | snake_case, множественное число | `order_items`, `cash_collections` |
| Колонки | snake_case | `full_name`, `created_at`, `is_active` |
| Первичный ключ | `id` (UUID) | `id: string` |
| Внешний ключ | `{entity}_id` | `user_id`, `machine_id` |
| Индексы | `idx_{table}_{columns}` | `idx_orders_user_id` |
| Уникальные индексы | `uq_{table}_{columns}` | `uq_users_email` |
| Внешние ключи (FK) | `fk_{table}_{column}` | `fk_orders_user` |
| Enum типы | `{table}_{column}_enum` | `machine_status_enum` |
| Junction таблицы | `{table1}_{table2}` | `product_ingredients` |
| Миграции | `{timestamp}-{Description}` | `1700000000000-CreateMachines` |

### Правила для колонок

```typescript
// ПРАВИЛЬНО: snake_case для имён колонок в БД
@Column({ name: "full_name", type: "varchar", length: 255 })
full_name: string;

@Column({ name: "is_active", type: "boolean", default: true })
is_active: boolean;

@Column({ name: "last_service_date", type: "timestamptz", nullable: true })
last_service_date: Date | null;

@Column({ name: "owner_id", type: "uuid", nullable: true })
owner_id: string | null;

// НЕПРАВИЛЬНО: camelCase в БД
// @Column({ type: "varchar" })
// fullName: string;  // <-- НЕ ДЕЛАЙ ТАК
```

### Правила для таблиц

```typescript
// ПРАВИЛЬНО
@Entity("order_items")      // snake_case, множественное число
@Entity("cash_collections")
@Entity("warehouse_inventory")

// НЕПРАВИЛЬНО
// @Entity("OrderItem")     // <-- PascalCase
// @Entity("orderItems")    // <-- camelCase
```

---

## 12. Паттерны Seed Data

### Структура сидов

```typescript
// src/seeds/seed-runner.ts
import { AppDataSource } from "../config/data-source";
import { seedRoles } from "./role.seed";
import { seedUsers } from "./user.seed";
import { seedLocations } from "./location.seed";
import { seedMachines } from "./machine.seed";
import { seedProducts } from "./product.seed";
import { seedIngredients } from "./ingredient.seed";

// Порядок важен — сначала независимые entity, потом зависимые
const seeds = [
  { name: "Роли", fn: seedRoles },
  { name: "Пользователи", fn: seedUsers },
  { name: "Локации", fn: seedLocations },
  { name: "Автоматы", fn: seedMachines },
  { name: "Продукты", fn: seedProducts },
  { name: "Ингредиенты", fn: seedIngredients },
];

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  console.log("Подключение к БД установлено");

  for (const seed of seeds) {
    try {
      console.log(`Загрузка сида: ${seed.name}...`);
      await seed.fn(AppDataSource);
      console.log(`Сид "${seed.name}" загружен успешно`);
    } catch (error) {
      console.error(`Ошибка загрузки сида "${seed.name}":`, error);
      throw error;
    }
  }

  console.log("Все сиды загружены успешно");
  await AppDataSource.destroy();
}

runSeeds().catch((error) => {
  console.error("Ошибка:", error);
  process.exit(1);
});
```

### Пример отдельного сида

```typescript
// src/seeds/user.seed.ts
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { UserRole } from "../entities/enums/user-role.enum";

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  // Проверяем, есть ли уже данные (идемпотентность)
  const existingCount = await userRepo.count();
  if (existingCount > 0) {
    console.log("Таблица users уже содержит данные, пропускаем сид");
    return;
  }

  const users: Partial<User>[] = [
    {
      email: "admin@vendhub.ru",
      full_name: "Администратор VendHub",
      role: UserRole.ADMIN,
      phone: "+7 900 000 0001",
    },
    {
      email: "manager@vendhub.ru",
      full_name: "Иванов Пётр Сергеевич",
      role: UserRole.MANAGER,
      phone: "+7 900 000 0002",
    },
    {
      email: "tech01@vendhub.ru",
      full_name: "Сидоров Алексей Владимирович",
      role: UserRole.TECHNICIAN,
      phone: "+7 900 000 0003",
    },
    {
      email: "operator01@vendhub.ru",
      full_name: "Козлова Мария Ивановна",
      role: UserRole.OPERATOR,
      phone: "+7 900 000 0004",
    },
  ];

  await userRepo.save(userRepo.create(users));
  console.log(`Создано ${users.length} пользователей`);
}
```

### Сид с зависимостями

```typescript
// src/seeds/machine.seed.ts
import { DataSource } from "typeorm";
import { Machine } from "../entities/machine.entity";
import { User } from "../entities/user.entity";
import { Location } from "../entities/location.entity";
import { MachineStatus } from "../entities/enums/machine-status.enum";

export async function seedMachines(dataSource: DataSource): Promise<void> {
  const machineRepo = dataSource.getRepository(Machine);
  const userRepo = dataSource.getRepository(User);
  const locationRepo = dataSource.getRepository(Location);

  const existingCount = await machineRepo.count();
  if (existingCount > 0) return;

  // Получить зависимые записи
  const manager = await userRepo.findOneBy({ email: "manager@vendhub.ru" });
  const locations = await locationRepo.find();

  if (!manager || locations.length === 0) {
    throw new Error("Необходимые данные (пользователи, локации) отсутствуют. Запустите соответствующие сиды.");
  }

  const machines: Partial<Machine>[] = [
    {
      name: "Автомат ТЦ Мега-1",
      serial_number: "VH-2024-001",
      status: MachineStatus.ACTIVE,
      slot_count: 8,
      is_online: true,
      owner_id: manager.id,
      location_id: locations[0].id,
      settings: { temperature: 5, brightness: 80 },
    },
    {
      name: "Автомат Офис Центр-2",
      serial_number: "VH-2024-002",
      status: MachineStatus.ACTIVE,
      slot_count: 12,
      is_online: true,
      owner_id: manager.id,
      location_id: locations[1]?.id || locations[0].id,
      settings: { temperature: 4, brightness: 70 },
    },
    {
      name: "Автомат Вокзал-3",
      serial_number: "VH-2024-003",
      status: MachineStatus.MAINTENANCE,
      slot_count: 6,
      is_online: false,
      owner_id: manager.id,
      location_id: locations[2]?.id || locations[0].id,
      settings: { temperature: 5, brightness: 90 },
    },
  ];

  await machineRepo.save(machineRepo.create(machines));
  console.log(`Создано ${machines.length} автоматов`);
}
```

### Запуск сидов

```bash
# Запуск всех сидов
npx ts-node src/seeds/seed-runner.ts

# Или через скрипт в package.json
# "db:seed": "ts-node src/seeds/seed-runner.ts"
npm run db:seed
```

---

## Workflow создания новой entity

### Шаг 1: Анализ требований

Определить:
- Какие поля нужны и их типы
- Связи с существующими таблицами
- Какие индексы понадобятся
- Нужны ли enum типы
- Бизнес-правила (валидация, значения по умолчанию)

### Шаг 2: Создание entity файла

```bash
# Создать файл entity
touch src/entities/new-entity.entity.ts
```

```typescript
// src/entities/new-entity.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("new_entities") // snake_case, множественное число
@Index("idx_new_entities_status", ["status"])
export class NewEntity extends BaseEntity {
  // Поля entity...
}
```

### Шаг 3: Генерация миграции

```bash
npx typeorm migration:generate src/migrations/CreateNewEntities -d src/config/data-source.ts
```

### Шаг 4: Проверка сгенерированной миграции

Открыть файл миграции и проверить:
- Правильные типы колонок
- Индексы созданы
- FK ссылаются на правильные таблицы
- Метод `down()` корректно откатывает изменения

### Шаг 5: Применение миграции

```bash
npx typeorm migration:run -d src/config/data-source.ts
```

### Шаг 6: Создание сида (если нужны начальные данные)

```bash
touch src/seeds/new-entity.seed.ts
```

---

## Ссылки

- `references/database-schema.md` — Полная схема всех таблиц
- `references/query-patterns.md` — Примеры сложных запросов
- [TypeORM документация](https://typeorm.io/)
- [PostgreSQL 16 документация](https://www.postgresql.org/docs/16/)
