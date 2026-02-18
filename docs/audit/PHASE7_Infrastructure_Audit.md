# Phase 7: Infrastructure Audit — Report

**Date:** 2025-02-17

## Summary

### Docker

- **docker-compose.yml:** postgres (16-alpine), redis (7-alpine), api (apps/api/Dockerfile), plus web, client, bot; healthchecks on postgres and redis; resource limits; volumes for data; networks.
- **Dockerfiles:** 4 (api, web, client, bot). Mobile and site not containerized (expected for Expo; site can be built as static).
- **Multi-stage / non-root:** To be verified per Dockerfile; recommended for production.

### Kubernetes

- **Base:** api-deployment, web-deployment, client-deployment, bot-deployment, postgres-statefulset, redis-statefulset, ingress, configmap, secrets, namespace.
- **Overlays:** production, staging (kustomization, ingress-patch).
- **Helm:** Chart in infrastructure/helm/vendhub (values, templates for api, configmap, ingress, secrets, serviceaccount).

### CI/CD

- **.github/workflows/ci.yml:** Lint (pnpm install, audit, lint, type-check), test-unit (api test), build (all apps). Cache: pnpm. No deploy step in snippet; may be in same file or release.yml.
- **type-check:** Runs `pnpm type-check` (turbo); if API has TS errors in spec files, this may fail.

### Monitoring

- **Stack:** Prometheus, Grafana (dashboards, datasources), Loki, Promtail, Alertmanager (alert-rules.yml).
- **docker-compose.monitoring.yml** for local monitoring stack.

## Gaps / Improvements

1. Fix API TS/spec errors so CI type-check and build pass.
2. Ensure Dockerfiles use non-root user and multi-stage build.
3. Add readiness/liveness probes to K8s deployments if missing.
4. Document .env.example and ensure secrets not committed.

## Next

- Phase 8 (Shared).
