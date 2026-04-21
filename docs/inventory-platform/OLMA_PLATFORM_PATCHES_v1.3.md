# OLMA Platform Spec — Patches & Clarifications v1.3

**Этот документ дополняет SPEC v1.0, PATCHES v1.1, PATCHES v1.2.**

После self-аудита v1.2 найдено **13 проблем** — 3 критичных, 5 серьёзных, 5 мелких. Все они — в моих собственных патчах v1.2. Этот файл их закрывает.

**Приоритет при конфликтах: v1.3 > v1.2 > v1.1 > SPEC v1.0.**

---

## Patch 20: Batched import — in-batch дедупликация (CRITICAL)

### Проблема

В v1.2 Patch 15 я вынес проверку хэшей в pre-fetch (`existingHashSet`). Но если в одном CSV одна и та же строка встречается дважды (или две строки для одного товара), batch insert упадёт на PK violation:

- `salesTxnHashes(org, hash)` — PK violation на дубликате хэша
- `salesAggregated(org, day, machine, product)` — PK violation на одинаковом product в одном дне

Прототип работал потому что писал в state сразу в цикле, и второй ряд видел первый. В batched-версии v1.2 этот механизм потерян.

### Решение

Добавить in-batch дедуп перед batch-insert'ами:

```typescript
// ШАГ E (заменяет соответствующий блок v1.2 Patch 15):
const seenHashes = new Set<string>();
const aggByProduct = new Map<
  string,
  InferInsertModel<typeof salesAggregated>
>();
const movementsToInsert: InferInsertModel<typeof stockMovements>[] = [];
const hashesToInsert: InferInsertModel<typeof salesTxnHashes>[] = [];

for (const rd of rowsData) {
  // L1: DB или текущий batch
  if (existingHashSet.has(rd.rawRowHash) || seenHashes.has(rd.rawRowHash)) {
    skipped++;
    continue;
  }
  // L2: DB или текущий batch
  if (
    rd.txnKey &&
    (existingHashSet.has(rd.txnKey) || seenHashes.has(rd.txnKey))
  ) {
    skipped++;
    continue;
  }

  // L3 DELTA (с учётом уже обработанных в batch'е)
  let effectiveQty = rd.qty;
  // Для HICON смотрим либо DB (aggMap) либо уже накопленный в batch (aggByProduct)
  const batchPrev = aggByProduct.get(rd.productId!);
  const dbPrev = aggMap.get(rd.productId!);
  const prev = batchPrev ?? dbPrev; // batch приоритетнее (свежее в рамках этого файла)

  if (input.format === "HICON" && prev) {
    const deltaQty = rd.qty - prev.qty;
    if (deltaQty === 0) {
      skipped++;
      continue;
    }
    if (deltaQty < 0) {
      balanceWarnings.push(`${rd.rawName}: было ${prev.qty}, стало ${rd.qty}`);
      skipped++;
      continue;
    }
    effectiveQty = deltaQty;
    deltaAdjusted++;
    deltaLog.push(
      `${rd.rawName}: +${deltaQty} (было ${prev.qty} → стало ${rd.qty})`,
    );
  }

  // Резервируем хэши в batch
  seenHashes.add(rd.rawRowHash);
  if (rd.txnKey) seenHashes.add(rd.txnKey);

  movementsToInsert.push({
    organizationId: ctx.organizationId,
    productId: rd.productId!,
    fromLocationId: machineLocationId,
    quantity: effectiveQty,
    movementType: "SALE",
    unitCost: costMap.get(rd.productId!) ?? 0,
    unitPrice: rd.unitPrice,
    referenceType: "sales_import",
    referenceId: importRec.id,
    byUserId: ctx.user.id,
    at: new Date(input.reportDate),
  });

  // Aggregated — last-write-wins по productId (как в прототипе)
  aggByProduct.set(rd.productId!, {
    organizationId: ctx.organizationId,
    reportDay,
    machineId: input.machineId,
    productId: rd.productId!,
    qty: rd.qty,
    totalAmount:
      rd.totalAmountFromFile > 0
        ? rd.totalAmountFromFile
        : rd.qty * rd.unitPrice,
    lastImportId: importRec.id,
  });

  hashesToInsert.push({
    organizationId: ctx.organizationId,
    hashKey: rd.rawRowHash,
    salesImportId: importRec.id,
  });
  if (rd.txnKey) {
    hashesToInsert.push({
      organizationId: ctx.organizationId,
      hashKey: rd.txnKey,
      salesImportId: importRec.id,
    });
  }

  totalRevenue += effectiveQty * rd.unitPrice;
  totalQty += effectiveQty;
  imported++;
}

// ШАГ F: batch insert/upsert — теперь без duplicate PK
if (movementsToInsert.length) {
  await tx.insert(stockMovements).values(movementsToInsert);
}
if (aggByProduct.size > 0) {
  await tx
    .insert(salesAggregated)
    .values([...aggByProduct.values()])
    .onConflictDoUpdate({
      target: [
        salesAggregated.organizationId,
        salesAggregated.reportDay,
        salesAggregated.machineId,
        salesAggregated.productId,
      ],
      set: {
        qty: sql`EXCLUDED.qty`,
        totalAmount: sql`EXCLUDED.total_amount`,
        lastImportId: sql`EXCLUDED.last_import_id`,
        lastUpdate: sql`NOW()`,
      },
    });
}
if (hashesToInsert.length) {
  await tx.insert(salesTxnHashes).values(hashesToInsert);
}
```

**Главное:** `seenHashes` защищает от duplicate PK на hashes, `aggByProduct` (Map) автоматически дедуплицирует по productId.

---

## Patch 21: Cleanup parse-sessions через Edge Function (CRITICAL)

### Проблема

В v1.2 Patch 12 я предложил:

```sql
DELETE FROM storage.objects WHERE bucket_id = 'parse-sessions' AND ...
```

Это удаляет **метаданные из БД**, но **файл в S3 остаётся**. Через месяц — тысячи orphan-файлов и счёт за storage.

### Решение A (для MVP — ничего не делать, lazy cleanup уже работает)

В v1.2 Patch 12 функция `getSession` **уже** удаляет файл если он просрочен:

```ts
if (session.expiresAt < Date.now()) {
  await supabase.storage
    .from(BUCKET)
    .remove([path])
    .catch(() => {});
  throw new Error("Parse session expired");
}
```

Единственный класс orphan-файлов — сессии, которые пользователь создал (upload), но не довёл до `confirmMapping`/`execute`. Для OLMA (несколько импортов в день) это мизер — ~10-50 МБ в месяц, в пределах free tier'а.

**Для MVP: удалить SQL из v1.2 Patch 12 "Cleanup jobs", полагаться на lazy cleanup.**

### Решение B (для production когда клиентов станет >10)

Edge Function + Vercel Cron:

```typescript
// supabase/functions/cleanup-parse-sessions/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Запрос списка старых файлов через таблицу storage.objects (service_role имеет доступ)
  const { data: oldFiles, error } = await supabase.rpc(
    "list_old_parse_sessions",
    { hours_old: 1 },
  );
  if (error)
    return new Response(`Query failed: ${error.message}`, { status: 500 });

  if (!oldFiles?.length) {
    return new Response(
      JSON.stringify({ deleted: 0, message: "nothing to clean" }),
    );
  }

  const paths = oldFiles.map((f: { name: string }) => f.name);
  // remove() принимает до 1000 путей за раз
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += 500)
    chunks.push(paths.slice(i, i + 500));

  let deleted = 0;
  for (const chunk of chunks) {
    const { error: rmErr } = await supabase.storage
      .from("parse-sessions")
      .remove(chunk);
    if (!rmErr) deleted += chunk.length;
  }
  return new Response(JSON.stringify({ deleted }));
});
```

Supporting SQL функция:

```sql
CREATE OR REPLACE FUNCTION public.list_old_parse_sessions(hours_old int DEFAULT 1)
RETURNS TABLE(name text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name FROM storage.objects
  WHERE bucket_id = 'parse-sessions'
    AND created_at < NOW() - (hours_old || ' hours')::interval;
$$;

GRANT EXECUTE ON FUNCTION public.list_old_parse_sessions(int) TO service_role;
```

Деплой:

```bash
supabase functions deploy cleanup-parse-sessions
```

Vercel Cron (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-parse-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

Next.js endpoint `/api/cron/cleanup-parse-sessions/route.ts` дергает Edge Function.

**Для MVP — Решение A. Добавлять B когда импортов станет много.**

---

## Patch 22: Timezone — хардкод 'Asia/Tashkent' для MVP (CRITICAL)

### Проблема

В v1.2 Patch 14.2 я написал:

```ts
const reportDay = getReportDay(
  input.reportDate,
  ctx.organization.settings.timezone,
);
```

Но `orgProcedure` добавляет в контекст **только** `organizationId`, не весь объект `organization`. Код не скомпилируется.

### Решение для MVP — хардкод

Все клиенты OLMA/GLOBERENT/VendHub в Узбекистане. Один часовой пояс. Не плодить preliminary complexity:

```typescript
// src/server/lib/salesImport/detector.ts

export const DEFAULT_TIMEZONE = "Asia/Tashkent";

export function getReportDay(
  reportDateISO: string,
  tz: string = DEFAULT_TIMEZONE,
): string {
  const d = new Date(reportDateISO);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${day}`; // всегда YYYY-MM-DD независимо от локали
}
```

В `executeSalesImport`:

```ts
const reportDay = getReportDay(input.reportDate); // без второго аргумента = 'Asia/Tashkent'
```

### Когда понадобится мульти-TZ (v2)

Обновить `orgProcedure` чтобы загружал `organization`:

```typescript
// v2: расширенный orgProcedure
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.organizationId) throw new TRPCError({ code: "FORBIDDEN" });
  const org = await ctx.db.query.organizations.findFirst({
    where: eq(organizations.id, ctx.user.organizationId),
    columns: {
      id: true,
      slug: true,
      settings: true,
      tenantPublicEnabled: true,
    },
  });
  if (!org) throw new TRPCError({ code: "NOT_FOUND" });
  return next({ ctx: { ...ctx, organizationId: org.id, organization: org } });
});
```

Стоит 1 лишний запрос на ВСЕ org-запросы. Пока нет нужды — не делаем.

**Использование в `formatToParts`:** я заменил `format()` на `formatToParts()` чтобы гарантированно получить YYYY-MM-DD независимо от локальных настроек Node — `en-CA` обычно даёт этот формат, но строго полагаться на это не стоит.

---

## Patch 23: `current_org_id()` — выдать GRANT EXECUTE

### Проблема

В v1.2 Patch 13.1 я создал функцию `current_org_id()`, но не дал EXECUTE роли `authenticated`. RLS-политики через supabase-js не смогут вызвать функцию — `permission denied for function current_org_id`.

### Решение

Добавить в ту же миграцию сразу после `CREATE FUNCTION`:

```sql
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'org_id')::uuid
$$;

-- ← ДОБАВИТЬ ЭТО:
GRANT EXECUTE ON FUNCTION current_org_id() TO authenticated, anon, service_role;
```

Аналогично для любых helper-функций, которые будут вызываться из RLS.

---

## Patch 24: Option B из v1.2 Patch 13.3 — это инфра-проект, не код

### Проблема

В v1.2 Patch 13.3 я описал два варианта включения RLS для tRPC. "Option B — authenticated role + set_config JWT claims". Написал 5 строк кода и назвал "для v2, отложить". Это создаёт ложное впечатление что переключение тривиальное.

На деле Option B требует:

1. Supabase Supavisor (pooler), не прямой postgres:// конект
2. Переключение роли на `authenticated` (роль без BYPASSRLS)
3. Корректная передача `request.jwt.claims` как **JSON claims**, не raw token:
   ```ts
   // Неправильно (как я написал):
   sql`SELECT set_config('request.jwt.claims', ${jwt}, true)`;
   // Правильно:
   sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(claimsObj)}, true)`;
   ```
4. Транзакционное оборачивание КАЖДОГО tRPC-вызова
5. Тестирование что BYPASSRLS действительно не действует для новой роли

### Решение для handoff'а

**Честно сказать:** "Option B — не код-патч, а инфраструктурное решение. Реализовать только если аудит безопасности найдёт проблему, либо при добавлении второго тенанта с критичными данными. До этого — Option A (app-level discipline + code review)."

**Операционный контроль защиты в Option A:**

1. Code review checklist: все `ctx.db.query.X.findMany/findFirst` ДОЛЖНЫ иметь `eq(X.organizationId, ctx.organizationId)` в where
2. ESLint custom rule или grep в CI: `db\.query\.\w+\.find.*\{[^}]*where:\s*[^o]` (упрощённое — что-то, что бракует запросы без organizationId в where)
3. Integration test: создать 2 org'а, залогиниться одним, попытаться запросить данные другого через API → должна быть пустая выдача / 404

---

## Patch 25: Seed — обнулить `locations.machineId` ИЛИ заполнить

### Проблема

В v1.2 Patch 17 я создаю машины с `locationId → locations.id`, но **не обновляю** `locations.machineId → machines.id`. Поле остаётся NULL.

### Решение — удалить поле, не нужно

`locations.machineId` дублирует обратную связь `machines.locationId`. Обычно достаточно одной стороны.

**Обновить схему (v1.0 SPEC 6.3 locations.ts):**

```typescript
export const locations = pgTable("locations", {
  id: id(),
  organizationId: orgId(),
  name: text("name").notNull(),
  type: locationTypeEnum("type").notNull(),
  address: text("address"),
  geoLat: numeric("geo_lat", { precision: 10, scale: 7 }),
  geoLng: numeric("geo_lng", { precision: 10, scale: 7 }),
  parentLocationId: uuid("parent_location_id").references(
    (): any => locations.id,
  ),
  // УДАЛЕНО: machineId: uuid('machine_id')  -- используем machines.locationId
  note: text("note"),
  // ...
});
```

Для запроса "какая машина в этой локации" — использовать:

```ts
const machine = await db.query.machines.findFirst({
  where: eq(machines.locationId, locationId),
});
```

### Альтернатива — если очень хочется оставить для performance

Заполнить после создания машины в seed:

```ts
const [iceMachine] = await db.insert(schema.machines).values({...}).returning();
await db.update(schema.locations)
  .set({ machineId: iceMachine.id })
  .where(eq(schema.locations.id, mIce.id));
```

**Рекомендую: удалить поле.** Меньше путаницы, меньше консистентности поддерживать.

---

## Patch 26: `tenantPublicProcedure` — использовать `getRawInput()`

### Проблема

В v1.2 Patch 19.1 я написал:

```ts
export const tenantPublicProcedure = publicProcedure.use(async ({ rawInput, next, ctx }) => {
```

В tRPC v11 middleware получает **`getRawInput()`** (async-функция), а не `rawInput`-свойство.

### Решение

```typescript
// src/server/api/trpc.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const tenantSlugSchema = z.object({ slug: z.string().min(1).max(50) });

export const tenantPublicProcedure = publicProcedure.use(async (opts) => {
  const raw = await opts.getRawInput();
  const parsed = tenantSlugSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slug" });
  }

  const org = await opts.ctx.db.query.organizations.findFirst({
    where: and(
      eq(organizations.slug, parsed.data.slug),
      isNull(organizations.deletedAt),
    ),
  });
  // NOT_FOUND в обоих случаях — не раскрываем какие slug существуют
  if (!org || !org.tenantPublicEnabled) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return opts.next({
    ctx: { ...opts.ctx, organizationId: org.id, organization: org },
  });
});
```

---

## Patch 27: Пагинация — offset для MVP, не cursor

### Проблема

В v1.2 Patch 19.2 я использовал cursor pagination `gt(products.id, cursor)` с `orderBy: asc(products.id)`. Но UUID v4 — случайные. `id > cursor` не даёт монотонной итерации, "следующая страница" выдаёт рандомное подмножество, пропуская записи.

### Решение — простая offset-пагинация

Для каталога до 10k товаров offset-pagination достаточна и проста:

```typescript
// src/server/api/lib/pagination.ts
import { z } from "zod";

export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
});

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Использование в products router:
export const productsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      paginationInput.extend({
        q: z.string().optional(),
        group: z.enum(["drinks", "snacks"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = and(
        eq(products.organizationId, ctx.organizationId),
        isNull(products.deletedAt),
        input.q ? ilike(products.name, `%${input.q}%`) : undefined,
        input.group ? eq(products.group, input.group) : undefined,
      );

      const [items, countResult] = await Promise.all([
        ctx.db.query.products.findMany({
          where: whereClause,
          orderBy: [asc(products.name)], // по имени — стабильный порядок
          limit: input.limit,
          offset: (input.page - 1) * input.limit,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count ?? 0;
      return {
        items,
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
});
```

### Когда понадобится cursor (v2)

Если каталог вырастет >10k или нужна infinite scroll в списках движений (десятки тысяч записей), мигрировать на tuple-cursor:

```ts
cursor: z.object({ createdAt: z.string(), id: z.string() }).optional(),
// where: or(gt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), gt(id, c.id)))
// orderBy: [desc(createdAt), asc(id)]
```

**Для MVP — offset.**

---

## Patch 28: Мелкие фиксы

### 28.1 Удалить RLS-политику для `parse-sessions`

В v1.2 Patch 12 я создавал:

```sql
CREATE POLICY "service only on parse-sessions"
ON storage.objects FOR ALL
USING (bucket_id = 'parse-sessions' AND auth.role() = 'service_role');
```

Это **разрешающая** политика. Без неё работает default-deny (Supabase storage имеет RLS enabled по умолчанию). Service_role bypass'ит RLS в любом случае.

**Удалить этот CREATE POLICY.** Оставить только `INSERT INTO storage.buckets ...`.

### 28.2 `DbClient` type alias

В v1.2 Patch 18.3 я написал `db: typeof dbType` — undefined. Правильно:

```typescript
// src/server/db/types.ts
import type { db } from "./client";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DbClient = typeof db;

export type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

// Обобщённый тип для функций, принимающих либо db, либо tx:
export type DbOrTx = DbClient | DbTransaction;
```

Использование:

```typescript
// src/server/lib/machines/getLocation.ts
import { DbOrTx } from "@/server/db/types";

export async function getMachineLocationId(
  db: DbOrTx,
  machineId: string,
  organizationId: string,
): Promise<string> {
  /* ... */
}
```

### 28.3 `fileName` flow в `storeSession`

Явный пример для Claude Code — откуда приходит `fileName`:

```typescript
// src/server/api/routers/salesImport.ts

uploadAndParse: managerProcedure
  .input(z.object({
    bucket: z.enum(['sales-imports']),
    path: z.string().min(1),
    fileName: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!input.path.startsWith(`${ctx.organizationId}/`)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const content = await downloadAsText(input.bucket, input.path);
    const parsed = parseSalesFile(content, input.fileName);

    // ↓ fileName приходит из input, НЕ из parseSalesFile
    const parseSessionId = await storeSession(ctx.organizationId, {
      headers: parsed.headers,
      rows: parsed.rows,
      format: parsed.format,
      reportDate: parsed.reportDate,
      fileName: input.fileName,
    });

    return {
      fileName: input.fileName,
      format: parsed.format,
      reportDate: parsed.reportDate,
      headers: parsed.headers,
      sample: parsed.rows.slice(0, 3),
      totalRows: parsed.rows.length,
      guessedMapping: parsed.mapping,
      parseSessionId,
    };
  }),
```

### 28.4 XLSX: обернуть в `Uint8Array`

Формально `ArrayBuffer` работает, но best practice:

```typescript
if (ext === "xlsx" || ext === "xls") {
  if (typeof content === "string")
    throw new Error("XLSX requires binary content");
  const wb = XLSX.read(new Uint8Array(content), { type: "array" });
  // ...
}
```

### 28.5 Shared imports для всех snippet'ов

Все snippet'ы в v1.1/v1.2/v1.3 предполагают следующие импорты. Claude Code: в каждом файле добавляй то, что нужно:

```typescript
// Drizzle common
import {
  sql,
  and,
  or,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  inArray,
  ilike,
  asc,
  desc,
} from "drizzle-orm";
import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

// tRPC
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Schema
import * as schema from "@/server/db/schema";
// Либо точечно:
import {
  products,
  suppliers,
  purchases,
  purchaseItems,
  stockMovements,
  salesAggregated,
  salesTxnHashes,
  inventoryBalances,
  priceHistory,
  organizations,
  users,
  categories,
  machines,
  locations,
  reconciliations,
  reconciliationItems,
  userMachineAccess,
  auditLog,
  slotHistory,
  salesImports,
} from "@/server/db/schema";

// Import format enum
export type ImportFormat =
  | "HICON"
  | "MULTIKASSA"
  | "CLICK"
  | "PAYME"
  | "UZUM"
  | "CUSTOM";

// Column mapping type (единое определение)
export interface ColumnMapping {
  productCol: number;
  qtyCol: number;
  totalAmountCol: number;
  priceCol: number;
  txnIdCol: number;
}
```

---

## Финальный чек-лист для Claude Code (полный, заменяет предыдущие)

Перед стартом:

- [ ] Прочитал SPEC → PATCHES v1.1 → PATCHES v1.2 → PATCHES v1.3 **в этом порядке**
- [ ] Приоритет при конфликтах: **v1.3 > v1.2 > v1.1 > SPEC**
- [ ] Изучил `olma.html` (прототип) — УЧ логика и UX
- [ ] Загружен `Product_name2026-4-21_15_34_44.csv` для acceptance-теста

Supabase setup:

- [ ] Два project'а: prod + staging
- [ ] Custom Access Token Hook с `GRANT USAGE ON SCHEMA public TO supabase_auth_admin` + `GRANT SELECT ON public.users`
- [ ] Bucket'ы: `parse-sessions` (default-deny RLS), `sales-imports`, `purchase-invoices`, `backups`
- [ ] Extension `pg_cron` установлен (опционально — для cleanup в production)
- [ ] Функция `current_org_id()` создана **с GRANT EXECUTE** ролям `authenticated, anon, service_role`

Code checklist:

- [ ] `pnpm add postgres superjson` (не `pg`!)
- [ ] `drizzle-orm/postgres-js` используется в `/src/server/db/client.ts`
- [ ] Все RLS-политики используют `current_org_id()` helper
- [ ] Все list-запросы используют `paginationInput` + `isNull(deletedAt)` + `eq(organizationId, ...)`
- [ ] Sales import (`execute`) использует batched lookup + `seenHashes` Set + `aggByProduct` Map
- [ ] Parse-сессии хранятся в Supabase Storage (не в Map), путь с orgId-префиксом
- [ ] `tenantPublicProcedure` через `getRawInput()`, NOT_FOUND в обоих отказных случаях
- [ ] Timezone: `DEFAULT_TIMEZONE = 'Asia/Tashkent'` в detector, используется через helper `getReportDay()`
- [ ] Seed: 21 supplier, 40 product, 2 machines с рабочими layout'ами, `locations.machineId` удалён из схемы

Integration-тест перед production:

- [ ] Импорт test CSV: 3 строки → 3 SALE movement'а → 30,000 UZS revenue
- [ ] Повторный импорт того же файла: 0 new, 3 skipped
- [ ] Модифицированный CSV с qty=2 для Coca: delta = 1 добавляется к существующему
- [ ] CSV с двумя строками для одной Coca (кейс Patch 20): обе обрабатываются через in-batch Map
- [ ] Cross-tenant isolation: user_A не видит данных user_B через API (проверить 3-4 endpoint'а)
- [ ] `/tenant/olma` — доступен без auth, показывает prices без cost
- [ ] `/tenant/nonexistent` — 404 (не 403)
- [ ] `/tenant/olma` с `tenantPublicEnabled=false` — 404 (не 403, enumeration defence)

---

## Что НЕ закрыто в v1.3 (известные ограничения)

Эти пункты осознанно оставлены открытыми для MVP:

1. **Real RLS для tRPC (Option B Patch 13.3)** — требует Supavisor + role switching. Архитектурное решение для v2 при добавлении второго платного тенанта.

2. **Edge Function cleanup parse-sessions** — lazy cleanup в `getSession` достаточен для <50 импортов/день. Поднимать Edge Function при >100 imports/day.

3. **Мульти-timezone** — MVP только Ташкент. Обновление `orgProcedure` для загрузки organization settings — когда появится клиент не в UZ.

4. **Cursor pagination** — offset хватает до ~10k SKU. Мигрировать на tuple-cursor при появлении клиента с крупным каталогом.

5. **ESLint custom rule для org-scope** — ручное code review достаточно для команды из 1-2 человек. Автоматизировать при росте команды.

6. **i18n** — русский only. Uzbek и English — отдельная задача после MVP.

Все эти пункты — **не блокеры**, а запланированные v2 улучшения.

---

**КОНЕЦ ПАТЧЕЙ v1.3**
