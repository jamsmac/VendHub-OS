import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoryReconciliationAndSlotHistory1776700000000 implements MigrationInterface {
  name = "CreateInventoryReconciliationAndSlotHistory1776700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE inventory_reconciliation_status_enum AS ENUM (
        'draft', 'submitted', 'confirmed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE slot_history_action_enum AS ENUM (
        'set', 'clear', 'update_qty', 'update_price'
      )
    `);

    // inventory_reconciliations table
    await queryRunner.query(`
      CREATE TABLE inventory_reconciliations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        status inventory_reconciliation_status_enum NOT NULL DEFAULT 'draft',
        counted_at TIMESTAMP WITH TIME ZONE NOT NULL,
        total_difference_qty INT NOT NULL DEFAULT 0,
        total_difference_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
        nedostacha DECIMAL(14, 2) NOT NULL DEFAULT 0,
        note TEXT,
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inv_recon_org_status ON inventory_reconciliations (organization_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inv_recon_org_loc ON inventory_reconciliations (organization_id, location_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inv_recon_org_counted_at ON inventory_reconciliations (organization_id, counted_at DESC)
    `);

    // inventory_reconciliation_items table
    await queryRunner.query(`
      CREATE TABLE inventory_reconciliation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reconciliation_id UUID NOT NULL REFERENCES inventory_reconciliations(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        expected_qty INT NOT NULL,
        actual_qty INT NOT NULL,
        diff_qty INT NOT NULL,
        unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
        adjustment_movement_id UUID,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inv_recon_items_recon ON inventory_reconciliation_items (reconciliation_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_inv_recon_items_product ON inventory_reconciliation_items (product_id)
    `);

    // slot_history table
    await queryRunner.query(`
      CREATE TABLE slot_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
        slot_number VARCHAR(20) NOT NULL,
        action slot_history_action_enum NOT NULL,
        prev_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        new_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        prev_quantity INT,
        new_quantity INT,
        prev_price DECIMAL(12, 2),
        new_price DECIMAL(12, 2),
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
      CREATE INDEX idx_slot_history_org_machine_at ON slot_history (organization_id, machine_id, at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_slot_history_org_at ON slot_history (organization_id, at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS slot_history`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS inventory_reconciliation_items`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_reconciliations`);
    await queryRunner.query(`DROP TYPE IF EXISTS slot_history_action_enum`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS inventory_reconciliation_status_enum`,
    );
  }
}
