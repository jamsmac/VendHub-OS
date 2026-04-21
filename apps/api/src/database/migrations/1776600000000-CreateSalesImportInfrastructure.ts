import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSalesImportInfrastructure1776600000000 implements MigrationInterface {
  name = "CreateSalesImportInfrastructure1776600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ────────────────────────────────────────────────
    // 1. Enum for SalesImport.format
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE sales_import_format_enum AS ENUM (
        'hicon', 'multikassa', 'click', 'payme', 'uzum', 'custom'
      )
    `);

    // ────────────────────────────────────────────────
    // 2. Extend sales_imports with G3 columns
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE sales_imports
        ADD COLUMN format sales_import_format_enum,
        ADD COLUMN report_day DATE,
        ADD COLUMN machine_id UUID,
        ADD COLUMN imported INT NOT NULL DEFAULT 0,
        ADD COLUMN skipped INT NOT NULL DEFAULT 0,
        ADD COLUMN unmapped INT NOT NULL DEFAULT 0,
        ADD COLUMN delta_adjusted INT NOT NULL DEFAULT 0,
        ADD COLUMN total_qty INT NOT NULL DEFAULT 0,
        ADD COLUMN total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN delta_log JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN unmapped_names JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sales_imports_org_report_day
        ON sales_imports (organization_id, report_day)
        WHERE report_day IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_imports_org_machine
        ON sales_imports (organization_id, machine_id)
        WHERE machine_id IS NOT NULL
    `);

    // ────────────────────────────────────────────────
    // 3. sales_txn_hashes (dedup index)
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE sales_txn_hashes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        hash_key VARCHAR(64) NOT NULL,
        sales_import_id UUID NOT NULL REFERENCES sales_imports(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_sales_txn_hashes_org_hash
        ON sales_txn_hashes (organization_id, hash_key)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_txn_hashes_sales_import
        ON sales_txn_hashes (sales_import_id)
    `);

    // ────────────────────────────────────────────────
    // 4. sales_aggregated (daily snapshot for delta)
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE sales_aggregated (
        organization_id UUID NOT NULL,
        report_day DATE NOT NULL,
        machine_id UUID NOT NULL,
        product_id UUID NOT NULL,
        qty INT NOT NULL DEFAULT 0,
        total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
        last_import_id UUID,
        last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (organization_id, report_day, machine_id, product_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sales_aggregated_org_day
        ON sales_aggregated (organization_id, report_day)
    `);

    // ────────────────────────────────────────────────
    // 5. parse_sessions (30min TTL)
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE parse_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        by_user_id UUID NOT NULL,
        format VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        storage_key VARCHAR(500),
        report_day DATE,
        rows JSONB NOT NULL,
        headers JSONB NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parse_sessions_org_expires
        ON parse_sessions (organization_id, expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_parse_sessions_org_expires`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS parse_sessions`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_aggregated_org_day`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_aggregated`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_txn_hashes_sales_import`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_txn_hashes_org_hash`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sales_txn_hashes`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_imports_org_machine`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_imports_org_report_day`,
    );
    await queryRunner.query(`
      ALTER TABLE sales_imports
        DROP COLUMN IF EXISTS unmapped_names,
        DROP COLUMN IF EXISTS delta_log,
        DROP COLUMN IF EXISTS total_revenue,
        DROP COLUMN IF EXISTS total_qty,
        DROP COLUMN IF EXISTS delta_adjusted,
        DROP COLUMN IF EXISTS unmapped,
        DROP COLUMN IF EXISTS skipped,
        DROP COLUMN IF EXISTS imported,
        DROP COLUMN IF EXISTS machine_id,
        DROP COLUMN IF EXISTS report_day,
        DROP COLUMN IF EXISTS format
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS sales_import_format_enum`);
  }
}
