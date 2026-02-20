import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateSalesImportTable
 *
 * Creates the sales_imports table for tracking bulk sales data import jobs.
 * Supports Excel and CSV file types, progress tracking with row counts,
 * structured error reporting, and import summary statistics.
 */
export class CreateSalesImportTable1709000006000 implements MigrationInterface {
  name = 'CreateSalesImportTable1709000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: import_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE import_status_enum AS ENUM (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'PARTIAL'
      )
    `);

    // ========================================================================
    // ENUM: import_file_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE import_file_type_enum AS ENUM (
        'EXCEL',
        'CSV'
      )
    `);

    // ========================================================================
    // TABLE: sales_imports
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_imports (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        uploaded_by_user_id uuid NOT NULL,

        -- File details
        filename varchar(255) NOT NULL,
        file_type import_file_type_enum NOT NULL,
        file_id uuid,

        -- Status
        status import_status_enum NOT NULL DEFAULT 'PENDING',

        -- Row counts
        total_rows int NOT NULL DEFAULT 0,
        success_rows int NOT NULL DEFAULT 0,
        failed_rows int NOT NULL DEFAULT 0,

        -- Error details (structured array of row-level errors)
        errors jsonb NOT NULL DEFAULT '[]',

        -- Import summary (aggregated results after processing)
        summary jsonb,

        -- Processing timestamps
        started_at timestamptz,
        completed_at timestamptz,

        -- Final status message
        message text,

        -- Metadata
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for sales_imports
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_imports_organization_id
        ON sales_imports(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_imports_status
        ON sales_imports(status)
    `);

    // -- Partial index: active records ordered by creation date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_imports_created_at_active
        ON sales_imports(created_at)
        WHERE deleted_at IS NULL
    `);

    // -- Foreign key constraints
    await queryRunner.query(`
      ALTER TABLE sales_imports
        ADD CONSTRAINT fk_sales_imports_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE sales_imports
        ADD CONSTRAINT fk_sales_imports_uploaded_by_user
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE sales_imports DROP CONSTRAINT IF EXISTS fk_sales_imports_uploaded_by_user`);
    await queryRunner.query(`ALTER TABLE sales_imports DROP CONSTRAINT IF EXISTS fk_sales_imports_organization`);

    // -- Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_imports_created_at_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_imports_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_imports_organization_id`);

    // -- Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS sales_imports CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS import_file_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_status_enum`);
  }
}
