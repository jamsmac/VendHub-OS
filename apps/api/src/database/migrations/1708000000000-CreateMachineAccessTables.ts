import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateMachineAccessTables
 *
 * Creates machine access management tables:
 * 1. machine_access - Per-machine user access grants with roles
 * 2. access_templates - Reusable access permission templates
 * 3. access_template_rows - Individual role/permission rows within templates
 */
export class CreateMachineAccessTables1708000000000 implements MigrationInterface {
  name = 'CreateMachineAccessTables1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: machine_access_role_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE machine_access_role_enum AS ENUM (
        'full',
        'refill',
        'collection',
        'maintenance',
        'view'
      )
    `);

    // ========================================================================
    // TABLE 1: machine_access
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS machine_access (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        machine_id uuid NOT NULL,
        user_id uuid NOT NULL,

        -- Access details
        role machine_access_role_enum NOT NULL DEFAULT 'view',
        granted_by_user_id uuid NOT NULL,
        is_active boolean NOT NULL DEFAULT true,

        -- Validity period
        valid_from timestamptz,
        valid_to timestamptz,

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

    // -- Unique constraint: one access record per machine+user (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_machine_access_machine_user"
        ON machine_access(machine_id, user_id)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for machine_access
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_access_organization_id
        ON machine_access(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_access_machine_id
        ON machine_access(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_access_user_id
        ON machine_access(user_id)
    `);

    // ========================================================================
    // TABLE 2: access_templates
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS access_templates (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,

        -- Template details
        name varchar(200) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Unique constraint: template name per organization (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_access_templates_name_org"
        ON access_templates(name, organization_id)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for access_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_access_templates_organization_id
        ON access_templates(organization_id)
    `);

    // ========================================================================
    // TABLE 3: access_template_rows
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS access_template_rows (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        template_id uuid NOT NULL,

        -- Row details
        role machine_access_role_enum NOT NULL,
        permissions jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Foreign keys
        CONSTRAINT "FK_access_template_rows_template_id"
          FOREIGN KEY (template_id) REFERENCES access_templates(id)
          ON DELETE CASCADE
      )
    `);

    // -- Indexes for access_template_rows
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_access_template_rows_template_id
        ON access_template_rows(template_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for access_template_rows
    await queryRunner.query(`DROP INDEX IF EXISTS idx_access_template_rows_template_id`);

    // -- Drop indexes for access_templates
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_access_templates_name_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_access_templates_organization_id`);

    // -- Drop indexes for machine_access
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machine_access_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machine_access_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machine_access_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_machine_access_machine_user"`);

    // -- Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS access_template_rows CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS access_templates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS machine_access CASCADE`);

    // -- Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS machine_access_role_enum`);
  }
}
