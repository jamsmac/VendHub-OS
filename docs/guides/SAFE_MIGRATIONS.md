# 🛡️ Безопасные миграции для VendHub OS

**Принцип:** Миграции классифицированы по уровню риска для существующей функциональности.

---

## ✅ ПОЛНОСТЬЮ БЕЗОПАСНЫЕ (можно делать сразу)

Эти миграции создают **новые независимые таблицы** без изменения существующего кода.

### 1. CreateDictionariesTables ⭐ НАЧАТЬ С ЭТОГО

```typescript
// Полностью изолированная система справочников
// НЕ затрагивает существующие таблицы
// НЕ требует изменения сервисов

@Entity('dictionaries')
export class Dictionary extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name_ru: string;

  @Column({ nullable: true })
  name_en: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  is_system: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @OneToMany(() => DictionaryItem, item => item.dictionary)
  items: DictionaryItem[];
}

@Entity('dictionary_items')
export class DictionaryItem extends BaseEntity {
  @ManyToOne(() => Dictionary, dict => dict.items)
  @JoinColumn({ name: 'dictionary_id' })
  dictionary: Dictionary;

  @Column()
  dictionary_id: string;

  @Column()
  code: string;

  @Column()
  value_ru: string;

  @Column({ nullable: true })
  value_en: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** Нет
**Можно использовать:** Сразу после создания
**Оценка:** 3 часа

---

### 2. CreateDashboardWidgetsTable

```typescript
// Новая таблица для кастомных виджетов дашборда
// Зависит только от users (уже существует)

@Entity('dashboard_widgets')
export class DashboardWidget extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column()
  title: string;

  @Column({ default: 'chart' })
  widget_type: 'chart' | 'kpi' | 'table' | 'map' | 'list';

  @Column({ nullable: true })
  chart_type: 'line' | 'bar' | 'pie' | 'area' | 'donut';

  @Column({ default: '7d' })
  time_range: '24h' | '7d' | '30d' | '90d' | 'custom';

  @Column({ type: 'jsonb', default: { x: 0, y: 0 } })
  position: { x: number; y: number };

  @Column({ default: 4 })
  width: number;

  @Column({ default: 3 })
  height: number;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: true })
  is_visible: boolean;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** users (существует)
**Можно использовать:** Сразу, UI можно добавлять постепенно
**Оценка:** 3 часа

---

### 3. CreateCustomReportsTable

```typescript
// Система кастомных отчётов
// Независимая от существующей логики

@Entity('custom_reports')
export class CustomReport extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column()
  created_by_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  report_type: string; // 'sales', 'inventory', 'tasks', 'financial'

  @Column({ default: 'pdf' })
  format: 'pdf' | 'excel' | 'csv';

  @Column({ type: 'jsonb', default: {} })
  config: {
    filters: Record<string, any>;
    columns: string[];
    grouping: string[];
    sorting: { field: string; direction: 'asc' | 'desc' }[];
  };

  @Column({ default: false })
  is_scheduled: boolean;

  @Column({ nullable: true })
  schedule_frequency: 'daily' | 'weekly' | 'monthly';

  @Column({ nullable: true })
  schedule_time: string; // "09:00"

  @Column({ type: 'int', array: true, nullable: true })
  schedule_days: number[]; // [1,3,5] для понедельник, среда, пятница

  @Column({ type: 'text', array: true, default: [] })
  recipients: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_run_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_run_at: Date;

  @Column({ default: true })
  is_active: boolean;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** users (существует)
**Можно использовать:** Независимо от reports модуля
**Оценка:** 4 часа

---

### 4. CreateDailyStatsTable

```typescript
// Агрегированная статистика по дням
// Заполняется CRON-задачей, не влияет на существующую логику

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

  // Tasks
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

  // Top lists
  @Column({ type: 'jsonb', default: [] })
  top_products: { id: string; name: string; count: number }[];

  @Column({ type: 'jsonb', default: [] })
  top_machines: { id: string; code: string; revenue: number }[];

  // Operators
  @Column({ default: 0 })
  active_operators_count: number;

  // Status
  @Column({ default: false })
  is_finalized: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_updated_at: Date;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** Нет (данные агрегируются из существующих таблиц)
**Можно использовать:** Добавить CRON-задачу отдельно
**Оценка:** 4 часа

---

### 5. CreateRecipeSnapshotsTable

```typescript
// Версионирование рецептов
// Не меняет существующую логику recipes

@Entity('recipe_snapshots')
export class RecipeSnapshot extends BaseEntity {
  @ManyToOne(() => Recipe)
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column()
  recipe_id: string;

  @Column()
  version: number;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>; // полный снимок рецепта

  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @Column({ nullable: true })
  created_by_user_id: string;

  @Column({ nullable: true })
  change_reason: string;

  @Column({ nullable: true })
  checksum: string; // SHA256 для проверки целостности
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** recipes, users (существуют)
**Можно использовать:** Опционально, логика снапшотов добавляется отдельно
**Оценка:** 2 часа

---

### 6. CreateAnalyticsSnapshotsTable

```typescript
// Снимки аналитики для быстрых отчётов
// Заполняется отдельной задачей

@Entity('analytics_snapshots')
export class AnalyticsSnapshot extends BaseEntity {
  @Column()
  snapshot_type: 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'date' })
  @Index()
  snapshot_date: Date;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ nullable: true })
  machine_id: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ nullable: true })
  location_id: string;

  @Column({ nullable: true })
  product_id: string;

  // Metrics
  @Column({ default: 0 })
  total_transactions: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ default: 0 })
  total_units_sold: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  average_transaction_value: number;

  // Uptime
  @Column({ default: 0 })
  uptime_minutes: number;

  @Column({ default: 0 })
  downtime_minutes: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  availability_percentage: number;

  // Operations
  @Column({ default: 0 })
  stock_refills: number;

  @Column({ default: 0 })
  out_of_stock_incidents: number;

  @Column({ default: 0 })
  maintenance_tasks_completed: number;

  @Column({ default: 0 })
  incidents_reported: number;

  @Column({ default: 0 })
  complaints_received: number;

  // Financial
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  operational_costs: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  profit_margin: number;

  @Column({ type: 'jsonb', nullable: true })
  detailed_metrics: Record<string, any>;

  // Index for fast queries
  @Index(['snapshot_type', 'snapshot_date'])
  _compositeIndex: string;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** machines, locations (существуют)
**Можно использовать:** Заполнять отдельным сервисом
**Оценка:** 4 часа

---

### 7. CreateOperatorRatingsTable

```typescript
// Рейтинги операторов — независимая система
// Рассчитывается отдельным сервисом

@Entity('operator_ratings')
export class OperatorRating extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column()
  @Index()
  operator_id: string;

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  // Task metrics
  @Column({ default: 0 })
  total_tasks: number;

  @Column({ default: 0 })
  tasks_on_time: number;

  @Column({ default: 0 })
  tasks_late: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  avg_completion_time_hours: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  timeliness_score: number;

  // Photo compliance
  @Column({ default: 0 })
  tasks_with_photos_before: number;

  @Column({ default: 0 })
  tasks_with_photos_after: number;

  @Column({ default: 0 })
  total_photos_uploaded: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  photo_compliance_rate: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  photo_quality_score: number;

  // Collection accuracy
  @Column({ default: 0 })
  collections_with_variance: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  avg_collection_variance_percent: number;

  @Column({ default: 0 })
  inventory_discrepancies: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  data_accuracy_score: number;

  // Customer feedback
  @Column({ default: 0 })
  complaints_received: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avg_customer_rating: number;

  @Column({ default: 0 })
  positive_feedback_count: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  customer_feedback_score: number;

  // Discipline
  @Column({ default: 0 })
  checklist_items_completed: number;

  @Column({ default: 0 })
  checklist_items_total: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  checklist_completion_rate: number;

  @Column({ default: 0 })
  comments_sent: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  discipline_score: number;

  // Overall
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  overall_score: number;

  @Column({ default: 'C' })
  rating_grade: 'A' | 'B' | 'C' | 'D' | 'F';

  @Column({ nullable: true })
  rank: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  notification_sent_at: Date;

  @Index(['operator_id', 'period_start', 'period_end'])
  _compositeIndex: string;
}
```

**Риск:** 🟢 НУЛЕВОЙ
**Зависимости:** users (существует)
**Можно использовать:** Рассчитывать CRON-задачей
**Оценка:** 4 часа

---

### 8. AddPerformanceIndexes

```sql
-- Индексы НЕ меняют логику, только ускоряют запросы
-- Можно добавлять в любой момент

-- Tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_machine_status
  ON tasks(machine_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_scheduled
  ON tasks(assigned_to_user_id, scheduled_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_type_status_date
  ON tasks(task_type, status, scheduled_date);

-- Inventory
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_date
  ON inventory_movements(created_at);

-- Transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_machine_date
  ON transactions(machine_id, created_at);

-- Complaints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complaints_machine_status
  ON complaints(machine_id, status);

-- Audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_date
  ON audit_logs(user_id, created_at);

-- Partial indexes (очень эффективны)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machines_active
  ON machines(id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_pending
  ON tasks(id) WHERE status IN ('pending', 'in_progress');
```

**Риск:** 🟢 НУЛЕВОЙ
**Примечание:** `CONCURRENTLY` не блокирует таблицы
**Можно делать:** В любой момент на production
**Оценка:** 1 час

---

## 🟡 ОТНОСИТЕЛЬНО БЕЗОПАСНЫЕ (требуют проверки)

Эти миграции создают новые таблицы, но требуют интеграции с существующими сервисами.

### 9. CreateInventoryReservationsTable

```typescript
// Новая таблица, но требует интеграции с tasks
@Entity('inventory_reservations')
export class InventoryReservation extends BaseEntity {
  @Column({ unique: true })
  reservation_number: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ nullable: true })
  task_id: string;

  @Column()
  nomenclature_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  quantity_reserved: number;

  @Column({ type: 'numeric', precision: 15, scale: 4, default: 0 })
  quantity_fulfilled: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'partial' | 'fulfilled' | 'cancelled' | 'expired';

  @Column()
  inventory_level: 'warehouse' | 'operator' | 'machine';

  @Column({ nullable: true })
  reference_id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'NOW()' })
  reserved_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilled_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  notes: string;
}
```

**Риск:** 🟡 НИЗКИЙ
**Требует:** Опциональную интеграцию с TasksService
**Можно начать:** Создать таблицу, интегрировать позже
**Оценка:** 2 часа (таблица) + 2 часа (интеграция)

---

### 10. CreateInventoryDifferenceThresholdsTable

```typescript
// Пороги для алертов по инвентарю
@Entity('inventory_difference_thresholds')
export class InventoryDifferenceThreshold extends BaseEntity {
  @Column()
  threshold_type: 'global' | 'category' | 'product' | 'machine';

  @Column({ nullable: true })
  reference_id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'numeric', precision: 15, scale: 4, nullable: true })
  threshold_abs: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  threshold_rel: number;

  @Column({ default: 'warning' })
  severity_level: 'info' | 'warning' | 'critical';

  @Column({ default: false })
  create_incident: boolean;

  @Column({ default: false })
  create_task: boolean;

  @Column({ type: 'uuid', array: true, default: [] })
  notify_users: string[];

  @Column({ type: 'varchar', array: true, default: [] })
  notify_roles: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @Column({ nullable: true })
  created_by_user_id: string;
}
```

**Риск:** 🟡 НИЗКИЙ
**Требует:** Интеграцию с InventoryService для проверки порогов
**Можно начать:** Создать таблицу и UI для настройки
**Оценка:** 2 часа (таблица) + 3 часа (логика проверки)

---

### 11. CreateInventoryReportPresetsTable

```typescript
// Пресеты для отчётов — полностью опционально
@Entity('inventory_report_presets')
export class InventoryReportPreset extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, any>;

  @Column({ default: false })
  is_default: boolean;

  @Column({ default: false })
  is_shared: boolean;

  @Column({ default: 0 })
  sort_order: number;
}
```

**Риск:** 🟡 НИЗКИЙ
**Требует:** UI для управления пресетами
**Оценка:** 2 часа

---

### 12. CreateRouteStopsTable

```typescript
// Детализация маршрутов
@Entity('route_stops')
export class RouteStop extends BaseEntity {
  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column()
  route_id: string;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ nullable: true })
  machine_id: string;

  @Column()
  sequence: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  planned_arrival_time: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actual_arrival_time: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actual_departure_time: Date;

  @Column({ nullable: true })
  estimated_duration_minutes: number;

  @Column({ default: false })
  is_priority: boolean;

  @Column({ type: 'uuid', array: true, default: [] })
  tasks: string[];

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  completion_data: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

**Риск:** 🟡 НИЗКИЙ
**Требует:** Интеграцию с RoutesService
**Можно начать:** Создать таблицу, расширить routes API
**Оценка:** 3 часа

---

### 13. CreateReconciliationMismatchesTable

```typescript
// Детализация расхождений сверки
@Entity('reconciliation_mismatches')
export class ReconciliationMismatch extends BaseEntity {
  @ManyToOne(() => ReconciliationRun, { nullable: true })
  @JoinColumn({ name: 'run_id' })
  run: ReconciliationRun;

  @Column({ nullable: true })
  run_id: string;

  @Column({ nullable: true })
  order_number: string;

  @Column({ nullable: true })
  machine_code: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  order_time: Date;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ nullable: true })
  payment_method: string;

  @Column()
  mismatch_type: 'missing_in_source' | 'missing_in_target' | 'amount_diff' | 'time_diff';

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  match_score: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  discrepancy_amount: number;

  @Column({ type: 'jsonb', nullable: true })
  sources_data: Record<string, any>;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  is_resolved: boolean;

  @Column({ nullable: true })
  resolution_notes: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolved_by: User;

  @Column({ nullable: true })
  resolved_by_user_id: string;
}
```

**Риск:** 🟡 НИЗКИЙ
**Требует:** Интеграцию с ReconciliationService
**Оценка:** 3 часа

---

## 🟠 ТРЕБУЮТ ОСТОРОЖНОСТИ (изменение существующих таблиц)

### 14. AddTaskRejectionFields

```sql
-- ⚠️ ALTER TABLE на существующей таблице tasks
-- Требует проверки всех сервисов, использующих tasks

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_by_user_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS postpone_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS offline_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pending_photos JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_cash_amount NUMERIC(15,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_cash_amount NUMERIC(15,2);

-- Добавить FK
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_rejected_by
  FOREIGN KEY (rejected_by_user_id) REFERENCES users(id);
```

**Риск:** 🟠 СРЕДНИЙ
**Что проверить:**
1. TasksService — добавить поддержку новых полей
2. TasksController — добавить endpoints для reject
3. DTO — расширить CreateTaskDto, UpdateTaskDto
4. Frontend — добавить UI для отклонения задач

**Порядок:**
1. Добавить колонки (nullable, default значения)
2. Обновить Entity
3. Обновить DTO
4. Обновить Service
5. Обновить Controller
6. Обновить Frontend

**Оценка:** 4 часа (миграция + код)

---

### 15. EnhanceAlertsSystem

```sql
-- ⚠️ ALTER TABLE на alert_rules + новая таблица

-- Добавить поля
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER DEFAULT 60;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS scope_filters JSONB DEFAULT '{}';
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS escalation_minutes INTEGER;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS escalation_config JSONB;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS trigger_count INTEGER DEFAULT 0;

-- Новая таблица (безопасно)
CREATE TABLE alert_history (...);
```

**Риск:** 🟠 СРЕДНИЙ
**Что проверить:**
1. AlertsService — логика cooldown и escalation
2. AlertsController — новые endpoints

**Оценка:** 4 часа

---

## 🔴 ВЫСОКИЙ РИСК (комплексные системы)

### 16. CreateIntelligentImportSystem (5 таблиц)

```
import_sessions
import_templates
import_audit_logs
schema_definitions
validation_rules
```

**Риск:** 🔴 ВЫСОКИЙ (но изолированный)
**Почему:**
- Большая комплексная система
- Требует отдельный модуль
- Много бизнес-логики

**Стратегия безопасной реализации:**
1. Создать все 5 таблиц
2. Создать отдельный IntelligentImportModule
3. НЕ интегрировать с существующими импортами сразу
4. Тестировать изолированно
5. Постепенно мигрировать существующий импорт

**Оценка:** 8-12 часов

---

### 17. CreateEquipmentManagementTables (5 таблиц)

```
equipment_components (может конфликтовать с существующим)
component_maintenance
component_movements
spare_parts
washing_schedules
hopper_types
```

**Риск:** 🔴 ВЫСОКИЙ
**Почему:**
- Может конфликтовать с существующим equipment модулем
- Требует проверки текущей реализации

**Рекомендация:**
1. Сначала проверить существующий equipment в VendHub OS
2. Определить что уже есть
3. Добавлять только недостающее

**Оценка:** 6-8 часов

---

### 18. EnhanceIntegrationsSystem (3 таблицы + ALTER)

**Риск:** 🔴 ВЫСОКИЙ
**Требует:** Полный аудит integrations модуля

---

## 📊 СВОДНАЯ ТАБЛИЦА

| # | Миграция | Риск | Можно сразу? | Часы |
|---|----------|------|--------------|------|
| 1 | CreateDictionariesTables | 🟢 | ✅ ДА | 3 |
| 2 | CreateDashboardWidgetsTable | 🟢 | ✅ ДА | 3 |
| 3 | CreateCustomReportsTable | 🟢 | ✅ ДА | 4 |
| 4 | CreateDailyStatsTable | 🟢 | ✅ ДА | 4 |
| 5 | CreateRecipeSnapshotsTable | 🟢 | ✅ ДА | 2 |
| 6 | CreateAnalyticsSnapshotsTable | 🟢 | ✅ ДА | 4 |
| 7 | CreateOperatorRatingsTable | 🟢 | ✅ ДА | 4 |
| 8 | AddPerformanceIndexes | 🟢 | ✅ ДА | 1 |
| 9 | CreateInventoryReservationsTable | 🟡 | ⚠️ Осторожно | 4 |
| 10 | CreateInventoryDifferenceThresholdsTable | 🟡 | ⚠️ Осторожно | 5 |
| 11 | CreateInventoryReportPresetsTable | 🟡 | ✅ ДА | 2 |
| 12 | CreateRouteStopsTable | 🟡 | ⚠️ Осторожно | 3 |
| 13 | CreateReconciliationMismatchesTable | 🟡 | ⚠️ Осторожно | 3 |
| 14 | AddTaskRejectionFields | 🟠 | ⚠️ С проверкой | 4 |
| 15 | EnhanceAlertsSystem | 🟠 | ⚠️ С проверкой | 4 |
| 16 | CreateIntelligentImportSystem | 🔴 | ❌ Планировать | 12 |
| 17 | CreateEquipmentManagementTables | 🔴 | ❌ Проверить | 8 |
| 18 | EnhanceIntegrationsSystem | 🔴 | ❌ Аудит | 5 |

---

## 🚀 РЕКОМЕНДУЕМЫЙ ПОРЯДОК

### Фаза 1: Безопасные (можно делать параллельно)
```
1. CreateDictionariesTables ⭐ ПЕРВЫМ
2. CreateDashboardWidgetsTable
3. CreateDailyStatsTable
4. CreateOperatorRatingsTable
5. AddPerformanceIndexes
```
**Итого:** 15 часов, 🟢 НУЛЕВОЙ риск

### Фаза 2: Аналитика
```
6. CreateCustomReportsTable
7. CreateAnalyticsSnapshotsTable
8. CreateRecipeSnapshotsTable
9. CreateInventoryReportPresetsTable
```
**Итого:** 12 часов, 🟢 НУЛЕВОЙ риск

### Фаза 3: Расширения (с тестированием)
```
10. CreateRouteStopsTable
11. CreateReconciliationMismatchesTable
12. CreateInventoryReservationsTable
13. CreateInventoryDifferenceThresholdsTable
```
**Итого:** 15 часов, 🟡 НИЗКИЙ риск

### Фаза 4: Изменения существующих таблиц
```
14. AddTaskRejectionFields
15. EnhanceAlertsSystem
```
**Итого:** 8 часов, 🟠 СРЕДНИЙ риск

### Фаза 5: Комплексные системы (отдельные спринты)
```
16. CreateIntelligentImportSystem
17. CreateEquipmentManagementTables
18. EnhanceIntegrationsSystem
```
**Итого:** 25 часов, 🔴 требует планирования

---

**Общий итог безопасных миграций (Фазы 1-2):** 27 часов = ~3-4 дня работы
