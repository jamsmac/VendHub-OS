# Incident: Payment Webhook Failing

**Symptom:** Orders stuck in `pending` state. Customer complaints about "payment went through but order not fulfilled". Sentry alerts on `PaymentsService.*` exceptions.

## Immediate triage (5 min)

1. **Which provider?** Check Sentry tags: `provider:payme`, `provider:click`, `provider:uzum`.
2. **Check webhook receive rate** in Grafana dashboard `Payments > Webhook Throughput`. Drop to zero = provider side issue. Normal rate but high error rate = our side.
3. **Check signature verification failures** — Sentry filter `event:signature_verification_failed`. Spike here usually means provider rotated their secret and we haven't updated.

## Common causes and fixes

### 1. Secret key rotated by provider

- Check provider dashboard (Payme / Click / Uzum merchant portal) for announced changes
- Update env var (`PAYME_KEY` / `CLICK_SECRET_KEY` / `UZUM_SECRET_KEY`) in Railway
- Redeploy API service — no code change needed

### 2. Idempotency lock deadlock

Pessimistic locks on `payment_transactions` table can deadlock under high concurrency.

- Check: `SELECT * FROM pg_locks WHERE relation = 'payment_transactions'::regclass;`
- Fix: restart API pod (Railway > Redeploy current)
- Long-term: investigate hot row contention

### 3. DB connection pool exhausted

- Check Grafana: `pg_stat_activity` connection count
- If > 80% of pool: scale API replicas OR increase pool size in TypeORM config (`DB_POOL_SIZE`)
- This often cascades — webhook times out, provider retries, more connections

### 4. Webhook IP allowlist changed

Some providers restrict inbound webhooks to specific IPs on THEIR side.

- Check provider support channel for IP changes
- Our side: verify we're not blocking inbound on Railway edge

## Post-incident

- [ ] Tag incident in Sentry with `incident:<date>`
- [ ] Document root cause
- [ ] If recurring: create tech-debt issue for structural fix
- [ ] Update this runbook if new failure mode discovered

## Relevant code

- `apps/api/src/modules/payments/payme.handler.ts`
- `apps/api/src/modules/payments/click.handler.ts`
- `apps/api/src/modules/payments/uzum.handler.ts`
- `apps/api/src/modules/payments/payments.controller.ts` (webhook routes)
