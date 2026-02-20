# 🚀 Промпт для реализации миграций VendHub OS

## Контекст проекта

```
Проект: VendHub OS (vendhub-unified)
Путь: /sessions/nifty-jolly-hopper/mnt/VHM24/VendHub OS/vendhub-unified/
Тип: Turborepo монорепозиторий
Backend: apps/api/ (NestJS 11.1 + TypeORM 0.3.20 + PostgreSQL 16)
```

---

## ПРОМПТ ДЛЯ CLAUDE

Скопируй и используй этот промпт:

---

### 📋 ЗАДАЧА

Реализуй безопасные миграции для VendHub OS согласно плану. Работай в проекте:
`/sessions/nifty-jolly-hopper/mnt/VHM24/VendHub OS/vendhub-unified/apps/api/`

---

### 🎯 ФАЗА 1: Безопасные миграции (без влияния на workflow)

Реализуй следующие миграции в указанном порядке:

#### 1. CreateDictionariesTables (3 часа)

**Создать файлы:**

```
apps/api/src/modules/dictionaries/
├── dictionaries.module.ts
├── dictionaries.controller.ts
├── dictionaries.service.ts
├── entities/
│   ├── dictionary.entity.ts
│   └── dictionary-item.entity.ts
└── dto/
    ├── create-dictionary.dto.ts
    ├── update-dictionary.dto.ts
    ├── create-dictionary-item.dto.ts
    └── update-dictionary-item.dto.ts
```

**Entity: dictionary.entity.ts**
```typescript
import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DictionaryItem } from './dictionary-item.entity';

@Entity('dictionaries')
export class Dictionary extends BaseEntity {
  @Column({ unique: true, length: 50 })
  @Index()
  code: string;

  @Column({ length: 255 })
  name_ru: string;

  @Column({ length: 255, nullable: true })
  name_en: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  is_system: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @OneToMany(() => DictionaryItem, (item) => item.dictionary, {
    cascade: true,
  })
  items: DictionaryItem[];
}
```

**Entity: dictionary-item.entity.ts**
```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Dictionary } from './dictionary.entity';

@Entity('dictionary_items')
@Index(['dictionary_id', 'code'], { unique: true })
export class DictionaryItem extends BaseEntity {
  @ManyToOne(() => Dictionary, (dict) => dict.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dictionary_id' })
  dictionary: Dictionary;

  @Column({ type: 'uuid' })
  dictionary_id: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255 })
  value_ru: string;

  @Column({ length: 255, nullable: true })
  value_en: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

**Миграция:** Создай файл в `apps/api/src/database/migrations/`
```typescript
// {timestamp}-CreateDictionariesTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDictionariesTables1706900000000 implements MigrationInterface {
  name = 'CreateDictionariesTables1706900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dictionaries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "code" varchar(50) NOT NULL,
        "name_ru" varchar(255) NOT NULL,
        "name_en" varchar(255),
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_dictionaries_code" UNIQUE ("code"),
        CONSTRAINT "PK_dictionaries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dictionaries_code" ON "dictionaries" ("code")
    `);

    await queryRunner.query(`
      CREATE TABLE "dictionary_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "dictionary_id" uuid NOT NULL,
        "code" varchar(50) NOT NULL,
        "value_ru" varchar(255) NOT NULL,
        "value_en" varchar(255),
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        CONSTRAINT "PK_dictionary_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dictionary_items_dictionary"
          FOREIGN KEY ("dictionary_id")
          REFERENCES "dictionaries"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_dictionary_items_dict_code"
      ON "dictionary_items" ("dictionary_id", "code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_dictionary_items_dict_code"`);
    await queryRunner.query(`DROP TABLE "dictionary_items"`);
    await queryRunner.query(`DROP INDEX "IDX_dictionaries_code"`);
    await queryRunner.query(`DROP TABLE "dictionaries"`);
  }
}
```

**API Endpoints:**
```
GET    /api/dictionaries              - Список справочников
GET    /api/dictionaries/:code        - Справочник по коду
GET    /api/dictionaries/:code/items  - Элементы справочника
POST   /api/dictionaries              - Создать справочник
PUT    /api/dictionaries/:id          - Обновить справочник
DELETE /api/dictionaries/:id          - Удалить справочник
POST   /api/dictionaries/:code/items  - Добавить элемент
PUT    /api/dictionary-items/:id      - Обновить элемент
DELETE /api/dictionary-items/:id      - Удалить элемент
```

---

#### 2. CreateDailyStatsTable (4 часа)

**Создать файлы:**
```
apps/api/src/modules/analytics/
├── entities/
│   └── daily-stats.entity.ts
├── services/
│   └── daily-stats.service.ts
└── jobs/
    └── aggregate-daily-stats.job.ts
```

**Entity: daily-stats.entity.ts**
```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('daily_stats')
export class DailyStats extends BaseEntity {
  @Column({ type: 'date', unique: true })
  @Index()
  stat_date: Date;

  // Revenue
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ default: 0 })
  total_sales_count: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  average_sale_amount: number;

  // Collections
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_collections: number;

  @Column({ default: 0 })
  collections_count: number;

  // Machines
  @Column({ default: 0 })
  active_machines_count: number;

  @Column({ default: 0 })
  online_machines_count: number;

  @Column({ default: 0 })
  offline_machines_count: number;

  // Tasks by type
  @Column({ default: 0 })
  refill_tasks_completed: number;

  @Column({ default: 0 })
  collection_tasks_completed: number;

  @Column({ default: 0 })
  cleaning_tasks_completed: number;

  @Column({ default: 0 })
  repair_tasks_completed: number;

  @Column({ default: 0 })
  total_tasks_completed: number;

  // Inventory
  @Column({ default: 0 })
  inventory_units_refilled: number;

  @Column({ default: 0 })
  inventory_units_sold: number;

  // Top performers (JSON arrays)
  @Column({ type: 'jsonb', default: [] })
  top_products: { id: string; name: string; count: number; revenue: number }[];

  @Column({ type: 'jsonb', default: [] })
  top_machines: { id: string; code: string; revenue: number; sales_count: number }[];

  // Operators
  @Column({ default: 0 })
  active_operators_count: number;

  // Status
  @Column({ default: false })
  is_finalized: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_updated_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

**CRON Job: aggregate-daily-stats.job.ts**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyStatsService } from '../services/daily-stats.service';

@Injectable()
export class AggregateDailyStatsJob {
  private readonly logger = new Logger(AggregateDailyStatsJob.name);

  constructor(private readonly dailyStatsService: DailyStatsService) {}

  // Запуск каждый день в 02:00
  @Cron('0 2 * * *')
  async handleCron() {
    this.logger.log('Starting daily stats aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await this.dailyStatsService.aggregateForDate(yesterday);

      this.logger.log(`Daily stats aggregated for ${yesterday.toISOString().split('T')[0]}`);
    } catch (error) {
      this.logger.error('Failed to aggregate daily stats', error.stack);
    }
  }

  // Ручной запуск для конкретной даты
  async runManually(date: Date) {
    return this.dailyStatsService.aggregateForDate(date);
  }
}
```

---

#### 3. CreateDashboardWidgetsTable (3 часа)

**Entity: dashboard-widget.entity.ts**
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/users/entities/user.entity';

export type WidgetType = 'chart' | 'kpi' | 'table' | 'map' | 'list';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut';
export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'custom';

@Entity('dashboard_widgets')
@Index(['user_id'])
export class DashboardWidget extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 20, default: 'chart' })
  widget_type: WidgetType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  chart_type: ChartType;

  @Column({ type: 'varchar', length: 20, default: '7d' })
  time_range: TimeRange;

  @Column({ type: 'jsonb', default: { x: 0, y: 0 } })
  position: { x: number; y: number };

  @Column({ default: 4 })
  width: number;

  @Column({ default: 3 })
  height: number;

  @Column({ type: 'jsonb', default: {} })
  config: {
    data_source?: string;
    filters?: Record<string, any>;
    aggregation?: string;
    color_scheme?: string;
    [key: string]: any;
  };

  @Column({ default: true })
  is_visible: boolean;

  @Column({ default: 0 })
  sort_order: number;
}
```

---

#### 4. CreateOperatorRatingsTable (4 часа)

**Entity: operator-rating.entity.ts**
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/users/entities/user.entity';

export type RatingGrade = 'A' | 'B' | 'C' | 'D' | 'F';

@Entity('operator_ratings')
@Index(['operator_id', 'period_start', 'period_end'])
export class OperatorRating extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ type: 'uuid' })
  @Index()
  operator_id: string;

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  // === TASK METRICS ===
  @Column({ default: 0 })
  total_tasks: number;

  @Column({ default: 0 })
  tasks_on_time: number;

  @Column({ default: 0 })
  tasks_late: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  avg_completion_time_hours: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  timeliness_score: number; // 0-100

  // === PHOTO COMPLIANCE ===
  @Column({ default: 0 })
  tasks_with_photos_before: number;

  @Column({ default: 0 })
  tasks_with_photos_after: number;

  @Column({ default: 0 })
  total_photos_uploaded: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  photo_compliance_rate: number; // 0-100

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  photo_quality_score: number; // 0-100

  // === COLLECTION ACCURACY ===
  @Column({ default: 0 })
  collections_with_variance: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  avg_collection_variance_percent: number;

  @Column({ default: 0 })
  inventory_discrepancies: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  data_accuracy_score: number; // 0-100

  // === CUSTOMER FEEDBACK ===
  @Column({ default: 0 })
  complaints_received: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_customer_rating: number; // 1-5

  @Column({ default: 0 })
  positive_feedback_count: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  customer_feedback_score: number; // 0-100

  // === DISCIPLINE ===
  @Column({ default: 0 })
  checklist_items_completed: number;

  @Column({ default: 0 })
  checklist_items_total: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  checklist_completion_rate: number; // 0-100

  @Column({ default: 0 })
  comments_sent: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  discipline_score: number; // 0-100

  // === OVERALL ===
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  overall_score: number; // 0-100

  @Column({ type: 'varchar', length: 1, default: 'C' })
  rating_grade: RatingGrade;

  @Column({ nullable: true })
  rank: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  notification_sent_at: Date;
}
```

**Формула расчёта overall_score:**
```typescript
// В OperatorRatingsService
calculateOverallScore(rating: Partial<OperatorRating>): number {
  const weights = {
    timeliness: 0.25,      // 25%
    photo_compliance: 0.20, // 20%
    data_accuracy: 0.25,    // 25%
    customer_feedback: 0.15,// 15%
    discipline: 0.15        // 15%
  };

  return (
    (rating.timeliness_score || 0) * weights.timeliness +
    (rating.photo_compliance_rate || 0) * weights.photo_compliance +
    (rating.data_accuracy_score || 0) * weights.data_accuracy +
    (rating.customer_feedback_score || 0) * weights.customer_feedback +
    (rating.discipline_score || 0) * weights.discipline
  );
}

calculateGrade(score: number): RatingGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
```

---

#### 5. AddPerformanceIndexes (1 час)

**Миграция:** `{timestamp}-AddPerformanceIndexes.ts`
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1706900001000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1706900001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tasks indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_machine_status"
      ON "tasks" ("machine_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_assigned_scheduled"
      ON "tasks" ("assigned_to_user_id", "scheduled_date")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_type_status_date"
      ON "tasks" ("task_type", "status", "scheduled_date")
    `);

    // Inventory indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inventory_movements_date"
      ON "inventory_movements" ("created_at")
    `);

    // Transactions indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_machine_date"
      ON "transactions" ("machine_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_status_date"
      ON "transactions" ("status", "created_at")
    `);

    // Complaints indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_complaints_machine_status"
      ON "complaints" ("machine_id", "status")
    `);

    // Audit logs indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_user_date"
      ON "audit_logs" ("user_id", "created_at")
    `);

    // Partial indexes for common queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_machines_active"
      ON "machines" ("id") WHERE "status" = 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tasks_pending"
      ON "tasks" ("id") WHERE "status" IN ('pending', 'in_progress')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_pending"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_machines_active"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_audit_logs_user_date"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_complaints_machine_status"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_transactions_status_date"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_transactions_machine_date"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_inventory_movements_date"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_type_status_date"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_assigned_scheduled"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_tasks_machine_status"`);
  }
}
```

---

### 📝 ИНСТРУКЦИИ ПО ВЫПОЛНЕНИЮ

1. **Создай миграцию:**
   ```bash
   cd apps/api
   pnpm typeorm migration:create src/database/migrations/CreateDictionariesTables
   ```

2. **Создай модуль:**
   ```bash
   nest g module modules/dictionaries
   nest g controller modules/dictionaries
   nest g service modules/dictionaries
   ```

3. **Зарегистрируй entities в TypeORM:**
   ```typescript
   // apps/api/src/config/database/typeorm.config.ts
   entities: [
     // ... existing
     Dictionary,
     DictionaryItem,
     DailyStats,
     DashboardWidget,
     OperatorRating,
   ]
   ```

4. **Запусти миграцию:**
   ```bash
   pnpm db:migrate
   ```

5. **Проверь:**
   ```bash
   pnpm test
   pnpm build
   ```

---

### ✅ ЧЕКЛИСТ ПОСЛЕ РЕАЛИЗАЦИИ

```
□ Все миграции созданы в apps/api/src/database/migrations/
□ Все entities зарегистрированы в TypeORM config
□ Все модули зарегистрированы в AppModule
□ API endpoints работают (проверить в Swagger)
□ Тесты проходят
□ Build проходит без ошибок
□ Нет breaking changes в существующем коде
```

---

### 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- `MIGRATION_PLAN.md` — полный план миграций
- `SAFE_MIGRATIONS.md` — анализ безопасности
- `IMPACT_ANALYSIS.md` — влияние на workflow
- `COMPARISON_REPORT.md` — сравнение VHM24-repo и VendHub OS
