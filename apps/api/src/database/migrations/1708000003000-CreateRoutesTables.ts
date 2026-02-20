import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateRoutesTables
 *
 * Creates route management tables for operator field work:
 * 1. routes - Planned and executed routes for refill/collection/maintenance
 * 2. route_stops - Individual stops within a route, linked to machines and tasks
 */
export class CreateRoutesTables1708000003000 implements MigrationInterface {
  name = 'CreateRoutesTables1708000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: route_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE route_type_enum AS ENUM (
        'refill',
        'collection',
        'maintenance',
        'mixed'
      )
    `);

    // ========================================================================
    // ENUM: route_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE route_status_enum AS ENUM (
        'planned',
        'in_progress',
        'completed',
        'cancelled'
      )
    `);

    // ========================================================================
    // ENUM: route_stop_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE route_stop_status_enum AS ENUM (
        'pending',
        'arrived',
        'in_progress',
        'completed',
        'skipped'
      )
    `);

    // ========================================================================
    // TABLE 1: routes
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        operator_id uuid NOT NULL,

        -- Route details
        name varchar(200) NOT NULL,
        type route_type_enum NOT NULL DEFAULT 'refill',
        status route_status_enum NOT NULL DEFAULT 'planned',

        -- Scheduling
        planned_date date NOT NULL,
        started_at timestamptz,
        completed_at timestamptz,

        -- Duration & distance estimates vs actuals
        estimated_duration_minutes int,
        actual_duration_minutes int,
        estimated_distance_km decimal(8, 2),
        actual_distance_km decimal(8, 2),

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for routes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_organization_id
        ON routes(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_operator_id
        ON routes(operator_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_planned_date
        ON routes(planned_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_status
        ON routes(status)
    `);

    // ========================================================================
    // TABLE 2: route_stops
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS route_stops (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        route_id uuid NOT NULL,
        machine_id uuid NOT NULL,
        task_id uuid,

        -- Stop details
        sequence int NOT NULL,
        status route_stop_status_enum NOT NULL DEFAULT 'pending',

        -- Timing
        estimated_arrival timestamptz,
        actual_arrival timestamptz,
        departed_at timestamptz,

        -- Geolocation
        latitude decimal(10, 8),
        longitude decimal(11, 8),

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Foreign keys
        CONSTRAINT "FK_route_stops_route_id"
          FOREIGN KEY (route_id) REFERENCES routes(id)
          ON DELETE CASCADE
      )
    `);

    // -- Unique constraint: sequence per route (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_route_stops_route_sequence_unique
        ON route_stops(route_id, sequence)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for route_stops
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_route_stops_route_id
        ON route_stops(route_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_route_stops_machine_id
        ON route_stops(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_route_stops_task_id
        ON route_stops(task_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for route_stops
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_task_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_route_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_route_sequence_unique`);

    // -- Drop indexes for routes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_planned_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_operator_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_organization_id`);

    // -- Drop tables in reverse order (route_stops first due to FK dependency)
    await queryRunner.query(`DROP TABLE IF EXISTS route_stops CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS routes CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS route_stop_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS route_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS route_type_enum`);
  }
}
