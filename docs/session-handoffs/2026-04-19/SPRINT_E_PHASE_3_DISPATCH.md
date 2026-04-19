# Sprint E Phase 3 — Frontend + Cron

**Status:** Phase 1+2 landed (fe4a9f4, 81828e0). Backend engine live, API endpoints
operational, RBAC green, tenant isolation verified.
**Goal:** Ship the user-visible half + make backend self-running.

**Estimate:** 2 days. Budget: 6–8 commits.

---

## Execution order

Three blocks, run in sequence. **Do not skip the UX spec step** — that's the
ordering playbook for every VendHub screen.

```
Block A — Cron job         (0.5 day, isolated, low risk)  ← warm-up
Block B — UX spec          (0.25 day, no code)
Block C — Frontend         (1.25 day, the main event)
```

---

## Block A — Nightly cron processor

Before frontend so recommendations refresh on their own, not just on
API hit.

### File: `apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts`

```typescript
import { Process, Processor } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { ConsumptionRateService } from "../services/consumption-rate.service";
import { RecommendationService } from "../services/recommendation.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { Repository } from "typeorm";

@Processor("predictive-refill")
export class DailyForecastProcessor {
  private readonly logger = new Logger(DailyForecastProcessor.name);

  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    private consumptionRates: ConsumptionRateService,
    private recommendations: RecommendationService,
  ) {}

  @Process("recalc-all")
  async handleRecalcAll(job: Job) {
    const orgs = await this.orgRepo.find({ where: { isActive: true } });
    this.logger.log(`Recalc starting for ${orgs.length} orgs`);

    for (const org of orgs) {
      try {
        await this.consumptionRates.refreshForOrg(org.id, 14);
        await this.recommendations.refreshAll(org.id);
      } catch (err) {
        this.logger.error(`Org ${org.id} failed`, err);
        // continue — one bad org shouldn't block others
      }
    }

    this.logger.log("Recalc complete");
  }
}
```

### Scheduler

Use existing scheduler pattern — look at `apps/api/src/modules/queues/` or
wherever `fiscal` / `machine-writeoff` queues are enqueued. Likely:

- NestJS `@Cron('0 2 * * *')` decorator on a service method that calls `queue.add('recalc-all', {})`
- Or a BullMQ repeatable job registered at module bootstrap

**Match existing pattern. Don't invent a new one.**

Command for terminal to find the pattern:

```bash
rg "@Cron\(" apps/api/src --type ts
rg "\.add\(" apps/api/src/modules/queues --type ts
```

### Service additions

Add to `ConsumptionRateService`:

```typescript
async refreshForOrg(organizationId: string, periodDays = 14) {
  // SELECT DISTINCT (machineId, productId) FROM transaction_items active in last periodDays
  // for each pair → calculateRate()
}
```

Add to `RecommendationService`:

```typescript
async refreshAll(organizationId: string) {
  // for each machine in org → refreshForMachine()
  // → alert wiring hook (see Block C)
}
```

### Tests

- Unit: `processor.spec.ts` with mocked services, assert all orgs iterated, one-failure-doesn't-block
- Integration: enqueue `recalc-all`, assert recommendations row created for seeded data

### Commit

```
predictive-refill: nightly cron processor + refresh-all methods
```

---

## Block B — UX specification

**Invoke `vhm24-ux-spec` skill before any component code.**

Inputs the skill needs:

1. What screens — `/dashboard/predictive-refill` (list) + `/dashboard/predictive-refill/[machineId]` (detail)
2. What data — API shape from Phase 2 endpoints (copy from `recommendation-response.dto.ts`)
3. Reference screens — look at `/dashboard/machines` and `/dashboard/routes` as style anchors
4. User personas — operations manager (triage AM), field technician (plans route)

Outputs expected:

- Page layouts (list + detail)
- Component inventory with props
- Empty states (org with no recommendations = healthy, not a bug)
- Loading skeletons
- Error states
- i18n keys for all strings (RU primary, EN secondary per vhm24-i18n)

Gate before Block C: spec reviewed, no open "unknown" items.

### Command for terminal

```
use vhm24-ux-spec skill for /dashboard/predictive-refill + detail page
```

No commit at this step — spec is artifact in session memory.

---

## Block C — Frontend implementation

### Pre-check: chart library

```bash
rg "recharts|@nivo|chart\.js" apps/web/package.json
rg "from 'recharts'" apps/web/src --type ts -l | head -5
```

If `recharts` already used → continue with it (dispatch assumed this).
If not → use whatever is already installed. Don't add a new dep.

### Routes

```
apps/web/src/app/dashboard/predictive-refill/
├── page.tsx                    ← list view
├── [machineId]/
│   └── page.tsx                ← detail drill-down
├── loading.tsx                 ← skeleton
└── components/
    ├── ForecastChart.tsx
    ├── RecommendationTable.tsx
    ├── MachineRiskCard.tsx
    ├── RefillPriorityBadge.tsx
    └── AddToRouteButton.tsx
```

### Sidebar

Add entry to `apps/web/src/components/layout/sidebar.tsx`:

```typescript
{ label: 'Predictive Refill', href: '/dashboard/predictive-refill', icon: TrendingDown }
```

Place it between `/dashboard/machines` and `/dashboard/routes` — ops flow reads:
machines → refill plan → route.

### Component specs

**RefillPriorityBadge** — thin wrapper on existing `<Badge>` component:

- `REFILL_NOW` → destructive variant, "Срочно" text
- `REFILL_SOON` → warning variant, "Скоро" text
- `MONITOR` → secondary variant, "Наблюдение" text

**MachineRiskCard** — summary tile:

- Count of REFILL_NOW + REFILL_SOON slots
- Top-priority machine name + days of supply
- Click → navigate to `[machineId]`

**RecommendationTable** — shadcn `DataTable`:

- Columns: priority badge, machine, product, current/capacity, days of supply, priority score, action button
- Sort by priorityScore DESC default
- Filter by action (REFILL_NOW / REFILL_SOON / MONITOR / all)
- Row click → navigate to `[machineId]`

**ForecastChart** — recharts LineChart:

- X axis: last 14 days + next 7 (projection)
- Y axis: stock level
- Historical line solid, projection line dashed
- Horizontal reference line at stockout level (0)
- Vertical "today" marker

**AddToRouteButton** — integrates with existing routes module:

- POST to `/routes/add-stops` (check actual endpoint name — may be different)
- Accepts array of `machineId`
- Success toast → navigate to `/dashboard/routes`
- Bulk mode: table selection checkboxes enable this button

### Data fetching

Match existing dashboard pattern. Likely:

- `@tanstack/react-query` with typed fetchers
- Or tRPC if the web app uses it (check `apps/web/src/lib/` or `trpc/`)

Command:

```bash
rg "from '@tanstack/react-query'" apps/web/src --type tsx -l | head -3
rg "trpc\." apps/web/src --type tsx -l | head -3
```

Whatever the existing pattern is — follow it. Don't mix.

### Alert wiring (folds in from Phase 4)

In `RecommendationService.refreshAll()`, after writing recommendations:

```typescript
for (const rec of urgentOnes) {
  await this.alertsService.fireIfNotSuppressed({
    organizationId: rec.organizationId,
    metric: AlertMetric.PREDICTED_STOCKOUT,
    severity: rec.isHighRevenue ? "P1" : "P2",
    context: { machineId, productId, daysOfSupply, priorityScore },
  });
}
```

Check alerts module for actual API shape — method name might be `trigger` or `evaluate` not `fireIfNotSuppressed`. Match what exists.

### Tests

- Component: `RecommendationTable.test.tsx` — sort, filter, empty state
- Component: `ForecastChart.test.tsx` — snapshot + critical props
- E2E: playwright spec `predictive-refill.spec.ts` — list → detail → add to route
- RBAC canary: still 0 (no new backend endpoints this block)

### Commits

```
predictive-refill: sidebar entry + route scaffolding
predictive-refill: RecommendationTable + MachineRiskCard
predictive-refill: ForecastChart + detail page
predictive-refill: AddToRouteButton + routes integration
predictive-refill: E2E tests + i18n strings
predictive-refill: PREDICTED_STOCKOUT alert wiring
```

---

## Verification checklist

Before final push:

- [ ] `pnpm --filter @vendhub/api type-check` — 0 errors
- [ ] `pnpm --filter @vendhub/web type-check` — 0 errors
- [ ] `pnpm test --filter @vendhub/api predictive-refill` — all green
- [ ] `pnpm test --filter @vendhub/web predictive-refill` — all green
- [ ] RBAC canary — 0
- [ ] Spot check: log in as org A → see only A's recommendations (not B's)
- [ ] Manually enqueue `recalc-all` → recommendations table populated
- [ ] Trigger stockout condition → alert fires through existing channels
- [ ] E2E: list → detail → add to route → route shows the stops

---

## Documentation (close out Phase 4)

Create these to officially close Sprint E:

### `docs/features/predictive-refill.md`

- What it does, who it's for
- How EWMA works (link to rate service)
- Priority formula explained
- How recommendations refresh (cron + manual)
- How alerts fire

### `docs/runbooks/predictive-refill-troubleshooting.md`

- Symptom: no recommendations showing → check cron ran, check org has transactions
- Symptom: stale daysOfSupply → check MachineSlot.currentQuantity telemetry
- Symptom: alert spam → tune threshold env var, check suppression window
- How to manually trigger refresh (queue.add('recalc-all'))
- Where to find logs (service + job names)

### Commit

```
docs: predictive-refill feature + runbook (Sprint E close)
```

---

## Sprint E close criteria

- ✅ Backend engine (Phase 1+2) — done
- ⬜ Nightly cron refresh — Block A
- ⬜ Dashboard live + drill-down — Block C
- ⬜ Route integration working end-to-end — Block C
- ⬜ PREDICTED_STOCKOUT alerts firing — Block C
- ⬜ Docs + runbook — final commit
- ⬜ E2E green — final commit

Target: Sprint E closes around commit 42–44.

---

## Risks to watch

1. **MachineSlot.currentQuantity freshness** — if telemetry is stale, daysOfSupply
   lies. Document the dependency in runbook; do NOT try to fix telemetry in this sprint.
2. **First cron run will be slow** — iterating every (machine, product) across all
   orgs. Consider adding a `where: isActive` filter or batching. Measure on staging
   before calling done.
3. **Chart projection line confusion** — if users think dashed line is a promise,
   they'll be angry when actuals diverge. Spec should include "Прогноз, не гарантия"
   microcopy near the chart.
4. **Alert fatigue** — 100 machines × 20 products = 2000 potential alerts. Ensure
   suppression window is tight (e.g. 1 alert per (machine, product) per 24h) and
   REFILL_NOW threshold tuned — better to under-alert and let ops manually check
   than spam.
