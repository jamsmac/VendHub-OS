import { registerAs } from "@nestjs/config";

export const databaseConfig = registerAs("database", () => ({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vendhub",
  ssl: process.env.DB_SSL === "true",
  poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
}));

export const redisConfig = registerAs("redis", () => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  agentMode:
    process.env.AGENT_MODE === "true" && process.env.NODE_ENV !== "production",
  sentryDsn: process.env.SENTRY_DSN || undefined,
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  apiUrl: process.env.API_URL || "http://localhost:4000",
}));
