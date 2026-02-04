# VendHub OS -- Deployment Runbook

> Comprehensive, step-by-step guide for deploying and operating VendHub OS in development, staging, and production environments.

**Last Updated:** 2026-02-03
**Maintainer:** VendHub DevOps Team (devops@vendhub.uz)
**Version:** 1.0.0

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Setup](#2-environment-setup)
3. [Deployment Procedures](#3-deployment-procedures)
   - 3.1 [Docker Compose (Development/Staging)](#31-docker-compose-developmentstaging)
   - 3.2 [Kubernetes (Production)](#32-kubernetes-production)
   - 3.3 [Database Migration](#33-database-migration)
4. [Post-Deployment Verification](#4-post-deployment-verification)
5. [Rollback Procedures](#5-rollback-procedures)
6. [Monitoring and Alerting](#6-monitoring-and-alerting)
7. [Backup and Recovery](#7-backup-and-recovery)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pre-Deployment Checklist

Complete every item before initiating a deployment. Do not skip steps.

### 1.1 Code Quality Gates

```bash
# Run from the repository root: vendhub-unified/

# 1. TypeScript compilation -- must produce zero errors
pnpm type-check

# 2. Linting -- must produce zero warnings
pnpm lint

# 3. Unit tests -- all must pass
pnpm test:unit

# 4. Build all apps -- confirms production bundles compile
pnpm build
```

### 1.2 Code Review

- [ ] Pull request approved by at least one reviewer
- [ ] CI pipeline green on the PR branch (lint, type-check, unit tests, build, integration tests, E2E tests, Docker build, Trivy scan)
- [ ] No unresolved review comments
- [ ] Conventional Commit messages used (`feat:`, `fix:`, `docs:`, etc.)

### 1.3 Database Migration

- [ ] If schema changes exist, migration file is present in `apps/api/src/database/migrations/`
- [ ] Migration tested locally against a fresh database
- [ ] Migration tested locally against a copy of the current production/staging database
- [ ] Rollback migration (`migration:revert`) tested

### 1.4 Environment Configuration

- [ ] All new environment variables documented in `.env.example`
- [ ] Required secrets set in the target environment (staging or production)
- [ ] No plaintext secrets committed to the repository
- [ ] Feature flags reviewed (`FEATURE_*` variables)

### 1.5 Infrastructure

- [ ] Docker images build successfully with the `production` target
- [ ] Trivy vulnerability scan passes with no CRITICAL/HIGH findings
- [ ] Resource limits reviewed if workload characteristics changed
- [ ] SSL certificates valid and not expiring within 30 days

---

## 2. Environment Setup

### 2.1 Required Services

| Service | Version | Purpose |
|---------|---------|---------|
| PostgreSQL | 16 (Alpine) | Primary relational database |
| Redis | 7 (Alpine) | Cache, sessions, BullMQ queues |
| Node.js | 20 LTS | Runtime for all apps |
| pnpm | 9.15+ | Package manager |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |

### 2.2 Environment Variables Reference

All variables are defined in `.env.example` at the repository root. Copy it and fill in real values:

```bash
cp .env.example .env
```

#### Database

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DB_HOST` | `localhost` | Yes | PostgreSQL hostname (use `postgres` inside Docker) |
| `DB_PORT` | `5432` | Yes | PostgreSQL port |
| `DB_NAME` | `vendhub` | Yes | Database name |
| `DB_USER` | `vendhub` | Yes | Database user |
| `DB_PASSWORD` | `vendhub_secret` | Yes | Database password (change in production) |
| `DB_SYNCHRONIZE` | `false` | No | TypeORM auto-sync; NEVER `true` in production |
| `DB_LOGGING` | `false` | No | SQL query logging |
| `DB_POOL_SIZE` | `10` | No | Connection pool size |
| `DB_SSL` | `false` | No | Enable SSL for DB connections |
| `DATABASE_URL` | (constructed) | No | Full connection string override |

#### Redis

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `REDIS_HOST` | `localhost` | Yes | Redis hostname (use `redis` inside Docker) |
| `REDIS_PORT` | `6379` | Yes | Redis port |
| `REDIS_PASSWORD` | (empty) | No | Redis password (set in production) |

#### JWT / Authentication

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | -- | Yes | Minimum 32 characters. Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | -- | Yes | Separate secret for refresh tokens |
| `JWT_EXPIRES_IN` | `15m` | No | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No | Refresh token TTL |
| `TOTP_ISSUER` | `VendHub` | No | 2FA TOTP issuer name |

#### Payments (Uzbekistan)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PAYME_MERCHANT_ID` | -- | Conditional | Payme merchant ID |
| `PAYME_SECRET_KEY` | -- | Conditional | Payme secret key |
| `PAYME_TEST_MODE` | `true` | No | Use Payme sandbox |
| `CLICK_MERCHANT_ID` | -- | Conditional | Click merchant ID |
| `CLICK_SERVICE_ID` | -- | Conditional | Click service ID |
| `CLICK_SECRET_KEY` | -- | Conditional | Click secret key |
| `UZUM_MERCHANT_ID` | -- | Conditional | Uzum Bank merchant ID |
| `UZUM_SECRET_KEY` | -- | Conditional | Uzum Bank secret key |

#### Storage (MinIO / S3)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `STORAGE_ENDPOINT` | `localhost:9000` | Yes | S3/MinIO endpoint (use `minio:9000` inside Docker) |
| `STORAGE_ACCESS_KEY` | `minioadmin` | Yes | S3 access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | Yes | S3 secret key (change in production) |
| `STORAGE_BUCKET` | `vendhub` | Yes | Bucket name |
| `STORAGE_REGION` | `uz-tashkent-1` | No | S3 region |
| `STORAGE_USE_SSL` | `false` | No | Enable SSL for S3 |
| `MAX_FILE_SIZE` | `10485760` | No | Max upload in bytes (10 MB) |

#### Telegram Bot

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | -- | Conditional | Token from @BotFather |
| `TELEGRAM_WEBHOOK_URL` | -- | Conditional | Public webhook URL |

#### SMS (Uzbekistan)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SMS_PROVIDER` | `eskiz` | Conditional | Provider: `eskiz`, `playmobile`, `smsuz` |
| `SMS_API_KEY` | -- | Conditional | SMS provider API key |
| `SMS_SENDER_ID` | `VendHub` | No | SMS sender ID |

#### Email (SMTP)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SMTP_HOST` | -- | Conditional | SMTP server |
| `SMTP_PORT` | `587` | No | SMTP port |
| `SMTP_USER` | -- | Conditional | SMTP username |
| `SMTP_PASSWORD` | -- | Conditional | SMTP password |
| `SMTP_FROM` | `noreply@vendhub.uz` | No | Sender address |

#### OFD / Fiscal (Uzbekistan Tax)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `OFD_ENABLED` | `false` | No | Enable fiscal integration |
| `OFD_PROVIDER` | `soliq` | No | OFD provider |
| `OFD_API_URL` | -- | Conditional | OFD API endpoint |
| `OFD_API_KEY` | -- | Conditional | OFD API key |
| `OFD_INN` | -- | Conditional | Organization tax ID |

#### Monitoring

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SENTRY_DSN` | -- | No | Sentry error tracking DSN |
| `LOG_LEVEL` | `debug` | No | Log level (`debug`, `info`, `warn`, `error`) |
| `GRAFANA_ADMIN_USER` | `admin` | No | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | `admin` | No | Grafana admin password (change in production) |

#### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_TELEGRAM_BOT` | `true` | Enable Telegram bot |
| `FEATURE_SMS_NOTIFICATIONS` | `true` | Enable SMS sending |
| `FEATURE_EMAIL_NOTIFICATIONS` | `true` | Enable email sending |
| `FEATURE_PUSH_NOTIFICATIONS` | `false` | Enable push notifications |
| `FEATURE_OFD_INTEGRATION` | `false` | Enable fiscal receipts |
| `FEATURE_PAYMENT_INTEGRATION` | `true` | Enable payment processing |
| `FEATURE_AI_IMPORT` | `true` | Enable AI-powered import |
| `FEATURE_AI_ANALYSIS` | `true` | Enable AI analytics |

### 2.3 Port Mapping

| Service | Internal Port | External Port (default) | URL |
|---------|--------------|------------------------|-----|
| API (NestJS) | 4000 | 4000 | `http://localhost:4000` |
| Web (Next.js Admin) | 3000 | 3000 | `http://localhost:3000` |
| Client (Vite PWA) | 5173 | 5173 | `http://localhost:5173` |
| PostgreSQL | 5432 | 5432 | -- |
| Redis | 6379 | 6379 | -- |
| MinIO API | 9000 | 9000 | `http://localhost:9000` |
| MinIO Console | 9001 | 9001 | `http://localhost:9001` |
| Nginx HTTP | 80 | 80 | -- |
| Nginx HTTPS | 443 | 443 | -- |
| Adminer (dev profile) | 8080 | 8080 | `http://localhost:8080` |
| Redis Commander (dev profile) | 8081 | 8081 | `http://localhost:8081` |
| BullMQ Board (dev profile) | 3000 | 3030 | `http://localhost:3030` |
| Prometheus | 9090 | 9090 | `http://localhost:9090` |
| Grafana | 3000 | 3001 | `http://localhost:3001` |
| Alertmanager | 9093 | 9093 | `http://localhost:9093` |
| Loki | 3100 | 3100 | -- |
| Node Exporter | 9100 | 9100 | -- |
| PostgreSQL Exporter | 9187 | 9187 | -- |
| Redis Exporter | 9121 | 9121 | -- |
| cAdvisor | 8080 | 8080 | -- |

### 2.4 Production Domain Mapping

| Domain | Service | Description |
|--------|---------|-------------|
| `api.vendhub.uz` | NestJS API | Backend REST + WebSocket |
| `admin.vendhub.uz` | Next.js Web | Admin dashboard |
| `app.vendhub.uz` | Vite Client | Telegram Mini App / PWA |
| `bot.vendhub.uz` | Telegram Bot | Webhook endpoint |
| `ws.vendhub.uz` | WebSocket | Dedicated WS endpoint |

---

## 3. Deployment Procedures

### 3.1 Docker Compose (Development/Staging)

#### 3.1.1 First-Time Setup

```bash
cd vendhub-unified

# 1. Copy and configure environment
cp .env.example .env
# Edit .env with appropriate values for the target environment

# 2. Start infrastructure services first
docker compose up -d postgres redis minio

# 3. Wait for healthy state
docker compose ps   # All three should show "healthy"

# 4. Start application services
docker compose up -d api web client

# 5. Run database migrations
docker compose exec api pnpm migration:run

# 6. Seed initial data (development/staging only)
docker compose exec api pnpm db:seed
```

#### 3.1.2 With Development Tools

```bash
# Start with dev profile (adds Adminer, Redis Commander, BullMQ Board)
COMPOSE_PROFILES=dev docker compose up -d
```

#### 3.1.3 With Production Services (Nginx + SSL)

```bash
# Start with production profile (adds Nginx reverse proxy + Certbot)
COMPOSE_PROFILES=production docker compose up -d
```

#### 3.1.4 Updating a Running Deployment

```bash
cd vendhub-unified

# 1. Pull latest code
git pull origin main

# 2. Rebuild changed services
docker compose build api web client

# 3. Rolling restart (zero-downtime for services with health checks)
docker compose up -d --no-deps api
docker compose up -d --no-deps web
docker compose up -d --no-deps client

# 4. Run any new migrations
docker compose exec api pnpm migration:run

# 5. Verify health
curl -s http://localhost:4000/health | jq .
```

#### 3.1.5 Verify All Services

```bash
# Check container status
docker compose ps

# Check logs for errors
docker compose logs --tail=50 api
docker compose logs --tail=50 web
docker compose logs --tail=50 postgres

# Health check endpoints
curl -s http://localhost:4000/health                   # Basic check
curl -s http://localhost:4000/health/live              # Liveness probe
curl -s http://localhost:4000/health/ready             # Readiness probe
curl -s http://localhost:4000/health/detailed | jq .   # Full component status
curl -s http://localhost:4000/health/version  | jq .   # Build and version info
```

---

### 3.2 Kubernetes (Production)

#### 3.2.1 Prerequisites

- Kubernetes cluster 1.28+ with `kubectl` configured
- Helm 3.12+ installed
- `ingress-nginx` controller installed in the cluster
- `cert-manager` installed for TLS certificates
- Docker images pushed to `docker.io/vendhub/` registry

#### 3.2.2 Deploy with Kustomize

```bash
# Staging
kubectl apply -k infrastructure/k8s/overlays/staging

# Production
kubectl apply -k infrastructure/k8s/overlays/production

# Verify rollout
kubectl -n vendhub rollout status deployment/vendhub-api
kubectl -n vendhub rollout status deployment/vendhub-web
kubectl -n vendhub rollout status deployment/vendhub-client
```

#### 3.2.3 Deploy with Helm

```bash
# First, create the namespace
kubectl create namespace vendhub

# Create secrets (do this once, or use a secrets manager)
kubectl -n vendhub create secret generic vendhub-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
  --from-literal=DB_PASSWORD="<strong-password>" \
  --from-literal=REDIS_PASSWORD="<strong-password>" \
  --from-literal=TELEGRAM_BOT_TOKEN="<bot-token>" \
  --from-literal=PAYME_SECRET_KEY="<payme-secret>" \
  --from-literal=CLICK_SECRET_KEY="<click-secret>"

# Install / upgrade the chart
helm upgrade --install vendhub ./infrastructure/helm/vendhub \
  --namespace vendhub \
  --set api.image.tag="$(git rev-parse --short HEAD)" \
  --set web.image.tag="$(git rev-parse --short HEAD)" \
  --set client.image.tag="$(git rev-parse --short HEAD)" \
  --wait --timeout 10m

# Verify
helm -n vendhub status vendhub
kubectl -n vendhub get pods
```

#### 3.2.4 Rolling Update Strategy

The API Deployment is configured with:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Add one extra pod during update
    maxUnavailable: 0  # Never reduce below desired count
```

Combined with a `preStop` hook (`sleep 15`) to allow in-flight requests to drain before the pod terminates.

#### 3.2.5 Resource Limits

**Base (Staging):**

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|------------|-----------|---------------|-------------|
| API | 100m | 1000m | 256Mi | 1Gi |
| Web | 50m | 500m | 128Mi | 512Mi |
| Client | 25m | 200m | 64Mi | 256Mi |
| Bot | 50m | 500m | 128Mi | 512Mi |

**Production Overlay:**

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|------------|-----------|---------------|-------------|
| API | 250m | 2000m | 512Mi | 2Gi |
| PostgreSQL | 1000m | 4000m | 2Gi | 8Gi |

#### 3.2.6 HPA Configuration

The API Horizontal Pod Autoscaler:

| Parameter | Staging | Production |
|-----------|---------|------------|
| Min Replicas | 2 | 3 |
| Max Replicas | 10 | 20 |
| CPU Target | 70% | 70% |
| Memory Target | 80% | 80% |
| Scale-Down Window | 300s | 300s |
| Scale-Up Window | 60s | 60s |

Pod Disruption Budget ensures at least 1 pod remains available during voluntary disruptions.

```bash
# Check HPA status
kubectl -n vendhub get hpa
kubectl -n vendhub describe hpa vendhub-api
```

---

### 3.3 Database Migration

#### 3.3.1 Pre-Migration Backup

**Always back up the database before running migrations in staging or production.**

```bash
# Docker Compose environment
docker compose exec postgres pg_dump \
  -U vendhub \
  -d vendhub \
  --format=custom \
  --file=/tmp/vendhub_pre_migration_$(date +%Y%m%d_%H%M%S).dump

# Copy the dump out of the container
docker compose cp postgres:/tmp/vendhub_pre_migration_*.dump ./backups/

# Kubernetes environment
kubectl -n vendhub exec deploy/postgres -- pg_dump \
  -U vendhub \
  -d vendhub \
  --format=custom \
  > ./backups/vendhub_pre_migration_$(date +%Y%m%d_%H%M%S).dump
```

#### 3.3.2 Run Migrations

```bash
# Docker Compose
docker compose exec api pnpm migration:run

# Kubernetes
kubectl -n vendhub exec deploy/vendhub-api -- pnpm migration:run

# Local development (direct)
pnpm --filter api migration:run
```

#### 3.3.3 Verify Migration Success

```bash
# Check TypeORM migration table
docker compose exec postgres psql -U vendhub -d vendhub -c \
  "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"

# Confirm no pending migrations
docker compose exec api pnpm migration:show
```

#### 3.3.4 Rollback Migration

```bash
# Revert the last migration
docker compose exec api pnpm migration:revert

# Verify the revert
docker compose exec postgres psql -U vendhub -d vendhub -c \
  "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"
```

#### 3.3.5 Restore from Backup (Emergency)

```bash
# Stop the API to prevent writes
docker compose stop api web client

# Restore the database
docker compose exec -T postgres pg_restore \
  -U vendhub \
  -d vendhub \
  --clean \
  --if-exists \
  < ./backups/vendhub_pre_migration_YYYYMMDD_HHMMSS.dump

# Restart services
docker compose start api web client
```

---

## 4. Post-Deployment Verification

### 4.1 Health Check URLs

Run these checks immediately after every deployment:

| Check | URL | Expected |
|-------|-----|----------|
| Basic Health | `GET /health` | `{ "status": "ok", "timestamp": "..." }` |
| Liveness | `GET /health/live` | `{ "status": "ok", "info": { "memory_heap": { "status": "up" } } }` |
| Readiness | `GET /health/ready` | `{ "status": "ok", "info": { "database": { "status": "up" }, "redis": { "status": "up" } } }` |
| Detailed | `GET /health/detailed` | All components `"up"`: database, redis, memory_heap, memory_rss, disk |
| Version | `GET /health/version` | Correct `version`, `environment`, `nodeVersion`, `uptime` |
| Swagger | `GET /docs` | Swagger UI loads (disabled in production by default) |

```bash
# Quick verification script
API_URL="http://localhost:4000"  # or https://api.vendhub.uz for production

echo "=== Basic Health ==="
curl -sf "$API_URL/health" | jq .

echo "=== Liveness ==="
curl -sf "$API_URL/health/live" | jq .

echo "=== Readiness ==="
curl -sf "$API_URL/health/ready" | jq .

echo "=== Detailed Health ==="
curl -sf "$API_URL/health/detailed" | jq .

echo "=== Version ==="
curl -sf "$API_URL/health/version" | jq .
```

### 4.2 Smoke Test Checklist

Perform these functional checks after deployment:

- [ ] **Login:** `POST /api/v1/auth/login` with admin credentials returns access token
- [ ] **2FA Verify:** `POST /api/v1/auth/2fa/verify` completes authentication flow
- [ ] **List Machines:** `GET /api/v1/machines` returns machine list (with Bearer token)
- [ ] **Create Task:** `POST /api/v1/tasks` creates a task successfully
- [ ] **Inventory Check:** `GET /api/v1/inventory/warehouse` returns warehouse stock
- [ ] **WebSocket:** Connect to `/socket.io/` and subscribe to machine updates
- [ ] **Admin Panel:** `https://admin.vendhub.uz` loads dashboard
- [ ] **Client App:** `https://app.vendhub.uz` loads Mini App
- [ ] **Telegram Bot:** Send `/start` to the bot and confirm response

### 4.3 Monitoring Dashboard Check

- [ ] Grafana VendHub Overview dashboard shows all panels green at `http://localhost:3001`
- [ ] Prometheus targets all UP at `http://localhost:9090/targets`
- [ ] No firing alerts at `http://localhost:9093/#/alerts`
- [ ] API request rate visible in Grafana

### 4.4 Log Verification

```bash
# Docker Compose -- check for errors in the last 5 minutes
docker compose logs --since 5m api | grep -i "error\|exception\|fatal"
docker compose logs --since 5m web | grep -i "error\|exception\|fatal"
docker compose logs --since 5m postgres | grep -i "error\|fatal"

# Kubernetes
kubectl -n vendhub logs -l app=vendhub-api --since=5m | grep -i "error\|exception\|fatal"
```

---

## 5. Rollback Procedures

### 5.1 Docker Compose Rollback

```bash
# 1. Identify the previous working commit
git log --oneline -10

# 2. Checkout the previous version
git checkout <previous-commit-hash>

# 3. Rebuild and restart
docker compose build api web client
docker compose up -d --no-deps api web client

# 4. Revert migration if needed (see Section 3.3.4)
docker compose exec api pnpm migration:revert

# 5. Verify health
curl -sf http://localhost:4000/health/detailed | jq .
```

### 5.2 Kubernetes Rollback

#### Helm Rollback

```bash
# List release history
helm -n vendhub history vendhub

# Rollback to previous revision
helm -n vendhub rollback vendhub <revision-number>

# Verify
kubectl -n vendhub rollout status deployment/vendhub-api
```

#### Kustomize Rollback

```bash
# Rollback a specific deployment
kubectl -n vendhub rollout undo deployment/vendhub-api

# Rollback to a specific revision
kubectl -n vendhub rollout undo deployment/vendhub-api --to-revision=<N>

# Check rollout history
kubectl -n vendhub rollout history deployment/vendhub-api
```

### 5.3 Database Rollback

```bash
# Revert one migration at a time
docker compose exec api pnpm migration:revert

# If multiple migrations need reverting, run the command multiple times:
docker compose exec api pnpm migration:revert  # reverts most recent
docker compose exec api pnpm migration:revert  # reverts next one

# For a full restore from backup (emergency):
# See Section 3.3.5
```

### 5.4 Emergency Procedures

#### Total Service Failure

```bash
# 1. Immediately restore from last known good backup
# 2. Switch to maintenance mode (if nginx is running)
# Replace upstream with a static maintenance page

# 3. Stop application services
docker compose stop api web client

# 4. Verify infrastructure is healthy
docker compose exec postgres pg_isready -U vendhub
docker compose exec redis redis-cli ping

# 5. Restore database from last backup
docker compose exec -T postgres pg_restore \
  -U vendhub -d vendhub --clean --if-exists \
  < ./backups/<latest-backup>.dump

# 6. Reset Redis if needed
docker compose exec redis redis-cli FLUSHALL

# 7. Deploy last known good version
git checkout <last-known-good-tag>
docker compose build api web client
docker compose up -d api web client

# 8. Run migrations for that version
docker compose exec api pnpm migration:run

# 9. Verify
curl -sf http://localhost:4000/health/detailed | jq .
```

#### Single Service Failure (API)

```bash
# Restart the failed service
docker compose restart api

# If restart fails, check logs
docker compose logs --tail=100 api

# Rebuild and restart
docker compose build api
docker compose up -d --no-deps api
```

---

## 6. Monitoring and Alerting

### 6.1 Start the Monitoring Stack

```bash
# Start from the monitoring directory
docker compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d

# Verify all monitoring services
docker compose -f infrastructure/monitoring/docker-compose.monitoring.yml ps
```

Monitoring services:

| Service | Port | Access URL |
|---------|------|------------|
| Prometheus | 9090 | `http://localhost:9090` |
| Grafana | 3001 | `http://localhost:3001` (admin/admin) |
| Alertmanager | 9093 | `http://localhost:9093` |
| Loki | 3100 | -- (accessed via Grafana) |
| Node Exporter | 9100 | -- |
| cAdvisor | 8080 | -- |
| PostgreSQL Exporter | 9187 | -- |
| Redis Exporter | 9121 | -- |

### 6.2 Prometheus Metrics Endpoint

The API exposes metrics at `GET /metrics` (port 4000). Prometheus scrapes this endpoint every 10 seconds.

Verify the scrape targets:

```
http://localhost:9090/targets
```

All targets should show `UP`:
- `vendhub-api` (api:4000/metrics)
- `vendhub-web` (web:3000/api/metrics)
- `vendhub-bot` (bot:3001/metrics)
- `postgres` (postgres-exporter:9187)
- `redis` (redis-exporter:9121)
- `node` (node-exporter:9100)
- `nginx` (nginx-exporter:9113)
- `cadvisor` (cadvisor:8080)

### 6.3 Key Metrics to Watch

#### Application Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `http_request_duration_seconds` (p95) | API latency | > 2s for 5m | -- |
| `http_requests_total{status=~"5.."}` | Error rate (5xx / total) | > 5% for 5m | > 20% for 2m |
| `up{job="vendhub-api"}` | API availability | -- | == 0 for 1m |
| `up{job="vendhub-web"}` | Web availability | -- | == 0 for 1m |
| `up{job="vendhub-bot"}` | Bot availability | == 0 for 2m | -- |

#### Infrastructure Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| CPU usage | Node CPU utilization | > 80% for 5m | -- |
| Memory usage | Node memory utilization | > 85% for 5m | -- |
| Disk usage | Filesystem utilization | > 80% for 10m | > 95% for 5m |

#### Database Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `pg_up` | PostgreSQL availability | -- | == 0 for 1m |
| `pg_stat_activity_count / pg_settings_max_connections` | Connection pool usage | > 80% for 5m | -- |
| `pg_stat_activity_max_tx_duration{state="active"}` | Long-running queries | > 60s for 5m | -- |
| `redis_up` | Redis availability | -- | == 0 for 1m |
| `redis_memory_used_bytes / redis_memory_max_bytes` | Redis memory usage | > 80% for 5m | -- |

#### Business Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `vendhub_orders_total` | Order volume (increase per hour) | == 0 for 30m | -- |
| `vendhub_machine_status{status="offline"}` | Offline machines | == 1 for 15m | -- |
| `vendhub_machine_inventory_level` | Machine inventory | < 10 for 30m | -- |
| `vendhub_payments_total{status="failed"}` / total | Payment failure rate | > 10% for 10m | -- |

### 6.4 Alert Routing

Alerts are routed through Alertmanager to three channels based on severity:

| Severity | Receiver | Channels | Repeat Interval |
|----------|----------|----------|----------------|
| Critical | `critical-receiver` | Email (devops + CTO), Telegram (critical chat), Slack (#alerts-critical) | 1 hour |
| Warning | `warning-receiver` | Telegram (alerts chat), Slack (#alerts-warning) | 4 hours |
| Business | `business-receiver` | Telegram (business chat) | 2 hours |

Email destinations:
- Default: `devops@vendhub.uz`
- Critical: `devops@vendhub.uz`, `cto@vendhub.uz`

### 6.5 Grafana Dashboards

Pre-provisioned dashboards:

| Dashboard | File | Description |
|-----------|------|-------------|
| VendHub Overview | `vendhub-overview.json` | Request rate, latency, error rate, resource usage |

Access at: `http://localhost:3001` (default credentials: `admin` / `admin`).

Datasources (auto-provisioned):
- Prometheus: `http://prometheus:9090`
- Loki: `http://loki:3100`

---

## 7. Backup and Recovery

### 7.1 Database Backup (PostgreSQL)

#### Manual Backup

```bash
# Docker Compose
docker compose exec postgres pg_dump \
  -U vendhub \
  -d vendhub \
  --format=custom \
  --compress=9 \
  --file=/tmp/vendhub_$(date +%Y%m%d_%H%M%S).dump

docker compose cp postgres:/tmp/vendhub_*.dump ./backups/

# Direct (if psql is available on the host)
pg_dump -h localhost -U vendhub -d vendhub \
  --format=custom --compress=9 \
  > ./backups/vendhub_$(date +%Y%m%d_%H%M%S).dump
```

#### Automated Backup Schedule

Set `BACKUP_ENABLED=true` and `BACKUP_CRON="0 2 * * *"` in `.env` to run daily backups at 02:00 UTC.

For production, use a cron job on the host or a Kubernetes CronJob:

```bash
# Example crontab entry (host machine)
0 2 * * * /opt/vendhub/scripts/backup/pg_backup.sh >> /var/log/vendhub-backup.log 2>&1
```

**Backup script template** (`scripts/backup/pg_backup.sh`):

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/vendhub/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="vendhub_${TIMESTAMP}.dump"

# Create backup
docker compose -f /opt/vendhub/docker-compose.yml exec -T postgres \
  pg_dump -U vendhub -d vendhub --format=custom --compress=9 \
  > "${BACKUP_DIR}/${FILENAME}"

# Upload to S3 (optional)
# aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${BACKUP_S3_BUCKET}/postgres/"

# Clean old backups
find "${BACKUP_DIR}" -name "vendhub_*.dump" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: ${FILENAME}"
```

#### Backup Retention Policy

| Environment | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Development | Manual | -- | Local |
| Staging | Daily 02:00 | 7 days | S3 |
| Production | Daily 02:00 | 30 days | S3 + offsite |
| Production | Hourly (WAL) | 7 days | S3 |

### 7.2 Redis Backup

Redis is configured with AOF (Append Only File) persistence via the `--appendonly yes` flag in `docker-compose.yml`.

```bash
# Manual snapshot
docker compose exec redis redis-cli BGSAVE

# Check last save timestamp
docker compose exec redis redis-cli LASTSAVE

# Redis data is stored in the vendhub-redis-data volume
# Back up the volume:
docker run --rm \
  -v vendhub-redis-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### 7.3 File Storage Backup (MinIO / S3)

```bash
# Using MinIO Client (mc)
mc alias set vendhub http://localhost:9000 minioadmin minioadmin
mc mirror vendhub/vendhub ./backups/minio/

# Or sync to another S3 bucket
mc mirror vendhub/vendhub s3/vendhub-backup/minio/
```

### 7.4 Recovery Procedures

#### Restore PostgreSQL

```bash
# Stop application services
docker compose stop api web client

# Restore from custom format dump
docker compose exec -T postgres pg_restore \
  -U vendhub \
  -d vendhub \
  --clean \
  --if-exists \
  < ./backups/vendhub_YYYYMMDD_HHMMSS.dump

# Restart services
docker compose start api web client

# Verify
curl -sf http://localhost:4000/health/ready | jq .
```

#### Restore Redis

```bash
# Stop Redis
docker compose stop redis

# Restore volume
docker run --rm \
  -v vendhub-redis-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/redis_YYYYMMDD_HHMMSS.tar.gz -C /data"

# Start Redis
docker compose start redis
```

#### Restore MinIO

```bash
mc mirror ./backups/minio/ vendhub/vendhub
```

---

## 8. Troubleshooting

### 8.1 Common Issues and Solutions

#### API fails to start: "Cannot connect to database"

```bash
# 1. Check PostgreSQL is running and healthy
docker compose ps postgres
docker compose exec postgres pg_isready -U vendhub

# 2. Verify database exists
docker compose exec postgres psql -U vendhub -l

# 3. Check DB environment variables
docker compose exec api env | grep DB_

# 4. Check logs
docker compose logs postgres | tail -20
```

#### API fails to start: "Cannot connect to Redis"

```bash
# 1. Check Redis is running
docker compose ps redis
docker compose exec redis redis-cli ping

# 2. Check Redis password configuration
docker compose exec api env | grep REDIS_

# 3. Check Redis memory
docker compose exec redis redis-cli INFO memory | grep used_memory_human
```

#### Migration fails

```bash
# 1. Check the exact error
docker compose exec api pnpm migration:run 2>&1

# 2. Check which migrations have been applied
docker compose exec postgres psql -U vendhub -d vendhub -c \
  "SELECT * FROM migrations ORDER BY timestamp DESC;"

# 3. If migration is partially applied, revert and retry
docker compose exec api pnpm migration:revert
docker compose exec api pnpm migration:run

# 4. If data corruption, restore from backup (Section 3.3.5)
```

#### WebSocket connections failing

```bash
# 1. Check if the API supports WebSocket upgrade
curl -sf -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:4000/socket.io/ -v 2>&1 | head -20

# 2. If behind Nginx, verify WebSocket proxy headers
# The nginx.prod.conf must include:
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection "upgrade";

# 3. Check Redis adapter (Socket.IO uses Redis for multi-instance)
docker compose exec redis redis-cli PUBSUB CHANNELS "socket.io*"
```

#### High memory usage on API pods

```bash
# 1. Check Node.js heap usage
curl -sf http://localhost:4000/health/detailed | jq '.info.memory_heap'

# 2. Check for memory leaks (enable heap snapshots in development)
# Add to API environment: NODE_OPTIONS="--max-old-space-size=1024"

# 3. Check BullMQ queue backlog
docker compose exec redis redis-cli LLEN "bull:<queue-name>:wait"
```

#### SSL certificate errors in production

```bash
# 1. Check certificate expiry
echo | openssl s_client -connect api.vendhub.uz:443 2>/dev/null | \
  openssl x509 -noout -dates

# 2. Force certificate renewal
docker compose exec certbot certbot renew --force-renewal

# 3. Reload Nginx to pick up new certificates
docker compose exec nginx nginx -s reload
```

#### Container runs out of disk space

```bash
# 1. Check Docker disk usage
docker system df

# 2. Clean up unused images, containers, volumes
docker system prune -a --volumes

# 3. Check log file sizes
docker compose logs --no-log-prefix api 2>/dev/null | wc -c

# 4. Log rotation is configured in docker-compose.yml
# API: max-size 50m, max-file 5
# Others: max-size 10-20m, max-file 3
```

### 8.2 Log Locations

#### Docker Compose

```bash
# Application logs
docker compose logs api          # API logs
docker compose logs web          # Admin panel logs
docker compose logs client       # Client app logs
docker compose logs postgres     # Database logs
docker compose logs redis        # Redis logs
docker compose logs nginx        # Reverse proxy logs (production profile)

# Follow logs in real-time
docker compose logs -f api

# Filter by time
docker compose logs --since 1h api
docker compose logs --since "2026-02-03T10:00:00" api
```

#### Kubernetes

```bash
kubectl -n vendhub logs -l app=vendhub-api --tail=100
kubectl -n vendhub logs -l app=vendhub-api -f              # Follow
kubectl -n vendhub logs -l app=vendhub-api --previous       # Previous container (after crash)
kubectl -n vendhub logs deploy/vendhub-api -c api           # Specific container
```

#### Centralized Logging (Loki)

Access via Grafana at `http://localhost:3001` -> Explore -> Select "Loki" datasource.

Example LogQL queries:

```
{container="vendhub-api"} |= "error"
{container="vendhub-api"} | json | level="error"
{container="vendhub-postgres"} |= "FATAL"
```

### 8.3 Debug Mode

```bash
# Enable verbose logging on the API
# Set in .env or directly:
LOG_LEVEL=debug
DB_LOGGING=true

# Restart API to pick up changes
docker compose restart api

# For one-off debugging, override environment:
docker compose exec -e LOG_LEVEL=debug -e DB_LOGGING=true api node apps/api/dist/main.js
```

### 8.4 Useful Diagnostic Commands

```bash
# Database connection count
docker compose exec postgres psql -U vendhub -d vendhub -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'vendhub';"

# Slow queries
docker compose exec postgres psql -U vendhub -d vendhub -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND query_start < now() - interval '30 seconds'
   ORDER BY duration DESC;"

# Redis memory and key count
docker compose exec redis redis-cli INFO keyspace
docker compose exec redis redis-cli INFO memory | grep used_memory_human
docker compose exec redis redis-cli DBSIZE

# BullMQ queue status
docker compose exec redis redis-cli KEYS "bull:*" | sort

# Docker resource usage
docker stats --no-stream

# Kubernetes resource usage
kubectl -n vendhub top pods
kubectl -n vendhub top nodes
```

### 8.5 Support Contacts

| Role | Contact | Channel |
|------|---------|---------|
| DevOps Team | devops@vendhub.uz | Email, Telegram |
| CTO | cto@vendhub.uz | Email, Telegram |
| Development Team | -- | Telegram: @vendhub_dev |
| On-Call | -- | Telegram: @vendhub_oncall |
| Support (external) | support@vendhub.uz | Email, Telegram: @vendhub_support |

---

## Appendix A: CI/CD Pipeline Summary

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push to `main` and `develop`, and on all pull requests targeting those branches.

```
PR / Push
    |
    v
[Lint & Type Check]
    |
    +---> [Unit Tests] --+
    |                     |
    +---> [Build All] ----+---> [Integration Tests]
                          |
                          +---> [E2E Tests (Playwright)]
                          |
                          +---> [Docker Build + Trivy Scan]
                                        |
                                        v
                                [Deploy to Staging]
                                        |
                                        v
                                [Telegram Notification]
```

Docker images are tagged with both `branch-name` and the short commit SHA. Production uses the `stable` tag applied during release.

---

## Appendix B: Quick Reference Commands

```bash
# === Development ===
pnpm install                          # Install dependencies
pnpm dev                              # Start all apps
pnpm --filter api dev                 # Start API only
pnpm --filter web dev                 # Start Admin only

# === Testing ===
pnpm test:unit                        # Unit tests
pnpm test:e2e                         # E2E tests
pnpm test:cov                         # Coverage report

# === Database ===
pnpm --filter api migration:run       # Run migrations
pnpm --filter api migration:revert    # Revert last migration
pnpm --filter api migration:show      # Show migration status
pnpm db:seed                          # Seed data

# === Docker ===
docker compose up -d                  # Start all services
docker compose down                   # Stop all services
docker compose ps                     # Service status
docker compose logs -f api            # Follow API logs
docker compose build api              # Rebuild API image
docker compose exec api sh            # Shell into API container

# === Kubernetes ===
kubectl -n vendhub get pods                                    # List pods
kubectl -n vendhub rollout status deployment/vendhub-api       # Check rollout
kubectl -n vendhub rollout undo deployment/vendhub-api         # Rollback
kubectl -n vendhub exec deploy/vendhub-api -- pnpm migration:run  # Run migration
helm -n vendhub upgrade --install vendhub ./infrastructure/helm/vendhub  # Deploy

# === Monitoring ===
docker compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
curl -sf http://localhost:4000/health/detailed | jq .
curl -sf http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'
```
