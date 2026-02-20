/**
 * TypeORM Configuration for VendHub OS
 * Used for migrations and CLI commands
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../../../../.env') });

// Entity paths
const entitiesPath = join(__dirname, '../modules/**/entities/*.entity{.ts,.js}');
const migrationsPath = join(__dirname, './migrations/*{.ts,.js}');
const subscribersPath = join(__dirname, './subscribers/*{.ts,.js}');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  namingStrategy: new SnakeNamingStrategy(),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'vendhub',
  password: process.env.DB_PASSWORD || 'vendhub_secret',
  database: process.env.DB_NAME || 'vendhub',

  // Entity and migration paths
  entities: [entitiesPath],
  migrations: [migrationsPath],
  subscribers: [subscribersPath],

  // Schema synchronization (NEVER use in production!)
  synchronize: process.env.DB_SYNCHRONIZE === 'true',

  // Logging
  logging: process.env.DB_LOGGING === 'true' ? true : ['error', 'warn', 'migration'],
  logger: 'advanced-console',

  // Connection pool
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },

  // SSL (enabled by default in production, opt-out with DB_SSL=false)
  ssl: (process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false')) ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  } : false,

  // Migration settings
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  migrationsTableName: 'typeorm_migrations',
  migrationsTransactionMode: 'each',

  // Cache (using Redis)
  cache: process.env.REDIS_HOST ? {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    duration: 60000, // 1 minute default cache
  } : false,
};

// DataSource for CLI commands
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
