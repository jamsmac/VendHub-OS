import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Merge Trips into Routes — single unified module.
 *
 * Steps:
 * 1. Add new enum values to route_status_enum
 * 2. Create transport_type_enum
 * 3. Add execution/GPS/tracking columns to routes
 * 4. Add TripStop-derived columns to route_stops
 * 5. Create route_points table
 * 6. Create route_anomalies table (with enums)
 * 7. Create route_task_links table (with enum)
 */
export class MergeTripsIntoRoutes1775700000000 implements MigrationInterface {
  name = "MergeTripsIntoRoutes1775700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: Extend route status enum ──────────────────────────
    // Add new values: draft, active, auto_closed
    // Rename in_progress → active via temp swap
    await queryRunner.query(`
      ALTER TYPE "routes_status_enum" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'planned';
    `);
    await queryRunner.query(`
      ALTER TYPE "routes_status_enum" ADD VALUE IF NOT EXISTS 'active' AFTER 'planned';
    `);
    await queryRunner.query(`
      ALTER TYPE "routes_status_enum" ADD VALUE IF NOT EXISTS 'auto_closed' AFTER 'cancelled';
    `);
    // Migrate existing in_progress → active
    await queryRunner.query(`
      UPDATE "routes" SET "status" = 'active' WHERE "status" = 'in_progress';
    `);

    // ── Step 2: Create transport_type_enum ────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "transport_type_enum" AS ENUM ('car', 'motorcycle', 'bicycle', 'on_foot', 'public_transport');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── Step 3: Add execution/GPS/tracking columns to routes ──────
    await queryRunner.query(`
      ALTER TABLE "routes"
        ADD COLUMN IF NOT EXISTS "vehicle_id" uuid,
        ADD COLUMN IF NOT EXISTS "transport_type" "transport_type_enum",
        ADD COLUMN IF NOT EXISTS "start_odometer" integer,
        ADD COLUMN IF NOT EXISTS "end_odometer" integer,
        ADD COLUMN IF NOT EXISTS "calculated_distance_meters" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "start_latitude" decimal(10,8),
        ADD COLUMN IF NOT EXISTS "start_longitude" decimal(11,8),
        ADD COLUMN IF NOT EXISTS "end_latitude" decimal(10,8),
        ADD COLUMN IF NOT EXISTS "end_longitude" decimal(11,8),
        ADD COLUMN IF NOT EXISTS "live_location_active" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "last_location_update" timestamptz,
        ADD COLUMN IF NOT EXISTS "telegram_message_id" bigint,
        ADD COLUMN IF NOT EXISTS "total_points" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "total_stops_visited" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "total_anomalies" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "visited_machines_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taxi_total_amount" decimal(12,2);
    `);

    // Index on vehicle_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routes_vehicle_id" ON "routes" ("vehicle_id");
    `);

    // Partial index for active routes per operator
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routes_operator_active"
        ON "routes" ("operator_id", "status")
        WHERE "status" = 'active' AND "deleted_at" IS NULL;
    `);

    // Foreign key to vehicles
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "routes" ADD CONSTRAINT "FK_routes_vehicle"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── Step 4: Add TripStop-derived columns to route_stops ───────
    await queryRunner.query(`
      ALTER TABLE "route_stops"
        ADD COLUMN IF NOT EXISTS "machine_name" varchar(128),
        ADD COLUMN IF NOT EXISTS "machine_address" varchar(256),
        ADD COLUMN IF NOT EXISTS "distance_to_machine_meters" integer,
        ADD COLUMN IF NOT EXISTS "actual_duration_seconds" integer,
        ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "is_anomaly" boolean NOT NULL DEFAULT false;
    `);

    // ── Step 5: Create route_points table ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_points" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "route_id" uuid NOT NULL,
        "latitude" decimal(10,8) NOT NULL,
        "longitude" decimal(11,8) NOT NULL,
        "accuracy_meters" decimal(8,2),
        "speed_mps" decimal(8,2),
        "heading" decimal(5,2),
        "altitude" decimal(10,2),
        "distance_from_prev_meters" decimal(10,2) NOT NULL DEFAULT 0,
        "is_filtered" boolean NOT NULL DEFAULT false,
        "filter_reason" varchar(50),
        "recorded_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_route_points" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_points_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_route_points_route_recorded"
        ON "route_points" ("route_id", "recorded_at");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_route_points_route_filtered"
        ON "route_points" ("route_id", "is_filtered");
    `);

    // ── Step 6: Create anomaly enums + route_anomalies table ──────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "route_anomaly_type_enum" AS ENUM (
          'long_stop', 'speed_violation', 'route_deviation',
          'gps_jump', 'missed_location', 'unplanned_stop', 'mileage_discrepancy'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "route_anomaly_severity_enum" AS ENUM ('info', 'warning', 'critical');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_anomalies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "route_id" uuid NOT NULL,
        "type" "route_anomaly_type_enum" NOT NULL,
        "severity" "route_anomaly_severity_enum" NOT NULL DEFAULT 'warning',
        "latitude" decimal(10,8),
        "longitude" decimal(11,8),
        "details" jsonb NOT NULL DEFAULT '{}',
        "notification_sent" boolean NOT NULL DEFAULT false,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolved_by_id" uuid,
        "resolved_at" timestamptz,
        "resolution_notes" text,
        "detected_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_route_anomalies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_anomalies_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_route_anomalies_route" ON "route_anomalies" ("route_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_route_anomalies_type" ON "route_anomalies" ("type");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_route_anomalies_resolved" ON "route_anomalies" ("resolved");
    `);

    // ── Step 7: Create route_task_link enum + table ───────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "route_task_link_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_task_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "route_id" uuid NOT NULL,
        "task_id" uuid NOT NULL,
        "status" "route_task_link_status_enum" NOT NULL DEFAULT 'pending',
        "verified_by_gps" boolean NOT NULL DEFAULT false,
        "verified_at" timestamptz,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "notes" text,
        "expected_latitude" decimal(10,7),
        "expected_longitude" decimal(10,7),
        "actual_latitude" decimal(10,7),
        "actual_longitude" decimal(10,7),
        "distance_from_expected_m" decimal(10,2),
        "verification_radius_m" decimal(10,2) NOT NULL DEFAULT 100,
        "stop_duration_seconds" integer,
        "route_stop_id" uuid,
        "overridden_by_id" uuid,
        "verification_status" varchar(50),
        "vhm24_task_id" varchar,
        "vhm24_task_type" varchar,
        "vhm24_machine_id" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_route_task_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_route_task_links_route" FOREIGN KEY ("route_id")
          REFERENCES "routes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_route_task_links_unique"
        ON "route_task_links" ("route_id", "task_id")
        WHERE "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "route_task_links" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_anomalies" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_points" CASCADE;`);

    // Drop enums
    await queryRunner.query(
      `DROP TYPE IF EXISTS "route_task_link_status_enum";`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "route_anomaly_severity_enum";`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "route_anomaly_type_enum";`);

    // Remove columns from route_stops
    await queryRunner.query(`
      ALTER TABLE "route_stops"
        DROP COLUMN IF EXISTS "machine_name",
        DROP COLUMN IF EXISTS "machine_address",
        DROP COLUMN IF EXISTS "distance_to_machine_meters",
        DROP COLUMN IF EXISTS "actual_duration_seconds",
        DROP COLUMN IF EXISTS "is_verified",
        DROP COLUMN IF EXISTS "is_anomaly";
    `);

    // Remove columns from routes
    await queryRunner.query(`
      ALTER TABLE "routes"
        DROP CONSTRAINT IF EXISTS "FK_routes_vehicle",
        DROP COLUMN IF EXISTS "vehicle_id",
        DROP COLUMN IF EXISTS "transport_type",
        DROP COLUMN IF EXISTS "start_odometer",
        DROP COLUMN IF EXISTS "end_odometer",
        DROP COLUMN IF EXISTS "calculated_distance_meters",
        DROP COLUMN IF EXISTS "start_latitude",
        DROP COLUMN IF EXISTS "start_longitude",
        DROP COLUMN IF EXISTS "end_latitude",
        DROP COLUMN IF EXISTS "end_longitude",
        DROP COLUMN IF EXISTS "live_location_active",
        DROP COLUMN IF EXISTS "last_location_update",
        DROP COLUMN IF EXISTS "telegram_message_id",
        DROP COLUMN IF EXISTS "total_points",
        DROP COLUMN IF EXISTS "total_stops_visited",
        DROP COLUMN IF EXISTS "total_anomalies",
        DROP COLUMN IF EXISTS "visited_machines_count",
        DROP COLUMN IF EXISTS "taxi_total_amount";
    `);

    // Revert active → in_progress
    await queryRunner.query(`
      UPDATE "routes" SET "status" = 'in_progress' WHERE "status" = 'active';
    `);

    // Drop transport type enum
    await queryRunner.query(`DROP TYPE IF EXISTS "transport_type_enum";`);

    // Note: Cannot remove enum values in PostgreSQL. The unused values
    // (draft, active, auto_closed) will remain in routes_status_enum.
  }
}
