/**
 * Initial Schema Migration for VendHub OS
 * Creates all tables, indexes, and constraints
 *
 * Run: npm run migration:run
 * Revert: npm run migration:revert
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // EXTENSIONS
    // ========================================================================
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);

    // ========================================================================
    // ENUMS
    // ========================================================================

    // Organization enums
    await queryRunner.query(`
      CREATE TYPE "organization_type_enum" AS ENUM (
        'headquarters', 'franchise', 'branch', 'operator', 'partner'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_tier_enum" AS ENUM (
        'free', 'starter', 'professional', 'enterprise'
      )
    `);

    // User enums
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'owner', 'admin', 'manager', 'operator', 'warehouse', 'accountant', 'viewer'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM (
        'active', 'inactive', 'pending', 'blocked', 'deleted'
      )
    `);

    // Machine enums
    await queryRunner.query(`
      CREATE TYPE "machine_type_enum" AS ENUM (
        'snack', 'beverage', 'coffee', 'combo', 'fresh_food', 'frozen', 'hot_food',
        'water', 'ice_cream', 'pizza', 'healthy', 'pharmacy', 'electronics',
        'cosmetics', 'locker', 'laundry', 'car_wash', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "machine_status_enum" AS ENUM (
        'active', 'inactive', 'maintenance', 'error', 'offline', 'decommissioned'
      )
    `);

    // Transaction enums
    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'partial'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM (
        'cash', 'card', 'qr_code', 'payme', 'click', 'uzum', 'wallet', 'nfc', 'free', 'other'
      )
    `);

    // Task enums
    await queryRunner.query(`
      CREATE TYPE "task_status_enum" AS ENUM (
        'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "task_type_enum" AS ENUM (
        'replenishment', 'collection', 'maintenance', 'cleaning', 'installation',
        'relocation', 'decommission', 'inspection', 'repair', 'complaint', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM (
        'low', 'normal', 'high', 'urgent'
      )
    `);

    // Location enums
    await queryRunner.query(`
      CREATE TYPE "location_type_enum" AS ENUM (
        'shopping_center', 'supermarket', 'business_center', 'office', 'university',
        'school', 'college', 'hospital', 'clinic', 'pharmacy', 'fitness', 'gym',
        'cinema', 'entertainment', 'metro_station', 'bus_station', 'train_station',
        'airport', 'gas_station', 'hotel', 'hostel', 'residential', 'dormitory',
        'factory', 'warehouse', 'industrial', 'government', 'police', 'military',
        'park', 'street', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "location_status_enum" AS ENUM (
        'prospecting', 'contract_pending', 'active', 'suspended', 'closing', 'closed'
      )
    `);

    // Complaint enums
    await queryRunner.query(`
      CREATE TYPE "complaint_category_enum" AS ENUM (
        'machine_not_working', 'machine_error', 'payment_failed', 'card_not_accepted',
        'cash_not_accepted', 'no_change', 'product_not_dispensed', 'product_stuck',
        'wrong_product', 'product_expired', 'product_damaged', 'product_quality',
        'product_out_of_stock', 'refund_request', 'double_charge', 'charge_without_product',
        'machine_dirty', 'hygiene_issue', 'safety_concern', 'suggestion',
        'product_request', 'price_feedback', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "complaint_status_enum" AS ENUM (
        'new', 'pending', 'in_progress', 'assigned', 'investigating',
        'awaiting_customer', 'awaiting_parts', 'resolved', 'closed',
        'rejected', 'duplicate', 'escalated', 'reopened'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "complaint_priority_enum" AS ENUM (
        'low', 'medium', 'high', 'critical'
      )
    `);

    // Notification enums
    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM (
        'push', 'email', 'sms', 'telegram', 'whatsapp', 'in_app', 'webhook', 'slack'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM (
        'pending', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'expired'
      )
    `);

    // ========================================================================
    // TABLES
    // ========================================================================

    // Organizations
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "legal_name" VARCHAR(255),
        "type" organization_type_enum DEFAULT 'operator',
        "subscription_tier" subscription_tier_enum DEFAULT 'free',
        "code" VARCHAR(50) UNIQUE NOT NULL,
        "inn" VARCHAR(20),
        "address" TEXT,
        "phone" VARCHAR(50),
        "email" VARCHAR(255),
        "website" VARCHAR(255),
        "logo_url" TEXT,
        "settings" JSONB DEFAULT '{}',
        "limits" JSONB DEFAULT '{}',
        "features" TEXT[],
        "parent_id" UUID REFERENCES "organizations"("id") ON DELETE SET NULL,
        "is_active" BOOLEAN DEFAULT true,
        "subscription_expires_at" TIMESTAMP,
        "trial_ends_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // Users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) UNIQUE,
        "phone" VARCHAR(20) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255),
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "middle_name" VARCHAR(100),
        "avatar_url" TEXT,
        "role" user_role_enum DEFAULT 'viewer',
        "status" user_status_enum DEFAULT 'pending',
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "telegram_id" VARCHAR(50),
        "telegram_username" VARCHAR(100),
        "pin_code" VARCHAR(6),
        "language" VARCHAR(5) DEFAULT 'ru',
        "timezone" VARCHAR(50) DEFAULT 'Asia/Tashkent',
        "permissions" JSONB DEFAULT '{}',
        "metadata" JSONB DEFAULT '{}',
        "last_login_at" TIMESTAMP,
        "last_activity_at" TIMESTAMP,
        "email_verified_at" TIMESTAMP,
        "phone_verified_at" TIMESTAMP,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Locations
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(100) UNIQUE NOT NULL,
        "description" TEXT,
        "type" location_type_enum DEFAULT 'other',
        "status" location_status_enum DEFAULT 'prospecting',
        "address" JSONB NOT NULL,
        "city" VARCHAR(100) NOT NULL,
        "region" VARCHAR(100),
        "postal_code" VARCHAR(20),
        "latitude" DECIMAL(10,8) NOT NULL,
        "longitude" DECIMAL(11,8) NOT NULL,
        "coordinates" JSONB,
        "contacts" JSONB DEFAULT '[]',
        "working_hours" JSONB,
        "is_24_hours" BOOLEAN DEFAULT false,
        "characteristics" JSONB DEFAULT '{}',
        "monthly_rent" DECIMAL(15,2) DEFAULT 0,
        "revenue_share_percent" DECIMAL(5,2) DEFAULT 0,
        "currency" VARCHAR(10) DEFAULT 'UZS',
        "stats" JSONB DEFAULT '{}',
        "machine_count" INT DEFAULT 0,
        "total_revenue" DECIMAL(15,2) DEFAULT 0,
        "rating" DECIMAL(3,2),
        "metadata" JSONB DEFAULT '{}',
        "tags" TEXT[],
        "is_active" BOOLEAN DEFAULT true,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "manager_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "active_contract_id" UUID,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Machines
    await queryRunner.query(`
      CREATE TABLE "machines" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50) UNIQUE NOT NULL,
        "serial_number" VARCHAR(100) UNIQUE NOT NULL,
        "type" machine_type_enum DEFAULT 'combo',
        "status" machine_status_enum DEFAULT 'inactive',
        "manufacturer" VARCHAR(100),
        "model" VARCHAR(100),
        "year_manufactured" INT,
        "slot_count" INT DEFAULT 0,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "assigned_operator_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "settings" JSONB DEFAULT '{}',
        "telemetry" JSONB DEFAULT '{}',
        "payment_methods" JSONB DEFAULT '[]',
        "qr_code_complaint" VARCHAR(255),
        "last_service_at" TIMESTAMP,
        "next_service_at" TIMESTAMP,
        "last_collection_at" TIMESTAMP,
        "last_replenishment_at" TIMESTAMP,
        "last_online_at" TIMESTAMP,
        "current_cash" DECIMAL(15,2) DEFAULT 0,
        "total_revenue" DECIMAL(15,2) DEFAULT 0,
        "total_transactions" INT DEFAULT 0,
        "installation_date" DATE,
        "warranty_expires_at" DATE,
        "depreciation" JSONB,
        "metadata" JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Products
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "name_uz" VARCHAR(255),
        "sku" VARCHAR(100) UNIQUE NOT NULL,
        "barcode" VARCHAR(100),
        "description" TEXT,
        "category" VARCHAR(100),
        "subcategory" VARCHAR(100),
        "brand" VARCHAR(100),
        "unit" VARCHAR(20) DEFAULT 'pcs',
        "base_price" DECIMAL(15,2) NOT NULL,
        "cost_price" DECIMAL(15,2),
        "vat_rate" DECIMAL(5,2) DEFAULT 12,
        "ikpu_code" VARCHAR(50),
        "package_code" VARCHAR(50),
        "image_url" TEXT,
        "images" JSONB DEFAULT '[]',
        "shelf_life_days" INT,
        "storage_conditions" JSONB,
        "nutritional_info" JSONB,
        "is_available" BOOLEAN DEFAULT true,
        "is_active" BOOLEAN DEFAULT true,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Transactions
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transaction_number" VARCHAR(50) UNIQUE NOT NULL,
        "type" VARCHAR(50) DEFAULT 'sale',
        "status" transaction_status_enum DEFAULT 'pending',
        "machine_id" UUID NOT NULL REFERENCES "machines"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "subtotal" DECIMAL(15,2) NOT NULL,
        "discount_amount" DECIMAL(15,2) DEFAULT 0,
        "vat_amount" DECIMAL(15,2) DEFAULT 0,
        "total_amount" DECIMAL(15,2) NOT NULL,
        "currency" VARCHAR(10) DEFAULT 'UZS',
        "payment_method" payment_method_enum DEFAULT 'cash',
        "payment_details" JSONB DEFAULT '{}',
        "cash_received" DECIMAL(15,2),
        "change_given" DECIMAL(15,2),
        "fiscal_receipt_number" VARCHAR(100),
        "fiscal_sign" VARCHAR(255),
        "ofd_sent_at" TIMESTAMP,
        "error_message" TEXT,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP
      )
    `);

    // Tasks
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "task_number" VARCHAR(50) UNIQUE NOT NULL,
        "type" task_type_enum DEFAULT 'other',
        "status" task_status_enum DEFAULT 'pending',
        "priority" task_priority_enum DEFAULT 'normal',
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "machine_id" UUID REFERENCES "machines"("id") ON DELETE CASCADE,
        "location_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "assigned_to_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "due_date" TIMESTAMP,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "estimated_duration_minutes" INT,
        "actual_duration_minutes" INT,
        "checklist" JSONB DEFAULT '[]',
        "notes" TEXT,
        "photos" JSONB DEFAULT '[]',
        "result" JSONB,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // Complaints
    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ticket_number" VARCHAR(20) UNIQUE NOT NULL,
        "source" VARCHAR(50) DEFAULT 'qr_code',
        "category" complaint_category_enum DEFAULT 'other',
        "priority" complaint_priority_enum DEFAULT 'medium',
        "status" complaint_status_enum DEFAULT 'new',
        "subject" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "customer" JSONB,
        "customer_id" UUID,
        "is_anonymous" BOOLEAN DEFAULT false,
        "machine_id" UUID REFERENCES "machines"("id") ON DELETE SET NULL,
        "machine_info" JSONB,
        "location_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "product_info" JSONB,
        "transaction_info" JSONB,
        "geo_location" JSONB,
        "attachments" JSONB DEFAULT '[]',
        "assigned_to_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "sla_config" JSONB,
        "response_deadline" TIMESTAMP,
        "resolution_deadline" TIMESTAMP,
        "is_sla_breached" BOOLEAN DEFAULT false,
        "resolution" TEXT,
        "resolved_at" TIMESTAMP,
        "resolved_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "satisfaction_rating" INT,
        "satisfaction_feedback" TEXT,
        "is_escalated" BOOLEAN DEFAULT false,
        "escalation_level" INT DEFAULT 0,
        "metadata" JSONB DEFAULT '{}',
        "tags" TEXT[],
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "first_response_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Notifications
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "notification_id" VARCHAR(50) UNIQUE NOT NULL,
        "type" VARCHAR(100) NOT NULL,
        "priority" VARCHAR(20) DEFAULT 'normal',
        "status" notification_status_enum DEFAULT 'pending',
        "content" JSONB NOT NULL,
        "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "recipient" JSONB,
        "is_broadcast" BOOLEAN DEFAULT false,
        "channels" notification_channel_enum[] DEFAULT '{in_app}',
        "delivery_status" JSONB DEFAULT '[]',
        "schedule" JSONB,
        "scheduled_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "event_category" VARCHAR(50),
        "related_entity_id" UUID,
        "related_entity_type" VARCHAR(50),
        "template_id" UUID,
        "variables" JSONB,
        "metadata" JSONB DEFAULT '{}',
        "tags" TEXT[],
        "retry_count" INT DEFAULT 0,
        "sent_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "read_at" TIMESTAMP,
        "failed_at" TIMESTAMP,
        "error_message" TEXT,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ========================================================================
    // INDEXES
    // ========================================================================

    // Organizations
    await queryRunner.query(`CREATE INDEX "idx_organizations_parent" ON "organizations"("parent_id")`);
    await queryRunner.query(`CREATE INDEX "idx_organizations_type" ON "organizations"("type")`);

    // Users
    await queryRunner.query(`CREATE INDEX "idx_users_org_role" ON "users"("organization_id", "role")`);
    await queryRunner.query(`CREATE INDEX "idx_users_org_status" ON "users"("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_users_telegram" ON "users"("telegram_id")`);

    // Locations
    await queryRunner.query(`CREATE INDEX "idx_locations_org_status" ON "locations"("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_locations_org_type" ON "locations"("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX "idx_locations_coords" ON "locations"("latitude", "longitude")`);

    // Machines
    await queryRunner.query(`CREATE INDEX "idx_machines_org_status" ON "machines"("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_machines_location" ON "machines"("location_id")`);
    await queryRunner.query(`CREATE INDEX "idx_machines_operator" ON "machines"("assigned_operator_id")`);

    // Products
    await queryRunner.query(`CREATE INDEX "idx_products_org_category" ON "products"("organization_id", "category")`);
    await queryRunner.query(`CREATE INDEX "idx_products_barcode" ON "products"("barcode")`);

    // Transactions
    await queryRunner.query(`CREATE INDEX "idx_transactions_machine_date" ON "transactions"("machine_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_org_date" ON "transactions"("organization_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_status" ON "transactions"("status")`);

    // Tasks
    await queryRunner.query(`CREATE INDEX "idx_tasks_org_status" ON "tasks"("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_assigned" ON "tasks"("assigned_to_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_machine" ON "tasks"("machine_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_due_date" ON "tasks"("due_date", "status")`);

    // Complaints
    await queryRunner.query(`CREATE INDEX "idx_complaints_org_status" ON "complaints"("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_complaints_machine" ON "complaints"("machine_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_complaints_assigned" ON "complaints"("assigned_to_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_complaints_priority" ON "complaints"("status", "priority")`);

    // Notifications
    await queryRunner.query(`CREATE INDEX "idx_notifications_user_status" ON "notifications"("user_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_notifications_org_date" ON "notifications"("organization_id", "status", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_notifications_scheduled" ON "notifications"("scheduled_at", "status")`);

    console.log('✅ Initial schema migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_scheduled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_org_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_complaints_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_complaints_assigned"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_complaints_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_complaints_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_assigned"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_org_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_machine_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_barcode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_org_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machines_operator"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machines_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machines_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_coords"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_org_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_telegram"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_org_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_parent"`);

    // Drop tables (reverse order)
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaints" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machines" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaint_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaint_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaint_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "location_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "location_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "machine_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "machine_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_tier_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_type_enum"`);

    console.log('✅ Initial schema migration reverted successfully');
  }
}
