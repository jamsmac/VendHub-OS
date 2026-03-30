/**
 * Script to initialize a fresh local database from entity definitions.
 * Uses TypeORM synchronize to create schema, then marks all migrations as run.
 *
 * Usage: TYPEORM_CLI=1 npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/sync-local-db.ts
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../src/database/typeorm.config";

const MIGRATIONS = [
  [1700000000000, "Init1700000000000"],
  [1715000000000, "AddInvitesTable1715000000000"],
  [1715100000000, "FixProductionSchemaGaps1715100000000"],
  [1715200000000, "AddTasksCreatedByUserId1715200000000"],
  [1715300000000, "AddMissingEntityTables1715300000000"],
  [1715400000000, "AddInventoryCheckConstraints1715400000000"],
  [1773885435060, "SyncEntities1773885435060"],
  [1773962776323, "SyncDrift1773962776323"],
  [1774300000000, "AddLifecycleTraceability1774300000000"],
  [1774300100000, "ExtendAlertMetricEnum1774300100000"],
  [1774300200000, "AddCustomFieldsTables1774300200000"],
  [1774400000000, "CreatePaymentReportTables1774400000000"],
  [1774500000000, "AddBaseEntityFieldsToPaymentReports1774500000000"],
  [1774600000000, "AddOrganizationIdToPaymentReports1774600000000"],
  [1774600100000, "AddOrganizationIdToAgentSessions1774600100000"],
  [1774600200000, "BackfillOrganizationIdPaymentReports1774600200000"],
] as const;

async function main() {
  console.log("Connecting to database...");

  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: true,
    migrationsRun: false,
    cache: false,
    logging: ["error", "warn", "schema"],
  });

  await ds.initialize();
  console.log("Schema synchronized from entities.");

  // Mark all migrations as executed
  for (const [timestamp, name] of MIGRATIONS) {
    try {
      await ds.query(
        `INSERT INTO typeorm_migrations (timestamp, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [timestamp, name],
      );
    } catch {
      // ignore
    }
  }

  const tables = await ds.query(
    `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  console.log(`Tables created: ${tables[0].count}`);
  console.log("All migrations marked as executed.");

  await ds.destroy();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
