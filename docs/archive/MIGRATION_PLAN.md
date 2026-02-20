# 📋 План миграции функциональности VHM24-repo → VendHub OS

**Дата:** 3 февраля 2026
**Статус:** Детальный план с приоритетами

---

## СВОДКА

| Категория | VHM24-repo | VendHub OS | Разница |
|-----------|------------|------------|---------|
| Entities | 111 | 102 | +9 отсутствуют |
| Таблицы | ~120 | ~110 | +10 отсутствуют |
| Миграции | 87 | 47 | +40 доработок |

---

## 🔴 КРИТИЧНО (Sprint 1-2)

### 1. Отсутствующие таблицы — СОЗДАТЬ

#### 1.1 Analytics & Reporting

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS
// ✅ ЕСТЬ В VHM24-repo

// Миграция: CreateAnalyticsSnapshotsTable
@Entity('analytics_snapshots')
export class AnalyticsSnapshot {
  snapshot_type: 'daily' | 'weekly' | 'monthly';
  snapshot_date: Date;
  machine_id: string;
  location_id: string;
  product_id: string;
  total_transactions: number;
  total_revenue: number;
  total_units_sold: number;
  average_transaction_value: number;
  uptime_minutes: number;
  downtime_minutes: number;
  availability_percentage: number;
  stock_refills: number;
  out_of_stock_incidents: number;
  maintenance_tasks_completed: number;
  incidents_reported: number;
  complaints_received: number;
  operational_costs: number;
  profit_margin: number;
  detailed_metrics: jsonb;
}
```

**Файл миграции:** `CreateAnalyticsSnapshotsTable.ts`
**Приоритет:** 🔴 Критично
**Зависимости:** machines, locations, products
**Оценка:** 4 часа

---

#### 1.2 Dashboard Widgets

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS
@Entity('dashboard_widgets')
export class DashboardWidget {
  user_id: string;
  title: string;
  widget_type: 'chart' | 'kpi' | 'table' | 'map';
  chart_type: 'line' | 'bar' | 'pie' | 'area';
  time_range: '24h' | '7d' | '30d' | '90d' | 'custom';
  position: { x: number; y: number };
  width: number;
  height: number;
  config: jsonb;
  is_visible: boolean;
}
```

**Файл миграции:** `CreateDashboardWidgetsTable.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 3 часа

---

#### 1.3 Custom Reports

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS
@Entity('custom_reports')
export class CustomReport {
  created_by_id: string;
  name: string;
  description: string;
  report_type: string;
  format: 'pdf' | 'excel' | 'csv';
  config: jsonb; // filters, columns, grouping
  is_scheduled: boolean;
  schedule_frequency: 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  schedule_days: number[];
  recipients: string[]; // email addresses
  last_run_at: Date;
  next_run_at: Date;
  is_active: boolean;
}
```

**Файл миграции:** `CreateCustomReportsTable.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 4 часа

---

#### 1.4 Daily Stats (агрегированная статистика)

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS
@Entity('daily_stats')
export class DailyStats {
  stat_date: Date;
  total_revenue: number;
  total_sales_count: number;
  average_sale_amount: number;
  total_collections: number;
  collections_count: number;
  active_machines_count: number;
  online_machines_count: number;
  offline_machines_count: number;
  refill_tasks_completed: number;
  collection_tasks_completed: number;
  cleaning_tasks_completed: number;
  repair_tasks_completed: number;
  total_tasks_completed: number;
  inventory_units_refilled: number;
  inventory_units_sold: number;
  top_products: jsonb;
  top_machines: jsonb;
  active_operators_count: number;
  is_finalized: boolean;
}
```

**Файл миграции:** `CreateDailyStatsTable.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 4 часа

---

### 2. Intelligent Import System

```typescript
// ❌ ПОЛНОСТЬЮ ОТСУТСТВУЕТ В VENDHUB OS
// ✅ 5 таблиц в VHM24-repo

@Entity('import_sessions')
export class ImportSession {
  domain: 'products' | 'machines' | 'inventory' | 'sales';
  status: 'uploaded' | 'classified' | 'validated' | 'approved' | 'executed' | 'failed';
  template_id: string;
  file_metadata: jsonb;
  classification_result: jsonb;
  validation_report: jsonb;
  action_plan: jsonb;
  approval_status: 'pending' | 'approved' | 'rejected';
  execution_result: jsonb;
}

@Entity('import_templates')
export class ImportTemplate {
  name: string;
  domain: string;
  column_mapping: jsonb;
  validation_overrides: jsonb;
  use_count: number;
}

@Entity('import_audit_logs')
export class ImportAuditLog {
  session_id: string;
  action_type: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  before_state: jsonb;
  after_state: jsonb;
}

@Entity('schema_definitions')
export class SchemaDefinition {
  domain: string;
  table_name: string;
  field_definitions: jsonb;
  relationships: jsonb;
}

@Entity('validation_rules')
export class ValidationRule {
  domain: string;
  rule_name: string;
  rule_type: string;
  rule_definition: jsonb;
  severity: 'error' | 'warning' | 'info';
  priority: number;
}
```

**Файл миграции:** `CreateIntelligentImportSystem.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 8 часов
**Комментарий:** Ключевая функция для массового импорта данных

---

### 3. Equipment Management (расширенное)

```typescript
// ❌ ЧАСТИЧНО ОТСУТСТВУЕТ В VENDHUB OS

@Entity('component_maintenance')
export class ComponentMaintenance {
  component_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'predictive';
  performed_by_user_id: string;
  performed_at: Date;
  description: string;
  spare_parts_used: jsonb;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  duration_minutes: number;
  result: string;
  is_successful: boolean;
  next_maintenance_date: Date;
  photo_urls: string[];
  document_urls: string[];
  task_id: string;
}

@Entity('component_movements')
export class ComponentMovement {
  component_id: string;
  from_location_type: 'warehouse' | 'machine' | 'repair';
  from_location_ref: string;
  to_location_type: 'warehouse' | 'machine' | 'repair';
  to_location_ref: string;
  movement_type: 'install' | 'remove' | 'transfer' | 'repair';
  related_machine_id: string;
  task_id: string;
}

@Entity('spare_parts')
export class SparePart {
  part_number: string;
  name: string;
  component_type: string;
  manufacturer: string;
  quantity_in_stock: number;
  min_stock_level: number;
  unit_price: number;
  supplier_name: string;
  lead_time_days: number;
  storage_location: string;
}

@Entity('washing_schedules')
export class WashingSchedule {
  machine_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval_days: number;
  component_types: string[];
  instructions: string;
  last_wash_date: Date;
  next_wash_date: Date;
  auto_create_tasks: boolean;
  notification_days_before: number;
  estimated_duration_minutes: number;
}

@Entity('hopper_types')
export class HopperType {
  code: string;
  name: string;
  category: string;
  requires_refrigeration: boolean;
  shelf_life_days: number;
  typical_capacity_kg: number;
  unit_of_measure: string;
}
```

**Файл миграции:** `CreateEquipmentManagementTables.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 6 часов

---

### 4. Dictionaries System

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS
@Entity('dictionaries')
export class Dictionary {
  code: string; // unique
  name_ru: string;
  name_en: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

@Entity('dictionary_items')
export class DictionaryItem {
  dictionary_id: string;
  code: string;
  value_ru: string;
  value_en: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  metadata: jsonb;
}
```

**Файл миграции:** `CreateDictionariesTables.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 3 часа
**Комментарий:** Базовая система справочников

---

### 5. Operator Ratings (полная версия)

```typescript
// ❌ ОТСУТСТВУЕТ В VENDHUB OS (полная версия)
@Entity('operator_ratings')
export class OperatorRating {
  operator_id: string;
  period_start: Date;
  period_end: Date;

  // Task metrics
  total_tasks: number;
  tasks_on_time: number;
  tasks_late: number;
  avg_completion_time_hours: number;
  timeliness_score: number; // 0-100

  // Photo compliance
  tasks_with_photos_before: number;
  tasks_with_photos_after: number;
  total_photos_uploaded: number;
  photo_compliance_rate: number; // 0-100
  photo_quality_score: number; // 0-100

  // Collection accuracy
  collections_with_variance: number;
  avg_collection_variance_percent: number;
  inventory_discrepancies: number;
  data_accuracy_score: number; // 0-100

  // Customer feedback
  complaints_received: number;
  avg_customer_rating: number;
  positive_feedback_count: number;
  customer_feedback_score: number; // 0-100

  // Discipline
  checklist_items_completed: number;
  checklist_items_total: number;
  checklist_completion_rate: number;
  comments_sent: number;
  discipline_score: number; // 0-100

  // Overall
  overall_score: number; // 0-100
  rating_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  rank: number;
  notification_sent_at: Date;
}
```

**Файл миграции:** `CreateOperatorRatingsTable.ts`
**Приоритет:** 🔴 Критично
**Оценка:** 4 часа

---

## 🟡 ВАЖНО (Sprint 3-4)

### 6. Недостающие поля в существующих таблицах

#### 6.1 Tasks — добавить поля

```sql
-- Миграция: AddTaskRejectionFields
ALTER TABLE tasks ADD COLUMN rejected_by_user_id UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN postpone_reason TEXT;
ALTER TABLE tasks ADD COLUMN offline_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN pending_photos JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN expected_cash_amount NUMERIC(15,2);
ALTER TABLE tasks ADD COLUMN actual_cash_amount NUMERIC(15,2);
```

**Файл миграции:** `AddTaskRejectionFields.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 2 часа

---

#### 6.2 Inventory — расширить

```sql
-- Миграция: AddInventoryReservationSystem
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  task_id UUID REFERENCES tasks(id),
  nomenclature_id UUID,
  quantity_reserved NUMERIC(15,4) NOT NULL,
  quantity_fulfilled NUMERIC(15,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  inventory_level VARCHAR(20) NOT NULL,
  reference_id UUID,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция: CreateInventoryDifferenceThresholds
CREATE TABLE inventory_difference_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  name VARCHAR(255),
  threshold_abs NUMERIC(15,4),
  threshold_rel NUMERIC(5,2),
  severity_level VARCHAR(20) DEFAULT 'warning',
  create_incident BOOLEAN DEFAULT FALSE,
  create_task BOOLEAN DEFAULT FALSE,
  notify_users UUID[],
  notify_roles VARCHAR(50)[],
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция: CreateInventoryReportPresets
CREATE TABLE inventory_report_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  filters JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `AddInventoryEnhancements.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 4 часа

---

#### 6.3 Reconciliation — расширить

```sql
-- Миграция: CreateReconciliationMismatchesTable
CREATE TABLE reconciliation_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  order_number VARCHAR(100),
  machine_code VARCHAR(50),
  order_time TIMESTAMP WITH TIME ZONE,
  amount NUMERIC(15,2),
  payment_method VARCHAR(50),
  mismatch_type VARCHAR(50) NOT NULL,
  match_score NUMERIC(5,2),
  discrepancy_amount NUMERIC(15,2),
  sources_data JSONB,
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `CreateReconciliationMismatchesTable.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 3 часа

---

### 7. Alerts System (расширенный)

```sql
-- Миграция: AddAlertRuleEnhancements
ALTER TABLE alert_rules ADD COLUMN cooldown_minutes INTEGER DEFAULT 60;
ALTER TABLE alert_rules ADD COLUMN scope_filters JSONB DEFAULT '{}';
ALTER TABLE alert_rules ADD COLUMN escalation_minutes INTEGER;
ALTER TABLE alert_rules ADD COLUMN escalation_config JSONB;
ALTER TABLE alert_rules ADD COLUMN last_triggered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE alert_rules ADD COLUMN trigger_count INTEGER DEFAULT 0;

-- Миграция: CreateAlertHistoryTable
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID,
  status VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  machine_id UUID,
  location_id UUID,
  metric_snapshot JSONB,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by_id UUID REFERENCES users(id),
  acknowledgement_note TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by_id UUID REFERENCES users(id),
  resolution_note TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalation_level INTEGER,
  notification_ids UUID[],
  auto_created_task_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `EnhanceAlertsSystem.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 4 часа

---

### 8. Routes System (расширенный)

```sql
-- Миграция: CreateRouteStopsTable
CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID,
  machine_id UUID,
  sequence INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  planned_arrival_time TIMESTAMP WITH TIME ZONE,
  actual_arrival_time TIMESTAMP WITH TIME ZONE,
  actual_departure_time TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER,
  is_priority BOOLEAN DEFAULT FALSE,
  tasks UUID[],
  notes TEXT,
  completion_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `EnhanceRoutesSystem.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 3 часа

---

### 9. Integrations (расширенные)

```sql
-- Миграция: CreateApiKeysTable
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 1000,
  scopes VARCHAR(100)[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция: CreateSyncJobsTable
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID,
  job_name VARCHAR(255) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_message TEXT,
  config JSONB,
  results JSONB,
  triggered_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция: CreateIntegrationLogsTable
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID,
  level VARCHAR(20) NOT NULL,
  method VARCHAR(10),
  endpoint VARCHAR(500),
  status_code INTEGER,
  request_body JSONB,
  response_body JSONB,
  duration_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `EnhanceIntegrationsSystem.ts`
**Приоритет:** 🟡 Важно
**Оценка:** 5 часов

---

## 🟢 ЖЕЛАТЕЛЬНО (Sprint 5+)

### 10. Recipe Snapshots

```sql
CREATE TABLE recipe_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID,
  change_reason TEXT,
  checksum VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Файл миграции:** `CreateRecipeSnapshotsTable.ts`
**Приоритет:** 🟢 Желательно
**Оценка:** 2 часа

---

### 11. Performance Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_tasks_machine_status ON tasks(machine_id, status);
CREATE INDEX idx_tasks_assigned_scheduled ON tasks(assigned_to_user_id, scheduled_date);
CREATE INDEX idx_tasks_type_status_date ON tasks(task_type, status, scheduled_date);

CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_transactions_machine_date ON transactions(machine_id, created_at);

CREATE INDEX idx_complaints_machine_status ON complaints(machine_id, status);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);

-- Partial indexes for active records
CREATE INDEX idx_machines_active ON machines(id) WHERE status = 'active';
CREATE INDEX idx_tasks_pending ON tasks(id) WHERE status IN ('pending', 'in_progress');
```

**Файл миграции:** `AddPerformanceIndexes.ts`
**Приоритет:** 🟢 Желательно
**Оценка:** 3 часа

---

## 📦 БИЗНЕС-ЛОГИКА ДЛЯ ПЕРЕНОСА

| Сервис | VHM24-repo | VendHub OS | Действие |
|--------|------------|------------|----------|
| Photo Validation | ✅ Полный | 🚧 Базовый | Перенести логику |
| Task SLA Calculation | ✅ Полный | 🚧 Базовый | Перенести формулы |
| Inventory Forecasting | ✅ Есть | ❌ Нет | Перенести алгоритм |
| Cash Discrepancy Detection | ✅ Есть | ❌ Нет | Перенести логику |
| Automatic Task Generation | ✅ Полный | 🚧 Частичный | Перенести триггеры |
| Commission Automation | ✅ Есть | 🚧 Базовый | Перенести расчёты |
| Offline Mode Sync | ✅ Есть | ❌ Нет | Перенести полностью |

---

## 📅 ПЛАН СПРИНТОВ

### Sprint 1 (Неделя 1-2) — 18 часов
| # | Задача | Часы |
|---|--------|------|
| 1 | CreateAnalyticsSnapshotsTable | 4 |
| 2 | CreateDashboardWidgetsTable | 3 |
| 3 | CreateCustomReportsTable | 4 |
| 4 | CreateDailyStatsTable | 4 |
| 5 | CreateDictionariesTables | 3 |

### Sprint 2 (Неделя 3-4) — 18 часов
| # | Задача | Часы |
|---|--------|------|
| 1 | CreateIntelligentImportSystem | 8 |
| 2 | CreateEquipmentManagementTables | 6 |
| 3 | CreateOperatorRatingsTable | 4 |

### Sprint 3 (Неделя 5-6) — 18 часов
| # | Задача | Часы |
|---|--------|------|
| 1 | AddTaskRejectionFields | 2 |
| 2 | AddInventoryEnhancements | 4 |
| 3 | EnhanceAlertsSystem | 4 |
| 4 | EnhanceRoutesSystem | 3 |
| 5 | EnhanceIntegrationsSystem | 5 |

### Sprint 4 (Неделя 7-8) — 20 часов
| # | Задача | Часы |
|---|--------|------|
| 1 | CreateRecipeSnapshotsTable | 2 |
| 2 | AddPerformanceIndexes | 3 |
| 3 | Перенос бизнес-логики | 10 |
| 4 | Тестирование миграций | 5 |

---

## 📊 ИТОГО

| Категория | Миграций | Часов | Спринтов |
|-----------|----------|-------|----------|
| 🔴 Критично | 10 | 36 | 2 |
| 🟡 Важно | 8 | 21 | 1 |
| 🟢 Желательно | 3 | 7 | 0.5 |
| Бизнес-логика | — | 10 | 0.5 |
| **ВСЕГО** | **21** | **74** | **4** |

---

*План сформирован на основе сравнения 111 entities VHM24-repo и 102 entities VendHub OS*
