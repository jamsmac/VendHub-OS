import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateReconciliationTables
 *
 * Phase 3 - Step 2:
 * 1. CREATE TABLE reconciliation_runs - orchestrates reconciliation processes
 * 2. CREATE TABLE reconciliation_mismatches - individual discrepancy records
 * 3. CREATE TABLE hw_imported_sales - hardware-imported sale records for matching
 *
 * Supports multiple reconciliation sources (HW, payment systems, fiscal data)
 * and tracks mismatches with resolution workflows.
 */
export class CreateReconciliationTables1709000001000 implements MigrationInterface {
  name = 'CreateReconciliationTables1709000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: reconciliation_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE reconciliation_status_enum AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    `);

    // ========================================================================
    // ENUM: reconciliation_source_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE reconciliation_source_enum AS ENUM (
        'hw',
        'sales_report',
        'fiscal',
        'payme',
        'click',
        'uzum'
      )
    `);

    // ========================================================================
    // ENUM: mismatch_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE mismatch_type_enum AS ENUM (
        'order_not_found',
        'payment_not_found',
        'amount_mismatch',
        'time_mismatch',
        'duplicate',
        'partial_match'
      )
    `);

    // ========================================================================
    // ENUM: hw_import_source_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE hw_import_source_enum AS ENUM (
        'excel',
        'csv',
        'api'
      )
    `);

    // ========================================================================
    // TABLE: reconciliation_runs
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_runs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,

        -- Status
        status reconciliation_status_enum NOT NULL DEFAULT 'pending',

        -- Date range for reconciliation
        date_from date NOT NULL,
        date_to date NOT NULL,

        -- Configuration
        sources jsonb NOT NULL DEFAULT '[]',
        machine_ids jsonb NOT NULL DEFAULT '[]',
        time_tolerance int NOT NULL DEFAULT 300,
        amount_tolerance decimal(5, 2) NOT NULL DEFAULT 0.01,

        -- Execution tracking
        started_at timestamptz,
        completed_at timestamptz,
        processing_time_ms int,

        -- Results summary (JSONB)
        summary jsonb,

        -- Error handling
        error_message text,

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

    // -- Indexes for reconciliation_runs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_organization_id
        ON reconciliation_runs(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_status
        ON reconciliation_runs(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_created_at
        ON reconciliation_runs(created_at)
    `);

    // ========================================================================
    // TABLE: reconciliation_mismatches
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_mismatches (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        run_id uuid NOT NULL,
        organization_id uuid NOT NULL,

        -- Order reference
        order_number varchar(100),
        machine_code varchar(50),
        order_time timestamptz,
        amount decimal(15, 2),
        payment_method varchar(50),

        -- Mismatch classification
        mismatch_type mismatch_type_enum NOT NULL,
        match_score decimal(5, 2),
        discrepancy_amount decimal(15, 2),

        -- Source data (raw data from each source)
        sources_data jsonb NOT NULL DEFAULT '{}',

        -- Description & resolution
        description text,
        is_resolved boolean NOT NULL DEFAULT false,
        resolution_notes text,
        resolved_at timestamptz,
        resolved_by_user_id uuid,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for reconciliation_mismatches
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_mismatches_run_id
        ON reconciliation_mismatches(run_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_mismatches_organization_id
        ON reconciliation_mismatches(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_mismatches_mismatch_type
        ON reconciliation_mismatches(mismatch_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_mismatches_is_resolved
        ON reconciliation_mismatches(is_resolved)
    `);

    // -- FK: reconciliation_mismatches -> reconciliation_runs
    await queryRunner.query(`
      ALTER TABLE reconciliation_mismatches
        ADD CONSTRAINT fk_reconciliation_mismatches_run
        FOREIGN KEY (run_id) REFERENCES reconciliation_runs(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: hw_imported_sales
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hw_imported_sales (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        import_batch_id uuid NOT NULL,

        -- Sale details
        sale_date timestamptz NOT NULL,
        machine_code varchar(50) NOT NULL,
        machine_id uuid,
        amount decimal(15, 2) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'UZS',
        payment_method varchar(50),

        -- Order reference
        order_number varchar(100),
        transaction_id uuid,

        -- Product info
        product_name varchar(200),
        product_code varchar(50),
        quantity int NOT NULL DEFAULT 1,

        -- Import metadata
        import_source hw_import_source_enum NOT NULL,
        import_filename varchar(255),
        import_row_number int,

        -- Reconciliation link
        is_reconciled boolean NOT NULL DEFAULT false,
        reconciliation_run_id uuid,

        -- Raw data
        raw_data jsonb NOT NULL DEFAULT '{}',

        -- Audit
        imported_by_user_id uuid,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for hw_imported_sales
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_imported_sales_organization_id
        ON hw_imported_sales(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_imported_sales_import_batch_id
        ON hw_imported_sales(import_batch_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_imported_sales_machine_code
        ON hw_imported_sales(machine_code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_imported_sales_sale_date
        ON hw_imported_sales(sale_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_imported_sales_is_reconciled
        ON hw_imported_sales(is_reconciled)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for hw_imported_sales
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hw_imported_sales_is_reconciled`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hw_imported_sales_sale_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hw_imported_sales_machine_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hw_imported_sales_import_batch_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hw_imported_sales_organization_id`);

    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE reconciliation_mismatches DROP CONSTRAINT IF EXISTS fk_reconciliation_mismatches_run`);

    // -- Drop indexes for reconciliation_mismatches
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_is_resolved`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_mismatch_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_run_id`);

    // -- Drop indexes for reconciliation_runs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_runs_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_runs_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_runs_organization_id`);

    // -- Drop tables in reverse order (children first)
    await queryRunner.query(`DROP TABLE IF EXISTS hw_imported_sales CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_mismatches CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_runs CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS hw_import_source_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS mismatch_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reconciliation_source_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reconciliation_status_enum`);
  }
}
