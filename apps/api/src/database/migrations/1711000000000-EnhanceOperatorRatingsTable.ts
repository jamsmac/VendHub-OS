import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: EnhanceOperatorRatingsTable
 *
 * Adds VHM24-repo fields to operator_ratings:
 * - Task: tasks_late, avg_completion_time_hours, timeliness_score
 * - Photo compliance: tasks_with_photos_before/after, total_photos_uploaded, photo_compliance_rate
 * - Financial: collections_with_variance, avg_collection_variance_percent, inventory_discrepancies
 * - Customer: avg_customer_rating, positive_feedback_count
 * - Discipline: checklist_items_completed/total, checklist_completion_rate, comments_sent, discipline_score
 * - notification_sent_at
 *
 * Rebalances weights from 5 to 7 categories:
 * Task 25%, Photo 15%, Quality 10%, Financial 15%, Attendance 10%, Customer 10%, Discipline 15%
 */
export class EnhanceOperatorRatingsTable1711000000000 implements MigrationInterface {
  name = 'EnhanceOperatorRatingsTable1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Task completion (new columns) =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS tasks_late integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS avg_completion_time_hours decimal(8, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS timeliness_score decimal(5, 2) NOT NULL DEFAULT 0
    `);

    // ===== Photo compliance (new section) =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS tasks_with_photos_before integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tasks_with_photos_after integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_photos_uploaded integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS photo_compliance_rate decimal(5, 2) NOT NULL DEFAULT 0
    `);

    // ===== Financial / Collection accuracy (new columns) =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS collections_with_variance integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS avg_collection_variance_percent decimal(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS inventory_discrepancies integer NOT NULL DEFAULT 0
    `);

    // ===== Customer (new columns) =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS avg_customer_rating decimal(3, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS positive_feedback_count integer NOT NULL DEFAULT 0
    `);

    // ===== Discipline (new section) =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS checklist_items_completed integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS checklist_items_total integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS checklist_completion_rate decimal(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS comments_sent integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS discipline_score decimal(5, 2) NOT NULL DEFAULT 0
    `);

    // ===== Notification tracking =====
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz
    `);

    // ===== New indexes for sortable columns =====
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_photo_compliance
        ON operator_ratings(photo_compliance_rate)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_discipline_score
        ON operator_ratings(discipline_score)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_ratings_timeliness
        ON operator_ratings(timeliness_score)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_timeliness`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_discipline_score`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_ratings_photo_compliance`);

    // Drop columns (reverse order of addition)
    await queryRunner.query(`
      ALTER TABLE operator_ratings
        DROP COLUMN IF EXISTS notification_sent_at,
        DROP COLUMN IF EXISTS discipline_score,
        DROP COLUMN IF EXISTS comments_sent,
        DROP COLUMN IF EXISTS checklist_completion_rate,
        DROP COLUMN IF EXISTS checklist_items_total,
        DROP COLUMN IF EXISTS checklist_items_completed,
        DROP COLUMN IF EXISTS positive_feedback_count,
        DROP COLUMN IF EXISTS avg_customer_rating,
        DROP COLUMN IF EXISTS inventory_discrepancies,
        DROP COLUMN IF EXISTS avg_collection_variance_percent,
        DROP COLUMN IF EXISTS collections_with_variance,
        DROP COLUMN IF EXISTS photo_compliance_rate,
        DROP COLUMN IF EXISTS total_photos_uploaded,
        DROP COLUMN IF EXISTS tasks_with_photos_after,
        DROP COLUMN IF EXISTS tasks_with_photos_before,
        DROP COLUMN IF EXISTS timeliness_score,
        DROP COLUMN IF EXISTS avg_completion_time_hours,
        DROP COLUMN IF EXISTS tasks_late
    `);
  }
}
