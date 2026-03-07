# VendHub OS — Railway Deployment Guide

Complete step-by-step guide to deploy all VendHub OS services on Railway.

**Database:** Railway Postgres (managed) — no external DB needed
**Storage:** Supabase S3-compatible storage (`vendhub-media` bucket)

---

## Prerequisites

- [Railway CLI](https://docs.railway.app/develop/cli) installed: `npm install -g @railway/cli`
- Railway account linked: `railway login`
- Railway project ID: `8ed97e59-3bb0-4224-99ef-de6355057b15`

---

## Architecture Overview

```
Railway Project: VendHub OS
├── Service: api      │ Root: apps/api    │ NestJS, port 4000
├── Service: web      │ Root: apps/web    │ Next.js admin, port 3000
├── Service: client   │ Root: apps/client │ Vite SPA (nginx), dynamic PORT
├── Service: bot      │ Root: apps/bot    │ Telegram bot, no HTTP
├── Service: site     │ Root: apps/site   │ Next.js landing, port 3100
├── Service: Postgres │ (Railway managed) │ PostgreSQL
└── Service: Redis    │ (Railway managed) │ Redis 7
```

---

## Step 1: Run Database Migrations Locally

> **Why locally first?** Railway's `releaseCommand` runs migrations on every deploy. But for the very first deployment, you need the schema to exist before the API starts. Running migrations locally ensures the Railway Postgres database is ready.

### 1.1 Install dependencies

```bash
cd /path/to/VendHub-OS
pnpm install
```

### 1.2 Set DATABASE_URL in your .env

Use the Railway Postgres **public** URL (for local access):

```env
DATABASE_URL=postgresql://postgres:yZNVPRtNvBMDUNuDhikfGQitGCPfjFVw@trolley.proxy.rlwy.net:24266/railway
DB_SSL=false
```

### 1.3 Run the 50 TypeORM migrations

```bash
# From the monorepo root:
pnpm --filter @vendhub/api migration:run

# Or directly from apps/api:
cd apps/api
npx typeorm migration:run -d src/database/typeorm.config.ts
```

Expected output:

```
query: SELECT * FROM "migrations"
query: START TRANSACTION
Running migration InitialSchema1704067200000...
Running migration AddInventoryTables...
...
Running migration AddAgentBridgeTables...
query: COMMIT
Migration 50 completed successfully
```

### 1.4 Verify schema in Supabase

Open [Supabase Dashboard → Table Editor](https://app.supabase.com/project/gwrfhzvulvkudobtmkrs/editor) — you should see all VendHub tables.

---

## Step 2: Create Railway Services

Go to [Railway Dashboard](https://railway.app/project/8ed97e59-3bb0-4224-99ef-de6355057b15) and create one service per app.

### 2.1 Add Redis (managed)

1. Click **New** → **Database** → **Redis**
2. Railway provisions Redis automatically
3. Copy `REDIS_URL` from the Redis service variables (format: `redis://default:PASSWORD@HOST:PORT`)

> Your Redis is already configured:
>
> - Internal URL: `redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379`
> - Public URL: `redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@yamanote.proxy.rlwy.net:20435`

### 2.2 Create service: `api`

1. Click **New** → **GitHub Repo** → select your repo
2. Service name: `api`
3. **Settings → Root Directory**: `apps/api`
4. Railway auto-detects the `Dockerfile` in `apps/api/`
5. The `apps/api/railway.toml` is picked up automatically — migrations run via `releaseCommand`

### 2.3 Create service: `web`

1. Click **New** → **GitHub Repo** → select your repo
2. Service name: `web`
3. **Settings → Root Directory**: `apps/web`
4. Build command (auto-detected from package.json): `pnpm build`
5. Start command: `pnpm start`

### 2.4 Create service: `client`

1. Click **New** → **GitHub Repo** → select your repo
2. Service name: `client`
3. **Settings → Root Directory**: `apps/client`
4. Railway auto-detects the `Dockerfile` in `apps/client/`
5. nginx serves the Vite SPA build, port is set via `$PORT` env var

### 2.5 Create service: `bot`

1. Click **New** → **GitHub Repo** → select your repo
2. Service name: `bot`
3. **Settings → Root Directory**: `apps/bot`
4. Build command: `pnpm build`
5. Start command: `node dist/main.js`
6. No health check needed (no HTTP server)

### 2.6 Create service: `site`

1. Click **New** → **GitHub Repo** → select your repo
2. Service name: `site`
3. **Settings → Root Directory**: `apps/site`
4. Build command: `pnpm build`
5. Start command: `pnpm start`

---

## Step 3: Configure Environment Variables

Set these in **Railway Dashboard → Service → Variables** for each service.

### Shared variables (set on all services)

```
NODE_ENV=production
APP_NAME=VendHub
```

### API service variables (apps/api)

Set all variables from `RAILWAY_ENV_VARS.md` in this directory.

**Critical database variables (Railway Postgres):**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false
DB_POOL_SIZE=10
```

> Use Railway variable references (`${{Postgres.*}}`) — Railway resolves them automatically. No SSL needed on internal network.

**Critical Redis variables:**

```
REDIS_URL=redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=gWQddoaowhHvWQqfTFauXhPqVHrkIwnX
```

> ⚠️ Use `redis.railway.internal` (private network) not the public URL — it's faster and doesn't count against Railway bandwidth.

**JWT / Auth:**

```
JWT_SECRET=LWE3U8dXiAXhu1icNVI5mwZA/fH8NyT8ZidK11f2uVvCKM1m5xs+oANmQz+qKDGJHbZMC57RQlUwPjM9nWsz2A==
JWT_REFRESH_SECRET=RbFaf1MMVjEhygv5Aib3YW/wbtPYasrgkjo0XrfBiUcM+Tni++dmnVnO9lJH5B8hPZgo0AHF6Ue5gpds9Tjkdg==
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=m+C5wjEIgg0C9bnSXHuyOq8UoZONhl6Dcj44gFPkE8Xk3UbPe+4hHTij74NT5CWsfVNYrG+Swx/jLje1Nsk9ZA==
```

**API config:**

```
API_PORT=4000
API_PREFIX=api/v1
APP_URL=https://web-production-XXXX.up.railway.app
API_URL=https://api-production-XXXX.up.railway.app
CORS_ORIGINS=https://web-production-XXXX.up.railway.app,https://client-production-XXXX.up.railway.app
```

> Replace `XXXX` with the actual Railway-generated subdomain after first deploy.

### Web service variables (apps/web)

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-production-XXXX.up.railway.app/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://gwrfhzvulvkudobtmkrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cmZoenZ1bHZrdWRvYnRta3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg4ODIsImV4cCI6MjA4ODI3NDg4Mn0.mYp4ZbTsPcF2taoNcFq6EgNYYVtQnGhB_ZymUYpnXsM
PORT=3000
```

### Client service variables (apps/client)

```
VITE_API_URL=https://api-production-XXXX.up.railway.app/api/v1
VITE_SUPABASE_URL=https://gwrfhzvulvkudobtmkrs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cmZoenZ1bHZrdWRvYnRta3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg4ODIsImV4cCI6MjA4ODI3NDg4Mn0.mYp4ZbTsPcF2taoNcFq6EgNYYVtQnGhB_ZymUYpnXsM
PORT=5173
```

### Bot service variables (apps/bot)

```
NODE_ENV=production
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BOT_API_TOKEN=your_bot_service_account_jwt
API_URL=https://vendhubapi-production.up.railway.app/api/v1
REDIS_URL=redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379
```

> **BOT_API_TOKEN**: Required for the bot to authenticate API calls. Generate a long-lived JWT for the bot service account via the admin panel or by running `pnpm --filter api cli:create-bot-token`.

### Site service variables (apps/site)

```
NODE_ENV=production
PORT=3100
```

---

## Step 4: Supabase Storage Bucket (for file uploads only)

> Supabase is used **only for S3-compatible file storage** — the database is Railway Postgres.

The API uses `vendhub-media` for storing images, reports, and uploads.

1. Go to [Supabase Dashboard → Storage](https://app.supabase.com/project/gwrfhzvulvkudobtmkrs/storage/buckets)
2. Click **New bucket**
3. Name: `vendhub-media`
4. Public: **No** (access controlled via signed URLs)
5. File size limit: `10 MB` (matches `MAX_FILE_SIZE=10485760` in .env)

S3-compatible access is pre-configured in your `.env`:

```
STORAGE_ENDPOINT=https://gwrfhzvulvkudobtmkrs.storage.supabase.co/storage/v1/s3
STORAGE_ACCESS_KEY=0767113015174f7ff67dba39c556b64a
STORAGE_SECRET_KEY=e04dc57e16741e0d5af98e706fd1ccd4322eebe4cf40e6c3b68d8f62fa2fd594
STORAGE_BUCKET=vendhub-media
STORAGE_REGION=ap-southeast-1
```

---

## Step 5: Set Up Custom Domains (Optional)

In Railway Dashboard → Service → Settings → Networking:

| Service | Suggested domain   |
| ------- | ------------------ |
| api     | `api.vendhub.uz`   |
| web     | `admin.vendhub.uz` |
| client  | `app.vendhub.uz`   |
| site    | `vendhub.uz`       |
| bot     | (no domain needed) |

Update `CORS_ORIGINS` and `APP_URL` / `API_URL` env vars after setting custom domains.

---

## Step 6: Deploy and Verify

### 6.1 Trigger first deployment

Push to `main` branch — Railway auto-deploys all services.

```bash
git push origin main
```

### 6.2 Monitor migration logs (API service)

In Railway Dashboard → `api` service → **Deployments** → click the deploy → **Build Logs**:

```
✓ Build complete
Running release command...
Migrations run: 50
Release command succeeded
Starting server...
NestJS application started on port 4000
```

### 6.3 Verify health check

```bash
curl https://api-production-XXXX.up.railway.app/api/v1/health
# Expected: { "status": "ok", "database": "connected", "redis": "connected" }
```

### 6.4 Verify Swagger docs

Open: `https://api-production-XXXX.up.railway.app/docs`

---

## Step 7: Seed Initial Data (First Deploy Only)

After migrations run, seed the database with initial data:

```bash
# Run from your local machine (uses DATABASE_DIRECT_URL from .env):
pnpm --filter @vendhub/api db:seed
```

This creates the default organization, admin user, and lookup tables.

---

## Migration Workflow Going Forward

Every time you push code with new migrations:

1. `git push origin main` → Railway triggers deploy
2. Railway builds Docker image
3. `releaseCommand` runs: TypeORM applies only NEW migrations (idempotent)
4. Container starts with up-to-date schema
5. Zero-downtime: old container serves traffic until new one passes health check

To generate a new migration after changing entities:

```bash
pnpm --filter @vendhub/api migration:generate -- -n DescriptiveName
# e.g.: migration:generate -- -n AddMachineStatusHistory
```

---

## Troubleshooting

### Migration fails: "relation already exists"

The migration was partially applied. Revert and re-run:

```bash
pnpm --filter @vendhub/api migration:revert
pnpm --filter @vendhub/api migration:run
```

### SSL error: "self-signed certificate in certificate chain"

Set `DB_SSL=false` for Railway internal connections (no SSL needed on private network).

### Redis connection refused

The `redis.railway.internal` hostname only works within Railway's private network. For local development, use the public Redis URL from Railway dashboard.

### API health check fails

Check build logs for TypeScript compilation errors:

```bash
cd apps/api && npx tsc --noEmit
```

### Local DB connection fails

Use the Railway Postgres **public** URL for local access:

```
postgresql://postgres:yZNVPRtNvBMDUNuDhikfGQitGCPfjFVw@trolley.proxy.rlwy.net:24266/railway
```

The `postgres.railway.internal` hostname only resolves inside Railway's network.

---

## Quick Reference

| URL                                                                                       | Description              |
| ----------------------------------------------------------------------------------------- | ------------------------ |
| [Railway Dashboard](https://railway.app/project/8ed97e59-3bb0-4224-99ef-de6355057b15)     | Services and deployments |
| [Supabase Storage](https://app.supabase.com/project/gwrfhzvulvkudobtmkrs/storage/buckets) | File storage buckets     |

---

_Generated: 2026-03-06 | VendHub OS deployment to Railway + Supabase_
