---
name: vhm24-devops
description: |
  VendHub DevOps - Docker, Kubernetes, CI/CD, мониторинг.
  Настройка контейнеров, оркестрация, пайплайны развёртывания.
  Использовать при деплое, настройке инфраструктуры, CI/CD.
---

# VendHub DevOps & Deployment

Скилл для настройки инфраструктуры, CI/CD и деплоя VendHub OS.

## Архитектура деплоя VendHub

```text
+------------------------------------------------------------------+
|                      GitHub Repository                            |
|  +---------+  +---------+  +---------+  +---------+  +---------+ |
|  | backend |  |   web   |  | client  |  |   bot   |  |  docs   | |
|  +----+----+  +----+----+  +----+----+  +----+----+  +---------+ |
+-------|-----------|-----------|-----------|-----------------------+
        |           |           |           |
        v           v           v           v
+------------------------------------------------------------------+
|               GitHub Actions CI/CD                                |
|  ci.yml: lint -> test -> build -> push Docker images              |
|  release.yml: tag -> build -> deploy to K8s                       |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
|              Docker Registry (GHCR / DockerHub)                   |
|  vendhub/api:latest    vendhub/web:latest                        |
|  vendhub/client:latest vendhub/bot:latest                        |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
|                  Kubernetes Cluster                                |
|  +------------------+  +------------------+  +------------------+ |
|  | Namespace: stage  |  | Namespace: prod  |  | Namespace: mon   | |
|  | - api (NestJS)   |  | - api (NestJS)   |  | - Prometheus     | |
|  | - web (Next.js)  |  | - web (Next.js)  |  | - Grafana        | |
|  | - client (React) |  | - client (React) |  | - Loki           | |
|  | - bot (Node)     |  | - bot (Node)     |  | - AlertManager   | |
|  | - postgres       |  | - postgres       |  +------------------+ |
|  | - redis          |  | - redis          |                       |
|  +------------------+  +------------------+                       |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
|                    Внешние сервисы                                 |
|  - Cloudflare (DNS + CDN + WAF)                                  |
|  - S3 / Minio (файлы, бэкапы)                                   |
|  - Sentry (ошибки)                                               |
|  - Vault (секреты)                                               |
+------------------------------------------------------------------+
```

## Стек технологий

| Компонент | Технология | Деплой |
| --------- | ---------- | ------ |
| Backend API | NestJS 11 + TypeORM | Docker -> Kubernetes |
| Web (SSR) | Next.js 16 + React 19 | Docker -> Kubernetes |
| Client (SPA) | React 19 + Vite | Docker (nginx) -> Kubernetes |
| Bot | Node.js + Telegraf | Docker -> Kubernetes |
| Database | PostgreSQL 16 | Docker Compose (dev) / K8s StatefulSet (prod) |
| Cache | Redis 7 | Docker Compose (dev) / K8s StatefulSet (prod) |
| Files | S3-compatible (Minio / AWS S3) | Docker Compose (dev) / облако (prod) |
| Mobile | React Native + Expo | App Store / Play Store |
| IaC | Terraform + Helm | CI/CD |
| Мониторинг | Prometheus + Grafana + Loki | Kubernetes |

## Структура конфигурации

```text
VHM24-repo/
+-- docker-compose.yml              # Локальная разработка
+-- docker-compose.prod.yml         # Production (для standalone деплоя)
+-- docker-compose.monitoring.yml   # Prometheus + Grafana + Loki
+-- docker-compose.test.yml         # Тестирование
+-- .github/
|   +-- workflows/
|       +-- ci.yml                  # Lint + Test + Build + Push Docker
|       +-- release.yml             # Тегирование + Deploy в K8s
+-- backend/
|   +-- Dockerfile
|   +-- Dockerfile.prod
|   +-- .env.example
+-- web/
|   +-- Dockerfile
|   +-- Dockerfile.prod
+-- client/
|   +-- Dockerfile
|   +-- Dockerfile.prod
|   +-- nginx.conf
+-- bot/
|   +-- Dockerfile
|   +-- Dockerfile.prod
+-- infra/
|   +-- terraform/
|   |   +-- main.tf                 # Основная инфраструктура
|   |   +-- variables.tf            # Переменные
|   |   +-- outputs.tf              # Выходные данные
|   |   +-- modules/
|   |       +-- k8s-cluster/        # Модуль кластера Kubernetes
|   |       +-- database/           # Модуль managed PostgreSQL
|   |       +-- redis/              # Модуль managed Redis
|   |       +-- networking/         # VPC, subnets, firewall
|   +-- helm/
|   |   +-- vendhub/
|   |       +-- Chart.yaml
|   |       +-- values.yaml          # Значения по умолчанию
|   |       +-- values-staging.yaml  # Переопределение для staging
|   |       +-- values-prod.yaml     # Переопределение для production
|   |       +-- templates/
|   |           +-- api-deployment.yaml
|   |           +-- api-service.yaml
|   |           +-- web-deployment.yaml
|   |           +-- web-service.yaml
|   |           +-- client-deployment.yaml
|   |           +-- client-service.yaml
|   |           +-- bot-deployment.yaml
|   |           +-- ingress.yaml
|   |           +-- configmap.yaml
|   |           +-- secrets.yaml
|   |           +-- hpa.yaml
|   +-- k8s/
|       +-- base/
|       |   +-- kustomization.yaml
|       |   +-- namespace.yaml
|       |   +-- api-deployment.yaml
|       |   +-- api-service.yaml
|       |   +-- web-deployment.yaml
|       |   +-- web-service.yaml
|       |   +-- client-deployment.yaml
|       |   +-- client-service.yaml
|       |   +-- bot-deployment.yaml
|       |   +-- ingress.yaml
|       |   +-- postgres-statefulset.yaml
|       |   +-- redis-statefulset.yaml
|       +-- overlays/
|           +-- staging/
|           |   +-- kustomization.yaml
|           |   +-- patches/
|           |       +-- replica-count.yaml
|           |       +-- resource-limits.yaml
|           +-- production/
|               +-- kustomization.yaml
|               +-- patches/
|                   +-- replica-count.yaml
|                   +-- resource-limits.yaml
|                   +-- hpa.yaml
+-- scripts/
    +-- deploy/
    |   +-- deploy.sh                # Скрипт деплоя через Helm/kubectl
    |   +-- rollback.sh              # Скрипт отката
    +-- db/
        +-- backup.sh                # Бэкап PostgreSQL
        +-- restore.sh               # Восстановление из бэкапа
```

## Docker Compose (локальная разработка)

### Сервисы docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vendhub
      POSTGRES_USER: vendhub
      POSTGRES_PASSWORD: vendhub_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendhub"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://vendhub:vendhub_dev@postgres:5432/vendhub
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - API_URL=http://api:3001
    depends_on:
      - api
    volumes:
      - ./web:/app
      - /app/node_modules

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - api
    volumes:
      - ./client:/app
      - /app/node_modules

  bot:
    build:
      context: ./bot
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=development
      - API_URL=http://api:3001
      - BOT_TOKEN=${BOT_TOKEN}
    depends_on:
      - api
    volumes:
      - ./bot:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

## Docker (паттерны)

### Multi-stage build для NestJS

```dockerfile
# Этап 1: Зависимости
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Этап 2: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/main"]
```

### Multi-stage build для React (Vite + nginx)

```dockerfile
# Этап 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

## CI/CD через GitHub Actions

### ci.yml (Lint + Test + Build)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: vendhub_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/vendhub_test
          REDIS_URL: redis://localhost:6379

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile.prod
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### release.yml (Тегирование + Deploy)

```yaml
# .github/workflows/release.yml
name: Release & Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api, web, client, bot]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service == 'api' && 'backend' || matrix.service }}
          file: ./${{ matrix.service == 'api' && 'backend' || matrix.service }}/Dockerfile.prod
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:latest

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v3
      - uses: azure/setup-helm@v3
      - run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig.yaml
          export KUBECONFIG=kubeconfig.yaml
          helm upgrade --install vendhub ./infra/helm/vendhub \
            -f ./infra/helm/vendhub/values-staging.yaml \
            --set image.tag=${{ github.ref_name }} \
            --namespace vendhub-staging \
            --create-namespace \
            --wait --timeout 10m

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v3
      - uses: azure/setup-helm@v3
      - run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig.yaml
          export KUBECONFIG=kubeconfig.yaml
          helm upgrade --install vendhub ./infra/helm/vendhub \
            -f ./infra/helm/vendhub/values-prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --namespace vendhub-prod \
            --create-namespace \
            --wait --timeout 10m
```

## Kubernetes (паттерны деплоя)

### Kustomize: base + overlays

**base/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - api-deployment.yaml
  - api-service.yaml
  - web-deployment.yaml
  - web-service.yaml
  - client-deployment.yaml
  - client-service.yaml
  - bot-deployment.yaml
  - ingress.yaml
  - postgres-statefulset.yaml
  - redis-statefulset.yaml
```

**overlays/staging/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namespace: vendhub-staging

patchesStrategicMerge:
  - patches/replica-count.yaml
  - patches/resource-limits.yaml

images:
  - name: vendhub/api
    newName: ghcr.io/vendhub/api
    newTag: latest
  - name: vendhub/web
    newName: ghcr.io/vendhub/web
    newTag: latest
  - name: vendhub/client
    newName: ghcr.io/vendhub/client
    newTag: latest
```

**overlays/production/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namespace: vendhub-prod

patchesStrategicMerge:
  - patches/replica-count.yaml
  - patches/resource-limits.yaml
  - patches/hpa.yaml

images:
  - name: vendhub/api
    newName: ghcr.io/vendhub/api
    newTag: stable
  - name: vendhub/web
    newName: ghcr.io/vendhub/web
    newTag: stable
  - name: vendhub/client
    newName: ghcr.io/vendhub/client
    newTag: stable
```

### Пример Deployment (API)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vendhub-api
  labels:
    app: vendhub
    component: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vendhub
      component: api
  template:
    metadata:
      labels:
        app: vendhub
        component: api
    spec:
      containers:
        - name: api
          image: vendhub/api:latest
          ports:
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: vendhub-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: vendhub-secrets
                  key: redis-url
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
```

### HPA (Horizontal Pod Autoscaler)

```yaml
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
```

## Terraform (инфраструктура)

### Основной файл

```hcl
# infra/terraform/main.tf

terraform {
  required_version = ">= 1.5"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "s3" {
    bucket = "vendhub-terraform-state"
    key    = "infra/terraform.tfstate"
    region = "us-east-1"
  }
}

module "k8s_cluster" {
  source       = "./modules/k8s-cluster"
  cluster_name = var.cluster_name
  node_count   = var.node_count
  node_size    = var.node_size
}

module "database" {
  source      = "./modules/database"
  db_name     = "vendhub"
  db_version  = "16"
  db_size     = var.db_size
  depends_on  = [module.k8s_cluster]
}

module "redis" {
  source      = "./modules/redis"
  redis_version = "7"
  depends_on  = [module.k8s_cluster]
}

module "networking" {
  source     = "./modules/networking"
  domain     = var.domain
  depends_on = [module.k8s_cluster]
}
```

## Helm Chart

### Chart.yaml

```yaml
# infra/helm/vendhub/Chart.yaml
apiVersion: v2
name: vendhub
description: VendHub OS - платформа управления вендинговым бизнесом
type: application
version: 1.0.0
appVersion: "1.0.0"
```

### values.yaml (значения по умолчанию)

```yaml
# infra/helm/vendhub/values.yaml
image:
  registry: ghcr.io
  tag: latest
  pullPolicy: IfNotPresent

api:
  replicas: 2
  port: 3001
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi

web:
  replicas: 2
  port: 3000
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

client:
  replicas: 1
  port: 80
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi

bot:
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: vendhub.uz
      paths:
        - path: /api
          service: api
        - path: /
          service: web
    - host: app.vendhub.uz
      paths:
        - path: /
          service: client
  tls:
    - secretName: vendhub-tls
      hosts:
        - vendhub.uz
        - app.vendhub.uz

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPU: 70
```

## Чеклист деплоя

### Pre-deployment

- [ ] Все Jest тесты проходят (`npm test`)
- [ ] Линтинг без ошибок (`npm run lint`)
- [ ] TypeScript компилируется (`npm run build`)
- [ ] Environment variables настроены (Kubernetes Secrets / ConfigMap)
- [ ] TypeORM миграции готовы (`npm run migration:run`)
- [ ] Docker образы собираются без ошибок
- [ ] Helm chart валидный (`helm lint ./infra/helm/vendhub`)

### Deployment

- [ ] Docker образы запушены в registry (GHCR)
- [ ] Helm release обновлён (`helm upgrade --install`)
- [ ] Health check endpoint работает (/health)
- [ ] SSL сертификат установлен (cert-manager)
- [ ] DNS записи настроены (Cloudflare)
- [ ] Ingress маршруты работают

### Post-deployment

- [ ] Smoke tests пройдены
- [ ] Prometheus получает метрики
- [ ] Grafana дашборды показывают данные
- [ ] Loki собирает логи
- [ ] AlertManager уведомления настроены
- [ ] Бэкап PostgreSQL настроен (CronJob)

## Команды

```bash
# === Локальная разработка ===
docker-compose up -d                              # Поднять все сервисы
docker-compose logs -f api                        # Логи API
docker-compose exec api npm run migration:run     # Запустить миграции

# === Docker образы ===
docker build -t vendhub/api:latest -f backend/Dockerfile.prod ./backend
docker build -t vendhub/web:latest -f web/Dockerfile.prod ./web
docker build -t vendhub/client:latest -f client/Dockerfile.prod ./client
docker build -t vendhub/bot:latest -f bot/Dockerfile.prod ./bot

# === Kubernetes ===
kubectl apply -k infra/k8s/overlays/staging/      # Деплой в staging
kubectl apply -k infra/k8s/overlays/production/    # Деплой в production
kubectl get pods -n vendhub-prod                   # Статус подов
kubectl logs -f deploy/vendhub-api -n vendhub-prod # Логи API

# === Helm ===
helm upgrade --install vendhub ./infra/helm/vendhub \
  -f ./infra/helm/vendhub/values-prod.yaml \
  --namespace vendhub-prod --create-namespace

helm rollback vendhub 1 --namespace vendhub-prod   # Откат на предыдущую версию
helm history vendhub --namespace vendhub-prod       # История релизов

# === Terraform ===
cd infra/terraform
terraform init                                     # Инициализация
terraform plan                                     # Просмотр изменений
terraform apply                                    # Применение изменений

# === Проверка здоровья ===
curl https://api.vendhub.uz/health
curl https://vendhub.uz/
curl https://app.vendhub.uz/

# === Бэкапы ===
./scripts/db/backup.sh                             # Ручной бэкап PostgreSQL
./scripts/db/restore.sh backup_20260101.sql        # Восстановление из бэкапа
```

## Rollback процедура

```bash
# === Helm (рекомендуется) ===
helm rollback vendhub 1 --namespace vendhub-prod           # Откат на 1 ревизию назад
helm rollback vendhub 1 --namespace vendhub-staging        # Откат staging

# === Kubernetes (Kustomize) ===
kubectl rollout undo deployment/vendhub-api -n vendhub-prod
kubectl rollout undo deployment/vendhub-web -n vendhub-prod
kubectl rollout status deployment/vendhub-api -n vendhub-prod  # Проверка статуса

# === Docker Compose (standalone) ===
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --no-build

# === БД откат миграций ===
docker-compose exec api npm run migration:revert
```

## Troubleshooting

| Проблема | Решение |
| -------- | ------- |
| Docker build fails | Проверить node_modules кэш, очистить docker cache (`docker builder prune`) |
| Pod CrashLoopBackOff | Проверить логи: `kubectl logs pod-name -n namespace --previous` |
| Health check fails | Проверить DATABASE_URL, REDIS_URL в Kubernetes Secrets |
| 502 Bad Gateway | Проверить Ingress, порт сервиса, readinessProbe |
| SSL errors | Проверить cert-manager, ClusterIssuer, обновить сертификат |
| OOMKilled | Увеличить memory limits в Helm values или Kustomize patch |
| ImagePullBackOff | Проверить Docker registry credentials (imagePullSecrets) |
| Migration fails | Проверить подключение к БД, откатить: `npm run migration:revert` |
| Terraform state lock | Разблокировать: `terraform force-unlock LOCK_ID` |
| Helm upgrade fails | Проверить `helm history`, откатить: `helm rollback` |
| Pods не шедулятся | Проверить ресурсы нод: `kubectl describe nodes`, увеличить кластер |
| Prometheus нет метрик | Проверить ServiceMonitor, annotations на подах |
