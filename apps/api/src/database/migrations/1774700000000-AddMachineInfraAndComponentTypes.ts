import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add machine infrastructure fields (hasTrashBin, nameplateSerial)
 * and extend machine_components_component_type_enum with sim_card, camera.
 */
export class AddMachineInfraAndComponentTypes1774700000000
  implements MigrationInterface
{
  name = "AddMachineInfraAndComponentTypes1774700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns to machines table
    await queryRunner.query(
      `ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "has_trash_bin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "nameplate_serial" varchar(100)`,
    );

    // 2. Extend ComponentType enum with sim_card and camera
    // PostgreSQL requires ALTER TYPE ... ADD VALUE (idempotent with IF NOT EXISTS in PG 12+)
    await queryRunner.query(
      `ALTER TYPE "machine_components_component_type_enum" ADD VALUE IF NOT EXISTS 'sim_card'`,
    );
    await queryRunner.query(
      `ALTER TYPE "machine_components_component_type_enum" ADD VALUE IF NOT EXISTS 'camera'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "machines" DROP COLUMN IF EXISTS "nameplate_serial"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" DROP COLUMN IF EXISTS "has_trash_bin"`,
    );
    // Note: PostgreSQL does not support removing enum values.
    // sim_card and camera will remain in the enum but unused after rollback.
  }
}
