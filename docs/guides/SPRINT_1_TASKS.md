# Спринт 1: Инфраструктура

> **Длительность:** 5 дней (40 часов)
> **Цель:** Настроить проект, CI/CD, базу данных
> **Статус:** 🟡 Готов к старту

---

## День 1: Инициализация проекта

### Задача 1.1: Форк и очистка VHM24-repo
**Время:** 4 часа | **Приоритет:** P0

```bash
# Действия:
1. Форк репозитория VHM24-repo
2. Клонирование локально
3. Удаление неиспользуемых модулей:
   - hr/ (кадры - Фаза 4)
   - loyalty/ (лояльность - Фаза 3)
   - gamification/ (геймификация - Фаза 4)
   - ai-assistant/ (AI - Фаза 3)
   - agent-bridge/ (агенты - Фаза 3)
4. Очистка package.json от лишних зависимостей
5. Обновление README.md
```

**Checklist:**
- [ ] Репозиторий форкнут
- [ ] Лишние модули удалены
- [ ] package.json очищен
- [ ] Проект компилируется без ошибок

---

### Задача 1.2: Настройка Turborepo
**Время:** 4 часа | **Приоритет:** P0

**Структура монорепо:**
```
vendhub-unified/
├── apps/
│   ├── api/                 # NestJS backend
│   ├── web/                 # Next.js admin dashboard
│   └── docs/                # Документация (опционально)
├── packages/
│   ├── config/              # Общие конфиги (ESLint, TS)
│   ├── database/            # TypeORM entities и миграции
│   ├── types/               # Общие TypeScript типы
│   └── ui/                  # Shared UI компоненты
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

**Файл: turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**Checklist:**
- [ ] Turborepo структура создана
- [ ] pnpm workspace настроен
- [ ] turbo.json сконфигурирован
- [ ] Базовые скрипты работают

---

## День 2: Окружение разработки

### Задача 2.1: ESLint, Prettier, Husky
**Время:** 2 часа | **Приоритет:** P1

**Файл: packages/config/eslint-preset.js**
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

**Файл: .prettierrc**
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Husky hooks:**
```bash
# pre-commit
pnpm lint-staged

# commit-msg
npx commitlint --edit $1
```

**Checklist:**
- [ ] ESLint настроен для всех packages
- [ ] Prettier интегрирован
- [ ] Husky hooks работают
- [ ] lint-staged настроен

---

### Задача 2.2: Docker Compose
**Время:** 4 часа | **Приоритет:** P0

**Файл: docker/docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: vendhub-postgres
    environment:
      POSTGRES_USER: vendhub
      POSTGRES_PASSWORD: vendhub_dev_password
      POSTGRES_DB: vendhub_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendhub"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vendhub-redis
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
      context: ..
      dockerfile: docker/Dockerfile.api
    container_name: vendhub-api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://vendhub:vendhub_dev_password@postgres:5432/vendhub_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production
      JWT_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
    ports:
      - "3001:3001"
    volumes:
      - ../apps/api:/app/apps/api
      - ../packages:/app/packages
      - /app/node_modules
    command: pnpm --filter api dev

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    container_name: vendhub-web
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    ports:
      - "3000:3000"
    volumes:
      - ../apps/web:/app/apps/web
      - ../packages:/app/packages
      - /app/node_modules
    command: pnpm --filter web dev

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: vendhub-network
```

**Файл: docker/Dockerfile.api**
```dockerfile
FROM node:20-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["pnpm", "--filter", "api", "dev"]
```

**Checklist:**
- [ ] docker-compose.yml создан
- [ ] PostgreSQL контейнер запускается
- [ ] Redis контейнер запускается
- [ ] Volumes для persistence настроены
- [ ] Health checks работают

---

### Задача 2.3: Environment файлы
**Время:** 2 часа | **Приоритет:** P0

**Файл: apps/api/.env.example**
```env
# Server
NODE_ENV=development
PORT=3001
API_PREFIX=api

# Database
DATABASE_URL=postgresql://vendhub:vendhub_dev_password@localhost:5432/vendhub_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=debug
```

**Файл: apps/web/.env.example**
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# App
NEXT_PUBLIC_APP_NAME=VendHub
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Checklist:**
- [ ] .env.example для API создан
- [ ] .env.example для Web создан
- [ ] .gitignore обновлён
- [ ] Документация по ENV добавлена

---

## День 3: База данных - Часть 1

### Задача 3.1: TypeORM конфигурация
**Время:** 2 часа | **Приоритет:** P0

**Файл: packages/database/src/config/typeorm.config.ts**
```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  synchronize: false, // Никогда true в production!
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource(typeOrmConfig);
```

**Checklist:**
- [ ] TypeORM конфиг создан
- [ ] DataSource экспортирован
- [ ] CLI для миграций настроен

---

### Задача 3.2: Базовые Entity
**Время:** 4 часа | **Приоритет:** P0

**Файл: packages/database/src/entities/base.entity.ts**
```typescript
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

**Файл: packages/database/src/entities/organization.entity.ts**
```typescript
import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Machine } from './machine.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 20, nullable: true })
  inn?: string; // ИНН для Узбекистана

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Machine, (machine) => machine.organization)
  machines: Machine[];
}
```

**Файл: packages/database/src/entities/user.entity.ts**
```typescript
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Role } from './role.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, select: false })
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  // Relations
  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id' })
  roleId: string;

  // Computed
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

**Файл: packages/database/src/entities/role.entity.ts**
```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: RoleType,
  })
  type: RoleType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ default: true })
  isSystem: boolean; // Нельзя удалить системные роли
}
```

**Checklist:**
- [ ] BaseEntity создан
- [ ] Organization entity создан
- [ ] User entity создан
- [ ] Role entity создан

---

## День 4: База данных - Часть 2

### Задача 4.1: Machine и Location entities
**Время:** 4 часа | **Приоритет:** P0

**Файл: packages/database/src/entities/location.entity.ts**
```typescript
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Machine } from './machine.entity';

export enum LocationType {
  OFFICE = 'office',
  MALL = 'mall',
  UNIVERSITY = 'university',
  HOSPITAL = 'hospital',
  STATION = 'station',
  OTHER = 'other',
}

@Entity('locations')
export class Location extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.OTHER,
  })
  type: LocationType;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  contactPerson?: string;

  @Column({ length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'time', nullable: true })
  workingHoursStart?: string;

  @Column({ type: 'time', nullable: true })
  workingHoursEnd?: string;

  @Column({ default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @OneToMany(() => Machine, (machine) => machine.location)
  machines: Machine[];
}
```

**Файл: packages/database/src/entities/machine.entity.ts**
```typescript
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Location } from './location.entity';

export enum MachineType {
  DRINK = 'drink',      // Напитки (кофе, чай)
  SNACK = 'snack',      // Снэки
  COMBO = 'combo',      // Комбинированный
}

export enum MachineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  OUT_OF_ORDER = 'out_of_order',
}

@Entity('machines')
export class Machine extends BaseEntity {
  @Column({ length: 100, unique: true })
  serialNumber: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: MachineType,
  })
  type: MachineType;

  @Column({ length: 100, nullable: true })
  model?: string;

  @Column({ length: 100, nullable: true })
  manufacturer?: string;

  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.OFFLINE,
  })
  status: MachineStatus;

  @Column({ name: 'slots_count', type: 'int', default: 0 })
  slotsCount: number;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt?: Date;

  @Column({ name: 'installed_at', type: 'date', nullable: true })
  installedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  telemetryConfig?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Organization, (org) => org.machines)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Location, (loc) => loc.machines, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Column({ name: 'location_id', nullable: true })
  locationId?: string;
}
```

**Checklist:**
- [ ] Location entity создан
- [ ] Machine entity создан
- [ ] Связи настроены
- [ ] Enums определены

---

### Задача 4.2: Миграции
**Время:** 4 часа | **Приоритет:** P0

**Команды для генерации миграций:**
```bash
# Генерация миграции
pnpm --filter database migration:generate -- -n InitialSchema

# Запуск миграций
pnpm --filter database migration:run

# Откат миграции
pnpm --filter database migration:revert
```

**Файл: packages/database/package.json (scripts)**
```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "pnpm typeorm migration:generate -d src/config/typeorm.config.ts",
    "migration:run": "pnpm typeorm migration:run -d src/config/typeorm.config.ts",
    "migration:revert": "pnpm typeorm migration:revert -d src/config/typeorm.config.ts",
    "schema:sync": "pnpm typeorm schema:sync -d src/config/typeorm.config.ts",
    "seed": "ts-node src/seeds/run-seeds.ts"
  }
}
```

**Checklist:**
- [ ] Первая миграция создана
- [ ] Миграция успешно применяется
- [ ] Откат работает
- [ ] Таблицы созданы в PostgreSQL

---

## День 5: Seed данные и CI/CD

### Задача 5.1: Seed данные
**Время:** 4 часа | **Приоритет:** P1

**Файл: packages/database/src/seeds/roles.seed.ts**
```typescript
import { AppDataSource } from '../config/typeorm.config';
import { Role, RoleType } from '../entities/role.entity';

export async function seedRoles() {
  const roleRepository = AppDataSource.getRepository(Role);

  const roles = [
    {
      name: 'Administrator',
      type: RoleType.ADMIN,
      description: 'Full system access',
      permissions: ['*'],
      isSystem: true,
    },
    {
      name: 'Manager',
      type: RoleType.MANAGER,
      description: 'Manage machines, products, tasks',
      permissions: [
        'machines:read', 'machines:write',
        'products:read', 'products:write',
        'tasks:read', 'tasks:write',
        'inventory:read', 'inventory:write',
        'sales:read',
        'users:read',
      ],
      isSystem: true,
    },
    {
      name: 'Operator',
      type: RoleType.OPERATOR,
      description: 'Execute tasks, view assigned machines',
      permissions: [
        'machines:read',
        'products:read',
        'tasks:read', 'tasks:execute',
        'inventory:read',
      ],
      isSystem: true,
    },
    {
      name: 'Viewer',
      type: RoleType.VIEWER,
      description: 'Read-only access to dashboards',
      permissions: [
        'dashboard:read',
        'machines:read',
        'sales:read',
      ],
      isSystem: true,
    },
  ];

  for (const roleData of roles) {
    const existing = await roleRepository.findOne({ where: { type: roleData.type } });
    if (!existing) {
      const role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`Created role: ${roleData.name}`);
    }
  }
}
```

**Файл: packages/database/src/seeds/run-seeds.ts**
```typescript
import { AppDataSource } from '../config/typeorm.config';
import { seedRoles } from './roles.seed';
import { seedOrganization } from './organization.seed';
import { seedAdminUser } from './admin.seed';

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    await seedRoles();
    await seedOrganization();
    await seedAdminUser();

    console.log('All seeds completed!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeds();
```

**Checklist:**
- [ ] Roles seed создан
- [ ] Organization seed создан
- [ ] Admin user seed создан
- [ ] Seeds запускаются без ошибок

---

### Задача 5.2: GitHub Actions CI
**Время:** 4 часа | **Приоритет:** P1

**Файл: .github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vendhub_test
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
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/vendhub_test
          REDIS_URL: redis://localhost:6379

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

**Checklist:**
- [ ] CI workflow создан
- [ ] Lint job работает
- [ ] Test job работает с PostgreSQL
- [ ] Build job работает

---

### Задача 5.3: Документация
**Время:** 2 часа | **Приоритет:** P2

**Файл: README.md (обновлённый)**
```markdown
# VendHub Unified Platform

Enterprise vending management system.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Development

```bash
# Clone repository
git clone https://github.com/your-org/vendhub-unified.git
cd vendhub-unified

# Install dependencies
pnpm install

# Start services (PostgreSQL, Redis)
docker compose -f docker/docker-compose.yml up -d postgres redis

# Run migrations
pnpm --filter database migration:run

# Seed database
pnpm --filter database seed

# Start development
pnpm dev
```

### Access
- **API:** http://localhost:3001
- **Swagger:** http://localhost:3001/api/docs
- **Web:** http://localhost:3000

### Default credentials
- Email: admin@vendhub.local
- Password: Admin123!

## Project Structure

```
vendhub-unified/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # TypeORM entities & migrations
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
└── docker/           # Docker configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm --filter api dev` | Start only API |
| `pnpm --filter web dev` | Start only Web |
```

**Checklist:**
- [ ] README.md обновлён
- [ ] Quick start инструкции работают
- [ ] Документация по структуре добавлена

---

## Итоги Спринта 1

### Deliverables
- [x] Turborepo монорепозиторий
- [x] Docker Compose окружение
- [x] PostgreSQL + Redis
- [x] TypeORM конфигурация
- [x] 4 базовых entities
- [x] Миграции
- [x] Seed данные
- [x] GitHub Actions CI
- [x] Документация

### Метрики
| Метрика | Цель | Факт |
|---------|------|------|
| Entities | 4 | 4 |
| Migrations | 1 | 1 |
| CI Jobs | 3 | 3 |
| Документация | ✅ | ✅ |

---

*Спринт 1 создан: 14 января 2026*
