import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateOperatorRatingsTable
 *
 * Creates the operator_ratings table for tracking operator performance
 * across 5 categories (task completion, quality, financial, attendance,
 * customer service) with weighted scoring and grading.
 */
export class CreateOperatorRatingsTable1708000006000 implements MigrationInterface {
  name = 'CreateOperatorRatingsTable1708000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // TABLE: operator_ratings
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operator_ratings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        user_id uuid NOT NULL,

        -- Period
        period_start date NOT NULL,
        period_end date NOT NULL,

        -- ===== Task completion (weight: 30%) =====
        tasks_assigned integer NOT NULL DEFAULT 0,
        tasks_completed integer NOT NULL DEFAULT 0,
        tasks_on_time integer NOT NULL DEFAULT 0,
        task_completion_rate decimal(5, 2) NOT NULL DEFAULT 0,
        task_on_time_rate decimal(5, 2) NOT NULL DEFAULT 0,
        task_score decimal(5, 2) NOT NULL DEFAULT 0,

        -- ===== Quality (weight: 25%) =====
        photo_quality_score decimal(5, 2) NOT NULL DEFAULT 0,
        machine_cleanliness_score decimal(5, 2) NOT NULL DEFAULT 0,
        stock_accuracy_score decimal(5, 2) NOT NULL DEFAULT 0,
        quality_score decimal(5, 2) NOT NULL DEFAULT 0,

        -- ===== Financial (weight: 20%) =====
        cash_collection_accuracy decimal(5, 2) NOT NULL DEFAULT 0,
        inventory_loss_rate decimal(5, 2) NOT NULL DEFAULT 0,
        financial_score decimal(5, 2) NOT NULL DEFAULT 0,

        -- ===== Attendance (weight: 15%) =====
        scheduled_shifts integer NOT NULL DEFAULT 0,
        completed_shifts integer NOT NULL DEFAULT 0,
        late_arrivals integer NOT NULL DEFAULT 0,
        attendance_rate decimal(5, 2) NOT NULL DEFAULT 0,
        attendance_score decimal(5, 2) NOT NULL DEFAULT 0,

        -- ===== Customer (weight: 10%) =====
        complaints_received integer NOT NULL DEFAULT 0,
        complaints_resolved integer NOT NULL DEFAULT 0,
        average_response_time integer NOT NULL DEFAULT 0,
        customer_score decimal(5, 2) NOT NULL DEFAULT 0,

        -- ===== Totals =====
        total_score decimal(5, 2) NOT NULL DEFAULT 0,
        grade varchar(2),
        rank integer,
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

    // -- Unique constraint: one rating per user per period (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_ratings_user_period
        ON operator_ratings(user_id, period_start, period_end)
        WHERE deleted_at IS NULL
    `);

    // -- Indexes for operator_ratings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_organization_id
        ON operator_ratings(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_user_id
        ON operator_ratings(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_period
        ON operator_ratings(period_start, period_end)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_total_score
        ON operator_ratings(total_score)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_grade
        ON operator_ratings(grade)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_grade`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_total_score`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_operator_ratings_user_period`);

    // -- Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS operator_ratings CASCADE`);
  }
}
