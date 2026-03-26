/**
 * N+1 Query Detection Helper
 *
 * Tracks the number of database queries executed during a test operation
 * to detect N+1 query patterns.
 *
 * Usage in tests:
 *   const counter = new QueryCounter(dataSource);
 *   counter.start();
 *   await service.findAll(); // operation under test
 *   const count = counter.stop();
 *   expect(count).toBeLessThan(5); // should not execute excessive queries
 */

import { DataSource, Logger } from "typeorm";

export class QueryCounter {
  private queryCount = 0;
  private queries: string[] = [];
  private originalLogger: Logger | undefined;
  private active = false;

  constructor(private readonly dataSource: DataSource) {}

  start(): void {
    this.queryCount = 0;
    this.queries = [];
    this.active = true;

    // Store original logger and replace with counting logger
    this.originalLogger = this.dataSource.logger as Logger;

    const self = this;
    this.dataSource.logger = {
      logQuery(query: string) {
        if (self.active) {
          self.queryCount++;
          self.queries.push(query);
        }
      },
      logQueryError() {},
      logQuerySlow() {},
      logSchemaBuild() {},
      logMigration() {},
      log() {},
    } as Logger;
  }

  stop(): number {
    this.active = false;
    if (this.originalLogger) {
      this.dataSource.logger = this.originalLogger;
    }
    return this.queryCount;
  }

  getQueries(): string[] {
    return [...this.queries];
  }

  getCount(): number {
    return this.queryCount;
  }

  /**
   * Assert that the number of queries is within an acceptable range.
   * Throws if query count exceeds maxQueries.
   */
  assertMaxQueries(maxQueries: number, operationName = "operation"): void {
    const count = this.stop();
    if (count > maxQueries) {
      const queryList = this.queries
        .map((q, i) => `  ${i + 1}. ${q.substring(0, 200)}`)
        .join("\n");
      throw new Error(
        `N+1 detected: ${operationName} executed ${count} queries (max: ${maxQueries}).\n` +
          `Queries:\n${queryList}`,
      );
    }
  }
}
