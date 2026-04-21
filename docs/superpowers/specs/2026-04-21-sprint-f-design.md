# Sprint F — Route Auto-Optimization + Sparklines + Quantity Sync

**Date:** 2026-04-21
**Status:** Approved
**Estimate:** 2 days, 6 commits
**Depends on:** Sprint E Phase 3 (complete)

---

## Summary

Three features that make predictive refill production-ready: keep stock quantities fresh via transaction events, auto-generate optimal refill routes, and add trend sparklines to the recommendations table.

## Business Context

VendHub has 23 snack/drink machines. Operators do morning triage via the predictive refill dashboard, then build routes. Currently, `MachineSlot.currentQuantity` only updates on manual entry — predictions degrade over time. Route building is manual. Trend data is invisible.

Sprint F closes these three gaps so the predictive refill system works end-to-end without manual data entry.

---

## Section 1 — Transaction-Based Quantity Sync

### Problem

`MachineSlot.currentQuantity` is stale after initial import. Predictions depend on it.

### Solution

Event-driven updates:

- **Sale:** `@OnEvent('transaction.created')` → decrement `currentQuantity` by units sold
- **Refill:** When recommendation is marked as acted upon → reset `currentQuantity = capacity`

### Implementation

**File:** `apps/api/src/modules/predictive-refill/services/quantity-sync.service.ts` (NEW)

```typescript
@Injectable()
export class QuantitySyncService {
  @OnEvent("transaction.created")
  async handleSale(payload: {
    machineId: string;
    items: { productId: string; quantity: number }[];
  }) {
    for (const item of payload.items) {
      await this.slotRepo
        .createQueryBuilder()
        .update(MachineSlot)
        .set({
          currentQuantity: () =>
            `GREATEST(current_quantity - ${item.quantity}, 0)`,
        })
        .where("machineId = :machineId AND productId = :productId", {
          machineId: payload.machineId,
          productId: item.productId,
        })
        .execute();
    }
  }

  async resetOnRefill(machineId: string, productId: string) {
    await this.slotRepo
      .createQueryBuilder()
      .update(MachineSlot)
      .set({ currentQuantity: () => "capacity" })
      .where("machineId = :machineId AND productId = :productId", {
        machineId,
        productId,
      })
      .execute();
  }
}
```

**Event emission:** In `TransactionCreateService`, after saving the transaction, emit:

```typescript
this.eventEmitter.emit("transaction.created", {
  machineId: transaction.machineId,
  items: transaction.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  })),
});
```

**Refill hook:** In `RecommendationService.markActed()`, call `quantitySyncService.resetOnRefill()`.

**Guard:** `GREATEST(current_quantity - N, 0)` prevents negative stock at DB level.

**Migration:** None — uses existing `currentQuantity` column on `machine_slots`.

---

## Section 2 — Route Auto-Optimization

### Problem

Operators manually select machines for routes. With 23 machines and varying urgency, auto-generation saves 15-30 min daily.

### Solution

Nearest-neighbor heuristic starting from the highest-priority machine.

### Endpoint

```
POST /api/v1/routes/auto-generate
Body: {
  includeRefillSoon?: boolean;  // default false (REFILL_NOW only)
  operatorId?: string;          // optional, defaults to current user
}
Response: Route (DRAFT status, stops ordered)
Roles: owner, admin, manager
```

### Algorithm

**File:** `apps/api/src/modules/routes/services/route-optimizer.service.ts` (NEW)

```
1. Fetch all REFILL_NOW recommendations for org (+ REFILL_SOON if flag set)
2. Join with Machine to get latitude/longitude
3. Filter out machines without coordinates (skip, log warning)
4. Start from highest priorityScore machine
5. Greedy nearest-neighbor: repeatedly pick the closest unvisited machine (Haversine distance)
6. Create Route with status DRAFT, stops in visit order
7. Return the route
```

Haversine function already exists in `GpsProcessingService` (routes module) — reuse it.

### Frontend

**File:** `apps/web/src/app/dashboard/predictive-refill/page.tsx`

Add button in toolbar (next to "Добавить в маршрут"):

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleAutoRoute}
  disabled={autoRouteMutation.isPending}
>
  {autoRouteMutation.isPending ? "Генерация..." : "Авто-маршрут"}
</Button>
```

`handleAutoRoute` → `POST /routes/auto-generate` → redirect to `/dashboard/routes/${route.id}`.

No selection needed — uses all REFILL_NOW recs automatically.

---

## Section 3 — Sparklines in Recommendations Table

### Problem

Operators see static "daily rate" number but can't tell if depletion is accelerating.

### Solution

Add `recentRates: number[]` (last 7 days of daily consumption) to recommendation response. Render as tiny inline LineChart.

### Backend

**File:** `apps/api/src/modules/predictive-refill/services/consumption-rate.service.ts`

New method:

```typescript
async getRecentDailyRates(
  organizationId: string,
  machineId: string,
  productId: string,
  days = 7,
): Promise<number[]> {
  // Query transaction_items grouped by DATE(created_at), filtered by org+machine+product
  // Fill missing days with 0
  // Return array of 7 numbers (oldest first)
}
```

**Response DTO:** Add `recentRates: number[]` to recommendation response.

**Loading strategy:** Batch-load rates for all recommendations in a single query to avoid N+1. Group by (machineId, productId, date).

### Frontend

**File:** `apps/web/src/app/dashboard/predictive-refill/page.tsx`

New table column "Тренд" with inline Recharts:

```tsx
<ResponsiveContainer width={60} height={24}>
  <LineChart data={rec.recentRates.map((v, i) => ({ d: i, v }))}>
    <Line
      type="monotone"
      dataKey="v"
      stroke={isAccelerating ? "#ef4444" : "#22c55e"}
      strokeWidth={1.5}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

`isAccelerating = recentRates[6] > recentRates[0] * 1.2` (20% increase over the week).

---

## Section 4 — Tests

### Quantity Sync

- Sale event: slot with qty=10, sale of 3 → qty=7
- Sale exceeding stock: slot with qty=2, sale of 5 → qty=0 (not negative)
- Refill reset: slot with qty=3, capacity=20 → qty=20

### Route Auto-Generation

- 5 machines with known lat/lng: assert nearest-neighbor ordering matches expected sequence
- No machines with REFILL_NOW: returns error/empty
- Machines without coordinates: skipped, logged

### Sparklines

- API returns exactly 7 elements in `recentRates`
- Days with no transactions return 0
- Batch loading: N recommendations → 1 query (not N queries)

---

## Section 5 — Commit Plan

```
1. feat(api): transaction-based quantity sync — decrement on sale, reset on refill
2. feat(api): POST /routes/auto-generate — nearest-neighbor route optimization
3. feat(api): sparkline data — 7-day consumption rate history in recommendations
4. feat(web): "Авто-маршрут" button + sparkline column in recommendations table
5. test: quantity sync + route auto-generation + sparkline data tests
6. docs: Sprint F feature docs
```

---

## Out of Scope

- ML seasonal/holiday models (EWMA sufficient with 11 months data)
- Happy Workers Protocol (separate multi-sprint project)
- Design token integration into Tailwind (design system sprint)
- Figma sync
- A/B testing forecast variants

---

## Acceptance Criteria

- [ ] Sale transaction decrements slot quantity (verified by unit test)
- [ ] Refill action resets slot to capacity
- [ ] `POST /routes/auto-generate` returns DRAFT route with nearest-neighbor stop ordering
- [ ] "Авто-маршрут" button on predictive refill page, one-click route generation
- [ ] Sparkline column shows 7-day trend, red for accelerating depletion
- [ ] Type-check green on API and Web
- [ ] RBAC canary: 0 violations
- [ ] All new tests passing
