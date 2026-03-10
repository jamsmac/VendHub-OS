import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fix production schema gaps between VHM24 Init migration and VendHub OS entities.
 *
 * Addresses:
 * - tasks.type_code column may be missing if Init migration was partially applied
 * - password_reset_tokens columns: use timestamptz per PostgreSQL best practices
 * - Defensive: only runs ALTER if column/type doesn't already exist
 */
export class FixProductionSchemaGaps1715100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure tasks_type_code_enum exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_type_code_enum" AS ENUM (
          'refill', 'collection', 'cleaning', 'repair',
          'install', 'removal', 'audit', 'inspection',
          'replace_hopper', 'replace_grinder', 'replace_brew_unit', 'replace_mixer'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add type_code to tasks if missing
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tasks"
          ADD COLUMN "type_code" "tasks_type_code_enum";
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 3. Fix password_reset_tokens: ensure expires_at and used_at use timestamptz
    //    (Init migration used "timestamp without time zone" — should be timestamptz)
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
        ALTER COLUMN "expires_at" TYPE timestamptz USING "expires_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "used_at" TYPE timestamptz USING "used_at" AT TIME ZONE 'UTC'
    `);

    // 4. Add FK index on invites.used_by_id if missing (PostgreSQL does NOT auto-index FKs)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invites_used_by_id" ON "invites" ("used_by_id")
    `);

    // 5. Add FK index on invites.organization_id if missing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invites_organization_id" ON "invites" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invites_organization_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invites_used_by_id"`);

    // Revert timestamptz back to timestamp (not recommended but provided for rollback)
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
        ALTER COLUMN "expires_at" TYPE timestamp USING "expires_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "used_at" TYPE timestamp USING "used_at" AT TIME ZONE 'UTC'
    `);
  }
}
