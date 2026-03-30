import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add hasCamera boolean to machines table.
 * SIM cards are tracked via machine_components (componentType = 'sim_card').
 */
export class AddMachineSimAndCameraFields1774800000000
  implements MigrationInterface
{
  name = "AddMachineSimAndCameraFields1774800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "has_camera" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "machines" DROP COLUMN IF EXISTS "has_camera"`,
    );
  }
}
