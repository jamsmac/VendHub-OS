# VendHub OS — Q2 2026 Roadmap

**Date:** 2026-04-21
**Author:** Jamshid Sadikov + Claude
**Scope:** Next 12 weeks (2026-04-21 → 2026-07-14)
**Current state:** Sprints A–F shipped, predictive refill production-ready (code), zero CVEs, 0 RBAC violations

---

## Executive Summary

VendHub OS has shipped a lot of code (~4,400 lines this session alone), but there's a gap between **shipped** and **delivering value to operators**:

- ✅ Backend predictive refill stack complete, tested, pushed to main
- ❌ Web app broken on Railway since 2026-04-06 — operators can't see any of it
- ❌ Migrations not verified on production DB
- ⚠️ Mobile app exists but operator workflow unclear
- ⚠️ 23 machines running, but data freshness depends on unverified transaction pipeline

**Priority for Q2:** Make the existing code actually used by operators, then expand.

---

## Phase 1 — Stabilization (Week 1, 2026-04-21 → 2026-04-27)

**Goal:** What's already built runs in production.

### P1.1 — Fix Railway web deploy 🔥

**Why:** Web service has been failing before build stage since 2026-04-06. Without it, predictive refill, Add-to-Route, sparklines — all the Sprint E+F work — is invisible to operators.

**Symptoms (from memory):** Web service fails before build stage, empty logs. Code builds locally fine.

**Action plan:**

1. Open Railway dashboard → check `vendhubweb-production` service status
2. Check billing/plan limits (Railway has free tier limits that could block builds)
3. Review build settings: is `Root Directory` set to `apps/web`? Is `Build Command` `pnpm --filter @vendhub/web build`?
4. Check `nixpacks.toml` or `railway.json` for build config
5. If logs are empty, try manual redeploy from latest commit
6. Compare config with working API service (`vendhubapi-production`)

**Success criteria:**

- `vendhubweb-production.up.railway.app/dashboard/predictive-refill` returns 200 and renders page
- Can log in as `jamshidsmac@gmail.com` and see real data
- Recommendations table shows current 23 machines

**Estimate:** 1–3 hours (mostly diagnosis; fix is usually a config toggle or plan bump)

**Blockers:** Requires Railway account access + active billing

---

### P1.2 — Run Sprint E + F migrations on production DB 🔥

**Why:** The new code expects:

- 4 new columns on `refill_recommendations` (selling_price, cost_price, margin, daily_profit)
- Seeded `PREDICTED_STOCKOUT` alert rules per org

Without migrations, the API will crash on `generateForOrganization()`.

**Action plan:**

1. Connect to Railway Postgres: `railway connect postgres` or use pgAdmin with Railway creds
2. Check migration status: `SELECT * FROM migrations ORDER BY id DESC LIMIT 5;`
3. Expected: see `1776000000000-AddPredictiveRefill` but NOT `1776100000000-PredictiveRefillPhase3`
4. Run migration via Railway: `railway run pnpm --filter @vendhub/api db:migrate`
5. Verify: `\d refill_recommendations` shows new columns; `SELECT * FROM alert_rules WHERE metric = 'predicted_stockout';` returns rows

**Success criteria:**

- All migrations up to `1776100000000` applied
- `alert_rules` has one `predicted_stockout` row per active org
- API doesn't error on `POST /predictive-refill/trigger-refresh`

**Estimate:** 30 minutes (if no conflicts)

---

### P1.3 — Smoke test predictive refill end-to-end in prod

**Action plan:**

1. Log in to web as owner
2. Navigate to `/dashboard/predictive-refill`
3. Click "Обновить" or trigger `POST /predictive-refill/trigger-refresh`
4. Verify recommendations table populates with real 23 machines
5. Click a machine → verify detail page loads with line chart
6. Select 2 machines → "Добавить в маршрут" → verify draft route created
7. Click "Авто-маршрут" → verify route generated from REFILL_NOW recs
8. Check sparklines render (green/red based on trend)

**Success criteria:** All 7 steps work without errors.

**Estimate:** 30 minutes.

---

## Phase 2 — Data Accuracy (Weeks 2–3, 2026-04-28 → 2026-05-11)

**Goal:** Predictions are based on real current data, not stale imports.

### P2.1 — Verify transaction → MachineSlot quantity sync is firing

**Why:** Sprint F added `QuantitySyncService` that listens to `transaction.created` events and decrements `MachineSlot.currentQuantity`. Need to verify this actually works on live transaction flow from Payme/Click webhooks.

**Action plan:**

1. Pick a quiet machine (e.g., low-traffic BC)
2. Note current `MachineSlot.currentQuantity` for a product
3. Make a test purchase via Payme/Click sandbox (or just place a real order if small)
4. Watch API logs: `QuantitySyncService - Synced X slots for machine Y`
5. Verify DB: `SELECT current_quantity FROM machine_slots WHERE machine_id = 'X' AND product_id = 'Y';` — should have decremented

**If it doesn't work:**

- Check `transaction.created` event is emitted by payment handlers (not just `transaction-create.service.ts`)
- Check if `TransactionItem` rows are inserted before the event fires
- Check `QuantitySyncService` is loaded in DI container

**Success criteria:** 10 consecutive transactions → 10 correct quantity decrements

**Estimate:** 2–4 hours (debugging if needed)

---

### P2.2 — Validate pricing data per machine

**Why:** Sprint E priority formula uses `MachineSlot.price` with fallback to `Product.sellingPrice`. If neither is set, priority = 0 (margin-based formula fails gracefully). Need to verify per-machine prices are set correctly in production.

**Action plan:**

1. Query: `SELECT machine_id, COUNT(*) FILTER (WHERE price IS NULL) as missing_prices, COUNT(*) FILTER (WHERE cost_price IS NULL) as missing_costs FROM machine_slots GROUP BY machine_id;`
2. For machines with missing prices, decide:
   - Set slot-level overrides via admin UI, OR
   - Ensure `Product.sellingPrice`/`purchasePrice` are set (fallback)
3. Run `POST /predictive-refill/trigger-refresh` and verify priorityScore > 0 for REFILL_NOW recs

**Success criteria:**

- All 23 machines have either slot-level prices OR product-level prices set
- All REFILL_NOW recommendations have `priorityScore > 0`

**Estimate:** 2–4 hours (depends on how much manual data entry needed)

---

### P2.3 — Backfill historical consumption_rates

**Why:** EWMA needs history to produce good forecasts. First nightly cron run will seed rates, but if the system has been running for months without cron, the rates table is sparse.

**Action plan:**

1. Check: `SELECT COUNT(*), MIN(last_calculated_at), MAX(last_calculated_at) FROM consumption_rates WHERE organization_id = '<prod-org>';`
2. If sparse (<100 rows), trigger full backfill: `POST /predictive-refill/trigger-refresh` (all orgs, all machines, all products)
3. Verify processing logs — should log `Refreshed N consumption rates for org X` for each active org

**Success criteria:** `consumption_rates` has ~2000 rows (23 machines × ~20 products avg × 1 period), all with `last_calculated_at` within last 24h

**Estimate:** 1 hour (mostly waiting for job to complete)

---

## Phase 3 — Operator Adoption (Weeks 4–6, 2026-05-12 → 2026-06-01)

**Goal:** Operators actually use predictive refill daily instead of legacy workflow.

### P3.1 — Operator training session

**Action plan:**

1. Record 10-minute Loom video walking through:
   - How to read the dashboard (KPI cards → table → detail page)
   - When to click "Авто-маршрут" vs manual select
   - How to interpret sparklines (red = accelerating)
   - How to mark a recommendation as "acted upon"
2. Share video + written quick-start guide (RU) via Telegram
3. Schedule 30-min live Q&A with 2–3 operators

**Success criteria:** At least 1 operator uses Предиктивный рефил for a full work day.

**Estimate:** 1 day (video + docs + session)

---

### P3.2 — Telegram bot launch for 1 pilot operator

**Why:** Embedded in API since Sprint D but not battle-tested. Live operator feedback before wider rollout.

**Action plan:**

1. Pick 1 operator (ideally tech-savvy)
2. Give them access to staff bot (`TELEGRAM_BOT_TOKEN`)
3. Verify flows work:
   - Receiving task assignments
   - Marking tasks complete with photo
   - Getting overdue alerts
   - Route start/end tracking
4. Collect bugs via shared doc
5. Fix critical bugs in weekly sprints

**Success criteria:** 1 operator completes 20 tasks via bot without blockers.

**Estimate:** 1 week (mostly waiting for real usage + bug fixes)

---

### P3.3 — Mobile app soft launch

**Why:** `apps/mobile` (Expo 52) exists but completion unclear. Operators in the field need iOS/Android app, not just web.

**Action plan:**

1. Audit mobile app state: run `cd apps/mobile && pnpm start` and check which screens work
2. Test flows: login, task list, task detail, route tracking, photo upload
3. Identify P0 gaps (things that block daily use)
4. Fix P0s in 1-week sprint
5. Build with EAS: `pnpm --filter mobile build:android`
6. Distribute APK via Telegram to pilot operator (iOS requires TestFlight, defer)

**Success criteria:** Pilot operator uses mobile app as primary tool for 3 consecutive days.

**Estimate:** 2 weeks (1 audit + 1 sprint of P0 fixes)

---

## Phase 4 — Feature Expansion (Weeks 7–10, 2026-06-02 → 2026-06-29)

**Goal:** Build on the stable predictive refill foundation.

### P4.1 — Design system integration into Tailwind

**Why:** `design/handoff/design-tokens.ts` and `tokens.css` are committed but not wired. UI currently uses old "Warm Glass" tokens which mostly overlap but have drift risk.

**Action plan:**

1. Read `design/handoff/HANDOFF.md` sections 3 and 4
2. Merge `design/handoff/design-tokens.ts` into `apps/web/tailwind.config.js`:
   - Colors from `brand`, `coffee`, `semantic`
   - Fonts from `fonts`
   - fontSize from `fontSize` scale
   - radius, shadow, duration, easing
3. Import `design/shared/tokens.css` in `apps/web/src/app/globals.css` (append, don't replace)
4. Visually diff 3 pages before/after: `/dashboard`, `/dashboard/predictive-refill`, `/dashboard/routes`
5. Fix any visual regressions

**Success criteria:** No visual regressions on 3 main pages. Design tokens are the single source of truth.

**Estimate:** 2–3 days

---

### P4.2 — Happy Workers Protocol implementation (Phase 1)

**Why:** `MachineSlot.currentQuantity` currently syncs only on VendHub payment transactions. If automats sell via cash (78% of transactions are cash per memory!) and cash is reported via a different path, the sync misses those. HWP gives direct telemetry.

**Scope for Phase 1:** Basic connection + sales reporting only. Defer maintenance/diagnostics to Phase 2.

**Action plan:**

1. Read `docs/specs/HAPPY_WORKERS_PROTOCOL_SPECIFICATION.md` thoroughly
2. Create new module `apps/api/src/modules/machine-protocol/`
3. Implement TCP server listening for machine connections
4. Implement sale packet decoder
5. On sale packet → emit `transaction.created` event → existing QuantitySyncService handles the rest
6. Deploy protocol server to Railway (new service)
7. Configure 1 pilot machine to point at Railway server
8. Validate sales arrive + quantities decrement

**Success criteria:** 1 pilot machine sends sales via HWP, recommendations reflect real consumption.

**Estimate:** 2–3 weeks (reverse-engineered protocol, first real integration will surface issues)

**Risks:**

- Protocol may have undocumented edge cases
- Firewall/NAT issues between machine and Railway
- Auth/crypto unclear from spec

---

### P4.3 — Route optimization improvements

**Why:** Current nearest-neighbor is greedy but not optimal. For 10+ stops, 2-opt swaps can cut distance 10-20%.

**Action plan:**

1. After nearest-neighbor produces initial tour, run 2-opt passes
2. Benchmark: simulated 10-stop route → nearest-neighbor vs 2-opt
3. If improvement > 10% and runtime < 1s, ship it
4. Add time-window constraints (operator shift 09:00–18:00)
5. Add capacity constraints (van holds N product units)

**Success criteria:** Generated routes are ≥10% shorter than nearest-neighbor.

**Estimate:** 3–5 days

---

## Phase 5 — Strategic (Weeks 11–12, 2026-06-30 → 2026-07-14)

**Goal:** Set up next quarter for scale.

### P5.1 — Multi-org / franchising readiness

**Why:** `TRent business plan` targets $5.8M equipment rental. If VendHub becomes a platform for franchisees, each franchise = separate org with its own machines/products/operators.

**Action plan:**

1. Audit all 86 modules for tenant isolation gaps (last audit found 48 bugs in March — do another pass)
2. Add org-level feature flags (some franchises may not have Telegram, fiscal, etc.)
3. Add org-level branding (logo, colors) — data model exists, UI doesn't honor it
4. Per-org billing dashboard (track usage, costs per franchise)

**Success criteria:** Create 2 test orgs, verify full isolation across all user-facing flows.

**Estimate:** 2 weeks

---

### P5.2 — Performance hardening

**Why:** 31K orders, 23 machines now. Scaling to 100 machines = ~135K orders. Query patterns that work at current scale may break.

**Action plan:**

1. Add k6 load tests for critical endpoints: `/dashboard/stats`, `/predictive-refill/recommendations`
2. Profile slow queries via `pg_stat_statements`
3. Add indexes where queries scan > 10K rows
4. Add Redis caching for hot reads (KPI cards, recommendations list)
5. Set up Grafana dashboard for p95/p99 latencies

**Success criteria:** p95 < 500ms on all dashboard endpoints under 10 RPS load.

**Estimate:** 1 week

---

## Out of Scope for Q2

These are real work but not this quarter:

- **ML seasonal/holiday forecasting** — EWMA is good enough. Revisit Q4 when seasonal patterns are visible in 2 full years of data.
- **On-prem Kubernetes deployment** — infrastructure exists, but Railway is fine until enterprise customer demands otherwise.
- **Figma integration** — design lives in HTML mocks. Figma would help collaboration but isn't blocking.
- **A/B testing forecast variants** — no traffic volume for statistical significance yet.

---

## Risk Register

| Risk                                               | Likelihood | Impact | Mitigation                                               |
| -------------------------------------------------- | ---------- | ------ | -------------------------------------------------------- |
| Railway deploy can't be fixed (plan/billing issue) | Med        | High   | Migrate to Vercel (Next.js native) — 1 day               |
| Migrations fail on prod (schema drift)             | Low        | High   | Test on copy of prod DB first                            |
| Pilot operator rejects new workflow                | Med        | Med    | Keep legacy path as fallback for 30 days                 |
| Happy Workers Protocol has auth we can't solve     | Med        | High   | Fall back to transaction-only sync + manual stock audits |
| Mobile app has P0 bugs found only in field         | High       | Med    | Have hotfix process ready; pilot with 1 operator first   |

---

## Success Metrics (end of Q2)

| Metric                                  | Current (2026-04-21)     | Target (2026-07-14) |
| --------------------------------------- | ------------------------ | ------------------- |
| Production web uptime                   | 0% (broken)              | >99%                |
| Operators using predictive refill daily | 0                        | ≥3                  |
| Machines sending HWP telemetry          | 0                        | ≥5 (pilot)          |
| Mobile app active users                 | 0                        | ≥2                  |
| Auto-route button usage                 | 0/day                    | ≥5/day              |
| p95 API latency                         | Unknown                  | <500ms              |
| Zero-tolerance metrics                  | 0 CVE, 0 RBAC violations | Maintained          |

---

## Immediate Next Step

**Today (2026-04-21):** Fix Railway web deploy (P1.1). Nothing else matters until operators can see what we built.

If Railway is unfixable in <4 hours, **migrate to Vercel** (1 day work, Next.js native). Don't spend a week on Railway diagnostics.
