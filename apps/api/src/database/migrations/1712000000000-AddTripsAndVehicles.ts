import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripsAndVehicles1712000000000 implements MigrationInterface {
  name = 'AddTripsAndVehicles1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =======================================================================
    // CREATE ENUMS
    // =======================================================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "vehicle_type_enum" AS ENUM ('company', 'personal');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "vehicle_status_enum" AS ENUM ('active', 'inactive', 'maintenance');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "trip_status_enum" AS ENUM ('active', 'completed', 'cancelled', 'auto_closed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "trip_task_type_enum" AS ENUM ('filling', 'collection', 'repair', 'maintenance', 'inspection', 'merchandising', 'other');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "anomaly_type_enum" AS ENUM ('long_stop', 'speed_violation', 'route_deviation', 'gps_jump', 'missed_location', 'unplanned_stop', 'mileage_discrepancy');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "anomaly_severity_enum" AS ENUM ('info', 'warning', 'critical');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "trip_task_link_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // =======================================================================
    // VEHICLES TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "owner_employee_id" uuid,
        "type" "vehicle_type_enum" NOT NULL DEFAULT 'company',
        "brand" varchar(100) NOT NULL,
        "model" varchar(100),
        "plate_number" varchar(20) NOT NULL,
        "current_odometer" integer NOT NULL DEFAULT 0,
        "last_odometer_update" TIMESTAMP WITH TIME ZONE,
        "status" "vehicle_status_enum" NOT NULL DEFAULT 'active',
        "notes" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id")
      )
    `);

    // =======================================================================
    // TRIPS TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "vehicle_id" uuid,
        "task_type" "trip_task_type_enum" NOT NULL DEFAULT 'other',
        "status" "trip_status_enum" NOT NULL DEFAULT 'active',
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "start_odometer" integer,
        "end_odometer" integer,
        "calculated_distance_meters" integer NOT NULL DEFAULT 0,
        "start_latitude" decimal(10,8),
        "start_longitude" decimal(11,8),
        "end_latitude" decimal(10,8),
        "end_longitude" decimal(11,8),
        "start_machine_id" uuid,
        "end_machine_id" uuid,
        "total_points" integer NOT NULL DEFAULT 0,
        "total_stops" integer NOT NULL DEFAULT 0,
        "total_anomalies" integer NOT NULL DEFAULT 0,
        "visited_machines_count" integer NOT NULL DEFAULT 0,
        "live_location_active" boolean NOT NULL DEFAULT false,
        "last_location_update" TIMESTAMP WITH TIME ZONE,
        "telegram_message_id" bigint,
        "notes" text,
        CONSTRAINT "PK_trips" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trips_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE SET NULL
      )
    `);

    // =======================================================================
    // TRIP_POINTS TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_points" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "trip_id" uuid NOT NULL,
        "latitude" decimal(10,8) NOT NULL,
        "longitude" decimal(11,8) NOT NULL,
        "accuracy_meters" decimal(8,2),
        "speed_mps" decimal(8,2),
        "heading" decimal(5,2),
        "altitude" decimal(10,2),
        "distance_from_prev_meters" decimal(10,2) NOT NULL DEFAULT 0,
        "is_filtered" boolean NOT NULL DEFAULT false,
        "filter_reason" varchar(50),
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_trip_points" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_points_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // =======================================================================
    // TRIP_STOPS TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_stops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "trip_id" uuid NOT NULL,
        "latitude" decimal(10,8) NOT NULL,
        "longitude" decimal(11,8) NOT NULL,
        "machine_id" uuid,
        "machine_name" varchar(128),
        "machine_address" varchar(256),
        "distance_to_machine_meters" integer,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "duration_seconds" integer,
        "is_verified" boolean NOT NULL DEFAULT false,
        "is_anomaly" boolean NOT NULL DEFAULT false,
        "notification_sent" boolean NOT NULL DEFAULT false,
        "notes" text,
        CONSTRAINT "PK_trip_stops" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_stops_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // =======================================================================
    // TRIP_ANOMALIES TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_anomalies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "trip_id" uuid NOT NULL,
        "type" "anomaly_type_enum" NOT NULL,
        "severity" "anomaly_severity_enum" NOT NULL DEFAULT 'warning',
        "latitude" decimal(10,8),
        "longitude" decimal(11,8),
        "details" jsonb NOT NULL DEFAULT '{}',
        "notification_sent" boolean NOT NULL DEFAULT false,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolved_by_id" uuid,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "resolution_notes" text,
        "detected_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_anomalies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_anomalies_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // =======================================================================
    // TRIP_TASK_LINKS TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_task_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "trip_id" uuid NOT NULL,
        "task_id" uuid NOT NULL,
        "status" "trip_task_link_status_enum" NOT NULL DEFAULT 'pending',
        "verified_by_gps" boolean NOT NULL DEFAULT false,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        CONSTRAINT "PK_trip_task_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_task_links_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // =======================================================================
    // TRIP_RECONCILIATIONS TABLE
    // =======================================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_reconciliations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "actual_odometer" integer NOT NULL,
        "expected_odometer" integer NOT NULL,
        "difference_km" integer NOT NULL,
        "threshold_km" integer NOT NULL,
        "is_anomaly" boolean NOT NULL,
        "performed_by_id" uuid NOT NULL,
        "performed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "notes" text,
        CONSTRAINT "PK_trip_reconciliations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_reconciliations_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE CASCADE
      )
    `);

    // =======================================================================
    // INDEXES
    // =======================================================================

    // Vehicles
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_vehicles_organization" ON "vehicles" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_vehicles_owner" ON "vehicles" ("owner_employee_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicles_plate" ON "vehicles" ("organization_id", "plate_number") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_vehicles_status" ON "vehicles" ("status")`);

    // Trips
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_organization" ON "trips" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_employee" ON "trips" ("employee_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_vehicle" ON "trips" ("vehicle_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_status" ON "trips" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_started" ON "trips" ("started_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_trips_active_employee" ON "trips" ("employee_id") WHERE "status" = 'active' AND "deleted_at" IS NULL`);

    // Trip points
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_points_trip_time" ON "trip_points" ("trip_id", "recorded_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_points_valid" ON "trip_points" ("trip_id", "is_filtered")`);

    // Trip stops
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_stops_trip" ON "trip_stops" ("trip_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_stops_machine" ON "trip_stops" ("machine_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_stops_started" ON "trip_stops" ("started_at")`);

    // Trip anomalies
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_anomalies_trip" ON "trip_anomalies" ("trip_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_anomalies_type" ON "trip_anomalies" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_anomalies_resolved" ON "trip_anomalies" ("resolved")`);

    // Trip task links
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_trip_task_links_unique" ON "trip_task_links" ("trip_id", "task_id") WHERE "deleted_at" IS NULL`);

    // Trip reconciliations
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_reconciliations_vehicle" ON "trip_reconciliations" ("vehicle_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trip_reconciliations_performed" ON "trip_reconciliations" ("performed_at")`);

    // =======================================================================
    // FOREIGN KEYS (safe: skip if referenced table doesn't exist yet)
    // =======================================================================

    // vehicles.organization_id → organizations
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "vehicles" ADD CONSTRAINT "FK_vehicles_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN undefined_table OR duplicate_object THEN null; END $$;
    `);

    // trips.organization_id → organizations
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN undefined_table OR duplicate_object THEN null; END $$;
    `);

    // trips.employee_id → users
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_employee"
          FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN undefined_table OR duplicate_object THEN null; END $$;
    `);

    // trip_task_links.task_id → tasks
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "trip_task_links" ADD CONSTRAINT "FK_trip_task_links_task"
          FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;
      EXCEPTION WHEN undefined_table OR duplicate_object THEN null; END $$;
    `);

    // trip_reconciliations.organization_id → organizations
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "trip_reconciliations" ADD CONSTRAINT "FK_trip_reconciliations_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN undefined_table OR duplicate_object THEN null; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints first (safe)
    await queryRunner.query(`ALTER TABLE IF EXISTS "trip_reconciliations" DROP CONSTRAINT IF EXISTS "FK_trip_reconciliations_organization"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "trip_task_links" DROP CONSTRAINT IF EXISTS "FK_trip_task_links_task"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "trips" DROP CONSTRAINT IF EXISTS "FK_trips_employee"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "trips" DROP CONSTRAINT IF EXISTS "FK_trips_organization"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "vehicles" DROP CONSTRAINT IF EXISTS "FK_vehicles_organization"`);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_reconciliations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_task_links" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_anomalies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_stops" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_points" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trips" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_task_link_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "anomaly_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "anomaly_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_task_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicle_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicle_type_enum"`);
  }
}
