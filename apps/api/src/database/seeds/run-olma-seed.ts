/**
 * Run-seed entry point for the OLMA example location.
 *
 * Usage:
 *   DATABASE_URL=postgres://... ts-node src/database/seeds/run-olma-seed.ts [org-id]
 *
 * If no org-id is passed as the first CLI arg, ORGANIZATION_ID env var is used.
 * Both must be valid UUIDs of an already-existing organization row.
 */

import { DataSource } from "typeorm";
import { join } from "path";
import { config } from "dotenv";

// Load .env from monorepo root
config({ path: join(__dirname, "../../../../../.env") });

import { runSeed } from "./seed-runner";
import { OLMA_SEED } from "./olma-example.seed";

const organizationId =
  process.argv[2] ?? process.env.ORGANIZATION_ID ?? "your-org-id-here";

if (organizationId === "your-org-id-here") {
  console.error(
    "ERROR: Pass a real organization UUID as the first CLI argument or set ORGANIZATION_ID env var.",
  );
  process.exit(1);
}

const dataSource = new DataSource({
  type: "postgres",
  // Use DATABASE_URL if set, otherwise fall back to individual vars
  ...(process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : {}),
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  username: process.env.DB_USER ?? "vendhub",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "vendhub",
  entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
  synchronize: false,
  logging: false,
});

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await runSeed(dataSource, OLMA_SEED, organizationId);
    console.log("Seed complete!");
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
