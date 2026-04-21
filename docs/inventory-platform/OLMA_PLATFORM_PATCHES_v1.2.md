# OLMA Platform Spec — Patches & Clarifications v1.2

**Этот документ дополняет `OLMA_PLATFORM_SPEC.md` v1.0 и `OLMA_PLATFORM_PATCHES.md` v1.1.**

После второго аудита найдено ещё **7 критичных блокеров** и **несколько серьёзных проблем** — они все закрыты в этом файле. При любых противоречиях этот документ имеет приоритет над v1.1 и v1.0.

**Claude Code:** читай в порядке SPEC → v1.1 → v1.2. Все правки v1.2 — обязательные.

---

## Patch 12: Parse sessions через Supabase Storage (CRITICAL)

### Проблема

В v1.1 Patch 2 предложен `Map<string, ParseSession>` в памяти + `setInterval` для TTL.

Vercel serverless **не имеет shared memory между вызовами функций** и **не исполняет setInterval**. Следовательно:

- `uploadAndParse` создаст сессию в инстансе A
- `confirmMapping` придёт в инстанс B — получит `'Parse session expired'`

Это **полностью сломает wizard импорта** — киллер-фичу системы.

### Решение

Хранить состояние сессии как JSON в Supabase Storage с префиксом по orgId и TTL через metadata.

```typescript
// src/server/lib/salesImport/session.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = "parse-sessions";
const TTL_SECONDS = 30 * 60; // 30 минут

export interface ParseSession {
  rows: string[][];
  headers: string[];
  format: string;
  reportDate: string;
  fileName: string;
  createdAt: number;
  expiresAt: number;
}

export async function storeSession(
  organizationId: string,
  data: Omit<ParseSession, "createdAt" | "expiresAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const session: ParseSession = {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };

  const path = `${organizationId}/${id}.json`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, JSON.stringify(session), {
      contentType: "application/json",
      upsert: false,
    });

  if (error) throw new Error(`Failed to store parse session: ${error.message}`);
  return id;
}

export async function getSession(
  organizationId: string,
  sessionId: string,
): Promise<ParseSession> {
  const path = `${organizationId}/${sessionId}.json`;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw new Error("Parse session expired — re-upload file");

  const text = await data.text();
  const session = JSON.parse(text) as ParseSession;

  if (session.expiresAt < Date.now()) {
    // Лениво чистим просроченные
    await supabase.storage
      .from(BUCKET)
      .remove([path])
      .catch(() => {});
    throw new Error("Parse session expired");
  }
  return session;
}

export async function clearSession(
  organizationId: string,
  sessionId: string,
): Promise<void> {
  const path = `${organizationId}/${sessionId}.json`;
  await supabase.storage
    .from(BUCKET)
    .remove([path])
    .catch(() => {});
}
```

### Bucket setup (миграция)

```sql
-- Создать bucket (идемпотентно)
INSERT INTO storage.buckets (id, name, public)
VALUES ('parse-sessions', 'parse-sessions', false)
ON CONFLICT DO NOTHING;

-- RLS: только service_role читает/пишет (чтобы tRPC работал через admin client)
-- Пользовательские клиенты НЕ должны видеть эти файлы
CREATE POLICY "service only on parse-sessions"
ON storage.objects FOR ALL
USING (bucket_id = 'parse-sessions' AND auth.role() = 'service_role');
```

### Cleanup jobs

Поскольку `setInterval` не работает, очистку старых сессий делать через **Vercel Cron** либо **Supabase pg_cron**:

```sql
-- pg_cron (Supabase Dashboard → Extensions → pg_cron)
SELECT cron.schedule(
  'cleanup-parse-sessions',
  '0 * * * *', -- каждый час
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'parse-sessions'
      AND created_at < NOW() - INTERVAL '1 hour'
  $$
);
```

### Обновить сигнатуры в tRPC

```typescript
// Было (v1.1):
storeSession(parsed): string
// Стало:
await storeSession(ctx.organizationId, parsed): Promise<string>

// Было:
getSession(input.parseSessionId): ParseSession
// Стало:
await getSession(ctx.organizationId, input.parseSessionId): Promise<ParseSession>
```

`organizationId` нужен чтобы isolate сессии между тенантами — защита от ID-guessing.

---

## Patch 13: SQL / Auth / Decoding фиксы

### 13.1 RLS — правильный оператор precedence

**Баг в Spec 6.5:**

```sql
USING (organization_id = auth.jwt() ->> 'org_id'::uuid);
```

`::uuid` биндится к строковому литералу `'org_id'`, PostgreSQL пытается скастовать строку `'org_id'` в uuid → `invalid input syntax for type uuid`.

**Правильно во всех политиках:**

```sql
USING (organization_id = (auth.jwt() ->> 'org_id')::uuid);
```

Применить к **каждой** политике во всех таблицах. Типовой шаблон:

```sql
-- Универсальный макрос для генерации RLS (использовать для всех org-таблиц)
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'org_id')::uuid
$$;

-- Теперь политики становятся читаемее:
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_select" ON products FOR SELECT
  USING (organization_id = current_org_id());

CREATE POLICY "org_isolation_modify" ON products FOR ALL
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());
```

Повторить для всех таблиц с `organization_id`. Это заметно короче и все в одном месте.

### 13.2 GRANTs для Custom Access Token Hook

В Patch 4 (v1.1) пропущены два GRANT'а — без них `supabase_auth_admin` не сможет читать `public.users` и функция молча вернёт пустой JWT.

**Добавить в ту же миграцию:**

```sql
-- Auth-admin должен видеть схему public
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- И читать users для извлечения org_id + role
GRANT SELECT ON public.users TO supabase_auth_admin;

-- Блокировать доступ к users для остальных (anon, authenticated)
REVOKE ALL ON public.users FROM anon, authenticated;
```

Последний REVOKE важен: иначе любой залогиненный пользователь сможет через PostgREST прочитать всю таблицу users.

### 13.3 Честная RLS-архитектура (замена раздела 3.1 и 6.5)

**Проблема.** Spec обещает "RLS как дублирующая защита". Но `DATABASE_URL=postgresql://postgres:...` — это superuser-роль `postgres`, которая **bypass'ит RLS по умолчанию** в Supabase. Значит, если в tRPC забудешь `WHERE organizationId = ...` — Drizzle вернёт данные **всех организаций**.

**Два чистых варианта:**

**Вариант A — App-level only (простой, для MVP рекомендуется)**

Признать явно: RLS применяется **только** к клиентским запросам через `supabase-js`. В tRPC защита только на уровне приложения через middleware `orgProcedure`. Чтобы гарантировать что ни один запрос не течёт:

```typescript
// src/server/db/orgGuard.ts
import { sql } from "drizzle-orm";

/**
 * Обязательная обёртка для всех query-builder вызовов.
 * Бросает ошибку на этапе разработки если забыл organizationId.
 */
export function requireOrgScope<T>(
  query: T,
  condition: unknown,
  tableName: string,
): T {
  if (!condition) {
    throw new Error(
      `[SECURITY] Query on ${tableName} without organizationId scope. ` +
        `This would leak cross-tenant data.`,
    );
  }
  return query;
}
```

Плюс ESLint-правило или pre-commit hook который ищет паттерн `db.query.X.findMany({})` без `where` — отлавливает забытые скоупы.

**Вариант B — Real RLS через `authenticated` role (для v2)**

Использовать не прямой `postgres`-коннект, а Supabase Supavisor с `authenticated`-ролью и передавать JWT claim через `SET LOCAL`:

```typescript
async function withUserContext<T>(
  jwt: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${jwt}, true)`,
    );
    return fn(tx);
  });
}
```

Тогда RLS применяется к каждому запросу. Но это усложнение для MVP — отложить на фазу production-hardening.

**Решение для этого handoff'а:** **Вариант A**. Включить RLS на всех таблицах (пригодится для `supabase-js` клиентов, storage, публичных страниц), но в спеке явно сказать "в tRPC RLS не защищает — защищает middleware + requireOrgScope".

### 13.4 JWT decoding — base64url, не base64

В Patch 4 (v1.1):

```typescript
const claims = JSON.parse(atob(session.access_token.split(".")[1]));
```

JWT использует **base64url** (символы `-` и `_` вместо `+` и `/`, без `=` padding). `atob` иногда это переварит, иногда бросит `InvalidCharacterError`.

**Правильно:**

```typescript
function decodeJwtClaims(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) return {};
  // В Node 20+ Buffer умеет base64url нативно:
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
}

// В createContext:
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return { db, user: null, organizationId: null };

const { data: sessionData } = await supabase.auth.getSession();
const claims = sessionData?.session?.access_token
  ? decodeJwtClaims(sessionData.session.access_token)
  : {};
```

**Важно:** подпись JWT мы не верифицируем в коде — но `supabase.auth.getUser()` уже сделал это на стороне Supabase API перед возвратом пользователя. Мы просто извлекаем custom claims из уже проверенного токена. Это корректно.

---

## Patch 14: File URL / Timezone / Upload contracts

### 14.1 Единый контракт для Storage путей

В v1.1 три разных представления одного файла конфликтуют. Исправляем на единый `{ bucket, path }`.

**createUploadUrl возвращает:**

```typescript
return {
  uploadUrl: data.signedUrl,
  bucket: input.bucket,
  path, // "{orgId}/{year}/{month}/{uuid}_{fileName}"
};
```

**uploadAndParse принимает:**

```typescript
uploadAndParse: managerProcedure
  .input(
    z.object({
      bucket: z.enum(["sales-imports", "purchase-invoices"]),
      path: z.string().min(1),
      fileName: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Валидация: path обязан начинаться с orgId (иначе кто-то шлёт чужой путь)
    if (!input.path.startsWith(`${ctx.organizationId}/`)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Path outside org scope",
      });
    }
    const content = await downloadFromStorage(input.bucket, input.path);
    const parsed = parseSalesFile(content, input.fileName);
    // ...
  });
```

**downloadFromStorage обновить:**

```typescript
export async function downloadFromStorage(
  bucket: string,
  path: string,
): Promise<ArrayBuffer> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return data.arrayBuffer();
}

/**
 * Обёртка для текстовых файлов со страйпом BOM
 */
export async function downloadAsText(
  bucket: string,
  path: string,
): Promise<string> {
  const buf = await downloadFromStorage(bucket, path);
  const bytes = new Uint8Array(buf);
  const hasBOM = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  return new TextDecoder("utf-8").decode(hasBOM ? bytes.slice(3) : bytes);
}
```

Теперь:

- CSV/TSV читаются через `downloadAsText`
- XLSX читается через `downloadFromStorage` + `XLSX.read(buffer, { type: 'array' })`

### 14.2 Timezone фикс для `extractDateFromFilename`

**Проблема.** Функция возвращает ISO без `+05:00`:

```ts
return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
```

На Vercel (сервер UTC) `new Date(...)` интерпретирует как **UTC**, но имя файла — в Ташкентском времени. После 19:00 Ташкента отчёт улетает в следующий день.

**Исправление:**

```typescript
// src/server/lib/salesImport/detector.ts

const TASHKENT_TZ_OFFSET = "+05:00";

export function extractDateFromFilename(fileName: string): string | null {
  // Product_name2026-4-21_15_34_44.csv
  const m = fileName.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})_?(\d{1,2})?[_-]?(\d{1,2})?[_-]?(\d{1,2})?/,
  );
  if (!m) return null;
  const [, y, mo, d, h = "12", mi = "00", s = "00"] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:${s.padStart(2, "0")}${TASHKENT_TZ_OFFSET}`;
}

/**
 * Для reportDay — берём чисто дату В ЛОКАЛЬНОЙ ЗОНЕ организации
 * (не в UTC, это приводило к сдвигу дат на границе суток)
 */
export function getReportDay(
  reportDateISO: string,
  tz = "Asia/Tashkent",
): string {
  const d = new Date(reportDateISO);
  // Intl.DateTimeFormat для корректной работы с TZ
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // возвращает YYYY-MM-DD
}
```

В executeSalesImport заменить:

```typescript
// Было:
const reportDay = input.reportDate.split("T")[0];
// Стало:
const reportDay = getReportDay(
  input.reportDate,
  ctx.organization.settings.timezone,
);
```

Теперь независимо от сервера отчёт привязан к дате Ташкента.

---

## Patch 15: Batched hash lookup (производительность)

### Проблема

В `executeSalesImport` на каждую строку — 1-3 DB-запроса. Для отчёта 500 строк это 1500 round-trip'ов в транзакции. При 50ms латентности Supabase это **75 секунд** — превышает Vercel timeout.

### Решение — pre-fetch всех релевантных хэшей и aggregated одним запросом

```typescript
// src/server/api/routers/salesImport.ts (часть execute)

// ШАГ A: пропарсить все строки, собрать rawRowHashes и потенциальные txnKeys
const rowsData: Array<{
  row: string[];
  rawRowHash: string;
  txnKey?: string;
  productId: string | null;
  qty: number;
  unitPrice: number;
  totalAmountFromFile: number;
  rawName: string;
}> = [];

for (const [rowIdx, row] of session.rows.entries()) {
  const rawName = cleanProductName(row[input.mapping.productCol]);
  if (!rawName) {
    unmapped++;
    continue;
  }

  const productId = input.productMap[rawName] ?? null;
  if (!productId) {
    unmapped++;
    unmappedNames.add(rawName);
    continue;
  }

  const qty = parseQty(row[input.mapping.qtyCol]);
  const unitPrice = calcUnitPrice(row, input.mapping, qty);
  const totalAmountFromFile = parseTotalAmount(
    row,
    input.mapping.totalAmountCol,
  );

  const rawRowStr = row.map((c) => String(c || "").trim()).join("|");
  const rawRowHash = hashString(
    `row:${reportDay}|${input.machineId}|${rawRowStr}`,
  );

  const txnRaw =
    input.mapping.txnIdCol >= 0
      ? String(row[input.mapping.txnIdCol] || "").trim()
      : "";
  const isRealTxn = txnRaw && (txnRaw.length > 6 || /[a-zA-Z\-_]/.test(txnRaw));
  const txnKey = isRealTxn
    ? hashString(`txn:${txnRaw}|${productId}`)
    : undefined;

  rowsData.push({
    row,
    rawRowHash,
    txnKey,
    productId,
    qty,
    unitPrice,
    totalAmountFromFile,
    rawName,
  });
}

// ШАГ B: ОДНИМ запросом загрузить все существующие hash_keys
const allHashes = [
  ...rowsData.map((r) => r.rawRowHash),
  ...(rowsData.map((r) => r.txnKey).filter(Boolean) as string[]),
];
const existingHashes =
  allHashes.length === 0
    ? []
    : await tx
        .select({ hashKey: salesTxnHashes.hashKey })
        .from(salesTxnHashes)
        .where(
          and(
            eq(salesTxnHashes.organizationId, ctx.organizationId),
            inArray(salesTxnHashes.hashKey, allHashes),
          ),
        );
const existingHashSet = new Set(existingHashes.map((h) => h.hashKey));

// ШАГ C: ОДНИМ запросом все aggregated для этого дня/машины
const allProductIds = [
  ...new Set(rowsData.map((r) => r.productId).filter(Boolean) as string[]),
];
const existingAgg =
  allProductIds.length === 0
    ? []
    : await tx
        .select()
        .from(salesAggregated)
        .where(
          and(
            eq(salesAggregated.organizationId, ctx.organizationId),
            eq(salesAggregated.reportDay, reportDay),
            eq(salesAggregated.machineId, input.machineId),
            inArray(salesAggregated.productId, allProductIds),
          ),
        );
const aggMap = new Map(existingAgg.map((a) => [a.productId, a]));

// ШАГ D: getCurrentCost для всех productId одним запросом
const costMap = await getCurrentCostBatch(
  tx,
  ctx.organizationId,
  allProductIds,
);

// ШАГ E: основной цикл — теперь только проверки in-memory + батчевые inserts
const movementsToInsert: InferInsertModel<typeof stockMovements>[] = [];
const aggToUpsert: InferInsertModel<typeof salesAggregated>[] = [];
const hashesToInsert: InferInsertModel<typeof salesTxnHashes>[] = [];

for (const rd of rowsData) {
  // L1
  if (existingHashSet.has(rd.rawRowHash)) {
    skipped++;
    continue;
  }
  // L2
  if (rd.txnKey && existingHashSet.has(rd.txnKey)) {
    skipped++;
    continue;
  }

  // L3 DELTA
  let effectiveQty = rd.qty;
  const prev = aggMap.get(rd.productId!);
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

  aggToUpsert.push({
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

// ШАГ F: три batch-insert'а вместо сотен отдельных
if (movementsToInsert.length)
  await tx.insert(stockMovements).values(movementsToInsert);
if (aggToUpsert.length) {
  await tx
    .insert(salesAggregated)
    .values(aggToUpsert)
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
if (hashesToInsert.length)
  await tx.insert(salesTxnHashes).values(hashesToInsert);
```

**Эффект:** вместо 1500 RTT при 500 строках — ~5 запросов. Импорт укладывается в 1-2 секунды вместо 75.

`getCurrentCostBatch` реализовать как:

```typescript
export async function getCurrentCostBatch(
  tx: typeof db,
  organizationId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  if (!productIds.length) return new Map();
  // Берём последнее PURCHASE_IN по каждому productId через DISTINCT ON
  const rows = await tx.execute(sql`
    SELECT DISTINCT ON (product_id)
      product_id, unit_cost
    FROM stock_movements
    WHERE organization_id = ${organizationId}
      AND product_id = ANY(${productIds})
      AND movement_type = 'PURCHASE_IN'
      AND unit_cost > 0
    ORDER BY product_id, at DESC
  `);
  return new Map(
    rows.rows.map((r) => [r.product_id as string, Number(r.unit_cost)]),
  );
}
```

---

## Patch 16: Data integrity — soft-delete и organizationId везде

### 16.1 Soft-delete фильтрация

**Проблема.** Все list-queries в спеке забывают `isNull(deletedAt)`. После первого soft-delete товар продолжает появляться в списках.

**Решение A** — добавить в каждый запрос. Утомительно, легко забыть.

**Решение B (рекомендуется)** — Drizzle view с фильтром:

```typescript
// src/server/db/schema/views.ts
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";
import { products } from "./products";

export const activeProducts = pgView("active_products").as((qb) =>
  qb
    .select()
    .from(products)
    .where(sql`${products.deletedAt} IS NULL`),
);
// аналогично: activeSuppliers, activeLocations, activeMachines...
```

В роутерах использовать `activeProducts` вместо `products` для read-запросов. Для mutation'ов — обычную таблицу.

**Решение C (самое чистое для MVP)** — helper в Drizzle query:

```typescript
// src/server/db/softDelete.ts
import { isNull, and, SQL } from "drizzle-orm";
import { type Column } from "drizzle-orm";

export function activeOnly(
  deletedAtCol: Column,
  extraWhere?: SQL,
): SQL | undefined {
  return extraWhere
    ? and(isNull(deletedAtCol), extraWhere)
    : isNull(deletedAtCol);
}

// Использование:
ctx.db.query.products.findMany({
  where: activeOnly(
    products.deletedAt,
    and(
      eq(products.organizationId, ctx.organizationId),
      eq(products.isActive, true),
    ),
  ),
});
```

**Важное уточнение:** `isActive` и `deletedAt` — разные вещи:

- `isActive = false` — **видимое** выключение (товар снят с продаж, но в истории продолжает показываться)
- `deletedAt != null` — **мягкое удаление** (вообще не показывать в UI, но сохраняется для FK истории)

### 16.2 Добавить `organizationId` в дочерние таблицы

Принцип 3.1 нарушен для 4 таблиц. Исправить схемы:

```typescript
// purchase_items — organizationId ДУБЛИРУЕТСЯ из purchases
// (нужен для RLS и быстрых tenant-scoped запросов)
export const purchaseItems = pgTable('purchase_items', {
  id: id(),
  organizationId: orgId(),  // ← ДОБАВИТЬ
  purchaseId: uuid('purchase_id').notNull()
    .references(() => purchases.id, { onDelete: 'cascade' }),
  // ...
}, (t) => ({
  orgIdx: index('purchase_items_org_idx').on(t.organizationId),
}));

// reconciliation_items — аналогично
export const reconciliationItems = pgTable('reconciliation_items', {
  id: id(),
  organizationId: orgId(),  // ← ДОБАВИТЬ
  reconciliationId: uuid('reconciliation_id').notNull()
    .references(() => reconciliations.id, { onDelete: 'cascade' }),
  // ...
});

// user_machine_access — аналогично
export const userMachineAccess = pgTable('user_machine_access', {
  organizationId: orgId(),  // ← ДОБАВИТЬ
  userId: uuid('user_id').notNull()...,
  machineId: uuid('machine_id').notNull()...,
  // ...
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.machineId] }),
}));
```

При insert в эти таблицы подставлять `organizationId` из родительской сущности. Это денормализация, но необходимая для RLS и производительности.

**Триггер для enforce консистентности:**

```sql
CREATE OR REPLACE FUNCTION check_purchase_items_org() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id != (SELECT organization_id FROM purchases WHERE id = NEW.purchase_id) THEN
    RAISE EXCEPTION 'organization_id mismatch in purchase_items';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_items_org_check
BEFORE INSERT OR UPDATE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION check_purchase_items_org();
```

---

## Patch 17: Полный seed — все products, suppliers, layouts

### Проблема

Patch 7 в v1.1 даёт 13 поставщиков, а прототип ссылается на ~20 (в т.ч. `Omaf local`, `Strobar`, `Konti`, `Velona`, `Cheers local`, `7Days`, `Flint`, `Ermak`). Plus products оставлены как TODO `"распарси DEFAULT_STATE из olma.html"` — это не спека.

### Решение — исчерпывающий seed

```typescript
// scripts/seed-olma.ts (полная версия — заменяет v1.1 Patch 7)

import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

// ===== Справочные данные =====

const SUPPLIERS = [
  { code: "positi", name: "POSITI", payment: "transfer" },
  { code: "redbull_uz", name: "Red Bull UZ", payment: "transfer" },
  { code: "mars", name: "Mars Uzbekistan", payment: "transfer" },
  { code: "int_bev", name: "INTERNATIONAL BEV", payment: "transfer" },
  { code: "int_food", name: "INTER FOOD PLUS", payment: "transfer" },
  { code: "billur", name: "BILLUR SUV", payment: "transfer" },
  { code: "nestle", name: "Nestle", payment: "transfer" },
  { code: "pepsico", name: "PepsiCo", payment: "transfer" },
  { code: "mondelez", name: "Mondelez", payment: "transfer" },
  { code: "ferrero", name: "Ferrero", payment: "transfer" },
  { code: "ideal", name: "Ideal Future Trade", payment: "transfer" },
  { code: "bizaz", name: "BIZNES-AZIYA", payment: "transfer" },
  { code: "kellogg", name: "Kellogg", payment: "transfer" },
  // Ранее пропущенные (локальные):
  { code: "omaf_local", name: "Omaf local", payment: "cash" },
  { code: "strobar", name: "Strobar", payment: "cash" },
  { code: "konti", name: "Konti", payment: "cash" },
  { code: "velona", name: "Velona", payment: "cash" },
  { code: "cheers_local", name: "Cheers local", payment: "cash" },
  { code: "seven_days", name: "7Days", payment: "cash" },
  { code: "flint", name: "Flint", payment: "cash" },
  { code: "ermak", name: "Ermak", payment: "cash" },
] as const;

const CATEGORIES = [
  { code: "cola", name: "Кола/Газ", icon: "🥤", color: "#d32f2f" },
  { code: "energy", name: "Энергетик", icon: "⚡", color: "#2196f3" },
  { code: "mojito", name: "Мохито", icon: "🍃", color: "#4caf50" },
  { code: "fresh", name: "Фреш", icon: "🍋", color: "#ffc107" },
  { code: "tea", name: "Чай", icon: "🍵", color: "#795548" },
  { code: "water", name: "Вода/Молоко", icon: "💧", color: "#03a9f4" },
  { code: "bar", name: "Батончик", icon: "🍫", color: "#6d4c41" },
  { code: "chips", name: "Чипсы/Снек", icon: "🥨", color: "#ff9800" },
] as const;

// Полный каталог (40 SKU) — извлечён из прототипа olma.html раздел DEFAULT_STATE.products
const PRODUCTS = [
  // key, name, vol, cat, cost, price, spd, cap, sup_code, grp
  {
    key: "coca_025",
    name: "Coca-Cola Classic",
    vol: "0.25 CAN",
    cat: "cola",
    cost: 5000,
    price: 10000,
    spd: 5,
    cap: 12,
    sup: "positi",
    grp: "drinks",
  },
  {
    key: "coca_zero",
    name: "Coca-Cola Zero",
    vol: "0.25 CAN",
    cat: "cola",
    cost: 5000,
    price: 10000,
    spd: 2,
    cap: 12,
    sup: "positi",
    grp: "drinks",
  },
  {
    key: "pepsi_025",
    name: "Pepsi",
    vol: "0.25 CAN",
    cat: "cola",
    cost: 5000,
    price: 10000,
    spd: 4,
    cap: 12,
    sup: "int_bev",
    grp: "drinks",
  },
  {
    key: "fanta_025",
    name: "Fanta Orange",
    vol: "0.25 CAN",
    cat: "cola",
    cost: 5000,
    price: 10000,
    spd: 3,
    cap: 12,
    sup: "positi",
    grp: "drinks",
  },
  {
    key: "sprite_025",
    name: "Sprite",
    vol: "0.25 CAN",
    cat: "cola",
    cost: 5000,
    price: 10000,
    spd: 3,
    cap: 12,
    sup: "positi",
    grp: "drinks",
  },
  {
    key: "redbull_025",
    name: "Red Bull",
    vol: "0.25 CAN",
    cat: "energy",
    cost: 16500,
    price: 25000,
    spd: 4,
    cap: 12,
    sup: "redbull_uz",
    grp: "drinks",
  },
  {
    key: "flashup_045",
    name: "Flash Up Energy",
    vol: "0.45 CAN",
    cat: "energy",
    cost: 9167,
    price: 15000,
    spd: 3,
    cap: 10,
    sup: "int_food",
    grp: "drinks",
  },
  {
    key: "plus18_033",
    name: "Plus 18",
    vol: "0.33 CAN",
    cat: "energy",
    cost: 9990,
    price: 15000,
    spd: 2,
    cap: 12,
    sup: "int_food",
    grp: "drinks",
  },
  {
    key: "moxito_lime",
    name: "Moxito Lime",
    vol: "0.5 CAN",
    cat: "mojito",
    cost: 9800,
    price: 15000,
    spd: 3,
    cap: 10,
    sup: "ideal",
    grp: "drinks",
  },
  {
    key: "laimon_033",
    name: "Laimon Fresh",
    vol: "0.33 CAN",
    cat: "fresh",
    cost: 8000,
    price: 15000,
    spd: 2,
    cap: 12,
    sup: "bizaz",
    grp: "drinks",
  },
  {
    key: "fusetea",
    name: "Fuse Tea Mango",
    vol: "0.5 PET",
    cat: "tea",
    cost: 6084,
    price: 10000,
    spd: 2,
    cap: 8,
    sup: "positi",
    grp: "drinks",
  },
  {
    key: "borjomi",
    name: "Borjomi Mineral",
    vol: "0.33 CAN",
    cat: "water",
    cost: 9000,
    price: 12000,
    spd: 3,
    cap: 12,
    sup: "billur",
    grp: "drinks",
  },
  {
    key: "lipton_025",
    name: "Lipton Lemon Tea",
    vol: "0.25 CAN",
    cat: "tea",
    cost: 5800,
    price: 10000,
    spd: 1,
    cap: 10,
    sup: "int_bev",
    grp: "snacks",
  },
  {
    key: "nesquick_025",
    name: "Nesquick Choco Milk",
    vol: "0.25 CAN",
    cat: "water",
    cost: 7000,
    price: 12000,
    spd: 1,
    cap: 10,
    sup: "nestle",
    grp: "snacks",
  },
  {
    key: "fusetea_045",
    name: "Fuse Tea",
    vol: "0.45 CAN",
    cat: "tea",
    cost: 6500,
    price: 11000,
    spd: 2,
    cap: 10,
    sup: "positi",
    grp: "snacks",
  },
  {
    key: "ozbegim_045",
    name: "O'zbegim Mojito",
    vol: "0.45 CAN",
    cat: "mojito",
    cost: 4000,
    price: 7000,
    spd: 2,
    cap: 10,
    sup: "ideal",
    grp: "snacks",
  },
  {
    key: "omaf_035",
    name: "Omaf",
    vol: "0.35 CAN",
    cat: "fresh",
    cost: 3500,
    price: 6000,
    spd: 2,
    cap: 10,
    sup: "omaf_local",
    grp: "snacks",
  },
  {
    key: "water_still",
    name: "Bonaqua Still",
    vol: "0.5 PET",
    cat: "water",
    cost: 2500,
    price: 5000,
    spd: 3,
    cap: 8,
    sup: "positi",
    grp: "snacks",
  },
  {
    key: "water_gas",
    name: "Bonaqua Sparkling",
    vol: "0.5 PET",
    cat: "water",
    cost: 3000,
    price: 5000,
    spd: 2,
    cap: 8,
    sup: "positi",
    grp: "snacks",
  },
  {
    key: "snickers",
    name: "Snickers",
    vol: "50g",
    cat: "bar",
    cost: 5500,
    price: 9000,
    spd: 3,
    cap: 8,
    sup: "mars",
    grp: "snacks",
  },
  {
    key: "twix",
    name: "Twix",
    vol: "55g",
    cat: "bar",
    cost: 6500,
    price: 10000,
    spd: 2,
    cap: 8,
    sup: "mars",
    grp: "snacks",
  },
  {
    key: "bounty",
    name: "Bounty",
    vol: "57g",
    cat: "bar",
    cost: 7000,
    price: 10000,
    spd: 2,
    cap: 8,
    sup: "mars",
    grp: "snacks",
  },
  {
    key: "kitkat",
    name: "KitKat",
    vol: "45g",
    cat: "bar",
    cost: 8500,
    price: 12000,
    spd: 2,
    cap: 8,
    sup: "nestle",
    grp: "snacks",
  },
  {
    key: "milkyway",
    name: "MilkyWay",
    vol: "21g",
    cat: "bar",
    cost: 3500,
    price: 6000,
    spd: 2,
    cap: 8,
    sup: "mars",
    grp: "snacks",
  },
  {
    key: "picnic",
    name: "Picnic",
    vol: "38g",
    cat: "bar",
    cost: 4500,
    price: 7000,
    spd: 2,
    cap: 8,
    sup: "mars",
    grp: "snacks",
  },
  {
    key: "kinder_bueno",
    name: "Kinder Bueno",
    vol: "43g",
    cat: "bar",
    cost: 7500,
    price: 11000,
    spd: 2,
    cap: 8,
    sup: "ferrero",
    grp: "snacks",
  },
  {
    key: "strobar",
    name: "Strobar",
    vol: "40g",
    cat: "bar",
    cost: 4500,
    price: 7000,
    spd: 2,
    cap: 8,
    sup: "strobar",
    grp: "snacks",
  },
  {
    key: "barni",
    name: "Barni",
    vol: "30g",
    cat: "bar",
    cost: 3500,
    price: 6000,
    spd: 2,
    cap: 8,
    sup: "mondelez",
    grp: "snacks",
  },
  {
    key: "oreo",
    name: "Oreo 4шт",
    vol: "44g",
    cat: "bar",
    cost: 4000,
    price: 7000,
    spd: 2,
    cap: 8,
    sup: "mondelez",
    grp: "snacks",
  },
  {
    key: "super_contic",
    name: "Супер Контик",
    vol: "51g",
    cat: "bar",
    cost: 3500,
    price: 6000,
    spd: 2,
    cap: 8,
    sup: "konti",
    grp: "snacks",
  },
  {
    key: "velona",
    name: "Velona",
    vol: "40g",
    cat: "bar",
    cost: 3000,
    price: 5000,
    spd: 2,
    cap: 6,
    sup: "velona",
    grp: "snacks",
  },
  {
    key: "lays_70",
    name: "Lay's",
    vol: "70g",
    cat: "chips",
    cost: 6500,
    price: 10000,
    spd: 3,
    cap: 6,
    sup: "pepsico",
    grp: "snacks",
  },
  {
    key: "cheers_130",
    name: "Cheers",
    vol: "130g",
    cat: "chips",
    cost: 8000,
    price: 12000,
    spd: 2,
    cap: 6,
    sup: "cheers_local",
    grp: "snacks",
  },
  {
    key: "pringles",
    name: "Pringles",
    vol: "40g",
    cat: "chips",
    cost: 12000,
    price: 18000,
    spd: 1,
    cap: 6,
    sup: "kellogg",
    grp: "snacks",
  },
  {
    key: "tuc",
    name: "TUC печенье",
    vol: "100g",
    cat: "chips",
    cost: 5000,
    price: 8000,
    spd: 2,
    cap: 6,
    sup: "mondelez",
    grp: "snacks",
  },
  {
    key: "seven_days",
    name: "7Days круассан",
    vol: "60g",
    cat: "chips",
    cost: 4500,
    price: 7000,
    spd: 2,
    cap: 6,
    sup: "seven_days",
    grp: "snacks",
  },
  {
    key: "flint",
    name: "Flint сухарики",
    vol: "80g",
    cat: "chips",
    cost: 2500,
    price: 5000,
    spd: 2,
    cap: 8,
    sup: "flint",
    grp: "snacks",
  },
  {
    key: "sushki_ermak",
    name: "Сушки Ermak",
    vol: "100g",
    cat: "chips",
    cost: 3000,
    price: 5000,
    spd: 1,
    cap: 6,
    sup: "ermak",
    grp: "snacks",
  },
  {
    key: "ermak_peanut",
    name: "Ermak арахис",
    vol: "40g",
    cat: "chips",
    cost: 4500,
    price: 7000,
    spd: 2,
    cap: 8,
    sup: "ermak",
    grp: "snacks",
  },
  {
    key: "kurt_ermak",
    name: "Курт Ermak",
    vol: "6 шт",
    cat: "chips",
    cost: 3000,
    price: 5000,
    spd: 1,
    cap: 8,
    sup: "ermak",
    grp: "snacks",
  },
] as const;

// Рабочая раскладка из прототипа (использовать productKey, сопоставить на UUID при seed'е)
const ICE_DRINK_LAYOUT: (string | null)[][] = [
  [
    "coca_025",
    "coca_025",
    "coca_zero",
    "pepsi_025",
    "pepsi_025",
    "fanta_025",
    "fanta_025",
    "sprite_025",
  ],
  [
    "coca_025",
    "coca_025",
    "coca_zero",
    "pepsi_025",
    "pepsi_025",
    "fanta_025",
    "sprite_025",
    "coca_025",
  ],
  [
    "redbull_025",
    "redbull_025",
    "redbull_025",
    "flashup_045",
    "flashup_045",
    "plus18_033",
    "plus18_033",
    "redbull_025",
  ],
  [
    "moxito_lime",
    "moxito_lime",
    "moxito_lime",
    "moxito_lime",
    "redbull_025",
    "pepsi_025",
    "laimon_033",
    "laimon_033",
  ],
  [
    "borjomi",
    "borjomi",
    "borjomi",
    "fusetea",
    "fusetea",
    "laimon_033",
    "flashup_045",
    "plus18_033",
  ],
];

const SNACK_LAYOUT: (string | null)[][] = [
  ["tuc", null, "seven_days", null, "lays_70", null, "cheers_130", null],
  ["velona", "picnic", "kurt_ermak", "ermak_peanut", "barni", null, null, null],
  [
    "snickers",
    "bounty",
    "twix",
    "strobar",
    "kinder_bueno",
    "milkyway",
    "oreo",
    "kitkat",
  ],
  [
    "lipton_025",
    "laimon_033",
    "water_still",
    "water_gas",
    null,
    null,
    null,
    "super_contic",
  ],
  [
    "coca_025",
    "coca_025",
    "coca_zero",
    "fanta_025",
    "pepsi_025",
    "redbull_025",
    "borjomi",
    "nesquick_025",
  ],
  [
    null,
    "moxito_lime",
    "fusetea_045",
    "ozbegim_045",
    "flashup_045",
    "plus18_033",
    "omaf_035",
    null,
  ],
];

async function seedOlma() {
  console.log("Creating OLMA organization...");

  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: "olma",
      name: "OLMA",
      legalName: 'ООО "ОЛМА"',
      tenantPublicEnabled: true,
      settings: {
        leadDays: 3,
        safetyDays: 4,
        language: "ru",
        timezone: "Asia/Tashkent",
      },
    })
    .returning();

  const [owner] = await db
    .insert(schema.users)
    .values({
      organizationId: org.id,
      email: "jamshid@olma.uz", // ЗАМЕНИТЬ на реальный перед запуском
      name: "Jamshid",
      role: "owner",
    })
    .returning();

  // Categories
  const cats = await db
    .insert(schema.categories)
    .values(
      CATEGORIES.map((c, i) => ({
        ...c,
        organizationId: org.id,
        sortOrder: i + 1,
      })),
    )
    .returning();
  const catMap = new Map(cats.map((c) => [c.code, c.id]));

  // Suppliers
  const sups = await db
    .insert(schema.suppliers)
    .values(
      SUPPLIERS.map((s) => ({
        organizationId: org.id,
        name: s.name,
        defaultPayment: s.payment as any,
      })),
    )
    .returning();
  const supMap = new Map(SUPPLIERS.map((s, i) => [s.code, sups[i].id]));

  // Locations
  const [warehouse] = await db
    .insert(schema.locations)
    .values({
      organizationId: org.id,
      name: "Склад OLMA",
      type: "WAREHOUSE",
      address: "Ташкент, OLMA",
    })
    .returning();

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

  // Products (сначала вставляем с resolved category + supplier, получаем id)
  const prodInserts = PRODUCTS.map((p) => ({
    organizationId: org.id,
    name: p.name,
    vol: p.vol,
    categoryId: catMap.get(p.cat)!,
    group: p.grp as any,
    sellingPrice: String(p.price),
    expectedSalesPerDay: String(p.spd),
    slotCapacity: p.cap,
    defaultSupplierId: supMap.get(p.sup)!,
    isActive: true,
  }));
  const insertedProducts = await db
    .insert(schema.products)
    .values(prodInserts)
    .returning();
  const prodMap = new Map(
    PRODUCTS.map((p, i) => [p.key, insertedProducts[i].id]),
  );

  // Price history (initial COST + SELLING для каждого)
  const priceHist = [];
  for (const p of PRODUCTS) {
    const pid = prodMap.get(p.key)!;
    priceHist.push({
      organizationId: org.id,
      productId: pid,
      priceType: "COST" as const,
      oldPrice: "0",
      newPrice: String(p.cost),
      reason: "Начальная инициализация (seed)",
      byUserId: owner.id,
      at: new Date(),
    });
    priceHist.push({
      organizationId: org.id,
      productId: pid,
      priceType: "SELLING" as const,
      oldPrice: "0",
      newPrice: String(p.price),
      reason: "Начальная инициализация (seed)",
      byUserId: owner.id,
      at: new Date(),
    });
  }
  await db.insert(schema.priceHistory).values(priceHist);

  // Machines с резолвнутыми layouts
  const resolveLayout = (layout: (string | null)[][]) =>
    layout.map((row) =>
      row.map((key) => (key ? (prodMap.get(key) ?? null) : null)),
    );

  await db.insert(schema.machines).values({
    organizationId: org.id,
    code: "OLMA-ID-01",
    name: "Ice Drink @ OLMA",
    type: "ICE_DRINK",
    brand: "HICON",
    locationId: mIce.id,
    storageLocationId: stIce.id,
    rows: 5,
    cols: 8,
    layout: resolveLayout(ICE_DRINK_LAYOUT),
    installedAt: new Date("2026-04-01"),
  });

  await db.insert(schema.machines).values({
    organizationId: org.id,
    code: "OLMA-SN-01",
    name: "Snack @ OLMA",
    type: "SNACK",
    locationId: mSnack.id,
    storageLocationId: stSnack.id,
    rows: 6,
    cols: 8,
    layout: resolveLayout(SNACK_LAYOUT),
    installedAt: new Date("2026-04-01"),
  });

  console.log(`✓ OLMA org: ${org.id}`);
  console.log(
    `✓ Owner: ${owner.id} — далее связать с Supabase auth.users.id через UPDATE users SET auth_id = ... WHERE id = '${owner.id}'`,
  );
  console.log(
    `✓ ${SUPPLIERS.length} suppliers, ${CATEGORIES.length} categories, ${PRODUCTS.length} products`,
  );
  console.log(`✓ 2 machines with real layouts from prototype`);
}

seedOlma().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## Patch 18: Недостающие helper-функции

В SPEC 7.5 вызываются, но нигде не определены: `parseSalesFile`, `extractUniqueProductNames`, `getMachineLocationId`, `parseTotalAmount`.

### 18.1 `parseSalesFile`

```typescript
// src/server/lib/salesImport/parser.ts
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  detectFormat,
  filterHiconRows,
  extractDateFromFilename,
} from "./detector";

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  format: ImportFormat;
  reportDate: string;
  mapping: ColumnMapping;
}

export function parseSalesFile(
  content: string | ArrayBuffer,
  fileName: string,
): ParsedFile {
  const ext = fileName.toLowerCase().split(".").pop();
  let rawRows: string[][];

  if (ext === "xlsx" || ext === "xls") {
    if (typeof content === "string") {
      throw new Error("XLSX requires binary content");
    }
    const wb = XLSX.read(content, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
    }) as string[][];
  } else {
    // CSV / TSV
    const delim = ext === "tsv" ? "\t" : ",";
    const parsed = Papa.parse<string[]>(content as string, {
      delimiter: delim,
      skipEmptyLines: true,
    });
    rawRows = parsed.data;
  }

  if (!rawRows.length) throw new Error("Empty file");

  const headers = rawRows[0].map((h) => String(h || "").trim());
  let dataRows = rawRows.slice(1);

  const format = detectFormat(headers);
  if (format === "HICON") dataRows = filterHiconRows(dataRows);

  const reportDate =
    extractDateFromFilename(fileName) ?? new Date().toISOString();

  return {
    headers,
    rows: dataRows,
    format,
    reportDate,
    mapping: guessMapping(headers, format),
  };
}

function guessMapping(headers: string[], format: ImportFormat): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());

  if (format === "HICON") {
    return {
      productCol: lower.indexOf("product name"),
      qtyCol: lower.indexOf("quantity"),
      totalAmountCol: lower.indexOf("total amount"),
      priceCol: lower.indexOf("pay by cash"),
      txnIdCol: lower.indexOf("productid"),
    };
  }

  // Эвристика для CUSTOM
  return {
    productCol: lower.findIndex((h) => /product|товар|наимен/.test(h)),
    qtyCol: lower.findIndex((h) => /qty|qnt|количес|pcs/.test(h)),
    totalAmountCol: lower.findIndex((h) => /total|сумма|amount/.test(h)),
    priceCol: lower.findIndex((h) => /price|цена|unit/.test(h)),
    txnIdCol: lower.findIndex((h) => /receipt|txn|transaction|чек/.test(h)),
  };
}
```

### 18.2 `extractUniqueProductNames`

```typescript
// src/server/lib/salesImport/extractNames.ts
import { cleanProductName } from "./parsing";

export function extractUniqueProductNames(
  session: { rows: string[][] },
  mapping: { productCol: number },
): string[] {
  const set = new Set<string>();
  for (const row of session.rows) {
    const name = cleanProductName(row[mapping.productCol]);
    if (name) set.add(name);
  }
  return [...set].sort();
}
```

### 18.3 `getMachineLocationId`

```typescript
// src/server/lib/machines/getLocation.ts
import { eq, and } from "drizzle-orm";
import { machines } from "@/server/db/schema";

export async function getMachineLocationId(
  db: typeof dbType,
  machineId: string,
  organizationId: string,
): Promise<string> {
  const m = await db.query.machines.findFirst({
    where: and(
      eq(machines.id, machineId),
      eq(machines.organizationId, organizationId),
    ),
    columns: { locationId: true },
  });
  if (!m?.locationId) {
    throw new Error(`Machine ${machineId} has no location_id set`);
  }
  return m.locationId;
}
```

### 18.4 `parseTotalAmount`

```typescript
// src/server/lib/salesImport/parsing.ts (добавить к существующим)
export function parseTotalAmount(
  row: string[],
  totalAmountCol: number,
): number {
  if (totalAmountCol < 0) return 0;
  const raw = String(row[totalAmountCol] || "0")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  return parseFloat(raw) || 0;
}
```

---

## Patch 19: Унификация tenantPublicProcedure + пагинация + гигиена

### 19.1 Единая версия tenantPublicProcedure (безопасная)

**Заменяет** версии в Spec 7.2 и Patch 5. Главное — **NOT_FOUND в обоих случаях**, чтобы не утечь информацию о существовании тенантов (classic enumeration defence).

```typescript
// src/server/api/trpc.ts
export const tenantPublicProcedure = publicProcedure.use(
  async ({ rawInput, next, ctx }) => {
    const parsed = z
      .object({ slug: z.string().min(1).max(50) })
      .safeParse(rawInput);
    if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST" });

    const org = await ctx.db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, parsed.data.slug),
        isNull(organizations.deletedAt),
      ),
    });
    // КРИТИЧНО: NOT_FOUND в обоих случаях — не раскрываем какие слаги существуют
    if (!org || !org.tenantPublicEnabled) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return next({
      ctx: { ...ctx, organizationId: org.id, organization: org },
    });
  },
);
```

Использование в router:

```typescript
export const tenantRouter = createTRPCRouter({
  publicMenu: tenantPublicProcedure
    .input(
      z.object({
        slug: z.string(), // обязательный для middleware
        // можно добавлять свои поля — Zod-парсинг произойдёт в процедуре
      }),
    )
    .query(async ({ ctx }) => {
      return ctx.db.query.products.findMany({
        where: and(
          eq(products.organizationId, ctx.organizationId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
        columns: {
          id: true,
          name: true,
          vol: true,
          sellingPrice: true,
          categoryId: true,
        },
        // Намеренно не возвращаем cost, supplierId, etc.
      });
    }),
});
```

### 19.2 Пагинация — обязательный контракт

**Проблема.** `products.list` в SPEC 7.3 без limit. DoD требует <2s для 1000 товаров — без пагинации недостижимо (особенно с computed `sparkline`).

**Стандарт для всех list-процедур:**

```typescript
// src/server/api/lib/pagination.ts
import { z } from 'zod';

export const paginationInput = z.object({
  cursor: z.string().optional(),           // opaque — обычно id последней записи
  limit: z.number().int().min(1).max(200).default(50),
});

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

// Применение:
products.list:
  .input(paginationInput.extend({
    q: z.string().optional(),
    group: z.enum(['drinks', 'snacks']).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const items = await ctx.db.query.products.findMany({
      where: and(
        eq(products.organizationId, ctx.organizationId),
        isNull(products.deletedAt),
        input.cursor ? gt(products.id, input.cursor) : undefined,
        input.q ? ilike(products.name, `%${input.q}%`) : undefined,
      ),
      orderBy: [asc(products.id)],
      limit: input.limit + 1, // +1 чтобы определить "есть ли ещё"
    });
    const hasMore = items.length > input.limit;
    const returned = hasMore ? items.slice(0, input.limit) : items;
    return {
      items: returned,
      nextCursor: hasMore ? returned[returned.length - 1].id : null,
    };
  });
```

Sparkline для карточки — **только на detail-page**, не в list'е. На list — либо агрегировать в SQL (`SUM(qty) GROUP BY date_trunc('day', at)`), либо вообще убрать.

### 19.3 ZIP structure — плоская, без вложенного tar.gz

README говорит что CSV и VendHub .md — "в этом handoff пакете". Но ZIP содержит их **только внутри** вложенного tar.gz.

**Исправление handoff архива:**

```
olma-handoff.zip
├── README.md
├── OLMA_PLATFORM_SPEC.md
├── OLMA_PLATFORM_PATCHES.md          (v1.1)
├── OLMA_PLATFORM_PATCHES_v1.2.md     (этот файл)
├── olma.html
├── Product_name2026-4-21_15_34_44.csv
└── VendHub_Resale_Module_Prompt.md
```

Без вложенного tar.gz. Всё на одном уровне.

### 19.4 Stage 0 — корректные зависимости

Добавить в `pnpm add` из SPEC 11:

```bash
pnpm add superjson               # tRPC v11 transformer — БЕЗ ЭТОГО НЕ СОБЕРЁТСЯ
pnpm add postgres                # postgres.js — предпочтителен в serverless
# Убрать: pnpm add pg (лишний, используем postgres.js)
# Убрать: @types/pg (не нужен)
```

Обоснование `postgres.js` вместо `pg`:

- Serverless-friendly (connection pooling embedded)
- Нативная поддержка prepared statements и batch queries
- Drizzle рекомендует для Supabase (`drizzle-orm/postgres-js`)

Client setup:

```typescript
// src/server/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 10, // пул на serverless
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // обязательно для Supabase pooler
});

export const db = drizzle(queryClient, { schema });
```

### 19.5 Migration скрипт из localStorage прототипа

Jamshid может иметь реальные данные в localStorage `olma:v1`. Добавить экспорт из прототипа и импорт в приложение.

**Экспорт (вставить в olma.html как кнопку в settings):**

```javascript
function exportBackup() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `olma-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Импорт (в production-приложении):**

```typescript
// src/server/api/routers/migration.ts
export const migrationRouter = createTRPCRouter({
  importLegacyBackup: ownerProcedure
    .input(z.object({ backupJson: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = z
        .object({
          products: z.record(z.any()),
          suppliers: z.record(z.any()),
          movements: z.array(z.any()),
          purchases: z.array(z.any()),
          priceHistory: z.array(z.any()),
          salesImports: z.array(z.any()),
          salesTxnHashes: z.record(z.any()).optional(),
          salesAggregated: z.record(z.any()).optional(),
          balances: z.record(z.any()),
        })
        .parse(JSON.parse(input.backupJson));

      // Маппинг ключей прототипа (coca_025) → UUID в новой БД:
      // 1. По имени+vol находим продукт в каталоге, строим legacyKey → uuid
      // 2. То же для suppliers (по name)
      // 3. Импортируем movements, подставляя uuid'ы
      // 4. salesTxnHashes и salesAggregated — напрямую (это уже по хэшу)

      // Подробная реализация — ~150 строк, выделить в отдельную функцию.
      // Ключевое: сохранить дедупликацию салес-импортов и текущие остатки.

      return {
        status: "imported",
        counts: {
          /*...*/
        },
      };
    }),
});
```

---

## Обновлённый Definition of Done (заменяет Patch 10)

К DoD из SPEC §12 + Patch 10 добавить:

16. ✅ Импорт продаж на 500 строк проходит за <3с (batched lookup работает)
17. ✅ Parse-сессия выживает между `uploadAndParse` и `confirmMapping` на Vercel (не localhost)
18. ✅ Custom Access Token Hook выдаёт JWT с `org_id` и `role` (проверить через Auth → Users → Copy JWT → jwt.io)
19. ✅ RLS-политики используют `current_org_id()` helper, не прямой `auth.jwt() ->>`
20. ✅ Seed создаёт 40 products, 21 supplier, 2 machines с **рабочими** layout'ами из прототипа
21. ✅ tenantPublicProcedure возвращает `NOT_FOUND` и для несуществующего slug, и для выключенного tenantPublicEnabled (проверить через curl)
22. ✅ Все list-запросы имеют cursor pagination + `isNull(deletedAt)` фильтр
23. ✅ Экспорт бэкапа из прототипа + импорт в приложение работает на реальных данных Jamshid'а

---

## Финальный чек-лист Claude Code (обновлённый)

Перед стартом работы убедиться что:

- [ ] Прочитал SPEC v1.0, PATCHES v1.1, PATCHES v1.2 **в этом порядке**
- [ ] В случае противоречий: **v1.2 > v1.1 > v1.0**
- [ ] Создал Supabase projects (prod + staging)
- [ ] В Supabase dashboard:
  - [ ] Включил Custom Access Token Hook (Patch 4 + 13.2 GRANTs)
  - [ ] Создал bucket `parse-sessions` с RLS service-only (Patch 12)
  - [ ] Создал bucket'ы `sales-imports`, `purchase-invoices`, `backups`
  - [ ] Включил pg_cron extension для cleanup job'а
- [ ] Установил `postgres` (не `pg`), добавил `superjson`
- [ ] Проверил JWT приходит с `org_id` через jwt.io
- [ ] Тест SQL синтаксиса: `SELECT (auth.jwt() ->> 'org_id')::uuid` не бросает ошибку
- [ ] Настроил Vercel Cron для cleanup (если не используется pg_cron)

---

## Что осталось в известных ограничениях (OK для MVP)

- Timezone handling — только Asia/Tashkent, мультитенантность по TZ пока не нужна
- RLS применяется только к client-side (supabase-js, storage) — в tRPC защита через middleware
- Parse-сессии через Storage — медленнее чем Redis, но достаточно для текущих объёмов
- Pg_cron cleanup раз в час — normally достаточно, sessions expire через 30 минут
- localStorage → DB миграция выполняется разово вручную, не через UI

Если какое-то из этого станет bottleneck'ом — отдельный патч v1.3.

---

**КОНЕЦ ПАТЧЕЙ v1.2**
