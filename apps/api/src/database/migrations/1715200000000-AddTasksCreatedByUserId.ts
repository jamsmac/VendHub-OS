import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add tasks.created_by_user_id column (distinct from BaseEntity's created_by_id).
 *
 * The Task entity defines a separate createdByUserId field (→ created_by_user_id)
 * for the user who created the task, while BaseEntity's createdById (→ created_by_id)
 * is a generic audit field. The Init migration didn't include this column.
 */
export class AddTasksCreatedByUserId1715200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if missing (defensive)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tasks"
          ADD COLUMN "created_by_user_id" uuid;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add FK index for join performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_created_by_user_id"
        ON "tasks" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tasks_created_by_user_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "tasks" DROP COLUMN IF EXISTS "created_by_user_id"
    `);
  }
}
