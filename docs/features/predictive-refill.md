# Predictive Refill

Forecasts when vending machine slots will run out of stock and prioritizes refill routes.

## How it works

1. **Nightly cron** (02:00 Tashkent) scans all active organizations
2. **EWMA** (Exponentially Weighted Moving Average, α=0.2) computes daily consumption rate per (machine, product) over a 14-day window
3. **Days of supply** = currentStock / dailyRate
4. **Priority score** = urgency × revenue impact, where:
   - urgency = min(10, 1/daysOfSupply) — capped to prevent division blowup
   - revenueImpact = log10(1 + dailyRate × avgPrice) — dampens outliers
5. **Action classification**: <2 days → REFILL_NOW, <5 days → REFILL_SOON, ≥5 days → MONITOR

## API endpoints

| Method | Path                                                | Description                                            |
| ------ | --------------------------------------------------- | ------------------------------------------------------ |
| GET    | `/predictive-refill/forecast/:machineId`            | Slot-level forecast for one machine                    |
| GET    | `/predictive-refill/recommendations`                | Priority-sorted list (filterable by action, machineId) |
| POST   | `/predictive-refill/recommendations/:id/mark-acted` | Mark recommendation as handled                         |

## Dashboard

- `/dashboard/predictive-refill` — org-wide recommendation list with KPI cards
- `/dashboard/predictive-refill/[machineId]` — per-machine forecast with stock chart

## Database tables

- `consumption_rates` — precomputed EWMA rates per (org, machine, product, period)
- `refill_recommendations` — current recommendation per slot with priority score

## Known limitations

- **MachineSlot.currentQuantity freshness** depends on telemetry pipeline. Stale telemetry = stale forecasts.
- **Route efficiency** is constant (1.0) in current version. Future: compute from distance-to-route.
- **No seasonal/holiday adjustment** — EWMA smoothing only. ML models deferred to Sprint F+.

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
