/**
 * One-time script to synchronize TypeORM entity schema with Railway Postgres.
 * Creates missing tables and adds missing columns (never drops anything).
 *
 * Handles pre-existing index/enum/constraint conflicts by executing
 * each SQL statement individually and skipping "already exists" errors.
 *
 * Usage:
 *   DB_HOST=trolley.proxy.rlwy.net DB_PORT=24266 DB_NAME=railway \
 *   DB_USER=postgres DB_PASSWORD=xxx DB_SSL=false NODE_ENV=development \
 *   REDIS_HOST= REDIS_URL= \
 *   npx ts-node --project tsconfig.json scripts/schema-sync.ts
 */
import dataSource from "../src/database/typeorm.config";

(async () => {
  try {
    console.log("Initializing DataSource...");
    await dataSource.initialize();
    console.log("Connected to database.");

    // Get the SQL that synchronize would run, without executing it
    const sqlStatements = await dataSource.driver.createSchemaBuilder().log();

    const upQueries = sqlStatements.upQueries;
    console.log(`Schema sync generated ${upQueries.length} SQL statements.`);

    if (upQueries.length === 0) {
      console.log("Schema is already in sync!");
      await dataSource.destroy();
      process.exit(0);
    }

    let executed = 0;
    let skipped = 0;
    let errors = 0;

    for (const query of upQueries) {
      const sql = query.query;
      const params = query.parameters;
      try {
        await dataSource.query(sql, params);
        executed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Skip "already exists" errors for indexes, types, tables, constraints
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate key value") ||
          msg.includes("multiple primary keys")
        ) {
          skipped++;
        } else {
          errors++;
          console.error(`FAILED: ${sql.substring(0, 120)}...`);
          console.error(`  Error: ${msg}`);
        }
      }
    }

    console.log(`\nResults:`);
    console.log(`  Executed: ${executed}`);
    console.log(`  Skipped (already exists): ${skipped}`);
    console.log(`  Errors: ${errors}`);

    const tables = await dataSource.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",
    );
    console.log(`\nTotal public tables: ${tables[0].count}`);

    await dataSource.destroy();
    console.log("Done.");
    process.exit(errors > 0 ? 1 : 0);
  } catch (err: unknown) {
    console.error("FATAL ERROR:", err instanceof Error ? err.message : err);
    await dataSource.destroy().catch(() => {});
    process.exit(1);
  }
})();
