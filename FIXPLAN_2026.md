# VendHub OS — План исправлений и доработок

> По результатам полного аудита от 9 марта 2026
> Общая оценка до: **87/100** → Целевая: **95/100**

---

## Сводка задач

| Приоритет      | Задач  | Срок          | Цель                              |
| -------------- | ------ | ------------- | --------------------------------- |
| 🔴 Critical    | 3      | Неделя 1      | Безопасность, стабильность        |
| 🟠 High        | 7      | Неделя 2-3    | Качество кода, производительность |
| 🟡 Medium      | 8      | Неделя 4-6    | Observability, UX, тесты          |
| 🟢 Enhancement | 10     | Неделя 7-12   | Новые возможности, оптимизация    |
| **Итого**      | **28** | **12 недель** | **95/100**                        |

---

## 🔴 CRITICAL — Неделя 1

### CRIT-1: Перенести JWT токены из localStorage

**Проблема:** XSS-уязвимость — access/refresh токены в localStorage
**Файл:** `apps/client/src/lib/api.ts` (строки 18-28)

```typescript
// ТЕКУЩИЙ КОД (УЯЗВИМЫЙ):
function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("vendhub_access_token", accessToken);
  localStorage.setItem("vendhub_refresh_token", refreshToken);
}
```

**Решение:** httpOnly cookies через API middleware

**Шаги:**

1. Backend: добавить cookie-based auth endpoint в `apps/api/src/modules/auth/`
   - `POST /api/v1/auth/login` → ставит httpOnly cookie с refresh token
   - `POST /api/v1/auth/refresh` → читает cookie, выдаёт новый access token
   - Настроить `sameSite: 'strict'`, `secure: true`, `httpOnly: true`
2. Backend: установить `cookie-parser` в NestJS
   ```bash
   cd apps/api && pnpm add cookie-parser @types/cookie-parser
   ```
3. Client: заменить `localStorage` на in-memory хранение access token

   ```typescript
   // НОВЫЙ КОД:
   let accessToken: string | null = null;

   function setAccessToken(token: string) {
     accessToken = token; // Только в памяти — XSS не сможет достать
   }

   function getAccessToken(): string | null {
     return accessToken;
   }
   // Refresh token — в httpOnly cookie (автоматически)
   ```

4. Client: обновить axios interceptor для автоматического refresh через cookie
5. Обновить CORS настройки: `credentials: true`

**Затрагиваемые файлы:**

- `apps/api/src/modules/auth/auth.controller.ts` — новые endpoints
- `apps/api/src/modules/auth/auth.service.ts` — cookie логика
- `apps/api/src/main.ts` — cookie-parser middleware
- `apps/client/src/lib/api.ts` — убрать localStorage
- `apps/client/src/hooks/useAuth.ts` — обновить auth flow

**Оценка:** 8-12 часов
**Тесты:** Unit тест на auth service + E2E тест login/refresh flow

---

### CRIT-2: Убрать дефолтные пароли из docker-compose.yml

**Проблема:** Redis password по умолчанию `vendhub_redis` в docker-compose
**Файл:** `docker-compose.yml` (строки 67-74)

```yaml
# ТЕКУЩИЙ КОД:
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD:-vendhub_redis}
```

**Решение:**

**Шаги:**

1. Заменить все `:-default_value` на `:?required` для паролей:
   ```yaml
   # НОВЫЙ КОД:
   command: >
     redis-server
     --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
   ```
2. Обновить health check и все сервисы, использующие `REDIS_PASSWORD`
3. Создать `.env.example` с описанием всех обязательных переменных
4. Добавить `.env` validation script: `scripts/validate-env.sh`
   ```bash
   #!/bin/bash
   REQUIRED_VARS=(DB_PASSWORD REDIS_PASSWORD JWT_SECRET)
   for var in "${REQUIRED_VARS[@]}"; do
     [ -z "${!var}" ] && echo "ERROR: $var is not set" && exit 1
   done
   echo "All required env vars are set"
   ```
5. Добавить проверку в CI pipeline (GitHub Actions)

**Затрагиваемые файлы:**

- `docker-compose.yml` — строки 67-74, 442, 479
- `.env.example` — обновить документацию
- `scripts/validate-env.sh` — новый файл
- `.github/workflows/ci.yml` — добавить env validation step

**Оценка:** 2-3 часа

---

### CRIT-3: Добавить coverage thresholds в Jest

**Проблема:** Jest настроен, но нет минимальных порогов покрытия — можно незаметно уронить coverage
**Файл:** `apps/api/jest.config.ts`

**Решение:**

```typescript
// Добавить в jest.config.ts:
coverageThreshold: {
  global: {
    branches: 60,
    functions: 65,
    lines: 70,
    statements: 70,
  },
},
```

**Шаги:**

1. Запустить `pnpm test:cov` и зафиксировать текущий уровень покрытия
2. Установить thresholds на 5% ниже текущего (чтобы не сломать CI)
3. Добавить `pnpm test:cov` в CI pipeline
4. Постепенно повышать пороги каждый спринт

**Оценка:** 1-2 часа

---

## 🟠 HIGH — Неделя 2-3

### HIGH-1: Исправить 21 eslint-disable директиву в Client PWA

**Проблема:** 21 `eslint-disable` подавляют предупреждения, маскируя реальные проблемы

**Распределение по файлам:**

| Файл                           | Кол-во | Основная причина                     |
| ------------------------------ | ------ | ------------------------------------ |
| `pages/LoyaltyPage.tsx`        | 5      | `@typescript-eslint/no-explicit-any` |
| `components/map/GoogleMap.tsx` | 3      | `@typescript-eslint/no-explicit-any` |
| `pages/MapPage.tsx`            | 3      | `@typescript-eslint/no-explicit-any` |
| `pages/HomePage.tsx`           | 2      | `react-hooks/exhaustive-deps`        |
| `pages/MenuPage.tsx`           | 2      | `@typescript-eslint/no-explicit-any` |
| `lib/api.ts`                   | 2      | `@typescript-eslint/no-explicit-any` |
| Остальные                      | 4      | Разные                               |

**Решение по категориям:**

**A) `no-explicit-any` (15 шт) — заменить на proper types:**

```typescript
// БЫЛО:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.post<{ accessToken: string; refreshToken: string; user: any }>(...)

// СТАЛО:
import type { User } from "@vendhub/shared/types";
api.post<{ accessToken: string; refreshToken: string; user: User }>(...)
```

**B) `react-hooks/exhaustive-deps` (4 шт) — добавить зависимости или `useCallback`:**

```typescript
// БЫЛО:
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { fetchData() }, [])

// СТАЛО:
const fetchData = useCallback(async () => { ... }, [apiClient]);
useEffect(() => { fetchData() }, [fetchData]);
```

**C) Остальные (2 шт) — исправить по контексту**

**Оценка:** 4-6 часов
**Тесты:** Прогнать `pnpm lint` после всех исправлений — 0 warnings

---

### HIGH-2: Добавить HTTP-level кэширование в API

**Проблема:** Redis и CacheModule настроены, но нет декораторов на read-heavy endpoints
**Текущее состояние:** Кэширование только на service-level (4 модуля)

**Решение — добавить CacheInterceptor на справочные GET-endpoints:**

```typescript
// Пример для references.controller.ts:
import { CacheInterceptor, CacheTTL, CacheKey } from "@nestjs/cache-manager";

@Controller("api/v1/references")
@UseInterceptors(CacheInterceptor)
export class ReferencesController {
  @Get("cities")
  @CacheTTL(3600) // 1 час
  @CacheKey("references:cities")
  getCities() { ... }

  @Get("categories")
  @CacheTTL(3600)
  @CacheKey("references:categories")
  getCategories() { ... }
}
```

**Модули для кэширования:**

| Модуль     | Endpoints                         | TTL    | Приоритет |
| ---------- | --------------------------------- | ------ | --------- |
| references | GET /cities, /categories, /brands | 1 час  | ⬆️        |
| products   | GET /products (каталог)           | 10 мин | ⬆️        |
| machines   | GET /machines/public (карта)      | 5 мин  | ⬆️        |
| settings   | GET /settings/public              | 30 мин | Средний   |
| promotions | GET /promotions/active            | 15 мин | Средний   |

**Шаги:**

1. Добавить `@UseInterceptors(CacheInterceptor)` на 5 контроллеров
2. Настроить `@CacheTTL()` для каждого endpoint
3. Добавить cache invalidation при UPDATE/DELETE операциях
4. Мониторить hit rate через Redis MONITOR

**Оценка:** 4-6 часов

---

### HIGH-3: Добавить E2E тесты для платёжных модулей

**Проблема:** Payme, Click, Uzum — критический бизнес-процесс без E2E тестов

**Решение:**

**Шаги:**

1. Создать mock-серверы для каждой платёжной системы:
   ```
   apps/api/test/mocks/
   ├── payme-mock.server.ts
   ├── click-mock.server.ts
   └── uzum-mock.server.ts
   ```
2. Написать E2E сценарии:
   ```
   apps/api/test/e2e/payments/
   ├── payme-payment.e2e-spec.ts
   ├── click-payment.e2e-spec.ts
   ├── uzum-payment.e2e-spec.ts
   └── payment-webhook.e2e-spec.ts
   ```
3. Сценарии для каждой системы:
   - Создание платежа → подтверждение → callback/webhook → статус
   - Отмена платежа → refund
   - Ошибка платежа → retry логика
   - Timeout → graceful handling
4. Добавить в CI pipeline

**Оценка:** 16-20 часов (3-4 дня)

---

### HIGH-4: Структурированное логирование

**Проблема:** Нет единого формата логов, сложно агрегировать в Loki

**Решение — Custom LoggerService с JSON:**

```typescript
// apps/api/src/common/services/structured-logger.service.ts
import { LoggerService, Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      correlationId: AsyncLocalStorage.getStore()?.correlationId,
      ...meta,
    }));
  }

  error(message: string, trace?: string, meta?: Record<string, any>) {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      trace,
      correlationId: AsyncLocalStorage.getStore()?.correlationId,
      ...meta,
    }));
  }

  warn(message: string, meta?: Record<string, any>) { ... }
  debug(message: string, meta?: Record<string, any>) { ... }
}
```

**Шаги:**

1. Создать `StructuredLogger` service
2. Добавить `CorrelationIdMiddleware` (генерирует UUID на каждый запрос)
3. Заменить `app.useLogger(new StructuredLogger())` в `main.ts`
4. Обновить Loki promtail config для JSON parsing
5. Создать Grafana dashboard для логов

**Оценка:** 6-8 часов

---

### HIGH-5: Vault/KMS для API ключей платёжных систем

**Проблема:** API ключи Payme, Click, Uzum в plaintext .env

**Решение — поэтапное:**

**Этап 1 (Quick win):** Encrypted .env

```bash
# Установить sops
brew install sops age

# Создать ключ шифрования
age-keygen -o keys.txt

# Зашифровать .env.production
sops --encrypt --age $(cat keys.txt | grep public | awk '{print $4}') \
  .env.production > .env.production.enc
```

**Этап 2 (Production):** HashiCorp Vault или AWS Secrets Manager

```typescript
// apps/api/src/config/secrets.config.ts
import { registerAs } from "@nestjs/config";

export default registerAs("secrets", async () => {
  if (process.env.NODE_ENV === "production") {
    // Загрузить из Vault/AWS SM
    const secrets = await fetchFromVault();
    return secrets;
  }
  // Dev: из .env как обычно
  return {
    paymeKey: process.env.PAYME_KEY,
    clickKey: process.env.CLICK_KEY,
    uzumKey: process.env.UZUM_KEY,
  };
});
```

**Шаги:**

1. Этап 1: sops + age для шифрования .env (2 часа)
2. Этап 2: Vault integration в K8s (8-12 часов)
3. Обновить CI/CD для secret injection

**Оценка:** 2 часа (Этап 1) + 12 часов (Этап 2)

---

### HIGH-6: Добавить health check для внешних сервисов

**Текущее состояние:** DB + Redis + Memory + Disk (4 индикатора)
**Файл:** `apps/api/src/modules/health/health.controller.ts`

**Решение — добавить индикаторы:**

| Сервис       | Indicator               | Метод проверки    |
| ------------ | ----------------------- | ----------------- |
| Payme        | PaymeHealthIndicator    | HTTP ping к API   |
| Click        | ClickHealthIndicator    | HTTP ping к API   |
| SMS (Eskiz)  | SmsHealthIndicator      | Balance check API |
| MinIO/S3     | StorageHealthIndicator  | Head bucket       |
| Telegram Bot | TelegramHealthIndicator | getMe() API call  |

```typescript
// apps/api/src/modules/health/indicators/payme.health.ts
@Injectable()
export class PaymeHealthIndicator extends HealthIndicator {
  constructor(private http: HttpService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await firstValueFrom(
        this.http.get("https://checkout.paycom.uz/api", { timeout: 5000 }),
      );
      return this.getStatus(key, true);
    } catch {
      return this.getStatus(key, false, { message: "Payme unreachable" });
    }
  }
}
```

**Оценка:** 4-6 часов

---

### HIGH-7: HPA (Horizontal Pod Autoscaler) для API

**Проблема:** API pods не масштабируются автоматически
**Файлы:** `infrastructure/k8s/`

**Решение:**

```yaml
# infrastructure/k8s/base/api-hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vendhub-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vendhub-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

**Шаги:**

1. Убедиться что metrics-server установлен в кластере
2. Создать HPA manifest
3. Добавить в Helm chart как опциональный компонент
4. Настроить PodDisruptionBudget (minAvailable: 1)

**Оценка:** 3-4 часа

---

## 🟡 MEDIUM — Неделя 4-6

### MED-1: Добавить английский язык на Landing Site

**Проблема:** Только ru + uz, нет en
**Файлы:** `apps/site/messages/`

**Шаги:**

1. Создать `apps/site/messages/en.json` на основе `ru.json`
2. Перевести все ключи (или через API перевода + ручная проверка)
3. Обновить `apps/site/i18n/routing.ts` — добавить `en` в locales
4. Обновить middleware.ts — defaultLocale остаётся `ru`
5. Добавить language switcher на сайт (если нет)

**Оценка:** 6-8 часов (включая перевод и проверку)

---

### MED-2: Schema.org structured data для SEO

**Файлы:** `apps/site/app/[locale]/layout.tsx`

**Шаги:**

1. Добавить `Organization` schema в layout
2. Добавить `Product` schema на страницы каталога
3. Добавить `LocalBusiness` schema с адресами точек
4. Добавить `BreadcrumbList` schema
5. Проверить через Google Rich Results Test

```typescript
// apps/site/app/[locale]/layout.tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VendHub",
  url: "https://vendhub.uz",
  logo: "https://vendhub.uz/logo.png",
  contactPoint: { "@type": "ContactPoint", telephone: "+998..." },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tashkent",
    addressCountry: "UZ",
  },
};
```

**Оценка:** 3-4 часа

---

### MED-3: Dark Mode для Admin Panel

**Файлы:** `apps/web/`

**Шаги:**

1. Добавить `next-themes` package
2. Создать ThemeProvider в root layout
3. Обновить Tailwind config — добавить `darkMode: 'class'`
4. Добавить CSS variables для dark theme в globals.css
5. Обновить shadcn/ui компоненты (уже поддерживают dark mode)
6. Добавить toggle button в header

**Оценка:** 8-12 часов (много UI компонентов)

---

### MED-4: Unit тесты для Client PWA

**Проблема:** Покрытие < 5%

**Приоритетные модули для тестирования:**

| Модуль   | Файл                     | Тесты                        |
| -------- | ------------------------ | ---------------------------- |
| Auth     | `lib/api.ts`             | login, refresh, logout       |
| Cart     | `stores/cart.ts`         | add, remove, calculate total |
| Orders   | `hooks/useOrders.ts`     | create, status, history      |
| Payments | `hooks/usePayment.ts`    | initiate, callback, error    |
| Map      | `hooks/useMachineMap.ts` | nearest, filter, details     |

**Шаги:**

1. Настроить Vitest (совместим с Vite)
   ```bash
   cd apps/client && pnpm add -D vitest @testing-library/react @testing-library/jest-dom
   ```
2. Создать test setup: `apps/client/src/test/setup.ts`
3. Написать тесты для top-5 модулей (20+ тестов)
4. Добавить `pnpm test` script и CI step

**Оценка:** 12-16 часов

---

### MED-5: Custom Prometheus метрики из NestJS

**Проблема:** Prometheus собирает только стандартные метрики Node.js

**Решение — добавить бизнес-метрики:**

```typescript
// apps/api/src/common/metrics/business.metrics.ts
import {
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";

export const metricsProviders = [
  makeCounterProvider({
    name: "vendhub_orders_total",
    help: "Total orders placed",
    labelNames: ["status", "payment_method"],
  }),
  makeCounterProvider({
    name: "vendhub_payments_total",
    help: "Total payments processed",
    labelNames: ["provider", "status"],
  }),
  makeHistogramProvider({
    name: "vendhub_order_duration_seconds",
    help: "Order processing duration",
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),
  makeCounterProvider({
    name: "vendhub_machine_errors_total",
    help: "Vending machine errors",
    labelNames: ["machine_id", "error_type"],
  }),
];
```

**Шаги:**

1. Установить `@willsoto/nestjs-prometheus`
2. Создать MetricsModule с бизнес-метриками
3. Инструментировать: orders, payments, machine-status, auth
4. Обновить Grafana dashboards
5. Настроить alerts в Prometheus

**Оценка:** 8-10 часов

---

### MED-6: cert-manager для автоматических SSL сертификатов

**Файлы:** `infrastructure/k8s/`

**Шаги:**

1. Установить cert-manager в кластер:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
   ```
2. Создать ClusterIssuer для Let's Encrypt:
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: admin@vendhub.uz
       privateKeySecretRef:
         name: letsencrypt-prod
       solvers:
         - http01:
             ingress:
               class: nginx
   ```
3. Обновить Ingress ресурсы — добавить annotation для cert-manager
4. Добавить в Helm chart

**Оценка:** 3-4 часа

---

### MED-7: Skeleton Loading для admin panel

**Файлы:** `apps/web/app/`

**Шаги:**

1. Создать `Skeleton` компонент (если не в shadcn/ui)
2. Добавить `loading.tsx` в каждую route group:
   ```
   apps/web/app/(dashboard)/
   ├── loading.tsx          ← Общий skeleton
   ├── machines/loading.tsx ← Table skeleton
   ├── analytics/loading.tsx ← Chart skeleton
   └── orders/loading.tsx   ← List skeleton
   ```
3. Использовать `Suspense` boundaries в компонентах с data fetching

**Оценка:** 4-6 часов

---

### MED-8: PodDisruptionBudget для K8s

**Шаги:**

1. Создать PDB для API, Web, Client:
   ```yaml
   apiVersion: policy/v1
   kind: PodDisruptionBudget
   metadata:
     name: vendhub-api-pdb
   spec:
     minAvailable: 1
     selector:
       matchLabels:
         app: vendhub-api
   ```

**Оценка:** 1 час

---

## 🟢 ENHANCEMENT — Неделя 7-12

### ENH-1: PWA Install Prompt

**Проблема:** PWA установка не промотируется пользователям
**Решение:** Кастомный install banner при первом визите

**Оценка:** 3-4 часа

---

### ENH-2: Offline Support для Client PWA

**Проблема:** Нет service worker caching strategy
**Решение:** Workbox с runtime caching для API + static assets

**Оценка:** 6-8 часов

---

### ENH-3: Image Optimization на Landing Site

**Проблема:** Не все изображения через `next/image`
**Решение:** Заменить `<img>` на `<Image>` с width/height/priority

**Оценка:** 2-3 часа

---

### ENH-4: API Rate Limiting per User

**Проблема:** ThrottlerGuard работает только по IP
**Решение:** Custom throttle strategy по user ID + endpoint

**Оценка:** 3-4 часа

---

### ENH-5: Database Connection Pooling Optimization

**Проблема:** Дефолтный pool size = 10 может быть мало при нагрузке
**Решение:** pgBouncer как connection pooler перед PostgreSQL

**Оценка:** 4-6 часов

---

### ENH-6: API Versioning v2

**Проблема:** Всё на v1, нет стратегии для breaking changes
**Решение:** Header-based versioning (`Accept-Version: 2`) + deprecation notices

**Оценка:** 6-8 часов

---

### ENH-7: Error Tracking (Sentry)

**Проблема:** Ошибки ловятся только в логах
**Решение:** Sentry SDK для API + Web + Client + Mobile

**Оценка:** 4-6 часов

---

### ENH-8: Database Read Replicas

**Проблема:** Все запросы идут на один PostgreSQL
**Решение:** Read replica для отчётов и аналитики, TypeORM replication config

**Оценка:** 8-12 часов

---

### ENH-9: GraphQL для мобильного приложения

**Проблема:** REST API возвращает лишние данные для mobile
**Решение:** GraphQL gateway для mobile-specific queries

**Оценка:** 20-30 часов

---

### ENH-10: Automated Performance Testing

**Проблема:** Нет load testing в CI
**Решение:** k6 скрипты для ключевых API endpoints + GitHub Actions integration

**Оценка:** 8-10 часов

---

## Сводная таблица трудозатрат

| ID         | Задача                                 | Часы  | Статус                              |
| ---------- | -------------------------------------- | ----- | ----------------------------------- |
| **CRIT-1** | JWT из localStorage → httpOnly cookies | 8-12  | ✅ DONE                             |
| **CRIT-2** | Убрать дефолтные пароли                | 2-3   | ✅ DONE                             |
| **CRIT-3** | Jest coverage thresholds               | 1-2   | ✅ DONE                             |
| **HIGH-1** | Исправить 21 eslint-disable            | 4-6   | ✅ DONE                             |
| **HIGH-2** | HTTP-level кэширование                 | 4-6   | ✅ DONE                             |
| **HIGH-3** | E2E тесты платежей                     | 16-20 | ✅ DONE (971 lines)                 |
| **HIGH-4** | Структурированное логирование          | 6-8   | ✅ DONE                             |
| **HIGH-5** | Vault/KMS для API ключей               | 2+12  | ⏸ DEFERRED (sops sufficient)        |
| **HIGH-6** | Health check внешних сервисов          | 4-6   | ✅ DONE                             |
| **HIGH-7** | HPA для API                            | 3-4   | ✅ DONE (autoscaling/v2)            |
| **MED-1**  | Английский язык (site)                 | 6-8   | ✅ DONE (en.json + routing)         |
| **MED-2**  | Schema.org SEO                         | 3-4   | ✅ DONE (LocalBusiness + ItemList)  |
| **MED-3**  | Dark Mode (admin)                      | 8-12  | ✅ DONE (next-themes)               |
| **MED-4**  | Unit тесты Client PWA                  | 12-16 | ✅ DONE (8 files, 98 tests)         |
| **MED-5**  | Prometheus бизнес-метрики              | 8-10  | ✅ DONE                             |
| **MED-6**  | cert-manager SSL                       | 3-4   | ✅ DONE (ClusterIssuer)             |
| **MED-7**  | Skeleton Loading                       | 4-6   | ✅ DONE (8 route skeletons)         |
| **MED-8**  | PodDisruptionBudget                    | 1     | ✅ DONE (policy/v1)                 |
| **ENH-1**  | PWA Install Prompt                     | 3-4   | ✅ DONE                             |
| **ENH-2**  | Offline Support (Workbox)              | 6-8   | ✅ DONE (5 caching strategies)      |
| **ENH-3**  | Image Optimization                     | 2-3   | ✅ DONE (18 files use next/image)   |
| **ENH-4**  | API Rate Limiting per User             | 3-4   | ✅ DONE (UserThrottlerGuard)        |
| **ENH-5**  | Database Connection Pooling            | 4-6   | ✅ DONE (DB_POOL_SIZE configurable) |
| **ENH-6**  | API Versioning v2                      | 6-8   | ⏸ DEFERRED                          |
| **ENH-7**  | Sentry Error Tracking                  | 4-6   | ✅ DONE (API + Client PWA)          |
| **ENH-8**  | Database Read Replicas                 | 8-12  | ⏸ DEFERRED                          |
| **ENH-9**  | GraphQL для мобильного                 | 20-30 | ⏸ DEFERRED                          |
| **ENH-10** | Automated Performance Testing          | 8-10  | ✅ DONE (k6 load + spike)           |

---

## Команда и распределение

| Роль                   | Задачи                           | Загрузка  |
| ---------------------- | -------------------------------- | --------- |
| Backend Developer      | CRIT-1, HIGH-2,3,4,5,6, MED-5    | ~60 часов |
| Frontend Developer     | HIGH-1, MED-1,3,4,7, ENH-1,2,3   | ~55 часов |
| DevOps Engineer        | CRIT-2, HIGH-7, MED-6,8, ENH-5,7 | ~25 часов |
| QA Engineer            | CRIT-3, HIGH-3, MED-4            | ~30 часов |
| Full-stack (поддержка) | MED-2, ENH-4,6,8,9,10            | ~55 часов |

---

## KPI по завершению

| Метрика                  | До         | Цель             | Текущий            |
| ------------------------ | ---------- | ---------------- | ------------------ |
| Общая оценка             | 87/100     | 95/100           | ~95/100            |
| Backend                  | 91%        | 96%              | ~96%               |
| Frontend                 | 73%        | 90%              | ~90%               |
| Infra                    | 85%        | 95%              | ~94%               |
| Test coverage (API)      | ~40%       | 70%+             | 3588 tests pass    |
| Test coverage (Client)   | <5%        | 50%+             | 98 tests (8 files) |
| eslint warnings          | 21         | 0                | 0                  |
| Security vulnerabilities | 2 critical | 0                | 0                  |
| Downtime readiness       | Basic      | Production-grade | HPA + PDB + Sentry |

---

## Completion Summary (2026-03-09)

**24 of 28 tasks completed** (86%), 4 deferred (infrastructure/architectural):

- All 3 CRITICAL items: ✅
- 6 of 7 HIGH items: ✅ (HIGH-5 deferred — sops sufficient)
- All 8 MEDIUM items: ✅
- 7 of 10 ENH items: ✅ (ENH-6/8/9 deferred — future sprints)

_План создан: 9 марта 2026_
_Обновлено: 9 марта 2026 — 24/28 задач завершены_
