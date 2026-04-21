# Web App — Migrate from Railway to Vercel (Fallback)

**When to use:** Railway web deploy can't be fixed in <4 hours of P1.1 diagnosis.

**Why Vercel:** Next.js is Vercel's native framework. Zero-config monorepo support. Built-in preview deployments.

## Step 1 — Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

## Step 2 — Create vercel.json at repo root

```json
{
  "buildCommand": "pnpm --filter @vendhub/shared build && pnpm --filter @vendhub/web build",
  "devCommand": "pnpm --filter @vendhub/web dev",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "rootDirectory": "."
}
```

## Step 3 — Link and deploy

```bash
cd /Users/js/VendHub-OS
vercel link
# Choose: Create new project, name: vendhub-web
# Root: keep at repo root
```

## Step 4 — Configure environment variables

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Paste: https://vendhubapi-production.up.railway.app
```

## Step 5 — Deploy to preview first

```bash
vercel
```

Verify preview URL loads `/dashboard/predictive-refill`.

## Step 6 — Promote to production

```bash
vercel --prod
```

## Step 7 — Update DNS (when ready)

In Vercel dashboard → Project → Domains:

- Add `app.vendhub.uz` (or whatever operators use)
- Update DNS CNAME to point at Vercel

## Step 8 — Decommission Railway web service

Only after Vercel is verified stable for 48h:

- Railway Dashboard → vendhubweb-production → Settings → Delete Service

## API stays on Railway

API (`vendhubapi-production`) is NestJS — stays on Railway because:

- Vercel's serverless model fights with NestJS's persistent WebSocket/BullMQ workers
- Railway provides managed PostgreSQL + Redis the API depends on
- Bot polling needs long-lived connections

## Rollback plan

If Vercel has issues within 48h:

- Vercel → Project → delete
- Re-enable Railway web service
- Update DNS back
