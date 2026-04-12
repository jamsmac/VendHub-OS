import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Drop orphaned trip_* tables left over from the trips → routes merge.
 * These tables have no corresponding TypeORM entities and are no longer used.
 * Data was migrated to routes/route_stops/route_points/route_anomalies/route_task_links
 * in migration 1775700000000-MergeTripsIntoRoutes.
 */
export class DropOrphanedTripTables1776000000000 implements MigrationInterface {
  name = "DropOrphanedTripTables1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order (child tables first)
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_task_links" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_points" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_anomalies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_stops" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trips" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate tables if rollback is needed (minimal schema for data restore)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_stops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id" uuid REFERENCES "trips"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_anomalies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id" uuid REFERENCES "trips"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_points" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id" uuid REFERENCES "trips"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_task_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id" uuid REFERENCES "trips"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
  }
}
