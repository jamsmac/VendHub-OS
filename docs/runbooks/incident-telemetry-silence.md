# Incident: Machine Telemetry Silence

**Symptom:** Machines stop reporting telemetry. Dashboard shows "last seen X minutes ago" > 15 min for many machines.

## Immediate triage

1. **One machine or many?**
   - One machine: likely hardware (power, connectivity). Dispatch technician.
   - Many machines same location: local network/power issue at site.
   - **Many machines across locations: our side issue**. Continue this runbook.

2. **WebSocket gateway healthy?**
   - Check `/health/detailed` endpoint — all indicators green?
   - Check Prometheus metric `websocket_connected_clients` — sudden drop = gateway crash
   - Fix: Railway > redeploy `api` service, WebSocket reconnects automatically

3. **Redis healthy?**
   - Telemetry pipeline uses Redis for pub/sub and caching
   - Check Railway dashboard > Redis service status
   - If down: restart Redis, API reconnects

## Common causes

### 1. Redis connection lost

- Check `REDIS_HOST` / `REDIS_URL` reachable from API
- Railway dashboard > Redis service status
- Fix: restart Redis service, API auto-reconnects via ioredis

### 2. Database write saturation

If telemetry ingestion is slow, machines appear silent because data isn't visible yet.

- Check Postgres `pg_stat_activity` for long-running INSERTs
- Check disk I/O on DB host — might be index rebuild or vacuum
- Fix: wait for operation to complete OR scale DB tier

### 3. API pod crash loop

- Check Railway > API service > Deployments — any recent crashes?
- Check Sentry for uncaught exceptions around the time telemetry dropped
- Fix: redeploy previous known-good deployment

## Post-incident

- [ ] Document root cause
- [ ] If pattern: open issue for telemetry pipeline reliability
- [ ] Update this runbook if new failure mode discovered

## Relevant code

- `apps/api/src/modules/machines/machines.service.ts`
- `apps/api/src/modules/websocket/websocket.gateway.ts`
- `apps/api/src/modules/calculated-state/calculated-state.service.ts`
