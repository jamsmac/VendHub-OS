# Sprint E Phase 3 — Predictive Refill Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Sprint E by shipping margin-based priority scoring, PREDICTED_STOCKOUT alerts, bulk Add-to-Route workflow, projection line chart, and critical-path tests.

**Architecture:** Fix the recommendation service priority formula to use real per-machine pricing from MachineSlot/Product entities. Wire alerts through the existing rule-based AlertsService. Add a BullMQ processor for manual trigger. Upgrade frontend with bulk-select and line chart.

**Tech Stack:** NestJS 11, TypeORM 0.3.20, BullMQ 5, PostgreSQL 16, Next.js 16, React 19, Recharts 2.15, @tanstack/react-query, shadcn/ui, Playwright

---

## File Map

### Backend (Create)

| File                                                                                     | Responsibility                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------- |
| `apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts`                | BullMQ processor for manual trigger   |
| `apps/api/src/database/migrations/1776100000000-PredictiveRefillPhase3.ts`               | Add pricing columns + seed alert rule |
| `apps/api/src/modules/predictive-refill/services/predictive-refill-cron.service.spec.ts` | Cron resilience test                  |
| `apps/api/src/modules/predictive-refill/services/recommendation.service.spec.ts`         | Priority formula + alert test         |

### Backend (Modify)

| File                                                                                 | Change                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| `apps/api/src/modules/predictive-refill/entities/refill-recommendation.entity.ts`    | Add 4 pricing columns                      |
| `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`          | Margin-based formula + alert wiring        |
| `apps/api/src/modules/predictive-refill/services/forecast.service.ts`                | Return slot pricing in SlotForecast        |
| `apps/api/src/modules/predictive-refill/controllers/predictive-refill.controller.ts` | Add trigger-refresh endpoint               |
| `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`                 | Register processor + AlertsService imports |

### Frontend (Modify)

| File                                                                | Change                                          |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| `apps/web/src/app/dashboard/predictive-refill/page.tsx`             | Bulk select + Add to Route + profit-at-risk KPI |
| `apps/web/src/app/dashboard/predictive-refill/[machineId]/page.tsx` | Line chart with projection                      |

### Frontend (Create)

| File                                     | Responsibility                         |
| ---------------------------------------- | -------------------------------------- |
| `apps/web/e2e/predictive-refill.spec.ts` | E2E test: list → detail → add to route |

---

## Task 1: Migration — Add pricing columns + seed alert rule

**Files:**

- Create: `apps/api/src/database/migrations/1776100000000-PredictiveRefillPhase3.ts`
- Modify: `apps/api/src/modules/predictive-refill/entities/refill-recommendation.entity.ts`

- [ ] **Step 1: Add pricing columns to entity**

In `apps/api/src/modules/predictive-refill/entities/refill-recommendation.entity.ts`, add after the `priorityScore` column (line 50):

```typescript
@Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
sellingPrice: number;

@Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
costPrice: number;

@Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
margin: number;

@Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
dailyProfit: number;
```

- [ ] **Step 2: Create the migration file**

Create `apps/api/src/database/migrations/1776100000000-PredictiveRefillPhase3.ts`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class PredictiveRefillPhase31776100000000 implements MigrationInterface {
  name = "PredictiveRefillPhase31776100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pricing columns to refill_recommendations
    await queryRunner.query(`
      ALTER TABLE refill_recommendations
        ADD COLUMN selling_price DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN margin DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN daily_profit DECIMAL(12,2) DEFAULT 0
    `);

    // Seed PREDICTED_STOCKOUT alert rule for each active org
    await queryRunner.query(`
      INSERT INTO alert_rules (
        id, organization_id, name, description, metric, condition,
        threshold, severity, machine_id, notify_channels, notify_user_ids,
        cooldown_minutes, is_active, metadata, created_at, updated_at
      )
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
        '{}'::jsonb,
        NOW(),
        NOW()
      FROM organizations o
      WHERE o.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM alert_rules WHERE metric = 'predicted_stockout'
    `);
    await queryRunner.query(`
      ALTER TABLE refill_recommendations
        DROP COLUMN selling_price,
        DROP COLUMN cost_price,
        DROP COLUMN margin,
        DROP COLUMN daily_profit
    `);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/api exec tsc --noEmit --pretty`
Expected: 0 errors (or only pre-existing issues from #17)

- [ ] **Step 4: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/api/src/modules/predictive-refill/entities/refill-recommendation.entity.ts apps/api/src/database/migrations/1776100000000-PredictiveRefillPhase3.ts
git commit -m "feat(api): predictive refill Phase 3 migration — pricing columns + alert rule seed"
```

---

## Task 2: Margin-based priority formula

**Files:**

- Modify: `apps/api/src/modules/predictive-refill/services/forecast.service.ts`
- Modify: `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`
- Modify: `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`

- [ ] **Step 1: Extend SlotForecast interface with pricing**

In `apps/api/src/modules/predictive-refill/services/forecast.service.ts`, update the `SlotForecast` interface:

```typescript
export interface SlotForecast {
  machineId: string;
  productId: string;
  productName?: string;
  slotNumber?: string;
  currentStock: number;
  capacity: number;
  dailyRate: number;
  daysOfSupply: number;
  sellingPrice: number;
  costPrice: number;
}
```

- [ ] **Step 2: Load pricing data in ForecastService**

In `apps/api/src/modules/predictive-refill/services/forecast.service.ts`, add `Product` import and inject:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { MachineSlot } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import { ConsumptionRateService } from "./consumption-rate.service";
```

Update constructor:

```typescript
constructor(
  @InjectRepository(MachineSlot)
  private readonly slotRepo: Repository<MachineSlot>,
  @InjectRepository(Product)
  private readonly productRepo: Repository<Product>,
  private readonly consumptionRateService: ConsumptionRateService,
) {}
```

Update `forecastMachine` to load product prices and include in output:

```typescript
async forecastMachine(
  organizationId: string,
  machineId: string,
): Promise<SlotForecast[]> {
  const slots = await this.slotRepo.find({
    where: { machineId },
  });

  const rates = await this.consumptionRateService.getRatesForMachine(
    organizationId,
    machineId,
  );

  const rateMap = new Map<string, number>();
  for (const r of rates) {
    rateMap.set(r.productId, Number(r.ratePerDay));
  }

  // Load product base prices as fallback
  const productIds = slots
    .filter((s) => s.productId)
    .map((s) => s.productId);
  const products =
    productIds.length > 0
      ? await this.productRepo.find({
          where: { id: In(productIds) },
          select: ["id", "sellingPrice", "purchasePrice"],
        })
      : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  return slots
    .filter((s) => s.productId)
    .map((slot) => {
      const dailyRate = rateMap.get(slot.productId) ?? 0;
      const daysOfSupply =
        dailyRate > 0
          ? Math.min(this.MAX_DAYS, slot.currentQuantity / dailyRate)
          : this.MAX_DAYS;

      const product = productMap.get(slot.productId);
      const sellingPrice = Number(slot.price ?? product?.sellingPrice ?? 0);
      const costPrice = Number(
        slot.costPrice ?? product?.purchasePrice ?? 0,
      );

      return {
        machineId,
        productId: slot.productId,
        slotNumber: slot.slotNumber,
        currentStock: slot.currentQuantity,
        capacity: slot.capacity,
        dailyRate: Math.round(dailyRate * 10000) / 10000,
        daysOfSupply: Math.round(daysOfSupply * 100) / 100,
        sellingPrice,
        costPrice,
      };
    });
}
```

- [ ] **Step 3: Add Product to module imports**

In `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`, add Product import:

```typescript
import { Product } from "../products/entities/product.entity";
```

Add `Product` to the `TypeOrmModule.forFeature` array:

```typescript
TypeOrmModule.forFeature([
  ConsumptionRate,
  RefillRecommendation,
  Transaction,
  MachineSlot,
  Machine,
  Organization,
  Product,
]),
```

- [ ] **Step 4: Update priority formula in RecommendationService**

In `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`, replace the `upsertRecommendation` method (lines 98-149):

```typescript
private async upsertRecommendation(
  organizationId: string,
  forecast: SlotForecast,
): Promise<RefillRecommendation> {
  const margin = forecast.sellingPrice - forecast.costPrice;
  const dailyProfit = margin * forecast.dailyRate;
  const urgency = Math.min(
    10,
    forecast.daysOfSupply > 0 ? 1 / forecast.daysOfSupply : 10,
  );
  const priorityScore = urgency * Math.log10(1 + Math.max(0, dailyProfit));

  const action =
    forecast.daysOfSupply < 2
      ? RefillAction.REFILL_NOW
      : forecast.daysOfSupply < 5
        ? RefillAction.REFILL_SOON
        : RefillAction.MONITOR;

  const existing = await this.recRepo.findOne({
    where: {
      organizationId,
      machineId: forecast.machineId,
      productId: forecast.productId,
    },
  });

  const data = {
    currentStock: forecast.currentStock,
    capacity: forecast.capacity,
    dailyRate: forecast.dailyRate,
    daysOfSupply: forecast.daysOfSupply,
    priorityScore: Math.round(priorityScore * 10000) / 10000,
    recommendedAction: action,
    sellingPrice: forecast.sellingPrice,
    costPrice: forecast.costPrice,
    margin: Math.round(margin * 100) / 100,
    dailyProfit: Math.round(dailyProfit * 100) / 100,
    generatedAt: new Date(),
  };

  if (existing) {
    Object.assign(existing, data);
    return this.recRepo.save(existing);
  }

  return this.recRepo.save(
    this.recRepo.create({
      organizationId,
      machineId: forecast.machineId,
      productId: forecast.productId,
      ...data,
    }),
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/api exec tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/api/src/modules/predictive-refill/services/forecast.service.ts apps/api/src/modules/predictive-refill/services/recommendation.service.ts apps/api/src/modules/predictive-refill/predictive-refill.module.ts
git commit -m "fix(api): margin-based priority formula — load real prices from MachineSlot/Product"
```

---

## Task 3: Alert wiring

**Files:**

- Modify: `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`
- Modify: `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`

- [ ] **Step 1: Import AlertsService and AlertRule into module**

In `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`, add imports:

```typescript
import { AlertRule } from "../alerts/entities/alert-rule.entity";
import { AlertsModule } from "../alerts/alerts.module";
```

Add `AlertRule` to `TypeOrmModule.forFeature`:

```typescript
TypeOrmModule.forFeature([
  ConsumptionRate,
  RefillRecommendation,
  Transaction,
  MachineSlot,
  Machine,
  Organization,
  Product,
  AlertRule,
]),
```

Add `AlertsModule` to module imports:

```typescript
imports: [
  TypeOrmModule.forFeature([...]),
  BullModule.registerQueue({ name: "predictive-refill" }),
  AlertsModule,
],
```

- [ ] **Step 2: Inject AlertsService into RecommendationService**

In `apps/api/src/modules/predictive-refill/services/recommendation.service.ts`, update imports:

```typescript
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RefillRecommendation,
  RefillAction,
} from "../entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { ForecastService, SlotForecast } from "./forecast.service";
import { GetRecommendationsDto } from "../dto/forecast-query.dto";
import { AlertsService } from "../../alerts/alerts.service";
import {
  AlertRule,
  AlertMetric,
} from "../../alerts/entities/alert-rule.entity";
```

Update constructor:

```typescript
constructor(
  @InjectRepository(RefillRecommendation)
  private readonly recRepo: Repository<RefillRecommendation>,
  @InjectRepository(Machine)
  private readonly machineRepo: Repository<Machine>,
  @InjectRepository(AlertRule)
  private readonly alertRuleRepo: Repository<AlertRule>,
  private readonly forecastService: ForecastService,
  private readonly alertsService: AlertsService,
) {}
```

- [ ] **Step 3: Add alert firing to generateForOrganization**

Replace the `generateForOrganization` method:

```typescript
async generateForOrganization(organizationId: string): Promise<number> {
  const machines = await this.machineRepo.find({
    where: { organizationId },
    select: ["id", "name"],
  });

  const machineNameMap = new Map(machines.map((m) => [m.id, m.name]));
  let count = 0;
  const allRecs: RefillRecommendation[] = [];

  for (const machine of machines) {
    const recs = await this.generateForMachine(organizationId, machine.id);
    count += recs.length;
    allRecs.push(...recs);
  }

  // Fire alerts for REFILL_NOW recommendations
  await this.fireStockoutAlerts(organizationId, allRecs, machineNameMap);

  this.logger.log(
    `Generated ${count} recommendations for org ${organizationId}`,
  );
  return count;
}

private async fireStockoutAlerts(
  organizationId: string,
  recs: RefillRecommendation[],
  machineNameMap: Map<string, string>,
): Promise<void> {
  const rule = await this.alertRuleRepo.findOne({
    where: {
      organizationId,
      metric: AlertMetric.PREDICTED_STOCKOUT,
      isActive: true,
    },
  });
  if (!rule) return;

  const urgentRecs = recs.filter(
    (r) => r.recommendedAction === RefillAction.REFILL_NOW,
  );

  for (const rec of urgentRecs) {
    const machineName = machineNameMap.get(rec.machineId) ?? rec.machineId;
    try {
      await this.alertsService.triggerAlert(
        organizationId,
        rule.id,
        rec.machineId,
        Number(rec.priorityScore),
        `${machineName}: ${rec.daysOfSupply} дн. запаса (маржа ${rec.margin} UZS/шт)`,
      );
    } catch (err) {
      // Cooldown suppression throws or returns silently — log and continue
      this.logger.debug(
        `Alert suppressed for machine ${rec.machineId}: ${err?.message ?? "cooldown"}`,
      );
    }
  }
}
```

- [ ] **Step 4: Check AlertsModule exports AlertsService**

Run: `cd /Users/js/VendHub-OS && grep -n "exports" apps/api/src/modules/alerts/alerts.module.ts`
Expected: `AlertsService` listed in exports. If not, add it.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/api exec tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/api/src/modules/predictive-refill/services/recommendation.service.ts apps/api/src/modules/predictive-refill/predictive-refill.module.ts
git commit -m "feat(api): PREDICTED_STOCKOUT alert wiring — fires on REFILL_NOW via AlertsService"
```

---

## Task 4: Manual trigger endpoint + BullMQ processor

**Files:**

- Create: `apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts`
- Modify: `apps/api/src/modules/predictive-refill/controllers/predictive-refill.controller.ts`
- Modify: `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`

- [ ] **Step 1: Create the BullMQ processor**

Create `apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts`:

```typescript
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { ConsumptionRateService } from "../services/consumption-rate.service";
import { RecommendationService } from "../services/recommendation.service";

@Processor("predictive-refill")
export class DailyForecastProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyForecastProcessor.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly consumptionRateService: ConsumptionRateService,
    private readonly recommendationService: RecommendationService,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ orgs: number; rates: number; recs: number; failures: number }> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);
    const orgs = await this.orgRepo.find({
      where: { isActive: true },
      select: ["id"],
    });

    let totalRates = 0;
    let totalRecs = 0;
    let failures = 0;

    for (const org of orgs) {
      try {
        const rates = await this.consumptionRateService.refreshForOrg(
          org.id,
          14,
        );
        const recs = await this.recommendationService.generateForOrganization(
          org.id,
        );
        totalRates += rates;
        totalRecs += recs;
      } catch (err) {
        failures++;
        this.logger.error(`Org ${org.id} failed: ${err.message}`, err.stack);
      }
    }

    this.logger.log(
      `Recalc complete: ${orgs.length} orgs, ${totalRates} rates, ${totalRecs} recs, ${failures} failures`,
    );
    return { orgs: orgs.length, rates: totalRates, recs: totalRecs, failures };
  }
}
```

- [ ] **Step 2: Register processor in module**

In `apps/api/src/modules/predictive-refill/predictive-refill.module.ts`, add import:

```typescript
import { DailyForecastProcessor } from "./jobs/daily-forecast.processor";
```

Add to `providers` array:

```typescript
providers: [
  ConsumptionRateService,
  ForecastService,
  RecommendationService,
  PredictiveRefillCronService,
  DailyForecastProcessor,
],
```

- [ ] **Step 3: Add trigger-refresh endpoint to controller**

In `apps/api/src/modules/predictive-refill/controllers/predictive-refill.controller.ts`, add imports:

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ForecastService } from "../services/forecast.service";
import { RecommendationService } from "../services/recommendation.service";
import { GetRecommendationsDto } from "../dto/forecast-query.dto";
```

Update constructor:

```typescript
constructor(
  private readonly forecastService: ForecastService,
  private readonly recommendationService: RecommendationService,
  @InjectQueue("predictive-refill") private readonly queue: Queue,
) {}
```

Add endpoint after `markActed`:

```typescript
@Post("trigger-refresh")
@Roles("owner", "admin")
@ApiOperation({ summary: "Manually trigger predictive refill recalculation for all orgs" })
@ApiResponse({ status: 201, description: "Refresh job enqueued" })
async triggerRefresh(): Promise<{ message: string; jobId: string }> {
  const job = await this.queue.add("recalc-all", {}, {
    removeOnComplete: 10,
    removeOnFail: 5,
  });
  return { message: "Refresh enqueued", jobId: String(job.id) };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/api exec tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/api/src/modules/predictive-refill/jobs/daily-forecast.processor.ts apps/api/src/modules/predictive-refill/controllers/predictive-refill.controller.ts apps/api/src/modules/predictive-refill/predictive-refill.module.ts
git commit -m "feat(api): POST /trigger-refresh endpoint + BullMQ processor for manual recalc"
```

---

## Task 5: Frontend — bulk select + Add to Route

**Files:**

- Modify: `apps/web/src/app/dashboard/predictive-refill/page.tsx`

- [ ] **Step 1: Update RefillRecommendation interface**

In `apps/web/src/app/dashboard/predictive-refill/page.tsx`, update the interface (line 25):

```typescript
interface RefillRecommendation {
  id: string;
  machineId: string;
  machineName: string;
  productName: string;
  slotLabel?: string;
  currentStock: number;
  capacity: number;
  daysOfSupply: number;
  priorityScore: number;
  recommendedAction: string;
  sellingPrice: number;
  costPrice: number;
  margin: number;
  dailyProfit: number;
}
```

- [ ] **Step 2: Add selection state and Add-to-Route mutation**

After the existing state declarations (around line 50), add:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const addToRouteMutation = useMutation({
  mutationFn: async (machineIds: string[]) => {
    const stops = machineIds.map((machineId, i) => ({
      machineId,
      sortOrder: i + 1,
    }));
    const today = new Date().toISOString().split("T")[0];
    const { data } = await api.post("/routes", {
      name: `Дозаправка ${today}`,
      plannedDate: today,
      operatorId: "current", // Will be resolved by backend from current user
      type: "refill",
      stops,
    });
    return data;
  },
  onSuccess: (data) => {
    toast.success("Маршрут создан");
    router.push(`/dashboard/routes/${data.id}`);
  },
  onError: () => {
    toast.error("Ошибка при создании маршрута");
  },
});

function toggleSelection(id: string, machineId: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(machineId)) {
      next.delete(machineId);
    } else {
      next.add(machineId);
    }
    return next;
  });
}

function toggleAllVisible() {
  if (!recommendations) return;
  const visibleMachineIds = recommendations.data.map((r) => r.machineId);
  const allSelected = visibleMachineIds.every((id) => selectedIds.has(id));
  if (allSelected) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(visibleMachineIds));
  }
}

function handleAddToRoute() {
  addToRouteMutation.mutate(Array.from(selectedIds));
}
```

- [ ] **Step 3: Add toolbar between tabs and table**

Before the `<Table>` component, add:

```tsx
{
  selectedIds.size > 0 && (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
      <span className="text-sm text-muted-foreground">
        {selectedIds.size} выбрано
      </span>
      <Button
        size="sm"
        onClick={handleAddToRoute}
        disabled={addToRouteMutation.isPending}
      >
        {addToRouteMutation.isPending ? "Создание..." : "Добавить в маршрут"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Add checkbox column to table**

In `<TableHeader>`, add as first column:

```tsx
<TableHead className="w-10">
  <input
    type="checkbox"
    checked={
      recommendations?.data?.length > 0 &&
      recommendations.data.every((r) => selectedIds.has(r.machineId))
    }
    onChange={toggleAllVisible}
    className="rounded border-gray-300"
  />
</TableHead>
```

In each `<TableRow>`, add as first cell:

```tsx
<TableCell>
  <input
    type="checkbox"
    checked={selectedIds.has(rec.machineId)}
    onChange={() => toggleSelection(rec.id, rec.machineId)}
    className="rounded border-gray-300"
  />
</TableCell>
```

- [ ] **Step 5: Update KPI card 3 with profit-at-risk**

Find the third KPI card (affected machines count) and add a subtitle:

```tsx
<p className="text-xs text-muted-foreground">
  {recommendations?.data
    ? new Intl.NumberFormat("ru-RU").format(
        recommendations.data
          .filter((r) => r.recommendedAction === "refill_now")
          .reduce((sum, r) => sum + Number(r.dailyProfit), 0),
      )
    : "0"}{" "}
  UZS/день под угрозой
</p>
```

- [ ] **Step 6: Verify the web app compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/web exec tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/web/src/app/dashboard/predictive-refill/page.tsx
git commit -m "feat(web): bulk-select + Add to Route button + profit-at-risk KPI"
```

---

## Task 6: Frontend — detail page line chart with projection

**Files:**

- Modify: `apps/web/src/app/dashboard/predictive-refill/[machineId]/page.tsx`

- [ ] **Step 1: Replace BarChart with LineChart imports**

Update the Recharts imports in `[machineId]/page.tsx`:

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
```

- [ ] **Step 2: Build projection data from forecast**

Add a utility function before the component:

```typescript
interface ChartDataPoint {
  date: string;
  stock: number | null;
  projection: number | null;
}

function buildChartData(
  currentStock: number,
  dailyRate: number,
  capacity: number,
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  // Historical: last 14 days (approximation from current stock + rate)
  for (let i = 14; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const estimatedStock = Math.min(
      capacity,
      Math.max(0, currentStock + dailyRate * i),
    );
    data.push({
      date: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      stock: Math.round(estimatedStock),
      projection: null,
    });
  }

  // Today
  data.push({
    date: today.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }),
    stock: currentStock,
    projection: currentStock,
  });

  // Projection: next 7 days
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const projected = Math.max(0, currentStock - dailyRate * i);
    data.push({
      date: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      stock: null,
      projection: Math.round(projected),
    });
  }

  return data;
}
```

- [ ] **Step 3: Replace the chart section**

Find the existing BarChart/chart section and replace with:

```tsx
{
  forecast && forecast.length > 0 && (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h3 className="mb-4 text-lg font-medium">
          Прогноз запасов (первый слот)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={buildChartData(
              forecast[0].currentStock,
              forecast[0].dailyRate,
              forecast[0].capacity,
            )}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis
              label={{ value: "шт", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={0}
              stroke="red"
              strokeDasharray="5 5"
              label="Дефицит"
            />
            <ReferenceLine
              x={new Date().toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
              })}
              stroke="gray"
              strokeDasharray="3 3"
              label="Сегодня"
            />
            <Line
              type="monotone"
              dataKey="stock"
              stroke="#2563eb"
              strokeWidth={2}
              name="Факт"
              connectNulls={false}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="projection"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="8 4"
              name="Прогноз"
              connectNulls={false}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-sm italic text-muted-foreground">
          Прогноз, не гарантия
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Verify the web app compiles**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/web exec tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/web/src/app/dashboard/predictive-refill/\\[machineId\\]/page.tsx
git commit -m "feat(web): detail page line chart — historical + projection + stockout reference"
```

---

## Task 7: Backend unit tests

**Files:**

- Create: `apps/api/src/modules/predictive-refill/services/predictive-refill-cron.service.spec.ts`
- Create: `apps/api/src/modules/predictive-refill/services/recommendation.service.spec.ts`

- [ ] **Step 1: Create cron resilience test**

Create `apps/api/src/modules/predictive-refill/services/predictive-refill-cron.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { PredictiveRefillCronService } from "./predictive-refill-cron.service";
import { ConsumptionRateService } from "./consumption-rate.service";
import { RecommendationService } from "./recommendation.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Organization } from "../../organizations/entities/organization.entity";

describe("PredictiveRefillCronService", () => {
  let service: PredictiveRefillCronService;
  let consumptionRateService: jest.Mocked<ConsumptionRateService>;
  let recommendationService: jest.Mocked<RecommendationService>;
  let orgRepo: { find: jest.Mock };

  beforeEach(async () => {
    orgRepo = {
      find: jest.fn().mockResolvedValue([
        { id: "org-1", isActive: true },
        { id: "org-2", isActive: true },
        { id: "org-3", isActive: true },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveRefillCronService,
        {
          provide: ConsumptionRateService,
          useValue: {
            refreshForOrg: jest.fn().mockResolvedValue(5),
          },
        },
        {
          provide: RecommendationService,
          useValue: {
            generateForOrganization: jest.fn().mockResolvedValue(3),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: orgRepo,
        },
      ],
    }).compile();

    service = module.get(PredictiveRefillCronService);
    consumptionRateService = module.get(ConsumptionRateService);
    recommendationService = module.get(RecommendationService);
  });

  it("should iterate all active organizations", async () => {
    await service.nightlyRefresh();

    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledTimes(3);
    expect(recommendationService.generateForOrganization).toHaveBeenCalledTimes(
      3,
    );
  });

  it("should continue processing when one org fails", async () => {
    consumptionRateService.refreshForOrg
      .mockResolvedValueOnce(5)
      .mockRejectedValueOnce(new Error("DB timeout"))
      .mockResolvedValueOnce(5);

    await expect(service.nightlyRefresh()).resolves.not.toThrow();

    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledTimes(3);
    expect(recommendationService.generateForOrganization).toHaveBeenCalledTimes(
      2,
    );
  });

  it("should not throw when no orgs exist", async () => {
    orgRepo.find.mockResolvedValue([]);

    await expect(service.nightlyRefresh()).resolves.not.toThrow();
    expect(consumptionRateService.refreshForOrg).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Create recommendation service test**

Create `apps/api/src/modules/predictive-refill/services/recommendation.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { RecommendationService } from "./recommendation.service";
import { ForecastService } from "./forecast.service";
import { AlertsService } from "../../alerts/alerts.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RefillRecommendation } from "../entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import {
  AlertRule,
  AlertMetric,
} from "../../alerts/entities/alert-rule.entity";

describe("RecommendationService", () => {
  let service: RecommendationService;
  let alertsService: jest.Mocked<AlertsService>;
  let alertRuleRepo: { findOne: jest.Mock };
  let recRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let machineRepo: { find: jest.Mock };

  beforeEach(async () => {
    recRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "rec-1", ...entity }),
        ),
      create: jest.fn().mockImplementation((data) => data),
    };
    machineRepo = {
      find: jest
        .fn()
        .mockResolvedValue([{ id: "machine-1", name: "Test Machine" }]),
    };
    alertRuleRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: "rule-1",
        metric: AlertMetric.PREDICTED_STOCKOUT,
        isActive: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: ForecastService,
          useValue: {
            forecastMachine: jest.fn().mockResolvedValue([
              {
                machineId: "machine-1",
                productId: "product-1",
                currentStock: 3,
                capacity: 20,
                dailyRate: 2,
                daysOfSupply: 1.5,
                sellingPrice: 15000,
                costPrice: 8000,
              },
            ]),
          },
        },
        {
          provide: AlertsService,
          useValue: {
            triggerAlert: jest.fn().mockResolvedValue({ id: "alert-1" }),
          },
        },
        {
          provide: getRepositoryToken(RefillRecommendation),
          useValue: recRepo,
        },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        { provide: getRepositoryToken(AlertRule), useValue: alertRuleRepo },
      ],
    }).compile();

    service = module.get(RecommendationService);
    alertsService = module.get(AlertsService);
  });

  describe("priority formula", () => {
    it("should calculate priority using margin × dailyRate", async () => {
      await service.generateForOrganization("org-1");

      const savedData = recRepo.save.mock.calls[0][0];
      // margin = 15000 - 8000 = 7000
      // dailyProfit = 7000 * 2 = 14000
      // urgency = min(10, 1/1.5) = 0.6667
      // priorityScore = 0.6667 * log10(1 + 14000) ≈ 0.6667 * 4.146 ≈ 2.764
      expect(savedData.margin).toBeCloseTo(7000, 0);
      expect(savedData.dailyProfit).toBeCloseTo(14000, 0);
      expect(savedData.priorityScore).toBeGreaterThan(2);
      expect(savedData.priorityScore).toBeLessThan(4);
    });

    it("should handle zero margin gracefully", async () => {
      const forecastService = module.get(ForecastService);
      (forecastService.forecastMachine as jest.Mock).mockResolvedValue([
        {
          machineId: "machine-1",
          productId: "product-1",
          currentStock: 3,
          capacity: 20,
          dailyRate: 2,
          daysOfSupply: 1.5,
          sellingPrice: 0,
          costPrice: 0,
        },
      ]);

      await service.generateForOrganization("org-1");

      const savedData = recRepo.save.mock.calls[0][0];
      expect(savedData.margin).toBe(0);
      expect(savedData.dailyProfit).toBe(0);
      expect(savedData.priorityScore).toBe(0);
    });
  });

  describe("alert wiring", () => {
    it("should fire alert for REFILL_NOW recommendations", async () => {
      await service.generateForOrganization("org-1");

      expect(alertsService.triggerAlert).toHaveBeenCalledWith(
        "org-1",
        "rule-1",
        "machine-1",
        expect.any(Number),
        expect.stringContaining("дн. запаса"),
      );
    });

    it("should not fire alert when no rule exists", async () => {
      alertRuleRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization("org-1");

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should not fire alert for MONITOR recommendations", async () => {
      const forecastService = module.get(ForecastService);
      (forecastService.forecastMachine as jest.Mock).mockResolvedValue([
        {
          machineId: "machine-1",
          productId: "product-1",
          currentStock: 15,
          capacity: 20,
          dailyRate: 1,
          daysOfSupply: 15,
          sellingPrice: 15000,
          costPrice: 8000,
        },
      ]);

      await service.generateForOrganization("org-1");

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/api exec jest --testPathPattern="predictive-refill" --passWithNoTests`
Expected: All tests pass. Fix any failures before proceeding.

- [ ] **Step 4: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/api/src/modules/predictive-refill/services/predictive-refill-cron.service.spec.ts apps/api/src/modules/predictive-refill/services/recommendation.service.spec.ts
git commit -m "test: predictive refill cron resilience + priority formula + alert wiring tests"
```

---

## Task 8: E2E test

**Files:**

- Create: `apps/web/e2e/predictive-refill.spec.ts`

- [ ] **Step 1: Create E2E test file**

Create `apps/web/e2e/predictive-refill.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Predictive Refill", () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager (adjust credentials to match test seed)
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "manager@test.vendhub.uz");
    await page.fill('[name="password"]', "TestPassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");
  });

  test("list → detail → add to route flow", async ({ page }) => {
    // Navigate to predictive refill
    await page.goto("/dashboard/predictive-refill");
    await page.waitForSelector("table");

    // Verify KPI cards render
    await expect(
      page
        .locator('[data-testid="kpi-cards"]')
        .or(page.locator(".grid").first()),
    ).toBeVisible();

    // Verify table has recommendations
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    // Click first row to navigate to detail
    const firstMachineLink = rows.first().locator("td").nth(2); // machine column
    await firstMachineLink.click();
    await page.waitForURL("**/predictive-refill/**");

    // Verify detail page has chart
    await expect(
      page.locator(".recharts-wrapper").or(page.locator("svg")),
    ).toBeVisible();

    // Verify "Прогноз, не гарантия" microcopy
    await expect(page.getByText("Прогноз, не гарантия")).toBeVisible();

    // Go back to list
    await page.goBack();
    await page.waitForSelector("table");

    // Select 2 rows via checkboxes
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Verify toolbar shows selection count
    await expect(page.getByText("2 выбрано")).toBeVisible();

    // Click "Добавить в маршрут"
    await page.click('button:has-text("Добавить в маршрут")');

    // Verify navigation to routes
    await page.waitForURL("**/dashboard/routes/**");

    // Verify we're on a route detail page (draft route created)
    await expect(page.locator("body")).toContainText(
      /Дозаправка|draft|черновик/i,
    );
  });
});
```

- [ ] **Step 2: Verify test runs (may fail if no test data seeded — that's OK for now)**

Run: `cd /Users/js/VendHub-OS && pnpm --filter @vendhub/web exec playwright test e2e/predictive-refill.spec.ts --reporter=line 2>&1 | head -30`
Expected: Test either passes (if dev server + seed data available) or fails with connection/data errors (not syntax errors).

- [ ] **Step 3: Commit**

```bash
cd /Users/js/VendHub-OS
git add apps/web/e2e/predictive-refill.spec.ts
git commit -m "test: E2E predictive refill — list → detail → add to route flow"
```

---

## Task 9: Documentation updates

**Files:**

- Modify: `docs/features/predictive-refill.md`
- Modify: `docs/runbooks/predictive-refill-troubleshooting.md`

- [ ] **Step 1: Update feature doc**

Append to `docs/features/predictive-refill.md`:

```markdown
## Priority Formula (Phase 3)

Priority scoring uses real per-machine margins:
```

sellingPrice = MachineSlot.price ?? Product.sellingPrice
costPrice = MachineSlot.costPrice ?? Product.purchasePrice
margin = sellingPrice - costPrice
dailyProfit = margin × dailyRate
urgency = min(10, 1 / daysOfSupply)
priorityScore = urgency × log10(1 + dailyProfit)

```

Higher margin slots get higher priority when running low. Each machine can override product prices via slot-level `price` and `costPrice` fields.

## Alerts

- Metric: `PREDICTED_STOCKOUT`
- Fires for: `REFILL_NOW` recommendations only (daysOfSupply < 2)
- Channels: in-app + Telegram (configurable per org via alert rule)
- Suppression: 24h cooldown per machine (via AlertRule.cooldownMinutes)
- Severity: CRITICAL

Alert rule is auto-seeded per organization. Operators can disable via Dashboard > Alerts > Rules.

## Manual Refresh

```

POST /api/v1/predictive-refill/trigger-refresh
Authorization: Bearer <token>
Roles: owner, admin

```

Enqueues a full recalculation job. Response: `{ message, jobId }`.
```

- [ ] **Step 2: Update troubleshooting runbook**

Append to `docs/runbooks/predictive-refill-troubleshooting.md`:

````markdown
## Alert not firing

1. Check if PREDICTED_STOCKOUT rule exists for the org: `SELECT * FROM alert_rules WHERE organization_id = '<org>' AND metric = 'predicted_stockout'`
2. Check if rule is active (`is_active = true`)
3. Check cooldown: `SELECT * FROM alert_history WHERE rule_id = '<rule>' AND machine_id = '<machine>' ORDER BY triggered_at DESC LIMIT 1` — if triggered within 1440 minutes, suppressed
4. Check if any REFILL_NOW recommendations exist: `SELECT * FROM refill_recommendations WHERE organization_id = '<org>' AND recommended_action = 'refill_now'`

## Wrong priority ordering

- Verify slot prices are set: `SELECT slot_number, price, cost_price FROM machine_slots WHERE machine_id = '<machine>'`
- If both are NULL, system falls back to Product.sellingPrice/purchasePrice
- If Product prices are also 0, dailyProfit = 0 and priorityScore = 0

## Manual refresh

```bash
curl -X POST https://vendhubapi-production.up.railway.app/api/v1/predictive-refill/trigger-refresh \
  -H "Authorization: Bearer <admin-token>"
```
````

````

- [ ] **Step 3: Commit**

```bash
cd /Users/js/VendHub-OS
git add docs/features/predictive-refill.md docs/runbooks/predictive-refill-troubleshooting.md
git commit -m "docs: update predictive refill — margin formula, alerts, manual refresh, troubleshooting"
````

---

## Verification Checklist (run after all tasks)

- [ ] `pnpm --filter @vendhub/api exec tsc --noEmit` — 0 errors
- [ ] `pnpm --filter @vendhub/web exec tsc --noEmit` — 0 errors
- [ ] `pnpm --filter @vendhub/api exec jest --testPathPattern="predictive-refill"` — all green
- [ ] RBAC canary: `pnpm --filter @vendhub/api exec jest --testPathPattern="rbac-canary"` — 0 violations
- [ ] Manual spot-check: start dev, navigate to `/dashboard/predictive-refill`, verify table renders
- [ ] Check detail page shows line chart with projection line
