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
