# Sprint E — Predictive Refill

## Product spec

**Value proposition:** Снижает stock-outs и ненужные service visits через
consumption-rate forecasting.

**MVP scope (Sprint E):**

- Rolling consumption rate per (machine, product) slot
- Days-of-supply metric per slot
- Refill recommendations с priority scoring
- Dashboard `/dashboard/predictive-refill`
- Alert на predicted stock-out
- "Add recommended refills to route" кнопка

**Deferred (Sprint F+):**

- ML model (seasonal patterns, holidays)
- Auto-route optimization
- Multi-product bundle refills
- A/B testing forecast variants

## Architecture

### Backend: `apps/api/src/modules/predictive-refill/`

```
predictive-refill/
├── entities/
│   ├── consumption-rate.entity.ts       (precomputed rates)
│   └── refill-recommendation.entity.ts  (current recommendations)
├── services/
│   ├── consumption-rate.service.ts      (EWMA calculation)
│   ├── forecast.service.ts              (days-of-supply + stock-out time)
│   └── recommendation.service.ts        (priority scoring)
├── controllers/
│   └── predictive-refill.controller.ts
├── jobs/
│   └── daily-forecast.processor.ts      (BullMQ processor)
└── dto/
    ├── forecast-query.dto.ts
    └── recommendation-response.dto.ts
```

### Math: EWMA (exponential weighted moving average)

```
rate_today = α * sales_today + (1 - α) * rate_yesterday
α = 0.2 (smoothing factor, tuneable)
```

Достаточно для MVP. Если нужны seasonal adjustments — Holt-Winters в Sprint F.

### Priority score

```
urgency      = 1 / days_of_supply               (higher = urgent)
revenue_imp  = avg_daily_revenue_for_slot
route_eff    = 1 / distance_to_nearest_route
priority     = urgency * revenue_imp * route_eff
```

### Schema changes

```sql
CREATE TABLE consumption_rates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  machine_id UUID NOT NULL,
  product_id UUID NOT NULL,
  slot_id VARCHAR,
  rate_per_day DECIMAL(10,4) NOT NULL,
  period_days INT NOT NULL,        -- 7 / 14 / 30
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE (machine_id, product_id, period_days)
);

CREATE TABLE refill_recommendations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  machine_id UUID NOT NULL,
  product_id UUID NOT NULL,
  slot_id VARCHAR,
  current_stock INT,
  daily_rate DECIMAL(10,4),
  days_of_supply DECIMAL(6,2),
  priority_score DECIMAL(10,4),
  recommended_action VARCHAR,     -- refill_now | refill_soon | monitor
  generated_at TIMESTAMP,
  acted_upon_at TIMESTAMP
);

CREATE INDEX idx_recs_org_priority ON refill_recommendations
  (organization_id, priority_score DESC);
```

### Frontend: `/dashboard/predictive-refill`

Routes:

- `/dashboard/predictive-refill` — main dashboard
- `/dashboard/predictive-refill/[machineId]` — machine detail drill-down

Components (reuse где можно):

- `ForecastChart` (recharts) — consumption trend + forecast line
- `RecommendationTable` — machines sorted by priority
- `MachineRiskCard` — summary widget
- `RefillPriorityBadge` — reused of existing Badge component
- `AddToRouteButton` — integrates with `/dashboard/routes`

### Alerts integration

Extend existing alerts system с новым типом:

- `PREDICTED_STOCKOUT` — fires когда days_of_supply < 2 для high-revenue slot
- Severity: P1 если revenue slot, P2 если regular
- Delivery: existing channels (email, telegram bot)

## Phases & Tasks

### Phase 1 — Backend foundations (2 days)

1. Schema + migrations
2. ConsumptionRateService (EWMA)
3. ForecastService (days-of-supply)
4. Unit tests for math (Jest)
5. Cron job via BullMQ — nightly recalc

### Phase 2 — Recommendation engine (1 day)

1. RecommendationService (priority scoring)
2. Controller + tRPC endpoints
3. Integration tests

### Phase 3 — Frontend (2 days)

1. UX spec через vhm24-ux-spec
2. Page + components
3. Integration с routes module
4. Storybook/visual tests

### Phase 4 — Alerts + polish (1 day)

1. PREDICTED_STOCKOUT alert type
2. Notification integration
3. E2E test (playwright/cypress)
4. Documentation: docs/features/predictive-refill.md
5. Runbook: docs/runbooks/predictive-refill-troubleshooting.md

**Total: ~6 days**

## Prerequisites to verify

Before coding, confirm these data assumptions:

1. Sales transactions — per machine_id, per product_id, per timestamp
2. Machine telemetry — current stock levels per slot OR inferable from sales
3. Slot-level inventory — known capacity per slot per machine
4. BullMQ queue infrastructure — work from Sprint A
5. Alerts plugin mechanism — how existing alert types are registered

Pre-flight check команды — в следующем сообщении dispatch.
