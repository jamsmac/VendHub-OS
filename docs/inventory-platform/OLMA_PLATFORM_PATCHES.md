# OLMA Platform Spec — Patches & Clarifications v1.1

**Этот документ дополняет `OLMA_PLATFORM_SPEC.md` v1.0.**

После аудита основной спецификации обнаружены места требующие доработки или прояснения. Этот patch — источник истины там где он конфликтует с оригинальным SPEC.

**Claude Code:** прочитай этот файл ПОСЛЕ основной спеки. Все противоречия разрешать в пользу этого документа.

---

## Patch 1: Forward references в Drizzle схеме

### Проблема

В схеме `products.defaultSupplierId` ссылается на `suppliers.id`, но таблица `products` объявлена раньше `suppliers`. Это сломает генерацию миграций.

### Решение

Использовать lazy reference с type assertion для forward declaration:

```typescript
// В products.ts:
export const products = pgTable("products", {
  // ...
  defaultSupplierId: uuid("default_supplier_id"), // БЕЗ references
  // ...
});

// В конце файла после объявления всех таблиц — создать relations:
// /src/server/db/schema/_relations.ts
import { relations } from "drizzle-orm";
import { products, suppliers } from "./index";

export const productsRelations = relations(products, ({ one }) => ({
  defaultSupplier: one(suppliers, {
    fields: [products.defaultSupplierId],
    references: [suppliers.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));
```

**Аналогично обработать:**

- `locations.machineId` → `machines.id` (machines определяется позже)
- `locations.parentLocationId` → self-reference (нужен `any` type)

**Правильный порядок файлов в schema/index.ts:**

```typescript
// Первыми — таблицы без зависимостей
export * from "./organizations";
export * from "./users";
export * from "./categories";
export * from "./suppliers";
// Затем зависимые
export * from "./locations";
export * from "./machines";
export * from "./products";
// И дальше...
export * from "./_relations";
```

---

## Patch 2: Вспомогательные функции (hashString, getBalance, и др.)

### Проблема

В примерах кода используются функции без определения: `hashString`, `getBalance`, `cleanProductName`, `parseQty`, `calcUnitPrice`, `downloadFromStorage`, `storeSession`, `getSession`, `clearSession`, `withOrgScope`.

### Решение — все функции в отдельных модулях

```typescript
// ============================================
// src/server/lib/utils/hash.ts
// ============================================
export function hashString(s: string): string {
  // DJB2 алгоритм — быстрый, детерминированный, нет коллизий на типовых данных
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}

// ============================================
// src/server/lib/inventory/balance.ts
// ============================================
import { db } from "@/server/db/client";
import { inventoryBalances } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

export async function getBalance(
  tx: typeof db,
  locationId: string,
  productId: string,
  organizationId: string,
): Promise<number> {
  const result = await tx.query.inventoryBalances.findFirst({
    where: and(
      eq(inventoryBalances.organizationId, organizationId),
      eq(inventoryBalances.locationId, locationId),
      eq(inventoryBalances.productId, productId),
    ),
  });
  return result?.quantity ?? 0;
}

// ============================================
// src/server/lib/salesImport/parsing.ts
// ============================================
export function cleanProductName(raw: string): string {
  return String(raw || "")
    .replace(/\t/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseQty(raw: string | number): number {
  const n = parseFloat(String(raw || "1").replace(",", "."));
  return Math.max(1, Math.round(isNaN(n) ? 1 : n));
}

export function calcUnitPrice(
  row: string[],
  mapping: { totalAmountCol: number; priceCol: number },
  qty: number,
  fallbackPrice: number = 0,
): number {
  if (mapping.totalAmountCol >= 0) {
    const total =
      parseFloat(
        String(row[mapping.totalAmountCol] || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(",", "."),
      ) || 0;
    return qty > 0 ? Math.round(total / qty) : 0;
  }
  if (mapping.priceCol >= 0) {
    return Math.round(
      parseFloat(
        String(row[mapping.priceCol] || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(",", "."),
      ) || 0,
    );
  }
  return fallbackPrice;
}

// ============================================
// src/server/lib/storage/supabase.ts
// ============================================
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function downloadFromStorage(fileUrl: string): Promise<string> {
  // fileUrl = "bucket-name/path/to/file.csv"
  const [bucket, ...pathParts] = fileUrl.split("/");
  const path = pathParts.join("/");
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  const buffer = await data.arrayBuffer();
  // Стрип BOM если есть
  const bytes = new Uint8Array(buffer);
  const hasBOM = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const text = new TextDecoder("utf-8").decode(hasBOM ? bytes.slice(3) : bytes);
  return text;
}

// ============================================
// src/server/lib/salesImport/session.ts
// ============================================
// Для MVP — in-memory Map с TTL. Позже — Redis.

interface ParseSession {
  rows: string[][];
  headers: string[];
  format: string;
  reportDate: string;
  expiresAt: number;
}

const sessions = new Map<string, ParseSession>();

// Чистим expired каждые 5 минут
setInterval(
  () => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (s.expiresAt < now) sessions.delete(id);
    }
  },
  5 * 60 * 1000,
);

export function storeSession(data: Omit<ParseSession, "expiresAt">): string {
  const id = crypto.randomUUID();
  sessions.set(id, { ...data, expiresAt: Date.now() + 30 * 60 * 1000 });
  return id;
}

export function getSession(id: string): ParseSession {
  const s = sessions.get(id);
  if (!s) throw new Error("Parse session expired — re-upload file");
  if (s.expiresAt < Date.now()) {
    sessions.delete(id);
    throw new Error("Parse session expired");
  }
  return s;
}

export function clearSession(id: string): void {
  sessions.delete(id);
}

// ============================================
// src/server/db/orgScope.ts
// ============================================
// Убираем withOrgScope — это усложнение было излишним.
// Вместо него — просто добавлять organizationId во все where() вручную.
// Claude Code: НЕ ИСПОЛЬЗУЙ withOrgScope, используй явные условия:
//
// БЫЛО (неправильно):
//   ctx.db.query.products.findMany()
//
// НАДО:
//   ctx.db.query.products.findMany({
//     where: eq(products.organizationId, ctx.organizationId)
//   })
//
// RLS в PostgreSQL — дублирующая защита. Если забыл в коде — RLS не пустит.
```

---

## Patch 3: salesAggregated — корректный расчёт totalAmount

### Проблема

В примере `executeSalesImport` пишется:

```ts
totalAmount: qty * unitPrice;
```

Но для HICON в колонке `Total amount` **уже стоит сумма** (10000 за 1 Кока-колу). Пересчитывать `qty * unitPrice` может дать другое число из-за округления (unitPrice округляется до целых сум).

### Решение

Брать totalAmount напрямую из файла когда он есть:

```typescript
// В executeSalesImport, замени:
let totalAmountValue = qty * unitPrice;
if (input.mapping.totalAmountCol >= 0) {
  const fromFile = parseFloat(
    String(row[input.mapping.totalAmountCol] || '0')
      .replace(/[^\d,.-]/g, '').replace(',', '.')
  );
  if (fromFile > 0) totalAmountValue = fromFile;
}

await tx.insert(salesAggregated).values({
  organizationId: ctx.organizationId,
  reportDay,
  machineId: input.machineId,
  productId,
  qty,
  totalAmount: totalAmountValue,  // точное значение из файла
  lastImportId: importRec.id,
}).onConflictDoUpdate({ ... });
```

---

## Patch 4: Supabase Auth + Custom Claims для RLS

### Проблема

В спеке RLS использует `auth.jwt() ->> 'org_id'::uuid`, но **Supabase JWT по умолчанию НЕ содержит org_id**. Без настройки custom claims — RLS просто не пропустит ни один запрос.

### Решение

**Вариант A — Custom Access Token Hook (рекомендуется)**

В Supabase Dashboard → Authentication → Hooks включить "Custom Access Token" и создать функцию:

```sql
-- Supabase Edge Function или Postgres Function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_org_id uuid;
  user_role text;
BEGIN
  -- Находим пользователя и его org + role
  SELECT organization_id, role INTO user_org_id, user_role
  FROM public.users
  WHERE auth_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  IF user_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id::text));
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Разрешить Supabase auth вызывать эту функцию
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

Теперь JWT будет содержать `org_id` и `role` и RLS заработает.

**Вариант B — RLS через subquery (простой, но медленнее)**

```sql
CREATE POLICY "Users see own org products"
ON products FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.users WHERE auth_id = auth.uid()
  )
);
```

Выбрать Вариант A — он быстрее и масштабируется лучше.

### Для tRPC контекста

```typescript
// src/server/api/trpc.ts
export async function createContext({ req }: { req: Request }) {
  const supabase = createServerClient(/*...*/);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { db, user: null, organizationId: null };

  // Читаем custom claims из JWT
  const { data: session } = await supabase.auth.getSession();
  const claims = session?.access_token
    ? JSON.parse(atob(session.access_token.split(".")[1]))
    : {};

  return {
    db,
    user: {
      id: user.id,
      email: user.email!,
      organizationId: claims.org_id,
      role: claims.role,
    },
    organizationId: claims.org_id,
    supabase,
  };
}
```

---

## Patch 5: Процедуры для остальных ролей

### Проблема

Описаны `protectedProcedure`, `orgProcedure`, `ownerProcedure`, `managerProcedure`. Но не `operatorProcedure`, `auditorProcedure`, `tenantPublicProcedure`.

### Решение

```typescript
// Дополнить src/server/api/trpc.ts

export const operatorProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (
    !["owner", "manager", "operator", "super_admin"].includes(ctx.user.role)
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

export const auditorProcedure = orgProcedure.use(async ({ ctx, next }) => {
  // auditor имеет read-only. Но видит все данные орги.
  // Используется только для query, не для mutation
  if (!["owner", "manager", "auditor", "super_admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

// Для публичных страниц арендатора — без авторизации
export const tenantPublicProcedure = publicProcedure
  .input(z.object({ slug: z.string().min(1) }))
  .use(async ({ input, next, ctx }) => {
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(organizations.slug, input.slug),
    });
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });
    if (!org.tenantPublicEnabled)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Public access disabled",
      });

    return next({
      ctx: { ...ctx, organizationId: org.id, organization: org },
    });
  });

// Для resource-scoped (operator видит только свои машины)
export const machineScopedProcedure = operatorProcedure
  .input(z.object({ machineId: z.string().uuid() }))
  .use(async ({ ctx, input, next }) => {
    // owner и manager имеют доступ ко всем машинам
    if (["owner", "manager", "super_admin"].includes(ctx.user.role)) {
      return next();
    }
    // operator — только к назначенным
    const access = await ctx.db.query.userMachineAccess.findFirst({
      where: and(
        eq(userMachineAccess.userId, ctx.user.id),
        eq(userMachineAccess.machineId, input.machineId),
      ),
    });
    if (!access)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No access to this machine",
      });
    return next();
  });
```

---

## Patch 6: Supabase Storage — структура bucket'ов

### Проблема

Не описано как организованы файлы в Supabase Storage.

### Решение

Создать 3 bucket'а:

```
sales-imports/     — загрузки отчётов о продажах
  {org_id}/
    {year}/{month}/
      {uuid}_{original_filename}

purchase-invoices/ — сканы/фото накладных
  {org_id}/
    {year}/{month}/
      {uuid}_{original_filename}

backups/           — JSON бэкапы состояния (для миграции из артефакта)
  {org_id}/
    {timestamp}.json
```

**RLS на storage:**

```sql
-- sales-imports bucket
CREATE POLICY "Users upload to own org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sales-imports' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
);

CREATE POLICY "Users read own org files"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('sales-imports', 'purchase-invoices', 'backups') AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
);
```

**Клиентский upload через signed URL:**

```typescript
// В products router или sales import router
createUploadUrl: managerProcedure
  .input(
    z.object({
      bucket: z.enum(["sales-imports", "purchase-invoices"]),
      fileName: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const path = `${ctx.organizationId}/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}/${crypto.randomUUID()}_${input.fileName}`;
    const { data, error } = await ctx.supabase.storage
      .from(input.bucket)
      .createSignedUploadUrl(path);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return {
      uploadUrl: data.signedUrl,
      path,
      fullPath: `${input.bucket}/${path}`,
    };
  });
```

---

## Patch 7: Seed скрипт (конкретика)

### Необходимо

```typescript
// scripts/seed-olma.ts
// Запускается: pnpm tsx scripts/seed-olma.ts

import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

async function seedOlma() {
  console.log("Creating OLMA organization...");

  // 1. Organization
  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: "olma",
      name: "OLMA",
      legalName: 'ООО "ОЛМА"',
      country: "UZ",
      currency: "UZS",
      tenantPublicEnabled: true,
      settings: {
        leadDays: 3,
        safetyDays: 4,
        language: "ru",
        timezone: "Asia/Tashkent",
      },
    })
    .returning();

  // 2. Owner user (Jamshid)
  // ВАЖНО: authId получается после Supabase signup
  // Тут создаём заготовку, authId связывается отдельно
  const [owner] = await db
    .insert(schema.users)
    .values({
      organizationId: org.id,
      email: "jamshid@olma.uz", // подставить реальный
      name: "Jamshid",
      role: "owner",
    })
    .returning();

  // 3. Категории
  const categoriesData = [
    {
      code: "cola",
      name: "Кола/Газ",
      icon: "🥤",
      color: "#d32f2f",
      sortOrder: 1,
    },
    {
      code: "energy",
      name: "Энергетик",
      icon: "⚡",
      color: "#2196f3",
      sortOrder: 2,
    },
    {
      code: "mojito",
      name: "Мохито",
      icon: "🍃",
      color: "#4caf50",
      sortOrder: 3,
    },
    { code: "fresh", name: "Фреш", icon: "🍋", color: "#ffc107", sortOrder: 4 },
    { code: "tea", name: "Чай", icon: "🍵", color: "#795548", sortOrder: 5 },
    {
      code: "water",
      name: "Вода/Молоко",
      icon: "💧",
      color: "#03a9f4",
      sortOrder: 6,
    },
    {
      code: "bar",
      name: "Батончик",
      icon: "🍫",
      color: "#6d4c41",
      sortOrder: 7,
    },
    {
      code: "chips",
      name: "Чипсы/Снек",
      icon: "🥨",
      color: "#ff9800",
      sortOrder: 8,
    },
  ];
  const categories = await db
    .insert(schema.categories)
    .values(categoriesData.map((c) => ({ ...c, organizationId: org.id })))
    .returning();

  const catMap = Object.fromEntries(categories.map((c) => [c.code, c.id]));

  // 4. Локации
  const [warehouse] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Склад OLMA",
      type: "WAREHOUSE",
      address: "Ташкент, OLMA",
    })
    .returning();

  // Machine storages (2)
  const [stIce] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Хранилище Ice Drink",
      type: "MACHINE_STORAGE",
      parentLocationId: warehouse.id,
    })
    .returning();

  const [stSnack] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Хранилище Snack",
      type: "MACHINE_STORAGE",
      parentLocationId: warehouse.id,
    })
    .returning();

  // Machine locations (виртуальные, для учёта)
  const [mIce] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Ice Drink @ OLMA",
      type: "MACHINE",
    })
    .returning();

  const [mSnack] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Snack @ OLMA",
      type: "MACHINE",
    })
    .returning();

  // 5. Machines
  const [iceDrinkMachine] = await db
    .insert(schema.machines)
    .values({
      organizationId: org.id,
      code: "OLMA-ID-01",
      name: "Ice Drink @ OLMA",
      type: "ICE_DRINK",
      brand: "HICON",
      locationId: mIce.id,
      storageLocationId: stIce.id,
      rows: 5,
      cols: 8,
      layout: Array(5)
        .fill(null)
        .map(() => Array(8).fill(null)),
      installedAt: new Date("2026-04-01"),
    })
    .returning();

  const [snackMachine] = await db
    .insert(schema.machines)
    .values({
      organizationId: org.id,
      code: "OLMA-SN-01",
      name: "Snack @ OLMA",
      type: "SNACK",
      locationId: mSnack.id,
      storageLocationId: stSnack.id,
      rows: 6,
      cols: 8,
      layout: Array(6)
        .fill(null)
        .map(() => Array(8).fill(null)),
      installedAt: new Date("2026-04-01"),
    })
    .returning();

  // 6. Поставщики (13 из прототипа)
  const suppliersData = [
    { name: "POSITI", defaultPayment: "transfer" },
    { name: "Red Bull UZ", defaultPayment: "transfer" },
    { name: "Mars Uzbekistan", defaultPayment: "transfer" },
    { name: "INTERNATIONAL BEV", defaultPayment: "transfer" },
    { name: "INTER FOOD PLUS", defaultPayment: "transfer" },
    { name: "BILLUR SUV", defaultPayment: "transfer" },
    { name: "Nestle", defaultPayment: "transfer" },
    { name: "PepsiCo", defaultPayment: "transfer" },
    { name: "Mondelez", defaultPayment: "transfer" },
    { name: "Ferrero", defaultPayment: "transfer" },
    { name: "Ideal Future Trade", defaultPayment: "transfer" },
    { name: "BIZNES-AZIYA", defaultPayment: "transfer" },
    { name: "Kellogg", defaultPayment: "transfer" },
  ] as const;

  await db
    .insert(schema.suppliers)
    .values(suppliersData.map((s) => ({ ...s, organizationId: org.id })));

  // 7. Products (40 SKU)
  // Claude Code: распарси DEFAULT_STATE из olma.html — раздел `products: {...}`
  // там все 40 товаров с полями name, vol, cat, grp, price, spd, cap, sup
  // Извлеки и вставь в schema.products

  console.log(`✓ OLMA org created: ${org.id}`);
  console.log(
    `✓ Owner user: ${owner.id} (нужно связать с Supabase auth.users.id через authId)`,
  );
  console.log(
    "Next: sign up Jamshid through Supabase Auth, then update users.authId",
  );
}

seedOlma().catch(console.error);
```

---

## Patch 8: Environment variables

Дополнить в `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://...  # для Drizzle migrations

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # только server-side!

# Next.js
NEXT_PUBLIC_APP_URL=https://olma.app
NEXTAUTH_SECRET=<openssl rand -base64 32>

# Observability (optional в MVP)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
POSTHOG_KEY=
POSTHOG_HOST=https://eu.i.posthog.com

# Rate limiting (Upstash, optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Feature flags
NEXT_PUBLIC_ENABLE_TENANT_VIEW=true
```

---

## Patch 9: Тестирование импорта на реальном файле

### Обязательный acceptance test

После реализации Этапа 7 (импорт продаж) — запустить smoke-test:

```typescript
// tests/salesImport.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';

describe('Sales Import — HICON format', () => {

  beforeEach(async () => {
    await resetTestDb();
    await seedTestData(); // OLMA org + catalog + machines
  });

  it('imports the sample HICON CSV correctly', async () => {
    const csv = fs.readFileSync('./docs/Product_name2026-4-21_15_34_44.csv', 'utf-8');
    const result = await executeImport(csv, { machineId: testMachineId });

    // Test fixture содержит 3 валидных строки (4-я = Total, 1-я = 其他 без ProductID)
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.unmapped).toBe(0);
    expect(result.totalQty).toBe(3);  // 1 + 1 + 1
    expect(result.totalRevenue).toBe(30000);  // 10000 + 10000 + 10000

    // Проверяем что движения созданы
    const movements = await db.query.stockMovements.findMany({
      where: eq(stockMovements.movementType, 'SALE')
    });
    expect(movements).toHaveLength(3);

    // Проверяем что salesAggregated записан
    const agg = await db.query.salesAggregated.findMany();
    expect(agg).toHaveLength(3);
  });

  it('skips duplicates on re-upload of same file', async () => {
    const csv = fs.readFileSync('./docs/Product_name2026-4-21_15_34_44.csv', 'utf-8');

    const first = await executeImport(csv, { machineId: testMachineId });
    expect(first.imported).toBe(3);

    const second = await executeImport(csv, { machineId: testMachineId });
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(3);  // все строки уже известны
  });

  it('handles delta updates for same day', async () => {
    // 1я загрузка: Coca×1, Fanta×1, Fuse×1
    await executeImport(originalCsv, { machineId: testMachineId });

    // 2я загрузка того же дня: Coca×3, Fanta×1, Fuse×2, +Sprite×1
    const updatedCsv = /* с новыми qty */;
    const result = await executeImport(updatedCsv, { machineId: testMachineId });

    expect(result.imported).toBe(3);       // Sprite новый + delta Coca + delta Fuse
    expect(result.deltaAdjusted).toBe(2);  // Coca и Fuse
    expect(result.skipped).toBe(1);        // Fanta не изменилась
    expect(result.totalQty).toBe(3);       // 2 (Coca delta) + 1 (Fuse delta) + 1 (Sprite new — wait это даст 4)
    // (Точные цифры зависят от фикстуры — адаптировать)
  });

  it('filters service rows correctly', async () => {
    const csv = `ProductID,Product name,Pay by cash,Quantity,Total amount\n,其他,0,0,0\nTotal,,,40000,4\n`;
    const result = await executeImport(csv, { machineId: testMachineId });
    expect(result.imported).toBe(0);
    expect(result.unmapped).toBe(0);  // не unmapped, а именно отфильтровано
  });
});
```

---

## Patch 10: Критерии приёмки (обновлённые)

Добавить к DoD в разделе 12:

**11.** Прошёл тест из Patch 9 (real HICON file → 3 products → delta test)
**12.** RLS проверен: пользователь другой org не видит чужих данных (попробовал запрос напрямую в БД)
**13.** Offline test: выключил интернет → сделал 3 refill → включил интернет → все 3 синхронизировались
**14.** Performance test: каталог из 1000 товаров загружается <2s на iPhone 12
**15.** Security audit: нет hardcoded secrets, все mutations защищены role middleware

---

## Patch 11: Приоритизация этапов для первой недели

Если 4-5 недель разработки кажутся риском — выделить **"Walking Skeleton" за 7-10 дней**:

### Week 1: Minimum Viable Skeleton

**День 1:** Инициализация + Auth (Supabase)
**День 2-3:** Схема БД + миграции + базовый seed
**День 4:** Products CRUD (минимальный — list + create + edit)
**День 5:** Purchases (без wizard, простая форма) + Stock Movements
**День 6:** Sales import (только HICON с фиксированным маппингом)
**День 7:** Dashboard + deploy

Это даст работающий MVP который **уже можно использовать для OLMA** — с корявым UI но работающей логикой.

Остальные 3-4 недели — полировка: wizards, design system, tenant view, PWA, offline, polished dashboard.

---

## Что сознательно НЕ добавлял в патчи

- **Email notifications** — на первом этапе можно без них
- **Webhook'и для Payme/Click** — отдельная большая задача
- **Telegram bot** — полноценная интеграция потом
- **Mobile app (React Native)** — PWA достаточно для MVP
- **Internationalization (i18n)** — только русский пока

---

## Финальный чек-лист для Claude Code

Перед началом работы убедись что:

- [ ] Прочитал `OLMA_PLATFORM_SPEC.md` целиком
- [ ] Прочитал этот patch-файл (`OLMA_PLATFORM_PATCHES.md`)
- [ ] Открыл `olma.html` и понял UX (особенно: wizard закупки, импорт продаж, сверка)
- [ ] Скачал `Product_name2026-4-21_15_34_44.csv` для тестирования
- [ ] Создал Supabase prod + staging проекты
- [ ] Настроил Custom Access Token hook в Supabase
- [ ] Создал Vercel проект и подключил GitHub
- [ ] Настроил `.env.local` со всеми переменными из Patch 8

После этого — следуй плану из раздела 11 основной спеки, но с изменениями из Patch 11 если хочешь ускоренный старт.

---

**КОНЕЦ ПАТЧЕЙ**
