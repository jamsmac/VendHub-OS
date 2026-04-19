# Deploy Runbook

## Pre-deploy checklist

- [ ] CI green on `main` (type-check, lint, tests with coverage, build)
- [ ] No pending Dependabot HIGH/CRITICAL alerts
- [ ] Database migrations backward-compatible (see "Migration safety" below)
- [ ] `.env.example` updated if new env vars added
- [ ] Breaking API changes have migration path (version bump + deprecation)
- [ ] `openapi.json` regenerated if API surface changed

## Deploy process (Railway)

1. Merge to `main` — GitHub Actions `deploy-railway` job triggers automatically
2. Monitor Railway dashboard > `api` service > Deployments
3. Wait for `Running` status + health check green
4. Run post-deploy smoke:

```bash
curl https://api.vendhub.uz/api/v1/health
curl https://api.vendhub.uz/api/v1/health/ready
```

5. Watch Sentry for 5 min — spike in new errors = rollback candidate

## Migration safety

### SAFE (zero-downtime)

- ADD COLUMN with DEFAULT
- ADD INDEX CONCURRENTLY
- Creating new tables
- Adding new routes / services

### REQUIRES CARE (blue-green deploy)

- RENAME column: code must support both names during transition
- Changing column type: cast + verify compatibility
- DROP COLUMN: remove from code first, wait 1 deploy, then drop

### DANGEROUS (plan maintenance window)

- Breaking schema changes without backward compat
- Data backfills on hot tables (>10M rows)
- Changing primary key / foreign key relationships

## Post-deploy validation

```bash
# Auth flow
curl -X POST https://api.vendhub.uz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998..."}'

# Check metrics are flowing
curl https://api.vendhub.uz/metrics | grep http_requests_total
```

## If deploy fails

See [rollback.md](./rollback.md)
