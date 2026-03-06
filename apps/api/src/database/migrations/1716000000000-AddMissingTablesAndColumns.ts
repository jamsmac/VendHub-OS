import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddMissingTablesAndColumns
 *
 * Syncs DB schema with TypeORM entities. Applied via direct SQL on 2026-03-06.
 *
 * Changes:
 *   1. New enum types: transport_type, report_category, export_format, period_type,
 *      reservation_status, digest_frequency, notification_type, notification_priority
 *   2. New tables: report_definitions, scheduled_reports, inventory_reservations,
 *      user_notification_settings, notification_templates
 *   3. Missing columns: trips.transport_type, machines.last_ping_at
 *   4. BaseEntity columns (created_by_id, updated_by_id) added to 27 tables
 *   5. Data migration: machines.created_by → created_by_id, notifications.created_by → created_by_id
 */
export class AddMissingTablesAndColumns1716000000000
  implements MigrationInterface
{
  name = "AddMissingTablesAndColumns1716000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // PART 1: ENUM TYPES
    // =========================================================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "transport_type_enum" AS ENUM ('car', 'motorcycle', 'bicycle', 'on_foot', 'public_transport');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_category_enum" AS ENUM ('sales', 'machines', 'inventory', 'finance', 'operations', 'complaints', 'locations', 'analytics', 'custom');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "export_format_enum" AS ENUM ('pdf', 'excel', 'csv', 'json', 'html');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "period_type_enum" AS ENUM (
          'today', 'yesterday', 'this_week', 'last_week',
          'this_month', 'last_month', 'this_quarter', 'last_quarter',
          'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'custom'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reservation_status_enum" AS ENUM ('pending', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "digest_frequency_enum" AS ENUM ('daily', 'weekly', 'none');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM (
          'system', 'announcement', 'maintenance',
          'machine_alert', 'machine_error', 'machine_offline', 'machine_low_stock', 'machine_out_of_stock', 'machine_temperature',
          'task_assigned', 'task_updated', 'task_completed', 'task_overdue', 'task_reminder',
          'complaint_new', 'complaint_assigned', 'complaint_updated', 'complaint_resolved', 'complaint_sla_warning',
          'inventory_low', 'inventory_expiring', 'inventory_transfer',
          'transaction_alert', 'collection_due', 'collection_completed', 'payment_received', 'revenue_milestone',
          'user_login', 'user_invited', 'password_changed', 'role_changed',
          'contract_expiring', 'contract_expired', 'contract_payment_due',
          'report_ready', 'report_scheduled',
          'custom'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_priority_enum" AS ENUM ('low', 'normal', 'high', 'urgent');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // =========================================================================
    // PART 2: ALTER EXISTING TABLES — MISSING COLUMNS
    // =========================================================================

    // trips: add transport_type
    await queryRunner.query(`
      ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "transport_type" transport_type_enum DEFAULT 'car'
    `);

    // machines: add last_ping_at + BaseEntity columns
    await queryRunner.query(`
      ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "last_ping_at" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "created_by_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "updated_by_id" uuid
    `);

    // Migrate data from old created_by → created_by_id (machines)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'machines' AND column_name = 'created_by'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'machines' AND column_name = 'created_by_id'
        ) THEN
          UPDATE machines SET created_by_id = created_by WHERE created_by IS NOT NULL AND created_by_id IS NULL;
        END IF;
      END $$;
    `);

    // BaseEntity columns (created_by_id, updated_by_id) for all tables missing them
    const tablesNeedingBaseEntityColumns = [
      "audit_logs",
      "cash_collections",
      "complaint_comments",
      "complaints",
      "directories",
      "directory_entries",
      "directory_events",
      "directory_fields",
      "directory_import_jobs",
      "directory_import_templates",
      "directory_permissions",
      "directory_sources",
      "directory_webhook_dead_letters",
      "directory_webhook_deliveries",
      "directory_webhooks",
      "inventories",
      "inventory_movements",
      "locations",
      "machine_planograms",
      "notifications",
      "organizations",
      "products",
      "task_history",
      "transaction_items",
      "transactions",
      "users",
    ];

    for (const table of tablesNeedingBaseEntityColumns) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "created_by_id" uuid`
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updated_by_id" uuid`
      );
    }

    // Migrate notifications.created_by → created_by_id
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'notifications' AND column_name = 'created_by'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'notifications' AND column_name = 'created_by_id'
        ) THEN
          UPDATE notifications SET created_by_id = created_by WHERE created_by IS NOT NULL AND created_by_id IS NULL;
        END IF;
      END $$;
    `);

    // reports: only needs updated_by_id (created_by_id already exists)
    await queryRunner.query(`
      ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "updated_by_id" uuid
    `);

    // =========================================================================
    // PART 3: CREATE MISSING TABLES
    // =========================================================================

    // report_definitions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "name_uz" varchar(100),
        "code" varchar(50) NOT NULL,
        "description" text,
        "description_uz" text,
        "type" report_type_enum NOT NULL,
        "category" report_category_enum NOT NULL,
        "sections" jsonb NOT NULL DEFAULT '[]',
        "columns" jsonb NOT NULL DEFAULT '[]',
        "default_filters" jsonb,
        "grouping" jsonb,
        "sorting" jsonb,
        "generation_params" jsonb NOT NULL DEFAULT '{}',
        "available_formats" export_format_enum[] NOT NULL DEFAULT '{pdf,excel}',
        "sql_query" text,
        "query_parameters" jsonb NOT NULL DEFAULT '[]',
        "allowed_roles" text NOT NULL DEFAULT '',
        "is_public" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "run_count" integer NOT NULL DEFAULT 0,
        "last_run_at" TIMESTAMP,
        "average_generation_time_ms" integer,
        CONSTRAINT "PK_report_definitions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_report_definitions_code" UNIQUE ("code")
      )
    `);

    // scheduled_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduled_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "definition_id" uuid,
        "name" varchar(100) NOT NULL,
        "description" text,
        "schedule" jsonb NOT NULL,
        "next_run_at" TIMESTAMP,
        "last_run_at" TIMESTAMP,
        "filters" jsonb,
        "period_type" period_type_enum NOT NULL DEFAULT 'last_30_days',
        "recipients" jsonb NOT NULL DEFAULT '[]',
        "format" export_format_enum NOT NULL DEFAULT 'pdf',
        "is_active" boolean NOT NULL DEFAULT true,
        "run_count" integer NOT NULL DEFAULT 0,
        "fail_count" integer NOT NULL DEFAULT 0,
        "last_success_at" TIMESTAMP,
        "last_error" text,
        CONSTRAINT "PK_scheduled_reports" PRIMARY KEY ("id")
      )
    `);

    // inventory_reservations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "reservation_number" varchar(50) NOT NULL,
        "task_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity_reserved" decimal(10,3) NOT NULL,
        "quantity_fulfilled" decimal(10,3) NOT NULL DEFAULT 0,
        "status" reservation_status_enum NOT NULL DEFAULT 'pending',
        "inventory_level" varchar(20) NOT NULL,
        "reference_id" uuid NOT NULL,
        "reserved_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "fulfilled_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "created_by_user_id" uuid,
        CONSTRAINT "PK_inventory_reservations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_reservations_number" UNIQUE ("reservation_number")
      )
    `);

    // user_notification_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_notification_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "quiet_hours_start" varchar(5),
        "quiet_hours_end" varchar(5),
        "timezone" varchar(50) NOT NULL DEFAULT 'Asia/Tashkent',
        "language" varchar(5) NOT NULL DEFAULT 'ru',
        "push_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "sms_enabled" boolean NOT NULL DEFAULT false,
        "telegram_enabled" boolean NOT NULL DEFAULT true,
        "in_app_enabled" boolean NOT NULL DEFAULT true,
        "email" varchar(255),
        "phone" varchar(20),
        "telegram_id" varchar(50),
        "device_tokens" jsonb NOT NULL DEFAULT '[]',
        "type_settings" jsonb NOT NULL DEFAULT '{}',
        "digest_enabled" boolean NOT NULL DEFAULT false,
        "digest_frequency" digest_frequency_enum NOT NULL DEFAULT 'none',
        "digest_time" varchar(5),
        "digest_channels" notification_channel_enum[] NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_user_notification_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_notification_settings_user" UNIQUE ("user_id")
      )
    `);

    // notification_templates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "code" varchar(50) NOT NULL,
        "description" text,
        "type" notification_type_enum NOT NULL,
        "title_ru" varchar(255) NOT NULL,
        "body_ru" text NOT NULL,
        "short_body_ru" text,
        "html_body_ru" text,
        "title_uz" varchar(255),
        "body_uz" text,
        "short_body_uz" text,
        "title_en" varchar(255),
        "body_en" text,
        "default_channels" notification_channel_enum[] NOT NULL DEFAULT '{in_app}',
        "default_priority" notification_priority_enum NOT NULL DEFAULT 'normal',
        "available_variables" jsonb NOT NULL DEFAULT '[]',
        "action_url" text,
        "action_text_ru" varchar(100),
        "action_text_uz" varchar(100),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "usage_count" integer NOT NULL DEFAULT 0,
        "last_used_at" TIMESTAMP,
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id")
      )
    `);

    // =========================================================================
    // PART 4: INDEXES
    // =========================================================================

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_report_definitions_org_type" ON "report_definitions" ("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_report_definitions_org_category" ON "report_definitions" ("organization_id", "category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_report_definitions_org_active" ON "report_definitions" ("organization_id", "is_active")`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_reports_org_active" ON "scheduled_reports" ("organization_id", "is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_reports_next_run" ON "scheduled_reports" ("next_run_at", "is_active")`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_org" ON "inventory_reservations" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_task" ON "inventory_reservations" ("task_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_product" ON "inventory_reservations" ("product_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_status" ON "inventory_reservations" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_level_ref" ON "inventory_reservations" ("inventory_level", "reference_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_expires" ON "inventory_reservations" ("expires_at")`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_notification_settings_user" ON "user_notification_settings" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_notification_settings_org" ON "user_notification_settings" ("organization_id")`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_templates_org_type" ON "notification_templates" ("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_templates_org_code" ON "notification_templates" ("organization_id", "code")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_templates_active" ON "notification_templates" ("is_active")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from existing tables
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "transport_type"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN IF EXISTS "last_ping_at"`);
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN IF EXISTS "updated_by_id"`);

    // Remove BaseEntity columns from 27 tables
    const tablesWithBaseEntityColumns = [
      "audit_logs", "cash_collections", "complaint_comments", "complaints",
      "directories", "directory_entries", "directory_events", "directory_fields",
      "directory_import_jobs", "directory_import_templates", "directory_permissions",
      "directory_sources", "directory_webhook_dead_letters", "directory_webhook_deliveries",
      "directory_webhooks", "inventories", "inventory_movements", "locations",
      "machine_planograms", "notifications", "organizations", "products",
      "task_history", "transaction_items", "transactions", "users", "machines",
    ];
    for (const table of tablesWithBaseEntityColumns) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "created_by_id"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "updated_by_id"`);
    }

    // Drop tables (reverse order)
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_notification_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_reservations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_definitions" CASCADE`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "digest_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reservation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "period_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "export_format_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transport_type_enum"`);
  }
}
