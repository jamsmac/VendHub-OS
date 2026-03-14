import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryCheckConstraints1715400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // warehouse_inventory: current_quantity >= 0 and reserved_quantity >= 0
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_inventory') THEN
          ALTER TABLE warehouse_inventory
            ADD CONSTRAINT chk_warehouse_current_qty CHECK (current_quantity >= 0);
          ALTER TABLE warehouse_inventory
            ADD CONSTRAINT chk_warehouse_reserved_qty CHECK (reserved_quantity >= 0);
        END IF;
      END $$;
    `);

    // operator_inventory: current_quantity >= 0 and reserved_quantity >= 0
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operator_inventory') THEN
          ALTER TABLE operator_inventory
            ADD CONSTRAINT chk_operator_current_qty CHECK (current_quantity >= 0);
          ALTER TABLE operator_inventory
            ADD CONSTRAINT chk_operator_reserved_qty CHECK (reserved_quantity >= 0);
        END IF;
      END $$;
    `);

    // machine_inventory: current_quantity >= 0
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'machine_inventory') THEN
          ALTER TABLE machine_inventory
            ADD CONSTRAINT chk_machine_current_qty CHECK (current_quantity >= 0);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE warehouse_inventory DROP CONSTRAINT IF EXISTS chk_warehouse_current_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouse_inventory DROP CONSTRAINT IF EXISTS chk_warehouse_reserved_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE operator_inventory DROP CONSTRAINT IF EXISTS chk_operator_current_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE operator_inventory DROP CONSTRAINT IF EXISTS chk_operator_reserved_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE machine_inventory DROP CONSTRAINT IF EXISTS chk_machine_current_qty`,
    );
  }
}
