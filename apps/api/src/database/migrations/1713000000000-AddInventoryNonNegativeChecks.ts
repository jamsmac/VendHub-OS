import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryNonNegativeChecks1713000000000 implements MigrationInterface {
  name = "AddInventoryNonNegativeChecks1713000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CHECK constraints to prevent negative inventory quantities.
    // Safely skip if table doesn't exist or constraint already present.
    const safeConstraint = async (sql: string) => {
      await queryRunner.query(`
        DO $$ BEGIN
          ${sql};
        EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
        END $$
      `);
    };

    await safeConstraint(
      `ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "chk_warehouse_inventory_non_negative" CHECK ("current_quantity" >= 0)`,
    );
    await safeConstraint(
      `ALTER TABLE "operator_inventory" ADD CONSTRAINT "chk_operator_inventory_non_negative" CHECK ("current_quantity" >= 0)`,
    );
    await safeConstraint(
      `ALTER TABLE "machine_inventory" ADD CONSTRAINT "chk_machine_inventory_non_negative" CHECK ("current_quantity" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "machine_inventory"
        DROP CONSTRAINT IF EXISTS "chk_machine_inventory_non_negative";
    `);

    await queryRunner.query(`
      ALTER TABLE "operator_inventory"
        DROP CONSTRAINT IF EXISTS "chk_operator_inventory_non_negative";
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
        DROP CONSTRAINT IF EXISTS "chk_warehouse_inventory_non_negative";
    `);
  }
}
