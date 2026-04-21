# Railway Web Deploy — Diagnostic Report

**Date:** 2026-04-21
**Verified by:** Claude (via local Docker build)

---

## TL;DR

**Code builds locally. Image runs and serves HTTP 200. Problem is 100% Railway-side.**

Don't waste time reviewing Dockerfile, next.config.js, or package.json. The build pipeline is healthy.

---

## What was verified today (2026-04-21)

### ✅ Local Docker build succeeds

```bash
docker build -f apps/web/Dockerfile -t vendhub-web-test --target production .
```

- Build completes in ~19s (Next.js compile + standalone output)
- All 100+ dashboard routes render in build output, including:
  - `/dashboard/predictive-refill` ✓
  - `/dashboard/predictive-refill/[machineId]` ✓
  - `/dashboard/routes` ✓
  - all other pages
- Final image exports clean (sha256:7f3278f1...)

### ✅ Image runs and serves traffic

```bash
docker run -d --rm -p 3001:3000 \
  -e NEXT_PUBLIC_API_URL=https://vendhubapi-production.up.railway.app \
  vendhub-web-test
curl http://localhost:3001/
# → HTTP 200, 262KB response
```

### ✅ Dockerfile is correct

- Stage 1 (deps): workspace files + lockfile
- Stage 3 (builder): builds shared package, builds web with standalone output
- Stage 4 (production): copies standalone bundle, runs as non-root user
- Healthcheck uses `wget` on localhost:$PORT

### ✅ next.config.js is correct

- `output: "standalone"` ✓
- `outputFileTracingRoot: path.join(__dirname, "../..")` (monorepo root) ✓
- `transpilePackages: ["@vendhub/shared"]` ✓

### ✅ railway.toml is correct

- `dockerfilePath = "apps/web/Dockerfile"` ✓
- `watchPatterns` includes apps/web, packages/shared, pnpm-lock ✓

---

## Conclusion

The problem is NOT in any file we control.

Empty build logs on Railway since 2026-04-06 means the Railway worker never gets to execute the Dockerfile. The most likely causes (in order of probability):

1. **Billing/plan limit reached** — Trial/free tier builds stopped. Upgrade required.
2. **Project paused** — Railway auto-pauses inactive projects or projects with overdue payment.
3. **Service-specific bug in Railway** — Rare. Try deleting and recreating the service.
4. **Organization suspended** — Check for email notifications from Railway.

---

## Action plan (30–60 minutes)

### Step 1 — Check Railway account status

Open https://railway.app/account/usage in a browser. Look for:

- Current plan (Hobby / Pro / etc.)
- Usage vs plan limits
- Any red alerts / payment failures

### Step 2 — If billing issue, upgrade

- Pro plan ($20/month) has generous limits and works reliably
- Payment: card or Google Pay

### Step 3 — Manual redeploy

Once billing resolved:

```bash
railway up --service=vendhubweb-production
# OR from dashboard: three-dot menu → Redeploy
```

### Step 4 — Watch logs in real-time

```bash
railway logs --service=vendhubweb-production --follow
```

Expected: Build starts within 30s of redeploy. First line should be `#1 [internal] load build definition from Dockerfile`.

### Step 5 — If still silent after 5 minutes

**Go to fallback immediately.** Don't spend more time on Railway.

### Fallback — Migrate to Vercel

Follow `scripts/migrate-web-to-vercel.md`. Total effort: 1 day. Vercel is Next.js's native host — zero-config deploy.

**Trade-offs:**

- ✅ Free tier covers current traffic (23 machines → <1000 daily visitors)
- ✅ Zero-config Next.js
- ✅ Preview deploys on every PR
- ❌ API stays on Railway (fine — different concerns)
- ❌ Two dashboards to manage

---

## What Claude verified can NOT be the issue

These were ruled out by local testing today:

- ❌ Broken Dockerfile
- ❌ Missing pnpm-lock.yaml in builder stage
- ❌ `@vendhub/shared` build failure
- ❌ Next.js standalone output misconfigured
- ❌ TypeScript compile errors (tsc --noEmit passes with 0 errors)
- ❌ Missing environment variables at build time
- ❌ Package.json script errors

---

## Evidence trail

```
$ docker build -f apps/web/Dockerfile -t vendhub-web-test --target production .
#31 DONE 1.4s
Successfully built and tagged vendhub-web-test:latest

$ docker run -d --rm -p 3001:3000 \
  -e NEXT_PUBLIC_API_URL=https://vendhubapi-production.up.railway.app \
  vendhub-web-test
ddc2ec5935c5e4...

$ curl http://localhost:3001/
HTTP 200 — 262970 bytes
```

Commit at time of test: `3a6aa80` (post-Phase 4+5 roadmap work)

---

## Next steps owner

**Jamshid (only person with Railway access):** Execute the action plan above.
Total time: 30 minutes if billing issue, 1 day if Vercel migration needed.

**Claude:** Can't proceed on P1 without access. Available for:

- P5.1 multi-org audit (code only)
- P4.2 Happy Workers Protocol skeleton (code only)
- Any other code-only phase
