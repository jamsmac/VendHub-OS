/**
 * TypeORM Configuration for VendHub OS
 * Used for migrations and CLI commands
 *
 * Supports two connection modes:
 * 1. DATABASE_URL (Supabase, Railway, Neon) — single connection string
 * 2. Individual vars (DB_HOST, DB_PORT, etc.) — traditional approach
 */

import { DataSource, DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { config } from "dotenv";
import { join } from "path";
import { parseDatabaseUrl } from "../config/env.config";

// Load environment variables
config({ path: join(__dirname, "../../../../.env") });

// Entity paths
const entitiesPath = join(__dirname, "../**/*.entity{.ts,.js}");
const migrationsPath = join(__dirname, "./migrations/*{.ts,.js}");
const subscribersPath = join(__dirname, "./subscribers/*{.ts,.js}");

// Parse connection from DATABASE_URL or individual vars
const databaseUrl = process.env.DATABASE_URL;
const dbConnection = databaseUrl
  ? parseDatabaseUrl(databaseUrl)
  : {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USER || "vendhub",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "vendhub",
      ssl: false,
    };

const isProduction = process.env.NODE_ENV === "production";
const useSsl =
  isProduction ||
  (databaseUrl && dbConnection.ssl) ||
  process.env.DB_SSL === "true";
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED;

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  namingStrategy: new SnakeNamingStrategy(),
  host: dbConnection.host,
  port: dbConnection.port,
  username: dbConnection.username,
  password: dbConnection.password,
  database: dbConnection.database,

  // Entity and migration paths
  entities: [entitiesPath],
  migrations: [migrationsPath],
  subscribers: [subscribersPath],

  // Schema synchronization (NEVER use in production!)
  synchronize: !isProduction && process.env.DB_SYNCHRONIZE === "true",

  // Logging
  logging:
    process.env.DB_LOGGING === "true" ? true : ["error", "warn", "migration"],
  logger: "advanced-console",

  // Connection pool
  poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || "10", 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Supabase transaction-mode pooler (port 6543) doesn't support named
    // prepared statements. statement_timeout guards against runaway queries.
    statement_timeout: 30000,
  },

  // SSL (auto-enable in production or with DATABASE_URL sslmode)
  ssl: useSsl
    ? {
        rejectUnauthorized:
          sslRejectUnauthorized === "true"
            ? true
            : sslRejectUnauthorized === "false"
              ? false
              : !databaseUrl,
      }
    : false,

  // Migration settings
  migrationsRun: process.env.DB_MIGRATIONS_RUN === "true",
  migrationsTableName: "typeorm_migrations",
  migrationsTransactionMode: "each",

  // Cache (using Redis if available, but NOT for CLI commands like migration:run)
  // CLI runs set TYPEORM_CLI=1 or are detected by argv inspection.
  cache: (() => {
    const isCli =
      process.env.TYPEORM_CLI === "1" ||
      process.argv.some((a) => a.includes("typeorm/cli"));
    if (isCli) return false; // CLI doesn't need query cache, skip Redis connect
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    if (!redisUrl && !redisHost) return false;
    return {
      type: "redis" as const,
      options: redisUrl
        ? { url: redisUrl }
        : {
            host: redisHost,
            port: parseInt(process.env.REDIS_PORT || "6379", 10),
            password: process.env.REDIS_PASSWORD || undefined,
          },
      duration: 60000, // 1 minute default cache
    };
  })(),
};

// DataSource for CLI commands
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
