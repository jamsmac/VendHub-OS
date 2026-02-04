import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateSecurityTables
 *
 * Creates security-related tables:
 * 1. security_events - Audit log for security-relevant events (login, logout, role changes, etc.)
 * 2. data_encryption - Tracks field-level encryption metadata for sensitive data
 */
export class CreateSecurityTables1707300000000 implements MigrationInterface {
  name = 'CreateSecurityTables1707300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // TABLE 1: security_events
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Event classification
        event_type varchar(50) NOT NULL,
        severity varchar(20) NOT NULL DEFAULT 'info',

        -- Relations
        user_id uuid,
        organization_id uuid,

        -- Request context
        ip_address varchar(45),
        user_agent text,

        -- Resource targeted
        resource varchar(100),
        resource_id uuid,

        -- Details
        description text,
        metadata jsonb DEFAULT '{}',

        -- Session
        session_id varchar(255),

        -- Resolution workflow
        is_resolved boolean NOT NULL DEFAULT false,
        resolved_by_id uuid,
        resolved_at timestamptz,
        resolution_notes text,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Constraints
        CONSTRAINT chk_security_events_event_type CHECK (
          event_type IN (
            'LOGIN_SUCCESS',
            'LOGIN_FAILURE',
            'LOGOUT',
            'PASSWORD_CHANGE',
            'PASSWORD_RESET',
            'TWO_FACTOR_ENABLED',
            'TWO_FACTOR_DISABLED',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED',
            'ROLE_CHANGED',
            'PERMISSION_CHANGED',
            'SESSION_CREATED',
            'SESSION_TERMINATED',
            'DATA_EXPORT',
            'DATA_IMPORT',
            'API_KEY_CREATED',
            'API_KEY_REVOKED',
            'SUSPICIOUS_ACTIVITY',
            'BRUTE_FORCE_DETECTED',
            'IP_BLOCKED',
            'ENCRYPTION_KEY_ROTATED'
          )
        ),
        CONSTRAINT chk_security_events_severity CHECK (
          severity IN ('low', 'info', 'warning', 'critical')
        )
      )
    `);

    // Foreign keys for security_events
    await queryRunner.query(`
      ALTER TABLE security_events
        ADD CONSTRAINT "FK_security_events_user_id"
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE security_events
        ADD CONSTRAINT "FK_security_events_organization_id"
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE security_events
        ADD CONSTRAINT "FK_security_events_resolved_by_id"
        FOREIGN KEY (resolved_by_id) REFERENCES users(id)
        ON DELETE SET NULL
    `);

    // -- Indexes for security_events
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_event_type
        ON security_events(event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_severity
        ON security_events(severity)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_user_id
        ON security_events(user_id)
        WHERE user_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_organization_id
        ON security_events(organization_id)
        WHERE organization_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at
        ON security_events(created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_is_resolved
        ON security_events(is_resolved)
        WHERE is_resolved = false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_user_event_type
        ON security_events(user_id, event_type)
        WHERE user_id IS NOT NULL
    `);

    // ========================================================================
    // TABLE 2: data_encryption
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_encryption (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Entity reference
        entity_type varchar(100) NOT NULL,
        entity_id uuid NOT NULL,
        field_name varchar(100) NOT NULL,

        -- Encryption details
        algorithm varchar(50) NOT NULL DEFAULT 'aes-256-gcm',
        key_version integer NOT NULL DEFAULT 1,
        key_identifier varchar(255),

        -- Status
        status varchar(20) NOT NULL DEFAULT 'active',

        -- Rotation tracking
        last_rotated_at timestamptz,
        next_rotation_at timestamptz,

        -- Additional data
        metadata jsonb DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Constraints
        CONSTRAINT chk_data_encryption_status CHECK (
          status IN ('active', 'rotating', 'inactive', 'compromised')
        )
      )
    `);

    // -- Indexes for data_encryption
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_data_encryption_entity_field_unique
        ON data_encryption(entity_type, entity_id, field_name)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_encryption_status
        ON data_encryption(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_encryption_key_version
        ON data_encryption(key_version)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for data_encryption
    await queryRunner.query(`DROP INDEX IF EXISTS idx_data_encryption_key_version`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_data_encryption_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_data_encryption_entity_field_unique`);

    // -- Drop indexes for security_events
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_user_event_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_is_resolved`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_severity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_event_type`);

    // -- Drop tables in reverse order (data_encryption first since it has no FK deps)
    await queryRunner.query(`DROP TABLE IF EXISTS data_encryption CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS security_events CASCADE`);
  }
}
