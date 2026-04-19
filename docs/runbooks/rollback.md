# Rollback Runbook

## When to roll back

- Error rate in Sentry > 5x baseline within 10 min of deploy
- Critical business flow broken (login, payment, order placement)
- Data corruption detected

**Do not roll back for:** isolated errors on one module (partial fix instead), minor UX regressions (hotfix forward).

## Rollback procedure (Railway)

### Option A — Previous deployment (fast, ~2 min)

1. Railway dashboard > `api` service > Deployments
2. Find last known-good deployment (check timestamp before incident)
3. Click "Redeploy" on that deployment
4. Verify `/health/ready` returns 200

### Option B — Git revert (slower, traceable)

```bash
cd ~/VendHub-OS
git revert <bad-commit-sha>
git push origin main
# CI runs, then auto-deploys
```

Use Option B when:

- Multiple services need coordinated rollback
- You want the rollback documented in git history
- The bad commit is on top of other good commits you want to keep

## Database migration rollback

**IMPORTANT:** Code rollback does not revert migrations. If a bad deploy ran a migration, rolling back the code leaves the DB in the new schema state.

### Safe scenarios (code rollback is enough)

- Migration added new optional column / index — old code ignores it
- Migration added new table — old code doesn't touch it

### Unsafe scenarios (need DB rollback too)

- Migration DROPped a column / table that old code depends on
- Migration changed column type incompatibly

```bash
# If you need to revert a migration:
cd ~/VendHub-OS/apps/api
pnpm migration:revert
# Confirm latest migration is reverted in pg_migrations table
```

## Post-rollback

- [ ] Document root cause
- [ ] Create issue for root cause fix
- [ ] If migration was reverted: plan forward path (fix + new migration)
- [ ] Add regression test so this specific failure mode is caught next time
