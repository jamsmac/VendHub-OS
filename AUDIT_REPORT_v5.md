# VendHub OS — Полный Аудит v5

**Дата:** 2026-02-20
**Аудитор:** Claude Opus 4.6
**Методология:** 10-фазный аудит (`docs/FULL_AUDIT_PROMPT.md`)
**Базис:** v4 аудит (5 P1 → 1 коммит 0526ef7), новый глубокий анализ всех модулей

---

## Executive Summary

| Метрика                           | v4 (02-20) | v5 (02-20) | Дельта |
| --------------------------------- | ---------- | ---------- | ------ |
| **Общая готовность к production** | **91/100** | **88/100** | **-3** |
| **Критические блокеры (P0)**      | **0**      | **1**      | **+1** |
| **Серьёзные проблемы (P1)**       | **5**      | **7**      | **+2** |
| **Улучшения (P2)**                | **14**     | **12**     | **-2** |
| **Unit-тесты (pass)**             | 1755       | 1755       | =      |
| **Test suites**                   | 72         | 72         | =      |
| **TS-ошибки (все 5 apps)**        | 0          | 0          | =      |
| **`any` types (prod code)**       | 152        | 152        | =      |
| **Files >1000 LOC**               | 12         | 12         | =      |

### Почему оценка снизилась с 91 до 88?

Все 5 P1 из v4 подтверждены как **FIXED** (коммит `0526ef7`). Однако глубокий анализ всех 66 контроллеров и 106 сервисов выявил:

- **1 P0**: Reports module — 6 методов с IDOR (cross-tenant доступ к отчётам, дашбордам, определениям)
- **7 P1**: 3 backend (untyped Body, settings IDOR) + 4 infrastructure (K8s `:latest`, Prometheus auth, probe credential leaks)
- **12 P2**: i18n, docker, networking

### Scorecard по категориям

| Категория          | v4 Score | v5 Score | Дельта |
| ------------------ | -------- | -------- | ------ |
| **Архитектура**    | 9.5      | 9.5      | =      |
| **Backend (API)**  | 9.0      | 8.5      | -0.5   |
| **Web Admin**      | 8.5      | 8.5      | =      |
| **Client PWA**     | 8.0      | 8.0      | =      |
| **Mobile**         | 8.5      | 8.5      | =      |
| **Bot**            | 8.5      | 8.5      | =      |
| **Infrastructure** | 8.5      | 8.0      | -0.5   |
| **Tests**          | 9.0      | 9.0      | =      |
| **Security**       | 8.5      | 8.0      | -0.5   |

---

## Build Health

### TypeScript Compilation

| App    | v4 TS Errors | v5 TS Errors | Статус |
| ------ | ------------ | ------------ | ------ |
| API    | 0            | 0            | OK     |
| Web    | 0            | 0            | OK     |
| Client | 0            | 0            | OK     |
| Bot    | 0            | 0            | OK     |
| Mobile | 0            | 0            | OK     |

### Test Results

| Метрика      | v4   | v5   |
| ------------ | ---- | ---- |
| Test Suites  | 72   | 72   |
| Tests Passed | 1755 | 1755 |
| Tests Failed | 0    | 0    |
| Pass Rate    | 100% | 100% |

### Codebase Metrics

| Метрика              | v4    | v5    | Дельта |
| -------------------- | ----- | ----- | ------ |
| Total LOC            | ~290K | ~290K | =      |
| Entities             | 100   | 100   | =      |
| Controllers          | 66    | 66    | =      |
| Services             | 106   | 106   | =      |
| `any` types (prod)   | 152   | 152   | =      |
| Files >1000 LOC      | 12    | 12    | =      |
| `console.log` in API | 0     | 0     | =      |
| `eager: true`        | 0     | 0     | =      |
| `synchronize: true`  | 0     | 0     | =      |
| `TODO/FIXME/HACK`    | 0     | 0     | =      |

---

## Верификация v4 фиксов

### Все 5 P1 из v4 подтверждены как FIXED

| v4 #   | Проблема                                       | Статус v5 | Верификация                                                             |
| ------ | ---------------------------------------------- | --------- | ----------------------------------------------------------------------- |
| P1-001 | Billing `findInvoiceById()` без organizationId | **FIXED** | `{ id, organizationId }` в WHERE, controller передаёт orgId (5 методов) |
| P1-002 | Reconciliation без organizationId              | **FIXED** | processReconciliation, getMismatches, resolveMismatch — все с orgId     |
| P1-003 | MinIO `latest` tag                             | **FIXED** | `RELEASE.2024-11-07T00-52-20Z` в обоих docker-compose                   |
| P1-004 | CI: нет Trivy для Bot/Client                   | **FIXED** | Trivy SARIF scanning добавлено для всех 4 images                        |
| P1-005 | Client nginx `/health`                         | **FIXED** | Подтверждено: nginx.conf имеет location /health (строки 50-54)          |

---

## Находки по приоритету

### P0 — Блокеры (1 находка)

#### P0-001: Reports Module — Multi-Tenant IDOR (6 методов)

**Severity:** CRITICAL
**Файлы:** `modules/reports/reports.service.ts`, `modules/reports/reports.controller.ts`
**Описание:** 6 методов в Reports service ищут записи по UUID без проверки organizationId. Любой аутентифицированный пользователь может получить доступ к отчётам, дашбордам и определениям других организаций, угадав UUID.

| Метод                       | Service строка | Controller строка | Проблема                               |
| --------------------------- | -------------- | ----------------- | -------------------------------------- |
| `getDefinition(id)`         | 142-148        | 61-62             | `findOne({ where: { id } })` без orgId |
| `getGeneratedReport(id)`    | 567-573        | 125-126           | `findOne({ where: { id } })` без orgId |
| `getDashboard(id)`          | 810-820        | 192-193           | `findOne({ where: { id } })` без orgId |
| `updateDashboard(id)`       | 826-834        | —                 | Вызывает getDashboard без orgId        |
| `updateScheduledReport(id)` | —              | 163-168           | Нет orgId, untyped Body                |
| `deleteScheduledReport(id)` | —              | 174-175           | Нет orgId                              |

**Уязвимый код:**

```typescript
// reports.service.ts:567
async getGeneratedReport(id: string): Promise<GeneratedReport> {
  const report = await this.generatedRepo.findOne({ where: { id } }); // ← IDOR
  return report;
}

// reports.controller.ts:125
async getGeneratedReport(@Param("id", ParseUUIDPipe) id: string) {
  return this.reportsService.getGeneratedReport(id); // ← orgId не передаётся
}
```

**Исправление:** Добавить organizationId во все 6 методов:

```typescript
async getGeneratedReport(id: string, organizationId: string): Promise<GeneratedReport> {
  const report = await this.generatedRepo.findOne({ where: { id, organizationId } });
  if (!report) throw new NotFoundException();
  return report;
}
```

**Часы:** 3h

---

### P1 — Важные (7 находок)

#### Backend / Security

| #      | Проблема                                                                                                                                                                                                              | Файл                                                | Часы |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---- |
| P1-001 | **Reports: 3 эндпоинта с untyped `@Body() data: Record<string, unknown>`.** Нет class-validator валидации, возможна инъекция произвольных полей. Затронуты: createDefinition, updateScheduledReport, updateDashboard. | `modules/reports/reports.controller.ts:70,165,220+` | 3h   |
| P1-002 | **Settings: organizationId из query string.** `getAllSettings(@Query("organizationId"))` принимает orgId от пользователя вместо `@CurrentOrganizationId()`. ADMIN может запросить настройки другой организации.       | `modules/settings/settings.controller.ts:74-78`     | 1h   |

#### Infrastructure

| #      | Проблема                                                                                                                                                               | Файл                                                     | Часы |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---- |
| P1-003 | **K8s: `:latest` image tags в 5 Deployment манифестах** + `imagePullPolicy: Always`. Непредсказуемые деплойменты, медленные rollout. Должны использовать version tags. | `infrastructure/k8s/base/*-deployment.yml`               | 1h   |
| P1-004 | **Release workflow tags `:latest`** в дополнение к version tags. Production workflow не должен обновлять floating tag.                                                 | `.github/workflows/release.yml:77-130`                   | 0.5h |
| P1-005 | **Prometheus auth: `${METRICS_API_KEY}` не раскрывается в YAML.** Prometheus не поддерживает bash-переменные. Метрики API endpoint может быть незащищён.               | `infrastructure/monitoring/prometheus.yml:36-37`         | 1h   |
| P1-006 | **Redis probe: пароль в аргументах команды** `redis-cli -a "$REDIS_PASSWORD"`. При ошибке probe пароль может попасть в K8s event logs.                                 | `infrastructure/k8s/base/redis-statefulset.yml:60,70`    | 1h   |
| P1-007 | **PostgreSQL probe: credentials в exec command.** Аналогично Redis — `$POSTGRES_USER` может утечь в логи.                                                              | `infrastructure/k8s/base/postgres-statefulset.yml:35-37` | 1h   |

**Итого P1: 7 задач, ~8.5 часов**

---

### P2 — Улучшения (12 находок)

#### Backend

| #      | Проблема                                                            | Файл/область          | Часы |
| ------ | ------------------------------------------------------------------- | --------------------- | ---- |
| P2-001 | 152 explicit `any` types в production API коде (без изменений с v4) | Весь API codebase     | 8h   |
| P2-002 | 12 файлов >1000 LOC (без изменений с v4)                            | API services/entities | 10h  |
| P2-003 | ~20+ unbounded `.find()` без take/limit (без изменений с v4)        | Разные service файлы  | 3h   |

#### Frontend

| #      | Проблема                                                                                                  | Файл/область                                                                 | Часы |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| P2-004 | **Site: 100+ hardcoded Russian strings**, нет i18n инфраструктуры вообще                                  | `apps/site/src/app/page.tsx` (всё приложение)                                | 8h   |
| P2-005 | Client PWA: token key `vendhub-token` vs Web `vendhub_access_token` (разные приложения, низкий приоритет) | `apps/client/src/lib/api.ts:19,24,35`                                        | 0.5h |
| P2-006 | Web: hardcoded Russian в DirectoryForm/EntryForm (5 строк)                                                | `apps/web/src/components/directories/`                                       | 0.5h |
| P2-007 | Client: geolocation store — 5 hardcoded Russian error messages                                            | `apps/client/src/hooks/useGeolocation.ts`, `src/lib/store.ts`                | 0.5h |
| P2-008 | Web/Client: error boundaries hardcoded "Произошла ошибка"                                                 | `apps/web/src/app/error.tsx`, `apps/client/src/components/ErrorBoundary.tsx` | 0.5h |

#### Infrastructure

| #      | Проблема                                                                | Файл/область                                          | Часы |
| ------ | ----------------------------------------------------------------------- | ----------------------------------------------------- | ---- |
| P2-009 | Web K8s: нет PodDisruptionBudget (единственный Deployment без PDB)      | `infrastructure/k8s/base/web-deployment.yml`          | 0.5h |
| P2-010 | Missing egress rules в NetworkPolicies (только ingress)                 | `infrastructure/k8s/base/network-policies.yml`        | 2h   |
| P2-011 | .dockerignore файлы: bot и client не содержат `.turbo`, `*.log`         | `apps/bot/.dockerignore`, `apps/client/.dockerignore` | 0.5h |
| P2-012 | docker-compose.prod.yml: postgres missing `extensions.sql` volume mount | `docker-compose.prod.yml:277`                         | 0.5h |

**Итого P2: 12 задач, ~34.5 часов**

---

## Отклонённые находки (False Positives)

| Находка агента                             | Причина отклонения                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| TypeORM `synchronize` P0 в production      | Код использует `&&`: `NODE_ENV !== "production" && DB_SYNCHRONIZE === "true"` — безопасно |
| Missing `@UseGuards` на контроллерах       | Все 5 guards зарегистрированы глобально через `APP_GUARD` в `app.module.ts:526-550`       |
| String role names вместо enum в `@Roles()` | `Roles()` принимает `(UserRole \| string)[]` — оба формата корректны                      |
| Client PWA missing `manifest.webmanifest`  | Генерируется автоматически `vite-plugin-pwa` при сборке                                   |
| Client nginx UID 101 некорректен           | UID 101 = корректный nginx user в Alpine-based images                                     |

---

## Что хорошо (подтверждено в v5)

### Security Wins (после v4 фиксов)

- Billing: все 6 методов теперь проверяют organizationId ✓
- Reconciliation: все 3 проблемных метода исправлены ✓
- Payment webhooks: pessimistic locking + transaction isolation ✓
- Loyalty spendPoints: pessimistic write lock ✓
- Storage: tenant isolation via key prefix ✓
- SanitizePipe: XSS prevention ✓
- Timing-safe signature verification (все 3 payment провайдера) ✓

### Architecture

- 0 TS ошибок во всех 5 приложениях
- 1755 тестов, 100% pass rate
- Все 100 entity наследуют BaseEntity
- 0 `console.log` в production API
- 0 `eager: true` relations
- 0 `synchronize: true` утечек
- Все 5 global guards (Throttler, CSRF, JWT, Roles, Organization)
- MinIO pinned to specific release version
- Trivy security scanning для всех 4 Docker images
- CI pipeline: lint → test → build → integration → e2e → docker → deploy

### Infrastructure

- K8s: PDB на 4/5 deployments, HPA, NetworkPolicies
- PostgreSQL 16 с SSL в production
- Redis 7 с authentication
- Prometheus + Grafana + Loki + AlertManager stack

---

## Рекомендации

### Немедленно (P0, ~3 часа):

1. **Reports multi-tenant** — добавить organizationId в getGeneratedReport(), getDashboard(), getDefinition(), updateDashboard(), updateScheduledReport(), deleteScheduledReport()

### Срочно (P1, ~8.5 часов):

2. **Reports untyped Body** — создать DTO с class-validator для createDefinition, updateScheduledReport, updateDashboard
3. **Settings IDOR** — заменить `@Query("organizationId")` на `@CurrentOrganizationId()`
4. **K8s image tags** — заменить `:latest` на `${IMAGE_TAG}` с Kustomize overlay
5. **Release workflow** — убрать `:latest` tag из production release
6. **Prometheus auth** — исправить формат авторизации или использовать network policies
7. **K8s probe credentials** — использовать отдельный health check script вместо inline password args

### Бэклог (P2, ~34.5 часов):

- Site i18n infrastructure (100+ strings)
- Продолжить устранение `any` types (152 → 0)
- Разбить файлы >1000 LOC
- Довести i18n до 100% во всех frontend apps
- Web PDB + NetworkPolicy egress rules
- Docker image pinning + .dockerignore consistency

---

## Сравнение трендов

| Аудит  | Дата       | P0    | P1    | P2     | Тесты | Score      |
| ------ | ---------- | ----- | ----- | ------ | ----- | ---------- |
| v1     | 2026-02-18 | 7     | 5     | 3      | ~1600 | ~65/100    |
| v2     | 2026-02-19 | 0     | 7     | ~20    | ~1700 | ~78/100    |
| v3     | 2026-02-20 | 3     | 18    | 19     | 1680  | 82/100     |
| v4     | 2026-02-20 | 0     | 5     | 14     | 1755  | 91/100     |
| **v5** | 2026-02-20 | **1** | **7** | **12** | 1755  | **88/100** |

**Тренд:** v4 → v5 дельта отражает не регрессию, а углубление аудита. Все v4 P1 исправлены, но глубокий анализ reports/settings/K8s выявил ранее пропущенные проблемы.

---

**Заключение:** Production readiness — **88/100**. 1 P0 блокер (Reports IDOR) требует немедленного исправления (~3 часа). После закрытия P0 и P1 (~11.5 часов суммарно) проект готов к production deployment. Критическая инфраструктура (payments, auth, storage) безопасна.
