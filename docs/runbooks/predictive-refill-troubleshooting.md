# Troubleshooting: Predictive Refill

## No recommendations showing

1. Check cron ran: look for `"Nightly predictive refill recalc starting"` in API logs
2. Check org has transactions: `SELECT COUNT(*) FROM transactions WHERE organization_id = :orgId AND created_at > NOW() - INTERVAL '14 days'`
3. Check org is active: `SELECT is_active FROM organizations WHERE id = :orgId`
4. Manual trigger: enqueue via API or direct service call

## Stale daysOfSupply

The forecast depends on `machine_slots.current_quantity`. If telemetry is delayed, forecasts are stale.

1. Check when slot was last updated: `SELECT updated_at FROM machine_slots WHERE machine_id = :machineId`
2. If telemetry pipeline is down, forecasts will show old stock levels
3. This is a known dependency — fix telemetry, not predictive-refill

## Recommendations all show "Monitor"

All products have >5 days of supply. Either:

- Sales are low (correct behavior)
- Stock was just refilled (correct)
- `consumption_rates.rate_per_day` is 0 for all → check transactions exist

## How to manually trigger refresh

```bash
# Via API (requires auth)
curl -X POST https://api.vendhub.uz/api/v1/predictive-refill/recommendations/refresh \
  -H "Authorization: Bearer <token>"

# Or check cron logs for last run time
grep "Nightly.*recalc" /var/log/api.log | tail -5
```

## Where to find logs

- Cron service: `PredictiveRefillCronService`
- Rate calculation: `ConsumptionRateService`
- Recommendations: `RecommendationService`
- All log with org ID for grep filtering

## Performance

First cron run may be slow if many (machine × product) pairs. Monitor duration in logs:
`"Nightly recalc complete: N orgs, M rates, K recs, X failures, Ys"`

If >5 minutes, consider batching by org or adding concurrency limits.

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

## Stock quantity not updating after sales

1. Check if `transaction.created` event is being emitted: `grep "transaction.created" apps/api/src/modules/transactions/transaction-create.service.ts`
2. Check if `QuantitySyncService` is registered in `predictive-refill.module.ts` providers
3. Check `TransactionItem` has `productId` matching a `MachineSlot.productId`
4. Verify EventEmitterModule is imported in `app.module.ts`

## Auto-route returning empty

1. Check if REFILL_NOW recommendations exist: `SELECT COUNT(*) FROM refill_recommendations WHERE organization_id = '<org>' AND recommended_action = 'refill_now'`
2. Check machines have coordinates: `SELECT id, name, latitude, longitude FROM machines WHERE organization_id = '<org>' AND latitude IS NOT NULL`
3. If no machines have GPS, route generation fails — add coordinates via machines admin

## Sparklines showing all zeros

1. Check if transactions exist in the last 7 days: `SELECT COUNT(*) FROM transactions WHERE organization_id = '<org>' AND transaction_date > NOW() - INTERVAL '7 days'`
2. Check if transaction_items have correct `product_id` matching recommendations
