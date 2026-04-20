# Sprint E Phase 3 — Predictive Refill Completion + UX Upgrade

**Date:** 2026-04-20
**Status:** Approved
**Estimate:** 1.5 days, 6 commits
**Closes:** GitHub Issue #18

---

## Summary

Close the remaining 15% of Sprint E Phase 3: fix the hardcoded priority formula to use real per-machine margins, wire PREDICTED_STOCKOUT alerts with 24h suppression, add bulk "Add to Route" workflow, upgrade detail page chart to line chart with projection, add manual trigger endpoint, and write critical-path tests.

## Business Context

VendHub operates snack and drink vending machines (not coffee). Products are purchased wholesale and resold with markup. Each machine can set its own selling price per slot, so the same product may have different margins across machines. The priority formula must reflect this: a high-margin machine running low is more urgent to refill than a low-margin one.

---

## Section 1 — Backend

### 1a. Margin-Based Priority Formula

**File:** `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`

**Current (broken):**

```typescript
const revenueImpact = Math.log10(1 + forecast.dailyRate * 20000); // hardcoded
```

**New:**

```typescript
const sellingPrice = slot.price ?? product.sellingPrice;
const costPrice = slot.costPrice ?? product.purchasePrice;
const margin = Number(sellingPrice) - Number(costPrice);
const dailyProfit = margin * forecast.dailyRate;
const urgency = Math.min(
  10,
  forecast.daysOfSupply > 0 ? 1 / forecast.daysOfSupply : 10,
);
const priorityScore = urgency * Math.log10(1 + dailyProfit);
```

**Data loading changes:**

- `generateForOrganization()` must join `MachineSlot` with `price`, `costPrice` fields
- Join `Product` for fallback `sellingPrice`/`purchasePrice` when slot overrides are null
- Both fields exist in entities, just not currently queried

### 1b. Alert Wiring

**File:** `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`

The alert system is **rule-based**. `AlertsService.triggerAlert()` requires an existing `AlertRule` with built-in cooldown suppression (`cooldownMinutes` field). No custom `lastAlertedAt` column needed.

**Method signature (verified):**

```typescript
alertsService.triggerAlert(
  organizationId: string,
  ruleId: string,
  machineId: string | null,
  value: number,        // priorityScore
  message?: string,     // human-readable description
): Promise<AlertHistory>
```

**Implementation:**

After generating recommendations in `generateForOrganization()`:

1. Find the org's PREDICTED_STOCKOUT alert rule:
   ```typescript
   const rule = await this.alertRuleRepo.findOne({
     where: {
       organizationId,
       metric: AlertMetric.PREDICTED_STOCKOUT,
       isActive: true,
     },
   });
   if (!rule) return; // org hasn't enabled predictive alerts
   ```
2. Filter results where `recommendedAction === REFILL_NOW`
3. For each urgent recommendation, call:
   ```typescript
   await this.alertsService.triggerAlert(
     organizationId,
     rule.id,
     rec.machineId,
     rec.priorityScore,
     `${productName} в ${machineName}: ${rec.daysOfSupply} дн. запаса (маржа ${margin} UZS/шт)`,
   );
   ```
4. The alert system's built-in `cooldownMinutes` handles suppression (set to 1440 = 24h in seed)

**Dependency:** Inject `AlertsService` + `Repository<AlertRule>` into `RecommendationService`.

**Seed rule in migration** (per-org, or create on first cron run for each org):

```typescript
{
  name: 'Прогноз дефицита',
  description: 'Предупреждение о скором окончании товара на основе EWMA прогноза',
  metric: AlertMetric.PREDICTED_STOCKOUT,
  condition: AlertCondition.LESS_THAN,
  threshold: 2, // daysOfSupply < 2
  severity: AlertSeverity.CRITICAL,
  machineId: null, // all machines
  notifyChannels: ['in_app', 'telegram'],
  cooldownMinutes: 1440, // 24h suppression per machine
  isActive: true,
}
```

### 1c. Manual Trigger Endpoint

**File:** `apps/api/src/modules/predictive-refill/controllers/predictive-refill.controller.ts`

```typescript
@Post('trigger-refresh')
@Roles('owner', 'admin')
@ApiOperation({ summary: 'Manually trigger predictive refill recalculation' })
async triggerRefresh(): Promise<{ message: string; jobId: string }> {
  const job = await this.queue.add('recalc-all', {});
  return { message: 'Refresh enqueued', jobId: job.id };
}
```

**File:** `apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts` (NEW)

```typescript
@Processor("predictive-refill")
export class DailyForecastProcessor {
  @Process("recalc-all")
  async handleRecalcAll(job: Job) {
    const orgs = await this.orgRepo.find({ where: { isActive: true } });
    for (const org of orgs) {
      try {
        await this.consumptionRateService.refreshForOrg(org.id, 14);
        await this.recommendationService.generateForOrganization(org.id);
      } catch (err) {
        this.logger.error(`Org ${org.id} failed`, err);
      }
    }
  }
}
```

Register processor in `predictive-refill.module.ts` providers.

### 1d. Migration

**File:** `apps/api/src/database/migrations/1776100000000-SeedPredictiveStockoutAlertRule.ts`

For each active organization, seed a default PREDICTED_STOCKOUT alert rule:

```sql
INSERT INTO alert_rules (id, organization_id, name, description, metric, condition, threshold, severity, machine_id, notify_channels, notify_user_ids, cooldown_minutes, is_active, metadata)
SELECT
  gen_random_uuid(),
  o.id,
  'Прогноз дефицита',
  'Предупреждение о скором окончании товара на основе EWMA прогноза',
  'predicted_stockout',
  'less_than',
  2,
  'critical',
  NULL,
  '["in_app", "telegram"]'::jsonb,
  '[]'::jsonb,
  1440,
  true,
  '{}'::jsonb
FROM organizations o
WHERE o.deleted_at IS NULL;
```

No `lastAlertedAt` column needed — alert cooldown is handled by the alert system's built-in `cooldownMinutes` per rule+machine combination.

---

## Section 2 — Frontend

### 2a. List Page — Bulk Select + Add to Route

**File:** `apps/web/src/app/dashboard/predictive-refill/page.tsx`

Changes:

- Add checkbox column as first column in recommendations table
- Track `selectedIds: Set<string>` state (recommendation IDs or machineIds)
- Add toolbar row between tabs and table:
  - Left: `"${selectedIds.size} выбрано"` (when > 0)
  - Right: `<Button disabled={selectedIds.size === 0}>Добавить в маршрут</Button>`
- "Select all" checkbox in header (selects visible/filtered rows only)

**Add to Route handler:**

```typescript
async function handleAddToRoute() {
  const stops = Array.from(selectedMachineIds).map((machineId, i) => ({
    machineId,
    sortOrder: i + 1,
  }));
  const { data } = await api.post("/routes", {
    status: "draft",
    name: `Дозаправка ${format(new Date(), "yyyy-MM-dd")}`,
    stops,
  });
  router.push(`/dashboard/routes/${data.id}`);
}
```

### 2b. Detail Page — Line Chart with Projection

**File:** `apps/web/src/app/dashboard/predictive-refill/[machineId]/page.tsx`

Replace BarChart with LineChart (Recharts):

- **X-axis:** dates, last 14 days + 7 days forward
- **Y-axis:** stock level (units)
- **Series 1 (historical):** solid blue line — actual daily stock levels (from slot transaction history)
- **Series 2 (projection):** dashed orange line — EWMA-extrapolated depletion starting from today's currentQuantity
- **Reference line:** horizontal red dashed at y=0 (stockout threshold)
- **Reference line:** vertical gray dashed at today's date
- **Microcopy:** `<p className="text-sm text-muted-foreground italic mt-2">Прогноз, не гарантия</p>`

**Data source for projection:**

- Start: `currentQuantity` (today)
- Slope: `-dailyRate` per day (from recommendation data)
- End: day when stock hits 0, or day +7, whichever comes first

**Data source for historical:**

- Calculate backwards from `currentQuantity + (dailyRate × daysAgo)` for each of the last 14 days
- This is an approximation (assumes constant rate), but matches the EWMA model and avoids a new API endpoint
- Data is computed client-side from the recommendation's `currentStock` + `dailyRate` — no backend change needed

### 2c. KPI Card Enhancement

**File:** `apps/web/src/app/dashboard/predictive-refill/page.tsx`

Third KPI card ("Автоматов затронуто") — add subtitle:

```typescript
<p className="text-xs text-muted-foreground">
  {formatUZS(totalDailyProfitAtRisk)} UZS/день под угрозой
</p>
```

Where `totalDailyProfitAtRisk` = sum of `dailyProfit` for all REFILL_NOW recommendations. Requires the API to return margin/profit data in the recommendations response.

### 2d. API Response Enhancement

**File:** `apps/api/src/modules/predictive-refill/dto/recommendation-response.dto.ts` (or equivalent response DTO)

Add fields to the recommendation response:

```typescript
@ApiProperty({ description: 'Selling price per unit in this machine' })
sellingPrice: number;

@ApiProperty({ description: 'Cost/purchase price per unit' })
costPrice: number;

@ApiProperty({ description: 'Margin per unit (selling - cost)' })
margin: number;

@ApiProperty({ description: 'Daily profit at risk (margin × dailyRate)' })
dailyProfit: number;
```

These are computed during `generateForOrganization()` and persisted to the `RefillRecommendation` entity (add 4 decimal columns to entity + migration) so the frontend can display profit-at-risk without recalculating.

**Entity addition** (`refill-recommendation.entity.ts`):

```typescript
@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
sellingPrice: number;

@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
costPrice: number;

@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
margin: number;

@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
dailyProfit: number;
```

**Migration** (combine with alert rule seed migration):

```sql
ALTER TABLE refill_recommendations
  ADD COLUMN selling_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN margin DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN daily_profit DECIMAL(12,2) DEFAULT 0;
```

---

## Section 3 — Tests

### 3a. Backend: Cron Resilience

**File:** `apps/api/src/modules/predictive-refill/services/predictive-refill-cron.service.spec.ts`

- Mock `orgRepo.find()` → 3 orgs
- Mock `consumptionRateService.refreshForOrg()` → org 2 throws
- Assert: all 3 orgs attempted
- Assert: error logged for org 2
- Assert: `generateForOrganization()` called for all 3 (including after failure)
- Assert: no unhandled exception propagates

### 3b. Backend: Priority Formula + Alert Suppression

**File:** `apps/api/src/modules/predictive-refill/services/recommendation.service.spec.ts`

Priority formula:

- Given: margin=5000, dailyRate=3, daysOfSupply=1.5 → assert priorityScore ≈ 6.67 × log10(15001) ≈ 27.8
- Given: margin=1000, dailyRate=1, daysOfSupply=10 → assert priorityScore ≈ 0.1 × log10(1001) ≈ 0.3
- Given: margin=0 (no cost price set), dailyRate=5, daysOfSupply=0.5 → assert priorityScore handles zero margin gracefully

Alert integration:

- Given: PREDICTED_STOCKOUT rule exists + REFILL_NOW rec → assert `triggerAlert()` called
- Given: no PREDICTED_STOCKOUT rule for org → assert no alert fired (graceful skip)
- Given: rule.isActive = false → assert no alert fired
- Suppression is handled by AlertsService internally (tested in alerts module) — no need to retest here

### 3c. E2E: Full User Flow

**File:** `apps/web/e2e/predictive-refill.spec.ts`

Prerequisites: seeded org with 2 machines, 3 slots each, varying stock levels, prices set.

Steps:

1. Login as manager
2. Navigate to `/dashboard/predictive-refill`
3. Assert: table renders with recommendations, sorted by priorityScore DESC
4. Assert: KPI cards show correct counts
5. Click first machine row → assert redirect to `/dashboard/predictive-refill/[machineId]`
6. Assert: line chart renders (canvas/svg present)
7. Assert: slot table shows product names, stock, capacity
8. Navigate back to list
9. Check 2 recommendation rows (checkboxes)
10. Click "Добавить в маршрут"
11. Assert: redirected to `/dashboard/routes/[uuid]`
12. Assert: new route has status "draft" and 2 stops

---

## Section 4 — Documentation Updates

### Feature doc update (`docs/features/predictive-refill.md`)

Add:

- Margin-based priority formula (replace generic description)
- Alert behavior: REFILL_NOW triggers PREDICTED_STOCKOUT, P1/P2 severity, 24h suppression
- Manual trigger: `POST /predictive-refill/trigger-refresh` (owner/admin)
- Per-machine pricing: slot.price overrides product.sellingPrice

### Runbook update (`docs/runbooks/predictive-refill-troubleshooting.md`)

Add:

- "Alert not firing" → check `lastAlertedAt` column, check alerts service enabled, check org has alert channels configured
- "Wrong priority ordering" → verify slot prices are set (null price = product base price fallback)
- "Manual refresh" → `POST /predictive-refill/trigger-refresh` with auth token

---

## Section 5 — Commit Plan

```
1. fix(api): margin-based priority formula — load real prices from MachineSlot/Product
2. feat(api): PREDICTED_STOCKOUT alerts + 24h suppression + lastAlertedAt migration
3. feat(api): POST /trigger-refresh endpoint + BullMQ processor
4. feat(web): bulk-select + Add to Route button + draft route creation
5. feat(web): detail page line chart — projection + stockout + microcopy
6. test: cron resilience + priority formula + alert suppression + E2E flow
```

---

## Out of Scope (Sprint F+)

- Sparklines in table rows (needs historical rate series endpoint)
- ML seasonal/holiday models
- Route auto-optimization from recommendations
- i18n extraction (EN/UZ locales)
- Component extraction into separate files (YAGNI — inline is fine)
- Multi-product bundle refill logic
- A/B testing forecast variants

---

## Acceptance Criteria

- [ ] `pnpm --filter @vendhub/api type-check` — 0 errors
- [ ] `pnpm --filter @vendhub/web type-check` — 0 errors
- [ ] Priority formula uses real margin from MachineSlot.price/costPrice
- [ ] REFILL_NOW recommendations fire PREDICTED_STOCKOUT alert (verify in test)
- [ ] Alert suppression: same (machine) not re-alerted within 24h (via AlertRule.cooldownMinutes=1440)
- [ ] Manual trigger endpoint returns jobId, processor executes
- [ ] Bulk select → "Добавить в маршрут" → creates draft route with stops
- [ ] Detail page shows line chart with projection line + "Прогноз, не гарантия"
- [ ] Cron unit test: one-org-failure doesn't block others
- [ ] E2E: list → detail → add to route → route has stops
- [ ] RBAC canary: 0 violations
- [ ] Org isolation: org A user sees only org A recommendations
