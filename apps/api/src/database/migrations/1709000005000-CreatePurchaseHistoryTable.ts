import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreatePurchaseHistoryTable
 *
 * Creates the purchase_history table for tracking all product purchases
 * from suppliers. Includes VAT calculations (Uzbekistan 12% standard),
 * multi-currency support, batch tracking, and delivery workflow.
 */
export class CreatePurchaseHistoryTable1709000005000 implements MigrationInterface {
  name = 'CreatePurchaseHistoryTable1709000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: purchase_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE purchase_status_enum AS ENUM (
        'PENDING',
        'RECEIVED',
        'PARTIAL',
        'CANCELLED',
        'RETURNED'
      )
    `);

    // ========================================================================
    // TABLE: purchase_history
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_history (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        supplier_id uuid,
        product_id uuid NOT NULL,
        warehouse_id uuid,

        -- Purchase details
        purchase_date date NOT NULL,
        invoice_number varchar(50),

        -- Quantities
        quantity decimal(15, 3) NOT NULL,
        unit varchar(20) NOT NULL DEFAULT 'pcs',

        -- Pricing
        unit_price decimal(15, 2) NOT NULL,
        vat_rate decimal(5, 2) NOT NULL DEFAULT 12,
        vat_amount decimal(15, 2) NOT NULL DEFAULT 0,
        total_amount decimal(15, 2) NOT NULL,

        -- Batch tracking
        batch_number varchar(50),
        production_date date,
        expiry_date date,

        -- Status & delivery
        status purchase_status_enum NOT NULL DEFAULT 'PENDING',
        delivery_date date,
        delivery_note_number varchar(50),

        -- Currency
        currency varchar(3) NOT NULL DEFAULT 'UZS',
        exchange_rate decimal(10, 4) NOT NULL DEFAULT 1,

        -- Payment
        payment_method varchar(50),
        payment_date date,

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

    // -- Indexes for purchase_history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_organization_id
        ON purchase_history(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_supplier_id
        ON purchase_history(supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_product_id
        ON purchase_history(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_warehouse_id
        ON purchase_history(warehouse_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_purchase_date
        ON purchase_history(purchase_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_status
        ON purchase_history(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_invoice_number
        ON purchase_history(invoice_number)
    `);

    // -- Foreign key constraints
    await queryRunner.query(`
      ALTER TABLE purchase_history
        ADD CONSTRAINT fk_purchase_history_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_history
        ADD CONSTRAINT fk_purchase_history_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_history
        ADD CONSTRAINT fk_purchase_history_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_history
        ADD CONSTRAINT fk_purchase_history_supplier
        FOREIGN KEY (supplier_id) REFERENCES counterparties(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE purchase_history DROP CONSTRAINT IF EXISTS fk_purchase_history_supplier`);
    await queryRunner.query(`ALTER TABLE purchase_history DROP CONSTRAINT IF EXISTS fk_purchase_history_warehouse`);
    await queryRunner.query(`ALTER TABLE purchase_history DROP CONSTRAINT IF EXISTS fk_purchase_history_product`);
    await queryRunner.query(`ALTER TABLE purchase_history DROP CONSTRAINT IF EXISTS fk_purchase_history_organization`);

    // -- Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_invoice_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_purchase_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_warehouse_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_product_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_supplier_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_organization_id`);

    // -- Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_history CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS purchase_status_enum`);
  }
}
