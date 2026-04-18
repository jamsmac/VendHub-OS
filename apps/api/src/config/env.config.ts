import { registerAs } from "@nestjs/config";

/**
 * Parse DATABASE_URL into individual connection parameters.
 * Supports: postgresql://user:password@host:port/database?sslmode=require
 *
 * Used by Supabase, Railway, Neon, and other managed PostgreSQL providers
 * that provide a single connection string.
 */
export function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
} {
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get("sslmode");
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "5432", 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1), // remove leading /
    ssl: sslMode === "require" || sslMode === "verify-full" || !sslMode,
  };
}

/**
 * Parse REDIS_URL into individual connection parameters.
 * Supports: redis://:password@host:port or rediss://... (TLS)
 *
 * Used by Upstash, Railway Redis, and other managed Redis providers.
 */
export function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password: string | undefined;
  tls: boolean;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls: parsed.protocol === "rediss:",
  };
}

export const databaseConfig = registerAs("database", () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    return {
      ...parsed,
      poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
      url: databaseUrl,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "vendhub",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vendhub",
    ssl: process.env.DB_SSL === "true",
    poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
    url: undefined,
  };
});

export const redisConfig = registerAs("redis", () => {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const parsed = parseRedisUrl(redisUrl);
    return { ...parsed, url: redisUrl };
  }

  // If no REDIS_HOST set, Redis is considered not configured
  const host = process.env.REDIS_HOST;
  return {
    host: host || undefined,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: false,
    url: undefined,
  };
});

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  agentMode:
    process.env.AGENT_MODE === "true" && process.env.NODE_ENV !== "production",
  sentryDsn: process.env.SENTRY_DSN || undefined,
  jwtSecret: (() => {
    let jwtSecret = process.env.JWT_SECRET;
    const env = process.env.NODE_ENV ?? "development";
    const DEV_SENTINEL = "vendhub-dev-secret-unsafe";
    const allowDevFallback = process.env.ALLOW_DEV_FALLBACK === "true";
    const isDevEnv = env === "development";
    const isProdLike = ["production", "staging", "preview"].includes(env);

    if (!jwtSecret || jwtSecret.length < 32) {
      if (isProdLike) {
        throw new Error(
          `JWT_SECRET must be set and >=32 chars in ${env}. Refusing to boot.`,
        );
      }
      if (env === "test" && !allowDevFallback) {
        throw new Error(
          "JWT_SECRET missing in test env. Set a real secret or ALLOW_DEV_FALLBACK=true explicitly.",
        );
      }
      if (!isDevEnv && !allowDevFallback) {
        throw new Error(
          `JWT_SECRET missing in ${env}. Set ALLOW_DEV_FALLBACK=true to opt into the dev sentinel.`,
        );
      }
      jwtSecret = DEV_SENTINEL;

      console.warn(
        `[env.config] Using insecure dev JWT sentinel in ${env} (ALLOW_DEV_FALLBACK=${allowDevFallback}).`,
      );
    }
    return jwtSecret;
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  apiUrl: process.env.API_URL || "http://localhost:4000",
}));
