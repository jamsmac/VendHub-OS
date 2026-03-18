# Monitoring & Alerting Design — VendHub OS on Railway

**Date:** 2026-03-18
**Status:** Approved
**Target:** Production (Railway), ~50 machines, 5-10 operators, several organizations

---

## Architecture: 3 Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 1: HEALTH & UPTIME                        │
│  UptimeRobot (free) → pings endpoints            │
│  → down → Telegram alert within 30 sec           │
├─────────────────────────────────────────────────┤
│  Layer 2: LOGS & ERRORS                          │
│  Better Stack (Logtail) — log aggregation        │
│  + Sentry — error tracking with context          │
│  → errors → Telegram + email                     │
├─────────────────────────────────────────────────┤
│  Layer 3: METRICS & DASHBOARDS                   │
│  Grafana Cloud (free tier: 10k metrics)          │
│  + custom business metrics via /metrics           │
│  → threshold breached → Telegram alert           │
└─────────────────────────────────────────────────┘
         ▼ all alerts converge ▼
    ┌──────────────────────┐
    │  VendHub Telegram Bot │
    └──────────────────────┘
```

**Key principle:** Monitoring lives outside what it monitors. If Railway goes down, Sentry and UptimeRobot still send alerts.

---

## Layer 1: Health & Uptime

### Endpoints to Monitor

| Endpoint                       | Interval | Alert if                |
| ------------------------------ | -------- | ----------------------- |
| `api/v1/health`                | 60 sec   | Not 200 twice in a row  |
| `web /`                        | 60 sec   | Not 200 twice in a row  |
| `client /`                     | 5 min    | Not 200                 |
| `site /`                       | 5 min    | Not 200                 |
| Postgres (via health endpoint) | 60 sec   | DB connection failed    |
| Redis (via health endpoint)    | 60 sec   | Redis connection failed |

### Extended Health Endpoint Response

```json
{
  "status": "ok | degraded | down",
  "uptime": 84923,
  "checks": {
    "database": { "status": "ok", "responseTime": 12 },
    "redis": { "status": "ok", "responseTime": 3 },
    "diskSpace": { "status": "ok", "freePercent": 72 }
  },
  "version": "1.0.0",
  "timestamp": "2026-03-18T10:00:00Z"
}
```

### Implementation

- **`@nestjs/terminus`** — health check module with built-in indicators (TypeORM, Redis, disk, memory)
- **UptimeRobot** (free, 50 monitors) — pings all URLs, parses health JSON
- **Alert → Telegram webhook** — UptimeRobot native Telegram support

---

## Layer 2: Logs & Errors

### Routing Table

| Event                   | Destination                   | Example                                        |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| Unhandled exception     | Sentry                        | `TypeError: Cannot read property 'id' of null` |
| HTTP 5xx response       | Sentry                        | `POST /api/v1/orders → 500`                    |
| Payment failure         | Sentry (breadcrumb) + Logtail | Payme returned error                           |
| All HTTP requests       | Logtail                       | `GET /api/v1/machines 200 45ms`                |
| SQL slow queries >500ms | Logtail                       | `SELECT * FROM orders ... 1200ms`              |
| Auth events             | Logtail                       | Login, logout, failed attempt, token refresh   |
| BullMQ job failures     | Sentry + Logtail              | Job `send-notification` failed after 3 retries |

### Implementation

1. **Sentry** — `@sentry/nestjs` SDK, global exception filter, auto-catches all unhandled errors
2. **Structured logging** — replace `console.log` with `pino` (JSON format) → Logtail auto-parses
3. **Railway → Logtail** — enable in Railway Dashboard → Settings → Integrations → Better Stack (no code needed)

### Alerts

- Sentry → Telegram via webhook (built-in integration)
- Logtail → alert if >10 errors in 5 min → Telegram

### Free Tier Limits

- Sentry: 5K errors/month (Developer plan)
- Better Stack: 1GB logs/month

---

## Layer 3: Metrics & Dashboards

### Infrastructure Metrics (Prometheus format via `/metrics`)

| Metric                          | Type      | Purpose             |
| ------------------------------- | --------- | ------------------- |
| `http_requests_total`           | counter   | RPS, load trends    |
| `http_request_duration_seconds` | histogram | p50/p95/p99 latency |
| `http_requests_errors_total`    | counter   | Error rate growth   |
| `db_pool_active_connections`    | gauge     | Connection leaks    |
| `db_query_duration_seconds`     | histogram | Slow queries        |
| `redis_connected_clients`       | gauge     | Redis health        |
| `bullmq_jobs_completed_total`   | counter   | Queue throughput    |
| `bullmq_jobs_failed_total`      | counter   | Failing jobs        |
| `auth_login_total`              | counter   | Anomalous activity  |

### Business Metrics

| Metric                     | Type              | Purpose                  |
| -------------------------- | ----------------- | ------------------------ |
| `orders_total`             | counter           | Order count              |
| `orders_revenue_uzs`       | counter           | Revenue in UZS           |
| `payments_success_total`   | counter by method | Payme vs Click vs Uzum   |
| `payments_failed_total`    | counter           | Payment issues           |
| `machines_online`          | gauge             | Machines connected       |
| `machines_offline_minutes` | histogram         | Machine downtime         |
| `products_dispensed_total` | counter           | Products dispensed       |
| `products_low_stock`       | gauge             | Machines needing restock |

### Implementation

1. **`prom-client`** — standard Node.js Prometheus metrics library
2. **`MetricsModule`** in NestJS — new module, ~120 lines
3. **`MetricsInterceptor`** — global interceptor, auto-counts HTTP metrics for all endpoints
4. **Business metrics** — incremented in services (1 line each): `this.metrics.ordersTotal.inc()`
5. **Grafana Cloud Agent** — lightweight agent as separate Railway service (~$1-3/month), scrapes `/metrics`

### Grafana Dashboards (3)

- **Operations** — RPS, latency, errors, DB/Redis health, BullMQ
- **Business** — orders, revenue, payments, online machines
- **Alerts** — summary of all triggered alerts

### Alert Rules (Grafana → Telegram)

| Condition                                 | Severity | Action          |
| ----------------------------------------- | -------- | --------------- |
| API latency p95 > 2s for 5 min            | warning  | Telegram        |
| Error rate > 5% for 5 min                 | critical | Telegram + call |
| `machines_online` dropped > 20% in 10 min | critical | Telegram        |
| `payments_failed_total` > 10 per hour     | warning  | Telegram        |
| DB connections > 80% pool                 | warning  | Telegram        |
| 0 orders in last hour (business hours)    | warning  | Telegram        |

---

## Cost

| Tool                    | Role                          | Cost/month |
| ----------------------- | ----------------------------- | ---------- |
| UptimeRobot             | Uptime pings                  | $0         |
| Sentry                  | Error tracking                | $0         |
| Better Stack            | Log aggregation               | $0         |
| Grafana Cloud           | Metrics + dashboards + alerts | $0         |
| Grafana Agent (Railway) | Scrapes /metrics              | ~$1-3      |
| Telegram bot            | Alert recipient               | $0         |
| **Total**               |                               | **~$1-3**  |

---

## Code Changes

| Component                    | Size               | Location                            |
| ---------------------------- | ------------------ | ----------------------------------- |
| `HealthModule` (extend)      | ~80 lines          | `apps/api/src/modules/health/`      |
| `MetricsModule` (new)        | ~120 lines         | `apps/api/src/modules/metrics/`     |
| `MetricsInterceptor`         | ~40 lines          | `apps/api/src/common/interceptors/` |
| Business metrics in services | ~1 line per metric | orders, payments, machines          |
| Structured logger (pino)     | ~30 lines config   | `apps/api/src/common/logger/`       |
| Sentry init                  | ~20 lines          | `apps/api/src/main.ts` + filter     |
| **Total**                    | **~300 lines**     |                                     |

---

## Implementation Plan

```
Step 1: Health checks          ← @nestjs/terminus
Step 2: UptimeRobot            ← configuration (external)
Step 3: Sentry SDK             ← @sentry/nestjs
Step 4: Better Stack           ← Railway integration (external)
Step 5: Structured logging     ← nestjs-pino
Step 6: MetricsModule          ← prom-client
Step 7: Business metrics       ← increments in services
Step 8: Grafana Cloud          ← agent + dashboards (external)
Step 9: Alerts → Telegram      ← webhook configuration (external)
```

Steps 1, 3, 5, 6, 7 — code changes (commit together).
Steps 2, 4, 8, 9 — external service configuration (no code).

---

## What NOT to Do

- ~~Self-hosted Prometheus/Grafana on Railway~~ — expensive, unreliable
- ~~ELK Stack~~ — overkill for 50 machines
- ~~Custom dashboard in web app~~ — Grafana is better for ops
- ~~Datadog~~ — expensive, free tier too limited
