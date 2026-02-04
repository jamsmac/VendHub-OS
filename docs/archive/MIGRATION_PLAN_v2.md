# План миграции VHM24-repo → VendHub OS (v2.0)

> **Версия:** 2.0 (Объединённый план)
> **Дата:** 03 февраля 2026
> **Базовая архитектура:** VendHub OS (Turborepo + Drizzle + tRPC)
> **Бизнес-логика:** VHM24-repo (56 модулей, 120 entities)
> **UI/UX:** Существующая спецификация VendHub OS
> **Оценка времени:** 6-8 недель

---

## 📋 Оглавление

1. [Принципы миграции](#1-принципы-миграции)
2. [Технологический стек](#2-технологический-стек)
3. [Фаза 0: Справочники и базовая структура](#3-фаза-0-справочники-и-базовая-структура)
4. [Фаза 1: Core модули](#4-фаза-1-core-модули)
5. [Фаза 2: Операционные модули](#5-фаза-2-операционные-модули)
6. [Фаза 3: Финансы и аналитика](#6-фаза-3-финансы-и-аналитика)
7. [Фаза 4: Интеграции и AI](#7-фаза-4-интеграции-и-ai)
8. [Адаптация TypeORM → Drizzle](#8-адаптация-typeorm--drizzle)
9. [UI/UX и дизайн-система](#9-uiux-и-дизайн-система)
10. [Чеклист готовности](#10-чеклист-готовности)

---

## 1. Принципы миграции

### 1.1 Что сохраняем из VendHub OS

```
✅ Turborepo monorepo структура
✅ pnpm workspace
✅ Drizzle ORM (MySQL)
✅ tRPC для type-safe API
✅ Shared packages (types, utils, constants)
✅ K8s + Helm + Terraform инфраструктура
✅ Apps структура (api, web, client, bot, mobile)
```

### 1.2 Что переносим из VHM24-repo

```
✅ Бизнес-логика 56 модулей
✅ 120 entity определений (адаптируем под Drizzle)
✅ Валидация и DTO (адаптируем под Zod)
✅ Сервисная логика
✅ Frontend компоненты (адаптируем)
✅ Документация и CLAUDE.md
```

### 1.3 Что берём из VHD и спецификаций

```
✅ Справочники Узбекистана (ИКПУ, MXIK, НДС, маркировка)
✅ Структура товаров (Напитки vs Снеки)
✅ Платёжные провайдеры (Payme, Click, Uzum)
✅ UI/UX спецификация навигации
✅ Дизайн-система "Warm Brew"
✅ AI Import иерархия
```

---

## 2. Технологический стек

### 2.1 Финальный стек (объединённый)

| Слой | Технология | Источник |
|------|------------|----------|
| **Monorepo** | Turborepo + pnpm | VendHub OS ✅ |
| **Backend** | Express + tRPC | VendHub OS ✅ |
| **ORM** | Drizzle ORM | VendHub OS ✅ |
| **Database** | MySQL 8 | VendHub OS ✅ |
| **Validation** | Zod | VendHub OS ✅ |
| **Frontend** | Next.js 15 + React 19 | VHM24-repo ✅ |
| **State** | Zustand 5 | vhm24v2 ✅ |
| **UI** | shadcn/ui + Radix | Оба ✅ |
| **Styling** | TailwindCSS 4 | vhm24v2 ✅ |
| **Charts** | Recharts 2 | VHM24-repo ✅ |
| **Forms** | React Hook Form + Zod | Оба ✅ |
| **Maps** | Yandex Maps | VHM24-repo ✅ |
| **Real-time** | Socket.IO | VHM24-repo ✅ |
| **Queue** | Bull 5 | VHM24-repo ✅ |
| **Cache** | Redis 7 | VHM24-repo ✅ |
| **Bot** | aiogram 3.4 | vendhub-bot2 ✅ |
| **TWA** | @twa-dev/sdk | vhm24v2 ✅ |

### 2.2 Структура monorepo

```
VendHub OS/vendhub-unified/
├── apps/
│   ├── api/                    # Backend (tRPC + Express)
│   │   └── src/
│   │       ├── modules/        # 56+ модулей из VHM24-repo
│   │       ├── db/
│   │       │   ├── schema/     # Drizzle schemas
│   │       │   └── migrations/ # Миграции
│   │       └── trpc/           # tRPC routers
│   ├── web/                    # Admin Dashboard (Next.js)
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       └── components/     # UI компоненты
│   ├── client/                 # Client TWA (React + Vite)
│   ├── bot/                    # Telegram Bot (aiogram)
│   └── mobile/                 # React Native (Expo)
├── packages/
│   ├── shared-types/           # TypeScript типы
│   ├── shared-utils/           # Утилиты
│   ├── shared-constants/       # Константы, enums
│   ├── shared-validators/      # Zod схемы
│   └── ui/                     # Shared UI компоненты
└── infrastructure/
    ├── k8s/
    ├── helm/
    └── terraform/
```

---

## 3. Фаза 0: Справочники и базовая структура

> **Длительность:** 3-4 дня
> **Цель:** Создать фундамент для всех данных

### 3.1 Иерархия заполнения БД (из VHD)

```
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 0: СИСТЕМНЫЕ (seed автоматически)                  │
├─────────────────────────────────────────────────────────────┤
│  • languages (ru, uz, en)                                   │
│  • currencies (UZS, USD)                                    │
│  • timezones (Asia/Tashkent)                               │
│  • system_roles (super_admin, admin, manager...)           │
│  • measurement_units (шт, кг, л, мл, г)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: СПРАВОЧНИКИ УЗБЕКИСТАНА                        │
├─────────────────────────────────────────────────────────────┤
│  • goods_classifiers (MXIK коды - иерархия)                │
│  • ikpu_codes (налоговые коды 10 цифр)                     │
│  • vat_rates (0%, 5%, 12%, 15%)                            │
│  • package_types (CAN, BOT, PKG, CUP - UN/CEFACT)          │
│  • marking_types (Честный знак, Data Matrix)               │
│  • payment_providers (Payme, Click, Uzum, cash)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 2: ОРГАНИЗАЦИОННЫЕ                                 │
├─────────────────────────────────────────────────────────────┤
│  • organizations (tenants)                                  │
│  • users + user_sessions                                    │
│  • roles + permissions (RBAC)                               │
│  • locations (регионы, адреса)                             │
│  • suppliers (поставщики)                                   │
│  • categories (категории товаров)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 3: ОСНОВНЫЕ СУЩНОСТИ                              │
├─────────────────────────────────────────────────────────────┤
│  • products (напитки + снеки)                              │
│  • ingredients (ингредиенты для напитков)                  │
│  • recipes (рецептуры)                                     │
│  • machines (автоматы)                                     │
│  • warehouses + warehouse_zones                            │
│  • equipment (оборудование)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 4: ОПЕРАЦИОННЫЕ                                   │
├─────────────────────────────────────────────────────────────┤
│  • tasks + task_items                                      │
│  • inventory + stock_movements                             │
│  • transactions (продажи)                                  │
│  • orders (заказы клиентов)                               │
│  • incidents + complaints                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Drizzle схемы для справочников

```typescript
// packages/shared-types/src/db/schema/references.ts

import { mysqlTable, int, varchar, decimal, boolean, timestamp, json } from 'drizzle-orm/mysql-core';

// ========== СПРАВОЧНИКИ УЗБЕКИСТАНА ==========

// MXIK классификатор товаров (иерархический)
export const goodsClassifiers = mysqlTable('goods_classifiers', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 20 }).notNull().unique(), // "10810001001000000"
  nameUz: varchar('name_uz', { length: 500 }).notNull(),
  nameRu: varchar('name_ru', { length: 500 }).notNull(),
  parentId: int('parent_id').references(() => goodsClassifiers.id),
  level: int('level').notNull().default(1), // 1-5
  isActive: boolean('is_active').notNull().default(true),
  allowedUnits: json('allowed_units').$type<string[]>(), // ["шт", "кг", "л"]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ИКПУ налоговые коды
export const ikpuCodes = mysqlTable('ikpu_codes', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 10 }).notNull().unique(), // 10 цифр
  name: varchar('name', { length: 500 }).notNull(),
  mxikCode: varchar('mxik_code', { length: 20 }), // связь с MXIK
  vatPercent: decimal('vat_percent', { precision: 5, scale: 2 }).notNull(),
  exciseRate: decimal('excise_rate', { precision: 10, scale: 2 }),
  isMarked: boolean('is_marked').notNull().default(false), // требует маркировки
  createdAt: timestamp('created_at').defaultNow(),
});

// Ставки НДС
export const vatRates = mysqlTable('vat_rates', {
  id: int('id').primaryKey().autoincrement(),
  percent: decimal('percent', { precision: 5, scale: 2 }).notNull().unique(),
  name: varchar('name', { length: 50 }).notNull(), // "НДС 12%"
  isDefault: boolean('is_default').notNull().default(false),
});

// Типы упаковки (UN/CEFACT)
export const packageTypes = mysqlTable('package_types', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 10 }).notNull().unique(), // CAN, BOT, PKG, CUP
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }),
  coefficient: decimal('coefficient', { precision: 10, scale: 4 }).default('1'),
});

// Маркировка товаров (Честный знак)
export const productMarks = mysqlTable('product_marks', {
  id: int('id').primaryKey().autoincrement(),
  productId: int('product_id').notNull(),
  markCode: varchar('mark_code', { length: 100 }).notNull().unique(), // Data Matrix
  serialNumber: varchar('serial_number', { length: 50 }),
  gtin: varchar('gtin', { length: 14 }), // Global Trade Item Number
  productionDate: timestamp('production_date'),
  expiryDate: timestamp('expiry_date'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, sold, returned, written_off
  createdAt: timestamp('created_at').defaultNow(),
});

// Платёжные провайдеры
export const paymentProviders = mysqlTable('payment_providers', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 20 }).notNull().unique(), // payme, click, uzum, cash
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  config: json('config'), // API keys, endpoints (зашифровано)
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }),
});
```

### 3.3 Seed данные

```typescript
// apps/api/src/db/seeds/references.seed.ts

export const vatRatesSeed = [
  { percent: 0, name: 'Без НДС', isDefault: false },
  { percent: 5, name: 'НДС 5%', isDefault: false },
  { percent: 12, name: 'НДС 12%', isDefault: true },
  { percent: 15, name: 'НДС 15%', isDefault: false },
];

export const packageTypesSeed = [
  { code: 'CAN', name: 'Банка', description: 'Жестяная банка' },
  { code: 'BOT', name: 'Бутылка', description: 'Пластиковая/стеклянная бутылка' },
  { code: 'PKG', name: 'Упаковка', description: 'Упаковка/пакет' },
  { code: 'CUP', name: 'Стакан', description: 'Одноразовый стакан' },
  { code: 'PCE', name: 'Штука', description: 'Поштучно' },
];

export const paymentProvidersSeed = [
  { code: 'cash', name: 'Наличные', commissionPercent: 0 },
  { code: 'payme', name: 'Payme', commissionPercent: 1.5 },
  { code: 'click', name: 'Click', commissionPercent: 1.5 },
  { code: 'uzum', name: 'Uzum Bank', commissionPercent: 1.0 },
  { code: 'humo', name: 'HUMO', commissionPercent: 0.5 },
  { code: 'uzcard', name: 'UZCARD', commissionPercent: 0.5 },
  { code: 'telegram_stars', name: 'Telegram Stars', commissionPercent: 0 },
];

export const measurementUnitsSeed = [
  { code: 'pcs', name: 'штук', shortName: 'шт' },
  { code: 'kg', name: 'килограмм', shortName: 'кг' },
  { code: 'g', name: 'грамм', shortName: 'г' },
  { code: 'l', name: 'литр', shortName: 'л' },
  { code: 'ml', name: 'миллилитр', shortName: 'мл' },
];
```

---

## 4. Фаза 1: Core модули

> **Длительность:** 5-7 дней
> **Модули:** auth, users, organizations, rbac, locations

### 4.1 RBAC система (из VHM24-repo)

#### Роли системы (8 ролей)

| Роль | Код | Уровень | Описание |
|------|-----|---------|----------|
| Super Admin | `super_admin` | 0 | Полный доступ ко всему |
| Owner | `owner` | 1 | Владелец организации |
| Admin | `admin` | 2 | Администратор |
| Manager | `manager` | 3 | Менеджер операций |
| Accountant | `accountant` | 4 | Бухгалтер |
| Warehouse | `warehouse` | 5 | Кладовщик |
| Operator | `operator` | 6 | Оператор (обслуживание) |
| Technician | `technician` | 7 | Техник (ремонт) |
| Viewer | `viewer` | 8 | Только просмотр |

#### Drizzle схема RBAC

```typescript
// apps/api/src/db/schema/rbac.ts

export const roles = mysqlTable('roles', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }),
  level: int('level').notNull().default(100), // меньше = больше прав
  isSystem: boolean('is_system').notNull().default(false),
  organizationId: int('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const permissions = mysqlTable('permissions', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 100 }).notNull().unique(), // "machines.create"
  name: varchar('name', { length: 100 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(), // "machines"
  action: varchar('action', { length: 50 }).notNull(), // "create"
  description: varchar('description', { length: 255 }),
});

export const rolePermissions = mysqlTable('role_permissions', {
  id: int('id').primaryKey().autoincrement(),
  roleId: int('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: int('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

export const userRoles = mysqlTable('user_roles', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: int('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  organizationId: int('organization_id').references(() => organizations.id),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: int('assigned_by').references(() => users.id),
});
```

#### tRPC роутер для RBAC

```typescript
// apps/api/src/trpc/routers/rbac.router.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';

export const rbacRouter = createTRPCRouter({
  // Получить все роли
  listRoles: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.roles.findMany({
      with: { permissions: true },
      orderBy: (roles, { asc }) => [asc(roles.level)],
    });
  }),

  // Назначить роль пользователю
  assignRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      roleId: z.number(),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insert(userRoles).values({
        userId: input.userId,
        roleId: input.roleId,
        organizationId: input.organizationId,
        assignedBy: ctx.user.id,
      });
    }),

  // Проверить permission
  checkPermission: protectedProcedure
    .input(z.object({ permissionCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const userPerms = await ctx.db.query.userRoles.findMany({
        where: eq(userRoles.userId, ctx.user.id),
        with: {
          role: {
            with: { permissions: true },
          },
        },
      });

      return userPerms.some(ur =>
        ur.role.permissions.some(p => p.code === input.permissionCode)
      );
    }),
});
```

### 4.2 Задачи Фазы 1

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 1.1 | Drizzle схемы: users, organizations, sessions | VHM24-repo | 4ч |
| 1.2 | Drizzle схемы: roles, permissions, user_roles | VHM24-repo | 3ч |
| 1.3 | Drizzle схемы: locations | VHM24-repo | 2ч |
| 1.4 | tRPC router: auth (login, logout, refresh) | VHM24-repo | 4ч |
| 1.5 | tRPC router: users CRUD | VHM24-repo | 3ч |
| 1.6 | tRPC router: rbac (roles, permissions) | VHM24-repo | 3ч |
| 1.7 | tRPC router: locations CRUD | VHM24-repo | 2ч |
| 1.8 | Middleware: auth, rbac guards | VHM24-repo | 3ч |
| 1.9 | Frontend: Login, Profile pages | VHM24-repo | 4ч |
| 1.10 | Frontend: Users list, User detail | VHM24-repo | 4ч |

---

## 5. Фаза 2: Операционные модули

> **Длительность:** 10-12 дней
> **Модули:** products, machines, inventory, tasks, warehouse

### 5.1 Система товаров (Напитки vs Снеки)

#### Ключевое различие (из UI_UX_SPECIFICATION)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ДВА ТИПА ТОВАРОВ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🍵 НАПИТКИ (drinks)              🍫 СНЕКИ (snacks)            │
│  ─────────────────────            ─────────────────────        │
│                                                                 │
│  • ЕСТЬ рецептура                 • НЕТ рецептуры              │
│  • Себестоимость =                • Себестоимость =            │
│    СУММА ингредиентов               закупочная цена            │
│                                                                 │
│  • costPrice рассчитывается       • costPrice вводится         │
│    автоматически                    вручную                    │
│                                                                 │
│  • Маржа = sellPrice - costPrice  • Наценка в %                │
│                                   • sellPrice = cost * (1+%)   │
│                                                                 │
│  Пример:                          Пример:                      │
│  Americano                        Snickers 50g                 │
│  Ингредиенты: 1,011 сум          Закупка: 8,000 сум           │
│  Продажа: 20,000 сум             Наценка: 50%                  │
│  Маржа: 94.9%                    Продажа: 12,000 сум           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Drizzle схема товаров

```typescript
// apps/api/src/db/schema/products.ts

export const productTypeEnum = mysqlEnum('product_type', ['drink', 'snack']);
export const productStatusEnum = mysqlEnum('product_status', ['active', 'inactive', 'archived']);

export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoincrement(),

  // Основное
  name: varchar('name', { length: 255 }).notNull(),
  tasteName: varchar('taste_name', { length: 255 }), // вкусовое название для напитков
  description: text('description'),
  type: productTypeEnum.notNull(), // drink или snack
  status: productStatusEnum.notNull().default('active'),

  // Категоризация
  categoryId: int('category_id').references(() => categories.id),

  // Справочники Узбекистана
  ikpuCodeId: int('ikpu_code_id').references(() => ikpuCodes.id),
  packageTypeId: int('package_type_id').references(() => packageTypes.id),
  vatRateId: int('vat_rate_id').references(() => vatRates.id),
  barcode: varchar('barcode', { length: 50 }),
  requiresMarking: boolean('requires_marking').default(false),

  // Ценообразование
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull(), // себестоимость
  sellPrice: decimal('sell_price', { precision: 12, scale: 2 }).notNull(), // розничная цена
  markupPercent: decimal('markup_percent', { precision: 5, scale: 2 }), // наценка % (для снеков)

  // Для снеков
  supplierId: int('supplier_id').references(() => suppliers.id),
  minOrderQty: int('min_order_qty'),
  shelfLifeDays: int('shelf_life_days'),

  // Изображение
  imageUrl: varchar('image_url', { length: 500 }),

  // Мета
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Ингредиенты (для напитков)
export const ingredients = mysqlTable('ingredients', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(), // г, мл, шт
  pricePerUnit: decimal('price_per_unit', { precision: 12, scale: 4 }).notNull(), // цена за единицу
  currentStock: decimal('current_stock', { precision: 12, scale: 4 }).default('0'),
  minStock: decimal('min_stock', { precision: 12, scale: 4 }),
  supplierId: int('supplier_id').references(() => suppliers.id),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Рецептуры (связь продукт-ингредиент)
export const recipes = mysqlTable('recipes', {
  id: int('id').primaryKey().autoincrement(),
  productId: int('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  ingredientId: int('ingredient_id').notNull().references(() => ingredients.id),
  quantity: decimal('quantity', { precision: 10, scale: 4 }).notNull(), // количество ингредиента
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### Автоматический расчёт себестоимости напитка

```typescript
// apps/api/src/modules/products/products.service.ts

export async function calculateDrinkCostPrice(productId: number, db: DB): Promise<number> {
  const recipe = await db.query.recipes.findMany({
    where: eq(recipes.productId, productId),
    with: { ingredient: true },
  });

  let totalCost = 0;
  for (const item of recipe) {
    // quantity * pricePerUnit
    totalCost += Number(item.quantity) * Number(item.ingredient.pricePerUnit);
  }

  return totalCost;
}

// При изменении рецептуры автоматически пересчитываем costPrice
export async function updateDrinkCostPrice(productId: number, db: DB) {
  const costPrice = await calculateDrinkCostPrice(productId, db);

  await db.update(products)
    .set({ costPrice: costPrice.toFixed(2) })
    .where(eq(products.id, productId));
}
```

### 5.2 3-уровневая система инвентаря

```
┌─────────────────────────────────────────────────────────────────┐
│              3-УРОВНЕВАЯ СИСТЕМА ИНВЕНТАРЯ                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   СКЛАД (Warehouse)                                             │
│   └── Зоны (Warehouse Zones)                                    │
│       └── Остатки по зонам                                      │
│              │                                                  │
│              │ Выдача оператору                                 │
│              ▼                                                  │
│   ОПЕРАТОР (Operator)                                           │
│   └── Персональный запас                                        │
│       └── Ответственность за товар                              │
│              │                                                  │
│              │ Загрузка в автомат                               │
│              ▼                                                  │
│   АВТОМАТ (Machine)                                             │
│   └── Слоты (Machine Slots)                                     │
│       └── Бункеры (Bunkers) - для напитков                     │
│       └── Спирали (Spirals) - для снеков                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Drizzle схемы инвентаря

```typescript
// apps/api/src/db/schema/inventory.ts

// Склады
export const warehouses = mysqlTable('warehouses', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Зоны склада
export const warehouseZones = mysqlTable('warehouse_zones', {
  id: int('id').primaryKey().autoincrement(),
  warehouseId: int('warehouse_id').notNull().references(() => warehouses.id),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
});

// Остатки на складе
export const warehouseStock = mysqlTable('warehouse_stock', {
  id: int('id').primaryKey().autoincrement(),
  warehouseId: int('warehouse_id').notNull().references(() => warehouses.id),
  zoneId: int('zone_id').references(() => warehouseZones.id),
  productId: int('product_id').references(() => products.id),
  ingredientId: int('ingredient_id').references(() => ingredients.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull().default('0'),
  reservedQty: decimal('reserved_qty', { precision: 12, scale: 4 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Остатки у оператора
export const operatorStock = mysqlTable('operator_stock', {
  id: int('id').primaryKey().autoincrement(),
  operatorId: int('operator_id').notNull().references(() => users.id),
  productId: int('product_id').references(() => products.id),
  ingredientId: int('ingredient_id').references(() => ingredients.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Остатки в автомате (слоты)
export const machineSlots = mysqlTable('machine_slots', {
  id: int('id').primaryKey().autoincrement(),
  machineId: int('machine_id').notNull().references(() => machines.id),
  slotNumber: int('slot_number').notNull(),
  productId: int('product_id').references(() => products.id),
  currentQty: int('current_qty').notNull().default(0),
  maxQty: int('max_qty').notNull(),
  minQty: int('min_qty').default(0), // для алертов
  price: decimal('price', { precision: 12, scale: 2 }), // может отличаться от базовой
});

// Бункеры (для кофейных автоматов)
export const machineBunkers = mysqlTable('machine_bunkers', {
  id: int('id').primaryKey().autoincrement(),
  machineId: int('machine_id').notNull().references(() => machines.id),
  bunkerNumber: int('bunker_number').notNull(),
  ingredientId: int('ingredient_id').references(() => ingredients.id),
  currentWeight: decimal('current_weight', { precision: 10, scale: 2 }), // граммы
  maxWeight: decimal('max_weight', { precision: 10, scale: 2 }),
  minWeight: decimal('min_weight', { precision: 10, scale: 2 }), // для алертов
});

// Перемещения товаров
export const stockMovementTypeEnum = mysqlEnum('movement_type', [
  'receipt',        // приёмка на склад
  'issue_operator', // выдача оператору
  'return_operator',// возврат от оператора
  'load_machine',   // загрузка в автомат
  'unload_machine', // выгрузка из автомата
  'sale',           // продажа
  'write_off',      // списание
  'adjustment',     // корректировка
  'transfer',       // перемещение между складами
]);

export const stockMovements = mysqlTable('stock_movements', {
  id: int('id').primaryKey().autoincrement(),
  type: stockMovementTypeEnum.notNull(),

  // Что перемещаем
  productId: int('product_id').references(() => products.id),
  ingredientId: int('ingredient_id').references(() => ingredients.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),

  // Откуда-куда
  fromWarehouseId: int('from_warehouse_id').references(() => warehouses.id),
  toWarehouseId: int('to_warehouse_id').references(() => warehouses.id),
  fromOperatorId: int('from_operator_id').references(() => users.id),
  toOperatorId: int('to_operator_id').references(() => users.id),
  fromMachineId: int('from_machine_id').references(() => machines.id),
  toMachineId: int('to_machine_id').references(() => machines.id),

  // Документы
  documentNumber: varchar('document_number', { length: 50 }),
  documentDate: timestamp('document_date'),
  notes: text('notes'),

  // Мета
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 5.3 Задачи Фазы 2

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 2.1 | Drizzle схемы: products, ingredients, recipes | VHM24-repo + UI_UX | 4ч |
| 2.2 | Drizzle схемы: machines, machine_slots, bunkers | VHM24-repo | 4ч |
| 2.3 | Drizzle схемы: warehouses, stock, movements | VHM24-repo | 4ч |
| 2.4 | Drizzle схемы: tasks, task_items, task_comments | VHM24-repo | 3ч |
| 2.5 | tRPC router: products CRUD + costPrice calc | VHM24-repo | 4ч |
| 2.6 | tRPC router: ingredients, recipes | VHM24-repo | 3ч |
| 2.7 | tRPC router: machines CRUD + slots | VHM24-repo | 4ч |
| 2.8 | tRPC router: inventory (3 уровня) | VHM24-repo | 6ч |
| 2.9 | tRPC router: stock movements | VHM24-repo | 4ч |
| 2.10 | tRPC router: tasks CRUD + assignment | VHM24-repo | 4ч |
| 2.11 | Frontend: Products list (drinks/snacks tabs) | UI_UX_SPEC | 6ч |
| 2.12 | Frontend: Product detail (drink card vs snack card) | UI_UX_SPEC | 6ч |
| 2.13 | Frontend: Product create/edit forms | UI_UX_SPEC | 4ч |
| 2.14 | Frontend: Machines list + detail | VHM24-repo | 6ч |
| 2.15 | Frontend: Machines map (Yandex) | VHM24-repo | 4ч |
| 2.16 | Frontend: Inventory dashboard (3 levels) | UI_UX_SPEC | 6ч |
| 2.17 | Frontend: Stock movements | VHM24-repo | 4ч |
| 2.18 | Frontend: Tasks Kanban | VHM24-repo | 6ч |

---

## 6. Фаза 3: Финансы и аналитика

> **Длительность:** 7-9 дней
> **Модули:** transactions, reconciliation, analytics, reports

### 6.1 Reconciliation (сверка данных)

Критически важный модуль из VHM24-repo для сверки продаж из разных источников:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECONCILIATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ИСТОЧНИКИ ДАННЫХ:                                            │
│   ├── HW Export (выгрузка с автомата)                         │
│   ├── VendHub транзакции (наша система)                       │
│   ├── Payme отчёты                                            │
│   ├── Click отчёты                                            │
│   ├── Узum отчёты                                             │
│   └── Фискальные чеки (MultiKassa)                            │
│                                                                 │
│   АЛГОРИТМ СВЕРКИ:                                             │
│   1. Загрузка данных из всех источников                       │
│   2. Сопоставление по: дата + автомат + сумма + товар         │
│   3. Классификация:                                            │
│      • MATCHED - совпадение во всех источниках                │
│      • HW_ONLY - только в выгрузке автомата                   │
│      • SW_ONLY - только в VendHub                             │
│      • MISMATCH - расхождение сумм                            │
│                                                                 │
│   ОТЧЁТ:                                                       │
│   • Общая статистика                                          │
│   • Детализация расхождений                                   │
│   • Рекомендации по исправлению                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// apps/api/src/db/schema/reconciliation.ts

export const reconciliationRuns = mysqlTable('reconciliation_runs', {
  id: int('id').primaryKey().autoincrement(),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed

  // Статистика
  totalHwRecords: int('total_hw_records').default(0),
  totalSwRecords: int('total_sw_records').default(0),
  matchedCount: int('matched_count').default(0),
  hwOnlyCount: int('hw_only_count').default(0),
  swOnlyCount: int('sw_only_count').default(0),
  mismatchCount: int('mismatch_count').default(0),

  createdBy: int('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const reconciliationMismatches = mysqlTable('reconciliation_mismatches', {
  id: int('id').primaryKey().autoincrement(),
  runId: int('run_id').notNull().references(() => reconciliationRuns.id),
  type: varchar('type', { length: 20 }).notNull(), // matched, hw_only, sw_only, mismatch

  // Данные HW
  hwTransactionId: varchar('hw_transaction_id', { length: 100 }),
  hwDate: timestamp('hw_date'),
  hwAmount: decimal('hw_amount', { precision: 12, scale: 2 }),
  hwMachineCode: varchar('hw_machine_code', { length: 50 }),
  hwProductId: varchar('hw_product_id', { length: 50 }),

  // Данные SW
  swTransactionId: int('sw_transaction_id').references(() => transactions.id),
  swDate: timestamp('sw_date'),
  swAmount: decimal('sw_amount', { precision: 12, scale: 2 }),
  swMachineId: int('sw_machine_id').references(() => machines.id),
  swProductId: int('sw_product_id').references(() => products.id),

  // Разница
  amountDifference: decimal('amount_difference', { precision: 12, scale: 2 }),
  notes: text('notes'),

  // Резолюция
  resolution: varchar('resolution', { length: 50 }), // pending, accepted, rejected, adjusted
  resolvedBy: int('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
});
```

### 6.2 Задачи Фазы 3

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 3.1 | Drizzle схемы: transactions | VHM24-repo | 3ч |
| 3.2 | Drizzle схемы: reconciliation | VHM24-repo | 3ч |
| 3.3 | Drizzle схемы: reports, dashboard_widgets | VHM24-repo | 2ч |
| 3.4 | tRPC router: transactions CRUD + filters | VHM24-repo | 4ч |
| 3.5 | tRPC router: reconciliation (run, mismatches) | VHM24-repo | 6ч |
| 3.6 | Service: reconciliation algorithm | VHM24-repo | 8ч |
| 3.7 | tRPC router: analytics aggregations | VHM24-repo | 4ч |
| 3.8 | tRPC router: reports generation | VHM24-repo | 4ч |
| 3.9 | Frontend: Transactions list | VHM24-repo | 4ч |
| 3.10 | Frontend: Reconciliation UI | VHM24-repo | 6ч |
| 3.11 | Frontend: Dashboard KPIs | UI_UX_SPEC | 6ч |
| 3.12 | Frontend: Charts (Recharts) | VHM24-repo | 4ч |

---

## 7. Фаза 4: Интеграции и AI

> **Длительность:** 8-10 дней
> **Модули:** payments, telegram, ai-import, notifications

### 7.1 Платёжные интеграции

```typescript
// apps/api/src/modules/payments/payme.service.ts

interface PaymeConfig {
  merchantId: string;
  secretKey: string; // из env, НЕ хардкод!
  testMode: boolean;
  callbackUrl: string;
}

export class PaymeService {
  constructor(private config: PaymeConfig) {}

  async createInvoice(orderId: number, amount: number): Promise<string> {
    // Генерация ссылки на оплату
    const params = new URLSearchParams({
      m: this.config.merchantId,
      ac: { order_id: orderId.toString() },
      a: (amount * 100).toString(), // тийины
      c: this.config.callbackUrl,
    });

    return `https://checkout.paycom.uz/${params.toString()}`;
  }

  async handleCallback(data: PaymeCallback): Promise<PaymeResponse> {
    // Обработка callback от Payme
    // Проверка подписи, обновление статуса заказа
  }
}
```

### 7.2 AI Import (из UI_UX_SPECIFICATION)

```typescript
// apps/api/src/modules/ai-import/ai-import.service.ts

interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: ImportError[];
  mappings: FieldMapping[];
}

export class AIImportService {
  async importFile(
    file: Buffer,
    fileType: 'xlsx' | 'csv' | 'json' | 'xml',
    targetEntity: string, // 'products', 'sales', 'inventory'
    options: ImportOptions
  ): Promise<ImportResult> {
    // 1. Парсинг файла
    const rawData = await this.parseFile(file, fileType);

    // 2. AI анализ структуры
    const suggestedMappings = await this.aiSuggestMappings(rawData, targetEntity);

    // 3. Валидация данных
    const validatedData = await this.validateData(rawData, suggestedMappings);

    // 4. Иерархическое заполнение
    // Сначала справочники, потом основные сущности
    const result = await this.processHierarchically(validatedData, targetEntity);

    // 5. Сохранение маппингов для обучения
    await this.saveMappingsForLearning(suggestedMappings, result);

    return result;
  }

  private async aiSuggestMappings(
    rawData: any[],
    targetEntity: string
  ): Promise<FieldMapping[]> {
    // Используем AI для предложения маппинга полей
    // На основе истории успешных импортов
  }
}
```

### 7.3 Задачи Фазы 4

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 4.1 | Drizzle схемы: payments, payment_logs | VHM24-repo | 3ч |
| 4.2 | Drizzle схемы: notifications, alerts | VHM24-repo | 3ч |
| 4.3 | Drizzle схемы: import_sessions, import_mappings | VHM24-repo | 2ч |
| 4.4 | Service: PaymeService | VHD + VHM24-repo | 4ч |
| 4.5 | Service: ClickService | VHD + VHM24-repo | 4ч |
| 4.6 | Service: UzumService | VHD + VHM24-repo | 3ч |
| 4.7 | tRPC router: payments | VHM24-repo | 4ч |
| 4.8 | Service: AIImportService | UI_UX_SPEC + VHM24-repo | 8ч |
| 4.9 | tRPC router: ai-import | VHM24-repo | 4ч |
| 4.10 | Service: NotificationService (multi-channel) | VHM24-repo | 6ч |
| 4.11 | Telegram Bot setup (aiogram) | vendhub-bot2 | 4ч |
| 4.12 | Frontend: Payments settings | UI_UX_SPEC | 4ч |
| 4.13 | Frontend: AI Import UI | UI_UX_SPEC | 6ч |
| 4.14 | Frontend: Notifications center | VHM24-repo | 4ч |

---

## 8. Адаптация TypeORM → Drizzle

### 8.1 Шаблон конвертации

```typescript
// ========== TypeORM (VHM24-repo) ==========
@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: MachineType })
  type: MachineType;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @OneToMany(() => MachineSlot, slot => slot.machine)
  slots: MachineSlot[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ========== Drizzle (VendHub OS) ==========
export const machineTypeEnum = mysqlEnum('machine_type', ['coffee', 'snack', 'combo']);

export const machines = mysqlTable('machines', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  type: machineTypeEnum.notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 10, scale: 6 }),
  locationId: int('location_id').references(() => locations.id),
  organizationId: int('organization_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const machinesRelations = relations(machines, ({ one, many }) => ({
  location: one(locations, {
    fields: [machines.locationId],
    references: [locations.id],
  }),
  slots: many(machineSlots),
  organization: one(organizations, {
    fields: [machines.organizationId],
    references: [organizations.id],
  }),
}));
```

### 8.2 Правила конвертации

| TypeORM | Drizzle |
|---------|---------|
| `@PrimaryGeneratedColumn()` | `int('id').primaryKey().autoincrement()` |
| `@Column({ length: N })` | `varchar('name', { length: N })` |
| `@Column({ type: 'text' })` | `text('field')` |
| `@Column({ type: 'enum' })` | `mysqlEnum('name', [...])` |
| `@Column({ type: 'decimal' })` | `decimal('field', { precision, scale })` |
| `@Column({ type: 'boolean' })` | `boolean('field')` |
| `@Column({ type: 'json' })` | `json('field').$type<T>()` |
| `@ManyToOne()` | `.references(() => table.id)` |
| `@OneToMany()` | `relations(table, ({ many }) => ...)` |
| `@CreateDateColumn()` | `timestamp('created_at').defaultNow()` |
| `@UpdateDateColumn()` | `timestamp('updated_at').defaultNow().onUpdateNow()` |

---

## 9. UI/UX и дизайн-система

### 9.1 Дизайн-система "Warm Brew" (OKLCH)

```css
/* packages/ui/src/styles/theme.css */

:root {
  /* Light Theme */
  --background: oklch(0.98 0.008 85);      /* Кремовый #FDF8F3 */
  --foreground: oklch(0.2 0.04 50);        /* Шоколад #2C1810 */
  --primary: oklch(0.35 0.06 50);          /* Эспрессо #5D4037 */
  --primary-foreground: oklch(0.98 0.008 85);
  --accent: oklch(0.75 0.12 70);           /* Карамель #D4A574 */
  --accent-foreground: oklch(0.2 0.04 50);
  --success: oklch(0.7 0.1 160);           /* Мята #7CB69D */
  --destructive: oklch(0.55 0.2 25);       /* Красный */
  --warning: oklch(0.75 0.15 85);          /* Янтарь */
  --muted: oklch(0.92 0.01 85);
  --muted-foreground: oklch(0.45 0.02 50);
  --border: oklch(0.88 0.02 85);
  --ring: oklch(0.35 0.06 50);

  /* Typography */
  --font-display: 'Playfair Display', serif;
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Border Radius */
  --radius: 0.75rem;
}

.dark {
  --background: oklch(0.12 0.01 250);      /* Тёмный кофе */
  --foreground: oklch(0.95 0.01 85);       /* Светлый */
  --primary: oklch(0.65 0.12 70);          /* Карамель светлая */
  --card: oklch(0.18 0.01 250);
  --border: oklch(0.25 0.01 250);
}
```

### 9.2 Структура навигации Admin Dashboard

```
📊 ОБЗОР
├── Dashboard              /dashboard
├── Аналитика             /dashboard/analytics
├── Карта                 /dashboard/map
└── Мониторинг            /dashboard/monitoring

🏭 АВТОМАТЫ
├── Список автоматов      /dashboard/machines
├── Оборудование          /dashboard/equipment
├── Слоты и планограммы   /dashboard/machines/[id]/slots
└── Техобслуживание       /dashboard/maintenance

📦 ТОВАРЫ
├── Каталог               /dashboard/products
│   ├── Напитки           /dashboard/products?type=drink
│   └── Снеки             /dashboard/products?type=snack
├── Ингредиенты           /dashboard/ingredients
├── Рецептуры             /dashboard/recipes
└── Ценообразование       /dashboard/pricing

📚 СПРАВОЧНИКИ
├── Категории             /dashboard/references/categories
├── Коды ИКПУ             /dashboard/references/ikpu
├── Типы упаковки         /dashboard/references/packages
├── Ставки НДС            /dashboard/references/vat
├── Маркировка            /dashboard/references/marking
├── Поставщики            /dashboard/references/suppliers
└── Локации               /dashboard/references/locations

📦 СКЛАД
├── Остатки               /dashboard/inventory
├── Приёмка               /dashboard/inventory/receipt
├── Выдача операторам     /dashboard/inventory/issue
├── Инвентаризация        /dashboard/inventory/check
└── Перемещения           /dashboard/inventory/movements

✅ ОПЕРАЦИИ
├── Задачи                /dashboard/tasks
├── Расписание            /dashboard/scheduled-tasks
├── Маршруты              /dashboard/routes
├── Инциденты             /dashboard/incidents
└── Жалобы                /dashboard/complaints

💰 ФИНАНСЫ
├── Транзакции            /dashboard/transactions
├── Сверка данных         /dashboard/reconciliation
├── Отчёты                /dashboard/reports
└── Контрагенты           /dashboard/counterparties

💳 ИНТЕГРАЦИИ
├── Платёжные системы     /dashboard/integrations/payments
├── Фискализация          /dashboard/integrations/fiscal
├── API и Webhooks        /dashboard/integrations/api
└── AI Импорт             /dashboard/integrations/import

👥 АДМИНИСТРИРОВАНИЕ
├── Пользователи          /dashboard/users
├── Роли и права          /dashboard/rbac
├── Аудит                 /dashboard/audit
├── Безопасность          /dashboard/security
└── Настройки             /dashboard/settings
```

---

## 10. Чеклист готовности

### 10.1 Фаза 0: Справочники ✓

- [ ] Seed: measurement_units
- [ ] Seed: vat_rates
- [ ] Seed: package_types
- [ ] Seed: payment_providers
- [ ] Import: goods_classifiers (MXIK)
- [ ] Import: ikpu_codes
- [ ] Seed: system_roles + permissions

### 10.2 Фаза 1: Core ✓

- [ ] Schema + Router: auth
- [ ] Schema + Router: users
- [ ] Schema + Router: organizations
- [ ] Schema + Router: rbac (roles, permissions)
- [ ] Schema + Router: locations
- [ ] Frontend: Login, Profile
- [ ] Frontend: Users management
- [ ] Middleware: auth guards

### 10.3 Фаза 2: Operations ✓

- [ ] Schema + Router: products (drinks + snacks)
- [ ] Schema + Router: ingredients, recipes
- [ ] Schema + Router: machines, slots, bunkers
- [ ] Schema + Router: warehouses, zones
- [ ] Schema + Router: inventory (3 levels)
- [ ] Schema + Router: stock_movements
- [ ] Schema + Router: tasks
- [ ] Frontend: Products (with type tabs)
- [ ] Frontend: Machines + Map
- [ ] Frontend: Inventory dashboard
- [ ] Frontend: Tasks Kanban

### 10.4 Фаза 3: Finance ✓

- [ ] Schema + Router: transactions
- [ ] Schema + Router: reconciliation
- [ ] Service: reconciliation algorithm
- [ ] Schema + Router: reports
- [ ] Frontend: Transactions
- [ ] Frontend: Reconciliation UI
- [ ] Frontend: Dashboard KPIs
- [ ] Frontend: Reports

### 10.5 Фаза 4: Integrations ✓

- [ ] Service: PaymeService
- [ ] Service: ClickService
- [ ] Service: UzumService
- [ ] Service: AIImportService
- [ ] Service: NotificationService
- [ ] Telegram Bot setup
- [ ] Frontend: Payments settings
- [ ] Frontend: AI Import
- [ ] Frontend: Notifications

### 10.6 Quality ✓

- [ ] Unit tests: >60% coverage
- [ ] E2E tests: critical flows
- [ ] Performance: <500ms response
- [ ] Security: rate limiting, input validation
- [ ] Documentation: README, API docs

---

## 📅 Итоговый таймлайн

| Фаза | Длительность | Накопительно |
|------|--------------|--------------|
| Фаза 0: Справочники | 3-4 дня | День 4 |
| Фаза 1: Core | 5-7 дней | День 11 |
| Фаза 2: Operations | 10-12 дней | День 23 |
| Фаза 3: Finance | 7-9 дней | День 32 |
| Фаза 4: Integrations | 8-10 дней | День 42 |
| Тестирование + Полировка | 5-7 дней | **День 49** |

**Итого: ~7 недель до Production-Ready**

---

*План создан: 03 февраля 2026*
*Версия: 2.0 (Объединённый)*
*Статус: Готов к реализации*
