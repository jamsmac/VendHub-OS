import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateAlertsTables
 *
 * Creates alert-related tables:
 * 1. alert_rules - Defines conditions under which alerts are triggered
 * 2. alert_history - Records of triggered alerts and their lifecycle
 *
 * Includes enum types for metric, condition, severity, and history status.
 */
export class CreateAlertsTables1708000005000 implements MigrationInterface {
  name = 'CreateAlertsTables1708000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM TYPES
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE alert_metric_enum AS ENUM (
        'temperature',
        'humidity',
        'stock_level',
        'cash_level',
        'sales_drop',
        'offline_duration',
        'error_count',
        'maintenance_overdue',
        'collection_overdue',
        'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE alert_condition_enum AS ENUM (
        'greater_than',
        'less_than',
        'equals',
        'not_equals',
        'between'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE alert_severity_enum AS ENUM (
        'info',
        'warning',
        'critical'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE alert_history_status_enum AS ENUM (
        'active',
        'acknowledged',
        'resolved',
        'dismissed'
      )
    `);

    // ========================================================================
    // TABLE 1: alert_rules
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,

        -- Rule definition
        name varchar(200) NOT NULL,
        description text,

        -- Monitoring configuration
        metric alert_metric_enum NOT NULL,
        condition alert_condition_enum NOT NULL,
        threshold decimal(15, 2) NOT NULL,
        threshold_max decimal(15, 2),

        -- Severity
        severity alert_severity_enum NOT NULL DEFAULT 'warning',

        -- Scope (null = all machines in org)
        machine_id uuid,

        -- Notification configuration
        notify_channels jsonb NOT NULL DEFAULT '["in_app"]',
        notify_user_ids jsonb NOT NULL DEFAULT '[]',
        cooldown_minutes integer NOT NULL DEFAULT 60,

        -- Status
        is_active boolean NOT NULL DEFAULT true,

        -- Additional data
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for alert_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_organization_id
        ON alert_rules(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_metric
        ON alert_rules(metric)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active
        ON alert_rules(is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_rules_machine_id
        ON alert_rules(machine_id)
    `);

    // ========================================================================
    // TABLE 2: alert_history
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        rule_id uuid NOT NULL,
        machine_id uuid,

        -- Trigger data
        triggered_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        value decimal(15, 2) NOT NULL,
        threshold decimal(15, 2) NOT NULL,

        -- Classification
        severity alert_severity_enum NOT NULL,
        status alert_history_status_enum NOT NULL DEFAULT 'active',

        -- Acknowledgement workflow
        acknowledged_by_user_id uuid,
        acknowledged_at timestamptz,

        -- Resolution
        resolved_at timestamptz,

        -- Details
        message text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Foreign key: alert_history.rule_id -> alert_rules.id
    await queryRunner.query(`
      ALTER TABLE alert_history
        ADD CONSTRAINT "FK_alert_history_rule_id"
        FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
        ON DELETE CASCADE
    `);

    // -- Indexes for alert_history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_organization_id
        ON alert_history(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id
        ON alert_history(rule_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_machine_id
        ON alert_history(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_status
        ON alert_history(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at
        ON alert_history(triggered_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_severity
        ON alert_history(severity)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for alert_history (reverse order)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_severity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_triggered_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_rule_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_history_organization_id`);

    // -- Drop indexes for alert_rules
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_rules_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_rules_is_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_rules_metric`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alert_rules_organization_id`);

    // -- Drop tables in reverse order (alert_history first due to FK dependency)
    await queryRunner.query(`DROP TABLE IF EXISTS alert_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_rules CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS alert_history_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_severity_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_condition_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_metric_enum`);
  }
}
