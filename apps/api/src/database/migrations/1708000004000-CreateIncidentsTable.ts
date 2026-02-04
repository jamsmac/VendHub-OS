import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateIncidentsTable
 *
 * Creates the incidents table for tracking vending machine incidents
 * (vandalism, theft, mechanical failures, etc.) with enum types for
 * incident type, status, and priority.
 */
export class CreateIncidentsTable1708000004000 implements MigrationInterface {
  name = 'CreateIncidentsTable1708000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM TYPES
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE incident_type_enum AS ENUM (
        'vandalism',
        'theft',
        'water_damage',
        'power_failure',
        'network_failure',
        'mechanical_failure',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE incident_status_enum AS ENUM (
        'reported',
        'investigating',
        'resolved',
        'closed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE incident_priority_enum AS ENUM (
        'low',
        'medium',
        'high'
      )
    `);

    // ========================================================================
    // TABLE: incidents
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        machine_id uuid NOT NULL,

        -- Classification
        type incident_type_enum NOT NULL DEFAULT 'other',
        status incident_status_enum NOT NULL DEFAULT 'reported',
        priority incident_priority_enum NOT NULL DEFAULT 'medium',

        -- Details
        title varchar(300) NOT NULL,
        description text,

        -- Users involved
        reported_by_user_id uuid NOT NULL,
        assigned_to_user_id uuid,
        resolved_by_user_id uuid,

        -- Timestamps
        reported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at timestamptz,

        -- Financial
        repair_cost decimal(15, 2),
        insurance_claim boolean NOT NULL DEFAULT false,
        insurance_claim_number varchar(100),

        -- Data
        photos jsonb NOT NULL DEFAULT '[]',
        resolution text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for incidents
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_organization_id
        ON incidents(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_machine_id
        ON incidents(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_status
        ON incidents(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_type
        ON incidents(type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_reported_at
        ON incidents(reported_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_reported_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_organization_id`);

    // -- Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS incidents CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS incident_priority_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incident_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incident_type_enum`);
  }
}
