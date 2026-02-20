# VendHub OS — Deployment Runbook

## Prerequisites

- Docker & Docker Compose
- Node.js 20+, pnpm 9.15+
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)
- GitHub Actions access for CI/CD

## Local Development Setup

### Quick Start

```bash
cd vendhub-unified
cp .env.example .env.local
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| API | 4000 | http://localhost:4000/docs |
| Admin Panel | 3000 | http://localhost:3000 |
| Client PWA | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

## Docker Deployment

### Development

```bash
docker compose up -d
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Database Operations

### Run Migrations

```bash
pnpm db:migrate
```

### Create New Migration

```bash
pnpm --filter api migration:generate -- -n MigrationName
```

### Rollback Migration

```bash
pnpm --filter api migration:revert
```

### Seed Data

```bash
pnpm db:seed
```

## Kubernetes Deployment

### Staging

```bash
cd infrastructure/terraform
terraform init
terraform workspace select staging
terraform apply -var-file=environments/staging.tfvars
```

### Production

```bash
terraform workspace select production
terraform apply -var-file=environments/production.tfvars
```

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| GET /health | Basic liveness |
| GET /ready | Readiness (DB + Redis) |
| GET /api/v1/health/detailed | Full component status |
| GET /metrics | Prometheus metrics |

## Monitoring

- **Prometheus**: Scrapes /metrics every 15s
- **Grafana**: Dashboard at port 3001
- **Loki**: Log aggregation
- **AlertManager**: Telegram notifications

## Troubleshooting

### API won't start

1. Check DB connection: `docker compose logs postgres`
2. Check Redis: `docker compose logs redis`
3. Verify .env: DB_HOST, DB_PORT, REDIS_HOST

### Migration failures

1. Check migration order: `ls -la apps/api/src/database/migrations/`
2. Revert last: `pnpm --filter api migration:revert`
3. Check for naming conflicts in entity decorators

### High memory usage

1. Check /api/v1/health/detailed for memory stats
2. Review pool size: DB_POOL_SIZE env var
3. Check queue backlogs at /admin/queues

## Rollback Procedure

1. Revert code: `git revert HEAD`
2. Revert migration: `pnpm --filter api migration:revert`
3. Redeploy: Push to trigger CI/CD

## Environment Variables

See `.env.example` for the complete list (100+ variables).

Key groups:
- **Database**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_POOL_SIZE
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_URL
- **JWT**: JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
- **Payments**: PAYME_MERCHANT_ID, PAYME_SECRET_KEY, CLICK_MERCHANT_ID, CLICK_SECRET_KEY, UZUM_API_KEY
- **Storage**: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
- **Telegram**: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL
- **SMS**: ESKIZ_EMAIL, ESKIZ_PASSWORD, PLAYMOBILE_LOGIN, PLAYMOBILE_PASSWORD
- **Fiscal**: OFD_TERMINAL_ID, OFD_API_KEY
- **CORS**: CORS_ORIGINS (comma-separated URLs)
- **Rate Limiting**: THROTTLE_LIMIT (requests per minute)

## Performance Tuning

### Database

- Connection pooling: Set `DB_POOL_SIZE` (default 20)
- Slow query threshold: Set `DB_SLOW_QUERY_THRESHOLD` (default 1000ms)
- Enable query logging: Set `DB_LOGGING=true` for debugging

### Redis

- Default TTL: `CACHE_TTL` (default 300s)
- Connection pooling: Managed automatically by ioredis

### API

- Request timeout: Set via TimeoutInterceptor (default 30s)
- Body size limit: `MAX_BODY_SIZE` (default 10mb)
- Rate limits: THROTTLE_LIMIT, configured per-endpoint in main.ts

## Security Checklist

- [ ] Never set `DB_SYNCHRONIZE=true` in production
- [ ] Always use SSL for PostgreSQL in production (automatic if NODE_ENV=production)
- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Set `COOKIE_SECRET` for session signing
- [ ] Configure `CORS_ORIGINS` to whitelist only trusted domains
- [ ] Use HTTPS in production (configure via reverse proxy)
- [ ] Rotate payment provider secrets regularly
- [ ] Enable 2FA for admin accounts
- [ ] Review audit logs weekly

## CI/CD Pipeline

### GitHub Actions Workflow

1. **Test**: Runs Jest unit tests and TypeScript compilation
2. **Build**: Creates Docker images for API, web, client
3. **Deploy Staging**: Auto-deploys to staging on push to `develop`
4. **Deploy Production**: Manual approval required for `main` branch

### Manual Deployment

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Push to registry
docker compose -f docker-compose.prod.yml push

# Deploy to Kubernetes
kubectl apply -f infrastructure/k8s/
```

## Backup & Recovery

### Database Backup

```bash
# Manual backup
pg_dump -h localhost -U postgres -d vendhub > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres -d vendhub < backup_20260203.sql
```

### Automated Backups

- Configured in `infrastructure/k8s/postgres-backup-cronjob.yaml`
- Runs daily at 2 AM UTC
- Retained for 30 days

## Support Contacts

- **Technical Lead**: support@vendhub.uz
- **DevOps**: devops@vendhub.uz
- **On-call**: Configured in AlertManager
