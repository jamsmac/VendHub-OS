import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: EnhanceImportModule
 *
 * Phase 4 - Step 3:
 * 1. CREATE TABLE import_sessions - intelligent import workflow with approval process
 * 2. CREATE TABLE import_audit_logs - row-level operation audit trail per import
 * 3. CREATE TABLE schema_definitions - target schemas for auto-classification
 * 4. CREATE TABLE validation_rules - configurable validation rules for imports
 *
 * Supports intelligent file classification, column mapping, multi-step validation,
 * approval workflows, and granular audit logging for data imports across 15+ domains.
 */
export class EnhanceImportModule1710000002000 implements MigrationInterface {
  name = 'EnhanceImportModule1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: import_domain_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE import_domain_type_enum AS ENUM (
          'products',
          'machines',
          'users',
          'employees',
          'transactions',
          'sales',
          'inventory',
          'customers',
          'prices',
          'categories',
          'locations',
          'contractors',
          'recipes',
          'planograms',
          'contracts',
          'equipment',
          'spare_parts',
          'routes'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: import_session_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE import_session_status_enum AS ENUM (
          'created',
          'uploading',
          'uploaded',
          'classifying',
          'classified',
          'mapping',
          'mapped',
          'validating',
          'validated',
          'validation_failed',
          'awaiting_approval',
          'approved',
          'rejected',
          'executing',
          'completed',
          'completed_with_errors',
          'failed',
          'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: import_approval_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE import_approval_status_enum AS ENUM (
          'pending',
          'approved',
          'rejected',
          'auto_approved'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: import_audit_action_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE import_audit_action_type_enum AS ENUM (
          'insert',
          'update',
          'merge',
          'skip',
          'delete',
          'restore'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: validation_rule_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE validation_rule_type_enum AS ENUM (
          'range',
          'regex',
          'enum',
          'required',
          'unique',
          'foreign_key',
          'custom',
          'length',
          'format',
          'cross_field'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: validation_severity_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE validation_severity_enum AS ENUM (
          'error',
          'warning',
          'info'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: import_sessions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid NOT NULL,

        -- Domain and status
        domain import_domain_type_enum NOT NULL,
        status import_session_status_enum NOT NULL DEFAULT 'uploaded',

        -- Link to legacy import job (if applicable)
        import_job_id uuid,

        -- Template reference
        template_id uuid,

        -- File information
        file_name varchar(255) NOT NULL,
        file_url varchar(500),
        file_size bigint NOT NULL,
        file_type varchar(20) NOT NULL,
        file_mime_type varchar(100),
        file_metadata jsonb,

        -- Classification results
        classification_result jsonb,
        classification_confidence decimal(5, 2),

        -- Column mapping
        column_mapping jsonb,
        unmapped_columns jsonb,

        -- Validation
        validation_report jsonb,

        -- Action plan
        action_plan jsonb,

        -- Row counts
        total_rows integer NOT NULL DEFAULT 0,
        processed_rows integer NOT NULL DEFAULT 0,
        successful_rows integer NOT NULL DEFAULT 0,
        failed_rows integer NOT NULL DEFAULT 0,
        skipped_rows integer NOT NULL DEFAULT 0,

        -- Approval workflow
        approval_status import_approval_status_enum DEFAULT 'pending',
        approved_by_user_id uuid,
        approved_at timestamptz,
        rejection_reason text,

        -- Execution results
        execution_result jsonb,

        -- User tracking
        uploaded_by_user_id uuid NOT NULL,
        started_at timestamptz,
        completed_at timestamptz,

        -- Messages
        message text,
        error_message text,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for import_sessions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_sessions_org_status
        ON import_sessions(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_sessions_org_domain
        ON import_sessions(organization_id, domain)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_sessions_uploaded_by
        ON import_sessions(uploaded_by_user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_sessions_approval_status
        ON import_sessions(approval_status)
    `);

    // ========================================================================
    // TABLE: import_audit_logs
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_audit_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Session reference
        session_id uuid NOT NULL,

        -- Organization
        organization_id uuid NOT NULL,

        -- Action details
        action_type import_audit_action_type_enum NOT NULL,
        table_name varchar(100) NOT NULL,
        record_id uuid,
        row_number integer,

        -- State tracking
        before_state jsonb,
        after_state jsonb,
        field_changes jsonb,

        -- Execution
        executed_at timestamptz NOT NULL DEFAULT now(),
        executed_by_user_id uuid,

        -- Result
        success boolean NOT NULL DEFAULT true,
        error_message text,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for import_audit_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_audit_logs_session_id
        ON import_audit_logs(session_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_audit_logs_session_action
        ON import_audit_logs(session_id, action_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_audit_logs_table_record
        ON import_audit_logs(table_name, record_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_audit_logs_executed_at
        ON import_audit_logs(executed_at)
    `);

    // -- FK: import_audit_logs -> import_sessions
    await queryRunner.query(`
      ALTER TABLE import_audit_logs
        ADD CONSTRAINT fk_import_audit_logs_session
        FOREIGN KEY (session_id) REFERENCES import_sessions(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: schema_definitions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schema_definitions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization (nullable for global schemas)
        organization_id uuid,

        -- Schema identification
        domain import_domain_type_enum NOT NULL,
        table_name varchar(100) NOT NULL,
        display_name varchar(100) NOT NULL,
        description text,

        -- Field definitions
        field_definitions jsonb NOT NULL,
        relationships jsonb,
        required_fields jsonb NOT NULL DEFAULT '[]',
        unique_fields jsonb NOT NULL DEFAULT '[]',

        -- Versioning
        version varchar(20) NOT NULL DEFAULT '1.0',
        is_active boolean NOT NULL DEFAULT true,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Unique index on (domain, table_name) for active records only
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_definitions_domain_table
        ON schema_definitions(domain, table_name)
        WHERE deleted_at IS NULL
    `);

    // ========================================================================
    // TABLE: validation_rules
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS validation_rules (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization (nullable for global rules)
        organization_id uuid,

        -- Rule identification
        domain import_domain_type_enum NOT NULL,
        rule_name varchar(100) NOT NULL,
        description text,

        -- Rule configuration
        rule_type validation_rule_type_enum NOT NULL,
        field_name varchar(100) NOT NULL,
        rule_definition jsonb NOT NULL,

        -- Severity
        severity validation_severity_enum NOT NULL DEFAULT 'error',
        error_message_template text,

        -- State
        is_active boolean NOT NULL DEFAULT true,
        priority integer NOT NULL DEFAULT 0,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for validation_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_validation_rules_domain_active
        ON validation_rules(domain, is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_validation_rules_rule_type
        ON validation_rules(rule_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for validation_rules
    await queryRunner.query(`DROP INDEX IF EXISTS idx_validation_rules_rule_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_validation_rules_domain_active`);

    // -- Drop indexes for schema_definitions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_schema_definitions_domain_table`);

    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE import_audit_logs DROP CONSTRAINT IF EXISTS fk_import_audit_logs_session`);

    // -- Drop indexes for import_audit_logs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_audit_logs_executed_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_audit_logs_table_record`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_audit_logs_session_action`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_audit_logs_session_id`);

    // -- Drop indexes for import_sessions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_approval_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_uploaded_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_org_domain`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_org_status`);

    // -- Drop tables in reverse order (children first)
    await queryRunner.query(`DROP TABLE IF EXISTS validation_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS schema_definitions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_sessions CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS validation_severity_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS validation_rule_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_audit_action_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_approval_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_session_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_domain_type_enum`);
  }
}
