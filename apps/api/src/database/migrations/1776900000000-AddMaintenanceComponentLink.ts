import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Sprint 2.1 — Maintenance ↔ EquipmentComponent link
 *
 * Before this migration a MaintenanceSchedule could only target a whole
 * machine ("clean machine M-005 every 3 days"). To support the cleaning
 * schedule UX requested by the operator team — "wash grinder #5",
 * "wash hopper #7" — we need to attach a specific component to both
 * the schedule template and the per-occurrence request it generates.
 *
 * - Both columns are nullable: existing schedules keep working, and
 *   machine-level requests (whole-machine PM, etc.) remain valid.
 * - ON DELETE SET NULL: removing a component must not orphan or destroy
 *   maintenance history.
 * - Indexed for filtering on /maintenance?componentId= and for the bot's
 *   "what is my queue for grinder #5" lookup.
 */
export class AddMaintenanceComponentLink1776900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE maintenance_requests
        ADD COLUMN IF NOT EXISTS component_id UUID
        REFERENCES equipment_components(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_maintenance_requests_component_id
        ON maintenance_requests (component_id)
        WHERE component_id IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE maintenance_schedules
        ADD COLUMN IF NOT EXISTS component_id UUID
        REFERENCES equipment_components(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_component_id
        ON maintenance_schedules (component_id)
        WHERE component_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_maintenance_schedules_component_id`,
    );
    await queryRunner.query(
      `ALTER TABLE maintenance_schedules DROP COLUMN IF EXISTS component_id`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_maintenance_requests_component_id`,
    );
    await queryRunner.query(
      `ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS component_id`,
    );
  }
}
