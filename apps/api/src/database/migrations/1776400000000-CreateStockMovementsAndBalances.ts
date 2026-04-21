import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockMovementsAndBalances1776400000000 implements MigrationInterface {
  name = "CreateStockMovementsAndBalances1776400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE movement_type_enum AS ENUM (
        'purchase_in', 'transfer_to_storage', 'transfer_to_machine',
        'transfer_back', 'sale', 'write_off',
        'adjustment_plus', 'adjustment_minus', 'sample'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE movement_reference_type_enum AS ENUM (
        'purchase', 'sales_import', 'reconciliation', 'transaction', 'manual'
      )
    `);

    // stock_movements table
    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        from_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
        to_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
        quantity INT NOT NULL CHECK (quantity > 0),
        movement_type movement_type_enum NOT NULL,
        unit_cost DECIMAL(12, 2),
        unit_price DECIMAL(12, 2),
        reference_type movement_reference_type_enum,
        reference_id UUID,
        note TEXT,
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_org_at ON stock_movements (organization_id, at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_org_product_at ON stock_movements (organization_id, product_id, at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_org_type ON stock_movements (organization_id, movement_type)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_from_loc ON stock_movements (from_location_id) WHERE from_location_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_to_loc ON stock_movements (to_location_id) WHERE to_location_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_stock_movements_ref ON stock_movements (reference_type, reference_id) WHERE reference_type IS NOT NULL
    `);

    // inventory_balances table (materialized)
    await queryRunner.query(`
      CREATE TABLE inventory_balances (
        organization_id UUID NOT NULL,
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 0,
        last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (organization_id, location_id, product_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inventory_balances_org_loc ON inventory_balances (organization_id, location_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inventory_balances_org_prod ON inventory_balances (organization_id, product_id)
    `);

    // Trigger function: update inventory_balances on stock_movements INSERT
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_inventory_balances_on_movement()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Decrement from fromLocation (if set)
        IF NEW.from_location_id IS NOT NULL THEN
          INSERT INTO inventory_balances (organization_id, location_id, product_id, quantity, last_updated_at)
          VALUES (NEW.organization_id, NEW.from_location_id, NEW.product_id, -NEW.quantity, NOW())
          ON CONFLICT (organization_id, location_id, product_id)
          DO UPDATE SET
            quantity = inventory_balances.quantity - NEW.quantity,
            last_updated_at = NOW();
        END IF;

        -- Increment to toLocation (if set)
        IF NEW.to_location_id IS NOT NULL THEN
          INSERT INTO inventory_balances (organization_id, location_id, product_id, quantity, last_updated_at)
          VALUES (NEW.organization_id, NEW.to_location_id, NEW.product_id, NEW.quantity, NOW())
          ON CONFLICT (organization_id, location_id, product_id)
          DO UPDATE SET
            quantity = inventory_balances.quantity + NEW.quantity,
            last_updated_at = NOW();
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_update_inventory_balances
        AFTER INSERT ON stock_movements
        FOR EACH ROW
        EXECUTE FUNCTION update_inventory_balances_on_movement();
    `);

    // Backfill: for each MachineSlot with product_id, seed initial balance
    // via ADJUSTMENT_PLUS movement (so historical query still works)
    await queryRunner.query(`
      INSERT INTO stock_movements (
        organization_id, product_id, to_location_id, quantity, movement_type,
        unit_cost, reference_type, note, at
      )
      SELECT
        m.organization_id,
        ms.product_id,
        m.location_id,
        ms.current_quantity,
        'adjustment_plus'::movement_type_enum,
        COALESCE(ms.cost_price, p.purchase_price, 0),
        'manual'::movement_reference_type_enum,
        'Initial balance seed during Sprint G1 migration',
        NOW()
      FROM machine_slots ms
      INNER JOIN machines m ON m.id = ms.machine_id
      LEFT JOIN products p ON p.id = ms.product_id
      WHERE ms.product_id IS NOT NULL
        AND ms.current_quantity > 0
        AND m.location_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_update_inventory_balances ON stock_movements`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_inventory_balances_on_movement()`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements`);
    await queryRunner.query(`DROP TYPE IF EXISTS movement_reference_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS movement_type_enum`);
  }
}
