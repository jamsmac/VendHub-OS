import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateAnalyticsTables
 *
 * Phase 3 - Step 4:
 * 1. CREATE TABLE analytics_snapshots - pre-aggregated analytics data
 *    (daily/weekly/monthly/yearly) per organization, machine, location, product
 * 2. CREATE TABLE daily_stats - single-row daily organization-level statistics
 *    for fast dashboard queries
 *
 * Includes unique composite indexes with soft-delete awareness to prevent
 * duplicate snapshot entries for the same dimension combination and period.
 */
export class CreateAnalyticsTables1709000003000 implements MigrationInterface {
  name = 'CreateAnalyticsTables1709000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: snapshot_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE snapshot_type_enum AS ENUM (
        'daily',
        'weekly',
        'monthly',
        'yearly'
      )
    `);

    // ========================================================================
    // TABLE: analytics_snapshots
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Identification / dimensions
        organization_id uuid NOT NULL,
        snapshot_type snapshot_type_enum NOT NULL,
        snapshot_date date NOT NULL,
        machine_id uuid,
        location_id uuid,
        product_id uuid,

        -- Sales metrics
        total_transactions int NOT NULL DEFAULT 0,
        total_revenue decimal(15, 2) NOT NULL DEFAULT 0,
        total_units_sold int NOT NULL DEFAULT 0,
        average_transaction_value decimal(15, 2) NOT NULL DEFAULT 0,

        -- Uptime metrics
        uptime_minutes int NOT NULL DEFAULT 0,
        downtime_minutes int NOT NULL DEFAULT 0,
        availability_percentage decimal(5, 2) NOT NULL DEFAULT 0,

        -- Operational metrics
        stock_refills int NOT NULL DEFAULT 0,
        out_of_stock_incidents int NOT NULL DEFAULT 0,
        maintenance_tasks_completed int NOT NULL DEFAULT 0,
        incidents_reported int NOT NULL DEFAULT 0,
        complaints_received int NOT NULL DEFAULT 0,

        -- Financial metrics
        operational_costs decimal(15, 2) NOT NULL DEFAULT 0,
        profit_margin decimal(5, 2) NOT NULL DEFAULT 0,

        -- Extended data (JSONB)
        detailed_metrics jsonb NOT NULL DEFAULT '{}',
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for analytics_snapshots
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_organization_id
        ON analytics_snapshots(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type_date
        ON analytics_snapshots(snapshot_type, snapshot_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_machine_id
        ON analytics_snapshots(machine_id)
    `);

    // Unique composite index (soft-delete aware)
    // Uses COALESCE to handle NULL dimensions (machine_id, location_id, product_id)
    // so that (org, daily, 2024-01-01, NULL, NULL, NULL) is unique
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snapshots_composite_unique
        ON analytics_snapshots(
          organization_id,
          snapshot_type,
          snapshot_date,
          COALESCE(machine_id, '00000000-0000-0000-0000-000000000000'),
          COALESCE(location_id, '00000000-0000-0000-0000-000000000000'),
          COALESCE(product_id, '00000000-0000-0000-0000-000000000000')
        )
        WHERE deleted_at IS NULL
    `);

    // ========================================================================
    // TABLE: daily_stats
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Identification
        organization_id uuid NOT NULL,
        stat_date date NOT NULL,

        -- Revenue
        total_revenue decimal(15, 2) NOT NULL DEFAULT 0,
        total_sales_count int NOT NULL DEFAULT 0,
        average_sale_amount decimal(15, 2) NOT NULL DEFAULT 0,
        total_collections decimal(15, 2) NOT NULL DEFAULT 0,
        collections_count int NOT NULL DEFAULT 0,

        -- Machines
        active_machines_count int NOT NULL DEFAULT 0,
        online_machines_count int NOT NULL DEFAULT 0,
        offline_machines_count int NOT NULL DEFAULT 0,

        -- Tasks
        refill_tasks_completed int NOT NULL DEFAULT 0,
        collection_tasks_completed int NOT NULL DEFAULT 0,
        cleaning_tasks_completed int NOT NULL DEFAULT 0,
        repair_tasks_completed int NOT NULL DEFAULT 0,
        total_tasks_completed int NOT NULL DEFAULT 0,

        -- Inventory
        inventory_units_refilled int NOT NULL DEFAULT 0,
        inventory_units_sold int NOT NULL DEFAULT 0,

        -- Aggregates (JSONB)
        top_products jsonb NOT NULL DEFAULT '[]',
        top_machines jsonb NOT NULL DEFAULT '[]',

        -- Status
        active_operators_count int NOT NULL DEFAULT 0,
        last_updated_at timestamptz,
        last_full_rebuild_at timestamptz,
        is_finalized boolean NOT NULL DEFAULT false,

        -- Extra data
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for daily_stats
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_stats_organization_id
        ON daily_stats(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_stats_stat_date
        ON daily_stats(stat_date)
    `);

    // Unique composite index: one row per org per day (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_org_date_unique
        ON daily_stats(organization_id, stat_date)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for daily_stats
    await queryRunner.query(`DROP INDEX IF EXISTS idx_daily_stats_org_date_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_daily_stats_stat_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_daily_stats_organization_id`);

    // -- Drop indexes for analytics_snapshots
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_snapshots_composite_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_snapshots_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_snapshots_type_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_snapshots_organization_id`);

    // -- Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS daily_stats CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_snapshots CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS snapshot_type_enum`);
  }
}
