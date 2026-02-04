import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateWarehouseTables
 *
 * Creates warehouse and inventory management tables:
 * 1. warehouses - Physical and virtual storage locations
 * 2. stock_movements - Tracks product transfers, receipts, dispatches, adjustments
 * 3. inventory_batches - Batch-level inventory tracking with expiry dates
 */
export class CreateWarehouseTables1708000002000 implements MigrationInterface {
  name = 'CreateWarehouseTables1708000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: warehouse_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE warehouse_type_enum AS ENUM (
        'main',
        'regional',
        'transit',
        'virtual'
      )
    `);

    // ========================================================================
    // ENUM: stock_movement_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE stock_movement_type_enum AS ENUM (
        'receipt',
        'transfer',
        'dispatch',
        'return',
        'adjustment',
        'write_off'
      )
    `);

    // ========================================================================
    // ENUM: stock_movement_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE stock_movement_status_enum AS ENUM (
        'pending',
        'in_transit',
        'completed',
        'cancelled'
      )
    `);

    // ========================================================================
    // TABLE 1: warehouses
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        manager_id uuid,

        -- Warehouse details
        name varchar(200) NOT NULL,
        code varchar(50) NOT NULL,
        type warehouse_type_enum NOT NULL DEFAULT 'main',

        -- Location
        address text,
        latitude decimal(10, 8),
        longitude decimal(11, 8),

        -- Contact
        phone varchar(20),

        -- Capacity
        capacity int,
        current_occupancy int NOT NULL DEFAULT 0,

        -- Status
        is_active boolean NOT NULL DEFAULT true,

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

    // -- Unique constraint: warehouse code (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code_unique
        ON warehouses(code)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for warehouses
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_warehouses_organization_id
        ON warehouses(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_warehouses_type
        ON warehouses(type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_warehouses_manager_id
        ON warehouses(manager_id)
    `);

    // ========================================================================
    // TABLE 2: stock_movements
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        from_warehouse_id uuid,
        to_warehouse_id uuid,
        product_id uuid NOT NULL,

        -- Movement details
        quantity decimal(12, 3) NOT NULL,
        unit_of_measure varchar(20) NOT NULL DEFAULT 'pcs',
        type stock_movement_type_enum NOT NULL,
        status stock_movement_status_enum NOT NULL DEFAULT 'pending',
        reference_number varchar(100),

        -- Users involved
        requested_by_user_id uuid NOT NULL,
        approved_by_user_id uuid,
        completed_by_user_id uuid,

        -- Timestamps
        requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at timestamptz,

        -- Cost tracking
        cost decimal(15, 2),

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

    // -- Indexes for stock_movements
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_organization_id
        ON stock_movements(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_from_warehouse_id
        ON stock_movements(from_warehouse_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_to_warehouse_id
        ON stock_movements(to_warehouse_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
        ON stock_movements(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type
        ON stock_movements(type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_status
        ON stock_movements(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_requested_at
        ON stock_movements(requested_at)
    `);

    // ========================================================================
    // TABLE 3: inventory_batches
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        warehouse_id uuid NOT NULL,
        product_id uuid NOT NULL,

        -- Batch details
        batch_number varchar(100) NOT NULL,
        quantity decimal(12, 3) NOT NULL,
        remaining_quantity decimal(12, 3) NOT NULL,
        unit_of_measure varchar(20) NOT NULL DEFAULT 'pcs',

        -- Cost tracking
        cost_per_unit decimal(15, 2),

        -- Dates
        expiry_date date,
        received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    // -- Unique constraint: batch number per warehouse+product (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_batches_warehouse_product_batch_unique
        ON inventory_batches(warehouse_id, product_id, batch_number)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for inventory_batches
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_batches_organization_id
        ON inventory_batches(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_batches_warehouse_id
        ON inventory_batches(warehouse_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_batches_product_id
        ON inventory_batches(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date
        ON inventory_batches(expiry_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for inventory_batches
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_expiry_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_product_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_warehouse_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_warehouse_product_batch_unique`);

    // -- Drop indexes for stock_movements
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_requested_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_product_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_to_warehouse_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_from_warehouse_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_organization_id`);

    // -- Drop indexes for warehouses
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_manager_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_code_unique`);

    // -- Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_batches CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS stock_movement_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS stock_movement_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS warehouse_type_enum`);
  }
}
