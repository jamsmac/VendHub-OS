# Sprint E Phase 3 — Frontend dashboard + self-running backend

## Context

Sprint E delivered the Predictive Refill backend engine in Phase 1+2:

- **Phase 1** (commit `fe4a9f4`) — schema, entities, module wiring, migration
- **Phase 2** (commit `81828e0`) — EWMA consumption rates, forecasting, priority-scored recommendations, 3 REST endpoints with RBAC + tenant isolation

The backend is API-complete but **not user-visible and not self-running**. This issue closes those two gaps.

Dispatch doc: `SPRINT_E_PHASE_3_DISPATCH.md` (in session outputs)

## Goal

Operations manager opens `/dashboard/predictive-refill`, sees machines sorted by urgency, drills into any machine for a forecast chart, bulk-adds refills to a route. Recommendations refresh nightly without human intervention. Stockout alerts fire through existing channels.

## Scope

### Block A — Nightly cron (warm-up, ~0.5 day)

- [ ] `DailyForecastProcessor` in `apps/api/src/modules/predictive-refill/jobs/`
- [ ] `ConsumptionRateService.refreshForOrg(orgId, periodDays)`
- [ ] `RecommendationService.refreshAll(orgId)`
- [ ] Scheduler entry (match existing `fiscal` / `machine-writeoff` pattern — **do not invent new pattern**)
- [ ] Unit test: processor iterates all active orgs, one-org-failure doesn't block others
- [ ] Integration test: enqueue `recalc-all`, assert recommendations populated

### Block B — UX specification gate (~0.25 day, no code)

- [ ] Invoke `vhm24-ux-spec` skill with: list page + detail page, API shapes from Phase 2 DTOs, style anchors (`/dashboard/machines`, `/dashboard/routes`), personas (ops manager + field technician)
- [ ] Spec artifact produced: layouts, component inventory with props, empty/loading/error states, i18n keys (RU primary, EN secondary)
- [ ] **Gate:** no "unknown" items remaining before Block C starts

### Block C — Frontend implementation (~1.25 day)

Chart library pre-check first:

- [ ] Run `rg "recharts|@nivo|chart\.js" apps/web/package.json` — use existing dep, do not add new

Routes + components:

- [ ] `apps/web/src/app/dashboard/predictive-refill/page.tsx` (list)
- [ ] `apps/web/src/app/dashboard/predictive-refill/[machineId]/page.tsx` (detail)
- [ ] `loading.tsx` skeleton
- [ ] `RefillPriorityBadge` (wraps existing Badge, 3 variants)
- [ ] `MachineRiskCard` (summary tile, navigates to detail)
- [ ] `RecommendationTable` (shadcn DataTable, sortable, filterable, bulk-select)
- [ ] `ForecastChart` (historical solid + projection dashed + stockout reference line + today marker + "Прогноз, не гарантия" microcopy)
- [ ] `AddToRouteButton` (integrates with existing routes module endpoint)
- [ ] Sidebar entry between `/dashboard/machines` and `/dashboard/routes`

Alert wiring (folded in from Phase 4):

- [ ] `RecommendationService.refreshAll()` fires `AlertMetric.PREDICTED_STOCKOUT` for urgent recs
- [ ] Severity P1 for high-revenue slots, P2 otherwise
- [ ] Suppression window ≥24h per (machine, product) to prevent fatigue

Tests:

- [ ] `RecommendationTable.test.tsx` — sort, filter, empty, bulk select
- [ ] `ForecastChart.test.tsx` — snapshot + critical props
- [ ] E2E `predictive-refill.spec.ts` — list → detail → add to route → route shows stops

### Documentation (Sprint E close-out)

- [ ] `docs/features/predictive-refill.md` — what it does, EWMA link, priority formula, refresh cadence, alerting
- [ ] `docs/runbooks/predictive-refill-troubleshooting.md` — no recs showing, stale daysOfSupply, alert spam, manual refresh, log locations

## Acceptance criteria

- Type-check green across `apps/api` and `apps/web`
- All predictive-refill tests green; RBAC canary still at 0
- Org-isolation spot check: log in as org A, confirm no org B recommendations visible
- Manually enqueue `recalc-all` → table populates within one minute on dev data
- Trigger stockout condition → `PREDICTED_STOCKOUT` alert observed in existing channel (email/telegram)
- E2E flow: dashboard → machine detail → add to route → route shows the added stops

## Risks

1. **Alert fatigue** — 100 machines × 20 products = 2000 potential daily alerts. Suppression window + REFILL_NOW threshold tuning mandatory.
2. **MachineSlot.currentQuantity freshness** — stale telemetry produces wrong `daysOfSupply`. Document dependency in runbook; do NOT fix telemetry in this sprint.
3. **First cron run slow** — iterating every (machine, product) across all orgs. Measure on staging; consider batching if >5min.
4. **Chart projection confusion** — users may read dashed line as promise. Microcopy "Прогноз, не гарантия" near chart is non-negotiable.

## Out of scope (defer to Sprint F or later)

- ML model (seasonal/holiday patterns)
- Auto-route optimization based on recommendations
- Multi-product bundle refills
- A/B testing forecast variants

## Links

- Dispatch: `SPRINT_E_PHASE_3_DISPATCH.md`
- Product spec: `SPRINT_E_PREDICTIVE_REFILL.md`
- Phase 1 commit: `fe4a9f4`
- Phase 2 commit: `81828e0`

## Estimate

~2 days, budget 6–8 commits. Sprint E closes around commit 42–44.
