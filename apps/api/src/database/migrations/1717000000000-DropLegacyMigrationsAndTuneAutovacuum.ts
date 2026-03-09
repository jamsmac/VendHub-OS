import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 1. Drop the legacy "migrations" table that was created by an earlier ORM/tool.
 *    TypeORM uses "typeorm_migrations" (configured in typeorm.config.ts).
 *    The two tables have diverged (56 vs 52 records) and the legacy one
 *    causes confusion during manual diagnostics.
 *
 * 2. Lower autovacuum thresholds on small core tables so dead tuples
 *    are cleaned up promptly even when row counts are low.
 *    Default threshold = 50 rows, which means a 23-row table like "machines"
 *    will never trigger autovacuum despite having 44 dead tuples.
 */
export class DropLegacyMigrationsAndTuneAutovacuum1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Drop legacy migrations table ---
    await queryRunner.query(`DROP TABLE IF EXISTS "migrations"`);

    // --- 2. Tune autovacuum for small core tables ---
    // autovacuum_vacuum_threshold = 10 (default 50)
    // autovacuum_vacuum_scale_factor = 0.05 (default 0.2)
    // This means: vacuum when dead_tuples > 10 + 0.05 * n_live_tup
    const tables = [
      "users",
      "organizations",
      "machines",
      "products",
      "user_sessions",
      "orders",
      "tasks",
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}" SET (
          autovacuum_vacuum_threshold = 10,
          autovacuum_vacuum_scale_factor = 0.05,
          autovacuum_analyze_threshold = 10,
          autovacuum_analyze_scale_factor = 0.05
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Recreate legacy migrations table (restore from typeorm_migrations) ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" BIGINT NOT NULL,
        "name" VARCHAR NOT NULL
      )
    `);

    // --- 2. Reset autovacuum to defaults ---
    const tables = [
      "users",
      "organizations",
      "machines",
      "products",
      "user_sessions",
      "orders",
      "tasks",
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}" RESET (
          autovacuum_vacuum_threshold,
          autovacuum_vacuum_scale_factor,
          autovacuum_analyze_threshold,
          autovacuum_analyze_scale_factor
        )
      `);
    }
  }
}
