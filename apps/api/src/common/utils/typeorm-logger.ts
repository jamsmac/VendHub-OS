/**
 * Custom TypeORM Logger
 *
 * Logs slow queries (exceeding configurable threshold) and query errors.
 * Uses NestJS Logger for structured, consistent logging.
 *
 * Usage:
 *   In TypeORM config: logger: new CustomTypeOrmLogger(1000)
 *   The threshold parameter is in milliseconds (default 1000ms).
 */

import { Logger } from "@nestjs/common";
import { Logger as TypeOrmLogger, QueryRunner } from "typeorm";

export class CustomTypeOrmLogger implements TypeOrmLogger {
  private readonly slowQueryThresholdMs: number;
  private readonly logger = new Logger("TypeORM");

  constructor(slowQueryThresholdMs = 1000) {
    this.slowQueryThresholdMs = slowQueryThresholdMs;
  }

  /**
   * Logs a query and its parameters.
   * Only logs if the query exceeds the slow-query threshold.
   */
  logQuery(
    _query: string,
    _parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    // Standard queries are not logged to avoid noise.
    // Slow queries are caught by logQuerySlow.
    // If DB_LOGGING=true is set globally, TypeORM will call this for every query.
  }

  /**
   * Logs a query error with the failing SQL and parameters.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const params = this.formatParameters(parameters);

    this.logger.error(
      `QUERY ERROR\n` +
        `  Error: ${errorMessage}\n` +
        `  Query: ${this.truncateQuery(query)}\n` +
        `  Parameters: ${params}`,
    );
  }

  /**
   * Logs queries that exceed the slow-query threshold.
   * This is the primary purpose of this logger.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    if (time >= this.slowQueryThresholdMs) {
      const params = this.formatParameters(parameters);

      this.logger.warn(
        `SLOW QUERY (${time}ms, threshold: ${this.slowQueryThresholdMs}ms)\n` +
          `  Query: ${this.truncateQuery(query)}\n` +
          `  Parameters: ${params}`,
      );
    }
  }

  /**
   * Logs schema build operations.
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    this.logger.log(`Schema: ${message}`);
  }

  /**
   * Logs migration operations.
   */
  logMigration(message: string, _queryRunner?: QueryRunner): void {
    this.logger.log(`Migration: ${message}`);
  }

  /**
   * Logs general TypeORM messages.
   */
  log(
    level: "log" | "info" | "warn",
    message: unknown,
    _queryRunner?: QueryRunner,
  ): void {
    switch (level) {
      case "log":
      case "info":
        this.logger.log(`${message}`);
        break;
      case "warn":
        this.logger.warn(`${message}`);
        break;
    }
  }

  /**
   * Formats query parameters for logging.
   * Truncates large parameter arrays to avoid log spam.
   */
  private formatParameters(parameters?: unknown[]): string {
    if (!parameters || parameters.length === 0) {
      return "[]";
    }

    try {
      const serialized = JSON.stringify(parameters);
      if (serialized.length > 500) {
        return serialized.substring(0, 500) + "... (truncated)";
      }
      return serialized;
    } catch {
      return "[unserializable]";
    }
  }

  /**
   * Truncates very long queries for readable log output.
   */
  private truncateQuery(query: string): string {
    const maxLength = 1000;
    if (query.length > maxLength) {
      return query.substring(0, maxLength) + "... (truncated)";
    }
    return query;
  }
}
