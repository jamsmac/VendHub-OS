import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateOpeningBalancesTable
 *
 * Creates the stock_opening_balances table for recording initial inventory
 * balances when onboarding warehouses or starting a new fiscal period.
 * Supports batch tracking, import sessions, and approval workflow.
 */
export class CreateOpeningBalancesTable1709000004000 implements MigrationInterface {
  name = 'CreateOpeningBalancesTable1709000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // TABLE: stock_opening_balances
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_opening_balances (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        product_id uuid NOT NULL,
        warehouse_id uuid NOT NULL,

        -- Balance details
        balance_date date NOT NULL,
        quantity decimal(15, 3) NOT NULL,
        unit varchar(20) NOT NULL DEFAULT 'pcs',
        unit_cost decimal(15, 2) NOT NULL,
        total_cost decimal(15, 2) NOT NULL,

        -- Batch tracking
        batch_number varchar(50),
        expiry_date date,
        location varchar(100),

        -- Approval workflow
        is_applied boolean NOT NULL DEFAULT false,
        applied_at timestamptz,
        applied_by_user_id uuid,

        -- Import tracking
        import_source varchar(50),
        import_session_id uuid,

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for stock_opening_balances
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_organization_id
        ON stock_opening_balances(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_product_id
        ON stock_opening_balances(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_warehouse_id
        ON stock_opening_balances(warehouse_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_balance_date
        ON stock_opening_balances(balance_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_is_applied
        ON stock_opening_balances(is_applied)
    `);

    // -- Foreign key constraints
    await queryRunner.query(`
      ALTER TABLE stock_opening_balances
        ADD CONSTRAINT fk_stock_opening_balances_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE stock_opening_balances
        ADD CONSTRAINT fk_stock_opening_balances_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE stock_opening_balances
        ADD CONSTRAINT fk_stock_opening_balances_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE stock_opening_balances
        ADD CONSTRAINT fk_stock_opening_balances_applied_by_user
        FOREIGN KEY (applied_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE stock_opening_balances DROP CONSTRAINT IF EXISTS fk_stock_opening_balances_applied_by_user`);
    await queryRunner.query(`ALTER TABLE stock_opening_balances DROP CONSTRAINT IF EXISTS fk_stock_opening_balances_warehouse`);
    await queryRunner.query(`ALTER TABLE stock_opening_balances DROP CONSTRAINT IF EXISTS fk_stock_opening_balances_product`);
    await queryRunner.query(`ALTER TABLE stock_opening_balances DROP CONSTRAINT IF EXISTS fk_stock_opening_balances_organization`);

    // -- Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_is_applied`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_balance_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_warehouse_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_product_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_organization_id`);

    // -- Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS stock_opening_balances CASCADE`);
  }
}
